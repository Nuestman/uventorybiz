import type { IStorage } from "../../storage";
import {
  getPortalSessionTiming,
  isPortalSessionExpired,
  portalSessionCookieMaxAgeMs,
  portalSessionExpiresAfterActivity,
  portalSessionInitialExpiresAt,
  serializeSessionTiming,
  type SessionTimingPayload,
  type TenantSecurityPolicy,
} from "../../shared/sessionPolicy";
import { getTenantSecurityPolicy } from "../security/security.repository";
import { logError } from "../../logger";
import { withDbRetry } from "../../shared/dbErrors";
import * as portalRepo from "./portal.repository";

type PortalSessionRow = {
  sessionToken: string;
  expires: Date;
  lastActivityAt: Date | null;
  createdAt: Date | null;
  portalUserId: string;
};

export async function createPortalSessionForUser(portalUserId: string, tenantId: string, sessionToken: string) {
  const policy = await getTenantSecurityPolicy(tenantId);
  const now = new Date();
  const expires = portalSessionInitialExpiresAt(now, policy);
  await portalRepo.createPortalSessionRecord(portalUserId, sessionToken, expires);
  return { expires, cookieMaxAgeMs: portalSessionCookieMaxAgeMs(expires, now) };
}

export async function validateAndTouchPortalSession(
  session: PortalSessionRow,
  tenantId: string,
  policy?: TenantSecurityPolicy,
): Promise<{ ok: true; cookieMaxAgeMs: number } | { ok: false }> {
  const resolved = policy ?? (await getTenantSecurityPolicy(tenantId));
  const now = new Date();
  if (isPortalSessionExpired(session, resolved, now)) {
    try {
      await portalRepo.deletePortalSession(session.sessionToken);
    } catch (err) {
      logError("Portal session delete failed", err);
    }
    return { ok: false };
  }
  const nextExpires = portalSessionExpiresAfterActivity(session, resolved, now);
  try {
    await withDbRetry(() =>
      portalRepo.touchPortalSession(session.sessionToken, { lastActivityAt: now, expires: nextExpires }),
    );
  } catch (err) {
    logError("Portal session touch failed (request continues)", err);
  }
  return { ok: true, cookieMaxAgeMs: portalSessionCookieMaxAgeMs(nextExpires, now) };
}

export async function peekPortalSessionTiming(sessionToken: string): Promise<SessionTimingPayload | null> {
  const session = await withDbRetry(() => portalRepo.findPortalSessionByToken(sessionToken));
  if (!session) return null;
  const pu = await withDbRetry(() => portalRepo.findPortalUserById(session.portalUserId));
  if (!pu || pu.status !== "active") return null;
  const policy = await getTenantSecurityPolicy(pu.tenantId);
  const now = new Date();
  if (isPortalSessionExpired(session, policy, now)) return null;
  return serializeSessionTiming(getPortalSessionTiming(session, policy, now), policy, "portal");
}
