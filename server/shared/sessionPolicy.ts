export const DEFAULT_STAFF_ABSOLUTE_HOURS = 24;
export const DEFAULT_STAFF_IDLE_MINUTES = 30;
export const DEFAULT_PORTAL_ABSOLUTE_DAYS = 14;
export const DEFAULT_PORTAL_IDLE_MINUTES = 60;
export const DEFAULT_PORTAL_SLIDING_DAYS = 7;
export const DEFAULT_SESSION_WARNING_LEAD_MINUTES = 3;
export const MFA_CHALLENGE_MS = 10 * 60 * 1000;

export type TenantSecurityPolicy = {
  staffSessionAbsoluteHours: number;
  staffSessionIdleMinutes: number;
  portalSessionAbsoluteDays: number;
  portalSessionIdleMinutes: number;
  portalSessionSlidingDays: number;
  sessionWarningLeadMinutes: number;
  idleTimeoutEnabled: boolean;
  requireMfa: boolean;
};

export const DEFAULT_TENANT_SECURITY_POLICY: TenantSecurityPolicy = {
  staffSessionAbsoluteHours: DEFAULT_STAFF_ABSOLUTE_HOURS,
  staffSessionIdleMinutes: DEFAULT_STAFF_IDLE_MINUTES,
  portalSessionAbsoluteDays: DEFAULT_PORTAL_ABSOLUTE_DAYS,
  portalSessionIdleMinutes: DEFAULT_PORTAL_IDLE_MINUTES,
  portalSessionSlidingDays: DEFAULT_PORTAL_SLIDING_DAYS,
  sessionWarningLeadMinutes: DEFAULT_SESSION_WARNING_LEAD_MINUTES,
  idleTimeoutEnabled: true,
  requireMfa: false,
};

export function mergeTenantSecurityPolicy(row: Partial<TenantSecurityPolicy> | null | undefined): TenantSecurityPolicy {
  return {
    staffSessionAbsoluteHours: row?.staffSessionAbsoluteHours ?? DEFAULT_STAFF_ABSOLUTE_HOURS,
    staffSessionIdleMinutes: row?.staffSessionIdleMinutes ?? DEFAULT_STAFF_IDLE_MINUTES,
    portalSessionAbsoluteDays: row?.portalSessionAbsoluteDays ?? DEFAULT_PORTAL_ABSOLUTE_DAYS,
    portalSessionIdleMinutes: row?.portalSessionIdleMinutes ?? DEFAULT_PORTAL_IDLE_MINUTES,
    portalSessionSlidingDays: row?.portalSessionSlidingDays ?? DEFAULT_PORTAL_SLIDING_DAYS,
    sessionWarningLeadMinutes: row?.sessionWarningLeadMinutes ?? DEFAULT_SESSION_WARNING_LEAD_MINUTES,
    idleTimeoutEnabled: row?.idleTimeoutEnabled ?? true,
    requireMfa: row?.requireMfa ?? false,
  };
}

/** Validates warning lead against idle timeouts; throws if invalid. */
export function assertSessionWarningLeadValid(policy: TenantSecurityPolicy): void {
  if (!policy.idleTimeoutEnabled) {
    const minAbsoluteMinutes = Math.min(
      policy.staffSessionAbsoluteHours * 60,
      policy.portalSessionAbsoluteDays * 24 * 60,
    );
    if (policy.sessionWarningLeadMinutes >= minAbsoluteMinutes) {
      throw new Error(
        `Expiry warning must be less than the shortest absolute session (${minAbsoluteMinutes} minutes).`,
      );
    }
    return;
  }
  const minIdle = Math.min(policy.staffSessionIdleMinutes, policy.portalSessionIdleMinutes);
  if (policy.sessionWarningLeadMinutes >= minIdle) {
    throw new Error(
      `Expiry warning must be less than the shortest idle timeout (${minIdle} minutes).`,
    );
  }
}

export function sessionWarningLeadSeconds(
  policy: TenantSecurityPolicy,
  context: "staff" | "portal",
): number {
  const configured = policy.sessionWarningLeadMinutes * 60;
  if (!policy.idleTimeoutEnabled) {
    const absoluteMinutes =
      context === "staff"
        ? policy.staffSessionAbsoluteHours * 60
        : policy.portalSessionAbsoluteDays * 24 * 60;
    const maxLead = Math.max(60, (absoluteMinutes - 1) * 60);
    return Math.min(configured, maxLead);
  }
  const idleMinutes =
    context === "staff" ? policy.staffSessionIdleMinutes : policy.portalSessionIdleMinutes;
  const maxLead = Math.max(60, (idleMinutes - 1) * 60);
  return Math.min(configured, maxLead);
}

export function staffSessionExpiresAt(now: Date, policy: TenantSecurityPolicy): Date {
  return new Date(now.getTime() + policy.staffSessionAbsoluteHours * 60 * 60 * 1000);
}

export function staffSessionCookieMaxAgeMs(policy: TenantSecurityPolicy): number {
  return policy.staffSessionAbsoluteHours * 60 * 60 * 1000;
}

type SessionActivityRow = {
  expires: Date;
  lastActivityAt: Date | null;
  createdAt: Date | null;
};

export function isStaffSessionExpired(session: SessionActivityRow, policy: TenantSecurityPolicy, now = new Date()): boolean {
  if (session.expires < now) return true;
  if (!policy.idleTimeoutEnabled) return false;
  const last = session.lastActivityAt ?? session.createdAt ?? now;
  const idleMs = policy.staffSessionIdleMinutes * 60 * 1000;
  return now.getTime() - last.getTime() > idleMs;
}

export function portalSessionInitialExpiresAt(now: Date, policy: TenantSecurityPolicy): Date {
  return new Date(now.getTime() + policy.portalSessionAbsoluteDays * 24 * 60 * 60 * 1000);
}

export function isPortalSessionExpired(session: SessionActivityRow, policy: TenantSecurityPolicy, now = new Date()): boolean {
  if (session.expires < now) return true;
  const created = session.createdAt ?? now;
  const absoluteCap = new Date(created.getTime() + policy.portalSessionAbsoluteDays * 24 * 60 * 60 * 1000);
  if (now > absoluteCap) return true;
  if (!policy.idleTimeoutEnabled) return false;
  const last = session.lastActivityAt ?? created;
  const idleMs = policy.portalSessionIdleMinutes * 60 * 1000;
  return now.getTime() - last.getTime() > idleMs;
}

/** Sliding portal expiry after valid activity. */
export function portalSessionExpiresAfterActivity(
  session: SessionActivityRow,
  policy: TenantSecurityPolicy,
  now = new Date(),
): Date {
  const created = session.createdAt ?? now;
  const absoluteCap = new Date(created.getTime() + policy.portalSessionAbsoluteDays * 24 * 60 * 60 * 1000);
  const sliding = new Date(now.getTime() + policy.portalSessionSlidingDays * 24 * 60 * 60 * 1000);
  return sliding < absoluteCap ? sliding : absoluteCap;
}

export function portalSessionCookieMaxAgeMs(expires: Date, now = new Date()): number {
  return Math.max(0, expires.getTime() - now.getTime());
}

export type SessionLimitingFactor = "idle" | "absolute";

export type SessionTiming = {
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  effectiveExpiresAt: Date;
  limitingFactor: SessionLimitingFactor;
};

export type SessionTimingPayload = {
  effectiveExpiresAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  limitingFactor: SessionLimitingFactor;
  warningLeadSeconds: number;
};

export function serializeSessionTiming(
  timing: SessionTiming,
  policy: TenantSecurityPolicy,
  context: "staff" | "portal",
): SessionTimingPayload {
  return {
    effectiveExpiresAt: timing.effectiveExpiresAt.toISOString(),
    idleExpiresAt: timing.idleExpiresAt.toISOString(),
    absoluteExpiresAt: timing.absoluteExpiresAt.toISOString(),
    limitingFactor: timing.limitingFactor,
    warningLeadSeconds: sessionWarningLeadSeconds(policy, context),
  };
}

export function getStaffSessionTiming(
  session: SessionActivityRow,
  policy: TenantSecurityPolicy,
  now = new Date(),
): SessionTiming {
  const absoluteExpiresAt = session.expires;
  if (!policy.idleTimeoutEnabled) {
    return {
      idleExpiresAt: absoluteExpiresAt,
      absoluteExpiresAt,
      effectiveExpiresAt: absoluteExpiresAt,
      limitingFactor: "absolute",
    };
  }
  const last = session.lastActivityAt ?? session.createdAt ?? now;
  const idleExpiresAt = new Date(last.getTime() + policy.staffSessionIdleMinutes * 60 * 1000);
  if (idleExpiresAt.getTime() <= absoluteExpiresAt.getTime()) {
    return { idleExpiresAt, absoluteExpiresAt, effectiveExpiresAt: idleExpiresAt, limitingFactor: "idle" };
  }
  return { idleExpiresAt, absoluteExpiresAt, effectiveExpiresAt: absoluteExpiresAt, limitingFactor: "absolute" };
}

export function getPortalSessionTiming(
  session: SessionActivityRow,
  policy: TenantSecurityPolicy,
  now = new Date(),
): SessionTiming {
  const created = session.createdAt ?? now;
  const slidingExpiresAt = session.expires;
  const absoluteCap = new Date(created.getTime() + policy.portalSessionAbsoluteDays * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt =
    slidingExpiresAt.getTime() <= absoluteCap.getTime() ? slidingExpiresAt : absoluteCap;

  if (!policy.idleTimeoutEnabled) {
    return {
      idleExpiresAt: absoluteExpiresAt,
      absoluteExpiresAt,
      effectiveExpiresAt: absoluteExpiresAt,
      limitingFactor: "absolute",
    };
  }

  const last = session.lastActivityAt ?? created;
  const idleExpiresAt = new Date(last.getTime() + policy.portalSessionIdleMinutes * 60 * 1000);

  const candidates: Array<{ at: Date; factor: SessionLimitingFactor }> = [
    { at: idleExpiresAt, factor: "idle" },
    { at: absoluteExpiresAt, factor: "absolute" },
  ];
  const effective = candidates.reduce((min, c) => (c.at.getTime() < min.at.getTime() ? c : min));
  return {
    idleExpiresAt,
    absoluteExpiresAt,
    effectiveExpiresAt: effective.at,
    limitingFactor: effective.factor,
  };
}
