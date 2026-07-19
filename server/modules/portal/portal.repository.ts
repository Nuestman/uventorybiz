import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../config/db";
import {
  appointments,
  careLocations,
  companies,
  customers,
  employees,
  patients,
  portalAppointmentRequests,
  portalAccessRequests,
  portalAuditEvents,
  portalMagicLoginTokens,
  portalSessions,
  portalUsers,
  suppliers,
  tenantPortalSettings,
  tenants,
} from "@shared/schema";

export const PORTAL_DEFAULT_FEATURES = {
  appointments: true,
  vitals: true,
  visits: true,
  healthProfile: true,
  employeeProfile: true,
  medications: true,
  messaging: true,
  /** Platform tickets flag is merged at session build time — default true matches platform registry. */
  tickets: true,
};

export type PortalFeatures = {
  appointments: boolean;
  vitals: boolean;
  symptoms: boolean;
  visits: boolean;
  healthProfile: boolean;
  employeeProfile: boolean;
  medications: boolean;
  messaging: boolean;
  /** When true (and platform tickets enabled), portal Support is available. */
  tickets: boolean;
};

export function mergePortalFeatures(raw: unknown): PortalFeatures {
  const o = raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};
  return {
    appointments: o.appointments !== false,
    vitals: o.vitals !== false,
    symptoms: o.symptoms !== false,
    visits: o.visits !== false,
    healthProfile: o.healthProfile !== false,
    employeeProfile: o.employeeProfile !== false,
    medications: o.medications !== false,
    messaging: o.messaging !== false,
    // Tenant JSON cannot disable tickets; platform flag controls this (merged in routes).
    tickets: true,
  };
}

export async function findTenantByPortalSlug(slug: string) {
  const norm = slug.trim().toLowerCase();
  if (!norm) return undefined;
  const [row] = await db
    .select()
    .from(tenants)
    .where(sql`lower(${tenants.portalSlug}) = ${norm}`)
    .limit(1);
  return row;
}

export async function getTenantById(tenantId: string) {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row;
}

export async function getTenantPortalSettingsRow(tenantId: string) {
  const [row] = await db
    .select()
    .from(tenantPortalSettings)
    .where(eq(tenantPortalSettings.tenantId, tenantId))
    .limit(1);
  return row;
}

export async function upsertTenantPortalSettings(
  tenantId: string,
  data: {
    enabled: boolean;
    supportEmail?: string | null;
    privacyPolicyUrl?: string | null;
    featuresJson?: Record<string, unknown>;
  },
) {
  const now = new Date();
  await db
    .insert(tenantPortalSettings)
    .values({
      tenantId,
      enabled: data.enabled,
      supportEmail: data.supportEmail ?? null,
      privacyPolicyUrl: data.privacyPolicyUrl ?? null,
      featuresJson: data.featuresJson ?? {},
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: tenantPortalSettings.tenantId,
      set: {
        enabled: data.enabled,
        supportEmail: data.supportEmail ?? null,
        privacyPolicyUrl: data.privacyPolicyUrl ?? null,
        ...(data.featuresJson !== undefined ? { featuresJson: data.featuresJson } : {}),
        updatedAt: now,
      },
    });
}

export async function updateTenantPortalSlug(tenantId: string, portalSlug: string | null) {
  await db
    .update(tenants)
    .set({
      portalSlug: portalSlug?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
}

export async function findPortalUserByEmail(tenantId: string, emailLower: string) {
  const [row] = await db
    .select()
    .from(portalUsers)
    .where(and(eq(portalUsers.tenantId, tenantId), eq(portalUsers.email, emailLower)))
    .limit(1);
  return row;
}

/** All active portal accounts with this email (for magic-link tenant resolution). */
export async function findPortalUsersByEmail(emailLower: string) {
  return db
    .select({
      portalUser: portalUsers,
      tenant: tenants,
      settings: tenantPortalSettings,
    })
    .from(portalUsers)
    .innerJoin(tenants, eq(portalUsers.tenantId, tenants.id))
    .leftJoin(tenantPortalSettings, eq(tenantPortalSettings.tenantId, tenants.id))
    .where(and(eq(portalUsers.email, emailLower), eq(portalUsers.status, "active")));
}

export async function findPortalUserById(id: string) {
  const [row] = await db.select().from(portalUsers).where(eq(portalUsers.id, id)).limit(1);
  return row;
}

export type PortalPartyType = "customer" | "supplier";

export async function findPortalUserByCustomerId(tenantId: string, customerId: string) {
  const [row] = await db
    .select()
    .from(portalUsers)
    .where(and(eq(portalUsers.tenantId, tenantId), eq(portalUsers.customerId, customerId)))
    .limit(1);
  return row;
}

export async function findPortalUserBySupplierId(tenantId: string, supplierId: string) {
  const [row] = await db
    .select()
    .from(portalUsers)
    .where(and(eq(portalUsers.tenantId, tenantId), eq(portalUsers.supplierId, supplierId)))
    .limit(1);
  return row;
}

export async function findCustomerById(tenantId: string, customerId: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function findSupplierById(tenantId: string, supplierId: string) {
  const [row] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function findCustomerByEmail(tenantId: string, emailLower: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.tenantId, tenantId),
        sql`${customers.email} IS NOT NULL`,
        sql`lower(${customers.email}) = ${emailLower}`,
      ),
    )
    .limit(1);
  return row;
}

export async function findSupplierByEmail(tenantId: string, emailLower: string) {
  const [row] = await db
    .select()
    .from(suppliers)
    .where(
      and(
        eq(suppliers.tenantId, tenantId),
        sql`${suppliers.email} IS NOT NULL`,
        sql`lower(${suppliers.email}) = ${emailLower}`,
      ),
    )
    .limit(1);
  return row;
}

export async function findPortalUserByPatientId(tenantId: string, patientId: string) {
  const [row] = await db
    .select()
    .from(portalUsers)
    .where(and(eq(portalUsers.tenantId, tenantId), eq(portalUsers.patientId, patientId)))
    .limit(1);
  return row;
}

function resolvePortalPartyType(
  row: typeof portalUsers.$inferSelect,
): PortalPartyType {
  if (row.partyType === "supplier" || row.supplierId) return "supplier";
  return "customer";
}

export type PortalContext = {
  portalUser: typeof portalUsers.$inferSelect;
  tenant: typeof tenants.$inferSelect;
  settings: typeof tenantPortalSettings.$inferSelect | undefined;
  partyType: PortalPartyType;
  firstName: string;
  lastName: string;
  customer?: typeof customers.$inferSelect;
  supplier?: typeof suppliers.$inferSelect;
  patient?: typeof patients.$inferSelect;
  employee?: typeof employees.$inferSelect;
  company?: typeof companies.$inferSelect | null;
};

export function buildPortalSessionUser(ctx: PortalContext) {
  return {
    email: ctx.portalUser.email,
    partyType: ctx.partyType,
    customerId: ctx.portalUser.customerId ?? null,
    supplierId: ctx.portalUser.supplierId ?? null,
    patientId: ctx.portalUser.patientId ?? null,
    firstName: ctx.firstName,
    lastName: ctx.lastName,
    employeeNumber: ctx.employee?.employeeNumber,
    profileImageUrl: ctx.employee?.profileImageUrl ?? null,
    jobTitle: ctx.employee?.jobTitle ?? null,
    phoneNumber: ctx.employee?.phoneNumber ?? ctx.customer?.phone ?? ctx.supplier?.phone ?? null,
  };
}
export async function isPortalSlugAvailableForTenant(tenantId: string, slug: string) {
  const existing = await findTenantByPortalSlug(slug);
  return !existing || existing.id === tenantId;
}

export async function deletePortalUser(portalUserId: string, tenantId: string) {
  const u = await findPortalUserById(portalUserId);
  if (!u || u.tenantId !== tenantId) return false;
  await deleteAllPortalSessionsForUser(portalUserId);
  await db.delete(portalUsers).where(eq(portalUsers.id, portalUserId));
  return true;
}

export async function createPortalUserRecord(input: {
  tenantId: string;
  partyType?: PortalPartyType;
  patientId?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  emailLower: string;
  passwordHash: string;
}) {
  const partyType =
    input.partyType ??
    (input.supplierId ? "supplier" : "customer");
  const [row] = await db
    .insert(portalUsers)
    .values({
      tenantId: input.tenantId,
      partyType,
      patientId: input.patientId ?? null,
      customerId: input.customerId ?? null,
      supplierId: input.supplierId ?? null,
      email: input.emailLower,
      passwordHash: input.passwordHash,
      status: "active",
      failedLoginAttempts: 0,
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function updatePortalUserRecord(
  portalUserId: string,
  patch: Partial<{
    email: string;
    passwordHash: string;
    status: string;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    lastLoginAt: Date | null;
    lastAcknowledgedReleaseVersion: string | null;
  }>,
) {
  const [row] = await db
    .update(portalUsers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(portalUsers.id, portalUserId))
    .returning();
  return row;
}

export async function createPortalSessionRecord(portalUserId: string, sessionToken: string, expires: Date) {
  const now = new Date();
  const [row] = await db
    .insert(portalSessions)
    .values({ portalUserId, sessionToken, expires, lastActivityAt: now })
    .returning();
  return row;
}

export async function touchPortalSession(sessionToken: string, patch: { lastActivityAt: Date; expires: Date }) {
  await db
    .update(portalSessions)
    .set({ lastActivityAt: patch.lastActivityAt, expires: patch.expires })
    .where(eq(portalSessions.sessionToken, sessionToken));
}

export async function findValidPortalSession(sessionToken: string) {
  const now = new Date();
  const [sess] = await db
    .select()
    .from(portalSessions)
    .where(and(eq(portalSessions.sessionToken, sessionToken), gte(portalSessions.expires, now)))
    .limit(1);
  return sess;
}

export async function findPortalSessionByToken(sessionToken: string) {
  const [sess] = await db
    .select()
    .from(portalSessions)
    .where(eq(portalSessions.sessionToken, sessionToken))
    .limit(1);
  return sess;
}

export async function deletePortalSession(sessionToken: string) {
  await db.delete(portalSessions).where(eq(portalSessions.sessionToken, sessionToken));
}

export async function deleteAllPortalSessionsForUser(portalUserId: string) {
  await db.delete(portalSessions).where(eq(portalSessions.portalUserId, portalUserId));
}

const MAGIC_TOKEN_MS = 15 * 60 * 1000;
const MAGIC_RATE_LIMIT_MS = 5 * 60 * 1000;
const MAGIC_RATE_LIMIT_MAX = 3;

export async function createMagicLoginToken(portalUserId: string, token: string, expires: Date) {
  await db
    .delete(portalMagicLoginTokens)
    .where(and(eq(portalMagicLoginTokens.portalUserId, portalUserId), sql`${portalMagicLoginTokens.usedAt} IS NULL`));
  const [row] = await db
    .insert(portalMagicLoginTokens)
    .values({ portalUserId, token, expires })
    .returning();
  return row;
}

export async function countRecentMagicLoginTokens(portalUserId: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(portalMagicLoginTokens)
    .where(and(eq(portalMagicLoginTokens.portalUserId, portalUserId), gte(portalMagicLoginTokens.createdAt, since)));
  return row?.count ?? 0;
}

export async function findValidMagicLoginToken(token: string) {
  const now = new Date();
  const [row] = await db
    .select({
      tokenRow: portalMagicLoginTokens,
      portalUser: portalUsers,
    })
    .from(portalMagicLoginTokens)
    .innerJoin(portalUsers, eq(portalMagicLoginTokens.portalUserId, portalUsers.id))
    .where(
      and(
        eq(portalMagicLoginTokens.token, token),
        gte(portalMagicLoginTokens.expires, now),
        sql`${portalMagicLoginTokens.usedAt} IS NULL`,
        eq(portalUsers.status, "active"),
      ),
    )
    .limit(1);
  return row;
}

export async function markMagicLoginTokenUsed(tokenId: string) {
  await db
    .update(portalMagicLoginTokens)
    .set({ usedAt: new Date() })
    .where(eq(portalMagicLoginTokens.id, tokenId));
}

export { MAGIC_TOKEN_MS, MAGIC_RATE_LIMIT_MS, MAGIC_RATE_LIMIT_MAX };

export async function insertPortalAudit(input: {
  tenantId: string;
  portalUserId?: string | null;
  patientId?: string | null;
  action: string;
  details?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await db.insert(portalAuditEvents).values({
    tenantId: input.tenantId,
    portalUserId: input.portalUserId ?? null,
    patientId: input.patientId ?? null,
    action: input.action,
    details: input.details === undefined ? null : (input.details as object),
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function listPortalUsersForTenant(tenantId: string) {
  const rows = await db
    .select({
      portalUser: portalUsers,
      customer: customers,
      supplier: suppliers,
    })
    .from(portalUsers)
    .leftJoin(customers, eq(portalUsers.customerId, customers.id))
    .leftJoin(suppliers, eq(portalUsers.supplierId, suppliers.id))
    .where(eq(portalUsers.tenantId, tenantId))
    .orderBy(desc(portalUsers.createdAt));
  return rows;
}

export async function createAppointmentRequest(input: {
  tenantId: string;
  patientId: string;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  preferredModality?: "in_person" | "telehealth" | "phone";
  preferredLocationId?: string | null;
  reason?: string | null;
}) {
  const [row] = await db
    .insert(portalAppointmentRequests)
    .values({
      tenantId: input.tenantId,
      patientId: input.patientId,
      preferredDate: input.preferredDate ?? null,
      preferredTimeWindow: input.preferredTimeWindow?.slice(0, 120) ?? null,
      preferredModality: input.preferredModality ?? "in_person",
      preferredLocationId: input.preferredLocationId ?? null,
      reason: input.reason ?? null,
      status: "pending",
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function listAppointmentRequestsForPatient(tenantId: string, patientId: string) {
  return db
    .select()
    .from(portalAppointmentRequests)
    .where(
      and(eq(portalAppointmentRequests.tenantId, tenantId), eq(portalAppointmentRequests.patientId, patientId)),
    )
    .orderBy(desc(portalAppointmentRequests.createdAt));
}

export async function getAppointmentRequestForPatient(
  tenantId: string,
  patientId: string,
  requestId: string,
) {
  const [row] = await db
    .select()
    .from(portalAppointmentRequests)
    .where(
      and(
        eq(portalAppointmentRequests.id, requestId),
        eq(portalAppointmentRequests.tenantId, tenantId),
        eq(portalAppointmentRequests.patientId, patientId),
      ),
    )
    .limit(1);
  return row;
}

export async function updateAppointmentRequestForPatient(
  tenantId: string,
  patientId: string,
  requestId: string,
  input: {
    preferredDate?: string | null;
    preferredTimeWindow?: string | null;
    preferredModality?: "in_person" | "telehealth" | "phone";
    preferredLocationId?: string | null;
    reason?: string | null;
  },
): Promise<{ row: typeof portalAppointmentRequests.$inferSelect } | { error: "NOT_FOUND" | "INVALID_STATE" }> {
  const existing = await getAppointmentRequestForPatient(tenantId, patientId, requestId);
  if (!existing) return { error: "NOT_FOUND" };
  if (existing.status !== "pending") return { error: "INVALID_STATE" };

  const nextModality = input.preferredModality ?? existing.preferredModality;

  const [row] = await db
    .update(portalAppointmentRequests)
    .set({
      preferredDate: input.preferredDate !== undefined ? input.preferredDate : existing.preferredDate,
      preferredTimeWindow:
        input.preferredTimeWindow !== undefined
          ? input.preferredTimeWindow?.slice(0, 120) ?? null
          : existing.preferredTimeWindow,
      preferredModality: nextModality,
      preferredLocationId:
        input.preferredLocationId !== undefined
          ? input.preferredLocationId
          : nextModality === "telehealth"
            ? null
            : existing.preferredLocationId,
      reason: input.reason !== undefined ? input.reason : existing.reason,
      updatedAt: new Date(),
    })
    .where(eq(portalAppointmentRequests.id, requestId))
    .returning();

  return { row };
}

/** Public tenant card for login page (no secrets). */
export async function getPublicTenantPortalCard(slug: string) {
  const tenant = await findTenantByPortalSlug(slug);
  if (!tenant) return null;
  const settings = await getTenantPortalSettingsRow(tenant.id);
  if (!settings?.enabled) return null;
  return {
    tenantId: tenant.id,
    name: tenant.name,
    appName: tenant.appName,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
    supportEmail: settings.supportEmail ?? tenant.contactEmail,
    privacyPolicyUrl: settings.privacyPolicyUrl,
  };
}

export async function loadPortalContext(portalUserId: string): Promise<PortalContext | null> {
  const pu = await findPortalUserById(portalUserId);
  if (!pu) return null;
  const tenant = await db.select().from(tenants).where(eq(tenants.id, pu.tenantId)).limit(1);
  const t = tenant[0];
  if (!t) return null;
  const settings = await getTenantPortalSettingsRow(pu.tenantId);
  const partyType = resolvePortalPartyType(pu);

  if (pu.customerId) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, pu.customerId), eq(customers.tenantId, pu.tenantId)))
      .limit(1);
    if (!customer) return null;
    return {
      portalUser: pu,
      tenant: t,
      settings,
      partyType,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customer,
    };
  }

  if (pu.supplierId) {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, pu.supplierId), eq(suppliers.tenantId, pu.tenantId)))
      .limit(1);
    if (!supplier) return null;
    const contactName = supplier.contactName?.trim();
    const nameParts = contactName ? contactName.split(/\s+/) : supplier.name.split(/\s+/);
    return {
      portalUser: pu,
      tenant: t,
      settings,
      partyType: "supplier",
      firstName: nameParts[0] ?? supplier.name,
      lastName: nameParts.slice(1).join(" "),
      supplier,
    };
  }

  if (pu.patientId) {
    const patientRow = await db
      .select({
        patient: patients,
        employee: employees,
        company: companies,
      })
      .from(patients)
      .innerJoin(employees, eq(patients.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(eq(patients.id, pu.patientId), eq(patients.tenantId, pu.tenantId)))
      .limit(1);
    const pr = patientRow[0];
    if (!pr) return null;
    return {
      portalUser: pu,
      tenant: t,
      settings,
      partyType,
      firstName: pr.employee.firstName,
      lastName: pr.employee.lastName,
      ...pr,
    };
  }

  const emailLocal = pu.email.split("@")[0] ?? "Portal";
  return {
    portalUser: pu,
    tenant: t,
    settings,
    partyType,
    firstName: emailLocal,
    lastName: "",
  };
}

export async function listAppointmentsForPatientPortal(tenantId: string, patientId: string) {
  const [patientRow] = await db
    .select({ employeeId: patients.employeeId })
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)))
    .limit(1);
  const employeeId = patientRow?.employeeId;
  if (!employeeId) return [];

  return db
    .select({
      appointment: appointments,
      locationName: careLocations.locationName,
      locationCode: careLocations.locationCode,
    })
    .from(appointments)
    .leftJoin(careLocations, eq(appointments.locationId, careLocations.id))
    .where(and(eq(appointments.tenantId, tenantId), eq(appointments.employeeId, employeeId)))
    .orderBy(desc(appointments.appointmentDate));
}

export type PortalTenantEmailMatch = {
  tenantId: string;
  tenantName: string;
  supportEmail: string | null;
  portalEnabled: boolean;
};

/** Distinct tenants where email matches an active portal user, customer, or supplier record. */
export async function findPortalEmailTenantMatches(emailLower: string): Promise<PortalTenantEmailMatch[]> {
  const portalRows = await db
    .select({
      tenantId: portalUsers.tenantId,
      tenantName: tenants.name,
      supportEmail: tenantPortalSettings.supportEmail,
      portalEnabled: tenantPortalSettings.enabled,
    })
    .from(portalUsers)
    .innerJoin(tenants, eq(portalUsers.tenantId, tenants.id))
    .leftJoin(tenantPortalSettings, eq(tenantPortalSettings.tenantId, tenants.id))
    .where(eq(portalUsers.email, emailLower));

  const customerRows = await db
    .select({
      tenantId: customers.tenantId,
      tenantName: tenants.name,
      supportEmail: tenantPortalSettings.supportEmail,
      portalEnabled: tenantPortalSettings.enabled,
    })
    .from(customers)
    .innerJoin(tenants, eq(customers.tenantId, tenants.id))
    .leftJoin(tenantPortalSettings, eq(tenantPortalSettings.tenantId, tenants.id))
    .where(sql`${customers.email} IS NOT NULL AND lower(${customers.email}) = ${emailLower}`);

  const supplierRows = await db
    .select({
      tenantId: suppliers.tenantId,
      tenantName: tenants.name,
      supportEmail: tenantPortalSettings.supportEmail,
      portalEnabled: tenantPortalSettings.enabled,
    })
    .from(suppliers)
    .innerJoin(tenants, eq(suppliers.tenantId, tenants.id))
    .leftJoin(tenantPortalSettings, eq(tenantPortalSettings.tenantId, tenants.id))
    .where(sql`${suppliers.email} IS NOT NULL AND lower(${suppliers.email}) = ${emailLower}`);

  const byTenant = new Map<string, PortalTenantEmailMatch>();
  for (const row of [...portalRows, ...customerRows, ...supplierRows]) {
    if (!row.portalEnabled) continue;
    byTenant.set(row.tenantId, {
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      supportEmail: row.supportEmail ?? null,
      portalEnabled: true,
    });
  }
  return [...byTenant.values()];
}

export async function createPortalAccessRequest(input: {
  tenantId: string;
  emailLower: string;
  customerId?: string | null;
  supplierId?: string | null;
  portalUserId?: string | null;
  requestKind: string;
  matchKind: string;
}) {
  const [row] = await db
    .insert(portalAccessRequests)
    .values({
      tenantId: input.tenantId,
      email: input.emailLower,
      customerId: input.customerId ?? null,
      supplierId: input.supplierId ?? null,
      portalUserId: input.portalUserId ?? null,
      requestKind: input.requestKind,
      matchKind: input.matchKind,
      status: "pending",
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function listPortalAccessRequestsForTenant(tenantId: string, status?: string) {
  const conditions = [eq(portalAccessRequests.tenantId, tenantId)];
  if (status) conditions.push(eq(portalAccessRequests.status, status));
  return db
    .select({
      request: portalAccessRequests,
      customer: customers,
      supplier: suppliers,
    })
    .from(portalAccessRequests)
    .leftJoin(customers, eq(portalAccessRequests.customerId, customers.id))
    .leftJoin(suppliers, eq(portalAccessRequests.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(portalAccessRequests.createdAt));
}

export async function getPortalAccessRequest(tenantId: string, requestId: string) {
  const [row] = await db
    .select()
    .from(portalAccessRequests)
    .where(and(eq(portalAccessRequests.id, requestId), eq(portalAccessRequests.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function updatePortalAccessRequest(
  tenantId: string,
  requestId: string,
  patch: Partial<{
    status: string;
    reviewerNotes: string | null;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    portalUserId: string | null;
  }>,
) {
  const [row] = await db
    .update(portalAccessRequests)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(portalAccessRequests.id, requestId), eq(portalAccessRequests.tenantId, tenantId)))
    .returning();
  return row;
}

export async function countRecentPendingAccessRequests(tenantId: string, emailLower: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(portalAccessRequests)
    .where(
      and(
        eq(portalAccessRequests.tenantId, tenantId),
        eq(portalAccessRequests.email, emailLower),
        eq(portalAccessRequests.status, "pending"),
        gte(portalAccessRequests.createdAt, since),
      ),
    );
  return row?.count ?? 0;
}
