import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { tenantSecuritySettings } from "@shared/schema";
import {
  DEFAULT_TENANT_SECURITY_POLICY,
  assertSessionWarningLeadValid,
  mergeTenantSecurityPolicy,
  type TenantSecurityPolicy,
} from "../../shared/sessionPolicy";

export async function getTenantSecuritySettingsRow(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantSecuritySettings)
    .where(eq(tenantSecuritySettings.tenantId, tenantId))
    .limit(1);
  return row;
}

export async function getTenantSecurityPolicy(tenantId: string | null | undefined): Promise<TenantSecurityPolicy> {
  if (!tenantId) return { ...DEFAULT_TENANT_SECURITY_POLICY };
  const row = await getTenantSecuritySettingsRow(tenantId);
  if (!row) return { ...DEFAULT_TENANT_SECURITY_POLICY };
  return mergeTenantSecurityPolicy({
    staffSessionAbsoluteHours: row.staffSessionAbsoluteHours,
    staffSessionIdleMinutes: row.staffSessionIdleMinutes,
    portalSessionAbsoluteDays: row.portalSessionAbsoluteDays,
    portalSessionIdleMinutes: row.portalSessionIdleMinutes,
    portalSessionSlidingDays: row.portalSessionSlidingDays,
    sessionWarningLeadMinutes: row.sessionWarningLeadMinutes,
    requireMfa: row.requireMfa,
  });
}

export async function upsertTenantSecuritySettings(
  tenantId: string,
  data: Partial<TenantSecurityPolicy>,
) {
  const now = new Date();
  const existing = await getTenantSecuritySettingsRow(tenantId);
  const merged = mergeTenantSecurityPolicy({
    staffSessionAbsoluteHours: data.staffSessionAbsoluteHours ?? existing?.staffSessionAbsoluteHours,
    staffSessionIdleMinutes: data.staffSessionIdleMinutes ?? existing?.staffSessionIdleMinutes,
    portalSessionAbsoluteDays: data.portalSessionAbsoluteDays ?? existing?.portalSessionAbsoluteDays,
    portalSessionIdleMinutes: data.portalSessionIdleMinutes ?? existing?.portalSessionIdleMinutes,
    portalSessionSlidingDays: data.portalSessionSlidingDays ?? existing?.portalSessionSlidingDays,
    sessionWarningLeadMinutes: data.sessionWarningLeadMinutes ?? existing?.sessionWarningLeadMinutes,
    requireMfa: data.requireMfa ?? existing?.requireMfa,
  });
  assertSessionWarningLeadValid(merged);
  await db
    .insert(tenantSecuritySettings)
    .values({
      tenantId,
      staffSessionAbsoluteHours: merged.staffSessionAbsoluteHours,
      staffSessionIdleMinutes: merged.staffSessionIdleMinutes,
      portalSessionAbsoluteDays: merged.portalSessionAbsoluteDays,
      portalSessionIdleMinutes: merged.portalSessionIdleMinutes,
      portalSessionSlidingDays: merged.portalSessionSlidingDays,
      sessionWarningLeadMinutes: merged.sessionWarningLeadMinutes,
      requireMfa: merged.requireMfa,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: tenantSecuritySettings.tenantId,
      set: {
        staffSessionAbsoluteHours: merged.staffSessionAbsoluteHours,
        staffSessionIdleMinutes: merged.staffSessionIdleMinutes,
        portalSessionAbsoluteDays: merged.portalSessionAbsoluteDays,
        portalSessionIdleMinutes: merged.portalSessionIdleMinutes,
        portalSessionSlidingDays: merged.portalSessionSlidingDays,
        sessionWarningLeadMinutes: merged.sessionWarningLeadMinutes,
        requireMfa: merged.requireMfa,
        updatedAt: now,
      },
    });
  return merged;
}
