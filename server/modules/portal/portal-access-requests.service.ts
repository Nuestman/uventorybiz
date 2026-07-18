import crypto from "crypto";
import bcrypt from "bcrypt";
import type { IStorage } from "../../storage";
import { createAndSendNotifications, sendEmail } from "../../notificationService";
import { getPortalAccessEmail } from "../../emailTemplates";
import { logError } from "../../logger";
import type { PortalAccessRequestKind } from "@shared/portalEmailLookup";
import type { PortalEmailLookupResult } from "@shared/portalEmailLookup";
import * as repo from "./portal.repository";
import {
  createPortalMagicTokenForUser,
  issuePortalMagicLink,
  portalFrontendBaseUrl,
} from "./portal-auth.service";
import { resolvePortalEmailLookup } from "./portal-email-lookup.service";

const ACCESS_REQUEST_RATE_MS = 15 * 60_000;
const ACCESS_REQUEST_RATE_MAX = 3;

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

function matchKindFromLookup(lookup: PortalEmailLookupResult): string {
  switch (lookup.status) {
    case "portal_active":
      return "portal_account";
    case "record_no_account":
      return lookup.supplierId ? "supplier_on_file" : "customer_on_file";
    case "not_found":
      return "unknown";
    default:
      return lookup.status;
  }
}

function requestKindFromLookup(lookup: PortalEmailLookupResult): PortalAccessRequestKind {
  return lookup.status === "portal_active" ? "sign_in_help" : "new_access";
}

export async function submitPortalAccessRequest(input: {
  email: string;
  slug?: string;
  storage: IStorage;
}): Promise<{ ok: true; message: string; status: string } | { ok: false; error: string; status?: string }> {
  const emailLower = input.email.trim().toLowerCase();
  const lookup = await resolvePortalEmailLookup({ email: emailLower, slug: input.slug });

  if (lookup.status === "ambiguous") {
    return {
      ok: false,
      status: lookup.status,
      error: lookup.message,
    };
  }

  if (lookup.status === "org_required") {
    return {
      ok: false,
      status: lookup.status,
      error: lookup.message,
    };
  }

  if (lookup.status === "portal_disabled") {
    return { ok: false, status: lookup.status, error: lookup.message };
  }

  if (!lookup.tenantId) {
    return { ok: false, status: "not_found", error: lookup.message };
  }

  const since = new Date(Date.now() - ACCESS_REQUEST_RATE_MS);
  const recent = await repo.countRecentPendingAccessRequests(lookup.tenantId, emailLower, since);
  if (recent >= ACCESS_REQUEST_RATE_MAX) {
    return {
      ok: false,
      error: "Too many requests. Please wait a few minutes before trying again.",
      status: "rate_limited",
    };
  }

  const request = await repo.createPortalAccessRequest({
    tenantId: lookup.tenantId,
    emailLower,
    customerId: lookup.customerId ?? null,
    supplierId: lookup.supplierId ?? null,
    portalUserId: lookup.portalUserId ?? null,
    requestKind: requestKindFromLookup(lookup),
    matchKind: matchKindFromLookup(lookup),
  });

  const tenantName = lookup.tenantName ?? "Your organization";
  const supportEmail = lookup.supportEmail;

  if (supportEmail) {
    const html =
      lookup.status === "portal_active"
        ? `
      <h2>Portal sign-in help requested</h2>
      <p><strong>Email:</strong> ${emailLower}</p>
      <p>This email matches an active portal account at <strong>${tenantName}</strong>.</p>
      <p>Review in Settings → Portal → Access requests.</p>
    `
        : lookup.status === "record_no_account"
          ? `
      <h2>New portal access request</h2>
      <p><strong>Email:</strong> ${emailLower}</p>
      <p>This email matches an existing ${lookup.supplierId ? "supplier" : "customer"} record at <strong>${tenantName}</strong> without a portal account.</p>
      <p>Approve or reject in Settings → Portal → Access requests.</p>
    `
          : lookup.status === "portal_suspended" || lookup.status === "portal_locked"
            ? `
      <h2>Portal access help requested</h2>
      <p><strong>Email:</strong> ${emailLower}</p>
      <p>Account status: <strong>${lookup.status.replace(/_/g, " ")}</strong> at ${tenantName}.</p>
    `
            : `
      <h2>Portal access request</h2>
      <p><strong>Email:</strong> ${emailLower}</p>
      <p>No matching record was found at <strong>${tenantName}</strong>.</p>
      <p>Review in Settings → Portal → Access requests.</p>
    `;

    void sendEmail({
      to: supportEmail,
      subject: `Portal access request — ${emailLower}`,
      html,
    }).catch((err) => logError("Portal access request support email failed", err));
  }

  void notifyAdminsPortalAccessRequest(input.storage, {
    tenantId: lookup.tenantId,
    tenantName,
    email: emailLower,
    accessRequestId: request.id,
    lookupStatus: lookup.status,
  }).catch((err) => logError("Portal access request admin notification failed", err));

  if (lookup.status === "portal_active") {
    return {
      ok: true,
      status: lookup.status,
      message: `We found your portal account at ${tenantName}. Your organization has been notified. You can also use Sign in to receive a magic link at ${emailLower}.`,
    };
  }

  if (lookup.status === "portal_suspended") {
    return {
      ok: true,
      status: lookup.status,
      message: lookup.message,
    };
  }

  if (lookup.status === "portal_locked") {
    return {
      ok: true,
      status: lookup.status,
      message: `${lookup.message} Your organization has been notified.`,
    };
  }

  if (lookup.status === "record_no_account") {
    return {
      ok: true,
      status: lookup.status,
      message: `We found ${emailLower} on file at ${tenantName}. Your organization has been notified and will activate your portal access soon.`,
    };
  }

  return {
    ok: true,
    status: lookup.status,
    message: supportEmail
      ? `Your request was sent to ${tenantName}. They will contact you at ${emailLower} if a record matches.`
      : `Your request was received. ${tenantName} will review it and contact you at ${emailLower}.`,
  };
}

async function notifyAdminsPortalAccessRequest(
  storage: IStorage,
  params: {
    tenantId: string;
    tenantName: string;
    email: string;
    accessRequestId: string;
    lookupStatus: string;
  },
) {
  await createAndSendNotifications(storage, {
    tenantId: params.tenantId,
    notificationTypeKey: "portal_access_request",
    title: "Portal access request",
    message: `${params.email} requested portal access (${params.lookupStatus.replace(/_/g, " ")}).`,
    htmlEmail: `
      <h2>Portal access request</h2>
      <p><strong>Email:</strong> ${params.email}</p>
      <p><strong>Organization:</strong> ${params.tenantName}</p>
      <p>Review pending requests under <strong>Settings → Portal → Access requests</strong>.</p>
    `,
    metadata: {
      accessRequestId: params.accessRequestId,
      email: params.email,
      lookupStatus: params.lookupStatus,
      deepLink: "/settings#portal",
    },
  });
}

export async function approvePortalAccessRequest(input: {
  storage: IStorage;
  tenantId: string;
  requestId: string;
  reviewerUserId: string;
  password?: string;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = await repo.getPortalAccessRequest(input.tenantId, input.requestId);
  if (!request) return { ok: false, error: "Access request not found" };
  if (request.status !== "pending") return { ok: false, error: "This request has already been reviewed" };
  if (!request.customerId && !request.supplierId && !request.portalUserId) {
    return {
      ok: false,
      error: "Cannot approve — no customer or supplier record is linked to this email. Create the customer/supplier record first, add a portal account manually, or reject the request.",
    };
  }

  const settings = await repo.getTenantPortalSettingsRow(input.tenantId);
  if (!settings?.enabled) return { ok: false, error: "Portal is disabled" };

  const tenant = await input.storage.getTenant(input.tenantId);
  if (!tenant) return { ok: false, error: "Organization not found" };

  let portalUser = request.portalUserId
    ? await repo.findPortalUserById(request.portalUserId)
    : request.supplierId
      ? await repo.findPortalUserBySupplierId(input.tenantId, request.supplierId)
      : request.customerId
        ? await repo.findPortalUserByCustomerId(input.tenantId, request.customerId)
        : undefined;
  const emailLower = request.email.trim().toLowerCase();
  const isNewAccount = !portalUser;
  const tempPassword = input.password?.trim() || generateTemporaryPassword();

  if (!portalUser) {
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    portalUser = await repo.createPortalUserRecord({
      tenantId: input.tenantId,
      partyType: request.supplierId ? "supplier" : "customer",
      customerId: request.customerId,
      supplierId: request.supplierId,
      emailLower,
      passwordHash,
    });
  } else {
    const patch: Parameters<typeof repo.updatePortalUserRecord>[1] = {};
    if (portalUser.status === "suspended") {
      patch.status = "active";
      patch.failedLoginAttempts = 0;
      patch.lockedUntil = null;
    }
    if (portalUser.email !== emailLower) {
      const dup = await repo.findPortalUserByEmail(input.tenantId, emailLower);
      if (dup && dup.id !== portalUser.id) {
        return { ok: false, error: "This email is already used for another portal account" };
      }
      patch.email = emailLower;
    }
    if (input.password?.trim()) {
      patch.passwordHash = await bcrypt.hash(input.password.trim(), 12);
    }
    if (Object.keys(patch).length > 0) {
      portalUser = (await repo.updatePortalUserRecord(portalUser.id, patch)) ?? portalUser;
    }
  }

  const ctx = await repo.loadPortalContext(portalUser.id);
  const firstName = ctx?.firstName?.trim() || emailLower.split("@")[0];
  const lastName = ctx?.lastName?.trim() || "";

  if (isNewAccount || input.password?.trim()) {
    const magicLink = await createPortalMagicTokenForUser(portalUser.id);
    const slug = (tenant as { portalSlug?: string | null }).portalSlug?.trim();
    const loginUrl = slug
      ? `${portalFrontendBaseUrl()}/portal/login?org=${encodeURIComponent(slug)}`
      : `${portalFrontendBaseUrl()}/portal/login`;

    void sendEmail({
      to: emailLower,
      subject: `Your portal account — ${tenant.name}`,
      html: getPortalAccessEmail({
        firstName,
        lastName,
        tenantName: tenant.name,
        magicLink,
        loginUrl,
        email: emailLower,
        temporaryPassword: tempPassword,
        supportEmail: settings.supportEmail,
        privacyPolicyUrl: settings.privacyPolicyUrl,
        expiresMinutes: Math.round(repo.MAGIC_TOKEN_MS / 60000),
      }),
    }).catch((err) => logError("Portal access approval email failed", err));
  } else {
    const issued = await issuePortalMagicLink({
      portalUserId: portalUser.id,
      email: portalUser.email,
      tenantName: tenant.name,
      firstName,
      lastName,
      supportEmail: settings.supportEmail,
      bypassRateLimit: true,
    });
    if (!issued.ok) {
      return { ok: false, error: issued.error };
    }
  }

  await repo.updatePortalAccessRequest(input.tenantId, input.requestId, {
    status: "approved",
    reviewerNotes: input.notes ?? null,
    reviewedByUserId: input.reviewerUserId,
    reviewedAt: new Date(),
    portalUserId: portalUser.id,
  });

  return { ok: true };
}

export async function rejectPortalAccessRequest(input: {
  tenantId: string;
  requestId: string;
  reviewerUserId: string;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = await repo.getPortalAccessRequest(input.tenantId, input.requestId);
  if (!request) return { ok: false, error: "Access request not found" };
  if (request.status !== "pending") return { ok: false, error: "This request has already been reviewed" };

  await repo.updatePortalAccessRequest(input.tenantId, input.requestId, {
    status: "rejected",
    reviewerNotes: input.notes ?? null,
    reviewedByUserId: input.reviewerUserId,
    reviewedAt: new Date(),
  });

  return { ok: true };
}

export async function updatePortalUserAccountStatus(input: {
  tenantId: string;
  portalUserId: string;
  status: "active" | "suspended";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await repo.findPortalUserById(input.portalUserId);
  if (!user || user.tenantId !== input.tenantId) return { ok: false, error: "Portal account not found" };

  await repo.updatePortalUserRecord(input.portalUserId, {
    status: input.status,
    ...(input.status === "active" ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
  });

  if (input.status === "suspended") {
    await repo.deleteAllPortalSessionsForUser(input.portalUserId);
  }

  return { ok: true };
}

export async function sendPortalUserMagicLink(input: {
  storage: IStorage;
  tenantId: string;
  portalUserId: string;
}): Promise<{ ok: true; emailSent: boolean } | { ok: false; error: string }> {
  const user = await repo.findPortalUserById(input.portalUserId);
  if (!user || user.tenantId !== input.tenantId) return { ok: false, error: "Portal account not found" };
  if (user.status === "suspended") return { ok: false, error: "Account is suspended" };

  const ctx = await repo.loadPortalContext(user.id);
  const tenant = await input.storage.getTenant(input.tenantId);
  const issued = await issuePortalMagicLink({
    portalUserId: user.id,
    email: user.email,
    tenantName: tenant?.name ?? "Your organization",
    firstName: ctx?.firstName ?? undefined,
    lastName: ctx?.lastName ?? undefined,
    supportEmail: ctx?.settings?.supportEmail ?? null,
  });

  if (!issued.ok) return { ok: false, error: issued.error };
  return { ok: true, emailSent: issued.emailSent };
}
