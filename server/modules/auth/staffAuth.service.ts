import crypto from "crypto";
import type { User, UserSession } from "@shared/schema";
import type { IStorage } from "../../storage";
import {
  getStaffSessionTiming,
  isStaffSessionExpired,
  serializeSessionTiming,
  staffSessionCookieMaxAgeMs,
  staffSessionExpiresAt,
  type SessionTimingPayload,
  type TenantSecurityPolicy,
} from "../../shared/sessionPolicy";
import { getTenantSecurityPolicy } from "../security/security.repository";
import { withDbRetry } from "../../shared/dbErrors";
import { createMfaChallenge } from "./mfa.service";

export type StaffUserPayload = {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  role: User["role"];
  tenantId: string | null;
  isEmailVerified: boolean | null;
  isPhoneVerified: boolean | null;
};

export function staffUserPayload(user: User): StaffUserPayload {
  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tenantId: user.tenantId,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  };
}

export function staffRedirectFor(user: User): string {
  if (user.role === "super_admin" && !user.tenantId) return "/super-admin/dashboard";
  if (user.role === "operations") return "/operational-duties";
  if (user.role === "fleet_operator" && user.tenantId) return "/fleet";
  return "/dashboard";
}

export async function issueStaffSession(
  storage: IStorage,
  user: User,
  policy?: TenantSecurityPolicy,
): Promise<{ sessionToken: string; expires: Date; sessionMaxAgeMs: number }> {
  const resolvedPolicy = policy ?? (await getTenantSecurityPolicy(user.tenantId));
  const now = new Date();
  const expires = staffSessionExpiresAt(now, resolvedPolicy);
  const sessionToken = crypto.randomBytes(32).toString("hex");
  await storage.createUserSession({
    userId: user.id,
    sessionToken,
    expires,
    lastActivityAt: now,
  });
  await storage.updateUserLastLogin(user.id);
  return {
    sessionToken,
    expires,
    sessionMaxAgeMs: staffSessionCookieMaxAgeMs(resolvedPolicy),
  };
}

export async function staffMfaGate(
  storage: IStorage,
  user: User,
  policy: TenantSecurityPolicy,
  generateToken: () => string,
):
  Promise<
    | { kind: "session"; sessionToken: string; sessionMaxAgeMs: number; redirectTo: string }
    | { kind: "mfa"; mfaChallengeToken: string }
    | { kind: "setup"; setupToken: string }
  > {
  const tenantBound = !!user.tenantId;
  /** Tenant "Require MFA" only — personal enrollment does not prompt at login when org MFA is off. */
  const needsMfa = tenantBound && policy.requireMfa;
  if (!needsMfa) {
    const sess = await issueStaffSession(storage, user, policy);
    return { kind: "session", sessionToken: sess.sessionToken, sessionMaxAgeMs: sess.sessionMaxAgeMs, redirectTo: staffRedirectFor(user) };
  }
  if (!user.mfaEnabled) {
    const setupToken = generateToken();
    await createMfaChallenge(user.id, "setup", setupToken);
    return { kind: "setup", setupToken };
  }
  const mfaChallengeToken = generateToken();
  await createMfaChallenge(user.id, "login", mfaChallengeToken);
  return { kind: "mfa", mfaChallengeToken };
}

export async function validateStaffSessionRow(
  storage: IStorage,
  session: UserSession,
  user: User,
): Promise<boolean> {
  const policy = await getTenantSecurityPolicy(user.tenantId);
  if (isStaffSessionExpired(session, policy)) {
    await storage.deleteUserSession(session.sessionToken);
    return false;
  }
  await storage.touchUserSession(session.sessionToken, { lastActivityAt: new Date() });
  return true;
}

export async function peekStaffSessionTiming(
  storage: IStorage,
  sessionToken: string,
): Promise<SessionTimingPayload | null> {
  const session = await withDbRetry(() => storage.getUserSession(sessionToken));
  if (!session) return null;
  const user = await withDbRetry(() => storage.getUser(session.userId));
  if (!user) return null;
  if (user.tenantId) {
    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant || tenant.status !== "active") return null;
  }
  const policy = await getTenantSecurityPolicy(user.tenantId);
  if (isStaffSessionExpired(session, policy)) return null;
  return serializeSessionTiming(getStaffSessionTiming(session, policy), policy, "staff");
}
