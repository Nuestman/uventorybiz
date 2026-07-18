import crypto from "crypto";
import { sendEmail } from "../../notificationService";
import { getPortalMagicLinkEmail } from "../../emailTemplates";
import * as repo from "./portal.repository";
import { createPortalSessionForUser } from "./portalSession.service";

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function portalFrontendBaseUrl(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.FRONTEND_URL || "http://localhost:17009";
}

export function buildPortalMagicVerifyUrl(token: string): string {
  return `${portalFrontendBaseUrl()}/api/portal/auth/magic-verify?token=${encodeURIComponent(token)}`;
}

/** Creates a single-use magic token and returns the full verify URL. */
export async function createPortalMagicTokenForUser(portalUserId: string): Promise<string> {
  const token = generateSecureToken();
  const expires = new Date(Date.now() + repo.MAGIC_TOKEN_MS);
  await repo.createMagicLoginToken(portalUserId, token, expires);
  return buildPortalMagicVerifyUrl(token);
}

export async function issuePortalMagicLink(params: {
  portalUserId: string;
  email: string;
  tenantName: string;
  firstName?: string;
  lastName?: string;
  supportEmail?: string | null;
  /** When true, skip rate-limit check (e.g. welcome email on account creation). */
  bypassRateLimit?: boolean;
}): Promise<{ ok: true; emailSent: boolean; magicLink: string } | { ok: false; error: string }> {
  const since = new Date(Date.now() - repo.MAGIC_RATE_LIMIT_MS);
  if (!params.bypassRateLimit) {
    const recent = await repo.countRecentMagicLoginTokens(params.portalUserId, since);
    if (recent >= repo.MAGIC_RATE_LIMIT_MAX) {
      return { ok: false, error: "Too many sign-in links requested. Try again in a few minutes." };
    }
  }

  const token = generateSecureToken();
  const expires = new Date(Date.now() + repo.MAGIC_TOKEN_MS);
  await repo.createMagicLoginToken(params.portalUserId, token, expires);

  const magicLink = buildPortalMagicVerifyUrl(token);
  const emailSent = await sendEmail({
    to: params.email,
    subject: `Sign in to your portal — ${params.tenantName}`,
    html: getPortalMagicLinkEmail({
      firstName: params.firstName || params.email.split("@")[0],
      lastName: params.lastName || "",
      tenantName: params.tenantName,
      magicLink,
      supportEmail: params.supportEmail,
      expiresMinutes: Math.round(repo.MAGIC_TOKEN_MS / 60000),
    }),
  });

  return { ok: true, emailSent, magicLink };
}

export async function completePortalMagicLogin(params: {
  token: string;
  meta: { ipAddress?: string | null; userAgent?: string | null };
}): Promise<
  | { ok: true; portalUserId: string; sessionToken: string; cookieMaxAgeMs: number }
  | { ok: false; reason: "invalid" | "locked" | "suspended" }
> {
  const row = await repo.findValidMagicLoginToken(params.token.trim());
  if (!row) return { ok: false, reason: "invalid" };

  const pu = row.portalUser;
  if (pu.status === "suspended") return { ok: false, reason: "suspended" };
  if (pu.status === "locked") return { ok: false, reason: "locked" };
  if (pu.lockedUntil && pu.lockedUntil > new Date()) return { ok: false, reason: "locked" };

  await repo.markMagicLoginTokenUsed(row.tokenRow.id);
  await repo.updatePortalUserRecord(pu.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  const sessionToken = generateSecureToken();
  const { cookieMaxAgeMs } = await createPortalSessionForUser(pu.id, pu.tenantId, sessionToken);

  await repo.insertPortalAudit({
    tenantId: pu.tenantId,
    portalUserId: pu.id,
    patientId: pu.patientId,
    action: "magic_login",
    ...params.meta,
  });

  return { ok: true, portalUserId: pu.id, sessionToken, cookieMaxAgeMs };
}

export async function resolvePortalUserForMagicLink(input: {
  email: string;
  slug?: string;
  tenantId?: string;
}): Promise<
  | {
      ok: true;
      portalUser: NonNullable<Awaited<ReturnType<typeof repo.findPortalUserByEmail>>>;
      tenantName: string;
      supportEmail: string | null;
    }
  | { ok: false; code: "not_found" | "ambiguous" | "disabled" }
> {
  const emailLower = input.email.trim().toLowerCase();
  let tenantId = input.tenantId;

  if (input.slug?.trim()) {
    const t = await repo.findTenantByPortalSlug(input.slug.trim());
    if (!t) return { ok: false, code: "not_found" };
    tenantId = t.id;
  }

  if (tenantId) {
    const settings = await repo.getTenantPortalSettingsRow(tenantId);
    if (!settings?.enabled) return { ok: false, code: "disabled" };
    const pu = await repo.findPortalUserByEmail(tenantId, emailLower);
    if (!pu) return { ok: false, code: "not_found" };
    const tenant = await repo.getTenantById(tenantId);
    return {
      ok: true,
      portalUser: pu,
      tenantName: tenant?.name ?? "Your organization",
      supportEmail: settings.supportEmail ?? null,
    };
  }

  const matches = (await repo.findPortalUsersByEmail(emailLower)).filter((m) => m.settings?.enabled);
  if (matches.length === 0) return { ok: false, code: "not_found" };
  if (matches.length > 1) return { ok: false, code: "ambiguous" };

  const match = matches[0];
  return {
    ok: true,
    portalUser: match.portalUser,
    tenantName: match.tenant.name,
    supportEmail: match.settings?.supportEmail ?? null,
  };
}
