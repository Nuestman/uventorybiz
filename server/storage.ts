import { AMBULANCE_PRESTART_CHECKLIST_ITEMS } from "@shared/ambulancePrestartChecklist";
import { DEFAULT_INVENTORY_CATEGORIES } from "@shared/inventoryCategories";
import { getAuditContext } from "./shared/auditContext";
import { LEGACY_STAFF_AUTH_PROVIDER } from "./modules/auth/auth.constants";
import {
  users,
  tenants,
  tenantPortalSettings,
  companies,
  employees,
  customers,
  posSales,
  patients,
  appointments,
  incidentReports,
  careLocations,
  referralFacilities,
  userSessions,
  impersonationEvents,
  notifications,
  notificationTypes,
  userNotificationPreferences,
  notificationDeliveryLogs,
  operationalDuties,
  operationalDutyAssignments,
  operationalDutyCompletions,
  shiftReports,
  shiftReportAcknowledgments,
  shiftReportLinks,
  shiftReportAttachments,
  shiftReportRevisionHistory,
  ticketNumberSequences,
  ticketCategories,
  tickets,
  ticketComments,
  ticketAttachments,
  ticketActivity,
  tenantSopDocuments,
  tenantSopVersions,
  tenantSignedLegalDocuments,
  auditLogs,
  inventoryCategories,
  inventoryItems,
  inventoryStock,
  inventoryTransactions,
  stockRequisitions,
  stockRequisitionItems,
  stockTransfers,
  stockTransferItems,
  equipmentMaintenance,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  inventoryAlerts,
  testingPrograms,
  drugTests,
  alcoholTests,
  hydrationTests,
  instantTests,
  randomTestingPools,
  randomSelections,
  testingEquipment,
  feedback,
  patientFollowUps,
  employeeWorkFitnessCases,
  employeeWorkFitnessMedications,
  employeeFeedback,
  ambulancePrestartChecks,
  type User,
  type UpsertUser,
  type UpsertTenant,
  type Tenant,
  type Company,
  type InsertCompany,
  type Employee,
  type InsertEmployee,
  type Patient,
  type InsertPatient,
  type CareLocation,
  type InsertCareLocation,
  type ReferralFacility,
  type InsertReferralFacility,
  type Appointment,
  type InsertAppointment,
  type UpdateAppointment,
  type IncidentReport,
  type InsertIncidentReport,
  type UserSession,
  type Notification,
  type InsertNotification,
  type NotificationType,
  type InsertNotificationType,
  type UserNotificationPreference,
  type InsertUserNotificationPreference,
  type NotificationDeliveryLog,
  type InsertNotificationDeliveryLog,
  type OperationalDuty,
  type InsertOperationalDuty,
  type DutyAssignment,
  type InsertDutyAssignment,
  type DutyCompletion,
  type InsertDutyCompletion,
  type ShiftReport,
  type InsertShiftReport,
  type ShiftReportAcknowledgment,
  type ShiftReportLink,
  type ShiftReportAttachment,
  type ShiftReportRevisionHistory,
  type Ticket,
  type TicketCategory,
  type InventoryCategory,
  type TicketComment,
  type TicketAttachment,
  type TicketActivity,
  type AuditLog,
  type InsertAuditLog,
  type ImpersonationEvent,
  type InsertImpersonationEvent,
  type MedicalInventory,
  type InsertMedicalInventory,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  type StockRequisition,
  type InsertStockRequisition,
  type StockRequisitionItem,
  type InsertStockRequisitionItem,
  type StockTransfer,
  type InsertStockTransfer,
  type StockTransferItem,
  type InsertStockTransferItem,
  type EquipmentMaintenance,
  type InsertEquipmentMaintenance,
  type Supplier,
  type InsertSupplier,
  type Customer,
  type InsertCustomer,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type InventoryAlert,
  type InsertInventoryAlert,
  type TestingProgram,
  type InsertTestingProgram,
  type DrugTest,
  type InsertDrugTest,
  type AlcoholTest,
  type InsertAlcoholTest,
  type HydrationTest,
  type InsertHydrationTest,
  type InstantTest,
  type InsertInstantTest,
  type RandomTestingPool,
  type InsertRandomTestingPool,
  type RandomSelection,
  type InsertRandomSelection,
  type TestingEquipment,
  type InsertTestingEquipment,
  type Feedback,
  type InsertFeedback,
  type PatientFollowUp,
  type InsertPatientFollowUp,
  type EmployeeWorkFitnessCase,
  type InsertEmployeeWorkFitnessCase,
  type EmployeeWorkFitnessMedication,
  type InsertEmployeeWorkFitnessMedication,
  type EmployeeFeedback,
  type InsertEmployeeFeedback,
  type CreateAmbulanceInput,
  type UpdateAmbulanceInput,
  type AmbulancePrestartCheck,
  type CreateAmbulancePrestartInput,
  type UpdateAmbulancePrestartInput,
  type TenantSopDocument,
  type TenantSopVersion,
  type TenantSignedLegalDocument,
} from "@shared/schema";
import { db } from "./config/db";
import { eq, desc, asc, and, gte, lte, lt, gt, count, sum, sql, or, ilike, isNotNull, isNull, ne, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notifyIncidentCreated, notifyIncidentUpdated, notifyInventoryAlert } from "./notificationTriggers";

export type SignedLegalDocumentTenantView = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  notes: string | null;
  createdAt: Date | null;
  uploadedByUserId: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
};

export type SignedLegalDocumentSuperView = SignedLegalDocumentTenantView & {
  tenantId: string;
  tenantName: string;
};

/** Super-admin impersonation log row with joined names (for UI and API). */
export type ImpersonationEventListRow = {
  id: string;
  impersonatorUserId: string;
  targetUserId: string;
  targetTenantId: string | null;
  action: string;
  reason: string | null;
  sessionTokenPrefix: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
  createdAt: Date | null;
  impersonatorEmail: string | null;
  impersonatorFirstName: string | null;
  impersonatorLastName: string | null;
  targetEmail: string | null;
  targetFirstName: string | null;
  targetLastName: string | null;
  tenantName: string | null;
};

/** Tenant audit rows where `details.impersonation.impersonatorUserId` is set (CRUD under support impersonation). */
export type ImpersonationAuditCrudRow = {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: unknown;
  createdAt: Date | null;
  effectiveUserEmail: string | null;
  effectiveUserFirstName: string | null;
  effectiveUserLastName: string | null;
  tenantName: string | null;
  impersonatorUserId: string | null;
  impersonatorEmail: string | null;
  impersonatorFirstName: string | null;
  impersonatorLastName: string | null;
};

/** Super-admin global audit log row (cross-tenant `audit_logs` with joins). */
export type GlobalAuditLogRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  originalData: unknown;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | null;
};

export interface IStorage {
  // User operations (staff auth + legacy Replit fields)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  /** Case-insensitive email match (for OIDC claims). */
  getUserByEmailNormalized(email: string): Promise<User | undefined>;
  getUserByOidcSubject(oauthIssuer: string, oauthSub: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmailOrPhone(email: string, phone: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  /** @deprecated Method name from pre-4.26 era; creates staff-auth (password) users. */
  createCustomUser(user: Partial<UpsertUser> & { employeeNumber?: string }): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  updateUserProfile(id: string, profile: { firstName?: string; lastName?: string; email?: string; phone?: string; bio?: string; }): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Session operations
  createUserSession(session: {
    userId: string;
    sessionToken: string;
    expires: Date;
    lastActivityAt?: Date;
  }): Promise<UserSession>;
  getUserSession(sessionToken: string): Promise<UserSession | undefined>;
  touchUserSession(sessionToken: string, patch: { lastActivityAt: Date; expires?: Date }): Promise<void>;
  deleteUserSession(sessionToken: string): Promise<void>;
  updateUserSessionImpersonation(
    sessionToken: string,
    data: { userId: string; impersonatorUserId: string | null; impersonationStartedAt: Date | null }
  ): Promise<void>;
  createImpersonationEvent(event: InsertImpersonationEvent): Promise<ImpersonationEvent>;
  getImpersonationEvents(limit?: number): Promise<ImpersonationEvent[]>;
  getImpersonationEventsEnriched(limit?: number): Promise<ImpersonationEventListRow[]>;
  getImpersonationEventById(id: string): Promise<ImpersonationEvent | undefined>;
  findNextImpersonationEndEvent(params: {
    impersonatorUserId: string;
    targetUserId: string;
    afterTime: Date;
    sessionTokenPrefix?: string | null;
  }): Promise<ImpersonationEvent | undefined>;
  findPreviousImpersonationStartEvent(params: {
    impersonatorUserId: string;
    targetUserId: string;
    beforeTime: Date;
    sessionTokenPrefix?: string | null;
  }): Promise<ImpersonationEvent | undefined>;
  getAuditLogsInImpersonationWindow(params: {
    tenantId: string;
    targetUserId: string;
    impersonatorUserId: string;
    windowStart: Date;
    windowEnd: Date;
    limit?: number;
  }): Promise<ImpersonationAuditCrudRow[]>;
  getAuditLogsDuringImpersonation(limit?: number): Promise<ImpersonationAuditCrudRow[]>;
  /** Recent rows across all tenants for super-admin global audit view. */
  getGlobalAuditLogs(limit?: number): Promise<GlobalAuditLogRow[]>;
  /** Lightweight DB connectivity check (no secrets returned). */
  pingDatabase(): Promise<boolean>;
  /** Aggregate counts for platform system status (may throw if DB error). */
  getPlatformScaleCounts(): Promise<{
    tenants: number;
    activeTenants: number;
    users: number;
    tenantBoundUsers: number;
    superAdminUsers: number;
    impersonationEventsLast24h: number;
  }>;

  // Tenant operations
  createTenant(tenant: UpsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenants(): Promise<Tenant[]>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: string, tenant: Partial<UpsertTenant>): Promise<Tenant>;
  updateTenantPlan(tenantId: string, planType: string): Promise<Tenant>;

  // Company operations - TENANT ISOLATED
  createCompany(company: InsertCompany, tenantId: string): Promise<Company>;
  getCompany(id: string, tenantId: string): Promise<Company | undefined>;
  getCompanies(tenantId: string): Promise<Company[]>;
  getOrCreateDefaultCompany(tenantId: string, tenantContactEmail?: string): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>, tenantId: string): Promise<Company>;
  deleteCompany(id: string, tenantId: string): Promise<void>;
  
  // Care Location operations - TENANT ISOLATED
  createDefaultCareLocationForTenant(tenantId: string): Promise<CareLocation>;
  createCareLocation(location: InsertCareLocation, tenantId: string, userId: string): Promise<CareLocation>;
  getCareLocation(id: string, tenantId: string): Promise<CareLocation | undefined>;
  getCareLocations(
    tenantId: string,
    options?: { includeInactive?: boolean; status?: string; locationKind?: "fixed_site" | "ambulance" }
  ): Promise<CareLocation[]>;
  getPrimaryCareLocation(tenantId: string): Promise<CareLocation | undefined>;
  updateCareLocation(id: string, location: Partial<InsertCareLocation>, tenantId: string, userId: string): Promise<CareLocation>;
  deleteCareLocation(id: string, tenantId: string, userId: string): Promise<void>;
  unsetPrimaryCareLocation(tenantId: string): Promise<void>;
  /** Sum of current_stock across all inventory rows at this care location (for ambulance decommission checks). */
  getTotalStockUnitsAtCareLocation(tenantId: string, locationId: string): Promise<number>;
  createAmbulanceCareLocation(
    tenantId: string,
    userId: string,
    data: CreateAmbulanceInput
  ): Promise<CareLocation>;
  updateAmbulanceCareLocation(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateAmbulanceInput
  ): Promise<CareLocation>;
  listAmbulancesForTenant(
    tenantId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Array<CareLocation & { stationedAtLocationName: string | null }>>;

  listAmbulancePrestartChecks(
    tenantId: string,
    filters?: { ambulanceLocationId?: string; fromShiftDate?: string; toShiftDate?: string }
  ): Promise<
    Array<
      AmbulancePrestartCheck & {
        ambulanceName: string;
        completedByFirstName: string | null;
        completedByLastName: string | null;
      }
    >
  >;
  getAmbulancePrestartCheck(id: string, tenantId: string): Promise<AmbulancePrestartCheck | undefined>;
  getAmbulancePrestartCheckEnriched(
    id: string,
    tenantId: string
  ): Promise<
    | (AmbulancePrestartCheck & {
        ambulanceName: string;
        completedByFirstName: string | null;
        completedByLastName: string | null;
      })
    | undefined
  >;
  createAmbulancePrestartCheck(
    tenantId: string,
    userId: string,
    data: CreateAmbulancePrestartInput
  ): Promise<AmbulancePrestartCheck>;
  updateAmbulancePrestartCheck(
    id: string,
    tenantId: string,
    actorUserId: string,
    actorRole: string,
    data: UpdateAmbulancePrestartInput
  ): Promise<AmbulancePrestartCheck>;
  setSessionLocation(sessionToken: string, locationId: string, locationName: string): Promise<void>;

  // Referral facilities (transfer hospitals) - TENANT ISOLATED
  getReferralFacilities(tenantId: string, options?: { includeInactive?: boolean; status?: string }): Promise<ReferralFacility[]>;
  getReferralFacility(id: string, tenantId: string): Promise<ReferralFacility | undefined>;
  createReferralFacility(data: InsertReferralFacility, tenantId: string): Promise<ReferralFacility>;
  updateReferralFacility(id: string, data: Partial<InsertReferralFacility>, tenantId: string): Promise<ReferralFacility>;
  deleteReferralFacility(id: string, tenantId: string): Promise<void>;

  // Shift reports / ShiftOver - TENANT ISOLATED
  createShiftReport(tenantId: string, data: Omit<InsertShiftReport, "tenantId">): Promise<ShiftReport>;
  getShiftReports(
    tenantId: string,
    filters?: {
      locationId?: string;
      fromDate?: string;
      toDate?: string;
      shift?: string;
      limit?: number;
      offset?: number;
      unacknowledgedByUserId?: string;
    }
  ): Promise<ShiftReport[]>;
  getShiftReportById(id: string, tenantId: string): Promise<ShiftReport | undefined>;
  updateShiftReport(
    id: string,
    tenantId: string,
    data: Partial<Omit<InsertShiftReport, "tenantId" | "reportedById">>,
    editorUserId?: string
  ): Promise<ShiftReport>;
  deleteShiftReport(id: string, tenantId: string): Promise<void>;
  getShiftReportAckStats(
    tenantId: string,
    reportIds: string[],
    currentUserId: string
  ): Promise<Map<string, { ackCount: number; acknowledgedByMe: boolean }>>;
  createShiftReportAcknowledgment(
    tenantId: string,
    shiftReportId: string,
    userId: string,
    note?: string | null
  ): Promise<ShiftReportAcknowledgment>;
  listShiftReportAcknowledgments(
    shiftReportId: string,
    tenantId: string
  ): Promise<Array<ShiftReportAcknowledgment & { userName?: string }>>;
  createShiftReportLink(
    tenantId: string,
    shiftReportId: string,
    createdByUserId: string,
    linkedType: "ticket" | "incident" | "duty",
    linkedId: string,
    note?: string | null
  ): Promise<ShiftReportLink>;
  deleteShiftReportLink(linkId: string, tenantId: string): Promise<void>;
  getShiftReportLinkById(linkId: string, tenantId: string): Promise<ShiftReportLink | undefined>;
  listShiftReportLinks(shiftReportId: string, tenantId: string): Promise<ShiftReportLink[]>;
  createShiftReportAttachment(
    tenantId: string,
    shiftReportId: string,
    uploadedByUserId: string,
    data: { fileUrl: string; originalName: string; mimeType?: string | null; sizeBytes?: number | null }
  ): Promise<ShiftReportAttachment>;
  listShiftReportAttachments(shiftReportId: string, tenantId: string): Promise<ShiftReportAttachment[]>;
  getShiftReportAttachmentById(attachmentId: string, tenantId: string): Promise<ShiftReportAttachment | undefined>;
  deleteShiftReportAttachment(attachmentId: string, tenantId: string): Promise<void>;
  listShiftReportRevisionHistory(
    shiftReportId: string,
    tenantId: string,
    limit?: number
  ): Promise<ShiftReportRevisionHistory[]>;
  getShiftoverSummary(
    tenantId: string,
    userId: string,
    options?: { locationId?: string; pendingAckDays?: number }
  ): Promise<{
    lastShiftReport: (ShiftReport & { locationName?: string }) | null;
    pendingAcknowledgmentsCount: number;
    openLinkedItemsCount: number;
  }>;
  listShiftoverOpenItems(
    tenantId: string,
    options?: { locationId?: string; sinceDays?: number }
  ): Promise<
    Array<{
      link: ShiftReportLink;
      shiftReportId: string;
      reportDate: string;
      shift: string;
      locationId: string;
      locationName?: string;
      entityLabel: string;
      entityStatus: string;
 }>
  >;

  // Staff e-ticketing — TENANT ISOLATED
  ensureDefaultTicketCategories(tenantId: string): Promise<void>;
  listTicketCategories(tenantId: string, options?: { includeInactive?: boolean }): Promise<TicketCategory[]>;
  getTicketCategoryById(id: string, tenantId: string): Promise<TicketCategory | undefined>;
  createTicketCategory(
    tenantId: string,
    data: { name: string; slug: string; sortOrder?: number }
  ): Promise<TicketCategory>;
  updateTicketCategory(
    id: string,
    tenantId: string,
    data: Partial<{ name: string; slug: string; sortOrder: number; isActive: boolean }>
  ): Promise<TicketCategory | undefined>;
  deleteTicketCategory(
    id: string,
    tenantId: string
  ): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" }>;

  // Inventory categories — TENANT ISOLATED
  ensureDefaultInventoryCategories(tenantId: string): Promise<void>;
  listInventoryCategories(tenantId: string, options?: { includeInactive?: boolean }): Promise<InventoryCategory[]>;
  getInventoryCategoryById(id: string, tenantId: string): Promise<InventoryCategory | undefined>;
  getInventoryCategoryBySlug(slug: string, tenantId: string): Promise<InventoryCategory | undefined>;
  createInventoryCategory(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      itemCodePrefix: string;
      fieldTemplate: string;
      sortOrder?: number;
    }
  ): Promise<InventoryCategory>;
  updateInventoryCategory(
    id: string,
    tenantId: string,
    data: Partial<{
      name: string;
      slug: string;
      itemCodePrefix: string;
      fieldTemplate: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ): Promise<InventoryCategory | undefined>;
  deleteInventoryCategory(
    id: string,
    tenantId: string
  ): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" | "system" }>;

  createTicket(
    tenantId: string,
    actorUserId: string,
    data: {
      categoryId: string;
      title: string;
      descriptionHtml: string;
      priority?: "low" | "normal" | "high" | "urgent";
      locationId?: string | null;
      relatedIncidentId?: string | null;
      assetTag?: string | null;
    }
  ): Promise<Ticket>;
  getTicketById(id: string, tenantId: string): Promise<Ticket | undefined>;
  listTickets(
    tenantId: string,
    filters: {
      viewerUserId: string;
      scope: "mine" | "requested" | "assigned" | "all";
      status?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Ticket & { categoryName: string }>>;
  patchTicket(
    tenantId: string,
    ticketId: string,
    actorUserId: string,
    patch: Partial<{
      title: string;
      descriptionHtml: string;
      categoryId: string;
      priority: "low" | "normal" | "high" | "urgent";
      status: "open" | "triaged" | "in_progress" | "resolved" | "closed" | "cancelled";
      assigneeUserId: string | null;
      locationId: string | null;
      relatedIncidentId: string | null;
      assetTag: string | null;
    }>
  ): Promise<Ticket | undefined>;

  listTicketComments(ticketId: string, tenantId: string): Promise<TicketComment[]>;
  addTicketComment(
    ticketId: string,
    tenantId: string,
    authorUserId: string,
    data: { bodyHtml: string; isInternal: boolean }
  ): Promise<TicketComment>;

  listTicketAttachments(ticketId: string, tenantId: string): Promise<TicketAttachment[]>;
  addTicketAttachment(
    ticketId: string,
    tenantId: string,
    uploadedByUserId: string,
    data: {
      fileUrl: string;
      originalName: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
    }
  ): Promise<TicketAttachment>;

  listTicketActivity(ticketId: string, tenantId: string): Promise<TicketActivity[]>;
  /** Hard-delete ticket and dependent rows (FK cascade). Returns true if a row was removed. */
  deleteTicket(id: string, tenantId: string): Promise<boolean>;

  // Employee operations - TENANT ISOLATED
  createEmployee(employee: InsertEmployee, tenantId: string): Promise<Employee>;
  getEmployee(id: string, tenantId: string): Promise<Employee | undefined>;
  getEmployeeByNumber(employeeNumber: string, tenantId: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string, tenantId: string): Promise<Employee | undefined>;
  getEmployees(tenantId: string, companyId?: string): Promise<Employee[]>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>, tenantId: string): Promise<Employee>;
  deleteEmployee(id: string, tenantId: string): Promise<void>;
  searchEmployees(query: string, tenantId: string): Promise<Employee[]>;
  searchPatientsEmployees(query: string, tenantId: string): Promise<any[]>;
  
  // Patient operations - TENANT ISOLATED  
  createPatient(patient: InsertPatient, tenantId: string): Promise<Patient>;
  /** Joined row: `{ patient, employee, company }` (not a bare `Patient`). */
  getPatient(id: string, tenantId: string): Promise<any>;
  getPatientByEmployeeId(employeeId: string, tenantId: string): Promise<Patient | undefined>;
  getPatients(tenantId: string, limit?: number): Promise<Array<{ patient: Patient; employee: Employee | null; company: Company | null }>>;
  updatePatient(id: string, patient: Partial<InsertPatient>, tenantId: string): Promise<Patient>;
  searchPatients(query: string, tenantId: string): Promise<Array<{ patient: Patient; employee: Employee | null; company: Company | null }>>;
  
  // Appointment operations - TENANT ISOLATED
  createAppointment(appointment: InsertAppointment, tenantId: string, userId?: string): Promise<Appointment>;
  getAppointment(id: string, tenantId: string): Promise<Appointment | undefined>;
  getAppointments(tenantId: string, employeeId?: string): Promise<Appointment[]>;
  listAppointmentsPaginated(
    tenantId: string,
    filters?: {
      employeeId?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      appointmentType?: string;
    },
  ): Promise<{ rows: any[]; totalCount: number }>;
  getAppointmentsInRange(tenantId: string, start: Date, end: Date, employeeId?: string): Promise<Appointment[]>;
  getTodayAppointments(tenantId: string): Promise<Appointment[]>;
  updateAppointment(id: string, appointment: UpdateAppointment, tenantId: string, userId?: string): Promise<Appointment>;
  deleteAppointment(id: string, tenantId: string, userId?: string): Promise<void>;
  
  // Incident reports operations - TENANT ISOLATED
  createIncidentReport(report: InsertIncidentReport, tenantId: string, userId?: string): Promise<IncidentReport>;
  getIncidentReport(id: string, tenantId: string): Promise<IncidentReport | undefined>;
  getIncidentReports(tenantId: string): Promise<IncidentReport[]>;
  updateIncidentReport(id: string, incident: Partial<InsertIncidentReport>, tenantId: string, userId?: string): Promise<IncidentReport>;
  deleteIncidentReport(id: string, tenantId: string, userId?: string): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, tenantId?: string): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(
    userId: string,
    tenantId: string | undefined,
    filters?: { channel?: string }
  ): Promise<void>;
  markNotificationSent(id: string): Promise<void>;
  
  // Notification types
  getNotificationTypes(category?: string): Promise<NotificationType[]>;
  
  // User notification preferences
  getNotificationPreferences(userId: string, tenantId: string): Promise<UserNotificationPreference[]>;
  updateNotificationPreferences(userId: string, tenantId: string, preferences: Array<{ notificationTypeId: string; channel: string; enabled: boolean; minSeverity?: string | null }>): Promise<void>;
  getUsersForNotificationType(tenantId: string, notificationTypeKey: string, severity?: string): Promise<User[]>;
  bulkUpdateNotificationPreferences(tenantId: string, userIds: string[], notificationTypeId: string, channel: string, enabled: boolean, minSeverity?: string | null, adminManaged?: boolean): Promise<void>;
  getDefaultPreferencesForRole(tenantId: string, role: string): Promise<Partial<UserNotificationPreference>[]>;
  
  // Notification delivery logs
  createNotificationDeliveryLog(log: InsertNotificationDeliveryLog): Promise<NotificationDeliveryLog>;

  // Our People - patient follow-ups (TENANT ISOLATED)
  createPatientFollowUp(
    tenantId: string,
    userId: string,
    data: Omit<InsertPatientFollowUp, "tenantId">
  ): Promise<PatientFollowUp>;
  getPatientFollowUp(id: string, tenantId: string): Promise<PatientFollowUp | undefined>;
  listPatientFollowUps(
    tenantId: string,
    filters?: {
      patientId?: string;
      status?: string;
      careContext?: string;
      fromDate?: string;
      toDate?: string;
      locationId?: string;
      dueOnly?: boolean;
    }
  ): Promise<Array<{ followUp: PatientFollowUp; patient?: Patient | null; employee?: Employee | null; company?: Company | null; referralFacility?: ReferralFacility | null }>>;
  updatePatientFollowUp(
    id: string,
    tenantId: string,
    data: Partial<InsertPatientFollowUp>
  ): Promise<PatientFollowUp>;
  deletePatientFollowUp(id: string, tenantId: string): Promise<void>;

  // Our People - employee feedback (public submit + staff list/review)
  listCareLocationsForPublicFeedback(): Promise<Array<{ id: string; locationName: string; tenantId: string }>>;
  getCareLocationByIdForPublic(id: string): Promise<{ id: string; tenantId: string; locationName: string } | undefined>;
  /** Public feedback form context (no auth): tenant branding + care locations. If no tenantId, uses first tenant. */
  getPublicFeedbackContext(tenantId?: string): Promise<{
    tenantId: string;
    tenantName: string;
    logoUrl: string | null;
    appName: string | null;
    locations: Array<{ id: string; name: string }>;
  } | null>;
  /** First active care location for fallback when location name does not match (avoid losing feedback). */
  getFirstActiveCareLocationForPublic(): Promise<{ id: string; tenantId: string; locationName: string } | undefined>;
  /** Get location by id scoped to tenant (for public form submit validation). */
  getCareLocationByIdAndTenant(id: string, tenantId: string): Promise<{ id: string; tenantId: string; locationName: string } | undefined>;
  /** Resolve location by name within a tenant. */
  getCareLocationByNameForTenant(name: string, tenantId: string): Promise<{ id: string; tenantId: string; locationName: string } | undefined>;
  /** First active care location for a given tenant (fallback for submit). */
  getFirstActiveCareLocationForTenant(tenantId: string): Promise<{ id: string; tenantId: string; locationName: string } | undefined>;
  createEmployeeFeedback(
    tenantId: string,
    data: {
      locationId: string;
      anonymous: boolean;
      overallExperienceRating?: number | null;
      staffCourtesyRating?: number | null;
      waitTimeRating?: number | null;
      environmentCleanlinessRating?: number | null;
      explanationClarityRating?: number | null;
      perceivedSafetyRating?: number | null;
      wouldRecommend?: boolean | null;
      wouldReturn?: boolean | null;
      freeTextFeedback?: string | null;
    }
  ): Promise<EmployeeFeedback>;
  listEmployeeFeedback(
    tenantId: string,
    filters?: { locationId?: string; status?: string; fromDate?: string; toDate?: string }
  ): Promise<Array<EmployeeFeedback & { location?: CareLocation | null }>>;
  getEmployeeFeedback(id: string, tenantId: string): Promise<(EmployeeFeedback & { location?: CareLocation | null }) | undefined>;
  updateEmployeeFeedback(
    id: string,
    tenantId: string,
    data: { status?: string; responseToFeedback?: string; reviewedBy?: string }
  ): Promise<EmployeeFeedback>;

  // Our People - employee work fitness cases (TENANT ISOLATED)
  createWorkFitnessCase(
    tenantId: string,
    userId: string | null,
    data: Omit<InsertEmployeeWorkFitnessCase, "tenantId" | "createdByUserId">
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }>;
  listWorkFitnessCases(
    tenantId: string,
    filters?: {
      employeeId?: string;
      locationId?: string;
      portalOnly?: boolean;
      status?: string;
      hasWorkImpact?: boolean;
    }
  ): Promise<Array<EmployeeWorkFitnessCase & { employee?: Employee | null; company?: Company | null; medications: EmployeeWorkFitnessMedication[]; reviewedByUser?: { id: string; firstName: string | null; lastName: string | null } | null }>>;
  getWorkFitnessCase(
    id: string,
    tenantId: string
  ): Promise<(EmployeeWorkFitnessCase & { employee?: Employee | null; company?: Company | null; medications: EmployeeWorkFitnessMedication[]; reviewedByUser?: { id: string; firstName: string | null; lastName: string | null } | null }) | undefined>;
  updateWorkFitnessCase(
    id: string,
    tenantId: string,
    data: Partial<Omit<InsertEmployeeWorkFitnessCase, "medications">> & {
      medications?: Array<Partial<InsertEmployeeWorkFitnessMedication> & { id?: string; medicationName?: string }>;
    }
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }>;
  assessWorkFitnessCase(
    id: string,
    tenantId: string,
    userId: string,
    data: {
      fitnessOutcome?: string;
      fitnessImpact?: string;
      workRestrictions?: string;
      restrictionStartDate?: string | Date | null;
      restrictionEndDate?: string | Date | null;
      clearedUnderground?: boolean;
      clearedHeavyMachinery?: boolean;
      mayAffectDrugTest?: boolean;
      drugTestDisclosureNotes?: string;
      assessmentNotes?: string;
      actionTaken?: string;
      actionNotes?: string;
      medicationNotes?: Array<{ id: string; clinicianMedicationNotes?: string | null }>;
    }
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }>;
  deleteWorkFitnessCase(id: string, tenantId: string): Promise<void>;

  // Operational duties operations - TENANT ISOLATED
  createOperationalDuty(duty: InsertOperationalDuty, tenantId: string, userId?: string): Promise<OperationalDuty>;
  getOperationalDuties(tenantId: string): Promise<OperationalDuty[]>;
  updateOperationalDuty(id: string, duty: Partial<InsertOperationalDuty>, tenantId: string, userId?: string): Promise<OperationalDuty>;
  deleteOperationalDuty(id: string, tenantId: string, userId?: string): Promise<void>;

  // Duty assignments operations - TENANT ISOLATED
  createDutyAssignment(assignment: InsertDutyAssignment, tenantId: string, userId?: string): Promise<DutyAssignment>;
  getDutyAssignment(id: string, tenantId: string): Promise<DutyAssignment | undefined>;
  getDutyAssignments(tenantId: string, date?: Date, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]>;
  getDutyAssignmentsByDateRange(tenantId: string, fromDate: Date, toDate: Date, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]>;
  getTodayDutyAssignments(tenantId: string, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]>;
  getDutyAssignmentHistory(
    tenantId: string,
    filters?: {
      date?: string;
      status?: string;
      userId?: string;
      locationId?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    },
  ): Promise<{ rows: any[]; totalCount: number }>;
  getDutyAssignmentAnalytics(tenantId: string, filters?: { date?: string; locationId?: string }): Promise<Record<string, unknown>>;
  updateDutyAssignment(id: string, assignment: Partial<InsertDutyAssignment>, tenantId: string): Promise<DutyAssignment>;
  completeDutyAssignment(assignmentId: string, completedById: string, tenantId: string, notes?: string, startedAt?: Date | null, locationId?: string): Promise<DutyAssignment>;
  cancelDutyAssignment(assignmentId: string, cancelledById: string, tenantId: string, cancellationReason?: string): Promise<DutyAssignment>;
  deleteDutyAssignment(assignmentId: string, tenantId: string, userId?: string): Promise<void>;
  /** Spawn recurring duty assignments for a given date from active duties' schedules (Spawner pattern). Returns count created. */
  spawnDutyAssignmentsForDate(tenantId: string, date: Date): Promise<{ spawned: number }>;

  // Duty completions operations - TENANT ISOLATED
  createDutyCompletion(completion: InsertDutyCompletion, tenantId: string): Promise<DutyCompletion>;
  getDutyCompletions(tenantId: string, date?: Date): Promise<DutyCompletion[]>;
  getDutyCompletionsByAssignment(assignmentId: string, tenantId: string): Promise<DutyCompletion[]>;

  // Audit logging operations - TENANT ISOLATED
  createAuditLog(auditLog: InsertAuditLog, tenantId: string): Promise<AuditLog>;
  getAuditLogs(tenantId: string, filters?: { resourceType?: string; action?: string; userId?: string; limit?: number }): Promise<AuditLog[]>;

  // Admin operations
  getPendingUsers(tenantId?: string): Promise<User[]>;
  getAllUsers(tenantId: string): Promise<User[]>;
  /** Active users in tenant with any of the given roles (notifications / RBAC helpers). */
  getActiveTenantUsersByRoles(
    tenantId: string,
    roles: Array<"admin" | "staff" | "operations" | "fleet_operator" | "super_admin">
  ): Promise<User[]>;
  approveUser(userId: string, approvedBy: string): Promise<User>;
  updateUserStatus(userId: string, status: "pending" | "active" | "blocked" | "decommissioned", updatedBy: string): Promise<User>;
  auditAdminOperation(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    tenantId: string,
    originalData: unknown,
    newData: unknown,
    adminDetails?: Record<string, unknown>
  ): Promise<void>;

  // Dashboard metrics - TENANT ISOLATED
  getDashboardMetrics(tenantId: string): Promise<{
    activeCustomers: number;
    totalCustomers: number;
    todaySales: number;
    todayAppointments: number;
    pendingIncidents: number;
    completedAppointments: number;
    totalIncidents: number;
    openIncidents: number;
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    totalEmployees: number;
    activeEmployees: number;
    totalCompanies: number;
    activeCompanies: number;
  }>;

  // Super Admin operations
  getAllTenantsWithUserCounts(): Promise<Array<Tenant & { userCount: number }>>;
  getAllTenantAdmins(): Promise<Array<User & { tenantName: string }>>;
  getAllUsersGroupedByTenant(): Promise<Array<{ tenant: Tenant; users: User[] }>>;
  approveTenantAdmin(adminId: string, approvedBy: string): Promise<User>;
  getTenantAdmins(tenantId: string): Promise<User[]>;
  updateTenantStatus(tenantId: string, status: string): Promise<Tenant>;
  createDummyEmployeesForExistingUsers(): Promise<Employee[]>;

  // System feedback operations (global, not tenant-scoped)
  createFeedback(input: Omit<InsertFeedback, "id" | "createdAt" | "updatedAt" | "status">): Promise<Feedback>;
  getAllFeedbackForAdmin(): Promise<Array<Feedback & { userEmail?: string | null; tenantName?: string | null }>>;
  updateFeedbackStatusAndNote(id: string, data: { status?: string; adminNote?: string }): Promise<Feedback | undefined>;

  // Medical Inventory & Equipment Tracking operations - TENANT ISOLATED
  // Inventory operations
  createMedicalInventory(inventory: InsertMedicalInventory, tenantId: string): Promise<MedicalInventory>;
  getMedicalInventory(id: string, tenantId: string): Promise<MedicalInventory | undefined>;
  getMedicalInventoryList(
    tenantId: string,
    filters?: {
      category?: string;
      status?: string;
      lowStock?: boolean;
      locationId?: string;
      /** Restrict to stock rows at care locations of this kind (e.g. ambulances). */
      locationKind?: "fixed_site" | "ambulance";
    }
  ): Promise<MedicalInventory[]>;
  updateMedicalInventory(id: string, inventory: Partial<InsertMedicalInventory>, tenantId: string): Promise<MedicalInventory>;
  deleteMedicalInventory(id: string, tenantId: string): Promise<void>;
  getMedicalInventoryByCode(itemCode: string, tenantId: string): Promise<MedicalInventory | undefined>;
  
  // Inventory transaction operations
  createInventoryTransaction(transaction: InsertInventoryTransaction, tenantId: string): Promise<InventoryTransaction>;
  getInventoryTransactions(tenantId: string, itemId?: string, documentType?: string, documentId?: string): Promise<InventoryTransaction[]>;
  /** Inventory transactions where this care location is source or counterparty (e.g. ambulance stock movements). */
  listInventoryTransactionsInvolvingLocation(
    tenantId: string,
    locationId: string,
    options?: { limit?: number }
  ): Promise<
    Array<
      InventoryTransaction & {
        itemName?: string | null;
        itemCode?: string | null;
        createdByName?: string | null;
        locationName?: string | null;
        counterpartyLocationName?: string | null;
      }
    >
  >;
  getInventoryTransactionsByType(tenantId: string, transactionType: string): Promise<InventoryTransaction[]>;
  updateInventoryTransaction(id: string, transaction: Partial<InsertInventoryTransaction>, tenantId: string): Promise<InventoryTransaction>;
  deleteInventoryTransaction(id: string, tenantId: string): Promise<void>;

  // Stock requisitions
  createStockRequisition(
    requisition: Omit<InsertStockRequisition, "id" | "tenantId" | "requestedAt" | "createdAt" | "updatedAt" | "status">,
    items: Omit<InsertStockRequisitionItem, "id" | "tenantId" | "requisitionId" | "createdAt">[],
    tenantId: string
  ): Promise<StockRequisition & { items: StockRequisitionItem[] }>;
  getStockRequisitions(
    tenantId: string,
    filters?: { status?: string; requestingLocationId?: string; fulfillingLocationId?: string }
  ): Promise<(StockRequisition & { items?: StockRequisitionItem[] })[]>;
  updateStockRequisition(
    id: string,
    data: Partial<InsertStockRequisition>,
    tenantId: string
  ): Promise<StockRequisition | undefined>;
  getStockRequisitionById(id: string, tenantId: string): Promise<(StockRequisition & { items: StockRequisitionItem[] }) | undefined>;
  updateStockRequisitionItems(
    requisitionId: string,
    tenantId: string,
    items: { itemId: string; requestedQuantity: number }[],
  ): Promise<void>;

  // Stock transfers
  createStockTransfer(
    transfer: Omit<InsertStockTransfer, "id" | "tenantId" | "createdAt" | "updatedAt" | "dispatchedAt" | "receivedAt" | "status">,
    items: Omit<InsertStockTransferItem, "id" | "tenantId" | "transferId" | "createdAt">[],
    tenantId: string
  ): Promise<StockTransfer & { items: StockTransferItem[] }>;
  getStockTransfers(
    tenantId: string,
    filters?: { status?: string; fromLocationId?: string; toLocationId?: string; requisitionId?: string }
  ): Promise<(StockTransfer & { items?: StockTransferItem[] })[]>;
  createStockTransferFromRequisition(
    requisitionId: string,
    approvedById: string,
    tenantId: string,
    overrides?: { itemId: string; approvedQuantity: number }[]
  ): Promise<StockTransfer & { items: StockTransferItem[] }>;
  updateStockTransfer(
    id: string,
    data: Partial<InsertStockTransfer>,
    tenantId: string
  ): Promise<StockTransfer | undefined>;
  
  // Equipment maintenance operations
  createEquipmentMaintenance(maintenance: InsertEquipmentMaintenance, tenantId: string): Promise<EquipmentMaintenance>;
  getEquipmentMaintenance(id: string, tenantId: string): Promise<EquipmentMaintenance | undefined>;
  getEquipmentMaintenanceList(tenantId: string, filters?: { status?: string; equipmentId?: string; overdue?: boolean }): Promise<EquipmentMaintenance[]>;
  updateEquipmentMaintenance(id: string, maintenance: Partial<InsertEquipmentMaintenance>, tenantId: string): Promise<EquipmentMaintenance>;
  deleteEquipmentMaintenance(id: string, tenantId: string): Promise<void>;
  
  // Customer operations
  createCustomer(customer: InsertCustomer, tenantId: string): Promise<Customer>;
  getCustomer(id: string, tenantId: string): Promise<Customer | undefined>;
  getCustomers(tenantId: string, search?: string): Promise<Customer[]>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, tenantId: string): Promise<Customer>;
  deleteCustomer(id: string, tenantId: string): Promise<void>;

  // Supplier operations
  createSupplier(supplier: InsertSupplier, tenantId: string): Promise<Supplier>;
  getSupplier(id: string, tenantId: string): Promise<Supplier | undefined>;
  getSuppliers(tenantId: string): Promise<Supplier[]>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>, tenantId: string): Promise<Supplier>;
  deleteSupplier(id: string, tenantId: string): Promise<void>;

  // Purchase order operations
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder, tenantId: string): Promise<PurchaseOrder>;
  getPurchaseOrder(id: string, tenantId: string): Promise<(PurchaseOrder & { supplierName?: string }) | undefined>;
  getPurchaseOrders(tenantId: string, filters?: { status?: string; supplierId?: string }): Promise<(PurchaseOrder & { supplierName?: string })[]>;
  updatePurchaseOrder(id: string, purchaseOrder: Partial<InsertPurchaseOrder>, tenantId: string): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string, tenantId: string): Promise<void>;
  receivePurchaseOrder(
    poId: string,
    receivedById: string,
    tenantId: string,
    options: { locationId?: string; items: Array<{ itemId: string; quantityReceived: number }> }
  ): Promise<PurchaseOrder | undefined>;
  
  // Purchase order item operations
  createPurchaseOrderItem(item: InsertPurchaseOrderItem, tenantId: string): Promise<PurchaseOrderItem>;
  getPurchaseOrderItems(poId: string, tenantId: string): Promise<PurchaseOrderItem[]>;
  updatePurchaseOrderItem(id: string, item: Partial<InsertPurchaseOrderItem>, tenantId: string): Promise<PurchaseOrderItem>;
  deletePurchaseOrderItem(id: string, tenantId: string): Promise<void>;
  
  // Inventory alert operations
  createInventoryAlert(alert: InsertInventoryAlert, tenantId: string): Promise<InventoryAlert>;
  getInventoryAlerts(tenantId: string, filters?: { isActive?: boolean; alertType?: string; severity?: string }): Promise<InventoryAlert[]>;
  updateInventoryAlert(id: string, alert: Partial<InsertInventoryAlert>, tenantId: string): Promise<InventoryAlert>;
  acknowledgeInventoryAlert(id: string, acknowledgedBy: string, tenantId: string): Promise<InventoryAlert>;
  resolveInventoryAlert(id: string, resolvedBy: string, tenantId: string): Promise<InventoryAlert>;
  processPendingInventoryAlerts(tenantId: string): Promise<{ processed: number; errors: number }>;
  
  // Inventory analytics and reports
  getInventoryAnalytics(tenantId: string): Promise<{
    totalItems: number;
    lowStockItems: number;
    expiringItems: number;
    totalValue: string;
    itemsByCategory: Array<{ category: string; count: number; value: string }>;
    recentTransactions: number;
    pendingMaintenances: number;
  }>;
  getLowStockItems(tenantId: string): Promise<MedicalInventory[]>;
  getExpiringItems(tenantId: string, daysAhead?: number): Promise<MedicalInventory[]>;

  // Stock transfer helper flows
  dispatchStockTransfer(
    id: string,
    dispatchedById: string,
    tenantId: string
  ): Promise<StockTransfer | undefined>;
  receiveStockTransfer(
    id: string,
    receivedById: string,
    tenantId: string
  ): Promise<StockTransfer | undefined>;
  getEquipmentDueForMaintenance(tenantId: string): Promise<EquipmentMaintenance[]>;

  // Drug & Alcohol Testing Module operations - TENANT ISOLATED
  // Testing program operations
  createTestingProgram(program: InsertTestingProgram, tenantId: string): Promise<TestingProgram>;
  getTestingProgram(id: string, tenantId: string): Promise<TestingProgram | undefined>;
  getTestingPrograms(tenantId: string, filters?: { programType?: string; status?: string }): Promise<TestingProgram[]>;
  updateTestingProgram(id: string, program: Partial<InsertTestingProgram>, tenantId: string): Promise<TestingProgram>;
  deleteTestingProgram(id: string, tenantId: string): Promise<void>;

  // Drug test operations
  createDrugTest(test: InsertDrugTest, tenantId: string): Promise<DrugTest>;
  getDrugTest(id: string, tenantId: string): Promise<DrugTest | undefined>;
  getDrugTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<DrugTest[]>;
  updateDrugTest(id: string, test: Partial<InsertDrugTest>, tenantId: string, userId?: string): Promise<DrugTest>;
  deleteDrugTest(id: string, tenantId: string): Promise<void>;

  // Alcohol test operations
  createAlcoholTest(test: InsertAlcoholTest, tenantId: string): Promise<AlcoholTest>;
  getAlcoholTest(id: string, tenantId: string): Promise<AlcoholTest | undefined>;
  getAlcoholTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<AlcoholTest[]>;
  updateAlcoholTest(id: string, test: Partial<InsertAlcoholTest>, tenantId: string, userId?: string): Promise<AlcoholTest>;
  deleteAlcoholTest(id: string, tenantId: string): Promise<void>;

  // Hydration test operations
  createHydrationTest(test: InsertHydrationTest, tenantId: string): Promise<HydrationTest>;
  getHydrationTest(id: string, tenantId: string): Promise<HydrationTest | undefined>;
  getHydrationTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<HydrationTest[]>;
  updateHydrationTest(id: string, test: Partial<InsertHydrationTest>, tenantId: string, userId?: string): Promise<HydrationTest>;
  deleteHydrationTest(id: string, tenantId: string): Promise<void>;
  
  // Instant test operations
  createInstantTest(testData: InsertInstantTest, tenantId: string): Promise<InstantTest>;
  getInstantTest(id: string, tenantId: string): Promise<InstantTest | undefined>;
  getInstantTests(tenantId: string, filters?: { employeeId?: string; customerId?: string; testType?: string; dateFrom?: Date; dateTo?: Date }): Promise<InstantTest[]>;
  updateInstantTest(id: string, test: Partial<InsertInstantTest>, tenantId: string, userId?: string): Promise<InstantTest>;
  deleteInstantTest(id: string, tenantId: string): Promise<void>;

  // Combined test history for employees
  getEmployeeTestHistory(employeeId: string, tenantId: string): Promise<{ 
    drugTests: DrugTest[]; 
    alcoholTests: AlcoholTest[]; 
    hydrationTests: HydrationTest[]; 
  }>;

  // Random testing pool operations
  createRandomTestingPool(pool: InsertRandomTestingPool, tenantId: string): Promise<RandomTestingPool>;
  getRandomTestingPool(id: string, tenantId: string): Promise<RandomTestingPool | undefined>;
  getRandomTestingPools(tenantId: string, filters?: { department?: string; active?: boolean }): Promise<RandomTestingPool[]>;
  updateRandomTestingPool(id: string, pool: Partial<InsertRandomTestingPool>, tenantId: string): Promise<RandomTestingPool>;
  deleteRandomTestingPool(id: string, tenantId: string): Promise<void>;

  // Random selection operations
  createRandomSelection(selection: InsertRandomSelection, tenantId: string): Promise<RandomSelection>;
  getRandomSelection(id: string, tenantId: string): Promise<RandomSelection | undefined>;
  getRandomSelections(tenantId: string, filters?: { 
    poolId?: string; 
    employeeId?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    testCompleted?: boolean;
  }): Promise<RandomSelection[]>;
  updateRandomSelection(id: string, selection: Partial<InsertRandomSelection>, tenantId: string): Promise<RandomSelection>;
  deleteRandomSelection(id: string, tenantId: string): Promise<void>;
  generateRandomSelections(poolId: string, selectionCount: number, tenantId: string): Promise<RandomSelection[]>;

  // Testing equipment operations
  createTestingEquipment(equipment: InsertTestingEquipment, tenantId: string): Promise<TestingEquipment>;
  getTestingEquipment(id: string, tenantId: string): Promise<TestingEquipment | undefined>;
  getTestingEquipmentList(tenantId: string, filters?: { 
    deviceType?: string; 
    status?: string; 
    location?: string;
    calibrationDue?: boolean;
  }): Promise<TestingEquipment[]>;
  updateTestingEquipment(id: string, equipment: Partial<InsertTestingEquipment>, tenantId: string): Promise<TestingEquipment>;
  deleteTestingEquipment(id: string, tenantId: string): Promise<void>;
  getEquipmentDueForCalibration(tenantId: string): Promise<TestingEquipment[]>;

  // Drugs, Alcohol & Hydration Testing analytics and reports
  getTestingAnalytics(tenantId: string): Promise<{
    drugTests: { total: number; positive: number; negative: number; pending: number };
    alcoholTests: { total: number; positive: number; negative: number; pending: number };
    hydrationTests: { total: number; dehydrated: number; hydrated: number; pending: number };
    equipmentCalibrationStatus: Array<{ status: string; count: number }>;
    monthlyTestTrends: Array<{ month: string; drugTests: number; alcoholTests: number; hydrationTests: number }>;
  }>;

  // Tenant SOPs (standard operating procedures)
  listTenantSopPublishedLibrary(tenantId: string): Promise<
    Array<{ document: TenantSopDocument; version: TenantSopVersion }>
  >;
  getTenantSopPublishedForReader(
    tenantId: string,
    documentId: string
  ): Promise<{ document: TenantSopDocument; version: TenantSopVersion } | null>;
  listTenantSopDocumentsAdmin(tenantId: string): Promise<
    Array<
      TenantSopDocument & {
        latestVersionNumber: number | null;
        latestStatus: TenantSopVersion["status"] | null;
      }
    >
  >;
  getTenantSopDocumentWithVersions(
    tenantId: string,
    documentId: string
  ): Promise<{ document: TenantSopDocument; versions: TenantSopVersion[] } | null>;
  createTenantSopDocument(
    tenantId: string,
    userId: string,
    data: { title: string; code?: string | null; department?: string | null }
  ): Promise<{ document: TenantSopDocument; version: TenantSopVersion }>;
  createTenantSopDraftVersion(
    tenantId: string,
    documentId: string,
    userId: string,
    data: { contentHtml?: string; changeNotes?: string | null }
  ): Promise<TenantSopVersion | null>;
  updateTenantSopDraftVersion(
    tenantId: string,
    versionId: string,
    data: { contentHtml?: string; changeNotes?: string | null }
  ): Promise<TenantSopVersion | null>;
  setTenantSopVersionAttachment(
    tenantId: string,
    versionId: string,
    file: { url: string; filename: string; mime: string | null }
  ): Promise<TenantSopVersion | null>;
  clearTenantSopVersionAttachment(tenantId: string, versionId: string): Promise<TenantSopVersion | null>;
  submitTenantSopVersionForApproval(
    tenantId: string,
    versionId: string,
    userId: string
  ): Promise<TenantSopVersion | null>;
  withdrawTenantSopSubmission(
    tenantId: string,
    versionId: string
  ): Promise<TenantSopVersion | null>;
  approveTenantSopVersion(
    tenantId: string,
    versionId: string,
    adminUserId: string
  ): Promise<TenantSopVersion | null>;
  rejectTenantSopVersion(
    tenantId: string,
    versionId: string,
    adminUserId: string,
    reason: string
  ): Promise<TenantSopVersion | null>;
  deleteTenantSopDraftVersion(tenantId: string, versionId: string): Promise<boolean>;
  updateTenantSopDocument(
    tenantId: string,
    documentId: string,
    data: {
      title?: string;
      code?: string | null;
      department?: string | null;
      isArchived?: boolean;
    }
  ): Promise<TenantSopDocument | null>;

  // Signed legal documents (tenant uploads; super-admin visibility)
  listSignedLegalDocumentsForTenant(tenantId: string): Promise<SignedLegalDocumentTenantView[]>;
  listAllSignedLegalDocumentsForSuperAdmin(): Promise<SignedLegalDocumentSuperView[]>;
  createSignedLegalDocument(input: {
    tenantId: string;
    documentType: string;
    storageUrl: string;
    originalFilename: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    uploadedByUserId: string | null;
    notes: string | null;
  }): Promise<TenantSignedLegalDocument>;
  getSignedLegalDocumentById(id: string): Promise<TenantSignedLegalDocument | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Alias for getUser for consistency
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Ensure every user has a tenant association
    let finalUserData = { ...userData };
    
    if (!finalUserData.tenantId) {
      // Check if any tenants exist
      const existingTenants = await this.getTenants();
      
      if (existingTenants.length === 0) {
        // Create default tenant if none exist
        const tenant = await this.createTenant({
          name: "Default Business",
          organizationType: "business",
          contactEmail: userData.email || "admin@uventorybiz.com",
          contactPhone: "+233-800-000000",
          address: "Head Office",
          planType: "enterprise",
          status: "active",
          maxUsers: 1000,
          maxCompanies: 50,
        });
        finalUserData.tenantId = tenant.id;
      } else {
        // Use first existing tenant
        finalUserData.tenantId = existingTenants[0].id;
      }
    }

    // Set default status for Replit auth users
    if (!finalUserData.status && finalUserData.authProvider !== LEGACY_STAFF_AUTH_PROVIDER) {
      finalUserData.status = 'active';
    }

    // Generate employee ID if not provided
    if (!finalUserData.employeeId && finalUserData.tenantId) {
      const empCount = await db
        .select({ count: sql`count(*)` })
        .from(employees)
        .where(eq(employees.tenantId, finalUserData.tenantId));
      
      const nextNum = parseInt(empCount[0].count as string) + 1;
      finalUserData.employeeId = `EMP${nextNum.toString().padStart(4, '0')}`;
    }

    const [user] = await db
      .insert(users)
      .values(finalUserData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...finalUserData,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Auto-create employee record for new users
    if (user.firstName && user.lastName && user.tenantId && user.status === 'active') {
      try {
        await this.createEmployeeForUser(user);
      } catch (error) {
        console.log("Employee auto-creation skipped for upserted user:", error);
      }
    }

    return user;
  }

  // Staff auth methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailNormalized(email: string): Promise<User | undefined> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return undefined;
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`)
      .limit(1);
    return user;
  }

  async getUserByOidcSubject(oauthIssuer: string, oauthSub: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.oauthIssuer, oauthIssuer), eq(users.oauthSub, oauthSub)))
      .limit(1);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phone));
    return user;
  }

  async getUserByEmailOrPhone(email: string, phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.phoneNumber, phone))
    );
    return user;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createCustomUser(userData: Partial<UpsertUser> & { employeeNumber?: string }): Promise<User> {
    // users.employee_id is a FK to employees.id (UUID). For tenant-bound users we must
    // create an employee first, then set userData.employeeId = that employee's id.
    const tenantId = userData.tenantId ?? undefined;
    const hasValidEmployeeId = userData.employeeId && /^[0-9a-f-]{36}$/i.test(String(userData.employeeId));

    if (tenantId && userData.firstName && userData.lastName && !hasValidEmployeeId) {
      // Strip any client-supplied non-UUID so it never gets into users table
      delete userData.employeeId;

      const company = await this.getOrCreateDefaultCompany(tenantId);
      // Use form-provided employee number when present; otherwise generate one
      const requestedNumber = userData.employeeNumber?.trim();
      let employeeNumber: string;
      if (requestedNumber) {
        employeeNumber = requestedNumber;
      } else {
        const employeeCount = await db
          .select({ count: sql`count(*)` })
          .from(employees)
          .where(eq(employees.tenantId, tenantId));
        const nextNumber = parseInt(String(employeeCount[0]?.count ?? 0), 10) + 1;
        employeeNumber = `EMP${nextNumber.toString().padStart(4, '0')}`;
      }
      delete userData.employeeNumber; // Don't persist to users table
      const role = (userData.role as string) || "staff";
      const position =
        role === "admin"
          ? "Administrator"
          : role === "staff"
            ? "Staff"
            : role === "operations"
              ? "Operations"
              : role === "fleet_operator"
                ? "Fleet operator"
                : "Staff";

      let employee: Employee;
      try {
        employee = await this.createEmployee(
          {
            companyId: company.id,
            employeeNumber,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email ?? undefined,
            phoneNumber: userData.phoneNumber ?? undefined,
            dateOfBirth: new Date("1990-01-01"),
            department: "administration",
            position,
            jobTitle: position,
            hireDate: new Date(),
            emergencyContactName: "Emergency Contact",
            emergencyContactPhone: "000-000-0000",
            medicalClearance: role === "staff",
            status: "active",
          } as InsertEmployee,
          tenantId
        );
      } catch (err) {
        console.error("createCustomUser: employee creation failed", err);
        throw new Error(
          err instanceof Error ? err.message : "Failed to create employee record. Please try again."
        );
      }

      if (!employee?.id) {
        throw new Error("Failed to create employee record. Please try again.");
      }
      userData.employeeId = employee.id;
    }

    delete userData.employeeNumber; // Only used for employee creation; not a users column
    const [user] = await db.insert(users).values(userData as UpsertUser).returning();
    return user;
  }

  // Helper method to create employee record for a user
  async createEmployeeForUser(user: User): Promise<void> {
    try {
      // Get the first company for this tenant
      const companyList = await db
        .select()
        .from(companies)
        .where(eq(companies.tenantId, user.tenantId!))
        .limit(1);
      
      if (companyList.length > 0) {
        await db
          .insert(employees)
          .values({
            tenantId: user.tenantId!,
            companyId: companyList[0].id,
            employeeNumber: user.employeeId || `USR-${user.id.slice(-8)}`,
            firstName: user.firstName!,
            lastName: user.lastName!,
            email: user.email,
            phoneNumber: user.phoneNumber,
            dateOfBirth: new Date('1990-01-01').toISOString().split('T')[0] as any,
            department: "administration" as const,
            position: user.role === "admin" ? "Administrator" : 
                     user.role === "staff" ? "Staff" :
                     user.role === "operations" ? "Operations" :
                     user.role === "fleet_operator" ? "Fleet operator" : "Staff",
            jobTitle: user.role === "admin" ? "Administrator" : 
                     user.role === "staff" ? "Staff" :
                     user.role === "operations" ? "Operations" :
                     user.role === "fleet_operator" ? "Fleet operator" : "Staff",
            hireDate: new Date().toISOString().split('T')[0] as any,
            emergencyContactName: "Emergency Contact",
            emergencyContactPhone: "000-000-0000",
            medicalClearance: user.role === "staff" ? true : false,
            status: "active",
            // createdAt and updatedAt have defaults, so don't set them explicitly
          })
          .onConflictDoNothing(); // Skip if employee already exists
      }
    } catch (error) {
      console.log("Employee auto-creation skipped (may already exist):", error);
    }
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        role: role as any,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserProfile(id: string, profile: { firstName?: string; lastName?: string; email?: string; phone?: string; bio?: string; }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...profile, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserProfilePicture(id: string, profilePicture: string): Promise<User> {
    console.log('Updating user profile picture:', { id, profilePicture });
    const [user] = await db
      .update(users)
      .set({ 
        profileImageUrl: profilePicture, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    console.log('Profile picture updated with human-readable filename, result:', user);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Session operations
  async createUserSession(session: {
    userId: string;
    sessionToken: string;
    expires: Date;
    lastActivityAt?: Date;
  }): Promise<UserSession> {
    const now = session.lastActivityAt ?? new Date();
    const [newSession] = await db
      .insert(userSessions)
      .values({
        userId: session.userId,
        sessionToken: session.sessionToken,
        expires: session.expires,
        lastActivityAt: now,
      })
      .returning();
    return newSession;
  }

  async touchUserSession(sessionToken: string, patch: { lastActivityAt: Date; expires?: Date }): Promise<void> {
    await db
      .update(userSessions)
      .set({
        lastActivityAt: patch.lastActivityAt,
        ...(patch.expires ? { expires: patch.expires } : {}),
      })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
    return session;
  }

  async updateUserSessionImpersonation(
    sessionToken: string,
    data: { userId: string; impersonatorUserId: string | null; impersonationStartedAt: Date | null }
  ): Promise<void> {
    await db
      .update(userSessions)
      .set({
        userId: data.userId,
        impersonatorUserId: data.impersonatorUserId,
        impersonationStartedAt: data.impersonationStartedAt,
      })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async createImpersonationEvent(event: InsertImpersonationEvent): Promise<ImpersonationEvent> {
    const [row] = await db.insert(impersonationEvents).values(event).returning();
    return row;
  }

  async getImpersonationEvents(limit = 500): Promise<ImpersonationEvent[]> {
    return db
      .select()
      .from(impersonationEvents)
      .orderBy(desc(impersonationEvents.createdAt))
      .limit(limit);
  }

  async getImpersonationEventsEnriched(limit = 500): Promise<ImpersonationEventListRow[]> {
    const impersonatorUser = alias(users, "impersonator_user");
    const targetUser = alias(users, "target_user");
    const rows = await db
      .select({
        id: impersonationEvents.id,
        impersonatorUserId: impersonationEvents.impersonatorUserId,
        targetUserId: impersonationEvents.targetUserId,
        targetTenantId: impersonationEvents.targetTenantId,
        action: impersonationEvents.action,
        reason: impersonationEvents.reason,
        sessionTokenPrefix: impersonationEvents.sessionTokenPrefix,
        ipAddress: impersonationEvents.ipAddress,
        userAgent: impersonationEvents.userAgent,
        details: impersonationEvents.details,
        createdAt: impersonationEvents.createdAt,
        impersonatorEmail: impersonatorUser.email,
        impersonatorFirstName: impersonatorUser.firstName,
        impersonatorLastName: impersonatorUser.lastName,
        targetEmail: targetUser.email,
        targetFirstName: targetUser.firstName,
        targetLastName: targetUser.lastName,
        tenantName: tenants.name,
      })
      .from(impersonationEvents)
      .innerJoin(impersonatorUser, eq(impersonationEvents.impersonatorUserId, impersonatorUser.id))
      .innerJoin(targetUser, eq(impersonationEvents.targetUserId, targetUser.id))
      .leftJoin(tenants, eq(impersonationEvents.targetTenantId, tenants.id))
      .orderBy(desc(impersonationEvents.createdAt))
      .limit(limit);
    return rows;
  }

  async getImpersonationEventById(id: string): Promise<ImpersonationEvent | undefined> {
    const [row] = await db.select().from(impersonationEvents).where(eq(impersonationEvents.id, id)).limit(1);
    return row;
  }

  async findNextImpersonationEndEvent(params: {
    impersonatorUserId: string;
    targetUserId: string;
    afterTime: Date;
    sessionTokenPrefix?: string | null;
  }): Promise<ImpersonationEvent | undefined> {
    const conditions = [
      eq(impersonationEvents.action, "end"),
      eq(impersonationEvents.impersonatorUserId, params.impersonatorUserId),
      eq(impersonationEvents.targetUserId, params.targetUserId),
      gt(impersonationEvents.createdAt, params.afterTime),
    ];
    if (params.sessionTokenPrefix) {
      conditions.push(eq(impersonationEvents.sessionTokenPrefix, params.sessionTokenPrefix));
    }
    const [row] = await db
      .select()
      .from(impersonationEvents)
      .where(and(...conditions))
      .orderBy(asc(impersonationEvents.createdAt))
      .limit(1);
    return row;
  }

  async findPreviousImpersonationStartEvent(params: {
    impersonatorUserId: string;
    targetUserId: string;
    beforeTime: Date;
    sessionTokenPrefix?: string | null;
  }): Promise<ImpersonationEvent | undefined> {
    const conditions = [
      eq(impersonationEvents.action, "start"),
      eq(impersonationEvents.impersonatorUserId, params.impersonatorUserId),
      eq(impersonationEvents.targetUserId, params.targetUserId),
      lt(impersonationEvents.createdAt, params.beforeTime),
    ];
    if (params.sessionTokenPrefix) {
      conditions.push(eq(impersonationEvents.sessionTokenPrefix, params.sessionTokenPrefix));
    }
    const [row] = await db
      .select()
      .from(impersonationEvents)
      .where(and(...conditions))
      .orderBy(desc(impersonationEvents.createdAt))
      .limit(1);
    return row;
  }

  async getAuditLogsInImpersonationWindow(params: {
    tenantId: string;
    targetUserId: string;
    impersonatorUserId: string;
    windowStart: Date;
    windowEnd: Date;
    limit?: number;
  }): Promise<ImpersonationAuditCrudRow[]> {
    const limit = params.limit ?? 500;
    const operator = alias(users, "impersonation_operator");
    const impIdSql = sql<string>`(${auditLogs.details}->'impersonation'->>'impersonatorUserId')`;
    const rows = await db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        effectiveUserEmail: users.email,
        effectiveUserFirstName: users.firstName,
        effectiveUserLastName: users.lastName,
        tenantName: tenants.name,
        impersonatorUserId: impIdSql,
        impersonatorEmail: operator.email,
        impersonatorFirstName: operator.firstName,
        impersonatorLastName: operator.lastName,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .innerJoin(tenants, eq(auditLogs.tenantId, tenants.id))
      .leftJoin(operator, sql`${operator.id} = ${impIdSql}`)
      .where(
        and(
          eq(auditLogs.tenantId, params.tenantId),
          eq(auditLogs.userId, params.targetUserId),
          sql`(${auditLogs.details}->'impersonation'->>'impersonatorUserId') = ${params.impersonatorUserId}`,
          gte(auditLogs.createdAt, params.windowStart),
          lte(auditLogs.createdAt, params.windowEnd)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows;
  }

  async getAuditLogsDuringImpersonation(limit = 500): Promise<ImpersonationAuditCrudRow[]> {
    const operator = alias(users, "impersonation_operator");
    const impIdSql = sql<string>`(${auditLogs.details}->'impersonation'->>'impersonatorUserId')`;
    const rows = await db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        effectiveUserEmail: users.email,
        effectiveUserFirstName: users.firstName,
        effectiveUserLastName: users.lastName,
        tenantName: tenants.name,
        impersonatorUserId: impIdSql,
        impersonatorEmail: operator.email,
        impersonatorFirstName: operator.firstName,
        impersonatorLastName: operator.lastName,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .innerJoin(tenants, eq(auditLogs.tenantId, tenants.id))
      .leftJoin(operator, sql`${operator.id} = ${impIdSql}`)
      .where(sql`(${auditLogs.details}->'impersonation'->>'impersonatorUserId') IS NOT NULL`)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows;
  }

  async getGlobalAuditLogs(limit = 500): Promise<GlobalAuditLogRow[]> {
    const rows = await db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        tenantName: tenants.name,
        userId: auditLogs.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        originalData: auditLogs.originalData,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .innerJoin(tenants, eq(auditLogs.tenantId, tenants.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows;
  }

  async pingDatabase(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  async getPlatformScaleCounts(): Promise<{
    tenants: number;
    activeTenants: number;
    users: number;
    tenantBoundUsers: number;
    superAdminUsers: number;
    impersonationEventsLast24h: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toInt = (v: unknown) => Number(v ?? 0);

    const [
      tenantsRow,
      activeTenantsRow,
      usersRow,
      tenantBoundRow,
      superAdminRow,
      impRow,
    ] = await Promise.all([
      db.select({ c: count() }).from(tenants),
      db.select({ c: count() }).from(tenants).where(eq(tenants.status, "active")),
      db.select({ c: count() }).from(users),
      db.select({ c: count() }).from(users).where(isNotNull(users.tenantId)),
      db.select({ c: count() }).from(users).where(and(eq(users.role, "super_admin"), isNull(users.tenantId))),
      db.select({ c: count() }).from(impersonationEvents).where(gte(impersonationEvents.createdAt, since)),
    ]);

    return {
      tenants: toInt(tenantsRow[0]?.c),
      activeTenants: toInt(activeTenantsRow[0]?.c),
      users: toInt(usersRow[0]?.c),
      tenantBoundUsers: toInt(tenantBoundRow[0]?.c),
      superAdminUsers: toInt(superAdminRow[0]?.c),
      impersonationEventsLast24h: toInt(impRow[0]?.c),
    };
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    const session = await this.getUserSession(sessionToken);
    if (session?.impersonatorUserId) {
      const target = await this.getUserById(session.userId);
      try {
        await this.createImpersonationEvent({
          impersonatorUserId: session.impersonatorUserId,
          targetUserId: session.userId,
          targetTenantId: target?.tenantId ?? null,
          action: "end",
          reason: "logout",
          sessionTokenPrefix: sessionToken.slice(0, 8),
          details: { source: "session_delete" },
        });
      } catch (e) {
        console.error("Failed to record impersonation end event on session delete:", e);
      }
      if (target?.tenantId) {
        try {
          await this.auditAdminOperation(
            "impersonation_end",
            "session",
            sessionToken,
            session.impersonatorUserId,
            target.tenantId,
            null,
            { reason: "logout" },
            { impersonatedUserId: session.userId, sessionTerminated: true }
          );
        } catch (e) {
          console.error("Failed to audit impersonation end on session delete:", e);
        }
      }
    }
    await db
      .delete(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  // Tenant operations
  async createTenant(tenantData: UpsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    // Create default care location so multi-location activation never leaves tenant with zero locations
    await this.createDefaultCareLocationForTenant(tenant.id);
    // Customer/supplier portal settings row (enabled by default) so email lookup can resolve the tenant
    await db
      .insert(tenantPortalSettings)
      .values({ tenantId: tenant.id, enabled: true, updatedAt: new Date() })
      .onConflictDoNothing();
    return tenant;
  }

  /** Creates a default "Main" location for a tenant so multi-location can be enabled without getting stuck. */
  async createDefaultCareLocationForTenant(tenantId: string): Promise<CareLocation> {
    const [location] = await db
      .insert(careLocations)
      .values({
        tenantId,
        locationName: 'Default Location',
        locationCode: 'MAIN',
        description: 'Primary/default care location',
        status: 'active',
        isPrimary: true,
        locationKind: "fixed_site",
      })
      .returning();
    return location;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async updateTenant(id: string, tenantData: Partial<UpsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // Company operations - TENANT ISOLATED
  async createCompany(company: InsertCompany, tenantId: string): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values({ ...company, tenantId })
      .returning();
    return newCompany;
  }

  async getCompany(id: string, tenantId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.tenantId, tenantId)));
    return company;
  }

  async getCompanies(tenantId: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.tenantId, tenantId))
      .orderBy(desc(companies.createdAt));
  }

  /** Get the first company for a tenant, or create a default one so employees can be created. */
  async getOrCreateDefaultCompany(tenantId: string, tenantContactEmail?: string): Promise<Company> {
    const list = await this.getCompanies(tenantId);
    if (list.length > 0) return list[0];
    const [company] = await db
      .insert(companies)
      .values({
        tenantId,
        name: "Default",
        companyType: "mother_company",
        contactEmail: tenantContactEmail || "admin@tenant.local",
        status: "active",
      })
      .returning();
    return company;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>, tenantId: string): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(and(eq(companies.id, id), eq(companies.tenantId, tenantId)))
      .returning();
    if (!updatedCompany) {
      throw new Error('Company not found or does not belong to your tenant');
    }
    return updatedCompany;
  }

  async deleteCompany(id: string, tenantId: string): Promise<void> {
    const result = await db
      .delete(companies)
      .where(and(eq(companies.id, id), eq(companies.tenantId, tenantId)))
      .returning();
    if (!result || result.length === 0) {
      throw new Error('Company not found or does not belong to your tenant');
    }
  }

  // Care Location operations - TENANT ISOLATED
  async createCareLocation(location: InsertCareLocation, tenantId: string, userId: string): Promise<CareLocation> {
    const [newLocation] = await db
      .insert(careLocations)
      .values({ ...location, tenantId })
      .returning();
    return newLocation;
  }

  async getCareLocation(id: string, tenantId: string): Promise<CareLocation | undefined> {
    const [location] = await db
      .select()
      .from(careLocations)
      .where(and(eq(careLocations.id, id), eq(careLocations.tenantId, tenantId)));
    return location;
  }

  async getCareLocations(
    tenantId: string,
    options?: { includeInactive?: boolean; status?: string; locationKind?: "fixed_site" | "ambulance" }
  ): Promise<CareLocation[]> {
    const conditions = [eq(careLocations.tenantId, tenantId)];

    if (options?.locationKind) {
      conditions.push(eq(careLocations.locationKind, options.locationKind));
    }

    if (options?.status) {
      conditions.push(eq(careLocations.status, options.status));
    } else if (!options?.includeInactive) {
      conditions.push(eq(careLocations.status, "active"));
    }

    return await db
      .select()
      .from(careLocations)
      .where(and(...conditions))
      .orderBy(desc(careLocations.isPrimary), careLocations.locationName);
  }

  async getPrimaryCareLocation(tenantId: string): Promise<CareLocation | undefined> {
    const [location] = await db
      .select()
      .from(careLocations)
      .where(
        and(
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.isPrimary, true),
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site")
        )
      );
    return location;
  }

  async updateCareLocation(
    id: string, 
    location: Partial<InsertCareLocation>, 
    tenantId: string, 
    userId: string
  ): Promise<CareLocation> {
    const [updatedLocation] = await db
      .update(careLocations)
      .set({ ...location, updatedAt: new Date() })
      .where(and(eq(careLocations.id, id), eq(careLocations.tenantId, tenantId)))
      .returning();
    return updatedLocation;
  }

  async deleteCareLocation(id: string, tenantId: string, userId: string): Promise<void> {
    await db
      .delete(careLocations)
      .where(and(eq(careLocations.id, id), eq(careLocations.tenantId, tenantId)));
  }

  async unsetPrimaryCareLocation(tenantId: string): Promise<void> {
    await db
      .update(careLocations)
      .set({ isPrimary: false })
      .where(and(eq(careLocations.tenantId, tenantId), eq(careLocations.isPrimary, true)));
  }

  async getTotalStockUnitsAtCareLocation(tenantId: string, locationId: string): Promise<number> {
    const [row] = await db
      .select({ total: sum(inventoryStock.currentStock) })
      .from(inventoryStock)
      .where(and(eq(inventoryStock.tenantId, tenantId), eq(inventoryStock.locationId, locationId)));
    const v = row?.total;
    return v == null || Number.isNaN(Number(v)) ? 0 : Number(v);
  }

  async createAmbulanceCareLocation(
    tenantId: string,
    _userId: string,
    data: CreateAmbulanceInput
  ): Promise<CareLocation> {
    const [row] = await db
      .insert(careLocations)
      .values({
        tenantId,
        locationName: data.locationName,
        locationCode: data.locationCode,
        description: data.description ?? null,
        locationKind: "ambulance",
        stationedAtLocationId: data.stationedAtLocationId ?? null,
        callSign: data.callSign ?? null,
        registrationPlate: data.registrationPlate ?? null,
        fleetNumber: data.fleetNumber ?? null,
        coverageNotes: data.coverageNotes ?? null,
        ambulanceOpsStatus: data.ambulanceOpsStatus ?? "available",
        status: data.status ?? "active",
        isPrimary: false,
      })
      .returning();
    return row;
  }

  async updateAmbulanceCareLocation(
    id: string,
    tenantId: string,
    _userId: string,
    data: UpdateAmbulanceInput
  ): Promise<CareLocation> {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.locationName !== undefined) patch.locationName = data.locationName;
    if (data.locationCode !== undefined) patch.locationCode = data.locationCode;
    if (data.description !== undefined) patch.description = data.description;
    if (data.stationedAtLocationId !== undefined) patch.stationedAtLocationId = data.stationedAtLocationId;
    if (data.callSign !== undefined) patch.callSign = data.callSign;
    if (data.registrationPlate !== undefined) patch.registrationPlate = data.registrationPlate;
    if (data.fleetNumber !== undefined) patch.fleetNumber = data.fleetNumber;
    if (data.coverageNotes !== undefined) patch.coverageNotes = data.coverageNotes;
    if (data.ambulanceOpsStatus !== undefined) patch.ambulanceOpsStatus = data.ambulanceOpsStatus;
    if (data.status !== undefined) patch.status = data.status;

    const [updated] = await db
      .update(careLocations)
      .set(patch as Partial<InsertCareLocation>)
      .where(
        and(
          eq(careLocations.id, id),
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.locationKind, "ambulance")
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Ambulance not found or not an ambulance location");
    }
    return updated;
  }

  async listAmbulancesForTenant(
    tenantId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Array<CareLocation & { stationedAtLocationName: string | null }>> {
    const conditions = [eq(careLocations.tenantId, tenantId), eq(careLocations.locationKind, "ambulance")];
    if (!options?.includeInactive) {
      conditions.push(eq(careLocations.status, "active"));
    }
    const rows = await db
      .select()
      .from(careLocations)
      .where(and(...conditions))
      .orderBy(careLocations.locationName);

    const stationIds = Array.from(
      new Set(rows.map((r) => r.stationedAtLocationId).filter((id): id is string => Boolean(id)))
    );
    let nameById = new Map<string, string>();
    if (stationIds.length > 0) {
      const posts = await db
        .select({ id: careLocations.id, locationName: careLocations.locationName })
        .from(careLocations)
        .where(and(eq(careLocations.tenantId, tenantId), inArray(careLocations.id, stationIds)));
      nameById = new Map(posts.map((p) => [p.id, p.locationName]));
    }

    return rows.map((r) => ({
      ...r,
      stationedAtLocationName: r.stationedAtLocationId
        ? (nameById.get(r.stationedAtLocationId) ?? null)
        : null,
    }));
  }

  async listAmbulancePrestartChecks(
    tenantId: string,
    filters?: { ambulanceLocationId?: string; fromShiftDate?: string; toShiftDate?: string }
  ): Promise<
    Array<
      AmbulancePrestartCheck & {
        ambulanceName: string;
        completedByFirstName: string | null;
        completedByLastName: string | null;
      }
    >
  > {
    const conditions: SQL[] = [eq(ambulancePrestartChecks.tenantId, tenantId)];
    if (filters?.ambulanceLocationId?.trim()) {
      conditions.push(eq(ambulancePrestartChecks.ambulanceLocationId, filters.ambulanceLocationId.trim()));
    }
    if (filters?.fromShiftDate?.trim()) {
      conditions.push(gte(ambulancePrestartChecks.shiftDate, filters.fromShiftDate.trim()));
    }
    if (filters?.toShiftDate?.trim()) {
      conditions.push(lte(ambulancePrestartChecks.shiftDate, filters.toShiftDate.trim()));
    }
    const rows = await db
      .select({
        row: ambulancePrestartChecks,
        ambulanceName: careLocations.locationName,
        completedByFirstName: users.firstName,
        completedByLastName: users.lastName,
      })
      .from(ambulancePrestartChecks)
      .innerJoin(careLocations, eq(ambulancePrestartChecks.ambulanceLocationId, careLocations.id))
      .innerJoin(users, eq(ambulancePrestartChecks.completedByUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(ambulancePrestartChecks.checkedAt));
    return rows.map((r) => ({
      ...r.row,
      ambulanceName: r.ambulanceName,
      completedByFirstName: r.completedByFirstName,
      completedByLastName: r.completedByLastName,
    }));
  }

  async getAmbulancePrestartCheck(id: string, tenantId: string): Promise<AmbulancePrestartCheck | undefined> {
    const [row] = await db
      .select()
      .from(ambulancePrestartChecks)
      .where(and(eq(ambulancePrestartChecks.id, id), eq(ambulancePrestartChecks.tenantId, tenantId)));
    return row;
  }

  async getAmbulancePrestartCheckEnriched(
    id: string,
    tenantId: string
  ): Promise<
    | (AmbulancePrestartCheck & {
        ambulanceName: string;
        completedByFirstName: string | null;
        completedByLastName: string | null;
      })
    | undefined
  > {
    const [r] = await db
      .select({
        row: ambulancePrestartChecks,
        ambulanceName: careLocations.locationName,
        completedByFirstName: users.firstName,
        completedByLastName: users.lastName,
      })
      .from(ambulancePrestartChecks)
      .innerJoin(careLocations, eq(ambulancePrestartChecks.ambulanceLocationId, careLocations.id))
      .innerJoin(users, eq(ambulancePrestartChecks.completedByUserId, users.id))
      .where(and(eq(ambulancePrestartChecks.id, id), eq(ambulancePrestartChecks.tenantId, tenantId)));
    if (!r) return undefined;
    return {
      ...r.row,
      ambulanceName: r.ambulanceName,
      completedByFirstName: r.completedByFirstName,
      completedByLastName: r.completedByLastName,
    };
  }

  async createAmbulancePrestartCheck(
    tenantId: string,
    userId: string,
    data: CreateAmbulancePrestartInput
  ): Promise<AmbulancePrestartCheck> {
    const amb = await this.getCareLocation(data.ambulanceLocationId, tenantId);
    if (!amb || amb.locationKind !== "ambulance") {
      throw new Error("Selected unit is not a registered ambulance for this organization");
    }
    const st = data.status ?? "draft";
    if (st === "completed") {
      const allPass = AMBULANCE_PRESTART_CHECKLIST_ITEMS.every((item) => data.responses[item.key] === true);
      if (!allPass) {
        throw new Error("All checklist items must pass before marking the form completed");
      }
    }
    const [row] = await db
      .insert(ambulancePrestartChecks)
      .values({
        tenantId,
        ambulanceLocationId: data.ambulanceLocationId,
        completedByUserId: userId,
        shiftDate: data.shiftDate,
        responses: data.responses as object,
        deficienciesNotes: data.deficienciesNotes ?? null,
        mileageReading: data.mileageReading ?? null,
        status: data.status ?? "draft",
      })
      .returning();
    if (!row) throw new Error("Failed to create pre-start check");
    return row;
  }

  async updateAmbulancePrestartCheck(
    id: string,
    tenantId: string,
    actorUserId: string,
    actorRole: string,
    data: UpdateAmbulancePrestartInput
  ): Promise<AmbulancePrestartCheck> {
    const existing = await this.getAmbulancePrestartCheck(id, tenantId);
    if (!existing) throw new Error("Pre-start check not found");
    const isAdmin = actorRole === "admin" || actorRole === "super_admin";
    if (!isAdmin && existing.completedByUserId !== actorUserId) {
      throw new Error("You can only edit your own pre-start submissions");
    }
    if (!isAdmin && existing.status === "completed") {
      throw new Error("Completed checks cannot be edited");
    }
    const mergedResponses =
      data.responses != null
        ? { ...(existing.responses as Record<string, boolean>), ...data.responses }
        : (existing.responses as Record<string, boolean>);
    const nextStatus = data.status ?? existing.status;
    if (nextStatus === "completed") {
      const allPass = AMBULANCE_PRESTART_CHECKLIST_ITEMS.every((item) => mergedResponses[item.key] === true);
      if (!allPass) {
        throw new Error("All checklist items must pass before marking the form completed");
      }
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.shiftDate !== undefined) patch.shiftDate = data.shiftDate;
    if (data.responses !== undefined) patch.responses = mergedResponses as object;
    if (data.deficienciesNotes !== undefined) patch.deficienciesNotes = data.deficienciesNotes;
    if (data.mileageReading !== undefined) patch.mileageReading = data.mileageReading;
    if (data.status !== undefined) patch.status = data.status;
    const [updated] = await db
      .update(ambulancePrestartChecks)
      .set(patch as Partial<AmbulancePrestartCheck>)
      .where(and(eq(ambulancePrestartChecks.id, id), eq(ambulancePrestartChecks.tenantId, tenantId)))
      .returning();
    if (!updated) throw new Error("Update failed");
    return updated;
  }

  // Referral facilities (transfer hospitals) - TENANT ISOLATED
  async getReferralFacilities(
    tenantId: string,
    options?: { includeInactive?: boolean; status?: string }
  ): Promise<ReferralFacility[]> {
    const conditions = [eq(referralFacilities.tenantId, tenantId)];
    if (options?.status) {
      conditions.push(eq(referralFacilities.status, options.status));
    } else if (!options?.includeInactive) {
      conditions.push(eq(referralFacilities.status, "active"));
    }
    return await db
      .select()
      .from(referralFacilities)
      .where(and(...conditions))
      .orderBy(referralFacilities.name);
  }

  async getReferralFacility(id: string, tenantId: string): Promise<ReferralFacility | undefined> {
    const [row] = await db
      .select()
      .from(referralFacilities)
      .where(and(eq(referralFacilities.id, id), eq(referralFacilities.tenantId, tenantId)));
    return row;
  }

  async createReferralFacility(data: InsertReferralFacility, tenantId: string): Promise<ReferralFacility> {
    const values = {
      tenantId,
      name: data.name,
      address: data.address ?? null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: (data as any).contactEmail ?? null,
      status: data.status ?? "active",
    };
    const inserted = await db
      .insert(referralFacilities)
      .values(values)
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error("Referral facility insert did not return a row");
    }
    return row;
  }

  async updateReferralFacility(
    id: string,
    data: Partial<InsertReferralFacility>,
    tenantId: string
  ): Promise<ReferralFacility> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) set.name = data.name;
    if (data.address !== undefined) set.address = data.address ?? null;
    if (data.contactPhone !== undefined) set.contactPhone = data.contactPhone ?? null;
    if ((data as any).contactEmail !== undefined) set.contactEmail = (data as any).contactEmail ?? null;
    if (data.status !== undefined) set.status = data.status;
    const updated = await db
      .update(referralFacilities)
      .set(set)
      .where(and(eq(referralFacilities.id, id), eq(referralFacilities.tenantId, tenantId)))
      .returning();
    const row = updated[0];
    if (!row) {
      throw new Error("Referral facility update did not return a row");
    }
    return row;
  }

  async deleteReferralFacility(id: string, tenantId: string): Promise<void> {
    await db
      .delete(referralFacilities)
      .where(and(eq(referralFacilities.id, id), eq(referralFacilities.tenantId, tenantId)));
  }

  async setSessionLocation(sessionToken: string, locationId: string, locationName: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ 
        activeLocationId: locationId,
        activeLocationName: locationName
      })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  // Shift reports - TENANT ISOLATED
  async createShiftReport(tenantId: string, data: Omit<InsertShiftReport, "tenantId">): Promise<ShiftReport> {
    const reportDate =
      typeof data.reportDate === "string"
        ? data.reportDate
        : data.reportDate.toISOString().split("T")[0];
    const [row] = await db
      .insert(shiftReports)
      .values({
        tenantId,
        locationId: data.locationId,
        reportedById: data.reportedById,
        reportDate,
        shift: data.shift,
        summary: data.summary,
        notes: data.notes ?? null,
        activitiesNotes: data.activitiesNotes ?? null,
        handoverNotes: data.handoverNotes ?? null,
        hasIssues: data.hasIssues ?? false,
        issuesNotes: data.issuesNotes ?? null,
        handoverStructured: data.handoverStructured ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async getShiftReports(
    tenantId: string,
    filters?: {
      locationId?: string;
      fromDate?: string;
      toDate?: string;
      shift?: string;
      limit?: number;
      offset?: number;
      unacknowledgedByUserId?: string;
    }
  ): Promise<ShiftReport[]> {
    const conditions = [eq(shiftReports.tenantId, tenantId)];
    if (filters?.locationId) conditions.push(eq(shiftReports.locationId, filters.locationId));
    if (filters?.fromDate) conditions.push(gte(shiftReports.reportDate, filters.fromDate));
    if (filters?.toDate) conditions.push(lte(shiftReports.reportDate, filters.toDate));
    if (filters?.shift) conditions.push(eq(shiftReports.shift, filters.shift));
    if (filters?.unacknowledgedByUserId) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${shiftReportAcknowledgments} a
          WHERE a.shift_report_id = ${shiftReports.id}
          AND a.user_id = ${filters.unacknowledgedByUserId}
        )`
      );
    }
    const limit = Math.min(filters?.limit ?? 50, 100);
    const offset = filters?.offset ?? 0;
    const rows = await db
      .select()
      .from(shiftReports)
      .where(and(...conditions))
      .orderBy(desc(shiftReports.reportDate), desc(shiftReports.createdAt))
      .limit(limit)
      .offset(offset);
    return rows;
  }

  async getShiftReportById(id: string, tenantId: string): Promise<ShiftReport | undefined> {
    const [row] = await db
      .select()
      .from(shiftReports)
      .where(and(eq(shiftReports.id, id), eq(shiftReports.tenantId, tenantId)));
    return row;
  }

  async updateShiftReport(
    id: string,
    tenantId: string,
    data: Partial<Omit<InsertShiftReport, "tenantId" | "reportedById">>,
    editorUserId?: string
  ): Promise<ShiftReport> {
    if (editorUserId) {
      const existing = await this.getShiftReportById(id, tenantId);
      if (existing) {
        await db.insert(shiftReportRevisionHistory).values({
          tenantId,
          shiftReportId: id,
          editedByUserId: editorUserId,
          previousSnapshot: existing as unknown as Record<string, unknown>,
        });
      }
    }
    const { reportDate: incomingReportDate, ...rest } = data;
    const reportDateStr =
      incomingReportDate === undefined
        ? undefined
        : typeof incomingReportDate === "string"
          ? incomingReportDate
          : incomingReportDate.toISOString().split("T")[0];
    type ShiftReportPatch = Partial<Omit<InsertShiftReport, "tenantId" | "reportedById">> & {
      updatedAt: Date;
      reportDate?: string;
    };
    const setValues: ShiftReportPatch = {
      ...rest,
      updatedAt: new Date(),
      ...(reportDateStr !== undefined ? { reportDate: reportDateStr } : {}),
    };
    const [row] = await db
      .update(shiftReports)
      .set(setValues)
      .where(and(eq(shiftReports.id, id), eq(shiftReports.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteShiftReport(id: string, tenantId: string): Promise<void> {
    await db
      .delete(shiftReports)
      .where(and(eq(shiftReports.id, id), eq(shiftReports.tenantId, tenantId)));
  }

  async getShiftReportAckStats(
    tenantId: string,
    reportIds: string[],
    currentUserId: string
  ): Promise<Map<string, { ackCount: number; acknowledgedByMe: boolean }>> {
    const map = new Map<string, { ackCount: number; acknowledgedByMe: boolean }>();
    if (reportIds.length === 0) return map;
    const rows = await db
      .select({
        shiftReportId: shiftReportAcknowledgments.shiftReportId,
        ackCount: sql<number>`cast(count(*) as int)`,
        myAcks: sql<number>`cast(count(*) filter (where ${shiftReportAcknowledgments.userId} = ${currentUserId}) as int)`,
      })
      .from(shiftReportAcknowledgments)
      .where(
        and(
          eq(shiftReportAcknowledgments.tenantId, tenantId),
          inArray(shiftReportAcknowledgments.shiftReportId, reportIds)
        )
      )
      .groupBy(shiftReportAcknowledgments.shiftReportId);
    for (const r of rows) {
      map.set(r.shiftReportId, {
        ackCount: r.ackCount,
        acknowledgedByMe: r.myAcks > 0,
      });
    }
    return map;
  }

  async createShiftReportAcknowledgment(
    tenantId: string,
    shiftReportId: string,
    userId: string,
    note?: string | null
  ): Promise<ShiftReportAcknowledgment> {
    const [row] = await db
      .insert(shiftReportAcknowledgments)
      .values({
        tenantId,
        shiftReportId,
        userId,
        note: note ?? null,
      })
      .onConflictDoNothing({
        target: [shiftReportAcknowledgments.shiftReportId, shiftReportAcknowledgments.userId],
      })
      .returning();
    if (row) return row;
    const [existing] = await db
      .select()
      .from(shiftReportAcknowledgments)
      .where(
        and(
          eq(shiftReportAcknowledgments.tenantId, tenantId),
          eq(shiftReportAcknowledgments.shiftReportId, shiftReportId),
          eq(shiftReportAcknowledgments.userId, userId)
        )
      );
    if (!existing) throw new Error("Failed to create acknowledgment");
    return existing;
  }

  async listShiftReportAcknowledgments(
    shiftReportId: string,
    tenantId: string
  ): Promise<Array<ShiftReportAcknowledgment & { userName?: string }>> {
    const rows = await db
      .select({ ack: shiftReportAcknowledgments })
      .from(shiftReportAcknowledgments)
      .where(
        and(
          eq(shiftReportAcknowledgments.shiftReportId, shiftReportId),
          eq(shiftReportAcknowledgments.tenantId, tenantId)
        )
      )
      .orderBy(desc(shiftReportAcknowledgments.acknowledgedAt));
    const userIds = [...new Set(rows.map((r) => r.ack.userId))];
    const usersList = await Promise.all(userIds.map((uid) => this.getUserById(uid)));
    const nameMap = new Map(
      userIds.map((uid, i) => {
        const u = usersList[i];
        const name = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || uid : uid;
        return [uid, name];
      })
    );
    return rows.map((r) => ({
      ...r.ack,
      userName: nameMap.get(r.ack.userId),
    }));
  }

  async createShiftReportLink(
    tenantId: string,
    shiftReportId: string,
    createdByUserId: string,
    linkedType: "ticket" | "incident" | "duty",
    linkedId: string,
    note?: string | null
  ): Promise<ShiftReportLink> {
    const [row] = await db
      .insert(shiftReportLinks)
      .values({
        tenantId,
        shiftReportId,
        linkedType,
        linkedId,
        note: note ?? null,
        createdByUserId,
      })
      .onConflictDoNothing({
        target: [
          shiftReportLinks.shiftReportId,
          shiftReportLinks.linkedType,
          shiftReportLinks.linkedId,
        ],
      })
      .returning();
    if (row) return row;
    const [existing] = await db
      .select()
      .from(shiftReportLinks)
      .where(
        and(
          eq(shiftReportLinks.tenantId, tenantId),
          eq(shiftReportLinks.shiftReportId, shiftReportId),
          eq(shiftReportLinks.linkedType, linkedType),
          eq(shiftReportLinks.linkedId, linkedId)
        )
      );
    if (!existing) throw new Error("Failed to create link");
    return existing;
  }

  async deleteShiftReportLink(linkId: string, tenantId: string): Promise<void> {
    await db
      .delete(shiftReportLinks)
      .where(and(eq(shiftReportLinks.id, linkId), eq(shiftReportLinks.tenantId, tenantId)));
  }

  async getShiftReportLinkById(linkId: string, tenantId: string): Promise<ShiftReportLink | undefined> {
    const [row] = await db
      .select()
      .from(shiftReportLinks)
      .where(and(eq(shiftReportLinks.id, linkId), eq(shiftReportLinks.tenantId, tenantId)));
    return row;
  }

  async listShiftReportLinks(shiftReportId: string, tenantId: string): Promise<ShiftReportLink[]> {
    return db
      .select()
      .from(shiftReportLinks)
      .where(
        and(eq(shiftReportLinks.shiftReportId, shiftReportId), eq(shiftReportLinks.tenantId, tenantId))
      )
      .orderBy(desc(shiftReportLinks.createdAt));
  }

  async createShiftReportAttachment(
    tenantId: string,
    shiftReportId: string,
    uploadedByUserId: string,
    data: { fileUrl: string; originalName: string; mimeType?: string | null; sizeBytes?: number | null }
  ): Promise<ShiftReportAttachment> {
    const [row] = await db
      .insert(shiftReportAttachments)
      .values({
        tenantId,
        shiftReportId,
        fileUrl: data.fileUrl,
        originalName: data.originalName,
        mimeType: data.mimeType ?? null,
        sizeBytes: data.sizeBytes ?? null,
        uploadedByUserId,
      })
      .returning();
    return row;
  }

  async listShiftReportAttachments(
    shiftReportId: string,
    tenantId: string
  ): Promise<ShiftReportAttachment[]> {
    return db
      .select()
      .from(shiftReportAttachments)
      .where(
        and(
          eq(shiftReportAttachments.shiftReportId, shiftReportId),
          eq(shiftReportAttachments.tenantId, tenantId)
        )
      )
      .orderBy(desc(shiftReportAttachments.createdAt));
  }

  async getShiftReportAttachmentById(
    attachmentId: string,
    tenantId: string
  ): Promise<ShiftReportAttachment | undefined> {
    const [row] = await db
      .select()
      .from(shiftReportAttachments)
      .where(
        and(eq(shiftReportAttachments.id, attachmentId), eq(shiftReportAttachments.tenantId, tenantId))
      );
    return row;
  }

  async deleteShiftReportAttachment(attachmentId: string, tenantId: string): Promise<void> {
    await db
      .delete(shiftReportAttachments)
      .where(
        and(eq(shiftReportAttachments.id, attachmentId), eq(shiftReportAttachments.tenantId, tenantId))
      );
  }

  async listShiftReportRevisionHistory(
    shiftReportId: string,
    tenantId: string,
    limit = 20
  ): Promise<ShiftReportRevisionHistory[]> {
    return db
      .select()
      .from(shiftReportRevisionHistory)
      .where(
        and(
          eq(shiftReportRevisionHistory.shiftReportId, shiftReportId),
          eq(shiftReportRevisionHistory.tenantId, tenantId)
        )
      )
      .orderBy(desc(shiftReportRevisionHistory.createdAt))
      .limit(Math.min(limit, 50));
  }

  async getShiftoverSummary(
    tenantId: string,
    userId: string,
    options?: { locationId?: string; pendingAckDays?: number }
  ): Promise<{
    lastShiftReport: (ShiftReport & { locationName?: string }) | null;
    pendingAcknowledgmentsCount: number;
    openLinkedItemsCount: number;
  }> {
    const pendingDays = options?.pendingAckDays ?? 14;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - pendingDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const lastCond = [eq(shiftReports.tenantId, tenantId)];
    if (options?.locationId) lastCond.push(eq(shiftReports.locationId, options.locationId));
    const [last] = await db
      .select()
      .from(shiftReports)
      .where(and(...lastCond))
      .orderBy(desc(shiftReports.createdAt))
      .limit(1);
    let lastWithName: (ShiftReport & { locationName?: string }) | null = null;
    if (last) {
      const loc = await this.getCareLocation(last.locationId, tenantId);
      lastWithName = { ...last, locationName: loc?.locationName };
    }

    const pendingCond = [
      eq(shiftReports.tenantId, tenantId),
      gte(shiftReports.reportDate, cutoffStr),
      sql`NOT EXISTS (
        SELECT 1 FROM ${shiftReportAcknowledgments} a
        WHERE a.shift_report_id = ${shiftReports.id}
        AND a.user_id = ${userId}
      )`,
    ];
    if (options?.locationId) pendingCond.push(eq(shiftReports.locationId, options.locationId));
    const [pendingRow] = await db
      .select({ c: sql<number>`cast(count(*) as int)` })
      .from(shiftReports)
      .where(and(...pendingCond));
    const pendingAcknowledgmentsCount = pendingRow?.c ?? 0;

    const openItems = await this.listShiftoverOpenItems(tenantId, {
      locationId: options?.locationId,
      sinceDays: 90,
    });

    return {
      lastShiftReport: lastWithName,
      pendingAcknowledgmentsCount,
      openLinkedItemsCount: openItems.length,
    };
  }

  async listShiftoverOpenItems(
    tenantId: string,
    options?: { locationId?: string; sinceDays?: number }
  ): Promise<
    Array<{
      link: ShiftReportLink;
      shiftReportId: string;
      reportDate: string;
      shift: string;
      locationId: string;
      locationName?: string;
      entityLabel: string;
      entityStatus: string;
    }>
  > {
    const sinceDays = options?.sinceDays ?? 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const joinCond = [
      eq(shiftReportLinks.tenantId, tenantId),
      eq(shiftReports.tenantId, tenantId),
      gte(shiftReports.reportDate, cutoffStr),
    ];
    if (options?.locationId) joinCond.push(eq(shiftReports.locationId, options.locationId));

    const rows = await db
      .select({
        link: shiftReportLinks,
        reportDate: shiftReports.reportDate,
        shift: shiftReports.shift,
        locationId: shiftReports.locationId,
      })
      .from(shiftReportLinks)
      .innerJoin(shiftReports, eq(shiftReportLinks.shiftReportId, shiftReports.id))
      .where(and(...joinCond))
      .orderBy(desc(shiftReports.reportDate));

    const ticketIds = rows.filter((r) => r.link.linkedType === "ticket").map((r) => r.link.linkedId);
    const incidentIds = rows.filter((r) => r.link.linkedType === "incident").map((r) => r.link.linkedId);
    const dutyIds = rows.filter((r) => r.link.linkedType === "duty").map((r) => r.link.linkedId);

    const ticketsMap = new Map<string, { title: string; status: string }>();
    if (ticketIds.length > 0) {
      const tks = await db
        .select({ id: tickets.id, title: tickets.title, status: tickets.status })
        .from(tickets)
        .where(and(eq(tickets.tenantId, tenantId), inArray(tickets.id, [...new Set(ticketIds)])));
      for (const t of tks) ticketsMap.set(t.id, { title: t.title, status: t.status });
    }
    const incidentsMap = new Map<string, { type: string; status: string | null }>();
    if (incidentIds.length > 0) {
      const incs = await db
        .select({
          id: incidentReports.id,
          incidentType: incidentReports.incidentType,
          status: incidentReports.status,
        })
        .from(incidentReports)
        .where(
          and(eq(incidentReports.tenantId, tenantId), inArray(incidentReports.id, [...new Set(incidentIds)]))
        );
      for (const i of incs) incidentsMap.set(i.id, { type: i.incidentType, status: i.status });
    }
    const dutiesMap = new Map<string, { status: string }>();
    if (dutyIds.length > 0) {
      const dus = await db
        .select({ id: operationalDutyAssignments.id, status: operationalDutyAssignments.status })
        .from(operationalDutyAssignments)
        .where(
          and(
            eq(operationalDutyAssignments.tenantId, tenantId),
            inArray(operationalDutyAssignments.id, [...new Set(dutyIds)])
          )
        );
      for (const d of dus) dutiesMap.set(d.id, { status: d.status ?? "" });
    }

    const locCache = new Map<string, string | undefined>();

    const result: Array<{
      link: ShiftReportLink;
      shiftReportId: string;
      reportDate: string;
      shift: string;
      locationId: string;
      locationName?: string;
      entityLabel: string;
      entityStatus: string;
    }> = [];

    for (const r of rows) {
      let open = false;
      let entityLabel = "";
      let entityStatus = "";
      if (r.link.linkedType === "ticket") {
        const t = ticketsMap.get(r.link.linkedId);
        if (!t) continue;
        entityStatus = t.status;
        entityLabel = `Ticket: ${t.title}`;
        open = !["resolved", "closed", "cancelled"].includes(t.status);
      } else if (r.link.linkedType === "incident") {
        const i = incidentsMap.get(r.link.linkedId);
        if (!i) continue;
        entityStatus = i.status || "open";
        entityLabel = `Incident: ${i.type}`;
        open = (i.status || "open").toLowerCase() !== "closed";
      } else if (r.link.linkedType === "duty") {
        const d = dutiesMap.get(r.link.linkedId);
        if (!d) continue;
        entityStatus = d.status;
        entityLabel = `Duty assignment`;
        open = !["completed", "cancelled"].includes(d.status);
      }
      if (!open) continue;
      if (!locCache.has(r.locationId)) {
        const l = await this.getCareLocation(r.locationId, tenantId);
        locCache.set(r.locationId, l?.locationName);
      }
      const locationName = locCache.get(r.locationId);
      result.push({
        link: r.link,
        shiftReportId: r.link.shiftReportId,
        reportDate:
          typeof r.reportDate === "string" ? r.reportDate : (r.reportDate as Date).toISOString().split("T")[0],
        shift: r.shift,
        locationId: r.locationId,
        locationName,
        entityLabel,
        entityStatus,
      });
    }

    return result;
  }

  // Staff e-ticketing — TENANT ISOLATED
  async ensureDefaultTicketCategories(tenantId: string): Promise<void> {
    // Idempotently ensure a stable baseline of tenant ticket categories.
    // Note: categories are tenant-scoped; the unique constraint on (tenant_id, slug)
    // makes the insert safe even if some categories already exist.
    await db
      .insert(ticketCategories)
      .values([
        { tenantId, name: "Repair / maintenance", slug: "repair-maintenance", sortOrder: 10 },
        { tenantId, name: "Complaint / concern", slug: "complaint-concern", sortOrder: 20 },
        // Kept for backward compatibility with existing staff tickets.
        { tenantId, name: "IT / systems", slug: "it-systems", sortOrder: 30 },
        { tenantId, name: "Health & safety", slug: "health-safety", sortOrder: 40 },
      ])
      .onConflictDoNothing();
  }

  async listTicketCategories(tenantId: string, options?: { includeInactive?: boolean }): Promise<TicketCategory[]> {
    await this.ensureDefaultTicketCategories(tenantId);
    const conditions = [eq(ticketCategories.tenantId, tenantId)];
    if (!options?.includeInactive) {
      conditions.push(eq(ticketCategories.isActive, true));
    }
    return db
      .select()
      .from(ticketCategories)
      .where(and(...conditions))
      .orderBy(asc(ticketCategories.sortOrder), asc(ticketCategories.name));
  }

  async getTicketCategoryById(id: string, tenantId: string): Promise<TicketCategory | undefined> {
    const [row] = await db
      .select()
      .from(ticketCategories)
      .where(and(eq(ticketCategories.id, id), eq(ticketCategories.tenantId, tenantId)));
    return row;
  }

  async createTicketCategory(
    tenantId: string,
    data: { name: string; slug: string; sortOrder?: number }
  ): Promise<TicketCategory> {
    await this.ensureDefaultTicketCategories(tenantId);
    const [row] = await db
      .insert(ticketCategories)
      .values({
        tenantId,
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        sortOrder: data.sortOrder ?? 100,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateTicketCategory(
    id: string,
    tenantId: string,
    data: Partial<{ name: string; slug: string; sortOrder: number; isActive: boolean }>
  ): Promise<TicketCategory | undefined> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.slug !== undefined) update.slug = data.slug.trim().toLowerCase();
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    const [row] = await db
      .update(ticketCategories)
      .set(update as any)
      .where(and(eq(ticketCategories.id, id), eq(ticketCategories.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteTicketCategory(
    id: string,
    tenantId: string
  ): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" }> {
    const existing = await this.getTicketCategoryById(id, tenantId);
    if (!existing) return { ok: false, reason: "not_found" };
    const [{ n }] = await db
      .select({ n: count() })
      .from(tickets)
      .where(and(eq(tickets.tenantId, tenantId), eq(tickets.categoryId, id)));
    if ((n ?? 0) > 0) return { ok: false, reason: "in_use" };
    await db
      .delete(ticketCategories)
      .where(and(eq(ticketCategories.id, id), eq(ticketCategories.tenantId, tenantId)));
    return { ok: true };
  }

  async ensureDefaultInventoryCategories(tenantId: string): Promise<void> {
    await db
      .insert(inventoryCategories)
      .values(
        DEFAULT_INVENTORY_CATEGORIES.map((c) => ({
          tenantId,
          name: c.name,
          slug: c.slug,
          itemCodePrefix: c.itemCodePrefix,
          fieldTemplate: c.fieldTemplate,
          sortOrder: c.sortOrder,
          isSystem: true,
          isActive: true,
        }))
      )
      .onConflictDoNothing();
  }

  async listInventoryCategories(
    tenantId: string,
    options?: { includeInactive?: boolean }
  ): Promise<InventoryCategory[]> {
    await this.ensureDefaultInventoryCategories(tenantId);
    const conditions = [eq(inventoryCategories.tenantId, tenantId)];
    if (!options?.includeInactive) {
      conditions.push(eq(inventoryCategories.isActive, true));
    }
    return db
      .select()
      .from(inventoryCategories)
      .where(and(...conditions))
      .orderBy(asc(inventoryCategories.sortOrder), asc(inventoryCategories.name));
  }

  async getInventoryCategoryById(id: string, tenantId: string): Promise<InventoryCategory | undefined> {
    const [row] = await db
      .select()
      .from(inventoryCategories)
      .where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.tenantId, tenantId)));
    return row;
  }

  async getInventoryCategoryBySlug(slug: string, tenantId: string): Promise<InventoryCategory | undefined> {
    await this.ensureDefaultInventoryCategories(tenantId);
    const [row] = await db
      .select()
      .from(inventoryCategories)
      .where(
        and(
          eq(inventoryCategories.tenantId, tenantId),
          eq(inventoryCategories.slug, slug.trim().toLowerCase())
        )
      );
    return row;
  }

  async createInventoryCategory(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      itemCodePrefix: string;
      fieldTemplate: string;
      sortOrder?: number;
    }
  ): Promise<InventoryCategory> {
    await this.ensureDefaultInventoryCategories(tenantId);
    const prefix = data.itemCodePrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (prefix.length < 2) {
      throw new Error("Item code prefix must be at least 2 characters");
    }
    const [row] = await db
      .insert(inventoryCategories)
      .values({
        tenantId,
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        itemCodePrefix: prefix,
        fieldTemplate: data.fieldTemplate,
        sortOrder: data.sortOrder ?? 100,
        isSystem: false,
        isActive: true,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateInventoryCategory(
    id: string,
    tenantId: string,
    data: Partial<{
      name: string;
      slug: string;
      itemCodePrefix: string;
      fieldTemplate: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ): Promise<InventoryCategory | undefined> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.slug !== undefined) update.slug = data.slug.trim().toLowerCase();
    if (data.itemCodePrefix !== undefined) {
      const prefix = data.itemCodePrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (prefix.length < 2) throw new Error("Item code prefix must be at least 2 characters");
      update.itemCodePrefix = prefix;
    }
    if (data.fieldTemplate !== undefined) update.fieldTemplate = data.fieldTemplate;
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    const [row] = await db
      .update(inventoryCategories)
      .set(update as any)
      .where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.tenantId, tenantId)))
      .returning();
    return row;
  }

  async deleteInventoryCategory(
    id: string,
    tenantId: string
  ): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" | "system" }> {
    const existing = await this.getInventoryCategoryById(id, tenantId);
    if (!existing) return { ok: false, reason: "not_found" };
    if (existing.isSystem) return { ok: false, reason: "system" };
    const [{ n }] = await db
      .select({ n: count() })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.category, existing.slug)));
    if ((n ?? 0) > 0) return { ok: false, reason: "in_use" };
    await db
      .delete(inventoryCategories)
      .where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.tenantId, tenantId)));
    return { ok: true };
  }

  async createTicket(
    tenantId: string,
    actorUserId: string,
    data: {
      categoryId: string;
      title: string;
      descriptionHtml: string;
      priority?: "low" | "normal" | "high" | "urgent";
      locationId?: string | null;
      relatedIncidentId?: string | null;
      assetTag?: string | null;
    }
  ): Promise<Ticket> {
    await this.ensureDefaultTicketCategories(tenantId);
    const category = await this.getTicketCategoryById(data.categoryId, tenantId);
    if (!category?.isActive) {
      throw new Error("Invalid or inactive ticket category");
    }
    if (data.locationId) {
      const loc = await this.getCareLocation(data.locationId, tenantId);
      if (!loc) throw new Error("Location not found for tenant");
    }
    if (data.relatedIncidentId) {
      const inc = await this.getIncidentReport(data.relatedIncidentId, tenantId);
      if (!inc) throw new Error("Related incident not found for tenant");
    }

    return await db.transaction(async (tx) => {
      const year = new Date().getUTCFullYear();
      const [seq] = await tx
        .insert(ticketNumberSequences)
        .values({ tenantId, year, lastValue: 1 })
        .onConflictDoUpdate({
          target: [ticketNumberSequences.tenantId, ticketNumberSequences.year],
          set: { lastValue: sql`${ticketNumberSequences.lastValue} + 1` },
        })
        .returning();
      const n = seq?.lastValue ?? 1;
      const ticketNumber = `TKT-${year}-${String(n).padStart(5, "0")}`;
      const now = new Date();
      const [row] = await tx
        .insert(tickets)
        .values({
          tenantId,
          ticketNumber,
          categoryId: data.categoryId,
          title: data.title.trim(),
          descriptionHtml: data.descriptionHtml,
          priority: data.priority ?? "normal",
          requesterUserId: actorUserId,
          assigneeUserId: null,
          locationId: data.locationId ?? null,
          relatedIncidentId: data.relatedIncidentId ?? null,
          assetTag: data.assetTag?.trim() ? data.assetTag.trim() : null,
          status: "open",
          createdBy: actorUserId,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .returning();
      await tx.insert(ticketActivity).values({
        tenantId,
        ticketId: row.id,
        actorUserId,
        action: "created",
        metadata: { ticketNumber: row.ticketNumber },
      });
      return row;
    });
  }

  async getTicketById(id: string, tenantId: string): Promise<Ticket | undefined> {
    const [row] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
    return row;
  }

  async listTickets(
    tenantId: string,
    filters: {
      viewerUserId: string;
      scope: "mine" | "requested" | "assigned" | "all";
      status?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Ticket & { categoryName: string }>> {
    await this.ensureDefaultTicketCategories(tenantId);
    const conditions: SQL[] = [eq(tickets.tenantId, tenantId)];
    if (filters.scope === "mine") {
      conditions.push(
        or(
          eq(tickets.requesterUserId, filters.viewerUserId),
          eq(tickets.assigneeUserId, filters.viewerUserId)
        )!
      );
    } else if (filters.scope === "requested") {
      conditions.push(eq(tickets.requesterUserId, filters.viewerUserId));
    } else if (filters.scope === "assigned") {
      conditions.push(eq(tickets.assigneeUserId, filters.viewerUserId));
    }
    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status as any));
    }
    if (filters.categoryId) {
      conditions.push(eq(tickets.categoryId, filters.categoryId));
    }
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;
    const rows = await db
      .select({
        ticket: tickets,
        categoryName: ticketCategories.name,
      })
      .from(tickets)
      .innerJoin(ticketCategories, eq(tickets.categoryId, ticketCategories.id))
      .where(and(...conditions))
      .orderBy(desc(tickets.updatedAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => ({ ...r.ticket, categoryName: r.categoryName }));
  }

  async patchTicket(
    tenantId: string,
    ticketId: string,
    actorUserId: string,
    patch: Partial<{
      title: string;
      descriptionHtml: string;
      categoryId: string;
      priority: "low" | "normal" | "high" | "urgent";
      status: "open" | "triaged" | "in_progress" | "resolved" | "closed" | "cancelled";
      assigneeUserId: string | null;
      locationId: string | null;
      relatedIncidentId: string | null;
      assetTag: string | null;
    }>
  ): Promise<Ticket | undefined> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) return undefined;

    if (patch.categoryId && patch.categoryId !== existing.categoryId) {
      const cat = await this.getTicketCategoryById(patch.categoryId, tenantId);
      if (!cat?.isActive) throw new Error("Invalid or inactive ticket category");
    }
    if (patch.locationId !== undefined && patch.locationId) {
      const loc = await this.getCareLocation(patch.locationId, tenantId);
      if (!loc) throw new Error("Location not found for tenant");
    }
    if (patch.relatedIncidentId !== undefined && patch.relatedIncidentId) {
      const inc = await this.getIncidentReport(patch.relatedIncidentId, tenantId);
      if (!inc) throw new Error("Related incident not found for tenant");
    }
    if (patch.assigneeUserId) {
      const u = await this.getUserById(patch.assigneeUserId);
      if (!u || u.tenantId !== tenantId) throw new Error("Assignee must be a user in this tenant");
    }

    const now = new Date();
    let resolvedAt = existing.resolvedAt;
    let closedAt = existing.closedAt;
    const nextStatus = patch.status ?? existing.status;
    if (patch.status !== undefined) {
      if (nextStatus === "resolved" || nextStatus === "closed") {
        resolvedAt = resolvedAt ?? now;
      }
      if (nextStatus === "closed") {
        closedAt = closedAt ?? now;
      }
      if (nextStatus === "open" || nextStatus === "triaged" || nextStatus === "in_progress") {
        resolvedAt = null;
        closedAt = null;
      }
    }

    const updateRow: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: actorUserId,
      resolvedAt,
      closedAt,
    };
    if (patch.title !== undefined) updateRow.title = patch.title.trim();
    if (patch.descriptionHtml !== undefined) updateRow.descriptionHtml = patch.descriptionHtml;
    if (patch.categoryId !== undefined) updateRow.categoryId = patch.categoryId;
    if (patch.priority !== undefined) updateRow.priority = patch.priority;
    if (patch.status !== undefined) updateRow.status = patch.status;
    if (patch.assigneeUserId !== undefined) updateRow.assigneeUserId = patch.assigneeUserId;
    if (patch.locationId !== undefined) updateRow.locationId = patch.locationId;
    if (patch.relatedIncidentId !== undefined) updateRow.relatedIncidentId = patch.relatedIncidentId;
    if (patch.assetTag !== undefined) {
      updateRow.assetTag = patch.assetTag?.trim() ? patch.assetTag.trim() : null;
    }

    const activities: Array<{ action: string; metadata: Record<string, unknown> }> = [];
    if (patch.title !== undefined && patch.title !== existing.title) {
      activities.push({ action: "title_changed", metadata: {} });
    }
    if (patch.descriptionHtml !== undefined && patch.descriptionHtml !== existing.descriptionHtml) {
      activities.push({ action: "description_updated", metadata: {} });
    }
    if (patch.categoryId !== undefined && patch.categoryId !== existing.categoryId) {
      activities.push({
        action: "category_changed",
        metadata: { fromCategoryId: existing.categoryId, toCategoryId: patch.categoryId },
      });
    }
    if (patch.priority !== undefined && patch.priority !== existing.priority) {
      activities.push({
        action: "priority_changed",
        metadata: { from: existing.priority, to: patch.priority },
      });
    }
    if (patch.status !== undefined && patch.status !== existing.status) {
      activities.push({
        action: "status_changed",
        metadata: { from: existing.status, to: patch.status },
      });
    }
    if (patch.assigneeUserId !== undefined) {
      const prev = existing.assigneeUserId ?? null;
      const next = patch.assigneeUserId ?? null;
      if (prev !== next) {
        activities.push({
          action: "assigned",
          metadata: { fromUserId: prev, toUserId: next },
        });
      }
    }
    if (patch.locationId !== undefined && (existing.locationId ?? null) !== (patch.locationId ?? null)) {
      activities.push({
        action: "location_changed",
        metadata: { fromLocationId: existing.locationId, toLocationId: patch.locationId },
      });
    }
    if (
      patch.relatedIncidentId !== undefined &&
      (existing.relatedIncidentId ?? null) !== (patch.relatedIncidentId ?? null)
    ) {
      activities.push({ action: "related_incident_changed", metadata: {} });
    }

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tickets)
        .set(updateRow as any)
        .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)))
        .returning();
      if (!updated) return undefined;
      for (const a of activities) {
        await tx.insert(ticketActivity).values({
          tenantId,
          ticketId,
          actorUserId,
          action: a.action,
          metadata: a.metadata,
        });
      }
      return updated;
    });
  }

  async listTicketComments(ticketId: string, tenantId: string): Promise<TicketComment[]> {
    return db
      .select()
      .from(ticketComments)
      .where(and(eq(ticketComments.ticketId, ticketId), eq(ticketComments.tenantId, tenantId)))
      .orderBy(asc(ticketComments.createdAt));
  }

  async addTicketComment(
    ticketId: string,
    tenantId: string,
    authorUserId: string,
    data: { bodyHtml: string; isInternal: boolean }
  ): Promise<TicketComment> {
    const ticket = await this.getTicketById(ticketId, tenantId);
    if (!ticket) throw new Error("Ticket not found");
    const [row] = await db
      .insert(ticketComments)
      .values({
        tenantId,
        ticketId,
        authorUserId,
        bodyHtml: data.bodyHtml,
        isInternal: data.isInternal,
      })
      .returning();
    await db.insert(ticketActivity).values({
      tenantId,
      ticketId,
      actorUserId: authorUserId,
      action: "commented",
      metadata: { isInternal: data.isInternal },
    });
    return row;
  }

  async listTicketAttachments(ticketId: string, tenantId: string): Promise<TicketAttachment[]> {
    return db
      .select()
      .from(ticketAttachments)
      .where(and(eq(ticketAttachments.ticketId, ticketId), eq(ticketAttachments.tenantId, tenantId)))
      .orderBy(desc(ticketAttachments.createdAt));
  }

  async addTicketAttachment(
    ticketId: string,
    tenantId: string,
    uploadedByUserId: string,
    data: {
      fileUrl: string;
      originalName: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
    }
  ): Promise<TicketAttachment> {
    const ticket = await this.getTicketById(ticketId, tenantId);
    if (!ticket) throw new Error("Ticket not found");
    const [row] = await db
      .insert(ticketAttachments)
      .values({
        tenantId,
        ticketId,
        fileUrl: data.fileUrl,
        originalName: data.originalName,
        mimeType: data.mimeType ?? null,
        sizeBytes: data.sizeBytes ?? null,
        uploadedByUserId,
      })
      .returning();
    await db.insert(ticketActivity).values({
      tenantId,
      ticketId,
      actorUserId: uploadedByUserId,
      action: "attachment_added",
      metadata: { attachmentId: row.id, originalName: data.originalName },
    });
    return row;
  }

  async listTicketActivity(ticketId: string, tenantId: string): Promise<TicketActivity[]> {
    return db
      .select()
      .from(ticketActivity)
      .where(and(eq(ticketActivity.ticketId, ticketId), eq(ticketActivity.tenantId, tenantId)))
      .orderBy(asc(ticketActivity.createdAt));
  }

  async deleteTicket(id: string, tenantId: string): Promise<boolean> {
    const removed = await db
      .delete(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning({ id: tickets.id });
    return removed.length > 0;
  }

  // Employee operations - TENANT ISOLATED
  async createEmployee(employee: InsertEmployee, tenantId: string): Promise<Employee> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...employee, tenantId };
    if (insertData.dateOfBirth instanceof Date) {
      insertData.dateOfBirth = insertData.dateOfBirth.toISOString().split('T')[0];
    }
    if (insertData.hireDate instanceof Date) {
      insertData.hireDate = insertData.hireDate.toISOString().split('T')[0];
    }
    
    const [newEmployee] = await db
      .insert(employees)
      .values(insertData)
      .returning();

    // If a user is linked to this employee (via employeeId), sync the data
    // This handles cases where employee is created after user registration
    await this.syncEmployeeToUser(newEmployee.id);

    return newEmployee;
  }

  async getEmployee(id: string, tenantId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return employee;
  }

  async getEmployeeByNumber(employeeNumber: string, tenantId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(
        sql`LOWER(${employees.employeeNumber}) = LOWER(${employeeNumber})`,
        eq(employees.tenantId, tenantId)
      ));
    return employee;
  }

  async getEmployeeByEmail(email: string, tenantId: string): Promise<Employee | undefined> {
    if (!email) {
      console.log('[getEmployeeByEmail] No email provided');
      return undefined;
    }
    
    console.log('[getEmployeeByEmail] Looking up employee:', {
      email,
      tenantId,
    });
    
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(
        sql`LOWER(${employees.email}) = LOWER(${email})`,
        eq(employees.tenantId, tenantId)
      ));
    
    console.log('[getEmployeeByEmail] Query result:', {
      found: !!employee,
      employeeId: employee?.id,
      employeeEmail: employee?.email,
      companyId: employee?.companyId,
    });
    
    return employee;
  }

  async getEmployees(tenantId: string, companyId?: string): Promise<Employee[]> {
    const whereCondition = companyId
      ? and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId))
      : eq(employees.tenantId, tenantId);

    const results = await db
      .select({
        employee: employees,
        company: companies,
      })
      .from(employees)
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(whereCondition)
      .orderBy(desc(employees.createdAt));
    
    // Map results to include company as a property on each employee
    return results.map((row) => ({
      ...row.employee,
      company: row.company || null,
    })) as Employee[];
  }

  // Helper method to sync employee data to linked user account
  private async syncEmployeeToUser(employeeId: string): Promise<void> {
    try {
      // Find user linked to this employee
      const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
      
      if (!user) {
        // No linked user, nothing to sync
        return;
      }

      // Get the latest employee data
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
      
      if (!employee) {
        // Employee not found, skip sync
        return;
      }

      // Sync firstName, lastName, phoneNumber from employee to user
      const syncData: Partial<UpsertUser> = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        phoneNumber: employee.phoneNumber || null,
        updatedAt: new Date(),
      };

      await db
        .update(users)
        .set(syncData)
        .where(eq(users.id, user.id));
    } catch (error) {
      // Log error but don't fail the employee update
      console.error('Error syncing employee to user:', error);
    }
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>, tenantId: string): Promise<Employee> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...employee, updatedAt: new Date() };
    if (updateData.dateOfBirth instanceof Date) {
      updateData.dateOfBirth = updateData.dateOfBirth.toISOString().split('T')[0];
    }
    if (updateData.hireDate instanceof Date) {
      updateData.hireDate = updateData.hireDate.toISOString().split('T')[0];
    }
    
    const [updatedEmployee] = await db
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();
    if (!updatedEmployee) {
      throw new Error('Employee not found');
    }

    // Sync employee data to linked user if firstName, lastName, or phoneNumber changed
    if (employee.firstName !== undefined || employee.lastName !== undefined || employee.phoneNumber !== undefined) {
      await this.syncEmployeeToUser(id);
    }

    return updatedEmployee;
  }

  async deleteEmployee(id: string, tenantId: string): Promise<void> {
    const result = await db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();
    if (!result || result.length === 0) {
      throw new Error('Employee not found or does not belong to your tenant');
    }
  }

  async searchEmployees(query: string, tenantId: string): Promise<Employee[]> {
    if (!query || query.length < 1) return [];
    
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db.select({
      employee: employees,
      company: companies
    })
      .from(employees)
      .innerJoin(companies, eq(companies.id, employees.companyId))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.status, "active"),
          or(
            sql`LOWER(${employees.employeeNumber}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.firstName}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.lastName}::text) LIKE ${searchTerm}`,
            sql`LOWER(CONCAT(${employees.firstName}::text, ' ', ${employees.lastName}::text)) LIKE ${searchTerm}`,
            sql`LOWER(${employees.email}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.position}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.department}::text) LIKE ${searchTerm}`,
            // Support partial matches for employee numbers
            sql`${employees.employeeNumber} ILIKE ${'%' + query.toUpperCase() + '%'}`
          )
        )
      )
      .orderBy(employees.employeeNumber)
      .limit(20);
    
    return results.map(r => ({ ...r.employee, company: r.company }));
  }

  async searchPatientsEmployees(query: string, tenantId: string): Promise<any[]> {
    if (!query || query.length < 1) return [];
    
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db.select({
      patient: patients,
      employee: employees,
      company: companies
    })
      .from(patients)
      .innerJoin(employees, eq(employees.id, patients.employeeId))
      .innerJoin(companies, eq(companies.id, employees.companyId))
      .where(
        and(
          eq(patients.tenantId, tenantId),
          eq(patients.status, "active"),
          eq(employees.status, "active"),
          or(
            sql`LOWER(${employees.employeeNumber}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.firstName}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.lastName}::text) LIKE ${searchTerm}`,
            sql`LOWER(CONCAT(${employees.firstName}::text, ' ', ${employees.lastName}::text)) LIKE ${searchTerm}`,
            sql`LOWER(${employees.email}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.position}::text) LIKE ${searchTerm}`,
            sql`LOWER(${employees.department}::text) LIKE ${searchTerm}`,
            // Support partial matches for employee numbers
            sql`${employees.employeeNumber} ILIKE ${'%' + query.toUpperCase() + '%'}`
          )
        )
      )
      .orderBy(employees.employeeNumber)
      .limit(20);
    
    return results.map(r => ({ 
      patient: r.patient, 
      employee: r.employee, 
      company: r.company 
    }));
  }

  // Patient operations - TENANT ISOLATED
  async createPatient(patient: InsertPatient, tenantId: string): Promise<Patient> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const [newPatient] = await db
          .insert(patients)
          .values({ ...patient, tenantId })
          .returning();
        return newPatient;
      } catch (err) {
        const code = (err as { code?: string; cause?: { code?: string } }).code
          ?? (err as { cause?: { code?: string } }).cause?.code;
        const isDuplicatePatientId = code === "23505";
        if (!isDuplicatePatientId || attempt === maxAttempts - 1) {
          throw err;
        }
      }
    }
    throw new Error("Failed to allocate a unique patient id");
  }

  async getPatient(id: string, tenantId: string): Promise<any> {
    const [result] = await db
      .select({
        patient: patients,
        employee: employees,
        company: companies,
      })
      .from(patients)
      .leftJoin(employees, eq(patients.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)));
    return result;
  }

  async getPatientByEmployeeId(employeeId: string, tenantId: string): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.employeeId, employeeId), eq(patients.tenantId, tenantId)));
    return patient;
  }

  async getPatients(tenantId: string, limit = 50): Promise<Array<{ patient: Patient; employee: Employee | null; company: Company | null }>> {
    const results = await db
      .select({
        patient: patients,
        employee: employees,
        company: companies,
      })
      .from(patients)
      .leftJoin(employees, eq(patients.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(eq(patients.tenantId, tenantId))
      .orderBy(desc(patients.createdAt))
      .limit(limit);
    
    return results;
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>, tenantId: string): Promise<Patient> {
    const [updatedPatient] = await db
      .update(patients)
      .set({ ...patient, updatedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)))
      .returning();
    return updatedPatient;
  }

  async searchPatients(query: string, tenantId: string): Promise<Array<{ patient: Patient; employee: Employee | null; company: Company | null }>> {
    const results = await db
      .select({
        patient: patients,
        employee: employees,
        company: companies,
      })
      .from(patients)
      .leftJoin(employees, eq(patients.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(
        and(
          eq(patients.tenantId, tenantId),
          or(
            ilike(employees.firstName, `%${query}%`),
            ilike(employees.lastName, `%${query}%`),
            ilike(employees.employeeNumber, `%${query}%`),
            // Allow searching by patient ID as well (e.g. MA0005-26)
            ilike(patients.id, `%${query}%`)
          )
        )
      )
      .limit(20);
    
    return results;
  }

  // Appointment operations - TENANT ISOLATED
  async createAppointment(appointment: InsertAppointment, tenantId: string, userId?: string): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        ...appointment,
        tenantId,
        confirmationRequiredFrom: "patient",
      })
      .returning();
    
    // CRITICAL: Log appointment creation for compliance
    if (userId) {
      await this.auditBeforeOperation(
        'create',
        'appointment',
        newAppointment.id,
        userId,
        tenantId,
        null, // No original data for creation
        { createdData: newAppointment }
      );
    }
    
    return newAppointment;
  }

  async getAppointment(id: string, tenantId: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    return appointment;
  }

  async getAppointments(tenantId: string, employeeId?: string): Promise<Appointment[]> {
    const query = await db
      .select({
        appointment: appointments,
        employee: employees,
        customer: customers,
        medicalStaff: users,
      })
      .from(appointments)
      .leftJoin(employees, eq(appointments.employeeId, employees.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.medicalStaffId, users.id))
      .where(
        employeeId
          ? and(eq(appointments.tenantId, tenantId), eq(appointments.employeeId, employeeId))
          : eq(appointments.tenantId, tenantId)
      )
      .orderBy(desc(appointments.createdAt));

    return query.map(row => ({
      ...row.appointment,
      employee: row.employee,
      customer: row.customer,
      medicalStaff: row.medicalStaff,
    }));
  }

  async listAppointmentsPaginated(
    tenantId: string,
    filters: {
      employeeId?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      appointmentType?: string;
    } = {},
  ): Promise<{ rows: any[]; totalCount: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [eq(appointments.tenantId, tenantId)];

    if (filters.employeeId) {
      conditions.push(eq(appointments.employeeId, filters.employeeId));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(
          appointments.status,
          filters.status as (typeof appointments.status.enumValues)[number],
        ),
      );
    }
    if (filters.appointmentType && filters.appointmentType !== "all") {
      conditions.push(eq(appointments.appointmentType, filters.appointmentType));
    }

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(employees.firstName, pattern),
          ilike(employees.lastName, pattern),
          ilike(employees.employeeNumber, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: count() })
      .from(appointments)
      .leftJoin(employees, eq(appointments.employeeId, employees.id))
      .where(whereClause);

    const totalCount = Number(countRow?.count ?? 0);

    const results = await db
      .select({
        appointment: appointments,
        employee: employees,
        customer: customers,
        medicalStaff: users,
      })
      .from(appointments)
      .leftJoin(employees, eq(appointments.employeeId, employees.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.medicalStaffId, users.id))
      .where(whereClause)
      .orderBy(desc(appointments.createdAt))
      .limit(pageSize)
      .offset(offset);

    const rows = results.map((row) => ({
      ...row.appointment,
      employee: row.employee,
      customer: row.customer,
      medicalStaff: row.medicalStaff,
    }));

    return { rows, totalCount };
  }

  async getAppointmentsInRange(
    tenantId: string,
    start: Date,
    end: Date,
    employeeId?: string,
  ): Promise<Appointment[]> {
    const query = await db
      .select({
        appointment: appointments,
        employee: employees,
        customer: customers,
        medicalStaff: users,
      })
      .from(appointments)
      .leftJoin(employees, eq(appointments.employeeId, employees.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.medicalStaffId, users.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.appointmentDate, start),
          lte(appointments.appointmentDate, end),
          employeeId ? eq(appointments.employeeId, employeeId) : undefined,
        ),
      )
      .orderBy(desc(appointments.createdAt));

    return query.map(row => ({
      ...row.appointment,
      employee: row.employee,
      customer: row.customer,
      medicalStaff: row.medicalStaff,
    }));
  }

  async getTodayAppointments(tenantId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = await db
      .select({
        appointment: appointments,
        employee: employees,
        customer: customers,
        medicalStaff: users,
      })
      .from(appointments)
      .leftJoin(employees, eq(appointments.employeeId, employees.id))
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(users, eq(appointments.medicalStaffId, users.id))
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.appointmentDate, today),
          lte(appointments.appointmentDate, tomorrow)
        )
      )
      .orderBy(desc(appointments.createdAt));

    return query.map(row => ({
      ...row.appointment,
      employee: row.employee,
      customer: row.customer,
      medicalStaff: row.medicalStaff,
    }));
  }

  async updateAppointment(id: string, appointment: UpdateAppointment, tenantId: string, userId?: string): Promise<Appointment> {
    // CRITICAL: Fetch original data before update for compliance
    if (userId) {
      const originalAppointment = await this.getAppointment(id, tenantId);
      if (originalAppointment) {
        await this.auditBeforeOperation(
          'update',
          'appointment',
          id,
          userId,
          tenantId,
          originalAppointment,
          { updatedFields: Object.keys(appointment) }
        );
      }
    }
    
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: string, tenantId: string, userId?: string): Promise<void> {
    // CRITICAL: Fetch original data before deletion for compliance
    if (userId) {
      const originalAppointment = await this.getAppointment(id, tenantId);
      if (originalAppointment) {
        await this.auditBeforeOperation(
          'delete',
          'appointment',
          id,
          userId,
          tenantId,
          originalAppointment,
          { deletionReason: 'User requested deletion' }
        );
      }
    }
    
    await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
  }

  // Incident reports operations - TENANT ISOLATED
  async createIncidentReport(report: InsertIncidentReport, tenantId: string, userId?: string): Promise<IncidentReport> {
    const insertData: any = { ...report, tenantId };
    // Normalize lastMenstrualPeriod if provided
    if (insertData.lastMenstrualPeriod instanceof Date) {
      insertData.lastMenstrualPeriod = insertData.lastMenstrualPeriod.toISOString().split('T')[0];
    }

    const [newReport] = await db
      .insert(incidentReports)
      .values(insertData)
      .returning();
    
    // CRITICAL: Log incident report creation for compliance
    if (userId) {
      await this.auditBeforeOperation(
        'create',
        'incident_report',
        newReport.id,
        userId,
        tenantId,
        null, // No original data for creation
        { createdData: newReport }
      );
    }
    
    // Trigger notification (non-blocking, don't fail request on error)
    notifyIncidentCreated(this, newReport, tenantId).catch(err => {
      console.error('Failed to send incident notification:', err);
    });

    // Our People: auto-create a follow-up for post-incident recovery / RTW check
    if (userId) {
      const incidentDate = new Date(newReport.incidentDate);
      incidentDate.setDate(incidentDate.getDate() + 7);
      const scheduledDate: Date = incidentDate;
      try {
        const linkedPatient = await this.getPatientByEmployeeId(newReport.employeeId, tenantId);
        if (linkedPatient) {
          await this.createPatientFollowUp(tenantId, userId, {
            patientId: linkedPatient.id,
            locationId: newReport.locationId ?? undefined,
            careContext: "onsite",
            followUpType: "in_person",
            reason: "Post-incident recovery / return-to-work check",
            scheduledDate,
          });
        }
      } catch (fuErr) {
        console.error("Failed to create Our People follow-up for incident:", fuErr);
      }
    }

    return newReport;
  }

  async getIncidentReports(tenantId: string): Promise<IncidentReport[]> {
    const incidentReportsWithDetails = await db
      .select({
        incidentReport: incidentReports,
        employee: employees,
        company: companies,
        location: careLocations,
      })
      .from(incidentReports)
      .leftJoin(employees, eq(incidentReports.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
      .where(eq(incidentReports.tenantId, tenantId))
      .orderBy(desc(incidentReports.createdAt));

    return incidentReportsWithDetails.map(row => ({
      ...row.incidentReport,
      employee: row.employee
        ? {
            ...row.employee,
            company: row.company,
          }
        : undefined,
      location: row.location ? {
        id: row.location.id,
        locationName: row.location.locationName,
        locationCode: row.location.locationCode,
      } : null,
    }));
  }

  // CRITICAL: Missing method for audit logging
  async getIncidentReport(id: string, tenantId: string): Promise<IncidentReport | undefined> {
    const [incident] = await db
      .select()
      .from(incidentReports)
      .where(and(eq(incidentReports.id, id), eq(incidentReports.tenantId, tenantId)));
    return incident;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    // Only log in development to avoid exposing sensitive data
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Creating notification record: ${notification.title} via ${notification.channel}`);
    }
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Notification record created (status: ${newNotification.status})`);
    }
    return newNotification;
  }

  async getNotifications(userId: string, tenantId?: string): Promise<Notification[]> {
    const whereCondition = tenantId
      ? and(eq(notifications.recipientId, userId), eq(notifications.tenantId, tenantId))
      : eq(notifications.recipientId, userId);

    return await db
      .select()
      .from(notifications)
      .where(whereCondition)
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date(), status: "read" })
      .where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)));
  }

  async markAllNotificationsRead(
    userId: string,
    tenantId: string | undefined,
    filters?: { channel?: string }
  ): Promise<void> {
    const unreadCondition = or(isNull(notifications.readAt), ne(notifications.status, "read"));
    const parts = [eq(notifications.recipientId, userId), unreadCondition];
    if (tenantId) parts.push(eq(notifications.tenantId, tenantId));
    if (filters?.channel) parts.push(eq(notifications.channel, filters.channel));
    await db
      .update(notifications)
      .set({ readAt: new Date(), status: "read" })
      .where(and(...parts));
  }

  async markNotificationSent(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        status: "sent",
        sentAt: new Date() 
      })
      .where(eq(notifications.id, id));
  }

  // Our People - patient follow-ups (TENANT ISOLATED)
  async createPatientFollowUp(
    tenantId: string,
    userId: string,
    data: Omit<InsertPatientFollowUp, "tenantId">
  ): Promise<PatientFollowUp> {
    const insertData: any = {
      ...data,
      tenantId,
      createdBy: userId,
    };

    // Normalize dates if they came in as Date objects
    if (insertData.scheduledDate instanceof Date) {
      insertData.scheduledDate = insertData.scheduledDate.toISOString().split("T")[0];
    }
    if (insertData.dueByDate instanceof Date) {
      insertData.dueByDate = insertData.dueByDate.toISOString().split("T")[0];
    }
    if (insertData.nextFollowUpDate instanceof Date) {
      insertData.nextFollowUpDate = insertData.nextFollowUpDate.toISOString().split("T")[0];
    }
    if (insertData.externalReferralDate instanceof Date) {
      insertData.externalReferralDate = insertData.externalReferralDate.toISOString().split("T")[0];
    }

    const [followUp] = await db.insert(patientFollowUps).values(insertData).returning();
    return followUp;
  }

  async getPatientFollowUp(id: string, tenantId: string): Promise<PatientFollowUp | undefined> {
    const [row] = await db
      .select()
      .from(patientFollowUps)
      .where(and(eq(patientFollowUps.id, id), eq(patientFollowUps.tenantId, tenantId)));
    return row;
  }

  async listPatientFollowUps(
    tenantId: string,
    filters?: {
      patientId?: string;
      status?: string;
      careContext?: string;
      fromDate?: string;
      toDate?: string;
      locationId?: string;
      dueOnly?: boolean;
    }
  ): Promise<Array<{ followUp: PatientFollowUp; patient?: Patient | null; employee?: Employee | null; company?: Company | null; referralFacility?: ReferralFacility | null }>> {
    const whereClauses: SQL[] = [eq(patientFollowUps.tenantId, tenantId)];

    if (filters?.patientId) {
      whereClauses.push(eq(patientFollowUps.patientId, filters.patientId));
    }
    if (filters?.status) {
      whereClauses.push(eq(patientFollowUps.status, filters.status));
    }
    if (filters?.careContext) {
      whereClauses.push(eq(patientFollowUps.careContext, filters.careContext));
    }
    if (filters?.locationId) {
      // Show follow-ups explicitly at this location OR with no location set (legacy records)
      const locId = filters.locationId;
      if (locId) {
        const locExpr = or(
          eq(patientFollowUps.locationId, locId),
          isNull(patientFollowUps.locationId),
        );
        if (locExpr) whereClauses.push(locExpr);
      }
    }
    if (filters?.fromDate) {
      whereClauses.push(gte(patientFollowUps.scheduledDate, filters.fromDate));
    }
    if (filters?.toDate) {
      whereClauses.push(lte(patientFollowUps.scheduledDate, filters.toDate));
    }
    if (filters?.dueOnly) {
      const today = new Date();
      const todayIso = today.toISOString().split("T")[0];
      // Due = scheduled on or before today and not completed/cancelled
      whereClauses.push(lte(patientFollowUps.scheduledDate, todayIso));
      whereClauses.push(ne(patientFollowUps.status, "completed"));
      whereClauses.push(ne(patientFollowUps.status, "cancelled"));
    }

    const whereExpr = whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses);

    const rows = await db
      .select({
        followUp: patientFollowUps,
        patient: patients,
        employee: employees,
        company: companies,
        referralFacility: referralFacilities,
      })
      .from(patientFollowUps)
      .leftJoin(patients, eq(patientFollowUps.patientId, patients.id))
      .leftJoin(employees, eq(patients.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .leftJoin(referralFacilities, eq(patientFollowUps.externalReferralFacilityId, referralFacilities.id))
      .where(whereExpr)
      .orderBy(asc(patientFollowUps.scheduledDate), asc(patientFollowUps.scheduledTime));

    return rows.map((row) => ({
      followUp: row.followUp,
      patient: row.patient ?? null,
      employee: row.employee ?? null,
      company: row.company ?? null,
      referralFacility: row.referralFacility ?? null,
    }));
  }

  async updatePatientFollowUp(
    id: string,
    tenantId: string,
    data: Partial<InsertPatientFollowUp>
  ): Promise<PatientFollowUp> {
    const updateData: any = { ...data };

    if (updateData.scheduledDate instanceof Date) {
      updateData.scheduledDate = updateData.scheduledDate.toISOString().split("T")[0];
    }
    if (updateData.dueByDate instanceof Date) {
      updateData.dueByDate = updateData.dueByDate.toISOString().split("T")[0];
    }
    if (updateData.nextFollowUpDate instanceof Date) {
      updateData.nextFollowUpDate = updateData.nextFollowUpDate.toISOString().split("T")[0];
    }
    if (updateData.externalReferralDate instanceof Date) {
      updateData.externalReferralDate = updateData.externalReferralDate.toISOString().split("T")[0];
    }

    const [row] = await db
      .update(patientFollowUps)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(patientFollowUps.id, id), eq(patientFollowUps.tenantId, tenantId)))
      .returning();

    return row;
  }

  async deletePatientFollowUp(id: string, tenantId: string): Promise<void> {
    await db
      .delete(patientFollowUps)
      .where(and(eq(patientFollowUps.id, id), eq(patientFollowUps.tenantId, tenantId)));
  }

  async listCareLocationsForPublicFeedback(): Promise<Array<{ id: string; locationName: string; tenantId: string }>> {
    const rows = await db
      .select({
        id: careLocations.id,
        locationName: careLocations.locationName,
        tenantId: careLocations.tenantId,
      })
      .from(careLocations)
      .where(and(eq(careLocations.status, "active"), eq(careLocations.locationKind, "fixed_site")))
      .orderBy(asc(careLocations.locationName));
    return rows;
  }

  async getCareLocationByIdForPublic(
    id: string
  ): Promise<{ id: string; tenantId: string; locationName: string } | undefined> {
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(
        and(
          eq(careLocations.id, id),
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site")
        )
      );
    return row;
  }

  /** Find first active care location whose name matches (case-insensitive). Used for public feedback when form sends location name. */
  async getCareLocationByNameForPublic(
    locationName: string
  ): Promise<{ id: string; tenantId: string; locationName: string } | undefined> {
    const trimmed = locationName?.trim();
    if (!trimmed) return undefined;
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(
        and(
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site"),
          sql`LOWER(${careLocations.locationName}) = LOWER(${trimmed})`
        )
      )
      .limit(1);
    return row;
  }

  async getPublicFeedbackContext(tenantId?: string): Promise<{
    tenantId: string;
    tenantName: string;
    logoUrl: string | null;
    appName: string | null;
    locations: Array<{ id: string; name: string }>;
  } | null> {
    let tenant: Tenant | undefined;
    if (tenantId) {
      tenant = await this.getTenant(tenantId);
    } else {
      const [first] = await db
        .select()
        .from(tenants)
        .orderBy(asc(tenants.createdAt))
        .limit(1);
      tenant = first;
    }
    if (!tenant) return null;
    const locs = await this.getCareLocations(tenant.id, { locationKind: "fixed_site" });
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      logoUrl: tenant.logoUrl ?? null,
      appName: tenant.appName ?? null,
      locations: locs.map((l) => ({ id: l.id, name: l.locationName })),
    };
  }

  async getCareLocationByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<{ id: string; tenantId: string; locationName: string } | undefined> {
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(
        and(
          eq(careLocations.id, id),
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site")
        )
      );
    return row;
  }

  async getCareLocationByNameForTenant(
    name: string,
    tenantId: string
  ): Promise<{ id: string; tenantId: string; locationName: string } | undefined> {
    const trimmed = name?.trim();
    if (!trimmed) return undefined;
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(
        and(
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site"),
          sql`LOWER(${careLocations.locationName}) = LOWER(${trimmed})`
        )
      )
      .limit(1);
    return row;
  }

  async getFirstActiveCareLocationForTenant(
    tenantId: string
  ): Promise<{ id: string; tenantId: string; locationName: string } | undefined> {
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(
        and(
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.status, "active"),
          eq(careLocations.locationKind, "fixed_site")
        )
      )
      .orderBy(asc(careLocations.createdAt))
      .limit(1);
    return row;
  }

  async getFirstActiveCareLocationForPublic(): Promise<
    { id: string; tenantId: string; locationName: string } | undefined
  > {
    const [row] = await db
      .select({
        id: careLocations.id,
        tenantId: careLocations.tenantId,
        locationName: careLocations.locationName,
      })
      .from(careLocations)
      .where(and(eq(careLocations.status, "active"), eq(careLocations.locationKind, "fixed_site")))
      .orderBy(asc(careLocations.createdAt))
      .limit(1);
    return row;
  }

  async createEmployeeFeedback(
    tenantId: string,
    data: {
      locationId: string;
      anonymous: boolean;
      overallExperienceRating?: number | null;
      staffCourtesyRating?: number | null;
      waitTimeRating?: number | null;
      environmentCleanlinessRating?: number | null;
      explanationClarityRating?: number | null;
      perceivedSafetyRating?: number | null;
      wouldRecommend?: boolean | null;
      wouldReturn?: boolean | null;
      freeTextFeedback?: string | null;
      responses?: Record<string, unknown> | null;
    }
  ): Promise<EmployeeFeedback> {
    const [row] = await db
      .insert(employeeFeedback)
      .values({
        tenantId,
        locationId: data.locationId,
        anonymous: data.anonymous,
        feedbackType: "survey",
        overallExperienceRating: data.overallExperienceRating ?? null,
        staffCourtesyRating: data.staffCourtesyRating ?? null,
        waitTimeRating: data.waitTimeRating ?? null,
        environmentCleanlinessRating: data.environmentCleanlinessRating ?? null,
        explanationClarityRating: data.explanationClarityRating ?? null,
        perceivedSafetyRating: data.perceivedSafetyRating ?? null,
        wouldRecommend: data.wouldRecommend ?? null,
        wouldReturn: data.wouldReturn ?? null,
        freeTextFeedback: data.freeTextFeedback ?? null,
        responses: data.responses ?? null,
      })
      .returning();
    return row;
  }

  async listEmployeeFeedback(
    tenantId: string,
    filters?: { locationId?: string; status?: string; fromDate?: string; toDate?: string }
  ): Promise<Array<EmployeeFeedback & { location?: CareLocation | null }>> {
    const conditions: SQL[] = [eq(employeeFeedback.tenantId, tenantId)];
    if (filters?.locationId) conditions.push(eq(employeeFeedback.locationId, filters.locationId));
    if (filters?.status) conditions.push(eq(employeeFeedback.status, filters.status));
    if (filters?.fromDate) conditions.push(gte(employeeFeedback.feedbackDate, filters.fromDate));
    if (filters?.toDate) conditions.push(lte(employeeFeedback.feedbackDate, filters.toDate));
    const rows = await db
      .select({
        feedback: employeeFeedback,
        locationName: careLocations.locationName,
      })
      .from(employeeFeedback)
      .leftJoin(careLocations, eq(employeeFeedback.locationId, careLocations.id))
      .where(and(...conditions))
      .orderBy(desc(employeeFeedback.createdAt));
    return rows.map((r) => ({
      ...r.feedback,
      location: r.locationName
        ? { id: (r.feedback as any).locationId, locationName: r.locationName, tenantId } as CareLocation
        : null,
    })) as any;
  }

  async getEmployeeFeedback(
    id: string,
    tenantId: string
  ): Promise<(EmployeeFeedback & { location?: CareLocation | null }) | undefined> {
    const [row] = await db
      .select({
        feedback: employeeFeedback,
        locationName: careLocations.locationName,
      })
      .from(employeeFeedback)
      .leftJoin(careLocations, eq(employeeFeedback.locationId, careLocations.id))
      .where(and(eq(employeeFeedback.id, id), eq(employeeFeedback.tenantId, tenantId)));
    if (!row) return undefined;
    return {
      ...row.feedback,
      location: row.locationName
        ? ({ id: row.feedback.locationId, locationName: row.locationName, tenantId } as CareLocation)
        : null,
    } as any;
  }

  async updateEmployeeFeedback(
    id: string,
    tenantId: string,
    data: { status?: string; responseToFeedback?: string; reviewedBy?: string }
  ): Promise<EmployeeFeedback> {
    const updatePayload: any = { ...data };
    if (data.reviewedBy) updatePayload.reviewedAt = new Date();
    const [out] = await db
      .update(employeeFeedback)
      .set(updatePayload)
      .where(and(eq(employeeFeedback.id, id), eq(employeeFeedback.tenantId, tenantId)))
      .returning();
    if (!out) throw new Error("Employee feedback not found");
    return out;
  }

  // Our People - employee work fitness cases (TENANT ISOLATED)
  private normalizeDateField(value: Date | string | null | undefined): string | null | undefined {
    if (value == null) return value;
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return value;
  }

  private async loadMedicationsForCases(
    tenantId: string,
    caseIds: string[],
  ): Promise<Map<string, EmployeeWorkFitnessMedication[]>> {
    const map = new Map<string, EmployeeWorkFitnessMedication[]>();
    if (caseIds.length === 0) return map;
    const meds = await db
      .select()
      .from(employeeWorkFitnessMedications)
      .where(
        and(
          eq(employeeWorkFitnessMedications.tenantId, tenantId),
          inArray(employeeWorkFitnessMedications.caseId, caseIds),
        ),
      )
      .orderBy(asc(employeeWorkFitnessMedications.sortOrder), asc(employeeWorkFitnessMedications.createdAt));
    for (const med of meds) {
      const list = map.get(med.caseId) ?? [];
      list.push(med);
      map.set(med.caseId, list);
    }
    return map;
  }

  async createWorkFitnessCase(
    tenantId: string,
    userId: string | null,
    data: Omit<InsertEmployeeWorkFitnessCase, "tenantId" | "createdByUserId">,
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }> {
    const { medications, ...caseFields } = data;
    let employeeId = caseFields.employeeId;
    if (employeeId) {
      let employee = await this.getEmployee(employeeId, tenantId);
      if (!employee) {
        employee = await this.getEmployeeByNumber(employeeId, tenantId);
      }
      if (!employee) {
        throw new Error("Employee not found for supplied identifier.");
      }
      employeeId = employee.id;
    }

    return await db.transaction(async (tx) => {
      const [createdCase] = await tx
        .insert(employeeWorkFitnessCases)
        .values({
          ...caseFields,
          employeeId,
          tenantId,
          createdByUserId: userId ?? null,
          submittedByUserId: userId ?? null,
          restrictionStartDate: this.normalizeDateField(caseFields.restrictionStartDate as Date | string | null | undefined) as string | null | undefined,
          restrictionEndDate: this.normalizeDateField(caseFields.restrictionEndDate as Date | string | null | undefined) as string | null | undefined,
        })
        .returning();

      const medRows: EmployeeWorkFitnessMedication[] = [];
      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        const [row] = await tx
          .insert(employeeWorkFitnessMedications)
          .values({
            tenantId,
            caseId: createdCase.id,
            medicationName: med.medicationName.trim(),
            genericName: med.genericName?.trim() || null,
            strength: med.strength?.trim() || null,
            dosageForm: med.dosageForm?.trim() || null,
            route: med.route?.trim() || null,
            frequency: med.frequency?.trim() || null,
            prescribedFor: med.prescribedFor?.trim() || null,
            prescriberName: med.prescriberName?.trim() || null,
            prescriberFacility: med.prescriberFacility?.trim() || null,
            startDate: this.normalizeDateField(med.startDate) as string | null | undefined,
            expectedEndDate: this.normalizeDateField(med.expectedEndDate) as string | null | undefined,
            isOngoing: med.isOngoing ?? true,
            employeeSideEffects: med.employeeSideEffects?.trim() || null,
            employeeNoSideEffects: med.employeeNoSideEffects ?? false,
            clinicianMedicationNotes: med.clinicianMedicationNotes?.trim() || null,
            medicationImageUrl: med.medicationImageUrl?.trim() || null,
            sortOrder: med.sortOrder ?? i,
          })
          .returning();
        medRows.push(row);
      }

      return { ...createdCase, medications: medRows };
    });
  }

  async listWorkFitnessCases(
    tenantId: string,
    filters?: {
      employeeId?: string;
      locationId?: string;
      portalOnly?: boolean;
      status?: string;
      hasWorkImpact?: boolean;
    },
  ): Promise<Array<EmployeeWorkFitnessCase & { employee?: Employee | null; company?: Company | null; medications: EmployeeWorkFitnessMedication[] }>> {
    const whereClauses: SQL[] = [eq(employeeWorkFitnessCases.tenantId, tenantId)];

    if (filters?.employeeId) {
      whereClauses.push(eq(employeeWorkFitnessCases.employeeId, filters.employeeId));
    }
    if (filters?.portalOnly) {
      whereClauses.push(isNull(employeeWorkFitnessCases.locationId));
      whereClauses.push(eq(employeeWorkFitnessCases.submittedByEmployee, true));
    } else if (filters?.locationId) {
      whereClauses.push(eq(employeeWorkFitnessCases.locationId, filters.locationId));
    }
    if (filters?.status) {
      whereClauses.push(eq(employeeWorkFitnessCases.status, filters.status));
    }
    if (filters?.hasWorkImpact) {
      whereClauses.push(
        or(
          eq(employeeWorkFitnessCases.mayAffectDrugTest, true),
          eq(employeeWorkFitnessCases.fitnessOutcome, "cleared_with_restrictions"),
          eq(employeeWorkFitnessCases.fitnessOutcome, "not_cleared"),
          eq(employeeWorkFitnessCases.fitnessImpact, "temporary_restriction"),
          eq(employeeWorkFitnessCases.fitnessImpact, "light_duty"),
          eq(employeeWorkFitnessCases.fitnessImpact, "unfit_specific_task"),
          eq(employeeWorkFitnessCases.fitnessImpact, "unfit_duty"),
        )!,
      );
    }

    const whereExpr = whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses);
    const reviewer = alias(users, "wf_reviewer");

    const rows = await db
      .select({
        wfCase: employeeWorkFitnessCases,
        employee: employees,
        company: companies,
        reviewer,
      })
      .from(employeeWorkFitnessCases)
      .leftJoin(employees, eq(employeeWorkFitnessCases.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .leftJoin(reviewer, eq(employeeWorkFitnessCases.reviewedBy, reviewer.id))
      .where(whereExpr)
      .orderBy(desc(employeeWorkFitnessCases.submittedAt));

    const medsMap = await this.loadMedicationsForCases(
      tenantId,
      rows.map((r) => r.wfCase.id),
    );

    return rows.map((row) => ({
      ...row.wfCase,
      employee: row.employee ?? null,
      company: row.company ?? null,
      medications: medsMap.get(row.wfCase.id) ?? [],
      reviewedByUser: row.reviewer
        ? {
            id: row.reviewer.id,
            firstName: row.reviewer.firstName,
            lastName: row.reviewer.lastName,
          }
        : null,
    }));
  }

  async getWorkFitnessCase(
    id: string,
    tenantId: string,
  ): Promise<(EmployeeWorkFitnessCase & { employee?: Employee | null; company?: Company | null; medications: EmployeeWorkFitnessMedication[]; reviewedByUser?: { id: string; firstName: string | null; lastName: string | null } | null }) | undefined> {
    const reviewer = alias(users, "wf_reviewer");
    const [row] = await db
      .select({
        wfCase: employeeWorkFitnessCases,
        employee: employees,
        company: companies,
        reviewer,
      })
      .from(employeeWorkFitnessCases)
      .leftJoin(employees, eq(employeeWorkFitnessCases.employeeId, employees.id))
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .leftJoin(reviewer, eq(employeeWorkFitnessCases.reviewedBy, reviewer.id))
      .where(and(eq(employeeWorkFitnessCases.id, id), eq(employeeWorkFitnessCases.tenantId, tenantId)));

    if (!row) return undefined;
    const medsMap = await this.loadMedicationsForCases(tenantId, [id]);
    return {
      ...row.wfCase,
      employee: row.employee ?? null,
      company: row.company ?? null,
      medications: medsMap.get(id) ?? [],
      reviewedByUser: row.reviewer
        ? {
            id: row.reviewer.id,
            firstName: row.reviewer.firstName,
            lastName: row.reviewer.lastName,
          }
        : null,
    };
  }

  async updateWorkFitnessCase(
    id: string,
    tenantId: string,
    data: Partial<Omit<InsertEmployeeWorkFitnessCase, "medications">> & {
      medications?: Array<Partial<InsertEmployeeWorkFitnessMedication> & { id?: string; medicationName?: string }>;
    },
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }> {
    const { medications, ...caseFields } = data;
    const updateData: Record<string, unknown> = { ...caseFields, updatedAt: new Date() };
    if (caseFields.restrictionStartDate !== undefined) {
      updateData.restrictionStartDate = this.normalizeDateField(caseFields.restrictionStartDate as Date | string | null);
    }
    if (caseFields.restrictionEndDate !== undefined) {
      updateData.restrictionEndDate = this.normalizeDateField(caseFields.restrictionEndDate as Date | string | null);
    }

    return await db.transaction(async (tx) => {
      const [updatedCase] = await tx
        .update(employeeWorkFitnessCases)
        .set(updateData)
        .where(and(eq(employeeWorkFitnessCases.id, id), eq(employeeWorkFitnessCases.tenantId, tenantId)))
        .returning();

      if (!updatedCase) throw new Error("Work fitness case not found");

      if (medications) {
        await tx
          .delete(employeeWorkFitnessMedications)
          .where(and(eq(employeeWorkFitnessMedications.caseId, id), eq(employeeWorkFitnessMedications.tenantId, tenantId)));

        for (let i = 0; i < medications.length; i++) {
          const med = medications[i];
          if (!med.medicationName?.trim()) continue;
          await tx.insert(employeeWorkFitnessMedications).values({
            tenantId,
            caseId: id,
            medicationName: med.medicationName.trim(),
            genericName: med.genericName?.trim() || null,
            strength: med.strength?.trim() || null,
            dosageForm: med.dosageForm?.trim() || null,
            route: med.route?.trim() || null,
            frequency: med.frequency?.trim() || null,
            prescribedFor: med.prescribedFor?.trim() || null,
            prescriberName: med.prescriberName?.trim() || null,
            prescriberFacility: med.prescriberFacility?.trim() || null,
            startDate: this.normalizeDateField(med.startDate as Date | string | null | undefined) as string | null | undefined,
            expectedEndDate: this.normalizeDateField(med.expectedEndDate as Date | string | null | undefined) as string | null | undefined,
            isOngoing: med.isOngoing ?? true,
            employeeSideEffects: med.employeeSideEffects?.trim() || null,
            employeeNoSideEffects: med.employeeNoSideEffects ?? false,
            clinicianMedicationNotes: med.clinicianMedicationNotes?.trim() || null,
            medicationImageUrl: med.medicationImageUrl?.trim() || null,
            sortOrder: med.sortOrder ?? i,
          });
        }
      }

      const medsMap = await this.loadMedicationsForCases(tenantId, [id]);
      return { ...updatedCase, medications: medsMap.get(id) ?? [] };
    });
  }

  async assessWorkFitnessCase(
    id: string,
    tenantId: string,
    userId: string,
    data: {
      fitnessOutcome?: string;
      fitnessImpact?: string;
      workRestrictions?: string;
      restrictionStartDate?: string | Date | null;
      restrictionEndDate?: string | Date | null;
      clearedUnderground?: boolean;
      clearedHeavyMachinery?: boolean;
      mayAffectDrugTest?: boolean;
      drugTestDisclosureNotes?: string;
      assessmentNotes?: string;
      actionTaken?: string;
      actionNotes?: string;
      medicationNotes?: Array<{ id: string; clinicianMedicationNotes?: string | null }>;
    },
  ): Promise<EmployeeWorkFitnessCase & { medications: EmployeeWorkFitnessMedication[] }> {
    return await db.transaction(async (tx) => {
      const [updatedCase] = await tx
        .update(employeeWorkFitnessCases)
        .set({
          fitnessOutcome: data.fitnessOutcome,
          fitnessImpact: data.fitnessImpact,
          workRestrictions: data.workRestrictions,
          restrictionStartDate: this.normalizeDateField(data.restrictionStartDate) as string | null | undefined,
          restrictionEndDate: this.normalizeDateField(data.restrictionEndDate) as string | null | undefined,
          clearedUnderground: data.clearedUnderground,
          clearedHeavyMachinery: data.clearedHeavyMachinery,
          mayAffectDrugTest: data.mayAffectDrugTest,
          drugTestDisclosureNotes: data.drugTestDisclosureNotes,
          assessmentNotes: data.assessmentNotes,
          actionTaken: data.actionTaken,
          actionNotes: data.actionNotes,
          reviewedAt: new Date(),
          reviewedBy: userId,
          status: "assessed",
          updatedAt: new Date(),
        })
        .where(and(eq(employeeWorkFitnessCases.id, id), eq(employeeWorkFitnessCases.tenantId, tenantId)))
        .returning();

      if (!updatedCase) throw new Error("Work fitness case not found");

      if (data.medicationNotes?.length) {
        for (const note of data.medicationNotes) {
          await tx
            .update(employeeWorkFitnessMedications)
            .set({
              clinicianMedicationNotes: note.clinicianMedicationNotes?.trim() || null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(employeeWorkFitnessMedications.id, note.id),
                eq(employeeWorkFitnessMedications.caseId, id),
                eq(employeeWorkFitnessMedications.tenantId, tenantId),
              ),
            );
        }
      }

      const medsMap = await this.loadMedicationsForCases(tenantId, [id]);
      return { ...updatedCase, medications: medsMap.get(id) ?? [] };
    });
  }

  async deleteWorkFitnessCase(id: string, tenantId: string): Promise<void> {
    await db
      .delete(employeeWorkFitnessCases)
      .where(and(eq(employeeWorkFitnessCases.id, id), eq(employeeWorkFitnessCases.tenantId, tenantId)));
  }

  // Notification types operations
  async getNotificationTypes(category?: string): Promise<NotificationType[]> {
    const conditions: SQL[] = [];
    if (category) {
      conditions.push(eq(notificationTypes.category, category));
    }
    
    return await db
      .select()
      .from(notificationTypes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(notificationTypes.category, notificationTypes.displayName);
  }

  // User notification preferences operations
  async getNotificationPreferences(userId: string, tenantId: string): Promise<UserNotificationPreference[]> {
    return await db
      .select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId)
      ))
      .orderBy(userNotificationPreferences.notificationTypeId, userNotificationPreferences.channel);
  }

  async updateNotificationPreferences(
    userId: string, 
    tenantId: string, 
    preferences: Array<{ notificationTypeId: string; channel: string; enabled: boolean; minSeverity?: string | null }>
  ): Promise<void> {
    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      for (const pref of preferences) {
        await tx
          .insert(userNotificationPreferences)
          .values({
            tenantId,
            userId,
            notificationTypeId: pref.notificationTypeId,
            channel: pref.channel,
            enabled: pref.enabled,
            minSeverity: pref.minSeverity ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              userNotificationPreferences.tenantId,
              userNotificationPreferences.userId,
              userNotificationPreferences.notificationTypeId,
              userNotificationPreferences.channel,
            ],
            set: {
              enabled: pref.enabled,
              minSeverity: pref.minSeverity ?? null,
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async getUsersForNotificationType(
    tenantId: string, 
    notificationTypeKey: string, 
    severity?: string // Ignored - we send all notifications regardless of severity
  ): Promise<User[]> {
    console.log(`🔍 getUsersForNotificationType: Looking for users with preferences for "${notificationTypeKey}" in tenant ${tenantId}`);
    
    // Get notification type ID
    const [notificationType] = await db
      .select()
      .from(notificationTypes)
      .where(eq(notificationTypes.key, notificationTypeKey))
      .limit(1);
    
    if (!notificationType) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ❌ Notification type not found: ${notificationTypeKey}`);
      }
      return [];
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✓ Found notification type: ${notificationType.displayName}`);
    }

    // Get enabled preferences for this notification type (IGNORE severity - send all)
    const conditions: SQL[] = [
      eq(userNotificationPreferences.tenantId, tenantId),
      eq(userNotificationPreferences.notificationTypeId, notificationType.id),
      eq(userNotificationPreferences.enabled, true),
    ];

    // Debug: Check total preferences for this notification type (dev only)
    if (process.env.NODE_ENV === 'development') {
      const allPrefsForType = await db
        .select()
        .from(userNotificationPreferences)
        .where(and(
          eq(userNotificationPreferences.tenantId, tenantId),
          eq(userNotificationPreferences.notificationTypeId, notificationType.id)
        ));
      console.log(`   🔍 Total preferences for ${notificationTypeKey}: ${allPrefsForType.length} (enabled: ${allPrefsForType.filter(p => p.enabled).length})`);
    }

    const preferences = await db
      .select({
        userId: userNotificationPreferences.userId,
      })
      .from(userNotificationPreferences)
      .where(and(...conditions))
      .groupBy(userNotificationPreferences.userId);

    const userIds = Array.from(new Set(preferences.map(p => p.userId)));
    
    console.log(`   📊 Found ${preferences.length} preferences, ${userIds.length} unique users`);
    
    // If no users found with preferences, fall back to tenant admins for system-level reports
    if (userIds.length === 0) {
      // System-level notification types that should default to tenant admins
      const systemLevelTypes = ['equipment_health_report', 'maintenance_reminder_7days', 'follow_up_due'];
      
      if (systemLevelTypes.includes(notificationTypeKey)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`   ⚠️ No preferences found, falling back to tenant admins for ${notificationTypeKey}`);
        }
        // Fallback: Get all active tenant admins for this tenant
        const tenantAdmins = await db
          .select()
          .from(users)
          .where(and(
            eq(users.tenantId, tenantId),
            eq(users.role, 'admin'),
            eq(users.status, 'active')
          ));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`   ✅ Fallback: Found ${tenantAdmins.length} tenant admin(s) for ${notificationTypeKey}`);
        }
        return tenantAdmins;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ⚠️ No users found with enabled preferences for ${notificationTypeKey}`);
      }
      return [];
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(and(
        inArray(users.id, userIds),
        eq(users.tenantId, tenantId),
        eq(users.status, 'active')
      ));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✅ Found ${foundUsers.length} active users with preferences`);
    }
    return foundUsers;
  }

  async bulkUpdateNotificationPreferences(
    tenantId: string,
    userIds: string[],
    notificationTypeId: string,
    channel: string,
    enabled: boolean,
    minSeverity?: string | null,
    adminManaged?: boolean
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const userId of userIds) {
        await tx
          .insert(userNotificationPreferences)
          .values({
            tenantId,
            userId,
            notificationTypeId,
            channel,
            enabled,
            minSeverity: minSeverity ?? null,
            adminManaged: adminManaged ?? false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              userNotificationPreferences.tenantId,
              userNotificationPreferences.userId,
              userNotificationPreferences.notificationTypeId,
              userNotificationPreferences.channel,
            ],
            set: {
              enabled,
              minSeverity: minSeverity ?? null,
              adminManaged: adminManaged ?? false,
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async getDefaultPreferencesForRole(
    tenantId: string,
    role: string
  ): Promise<Partial<UserNotificationPreference>[]> {
    // Get all system-defined notification types
    const types = await db
      .select()
      .from(notificationTypes)
      .where(eq(notificationTypes.systemDefined, true));

    // Get preferences for a sample user with this role to determine defaults
    const [sampleUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.role, role as "staff" | "operations" | "fleet_operator" | "admin" | "super_admin"),
        eq(users.status, 'active')
      ))
      .limit(1);

    if (!sampleUser) {
      // Return empty preferences if no users with this role exist
      return [];
    }

    const preferences = await db
      .select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.userId, sampleUser.id)
      ));

    return preferences.map(p => ({
      notificationTypeId: p.notificationTypeId,
      channel: p.channel,
      enabled: p.enabled,
      minSeverity: p.minSeverity,
      adminManaged: p.adminManaged,
    }));
  }

  async createNotificationDeliveryLog(log: InsertNotificationDeliveryLog): Promise<NotificationDeliveryLog> {
    const [newLog] = await db
      .insert(notificationDeliveryLogs)
      .values(log)
      .returning();
    return newLog;
  }

  // Admin operations - TENANT ISOLATED
  async getPendingUsers(tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.status, "pending"), eq(users.tenantId, tenantId)))
      .orderBy(desc(users.createdAt));
  }

  async approveUser(userId: string, approvedBy: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status: "active",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: "pending" | "active" | "blocked" | "decommissioned", updatedBy: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status,
        approvedBy: updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Dashboard metrics - TENANT ISOLATED
  async getDashboardMetrics(tenantId: string): Promise<{
    activeCustomers: number;
    totalCustomers: number;
    todaySales: number;
    todayAppointments: number;
    pendingIncidents: number;
    completedAppointments: number;
    totalIncidents: number;
    openIncidents: number;
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    totalEmployees: number;
    activeEmployees: number;
    totalCompanies: number;
    activeCompanies: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.status, "active")));

    const [totalCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    const [todaySales] = await db
      .select({ count: count() })
      .from(posSales)
      .where(
        and(
          eq(posSales.tenantId, tenantId),
          eq(posSales.status, "completed"),
          gte(posSales.completedAt, today),
          lte(posSales.completedAt, tomorrow)
        )
      );

    const [todayAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          gte(appointments.appointmentDate, today),
          lte(appointments.appointmentDate, tomorrow)
        )
      );

    const [pendingIncidents] = await db
      .select({ count: count() })
      .from(incidentReports)
      .where(and(eq(incidentReports.tenantId, tenantId), eq(incidentReports.status, "open")));

    const [totalIncidents] = await db
      .select({ count: count() })
      .from(incidentReports)
      .where(eq(incidentReports.tenantId, tenantId));

    const [openIncidents] = await db
      .select({ count: count() })
      .from(incidentReports)
      .where(and(eq(incidentReports.tenantId, tenantId), eq(incidentReports.status, "open")));

    const [completedAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.status, "completed")));

    // User metrics
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const [activeUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.status, "active")));

    const [pendingUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.status, "pending")));

    // Employee metrics
    const [totalEmployees] = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.tenantId, tenantId));

    const [activeEmployees] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.status, "active")));

    // Company metrics
    const [totalCompanies] = await db
      .select({ count: count() })
      .from(companies)
      .where(eq(companies.tenantId, tenantId));

    const [activeCompanies] = await db
      .select({ count: count() })
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.status, "active")));

    return {
      activeCustomers: activeCustomers.count,
      totalCustomers: totalCustomers.count,
      todaySales: todaySales.count,
      todayAppointments: todayAppointments.count,
      pendingIncidents: pendingIncidents.count,
      completedAppointments: completedAppointments.count,
      totalIncidents: totalIncidents.count,
      openIncidents: openIncidents.count,
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      pendingUsers: pendingUsers.count,
      totalEmployees: totalEmployees.count,
      activeEmployees: activeEmployees.count,
      totalCompanies: totalCompanies.count,
      activeCompanies: activeCompanies.count,
    };
  }

  // Admin operations - TENANT ISOLATED
  async getAllUsers(tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(desc(users.createdAt));
  }

  async getActiveTenantUsersByRoles(
    tenantId: string,
    roles: Array<"admin" | "staff" | "operations" | "fleet_operator" | "super_admin">
  ): Promise<User[]> {
    if (roles.length === 0) return [];
    return await db
      .select()
      .from(users)
      .where(
        and(eq(users.tenantId, tenantId), eq(users.status, "active"), inArray(users.role, roles))
      );
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  // System feedback operations (global, not tenant-scoped)
  async createFeedback(input: Omit<InsertFeedback, "id" | "createdAt" | "updatedAt" | "status">): Promise<Feedback> {
    const [row] = await db
      .insert(feedback)
      .values({
        ...input,
      })
      .returning();
    return row;
  }

  async getAllFeedbackForAdmin(): Promise<Array<Feedback & { userEmail?: string | null; tenantName?: string | null }>> {
    const rows = await db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        tenantId: feedback.tenantId,
        path: feedback.path,
        context: feedback.context,
        kind: feedback.kind,
        uxRating: feedback.uxRating,
        uiRating: feedback.uiRating,
        navigationRating: feedback.navigationRating,
        speedRating: feedback.speedRating,
        reliabilityRating: feedback.reliabilityRating,
        npsScore: feedback.npsScore,
        areasUsed: feedback.areasUsed,
        comment: feedback.comment,
        contactEmail: feedback.contactEmail,
        status: feedback.status,
        adminNote: feedback.adminNote,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        userEmail: users.email,
        tenantName: tenants.name,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .leftJoin(tenants, eq(feedback.tenantId, tenants.id))
      .orderBy(desc(feedback.createdAt));

    return rows;
  }

  async updateFeedbackStatusAndNote(
    id: string,
    data: { status?: string; adminNote?: string }
  ): Promise<Feedback | undefined> {
    const validStatuses = ["new", "in_review", "resolved", "dismissed"] as const;
    type ValidStatus = typeof validStatuses[number];
    
    const update: Partial<InsertFeedback> & { 
      status?: ValidStatus; 
      adminNote?: string;
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };
    
    if (data.status && validStatuses.includes(data.status as ValidStatus)) {
      update.status = data.status as ValidStatus;
    }
    if (typeof data.adminNote === "string") {
      update.adminNote = data.adminNote;
    }

    const [row] = await db
      .update(feedback)
      .set(update)
      .where(eq(feedback.id, id))
      .returning();

    return row;
  }

  // Super Admin operations
  async getAllTenantsWithUserCounts(): Promise<Array<Tenant & { userCount: number }>> {
    // First get all tenants
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    
    // Then count users for each tenant
    const tenantsWithCounts = await Promise.all(
      allTenants.map(async (tenant) => {
        const [userCountResult] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.tenantId, tenant.id));
        
        return {
          ...tenant,
          userCount: userCountResult.count
        };
      })
    );

    return tenantsWithCounts;
  }

  async getAllUsersGroupedByTenant(): Promise<Array<{ tenant: Tenant; users: User[] }>> {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    
    const usersGroupedByTenant = await Promise.all(
      allTenants.map(async (tenant) => {
        const tenantUsers = await db
          .select()
          .from(users)
          .where(eq(users.tenantId, tenant.id))
          .orderBy(desc(users.createdAt));
        
        return {
          tenant,
          users: tenantUsers
        };
      })
    );

    return usersGroupedByTenant;
  }

  async approveTenantAdmin(adminId: string, approvedBy: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        status: "active",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, adminId))
      .returning();
    
    return updatedUser;
  }

  async getAllTenantAdmins(): Promise<Array<User & { tenantName: string }>> {
    const admins = await db
      .select({
        id: users.id,
        email: users.email,
        phoneNumber: users.phoneNumber,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        password: users.password,
        oauthIssuer: users.oauthIssuer,
        oauthSub: users.oauthSub,
        authProvider: users.authProvider,
        isEmailVerified: users.isEmailVerified,
        isPhoneVerified: users.isPhoneVerified,
        tenantId: users.tenantId,
        employeeId: users.employeeId,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        passwordResetToken: users.passwordResetToken,
        passwordResetExpires: users.passwordResetExpires,
        emailVerificationToken: users.emailVerificationToken,
        phoneVerificationCode: users.phoneVerificationCode,
        phoneVerificationExpires: users.phoneVerificationExpires,
        approvedBy: users.approvedBy,
        approvedAt: users.approvedAt,
        totpSecretEnc: users.totpSecretEnc,
        mfaEnabled: users.mfaEnabled,
        mfaBackupCodes: users.mfaBackupCodes,
        lastAcknowledgedReleaseVersion: users.lastAcknowledgedReleaseVersion,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        tenantName: tenants.name,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.lastLoginAt));

    return admins;
  }



  async updateTenantStatus(tenantId: string, status: string): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    return updatedTenant;
  }

  async updateTenantPlan(tenantId: string, planType: string): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({
        planType,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    return updatedTenant;
  }

  async getTenantAdmins(tenantId: string): Promise<User[]> {
    const admins = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, "admin")));

    return admins;
  }

  // Method to create dummy employees for all existing active users
  async createDummyEmployeesForExistingUsers(): Promise<Employee[]> {
    const activeUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.status, "active"),
        isNotNull(users.firstName),
        isNotNull(users.lastName),
        isNotNull(users.tenantId)
      ));

    const createdEmployees: Employee[] = [];

    for (const user of activeUsers) {
      try {
        // Get first company for this tenant
        const companyList = await db
          .select()
          .from(companies)
          .where(eq(companies.tenantId, user.tenantId!))
          .limit(1);

        if (companyList.length > 0) {
          // Generate employee number if not present
          let employeeNumber = user.employeeId;
          if (!employeeNumber) {
            const empCount = await db
              .select({ count: sql`count(*)` })
              .from(employees)
              .where(eq(employees.tenantId, user.tenantId!));
            
            const nextNum = parseInt(empCount[0].count as string) + 1;
            employeeNumber = `EMP${nextNum.toString().padStart(4, '0')}`;
            
            // Update user with employee number
            await db
              .update(users)
              .set({ employeeId: employeeNumber })
              .where(eq(users.id, user.id));
          }

          const [employee] = await db
            .insert(employees)
            .values({
              tenantId: user.tenantId!,
              companyId: companyList[0].id,
              employeeNumber,
              firstName: user.firstName!,
              lastName: user.lastName!,
              email: user.email,
              phoneNumber: user.phoneNumber,
              dateOfBirth: new Date('1990-01-01').toISOString().split('T')[0] as any,
              department: "administration" as const,
              position: user.role === "admin" ? "Administrator" : 
                       user.role === "staff" ? "Staff" :
                       user.role === "operations" ? "Operations" :
                       user.role === "fleet_operator" ? "Fleet operator" : "Staff",
              jobTitle: user.role === "admin" ? "Administrator" : 
                       user.role === "staff" ? "Staff" :
                       user.role === "operations" ? "Operations" :
                       user.role === "fleet_operator" ? "Fleet operator" : "Staff",
              hireDate: new Date().toISOString().split('T')[0] as any,
              emergencyContactName: "Emergency Contact",
              emergencyContactPhone: "000-000-0000",
              medicalClearance: user.role === "staff",
              status: "active",
              // createdAt and updatedAt have defaults, so don't set them explicitly
            })
            .onConflictDoNothing()
            .returning();

          if (employee) {
            createdEmployees.push(employee);
          }
        }
      } catch (error) {
        console.log(`Skipped user ${user.id} (${user.firstName} ${user.lastName}):`, error);
      }
    }

    return createdEmployees;
  }

  // Operational duties operations - TENANT ISOLATED
  async createOperationalDuty(duty: InsertOperationalDuty, tenantId: string, userId?: string): Promise<OperationalDuty> {
    const [newDuty] = await db
      .insert(operationalDuties)
      .values({ ...duty, tenantId })
      .returning();
    
    // CRITICAL: Log operational duty creation for compliance
    if (userId) {
      await this.auditBeforeOperation(
        'create',
        'operational_duty',
        newDuty.id,
        userId,
        tenantId,
        null, // No original data for creation
        { createdData: newDuty }
      );
    }
    
    return newDuty;
  }

  /** uventorybiz default duty catalog: new tenants get these; tenants can keep and add their own. */
  private static readonly DEFAULT_OPERATIONAL_DUTIES: Omit<InsertOperationalDuty, 'tenantId'>[] = [
    { title: 'Equipment Check', category: 'equipment', frequency: 'daily', priority: 'normal', estimatedDuration: 30, description: 'Routine equipment inspection and verification.' },
    { title: 'Ambulance Inspection', category: 'equipment', frequency: 'daily', priority: 'high', estimatedDuration: 45, description: 'Ambulance readiness and medical kit check.' },
    { title: 'Drug/Alcohol Test', category: 'safety', frequency: 'scheduled', priority: 'high', estimatedDuration: 60, description: 'Conduct drug and alcohol testing as per schedule.' },
    { title: 'Airport Stand-by', category: 'medical', frequency: 'scheduled', priority: 'normal', estimatedDuration: 120, description: 'Stand-by medical cover at airport as scheduled.' },
    { title: 'FAP/Clinic Review', category: 'medical', frequency: 'weekly', priority: 'normal', estimatedDuration: 60, description: 'First Aid Post / clinic review and restock.' },
    { title: 'FAP/Clinic Inspection', category: 'inspection', frequency: 'weekly', priority: 'normal', estimatedDuration: 45, description: 'Inspection of FAP/clinic facilities.' },
    { title: 'UG Refuge Chamber Inspection', category: 'safety', frequency: 'weekly', priority: 'high', estimatedDuration: 60, description: 'Underground refuge chamber inspection.' },
  ];

  /** Ensure tenant has default operational duties (uventorybiz catalog). Idempotent: only inserts if none exist. */
  private async ensureDefaultOperationalDuties(tenantId: string): Promise<void> {
    const existing = await db.select().from(operationalDuties).where(eq(operationalDuties.tenantId, tenantId)).limit(1);
    if (existing.length > 0) return;
    for (const duty of DatabaseStorage.DEFAULT_OPERATIONAL_DUTIES) {
      await db.insert(operationalDuties).values({ ...duty, tenantId });
    }
  }

  async getOperationalDuties(tenantId: string): Promise<OperationalDuty[]> {
    await this.ensureDefaultOperationalDuties(tenantId);
    return await db
      .select()
      .from(operationalDuties)
      .where(and(eq(operationalDuties.tenantId, tenantId), eq(operationalDuties.isActive, true)))
      .orderBy(operationalDuties.priority, operationalDuties.title);
  }

  // CRITICAL: Missing method for audit logging
  async getOperationalDuty(id: string, tenantId: string): Promise<OperationalDuty | undefined> {
    const [duty] = await db
      .select()
      .from(operationalDuties)
      .where(and(eq(operationalDuties.id, id), eq(operationalDuties.tenantId, tenantId)));
    return duty;
  }

  async updateOperationalDuty(id: string, duty: Partial<InsertOperationalDuty>, tenantId: string, userId?: string): Promise<OperationalDuty> {
    // CRITICAL: Fetch original data before update for compliance
    if (userId) {
      const originalDuty = await this.getOperationalDuty(id, tenantId);
      if (originalDuty) {
        await this.auditBeforeOperation(
          'update',
          'operational_duty',
          id,
          userId,
          tenantId,
          originalDuty,
          { updatedFields: Object.keys(duty) }
        );
      }
    }
    
    const [updatedDuty] = await db
      .update(operationalDuties)
      .set({ ...duty, updatedAt: new Date() })
      .where(and(eq(operationalDuties.id, id), eq(operationalDuties.tenantId, tenantId)))
      .returning();
    return updatedDuty;
  }

  async deleteOperationalDuty(id: string, tenantId: string, userId?: string): Promise<void> {
    // CRITICAL: Fetch original data before deletion for compliance
    if (userId) {
      const originalDuty = await this.getOperationalDuty(id, tenantId);
      if (originalDuty) {
        await this.auditBeforeOperation(
          'delete',
          'operational_duty',
          id,
          userId,
          tenantId,
          originalDuty,
          { reason: 'User requested deletion (soft delete - marked inactive)' }
        );
      }
    }
    
    await db
      .update(operationalDuties)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(operationalDuties.id, id), eq(operationalDuties.tenantId, tenantId)));
  }

  // Duty assignments operations - TENANT ISOLATED
  async createDutyAssignment(assignment: InsertDutyAssignment, tenantId: string, userId?: string): Promise<DutyAssignment> {
    const [newAssignment] = await db
      .insert(operationalDutyAssignments)
      .values({ ...assignment, tenantId })
      .returning();
    
    // CRITICAL: Log duty assignment creation for compliance
    if (userId) {
      await this.auditBeforeOperation(
        'create',
        'duty_assignment',
        newAssignment.id,
        userId,
        tenantId,
        null, // No original data for creation
        { createdData: newAssignment }
      );
    }
    
    return newAssignment;
  }

  async getDutyAssignments(tenantId: string, date?: Date, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const conditions = [eq(operationalDutyAssignments.tenantId, tenantId)];
    if (status === "overdue") {
      conditions.push(eq(operationalDutyAssignments.status, "pending"));
      conditions.push(lt(operationalDutyAssignments.assignmentDate, startOfToday));
    } else {
      conditions.push(gte(operationalDutyAssignments.assignmentDate, startOfDay));
      conditions.push(lte(operationalDutyAssignments.assignmentDate, endOfDay));
      if (status && String(status).trim()) {
        conditions.push(eq(operationalDutyAssignments.status, String(status).trim()));
      }
    }
    if (locationId && String(locationId).trim()) {
      conditions.push(eq(operationalDutyAssignments.locationId, String(locationId).trim()));
    }
    if (userId && String(userId).trim()) {
      conditions.push(or(
        eq(operationalDutyAssignments.assignedToId, String(userId).trim()),
        eq(operationalDutyAssignments.completedById, String(userId).trim()),
        eq(operationalDutyAssignments.cancelledById, String(userId).trim())
      ) as any);
    }

    const assignments = await db
      .select({
        assignment: operationalDutyAssignments,
        duty: operationalDuties,
        assignedTo: users,
      })
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDutyAssignments.dutyId, operationalDuties.id))
      .leftJoin(users, eq(operationalDutyAssignments.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(operationalDutyAssignments.assignmentDate);

    // Fetch completed by user info separately for each assignment; map pending past-due to "overdue" for display
    const assignmentsWithCompletedBy = await Promise.all(
      assignments.map(async (row) => {
        let completedBy = null;
        if (row.assignment.completedById) {
          completedBy = await this.getUserById(row.assignment.completedById);
        }
        const displayStatus = row.assignment.status === "pending" && new Date(row.assignment.assignmentDate) < startOfToday ? "overdue" : row.assignment.status;
        return {
          ...row.assignment,
          status: displayStatus,
          duty: row.duty,
          assignedTo: row.assignedTo,
          completedBy,
        };
      })
    );

    return assignmentsWithCompletedBy;
  }

  async getDutyAssignmentsByDateRange(tenantId: string, fromDate: Date, toDate: Date, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]> {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const conditions = [
      eq(operationalDutyAssignments.tenantId, tenantId),
      gte(operationalDutyAssignments.assignmentDate, start),
      lte(operationalDutyAssignments.assignmentDate, end),
    ];
    if (locationId && String(locationId).trim()) {
      conditions.push(eq(operationalDutyAssignments.locationId, String(locationId).trim()));
    }
    if (status && String(status).trim()) {
      if (status === "overdue") {
        conditions.push(eq(operationalDutyAssignments.status, "pending"));
        conditions.push(lt(operationalDutyAssignments.assignmentDate, startOfToday));
      } else {
        conditions.push(eq(operationalDutyAssignments.status, String(status).trim()));
      }
    }
    if (userId && String(userId).trim()) {
      conditions.push(or(
        eq(operationalDutyAssignments.assignedToId, String(userId).trim()),
        eq(operationalDutyAssignments.completedById, String(userId).trim()),
        eq(operationalDutyAssignments.cancelledById, String(userId).trim())
      ) as any);
    }

    const assignments = await db
      .select({
        assignment: operationalDutyAssignments,
        duty: operationalDuties,
        assignedTo: users,
      })
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDutyAssignments.dutyId, operationalDuties.id))
      .leftJoin(users, eq(operationalDutyAssignments.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(operationalDutyAssignments.assignmentDate);

    const assignmentsWithCompletedBy = await Promise.all(
      assignments.map(async (row) => {
        let completedBy = null;
        if (row.assignment.completedById) {
          completedBy = await this.getUserById(row.assignment.completedById);
        }
        const displayStatus = row.assignment.status === "pending" && new Date(row.assignment.assignmentDate) < startOfToday ? "overdue" : row.assignment.status;
        return {
          ...row.assignment,
          status: displayStatus,
          duty: row.duty,
          assignedTo: row.assignedTo,
          completedBy,
        };
      })
    );

    return assignmentsWithCompletedBy;
  }

  async getTodayDutyAssignments(tenantId: string, locationId?: string, status?: string, userId?: string): Promise<DutyAssignment[]> {
    if (status === "overdue") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const conditions = [
        eq(operationalDutyAssignments.tenantId, tenantId),
        eq(operationalDutyAssignments.status, "pending"),
        lt(operationalDutyAssignments.assignmentDate, startOfToday),
      ];
      if (locationId && String(locationId).trim()) {
        conditions.push(eq(operationalDutyAssignments.locationId, String(locationId).trim()));
      }
      if (userId && String(userId).trim()) {
        conditions.push(or(
          eq(operationalDutyAssignments.assignedToId, String(userId).trim()),
          eq(operationalDutyAssignments.completedById, String(userId).trim()),
          eq(operationalDutyAssignments.cancelledById, String(userId).trim())
        ) as any);
      }
      const assignments = await db
        .select({
          assignment: operationalDutyAssignments,
          duty: operationalDuties,
          assignedTo: users,
        })
        .from(operationalDutyAssignments)
        .innerJoin(operationalDuties, eq(operationalDutyAssignments.dutyId, operationalDuties.id))
        .leftJoin(users, eq(operationalDutyAssignments.assignedToId, users.id))
        .where(and(...conditions))
        .orderBy(operationalDutyAssignments.assignmentDate);
      const withCompletedBy = await Promise.all(
        assignments.map(async (row) => {
          let completedBy = null;
          if (row.assignment.completedById) {
            completedBy = await this.getUserById(row.assignment.completedById);
          }
          return {
            ...row.assignment,
            status: "overdue",
            duty: row.duty,
            assignedTo: row.assignedTo,
            completedBy,
          };
        })
      );
      return withCompletedBy;
    }
    return this.getDutyAssignments(tenantId, new Date(), locationId, status, userId);
  }

  // CRITICAL: Missing method for audit logging
  async getDutyAssignment(id: string, tenantId: string): Promise<DutyAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(operationalDutyAssignments)
      .where(and(eq(operationalDutyAssignments.id, id), eq(operationalDutyAssignments.tenantId, tenantId)));
    return assignment;
  }

  async updateDutyAssignment(id: string, assignment: Partial<InsertDutyAssignment>, tenantId: string, userId?: string): Promise<DutyAssignment> {
    // CRITICAL: Fetch original data before update for compliance
    if (userId) {
      const originalAssignment = await this.getDutyAssignment(id, tenantId);
      if (originalAssignment) {
        await this.auditBeforeOperation(
          'update',
          'duty_assignment',
          id,
          userId,
          tenantId,
          originalAssignment,
          { updatedFields: Object.keys(assignment) }
        );
      }
    }
    
    const [updatedAssignment] = await db
      .update(operationalDutyAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(and(eq(operationalDutyAssignments.id, id), eq(operationalDutyAssignments.tenantId, tenantId)))
      .returning();
    return updatedAssignment;
  }

  async completeDutyAssignment(assignmentId: string, completedById: string, tenantId: string, notes?: string, startedAt?: Date | null, locationId?: string): Promise<DutyAssignment> {
    // CRITICAL: Fetch original data before completion for compliance
    const originalAssignment = await this.getDutyAssignment(assignmentId, tenantId);
    if (originalAssignment) {
      await this.auditBeforeOperation(
        'complete',
        'duty_assignment',
        assignmentId,
        completedById,
        tenantId,
        originalAssignment,
        { action: 'marked as completed', notes: notes }
      );
    }

    const setPayload: Record<string, unknown> = {
      status: "completed",
      completedAt: new Date(),
      completedById: completedById,
      startedAt: startedAt || null,
      notes: notes ?? undefined,
      updatedAt: new Date(),
    };
    if (locationId != null && locationId !== '') {
      setPayload.locationId = locationId;
    }
    
    const [updatedAssignment] = await db
      .update(operationalDutyAssignments)
      .set(setPayload as Partial<typeof operationalDutyAssignments.$inferInsert>)
      .where(and(eq(operationalDutyAssignments.id, assignmentId), eq(operationalDutyAssignments.tenantId, tenantId)))
      .returning();
    return updatedAssignment;
  }

  // Cancel duty assignment - TENANT ISOLATED
  async cancelDutyAssignment(assignmentId: string, cancelledById: string, tenantId: string, cancellationReason?: string): Promise<DutyAssignment> {
    // CRITICAL: Fetch original data before cancellation for compliance
    const originalAssignment = await this.getDutyAssignment(assignmentId, tenantId);
    if (originalAssignment) {
      await this.auditBeforeOperation(
        'cancel',
        'duty_assignment',
        assignmentId,
        cancelledById,
        tenantId,
        originalAssignment,
        { action: 'marked as cancelled', cancellationReason: cancellationReason }
      );
    }
    
    const [updatedAssignment] = await db
      .update(operationalDutyAssignments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledById: cancelledById,
        cancellationReason: cancellationReason,
        updatedAt: new Date(),
      })
      .where(and(eq(operationalDutyAssignments.id, assignmentId), eq(operationalDutyAssignments.tenantId, tenantId)))
      .returning();
    return updatedAssignment;
  }

  // Delete duty assignment - TENANT ISOLATED
  async deleteDutyAssignment(assignmentId: string, tenantId: string, userId?: string): Promise<void> {
    // CRITICAL: Fetch original data before deletion for compliance
    if (userId) {
      const originalAssignment = await this.getDutyAssignment(assignmentId, tenantId);
      if (originalAssignment) {
        await this.auditBeforeOperation(
          'delete',
          'duty_assignment',
          assignmentId,
          userId,
          tenantId,
          originalAssignment,
          { reason: 'User requested deletion' }
        );
      }
    }
    
    await db.delete(operationalDutyAssignments)
      .where(and(
        eq(operationalDutyAssignments.id, assignmentId),
        eq(operationalDutyAssignments.tenantId, tenantId)
      ));
  }

  /**
   * Spawner pattern: create duty assignment instances for a given date from active duties
   * whose schedule includes that weekday. One assignment per (duty, location, shift) to avoid
   * duplicates. Manual assignments remain separate; both show in "Today's Tasks".
   */
  async spawnDutyAssignmentsForDate(tenantId: string, date: Date): Promise<{ spawned: number }> {
    const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayIndex = date.getDay();
    const todayWeekday = WEEKDAYS[dayIndex];
    const dateStr = date.toISOString().slice(0, 10);
    console.log(`[DutySpawner] Starting for tenant ${tenantId}, date ${dateStr} (${todayWeekday})`);

    function parseScheduleForWeekday(scheduledDays: string | null | undefined, defaultTime: string): Array<{ shift: string }> {
      if (!scheduledDays || !String(scheduledDays).trim()) return [];
      try {
        const arr = JSON.parse(scheduledDays);
        if (!Array.isArray(arr) || arr.length === 0) return [];
        const defaultHour = parseInt(defaultTime.slice(0, 2), 10) || 8;
        const timeToShift = (hour: number): string => {
          // Morning: 06:00–17:59, Night: 18:00–05:59
          if (hour >= 6 && hour < 18) return 'day';
          return 'night';
        };
        const out: Array<{ shift: string }> = [];
        const seen = new Set<string>();
        for (const entry of arr) {
          let day: string;
          let hour: number;
          if (entry && typeof entry === 'object' && 'day' in entry && 'time' in entry) {
            day = String(entry.day).toLowerCase();
            const t = String(entry.time || defaultTime).trim();
            hour = parseInt(t.slice(0, 2), 10) || defaultHour;
          } else if (typeof entry === 'string') {
            day = String(entry).toLowerCase();
            hour = defaultHour;
          } else {
            continue;
          }
          if (day !== todayWeekday) continue;
          const shift = timeToShift(hour);
          const key = shift;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ shift });
        }
        return out;
      } catch {
        return [];
      }
    }

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    let activeDuties: typeof operationalDuties.$inferSelect[];
    let locations: Awaited<ReturnType<typeof this.getCareLocations>>;
    let existingRows: { dutyId: string; locationId: string | null; shift: string }[];
    try {
      [activeDuties, locations, existingRows] = await Promise.all([
        db.select().from(operationalDuties).where(and(eq(operationalDuties.tenantId, tenantId), eq(operationalDuties.isActive, true))),
        this.getCareLocations(tenantId, { includeInactive: false }),
        db.select({ dutyId: operationalDutyAssignments.dutyId, locationId: operationalDutyAssignments.locationId, shift: operationalDutyAssignments.shift })
          .from(operationalDutyAssignments)
          .where(and(
            eq(operationalDutyAssignments.tenantId, tenantId),
            gte(operationalDutyAssignments.assignmentDate, startOfDay),
            lte(operationalDutyAssignments.assignmentDate, endOfDay)
          )),
      ]);
    } catch (err) {
      console.error(`[DutySpawner] FAILED for tenant ${tenantId}, date ${dateStr}:`, err);
      throw err;
    }
    console.log(`[DutySpawner] Tenant ${tenantId}: ${activeDuties.length} active duties, ${locations.length} locations, ${existingRows.length} existing assignments for ${dateStr}`);

    const existingSet = new Set(existingRows.map((r) => `${r.dutyId}|${r.locationId ?? ''}|${r.shift}`));
    let spawned = 0;

    const timeToShift = (hour: number): string => {
      // Morning: 06:00–17:59, Night: 18:00–05:59
      if (hour >= 6 && hour < 18) return 'day';
      return 'night';
    };

    for (const duty of activeDuties) {
      const defaultTime = (duty.scheduledTime && String(duty.scheduledTime).trim()) || '08:00';
      let shiftsForToday: Array<{ shift: string }>;
      if (duty.frequency === 'daily') {
        const hour = parseInt(defaultTime.slice(0, 2), 10) || 8;
        shiftsForToday = [{ shift: timeToShift(hour) }];
      } else {
        shiftsForToday = parseScheduleForWeekday(duty.scheduledDays, defaultTime);
      }
      if (shiftsForToday.length === 0) continue;

      for (const loc of locations) {
        for (const { shift } of shiftsForToday) {
          const key = `${duty.id}|${loc.id}|${shift}`;
          if (existingSet.has(key)) continue;
          await db.insert(operationalDutyAssignments).values({
            tenantId,
            dutyId: duty.id,
            locationId: loc.id,
            assignmentDate: startOfDay,
            shift,
            status: 'pending',
            assignedToId: null,
          });
          existingSet.add(key);
          spawned++;
        }
      }
    }

    if (spawned > 0) {
      console.log(`[DutySpawner] SUCCESS tenant ${tenantId}, date ${dateStr}: spawned ${spawned} assignment(s)`);
    } else {
      console.log(`[DutySpawner] Tenant ${tenantId}, date ${dateStr}: no new assignments (0 spawned; schedule may have no ${todayWeekday} or all already exist)`);
    }
    return { spawned };
  }

  // Get duty assignment history with filtering - TENANT ISOLATED
  async getDutyAssignmentHistory(
    tenantId: string,
    filters: {
      date?: string;
      status?: string;
      userId?: string;
      locationId?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    } = {},
  ): Promise<{ rows: any[]; totalCount: number }> {
    const conditions = [eq(operationalDutyAssignments.tenantId, tenantId)];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(operationalDutyAssignments.assignmentDate, startOfDay));
      conditions.push(lte(operationalDutyAssignments.assignmentDate, endOfDay));
    }

    if (filters.status) {
      if (filters.status === "overdue") {
        conditions.push(eq(operationalDutyAssignments.status, "pending"));
        conditions.push(lt(operationalDutyAssignments.assignmentDate, startOfToday));
      } else {
        conditions.push(eq(operationalDutyAssignments.status, filters.status));
      }
    }

    if (filters.locationId) {
      conditions.push(eq(operationalDutyAssignments.locationId, filters.locationId));
    }

    if (filters.userId) {
      const userIdCondition = or(
        eq(operationalDutyAssignments.assignedToId, filters.userId),
        eq(operationalDutyAssignments.completedById, filters.userId),
        eq(operationalDutyAssignments.cancelledById, filters.userId),
      );
      if (userIdCondition) {
        conditions.push(userIdCondition);
      }
    }

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(operationalDuties.title, pattern),
          ilike(operationalDuties.category, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);
    const usePagination = filters.page !== undefined;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const [countRow] = await db
      .select({ count: count() })
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDutyAssignments.dutyId, operationalDuties.id))
      .leftJoin(users, eq(operationalDutyAssignments.assignedToId, users.id))
      .where(whereClause);
    const totalCount = Number(countRow?.count ?? 0);

    let query = db
      .select()
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDutyAssignments.dutyId, operationalDuties.id))
      .leftJoin(users, eq(operationalDutyAssignments.assignedToId, users.id))
      .where(whereClause)
      .orderBy(desc(operationalDutyAssignments.assignmentDate));

    if (usePagination) {
      query = query.limit(pageSize).offset(offset) as typeof query;
    }

    const results = await query;

    const rows = await Promise.all(
      results.map(async (row) => {
        const completedBy = row.operational_duty_assignments.completedById
          ? await this.getUserById(row.operational_duty_assignments.completedById)
          : null;
        const cancelledBy = row.operational_duty_assignments.cancelledById
          ? await this.getUserById(row.operational_duty_assignments.cancelledById)
          : null;
        const rawStatus = row.operational_duty_assignments.status;
        const displayStatus =
          rawStatus === "pending" && new Date(row.operational_duty_assignments.assignmentDate) < startOfToday
            ? "overdue"
            : rawStatus;
        return {
          id: row.operational_duty_assignments.id,
          locationId: row.operational_duty_assignments.locationId ?? undefined,
          status: displayStatus,
          assignmentDate: row.operational_duty_assignments.assignmentDate,
          shift: row.operational_duty_assignments.shift,
          completedAt: row.operational_duty_assignments.completedAt,
          cancelledAt: row.operational_duty_assignments.cancelledAt,
          startedAt: row.operational_duty_assignments.startedAt,
          notes: row.operational_duty_assignments.notes,
          cancellationReason: row.operational_duty_assignments.cancellationReason,
          duty: {
            id: row.operational_duties.id,
            title: row.operational_duties.title,
            category: row.operational_duties.category,
            priority: row.operational_duties.priority,
          },
          assignedTo: row.users
            ? {
                id: row.users.id,
                firstName: row.users.firstName,
                lastName: row.users.lastName,
              }
            : null,
          completedBy,
          cancelledBy,
        };
      }),
    );

    return { rows, totalCount };
  }

  // Get duty assignment analytics - TENANT ISOLATED
  async getDutyAssignmentAnalytics(tenantId: string, filters: { date?: string; locationId?: string }): Promise<any> {
    const conditions = [eq(operationalDutyAssignments.tenantId, tenantId)];

    if (filters.locationId) {
      conditions.push(eq(operationalDutyAssignments.locationId, filters.locationId));
    }

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(operationalDutyAssignments.assignmentDate, startOfDay));
      conditions.push(lte(operationalDutyAssignments.assignmentDate, endOfDay));
    }

    const assignments = await db
      .select()
      .from(operationalDutyAssignments)
      .where(and(...conditions));

    const totalAssignments = assignments.length;
    const completedCount = assignments.filter(a => a.status === 'completed').length;
    const cancelledCount = assignments.filter(a => a.status === 'cancelled').length;
    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const completionRate = totalAssignments > 0 ? (completedCount / totalAssignments) * 100 : 0;

    // Calculate average completion time for completed assignments
    const completedWithDuration = assignments.filter(a => 
      a.status === 'completed' && a.startedAt && a.completedAt
    );
    
    const avgCompletionTime = completedWithDuration.length > 0 
      ? completedWithDuration.reduce((sum, assignment) => {
          const duration = new Date(assignment.completedAt!).getTime() - new Date(assignment.startedAt!).getTime();
          return sum + duration;
        }, 0) / completedWithDuration.length / (1000 * 60) // Convert to minutes
      : 0;

    return {
      totalAssignments,
      completedCount,
      cancelledCount,
      pendingCount,
      completionRate,
      avgCompletionTime: Math.round(avgCompletionTime),
    };
  }

  // Duty completions operations - TENANT ISOLATED
  async createDutyCompletion(completion: InsertDutyCompletion, tenantId: string): Promise<DutyCompletion> {
    const [newCompletion] = await db
      .insert(operationalDutyCompletions)
      .values({ ...completion, tenantId })
      .returning();
    return newCompletion;
  }

  async getDutyCompletions(tenantId: string, date?: Date): Promise<DutyCompletion[]> {
    let whereCondition: SQL<unknown> = eq(operationalDutyCompletions.tenantId, tenantId);
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereCondition = and(
        whereCondition,
        gte(operationalDutyCompletions.completedAt, startOfDay),
        lte(operationalDutyCompletions.completedAt, endOfDay)
      ) as SQL<unknown>;
    }

    const completions = await db
      .select({
        completion: operationalDutyCompletions,
        duty: operationalDuties,
        completedBy: users,
      })
      .from(operationalDutyCompletions)
      .innerJoin(operationalDuties, eq(operationalDutyCompletions.dutyId, operationalDuties.id))
      .innerJoin(users, eq(operationalDutyCompletions.completedById, users.id))
      .where(whereCondition)
      .orderBy(desc(operationalDutyCompletions.completedAt));

    return completions.map(row => ({
      ...row.completion,
      duty: row.duty,
      completedBy: row.completedBy,
    }));
  }

  async getDutyCompletionsByAssignment(assignmentId: string, tenantId: string): Promise<DutyCompletion[]> {
    return await db
      .select()
      .from(operationalDutyCompletions)
      .where(and(
        eq(operationalDutyCompletions.assignmentId, assignmentId),
        eq(operationalDutyCompletions.tenantId, tenantId)
      ))
      .orderBy(desc(operationalDutyCompletions.completedAt));
  }

  // Audit logging operations - TENANT ISOLATED
  async createAuditLog(auditLog: InsertAuditLog, tenantId: string): Promise<AuditLog> {
    const [newAuditLog] = await db
      .insert(auditLogs)
      .values({ ...auditLog, tenantId })
      .returning();
    return newAuditLog;
  }

  // Helper method to audit data before operations - CRITICAL for compliance
  async auditBeforeOperation(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    tenantId: string,
    originalData: any,
    details?: any
  ): Promise<void> {
    try {
      const ctx = getAuditContext();
      const impId = ctx?.impersonatorUserId;
      const mergedDetails =
        impId
          ? { ...(details ?? {}), impersonation: { impersonatorUserId: impId } }
          : details;
      await this.createAuditLog({
        action,
        resourceType,
        resourceId,
        userId,
        originalData,
        details: mergedDetails,
      }, tenantId);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to avoid blocking operations, but log the failure
    }
  }

  // Helper method for admin operations audit logging - CRITICAL for admin compliance
  async auditAdminOperation(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    tenantId: string,
    originalData: any,
    newData: any,
    adminDetails?: any
  ): Promise<void> {
    try {
      // For super-admin operations, use a placeholder system user ID since super-admin isn't a regular user
      // The actual identifier is kept in details.performedBy for audit trail
      const finalUserId = userId === 'super-admin' ? 'system' : userId;
      
      const ctx = getAuditContext();
      const impId = ctx?.impersonatorUserId;
      await this.createAuditLog({
        action: `admin_${action}`,
        resourceType,
        resourceId,
        userId: finalUserId,
        originalData,
        details: {
          adminOperation: true,
          newData,
          performedBy: userId, // Keep original identifier in details
          ...(impId ? { impersonation: { impersonatorUserId: impId } } : {}),
          ...adminDetails
        },
      }, tenantId);
    } catch (error) {
      console.error('Failed to create admin audit log:', error);
      // Don't throw error to avoid blocking operations, but log the failure
    }
  }

  async getAuditLogs(tenantId: string, filters: { resourceType?: string; action?: string; userId?: string; limit?: number } = {}): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.tenantId, tenantId)];
    
    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }
    
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    const limit = filters.limit || 1000; // Default limit to avoid type issues
    
    const results = await db
      .select({
        auditLog: auditLogs,
        user: users,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return results.map(row => ({
      ...row.auditLog,
      user: row.user,
    }));
  }

  // Enhanced CRUD operations with AUDIT LOGGING - TENANT ISOLATED
  async updateIncidentReport(id: string, incident: Partial<InsertIncidentReport>, tenantId: string, userId?: string): Promise<IncidentReport> {
    // CRITICAL: Fetch original data before update for compliance
    if (userId) {
      const originalIncident = await this.getIncidentReport(id, tenantId);
      if (originalIncident) {
        await this.auditBeforeOperation(
          'update',
          'incident_report',
          id,
          userId,
          tenantId,
          originalIncident,
          { updatedFields: Object.keys(incident) }
        );
      }
    }
    // Ensure date fields are properly converted to Date objects
    const updateData: any = {
      ...incident,
      updatedAt: new Date(),
      ...(incident.incidentDate && { incidentDate: new Date(incident.incidentDate) }),
      ...(incident.reportedToFapDate && { reportedToFapDate: new Date(incident.reportedToFapDate) }),
      ...(incident.dispositionDateTime && { dispositionDateTime: new Date(incident.dispositionDateTime) }),
    };
    // Normalize lastMenstrualPeriod if provided
    if (updateData.lastMenstrualPeriod instanceof Date) {
      updateData.lastMenstrualPeriod = updateData.lastMenstrualPeriod.toISOString().split('T')[0];
    }
    
    const [updatedIncident] = await db
      .update(incidentReports)
      .set(updateData)
      .where(and(eq(incidentReports.id, id), eq(incidentReports.tenantId, tenantId)))
      .returning();
    
    // Trigger notification for incident update (non-blocking)
    notifyIncidentUpdated(this, updatedIncident, tenantId, incident as Record<string, any>).catch(err => {
      console.error('Failed to send incident update notification:', err);
    });
    
    return updatedIncident;
  }

  async deleteIncidentReport(id: string, tenantId: string, userId?: string): Promise<void> {
    // CRITICAL: Fetch original data before deletion for compliance
    if (userId) {
      const originalIncident = await this.getIncidentReport(id, tenantId);
      if (originalIncident) {
        await this.auditBeforeOperation(
          'delete',
          'incident_report',
          id,
          userId,
          tenantId,
          originalIncident,
          { reason: 'User requested deletion' }
        );
      }
    }
    
    await db.delete(incidentReports)
      .where(and(
        eq(incidentReports.id, id),
        eq(incidentReports.tenantId, tenantId)
      ));
  }

  // Medical Inventory & Equipment Tracking operations - TENANT ISOLATED
  // Model: inventory_items (master) + inventory_stock (per location). List/detail return stock joined with item.

  private mergeStockWithItem(
    stock: typeof inventoryStock.$inferSelect,
    item: typeof inventoryItems.$inferSelect,
    location?: typeof careLocations.$inferSelect | null
  ): MedicalInventory {
    // Flatten item identity fields onto the stock row while keeping nested `item`
    // so callers can keep using MedicalInventory like the old medical_inventory row.
    const base = { ...item, ...stock, item } as any;
    if (location) {
      base.locationId = stock.locationId;
      base.location = {
        id: location.id,
        locationName: location.locationName,
        locationCode: location.locationCode,
      };
    }
    return base as MedicalInventory;
  }

  /** Generate unique item code: PREFIX-XXX#### (or PREFIX-XXX####-2, -3, ... if collision). */
  private async generateUniqueItemCode(
    tenantId: string,
    prefix: string,
    itemName: string
  ): Promise<string> {
    const safePrefix = (prefix || "ITM").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "ITM";
    const namePart = itemName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase() || "ITM";
    const timestampPart = Date.now().toString().slice(-4);
    const base = `${safePrefix}-${namePart}${timestampPart}`;
    for (let n = 0; n < 100; n++) {
      const code = n === 0 ? base : `${base}-${n + 1}`;
      const [existing] = await db
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.itemCode, code)))
        .limit(1);
      if (!existing) return code;
    }
    return `${base}-${Date.now().toString().slice(-2)}`;
  }

  // Inventory operations
  // Note: tenants start with an empty inventory. No default catalog is seeded;
  // each business adds its own items (manually or via future import tooling).
  async createMedicalInventory(inventory: InsertMedicalInventory & { locationId: string }, tenantId: string): Promise<MedicalInventory> {
    const data: any = { ...inventory, tenantId };
    if (!data.locationId) throw new Error('locationId is required to create inventory');

    await this.ensureDefaultInventoryCategories(tenantId);
    const categoryRow = data.category
      ? await this.getInventoryCategoryBySlug(String(data.category), tenantId)
      : undefined;
    if (!categoryRow || !categoryRow.isActive) {
      throw new Error(`Unknown or inactive inventory category: ${data.category}`);
    }
    data.category = categoryRow.slug;

    if (categoryRow.fieldTemplate === 'equipment' && (data.brand == null || data.brand === '') && data.supplier) {
      data.brand = data.supplier;
    }
    // Accept PREFIX-XXX#### where PREFIX matches the category's item_code_prefix.
    const itemCodeTrimmed = (data.itemCode ?? '').toString().trim();
    const expectedPrefix = categoryRow.itemCodePrefix.toUpperCase();
    const validItemCodePattern = new RegExp(
      `^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-[A-Z0-9]{3}\\d{4}(-\\d+)?$`,
      "i"
    );
    const shouldGenerateCode = !itemCodeTrimmed || !validItemCodePattern.test(itemCodeTrimmed);
    if (shouldGenerateCode && data.itemName) {
      data.itemCode = await this.generateUniqueItemCode(tenantId, expectedPrefix, data.itemName);
    }
    const itemFields = ['itemName', 'itemCode', 'category', 'brand', 'model', 'description', 'unitOfMeasure', 'dosageForm', 'supplier', 'supplierContact', 'supplierId', 'status', 'equipmentStatus', 'lastMaintenanceDate', 'nextMaintenanceDate', 'warrantyExpiry', 'serialNumber', 'lowStockAlert', 'expiryAlert', 'expiryAlertDays', 'companyId', 'imageUrl', 'barcode'];
    const itemData: any = { tenantId };
    itemFields.forEach(f => { if (data[f] !== undefined) itemData[f] = data[f]; });
    if (itemData.lastMaintenanceDate instanceof Date) itemData.lastMaintenanceDate = itemData.lastMaintenanceDate.toISOString().split('T')[0];
    if (itemData.nextMaintenanceDate instanceof Date) itemData.nextMaintenanceDate = itemData.nextMaintenanceDate.toISOString().split('T')[0];
    if (itemData.warrantyExpiry instanceof Date) itemData.warrantyExpiry = itemData.warrantyExpiry.toISOString().split('T')[0];

    const [newItem] = await db.insert(inventoryItems).values(itemData).returning();
    if (!newItem) throw new Error('Failed to create inventory item');

    const stockData: any = {
      tenantId,
      itemId: newItem.id,
      locationId: data.locationId,
      currentStock: data.currentStock ?? 0,
      minimumStock: data.minimumStock ?? 0,
      maximumStock: data.maximumStock ?? 100,
      reorderPoint: data.reorderPoint ?? 10,
      unitCost: data.unitCost ?? null,
      totalValue: data.totalValue ?? null,
      expiryDate: data.expiryDate != null ? (data.expiryDate instanceof Date ? data.expiryDate.toISOString().split('T')[0] : data.expiryDate) : null,
      batchNumber: data.batchNumber ?? null,
      lotNumber: data.lotNumber ?? null,
    };
    const [newStock] = await db.insert(inventoryStock).values(stockData).returning();
    if (!newStock) throw new Error('Failed to create inventory stock');

    // Attach location object for UI table
    let location: typeof careLocations.$inferSelect | null = null;
    try {
      const [loc] = await db
        .select()
        .from(careLocations)
        .where(and(eq(careLocations.id, newStock.locationId), eq(careLocations.tenantId, tenantId)));
      location = loc ?? null;
    } catch {
      location = null;
    }

    const merged = this.mergeStockWithItem(newStock, newItem, location);
    this.checkAndCreateInventoryAlerts(merged, tenantId).catch(err => console.error('Error checking inventory alerts after creation:', err));
    return merged;
  }

  async getMedicalInventory(id: string, tenantId: string): Promise<MedicalInventory | undefined> {
    const [row] = await db
      .select({
        stock: inventoryStock,
        item: inventoryItems,
        location: careLocations,
      })
      .from(inventoryStock)
      .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId))
      .leftJoin(careLocations, eq(careLocations.id, inventoryStock.locationId))
      .where(and(eq(inventoryStock.id, id), eq(inventoryStock.tenantId, tenantId)));
    if (!row) return undefined;
    return this.mergeStockWithItem(row.stock, row.item, row.location ?? null);
  }

  async getMedicalInventoryList(
    tenantId: string,
    filters?: {
      category?: string;
      status?: string;
      lowStock?: boolean;
      locationId?: string;
      locationKind?: "fixed_site" | "ambulance";
    }
  ): Promise<MedicalInventory[]> {
    const conditions = [eq(inventoryStock.tenantId, tenantId)];
    if (filters?.category) conditions.push(eq(inventoryItems.category, filters.category as any));
    if (filters?.status) conditions.push(eq(inventoryItems.status, filters.status as any));
    if (filters?.lowStock) conditions.push(sql`${inventoryStock.currentStock} <= ${inventoryStock.minimumStock}`);
    if (filters?.locationId && String(filters.locationId).trim() !== '') {
      conditions.push(eq(inventoryStock.locationId, String(filters.locationId).trim()));
    }

    const locationKind = filters?.locationKind;
    // Join care_locations with tenant guard. When filtering by kind, use INNER JOIN so only stock
    // rows whose location_id points at a matching care_locations row are returned (avoids any
    // mismatch between WHERE and a plain id-only LEFT JOIN).
    const locationJoinOn = locationKind
      ? and(
          eq(careLocations.id, inventoryStock.locationId),
          eq(careLocations.tenantId, tenantId),
          eq(careLocations.locationKind, locationKind)
        )
      : and(eq(careLocations.id, inventoryStock.locationId), eq(careLocations.tenantId, tenantId));

    const selectShape = {
      stock: inventoryStock,
      item: inventoryItems,
      location: careLocations,
    };

    const rows = locationKind
      ? await db
          .select(selectShape)
          .from(inventoryStock)
          .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId))
          .innerJoin(careLocations, locationJoinOn)
          .where(and(...conditions))
          .orderBy(inventoryItems.itemName)
      : await db
          .select(selectShape)
          .from(inventoryStock)
          .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId))
          .leftJoin(careLocations, locationJoinOn)
          .where(and(...conditions))
          .orderBy(inventoryItems.itemName);
    return rows.map(r => this.mergeStockWithItem(r.stock, r.item, r.location ?? null));
  }

  async updateMedicalInventory(id: string, inventory: Partial<InsertMedicalInventory>, tenantId: string): Promise<MedicalInventory> {
    const current = await this.getMedicalInventory(id, tenantId);
    if (!current) throw new Error('Inventory not found');
    const data: any = { ...inventory, updatedAt: new Date() };
    if (data.category === 'equipment' && (data.brand == null || data.brand === '') && data.supplier) data.brand = data.supplier;

    const itemFields = ['itemName', 'itemCode', 'category', 'brand', 'model', 'description', 'unitOfMeasure', 'dosageForm', 'supplier', 'supplierContact', 'supplierId', 'status', 'equipmentStatus', 'lastMaintenanceDate', 'nextMaintenanceDate', 'warrantyExpiry', 'serialNumber', 'lowStockAlert', 'expiryAlert', 'expiryAlertDays', 'companyId', 'imageUrl', 'barcode'];
    const stockFields = ['locationId', 'currentStock', 'minimumStock', 'maximumStock', 'reorderPoint', 'unitCost', 'totalValue', 'expiryDate', 'batchNumber', 'lotNumber'];
    const itemData: any = {};
    const stockData: any = { updatedAt: new Date() };
    itemFields.forEach(f => { if (data[f] !== undefined) itemData[f] = data[f]; });
    stockFields.forEach(f => { if (data[f] !== undefined) stockData[f] = data[f]; });
    if (stockData.expiryDate instanceof Date) stockData.expiryDate = stockData.expiryDate.toISOString().split('T')[0];
    if (itemData.lastMaintenanceDate instanceof Date) itemData.lastMaintenanceDate = itemData.lastMaintenanceDate.toISOString().split('T')[0];
    if (itemData.nextMaintenanceDate instanceof Date) itemData.nextMaintenanceDate = itemData.nextMaintenanceDate.toISOString().split('T')[0];
    if (itemData.warrantyExpiry instanceof Date) itemData.warrantyExpiry = itemData.warrantyExpiry.toISOString().split('T')[0];

    const itemId = (current as any).itemId ?? (current as any).item?.id;
    // itemData has no baseline keys (unlike stockData's updatedAt), so any key means a real change.
    if (Object.keys(itemData).length > 0) {
      await db.update(inventoryItems).set({ ...itemData, updatedAt: new Date() }).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.tenantId, tenantId)));
    }
    if (Object.keys(stockData).length > 1) {
      await db.update(inventoryStock).set(stockData).where(and(eq(inventoryStock.id, id), eq(inventoryStock.tenantId, tenantId)));
    }
    const updated = await this.getMedicalInventory(id, tenantId);
    if (!updated) throw new Error('Inventory not found after update');
    if (current && (updated as any).item?.category === 'equipment') {
      const oldStatus = (current as any).item?.equipmentStatus ?? (current as any).equipmentStatus;
      const newStatus = (updated as any).item?.equipmentStatus ?? (updated as any).equipmentStatus;
      if (oldStatus !== newStatus && newStatus) {
        for (const [alertType, severity, msgSuffix] of [['equipment_failure', 'critical', 'FAULTY and requires immediate attention'], ['equipment_maintenance', 'high', 'under maintenance']] as const) {
          if ((alertType === 'equipment_failure' && newStatus === 'faulty') || (alertType === 'equipment_maintenance' && newStatus === 'maintenance')) {
            const existing = await this.getInventoryAlerts(tenantId, { isActive: true, alertType });
            if (!existing.some(a => a.itemId === id && !a.notificationSentAt)) {
              await this.createInventoryAlert({ itemId: id, alertType, severity, message: `Equipment ${(updated as any).item?.itemName ?? (updated as any).itemName} (${(updated as any).item?.itemCode ?? (updated as any).itemCode}) ${msgSuffix}` }, tenantId).catch(() => {});
            }
          }
        }
      }
    }
    this.checkAndCreateInventoryAlerts(updated, tenantId).catch(err => console.error('Error checking inventory alerts after update:', err));
    return updated;
  }

  async deleteMedicalInventory(id: string, tenantId: string): Promise<void> {
    await db.delete(inventoryStock).where(and(eq(inventoryStock.id, id), eq(inventoryStock.tenantId, tenantId)));
  }

  async getMedicalInventoryByCode(itemCode: string, tenantId: string): Promise<MedicalInventory | undefined> {
    const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.itemCode, itemCode), eq(inventoryItems.tenantId, tenantId)));
    if (!item) return undefined;
    const [row] = await db.select({ stock: inventoryStock, item: inventoryItems }).from(inventoryStock).innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId)).where(and(eq(inventoryItems.id, item.id), eq(inventoryStock.tenantId, tenantId)));
    if (!row) return { ...item } as unknown as MedicalInventory;
    return this.mergeStockWithItem(row.stock, row.item);
  }



  // Equipment maintenance operations
  async createEquipmentMaintenance(maintenance: InsertEquipmentMaintenance, tenantId: string): Promise<EquipmentMaintenance> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...maintenance, tenantId };
    if (insertData.scheduledDate instanceof Date) {
      insertData.scheduledDate = insertData.scheduledDate.toISOString().split('T')[0];
    }
    if (insertData.completedDate instanceof Date) {
      insertData.completedDate = insertData.completedDate.toISOString().split('T')[0];
    }
    if (insertData.nextMaintenanceDate instanceof Date) {
      insertData.nextMaintenanceDate = insertData.nextMaintenanceDate.toISOString().split('T')[0];
    }
    if (insertData.certificationExpires instanceof Date) {
      insertData.certificationExpires = insertData.certificationExpires.toISOString().split('T')[0];
    }
    
    const [newMaintenance] = await db
      .insert(equipmentMaintenance)
      .values(insertData)
      .returning();
    return newMaintenance;
  }

  async getEquipmentMaintenance(id: string, tenantId: string): Promise<EquipmentMaintenance | undefined> {
    const [maintenance] = await db
      .select()
      .from(equipmentMaintenance)
      .where(and(
        eq(equipmentMaintenance.id, id),
        eq(equipmentMaintenance.tenantId, tenantId)
      ));
    return maintenance;
  }

  async getEquipmentMaintenanceList(tenantId: string, filters?: { status?: string; equipmentId?: string; overdue?: boolean }): Promise<EquipmentMaintenance[]> {
    const conditions = [eq(equipmentMaintenance.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(equipmentMaintenance.status, filters.status as any));
    }
    
    if (filters?.equipmentId) {
      conditions.push(eq(equipmentMaintenance.equipmentId, filters.equipmentId));
    }
    
    if (filters?.overdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      conditions.push(eq(equipmentMaintenance.status, 'scheduled'));
      // Maintenance is overdue if scheduledDate is before today (not including today)
      // Use SQL template for date comparison
      conditions.push(sql`${equipmentMaintenance.scheduledDate} < ${todayStr}`);
    }

    return db
      .select()
      .from(equipmentMaintenance)
      .where(and(...conditions))
      .orderBy(equipmentMaintenance.scheduledDate);
  }

  async updateEquipmentMaintenance(id: string, maintenance: Partial<InsertEquipmentMaintenance>, tenantId: string): Promise<EquipmentMaintenance> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...maintenance, updatedAt: new Date() };
    if (updateData.scheduledDate instanceof Date) {
      updateData.scheduledDate = updateData.scheduledDate.toISOString().split('T')[0];
    }
    if (updateData.completedDate instanceof Date) {
      updateData.completedDate = updateData.completedDate.toISOString().split('T')[0];
    }
    if (updateData.nextMaintenanceDate instanceof Date) {
      updateData.nextMaintenanceDate = updateData.nextMaintenanceDate.toISOString().split('T')[0];
    }
    if (updateData.certificationExpires instanceof Date) {
      updateData.certificationExpires = updateData.certificationExpires.toISOString().split('T')[0];
    }
    
    const [updatedMaintenance] = await db
      .update(equipmentMaintenance)
      .set(updateData)
      .where(and(
        eq(equipmentMaintenance.id, id),
        eq(equipmentMaintenance.tenantId, tenantId)
      ))
      .returning();
    return updatedMaintenance;
  }

  async deleteEquipmentMaintenance(id: string, tenantId: string): Promise<void> {
    await db.delete(equipmentMaintenance)
      .where(and(
        eq(equipmentMaintenance.id, id),
        eq(equipmentMaintenance.tenantId, tenantId)
      ));
  }

  // Customer operations
  async createCustomer(customer: InsertCustomer, tenantId: string): Promise<Customer> {
    const customerNumber = customer.customerNumber?.trim() || `CUS-${Date.now().toString().slice(-8)}`;
    const [created] = await db.insert(customers).values({ ...customer, customerNumber, tenantId }).returning();
    return created;
  }

  async getCustomer(id: string, tenantId: string): Promise<Customer | undefined> {
    const [row] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    return row;
  }

  async getCustomers(tenantId: string, search?: string): Promise<Customer[]> {
    const conditions = [eq(customers.tenantId, tenantId)];
    const term = search?.trim();
    if (term) {
      const pattern = `%${term}%`;
      conditions.push(
        or(
          ilike(customers.firstName, pattern),
          ilike(customers.lastName, pattern),
          ilike(customers.email, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.customerNumber, pattern),
        )!
      );
    }
    return await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.firstName), asc(customers.lastName));
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>, tenantId: string): Promise<Customer> {
    const [updated] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteCustomer(id: string, tenantId: string): Promise<void> {
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  }

  // Supplier operations
  async createSupplier(supplier: InsertSupplier, tenantId: string): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values({ ...supplier, tenantId }).returning();
    return created;
  }

  async getSupplier(id: string, tenantId: string): Promise<Supplier | undefined> {
    const [row] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
    return row;
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).orderBy(asc(suppliers.name));
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>, tenantId: string): Promise<Supplier> {
    const [updated] = await db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteSupplier(id: string, tenantId: string): Promise<void> {
    await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
  }

  // Purchase order operations
  async createPurchaseOrder(purchaseOrder: InsertPurchaseOrder, tenantId: string): Promise<PurchaseOrder> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...purchaseOrder, tenantId };
    if (insertData.orderDate instanceof Date) {
      insertData.orderDate = insertData.orderDate.toISOString().split('T')[0];
    }
    if (insertData.expectedDelivery instanceof Date) {
      insertData.expectedDelivery = insertData.expectedDelivery.toISOString().split('T')[0];
    }
    if (insertData.actualDelivery instanceof Date) {
      insertData.actualDelivery = insertData.actualDelivery.toISOString().split('T')[0];
    }
    const [newPurchaseOrder] = await db.insert(purchaseOrders).values(insertData).returning();
    return newPurchaseOrder;
  }


  // Helper function to check and create inventory alerts automatically
  async checkAndCreateInventoryAlerts(item: MedicalInventory, tenantId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Checking inventory alerts for item`);
      }
      
      // Check for low stock alert
      if (item.lowStockAlert && item.currentStock !== null && item.minimumStock !== null) {
        if (item.currentStock <= item.minimumStock) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`   ⚠️ Low stock detected: ${item.currentStock} <= ${item.minimumStock}`);
          }
          
          // Check if there's already an active low stock alert for this item
          const existingAlerts = await this.getInventoryAlerts(tenantId, { 
            isActive: true, 
            alertType: 'low_stock' 
          });
          const hasActiveAlert = existingAlerts.some(a => a.itemId === item.id);
          const alertNeedsNotification = existingAlerts.some(a => a.itemId === item.id && !a.notificationSentAt);
          
          if (hasActiveAlert && !alertNeedsNotification) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   ⚠️ Active low stock alert already exists and notification sent - skipping creation`);
            }
          } else if (hasActiveAlert && alertNeedsNotification) {
            // Alert exists but notification not sent - send it now
            const existingAlert = existingAlerts.find(a => a.itemId === item.id && !a.notificationSentAt);
            if (existingAlert) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`   📧 Sending notification for existing low stock alert...`);
              }
              notifyInventoryAlert(this, existingAlert, tenantId)
                .then(async (result) => {
                  if (result.emailsSent > 0 || result.notificationsCreated > 0) {
                    await db
                      .update(inventoryAlerts)
                      .set({ notificationSentAt: new Date() })
                      .where(eq(inventoryAlerts.id, existingAlert.id));
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ✅ Notification sent: ${result.emailsSent} emails`);
                    }
                  } else {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ⚠️ No notifications/emails sent`);
                    }
                  }
                })
                .catch(err => {
                  console.error(`   ❌ Failed to send notification for alert ${existingAlert.id}:`, err);
                });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   📝 Creating new low stock alert...`);
            }
            // Determine severity based on how low stock is
            let severity = 'medium';
            if (item.currentStock === 0) {
              severity = 'critical';
            } else if (item.currentStock <= (item.minimumStock * 0.3)) {
              severity = 'high';
            } else if (item.currentStock <= (item.minimumStock * 0.6)) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
            
            await this.createInventoryAlert({
              itemId: item.id,
              alertType: 'low_stock',
              severity,
              message: `Stock for ${item.itemName} (${item.itemCode}) is low. Current: ${item.currentStock}, Minimum: ${item.minimumStock}`,
              currentStock: item.currentStock,
              minimumStock: item.minimumStock,
            }, tenantId);
          }
        }
      }

      // Check for expiry alert
      if (item.expiryAlert && item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const alertDays = item.expiryAlertDays || 30;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`   📅 Expiry check: ${daysUntilExpiry} days until expiry (alert threshold: ${alertDays} days)`);
        }
        
        if (daysUntilExpiry <= alertDays && daysUntilExpiry >= 0) {
          // Check if there's already an active expiry alert for this item
          const existingAlerts = await this.getInventoryAlerts(tenantId, { 
            isActive: true, 
            alertType: 'expiry' 
          });
          const hasActiveAlert = existingAlerts.some(a => a.itemId === item.id && a.expiryDate === item.expiryDate);
          const alertNeedsNotification = existingAlerts.some(a => a.itemId === item.id && a.expiryDate === item.expiryDate && !a.notificationSentAt);
          
          if (hasActiveAlert && !alertNeedsNotification) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   ⚠️ Active expiry alert already exists and notification sent - skipping creation`);
            }
          } else if (hasActiveAlert && alertNeedsNotification) {
            // Alert exists but notification not sent - send it now
            const existingAlert = existingAlerts.find(a => a.itemId === item.id && a.expiryDate === item.expiryDate && !a.notificationSentAt);
            if (existingAlert) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`   📧 Sending notification for existing expiry alert...`);
              }
              notifyInventoryAlert(this, existingAlert, tenantId)
                .then(async (result) => {
                  if (result.emailsSent > 0 || result.notificationsCreated > 0) {
                    await db
                      .update(inventoryAlerts)
                      .set({ notificationSentAt: new Date() })
                      .where(eq(inventoryAlerts.id, existingAlert.id));
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ✅ Notification sent: ${result.emailsSent} emails`);
                    }
                  } else {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ⚠️ No notifications/emails sent`);
                    }
                  }
                })
                .catch(err => {
                  console.error(`   ❌ Failed to send notification for alert ${existingAlert.id}:`, err);
                });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   📝 Creating new expiry alert...`);
            }
            // Determine severity based on days until expiry
            let severity = 'medium';
            if (daysUntilExpiry <= 7) {
              severity = 'critical';
            } else if (daysUntilExpiry <= 14) {
              severity = 'high';
            } else if (daysUntilExpiry <= 21) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
            
            await this.createInventoryAlert({
              itemId: item.id,
              alertType: 'expiry',
              severity,
              message: `${item.itemName} (${item.itemCode}) expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              daysToExpiry: daysUntilExpiry,
            }, tenantId);
          }
        }
      }

      // Check for equipment maintenance alerts
      if (item.category === 'equipment' && item.nextMaintenanceDate) {
        const maintenanceDate = new Date(item.nextMaintenanceDate);
        const today = new Date();
        const daysUntilMaintenance = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`   🔧 Maintenance check: ${daysUntilMaintenance} days until next maintenance`);
        
        // Alert if maintenance is due within 30 days or overdue
        if (daysUntilMaintenance <= 30) {
          const existingAlerts = await this.getInventoryAlerts(tenantId, { 
            isActive: true, 
            alertType: 'equipment_maintenance' 
          });
          const hasActiveAlert = existingAlerts.some(a => a.itemId === item.id);
          const alertNeedsNotification = existingAlerts.some(a => a.itemId === item.id && !a.notificationSentAt);
          
          if (hasActiveAlert && !alertNeedsNotification) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   ⚠️ Active maintenance alert already exists and notification sent - skipping creation`);
            }
          } else if (hasActiveAlert && alertNeedsNotification) {
            // Alert exists but notification not sent - send it now
            const existingAlert = existingAlerts.find(a => a.itemId === item.id && !a.notificationSentAt);
            if (existingAlert) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`   📧 Sending notification for existing maintenance alert...`);
              }
              notifyInventoryAlert(this, existingAlert, tenantId)
                .then(async (result) => {
                  if (result.emailsSent > 0 || result.notificationsCreated > 0) {
                    await db
                      .update(inventoryAlerts)
                      .set({ notificationSentAt: new Date() })
                      .where(eq(inventoryAlerts.id, existingAlert.id));
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ✅ Notification sent: ${result.emailsSent} emails`);
                    }
                  } else {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ⚠️ No notifications/emails sent`);
                    }
                  }
                })
                .catch(err => {
                  console.error(`   ❌ Failed to send notification for alert ${existingAlert.id}:`, err);
                });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   📝 Creating new equipment maintenance alert...`);
            }
            let severity = 'medium';
            if (daysUntilMaintenance < 0) {
              severity = 'critical'; // Overdue
            } else if (daysUntilMaintenance <= 7) {
              severity = 'high';
            } else if (daysUntilMaintenance <= 14) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
            
            await this.createInventoryAlert({
              itemId: item.id,
              alertType: 'equipment_maintenance',
              severity,
              message: `Equipment ${item.itemName} (${item.itemCode}) ${daysUntilMaintenance < 0 ? 'is overdue' : 'requires'} maintenance${daysUntilMaintenance >= 0 ? ` in ${daysUntilMaintenance} day${daysUntilMaintenance !== 1 ? 's' : ''}` : ''}`,
            }, tenantId);
          }
        }
      }

      // Check for warranty expiry alerts
      if (item.category === 'equipment' && item.warrantyExpiry) {
        const warrantyDate = new Date(item.warrantyExpiry);
        const today = new Date();
        const daysUntilWarrantyExpiry = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const alertDays = 90; // Alert 90 days before warranty expires
        
        console.log(`   📋 Warranty check: ${daysUntilWarrantyExpiry} days until warranty expiry`);
        
        if (daysUntilWarrantyExpiry <= alertDays && daysUntilWarrantyExpiry >= 0) {
          const existingAlerts = await this.getInventoryAlerts(tenantId, { 
            isActive: true, 
            alertType: 'equipment_failure' 
          });
          const hasActiveAlert = existingAlerts.some(a => a.itemId === item.id);
          const alertNeedsNotification = existingAlerts.some(a => a.itemId === item.id && !a.notificationSentAt);
          
          if (hasActiveAlert && !alertNeedsNotification) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   ⚠️ Active warranty expiry alert already exists and notification sent - skipping creation`);
            }
          } else if (hasActiveAlert && alertNeedsNotification) {
            // Alert exists but notification not sent - send it now
            const existingAlert = existingAlerts.find(a => a.itemId === item.id && !a.notificationSentAt);
            if (existingAlert) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`   📧 Sending notification for existing warranty expiry alert...`);
              }
              notifyInventoryAlert(this, existingAlert, tenantId)
                .then(async (result) => {
                  if (result.emailsSent > 0 || result.notificationsCreated > 0) {
                    await db
                      .update(inventoryAlerts)
                      .set({ notificationSentAt: new Date() })
                      .where(eq(inventoryAlerts.id, existingAlert.id));
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ✅ Notification sent: ${result.emailsSent} emails`);
                    }
                  } else {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`   ⚠️ No notifications/emails sent`);
                    }
                  }
                })
                .catch(err => {
                  console.error(`   ❌ Failed to send notification for alert ${existingAlert.id}:`, err);
                });
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`   📝 Creating new warranty expiry alert...`);
            }
            let severity = 'medium';
            if (daysUntilWarrantyExpiry <= 30) {
              severity = 'high';
            } else if (daysUntilWarrantyExpiry <= 60) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
            
            await this.createInventoryAlert({
              itemId: item.id,
              alertType: 'equipment_failure', // Using equipment_failure for warranty expiry
              severity,
              message: `Equipment ${item.itemName} (${item.itemCode}) warranty expires in ${daysUntilWarrantyExpiry} day${daysUntilWarrantyExpiry !== 1 ? 's' : ''}`,
              expiryDate: item.warrantyExpiry ? new Date(item.warrantyExpiry) : undefined,
              daysToExpiry: daysUntilWarrantyExpiry,
            }, tenantId);
          }
        }
      }
    } catch (error) {
      console.error('Error checking inventory alerts:', error);
      // Don't throw - alert checking shouldn't break inventory updates
    }
  }

  // Inventory alert operations
  async createInventoryAlert(alert: InsertInventoryAlert, tenantId: string): Promise<InventoryAlert> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Creating inventory alert: ${alert.alertType}`);
    }
    
    // Convert Date objects to strings for date columns
    const insertData: any = { ...alert, tenantId };
    if (insertData.expiryDate instanceof Date) {
      insertData.expiryDate = insertData.expiryDate.toISOString().split('T')[0];
    }
    
    const [newAlert] = await db
      .insert(inventoryAlerts)
      .values(insertData)
      .returning();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Inventory alert created: ${newAlert.alertType}, severity: ${newAlert.severity}`);
    }
    
    // Trigger notification (non-blocking, don't fail request on error)
    notifyInventoryAlert(this, newAlert, tenantId)
      .then(async (result) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`   ✅ Notification result: ${result.notificationsCreated} created, ${result.emailsSent} emails, ${result.errors} errors`);
        }
        // Mark notification as sent after successful notification (if at least one email was sent)
        if (result.emailsSent > 0 || result.notificationsCreated > 0) {
          await db
            .update(inventoryAlerts)
            .set({ notificationSentAt: new Date() })
            .where(eq(inventoryAlerts.id, newAlert.id));
        }
      })
      .catch(err => {
        console.error(`❌ Failed to send inventory alert notification for ${newAlert.id}:`, err);
        console.error(`   Error details:`, err);
      });
    
    return newAlert;
  }
  
  // Process existing active alerts that haven't sent notifications
  async processPendingInventoryAlerts(tenantId: string): Promise<{ processed: number; errors: number }> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Processing pending inventory alerts...`);
    }
    
    // Get all active alerts that haven't sent notifications
    const pendingAlerts = await db
      .select()
      .from(inventoryAlerts)
      .where(and(
        eq(inventoryAlerts.tenantId, tenantId),
        eq(inventoryAlerts.isActive, true),
        isNull(inventoryAlerts.notificationSentAt)
      ));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   Found ${pendingAlerts.length} pending alerts to process`);
    }
    
    let processed = 0;
    let errors = 0;
    
    for (const alert of pendingAlerts) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`   📧 Processing alert: ${alert.alertType}`);
        }
        await notifyInventoryAlert(this, alert, tenantId);
        
        // Mark notification as sent
        await db
          .update(inventoryAlerts)
          .set({ notificationSentAt: new Date() })
          .where(eq(inventoryAlerts.id, alert.id));
        
        processed++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`   ✅ Alert processed successfully`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Failed to process alert ${alert.id}:`, error);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Processed ${processed} alerts, ${errors} errors`);
    }
    return { processed, errors };
  }

  async getInventoryAlerts(tenantId: string, filters?: { isActive?: boolean; alertType?: string; severity?: string }): Promise<InventoryAlert[]> {
    const conditions = [eq(inventoryAlerts.tenantId, tenantId)];
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(inventoryAlerts.isActive, filters.isActive));
    }
    
    if (filters?.alertType) {
      conditions.push(eq(inventoryAlerts.alertType, filters.alertType));
    }
    
    if (filters?.severity) {
      conditions.push(eq(inventoryAlerts.severity, filters.severity));
    }

    return db
      .select()
      .from(inventoryAlerts)
      .where(and(...conditions))
      .orderBy(desc(inventoryAlerts.createdAt));
  }

  async updateInventoryAlert(id: string, alert: Partial<InsertInventoryAlert>, tenantId: string): Promise<InventoryAlert> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...alert, updatedAt: new Date() };
    if (updateData.expiryDate instanceof Date) {
      updateData.expiryDate = updateData.expiryDate.toISOString().split('T')[0];
    }
    
    const [updatedAlert] = await db
      .update(inventoryAlerts)
      .set(updateData)
      .where(and(
        eq(inventoryAlerts.id, id),
        eq(inventoryAlerts.tenantId, tenantId)
      ))
      .returning();
    return updatedAlert;
  }

  async acknowledgeInventoryAlert(id: string, acknowledgedBy: string, tenantId: string): Promise<InventoryAlert> {
    const [updatedAlert] = await db
      .update(inventoryAlerts)
      .set({ 
        acknowledgedBy,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryAlerts.id, id),
        eq(inventoryAlerts.tenantId, tenantId)
      ))
      .returning();
    return updatedAlert;
  }

  async resolveInventoryAlert(id: string, resolvedBy: string, tenantId: string): Promise<InventoryAlert> {
    const [updatedAlert] = await db
      .update(inventoryAlerts)
      .set({ 
        resolvedBy,
        resolvedAt: new Date(),
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryAlerts.id, id),
        eq(inventoryAlerts.tenantId, tenantId)
      ))
      .returning();
    return updatedAlert;
  }

  // Inventory analytics and reports
  async getInventoryAnalytics(tenantId: string): Promise<{
    totalItems: number;
    lowStockItems: number;
    expiringItems: number;
    totalValue: string;
    itemsByCategory: Array<{ category: string; count: number; value: string }>;
    recentTransactions: number;
    pendingMaintenances: number;
  }> {
    // Total distinct catalog items
    const [totalItemsResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId));

    // Low stock stock-rows
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(inventoryStock)
      .where(and(
        eq(inventoryStock.tenantId, tenantId),
        sql`${inventoryStock.currentStock} <= ${inventoryStock.minimumStock}`
      ));

    // Expiring items (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const [expiringResult] = await db
      .select({ count: count() })
      .from(inventoryStock)
      .where(and(
        eq(inventoryStock.tenantId, tenantId),
        lte(inventoryStock.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0])
      ));

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentTransactionsResult] = await db
      .select({ count: count() })
      .from(inventoryTransactions)
      .where(and(
        eq(inventoryTransactions.tenantId, tenantId),
        gte(inventoryTransactions.createdAt, sevenDaysAgo)
      ));

    // Pending maintenances
    const [pendingMaintenancesResult] = await db
      .select({ count: count() })
      .from(equipmentMaintenance)
      .where(and(
        eq(equipmentMaintenance.tenantId, tenantId),
        or(
          eq(equipmentMaintenance.status, 'scheduled'),
          eq(equipmentMaintenance.status, 'overdue')
        )
      ));

    return {
      totalItems: totalItemsResult.count,
      lowStockItems: lowStockResult.count,
      expiringItems: expiringResult.count,
      totalValue: "0",
      itemsByCategory: [],
      recentTransactions: recentTransactionsResult.count,
      pendingMaintenances: pendingMaintenancesResult.count,
    };
  }

  async getLowStockItems(tenantId: string): Promise<MedicalInventory[]> {
    const rows = await db
      .select({ stock: inventoryStock, item: inventoryItems })
      .from(inventoryStock)
      .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId))
      .where(and(
        eq(inventoryStock.tenantId, tenantId),
        sql`${inventoryStock.currentStock} <= ${inventoryStock.minimumStock}`
      ))
      .orderBy(inventoryItems.itemName);
    return rows.map((r) => this.mergeStockWithItem(r.stock, r.item));
  }

  async getExpiringItems(tenantId: string, daysAhead: number = 30): Promise<MedicalInventory[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const rows = await db
      .select({ stock: inventoryStock, item: inventoryItems })
      .from(inventoryStock)
      .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryStock.itemId))
      .where(and(
        eq(inventoryStock.tenantId, tenantId),
        lte(inventoryStock.expiryDate, futureDate.toISOString().split('T')[0])
      ))
      .orderBy(inventoryStock.expiryDate);
    return rows.map((r) => this.mergeStockWithItem(r.stock, r.item));
  }

  async getEquipmentDueForMaintenance(tenantId: string): Promise<EquipmentMaintenance[]> {
    const today = new Date().toISOString().split('T')[0];
    
    return db
      .select()
      .from(equipmentMaintenance)
      .where(and(
        eq(equipmentMaintenance.tenantId, tenantId),
        eq(equipmentMaintenance.status, 'scheduled'),
        lte(equipmentMaintenance.scheduledDate, today)
      ))
      .orderBy(equipmentMaintenance.scheduledDate);
  }



  async getPurchaseOrder(id: string, tenantId: string): Promise<(PurchaseOrder & { supplierName?: string }) | undefined> {
    const [row] = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, and(eq(purchaseOrders.supplierId, suppliers.id), eq(suppliers.tenantId, tenantId)))
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)));
    if (!row?.po) return undefined;
    return { ...row.po, supplierName: row.supplierName ?? undefined };
  }

  async getPurchaseOrders(tenantId: string, filters?: { status?: string; supplierId?: string }): Promise<(PurchaseOrder & { supplierName?: string })[]> {
    const conditions = [eq(purchaseOrders.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(purchaseOrders.status, filters.status as any));
    if (filters?.supplierId) conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
    const rows = await db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, and(eq(purchaseOrders.supplierId, suppliers.id), eq(suppliers.tenantId, tenantId)))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));
    return rows.map((r) => ({ ...r.po, supplierName: r.supplierName ?? undefined }));
  }

  async updatePurchaseOrder(id: string, purchaseOrderData: Partial<InsertPurchaseOrder>, tenantId: string): Promise<PurchaseOrder> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...purchaseOrderData, updatedAt: new Date() };
    if (updateData.orderDate instanceof Date) {
      updateData.orderDate = updateData.orderDate.toISOString().split('T')[0];
    }
    if (updateData.expectedDelivery instanceof Date) {
      updateData.expectedDelivery = updateData.expectedDelivery.toISOString().split('T')[0];
    }
    if (updateData.actualDelivery instanceof Date) {
      updateData.actualDelivery = updateData.actualDelivery.toISOString().split('T')[0];
    }
    
    const [purchaseOrder] = await db.update(purchaseOrders)
      .set(updateData)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();
    return purchaseOrder;
  }

  async deletePurchaseOrder(id: string, tenantId: string): Promise<void> {
    await db.delete(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)));
  }

  async receivePurchaseOrder(
    poId: string,
    receivedById: string,
    tenantId: string,
    options: { locationId?: string; items: Array<{ itemId: string; quantityReceived: number }> }
  ): Promise<PurchaseOrder | undefined> {
    const locationId = options.locationId ?? (await this.getPrimaryCareLocation(tenantId))?.id;
    if (!locationId) throw new Error("No receive location (set locationId or primary care location)");
    if (!options.items?.length) throw new Error("No items to receive");

    return await db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)));
      if (!po) return undefined;

      for (const { itemId: masterItemId, quantityReceived: qty } of options.items) {
        if (qty <= 0) continue;
        const [line] = await tx.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.poId, poId), eq(purchaseOrderItems.itemId, masterItemId), eq(purchaseOrderItems.tenantId, tenantId)));
        if (!line) continue;

        let [stockRow] = await tx.select().from(inventoryStock).where(and(eq(inventoryStock.tenantId, tenantId), eq(inventoryStock.itemId, masterItemId), eq(inventoryStock.locationId, locationId)));
        if (!stockRow) {
          const [created] = await tx.insert(inventoryStock).values({
            tenantId,
            itemId: masterItemId,
            locationId,
            currentStock: 0,
            minimumStock: 0,
            maximumStock: 100,
            reorderPoint: 10,
          }).returning();
          stockRow = created;
        }
        const prev = stockRow.currentStock ?? 0;
        const next = prev + qty;
        const unitCost = line.unitCost ?? undefined;
        const totalCost = unitCost ? (parseFloat(unitCost) * qty).toFixed(2) : undefined;

        await tx.insert(inventoryTransactions).values({
          tenantId,
          itemId: stockRow.id,
          locationId,
          transactionType: "receipt_external",
          quantity: qty,
          previousStock: prev,
          newStock: next,
          unitCost: unitCost ?? null,
          totalCost: totalCost ?? null,
          documentType: "purchase_order",
          documentId: poId,
          createdBy: receivedById,
        });
        // Last-cost valuation: receiving updates the stock row's unit cost from the PO line,
        // so pricing (POS reads stock.unitCost) and stock value reflect the latest purchase.
        const effectiveUnitCost = unitCost ?? stockRow.unitCost ?? null;
        await tx.update(inventoryStock).set({
          currentStock: next,
          unitCost: effectiveUnitCost,
          totalValue: effectiveUnitCost != null ? (parseFloat(effectiveUnitCost) * next).toFixed(2) : stockRow.totalValue,
          updatedAt: new Date(),
        }).where(and(eq(inventoryStock.id, stockRow.id), eq(inventoryStock.tenantId, tenantId)));
        const newReceived = (line.quantityReceived ?? 0) + qty;
        await tx.update(purchaseOrderItems).set({ quantityReceived: newReceived }).where(and(eq(purchaseOrderItems.id, line.id), eq(purchaseOrderItems.tenantId, tenantId)));
      }

      const lines = await tx.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.poId, poId), eq(purchaseOrderItems.tenantId, tenantId)));
      const allReceived = lines.every((l) => (l.quantityReceived ?? 0) >= (l.quantityOrdered ?? 0));
      const anyReceived = lines.some((l) => (l.quantityReceived ?? 0) > 0);
      const newStatus = allReceived ? "completed" : anyReceived ? "partially_received" : po.status;
      const [updated] = await tx.update(purchaseOrders).set({
        status: newStatus as any,
        actualDelivery: allReceived ? new Date().toISOString().split("T")[0] : po.actualDelivery,
        updatedAt: new Date(),
      }).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId))).returning();
      return updated;
    });
  }

  // Purchase order item operations
  async createPurchaseOrderItem(item: InsertPurchaseOrderItem, tenantId: string): Promise<PurchaseOrderItem> {
    const [newItem] = await db
      .insert(purchaseOrderItems)
      .values({ ...item, tenantId })
      .returning();
    return newItem;
  }

  async getPurchaseOrderItems(poId: string, tenantId: string): Promise<PurchaseOrderItem[]> {
    const results = await db.select({
      id: purchaseOrderItems.id,
      tenantId: purchaseOrderItems.tenantId,
      poId: purchaseOrderItems.poId,
      itemId: purchaseOrderItems.itemId,
      quantityOrdered: purchaseOrderItems.quantityOrdered,
      quantityReceived: purchaseOrderItems.quantityReceived,
      unitCost: purchaseOrderItems.unitCost,
      totalCost: purchaseOrderItems.totalCost,
      itemDescription: purchaseOrderItems.itemDescription,
      notes: purchaseOrderItems.notes,
      createdAt: purchaseOrderItems.createdAt,
    })
    .from(purchaseOrderItems)
    .where(and(eq(purchaseOrderItems.poId, poId), eq(purchaseOrderItems.tenantId, tenantId)));
    
    return results;
  }

  async updatePurchaseOrderItem(id: string, itemData: Partial<InsertPurchaseOrderItem>, tenantId: string): Promise<PurchaseOrderItem> {
    const [item] = await db.update(purchaseOrderItems)
      .set(itemData)
      .where(and(eq(purchaseOrderItems.id, id), eq(purchaseOrderItems.tenantId, tenantId)))
      .returning();
    return item;
  }

  async deletePurchaseOrderItem(id: string, tenantId: string): Promise<void> {
    await db.delete(purchaseOrderItems)
      .where(and(eq(purchaseOrderItems.id, id), eq(purchaseOrderItems.tenantId, tenantId)));
  }

  // Inventory Transaction operations with automatic stock adjustment
  async createInventoryTransaction(transactionData: InsertInventoryTransaction, tenantId: string): Promise<InventoryTransaction> {
    // Get current stock level
    const [item] = await db.select().from(inventoryStock)
      .where(and(eq(inventoryStock.id, transactionData.itemId), eq(inventoryStock.tenantId, tenantId)));
    
    if (!item) {
      throw new Error('Stock row not found');
    }
    
    const previousStock = item.currentStock ?? 0;
    let newStock = previousStock;
    
    // Normalise/migrate legacy transaction types if they ever appear
    let transactionType: any = transactionData.transactionType;
    if (transactionType === 'damage' || transactionType === 'expiry') {
      transactionType = 'disposal'; // Map damage/expiry to disposal
    }

    // Determine stock direction based on new explicit transaction types
    const inboundTypes = new Set<string>([
      'receipt_external',
      'receipt_transfer',
      'transfer_in',
      'adjustment_increase',
      'return_from_client',
      // Legacy
      'receipt',
      'return',
    ]);

    const outboundTypes = new Set<string>([
      'issue_to_client',
      'issue_internal',
      'transfer_out',
      'adjustment_decrease',
      'return_to_supplier',
      'disposal',
      // Legacy
      'issue',
      'transfer',
    ]);

    if (inboundTypes.has(transactionType)) {
      newStock = previousStock + transactionData.quantity;
    } else if (outboundTypes.has(transactionType)) {
      newStock = previousStock - transactionData.quantity;
    } else {
      // Fallback for any legacy/unknown type: do not change stock
      newStock = previousStock;
    }
    
    // Ensure stock doesn't go negative
    if (newStock < 0) {
      throw new Error('Insufficient stock for this transaction');
    }
    
    // Create transaction record with proper field mapping
    const [transaction] = await db.insert(inventoryTransactions).values({
      itemId: transactionData.itemId,
      transactionType: transactionType as any,
      quantity: transactionData.quantity,
      unitCost: transactionData.unitCost || null,
      totalCost: transactionData.totalCost || null,
      reference: transactionData.reference || null,
      reason: transactionData.reason || null,
      notes: transactionData.notes || null,
      locationId: transactionData.locationId ?? item.locationId ?? null,
      counterpartyLocationId: transactionData.counterpartyLocationId || null,
      // Patient linkage
      patientId: transactionData.patientId || null,
      // Document linkage
      documentType: transactionData.documentType || null,
      documentId: transactionData.documentId || null,
      createdBy: transactionData.createdBy,
      tenantId,
      previousStock,
      newStock
    }).returning();
    
    const [updatedStock] = await db.update(inventoryStock)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(and(eq(inventoryStock.id, transactionData.itemId), eq(inventoryStock.tenantId, tenantId)))
      .returning();
    if (updatedStock) {
      const [itemRow] = await db.select({ item: inventoryItems }).from(inventoryItems).where(and(eq(inventoryItems.id, updatedStock.itemId), eq(inventoryItems.tenantId, tenantId)));
      const merged = itemRow ? this.mergeStockWithItem(updatedStock, itemRow.item) : (updatedStock as unknown as MedicalInventory);
      this.checkAndCreateInventoryAlerts(merged, tenantId).catch(err => {
        console.error('Error checking inventory alerts after transaction:', err);
      });
    }
    
    return transaction;
  }

  async getInventoryTransactions(tenantId: string, itemId?: string, documentType?: string, documentId?: string): Promise<InventoryTransaction[]> {
    const conditions = [eq(inventoryTransactions.tenantId, tenantId)];
    
    if (itemId) {
      conditions.push(eq(inventoryTransactions.itemId, itemId));
    }
    if (documentType && documentId) {
      conditions.push(eq(inventoryTransactions.documentType, documentType));
      conditions.push(eq(inventoryTransactions.documentId, documentId));
    }
    
    const results = await db
      .select({
        id: inventoryTransactions.id,
        tenantId: inventoryTransactions.tenantId,
        itemId: inventoryTransactions.itemId,
        transactionType: inventoryTransactions.transactionType,
        quantity: inventoryTransactions.quantity,
        previousStock: inventoryTransactions.previousStock,
        newStock: inventoryTransactions.newStock,
        unitCost: inventoryTransactions.unitCost,
        totalCost: inventoryTransactions.totalCost,
        reference: inventoryTransactions.reference,
        reason: inventoryTransactions.reason,
        transactionDate: inventoryTransactions.transactionDate,
        notes: inventoryTransactions.notes,
        createdBy: inventoryTransactions.createdBy,
        createdAt: inventoryTransactions.createdAt,
        // New context fields
        locationId: inventoryTransactions.locationId,
        counterpartyLocationId: inventoryTransactions.counterpartyLocationId,
        patientId: inventoryTransactions.patientId,
        documentType: inventoryTransactions.documentType,
        documentId: inventoryTransactions.documentId,
        // Joined display fields expected by frontend
        itemName: inventoryItems.itemName,
        itemCode: inventoryItems.itemCode,
        createdByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(inventoryTransactions)
      .leftJoin(inventoryStock, eq(inventoryTransactions.itemId, inventoryStock.id))
      .leftJoin(inventoryItems, eq(inventoryStock.itemId, inventoryItems.id))
      .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryTransactions.createdAt));
    
    return results as unknown as InventoryTransaction[];
  }

  async listInventoryTransactionsInvolvingLocation(
    tenantId: string,
    locationId: string,
    options?: { limit?: number }
  ): Promise<
    Array<
      InventoryTransaction & {
        itemName?: string | null;
        itemCode?: string | null;
        createdByName?: string | null;
        locationName?: string | null;
        counterpartyLocationName?: string | null;
      }
    >
  > {
    const limitN = Math.min(Math.max(options?.limit ?? 40, 1), 100);
    const invTxLoc = alias(careLocations, "inv_tx_loc");
    const invTxCp = alias(careLocations, "inv_tx_cp");
    const locationCond = or(
      eq(inventoryTransactions.locationId, locationId),
      eq(inventoryTransactions.counterpartyLocationId, locationId)
    );

    const results = await db
      .select({
        id: inventoryTransactions.id,
        tenantId: inventoryTransactions.tenantId,
        itemId: inventoryTransactions.itemId,
        transactionType: inventoryTransactions.transactionType,
        quantity: inventoryTransactions.quantity,
        previousStock: inventoryTransactions.previousStock,
        newStock: inventoryTransactions.newStock,
        unitCost: inventoryTransactions.unitCost,
        totalCost: inventoryTransactions.totalCost,
        reference: inventoryTransactions.reference,
        reason: inventoryTransactions.reason,
        transactionDate: inventoryTransactions.transactionDate,
        notes: inventoryTransactions.notes,
        createdBy: inventoryTransactions.createdBy,
        createdAt: inventoryTransactions.createdAt,
        locationId: inventoryTransactions.locationId,
        counterpartyLocationId: inventoryTransactions.counterpartyLocationId,
        patientId: inventoryTransactions.patientId,
        documentType: inventoryTransactions.documentType,
        documentId: inventoryTransactions.documentId,
        itemName: inventoryItems.itemName,
        itemCode: inventoryItems.itemCode,
        createdByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        locationName: invTxLoc.locationName,
        counterpartyLocationName: invTxCp.locationName,
      })
      .from(inventoryTransactions)
      .leftJoin(inventoryStock, eq(inventoryTransactions.itemId, inventoryStock.id))
      .leftJoin(inventoryItems, eq(inventoryStock.itemId, inventoryItems.id))
      .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
      .leftJoin(invTxLoc, eq(inventoryTransactions.locationId, invTxLoc.id))
      .leftJoin(invTxCp, eq(inventoryTransactions.counterpartyLocationId, invTxCp.id))
      .where(and(eq(inventoryTransactions.tenantId, tenantId), locationCond))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(limitN);

    return results as Array<
      InventoryTransaction & {
        itemName?: string | null;
        itemCode?: string | null;
        createdByName?: string | null;
        locationName?: string | null;
        counterpartyLocationName?: string | null;
      }
    >;
  }

  async getInventoryTransactionsByType(tenantId: string, transactionType: string): Promise<InventoryTransaction[]> {
    return await db
      .select()
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.tenantId, tenantId),
          eq(inventoryTransactions.transactionType, transactionType as any),
        ),
      )
      .orderBy(desc(inventoryTransactions.createdAt));
  }

  async updateInventoryTransaction(id: string, transactionData: Partial<InsertInventoryTransaction>, tenantId: string): Promise<InventoryTransaction> {
    // Remove updatedAt since inventoryTransactions table doesn't have this field
    const { updatedAt, ...dataWithoutUpdatedAt } = transactionData as any;
    
    const [updatedTransaction] = await db
      .update(inventoryTransactions)
      .set(dataWithoutUpdatedAt)
      .where(and(
        eq(inventoryTransactions.id, id),
        eq(inventoryTransactions.tenantId, tenantId)
      ))
      .returning();
    return updatedTransaction;
  }

  async deleteInventoryTransaction(id: string, tenantId: string): Promise<void> {
    await db.delete(inventoryTransactions)
      .where(and(
        eq(inventoryTransactions.id, id),
        eq(inventoryTransactions.tenantId, tenantId)
      ));
  }

  // Stock requisitions
  async createStockRequisition(
    requisitionData: Omit<InsertStockRequisition, "id" | "tenantId" | "requestedAt" | "createdAt" | "updatedAt" | "status">,
    itemsData: Omit<InsertStockRequisitionItem, "id" | "tenantId" | "requisitionId" | "createdAt">[],
    tenantId: string
  ): Promise<StockRequisition & { items: StockRequisitionItem[] }> {
    return await db.transaction(async (tx) => {
      const [requisition] = await tx.insert(stockRequisitions).values({
        ...requisitionData,
        tenantId,
        status: "submitted",
      }).returning();

      const itemsToInsert = itemsData.map(item => ({
        ...item,
        tenantId,
        requisitionId: requisition.id,
      }));

      const insertedItems = itemsToInsert.length
        ? await tx.insert(stockRequisitionItems).values(itemsToInsert).returning()
        : [];

      return {
        ...requisition,
        items: insertedItems,
      };
    });
  }

  async getStockRequisitions(
    tenantId: string,
    filters?: { status?: string; requestingLocationId?: string; fulfillingLocationId?: string }
  ): Promise<(StockRequisition & { items?: StockRequisitionItem[] })[]> {
    const conditions = [eq(stockRequisitions.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(stockRequisitions.status, filters.status));
    }
    if (filters?.requestingLocationId) {
      conditions.push(eq(stockRequisitions.requestingLocationId, filters.requestingLocationId));
    }
    if (filters?.fulfillingLocationId) {
      conditions.push(eq(stockRequisitions.fulfillingLocationId, filters.fulfillingLocationId));
    }

    const requisitions = await db
      .select()
      .from(stockRequisitions)
      .where(and(...conditions))
      .orderBy(desc(stockRequisitions.createdAt));

    if (!requisitions.length) return [];

    const requisitionIds = requisitions.map(r => r.id);

    const items = await db
      .select()
      .from(stockRequisitionItems)
      .where(
        and(
          eq(stockRequisitionItems.tenantId, tenantId),
          inArray(stockRequisitionItems.requisitionId, requisitionIds),
        ),
      );

    const itemsByReq: Record<string, StockRequisitionItem[]> = {};
    for (const item of items) {
      if (!itemsByReq[item.requisitionId]) {
        itemsByReq[item.requisitionId] = [];
      }
      itemsByReq[item.requisitionId].push(item);
    }

    return requisitions.map(req => ({
      ...req,
      items: itemsByReq[req.id] || [],
    }));
  }

  async updateStockRequisition(
    id: string,
    data: Partial<InsertStockRequisition>,
    tenantId: string
  ): Promise<StockRequisition | undefined> {
    const [updated] = await db
      .update(stockRequisitions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(stockRequisitions.id, id), eq(stockRequisitions.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async getStockRequisitionById(
    id: string,
    tenantId: string
  ): Promise<(StockRequisition & { items: StockRequisitionItem[] }) | undefined> {
    const [req] = await db
      .select()
      .from(stockRequisitions)
      .where(and(eq(stockRequisitions.id, id), eq(stockRequisitions.tenantId, tenantId)));
    if (!req) return undefined;
    const items = await db
      .select()
      .from(stockRequisitionItems)
      .where(
        and(
          eq(stockRequisitionItems.requisitionId, id),
          eq(stockRequisitionItems.tenantId, tenantId),
        ),
      );
    return { ...req, items };
  }

  async updateStockRequisitionItems(
    requisitionId: string,
    tenantId: string,
    items: { itemId: string; requestedQuantity: number }[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(stockRequisitionItems)
        .where(
          and(
            eq(stockRequisitionItems.requisitionId, requisitionId),
            eq(stockRequisitionItems.tenantId, tenantId),
          ),
        );
      if (items.length) {
        const itemsToInsert = items.map((it) => ({
          tenantId,
          requisitionId,
          itemId: it.itemId,
          requestedQuantity: it.requestedQuantity,
        }));
        await tx.insert(stockRequisitionItems).values(itemsToInsert);
      }
    });
  }

  // Stock transfers
  async createStockTransfer(
    transferData: Omit<InsertStockTransfer, "id" | "tenantId" | "createdAt" | "updatedAt" | "dispatchedAt" | "receivedAt" | "status">,
    itemsData: Omit<InsertStockTransferItem, "id" | "tenantId" | "transferId" | "createdAt">[],
    tenantId: string
  ): Promise<StockTransfer & { items: StockTransferItem[] }> {
    return await db.transaction(async (tx) => {
      const [transfer] = await tx.insert(stockTransfers).values({
        ...transferData,
        tenantId,
        status: "pending_dispatch",
      }).returning();

      const itemsToInsert = itemsData.map(item => ({
        ...item,
        tenantId,
        transferId: transfer.id,
      }));

      const insertedItems = itemsToInsert.length
        ? await tx.insert(stockTransferItems).values(itemsToInsert).returning()
        : [];

      return {
        ...transfer,
        items: insertedItems,
      };
    });
  }

  async createStockTransferFromRequisition(
    requisitionId: string,
    approvedById: string,
    tenantId: string,
    overrides?: { itemId: string; approvedQuantity: number }[],
  ): Promise<StockTransfer & { items: StockTransferItem[] }> {
    return await db.transaction(async (tx) => {
      const [req] = await tx
        .select()
        .from(stockRequisitions)
        .where(
          and(
            eq(stockRequisitions.id, requisitionId),
            eq(stockRequisitions.tenantId, tenantId),
          ),
        );
      if (!req) throw new Error("Requisition not found");
      if (req.status !== "submitted") throw new Error("Requisition must be in submitted status to approve");

      const reqItems = await tx
        .select()
        .from(stockRequisitionItems)
        .where(
          and(
            eq(stockRequisitionItems.requisitionId, requisitionId),
            eq(stockRequisitionItems.tenantId, tenantId),
          ),
        );

      const overrideMap = new Map<string, number>();
      (overrides || []).forEach((o) => {
        if (o.itemId && typeof o.approvedQuantity === "number") {
          overrideMap.set(o.itemId, o.approvedQuantity);
        }
      });

      // Persist approved quantities on requisition items when overrides are provided
      if (overrideMap.size > 0) {
        for (const item of reqItems) {
          const approved = overrideMap.get(item.itemId);
          if (approved !== undefined) {
            await tx
              .update(stockRequisitionItems)
              .set({ approvedQuantity: approved })
              .where(
                and(
                  eq(stockRequisitionItems.id, item.id),
                  eq(stockRequisitionItems.tenantId, tenantId),
                ),
              );
          }
        }
      }

      const now = new Date();
      await tx
        .update(stockRequisitions)
        .set({
          status: "approved",
          approvedById,
          approvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(stockRequisitions.id, requisitionId),
            eq(stockRequisitions.tenantId, tenantId),
          ),
        );

      const [transfer] = await tx
        .insert(stockTransfers)
        .values({
          tenantId,
          fromLocationId: req.fulfillingLocationId,
          toLocationId: req.requestingLocationId,
          requisitionId: req.id,
          type: "normal",
          status: "pending_dispatch",
        })
        .returning();

      const transferItems = reqItems.map((r) => {
        const overrideQty = overrideMap.get(r.itemId);
        const quantityPlanned = overrideQty ?? r.approvedQuantity ?? r.requestedQuantity;
        return {
          tenantId,
          transferId: transfer.id,
          itemId: r.itemId,
          quantityPlanned,
          unitOfMeasure: r.unitOfMeasure ?? undefined,
          unitCost: r.unitCost ?? undefined,
        };
      });

      const inserted =
        transferItems.length > 0
          ? await tx.insert(stockTransferItems).values(transferItems).returning()
          : [];

      return { ...transfer, items: inserted };
    });
  }

  async getStockTransfers(
    tenantId: string,
    filters?: { status?: string; fromLocationId?: string; toLocationId?: string; requisitionId?: string }
  ): Promise<(StockTransfer & { items?: StockTransferItem[] })[]> {
    const conditions = [eq(stockTransfers.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(stockTransfers.status, filters.status));
    }
    if (filters?.fromLocationId) {
      conditions.push(eq(stockTransfers.fromLocationId, filters.fromLocationId));
    }
    if (filters?.toLocationId) {
      conditions.push(eq(stockTransfers.toLocationId, filters.toLocationId));
    }
    if (filters?.requisitionId) {
      conditions.push(eq(stockTransfers.requisitionId, filters.requisitionId));
    }

    const transfers = await db
      .select()
      .from(stockTransfers)
      .where(and(...conditions))
      .orderBy(desc(stockTransfers.createdAt));

    if (!transfers.length) return [];

    const transferIds = transfers.map(t => t.id);

    const items = await db
      .select()
      .from(stockTransferItems)
      .where(
        and(
          eq(stockTransferItems.tenantId, tenantId),
          inArray(stockTransferItems.transferId, transferIds),
        ),
      );

    const itemsByTransfer: Record<string, StockTransferItem[]> = {};
    for (const item of items) {
      if (!itemsByTransfer[item.transferId]) {
        itemsByTransfer[item.transferId] = [];
      }
      itemsByTransfer[item.transferId].push(item);
    }

    return transfers.map(t => ({
      ...t,
      items: itemsByTransfer[t.id] || [],
    }));
  }

  async updateStockTransfer(
    id: string,
    data: Partial<InsertStockTransfer>,
    tenantId: string
  ): Promise<StockTransfer | undefined> {
    const [updated] = await db
      .update(stockTransfers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async dispatchStockTransfer(
    id: string,
    dispatchedById: string,
    tenantId: string
  ): Promise<StockTransfer | undefined> {
    return await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(stockTransfers)
        .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)));
      if (!transfer) return undefined;

      const items = await tx
        .select()
        .from(stockTransferItems)
        .where(
          and(
            eq(stockTransferItems.transferId, id),
            eq(stockTransferItems.tenantId, tenantId),
          ),
        );

      const qty = (row: { quantityPlanned: number | null; quantityDispatched: number | null }) =>
        row.quantityDispatched ?? row.quantityPlanned ?? 0;

      for (const row of items) {
        const quantity = qty(row);
        if (quantity <= 0) continue;

        // row.itemId is master item id; find stock at fromLocation
        const [stockRow] = await tx
          .select()
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.tenantId, tenantId),
              eq(inventoryStock.itemId, row.itemId),
              eq(inventoryStock.locationId, transfer.fromLocationId),
            ),
          );
        if (!stockRow) throw new Error(`Stock for item ${row.itemId} not found at source location`);
        const prev = stockRow.currentStock ?? 0;
        const next = prev - quantity;
        if (next < 0) throw new Error(`Insufficient stock for item ${row.itemId}`);

        await tx.insert(inventoryTransactions).values({
          tenantId,
          itemId: stockRow.id,
          locationId: transfer.fromLocationId,
          counterpartyLocationId: transfer.toLocationId,
          transactionType: "transfer_out",
          quantity,
          previousStock: prev,
          newStock: next,
          documentType: "transfer",
          documentId: transfer.id,
          createdBy: dispatchedById,
        });
        await tx
          .update(inventoryStock)
          .set({ currentStock: next, updatedAt: new Date() })
          .where(
            and(
              eq(inventoryStock.id, stockRow.id),
              eq(inventoryStock.tenantId, tenantId),
            ),
          );
        await tx
          .update(stockTransferItems)
          .set({ quantityDispatched: quantity })
          .where(eq(stockTransferItems.id, row.id));
      }

      const now = new Date();
      const [updated] = await tx
        .update(stockTransfers)
        .set({
          status: "in_transit",
          dispatchedById,
          dispatchedAt: now,
          updatedAt: now,
        })
        .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)))
        .returning();
      return updated;
    });
  }

  async receiveStockTransfer(
    id: string,
    receivedById: string,
    tenantId: string
  ): Promise<StockTransfer | undefined> {
    return await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(stockTransfers)
        .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)));
      if (!transfer) return undefined;

      const items = await tx
        .select()
        .from(stockTransferItems)
        .where(
          and(
            eq(stockTransferItems.transferId, id),
            eq(stockTransferItems.tenantId, tenantId),
          ),
        );

      const qty = (row: { quantityDispatched: number | null; quantityReceived: number | null; quantityPlanned: number }) =>
        row.quantityReceived ?? row.quantityDispatched ?? row.quantityPlanned ?? 0;

      for (const row of items) {
        const quantity = qty(row);
        if (quantity <= 0) continue;

        // Find or create stock row for destination location
        let [stockRow] = await tx
          .select()
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.tenantId, tenantId),
              eq(inventoryStock.itemId, row.itemId),
              eq(inventoryStock.locationId, transfer.toLocationId),
            ),
          );
        if (!stockRow) {
          const [created] = await tx
            .insert(inventoryStock)
            .values({
              tenantId,
              itemId: row.itemId,
              locationId: transfer.toLocationId,
              currentStock: 0,
              minimumStock: 0,
              maximumStock: 100,
              reorderPoint: 10,
            })
            .returning();
          stockRow = created;
        }

        const prev = stockRow.currentStock ?? 0;
        const next = prev + quantity;

        await tx.insert(inventoryTransactions).values({
          tenantId,
          itemId: stockRow.id,
          locationId: transfer.toLocationId,
          counterpartyLocationId: transfer.fromLocationId,
          transactionType: "transfer_in",
          quantity,
          previousStock: prev,
          newStock: next,
          documentType: "transfer",
          documentId: transfer.id,
          createdBy: receivedById,
        });
        await tx
          .update(inventoryStock)
          .set({ currentStock: next, updatedAt: new Date() })
          .where(
            and(
              eq(inventoryStock.id, stockRow.id),
              eq(inventoryStock.tenantId, tenantId),
            ),
          );
        await tx
          .update(stockTransferItems)
          .set({ quantityReceived: quantity })
          .where(eq(stockTransferItems.id, row.id));
      }

      const now = new Date();
      const [updated] = await tx
        .update(stockTransfers)
        .set({
          status: "received",
          receivedById,
          receivedAt: now,
          updatedAt: now,
        })
        .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)))
        .returning();
      return updated;
    });
  }

  // ================================
  // Drug & Alcohol Testing Module Implementation
  // ================================

  // Testing Program operations
  async createTestingProgram(programData: InsertTestingProgram, tenantId: string): Promise<TestingProgram> {
    const [program] = await db
      .insert(testingPrograms)
      .values({ ...programData, tenantId })
      .returning();
    return program;
  }

  async getTestingProgram(id: string, tenantId: string): Promise<TestingProgram | undefined> {
    const [program] = await db
      .select()
      .from(testingPrograms)
      .where(and(eq(testingPrograms.id, id), eq(testingPrograms.tenantId, tenantId)));
    return program;
  }

  async getTestingPrograms(tenantId: string, filters?: { programType?: string; status?: string }): Promise<TestingProgram[]> {
    const conditions = [eq(testingPrograms.tenantId, tenantId)];
    
    if (filters?.programType) {
      conditions.push(eq(testingPrograms.programType, filters.programType as any));
    }
    // Note: testingPrograms table doesn't have a status field, so this filter is ignored
    // if (filters?.status) {
    //   conditions.push(eq(testingPrograms.status, filters.status as any));
    // }
    
    return await db
      .select()
      .from(testingPrograms)
      .where(and(...conditions))
      .orderBy(desc(testingPrograms.createdAt));
  }

  async updateTestingProgram(id: string, programData: Partial<InsertTestingProgram>, tenantId: string): Promise<TestingProgram> {
    // Convert Date objects to strings for date columns if any exist
    const updateData: any = { ...programData, updatedAt: new Date() };
    // Note: TestingProgram schema doesn't have date fields, but updatedAt is timestamp which is fine
    
    const [updatedProgram] = await db
      .update(testingPrograms)
      .set(updateData)
      .where(and(eq(testingPrograms.id, id), eq(testingPrograms.tenantId, tenantId)))
      .returning();
    return updatedProgram;
  }

  async deleteTestingProgram(id: string, tenantId: string): Promise<void> {
    await db.delete(testingPrograms)
      .where(and(eq(testingPrograms.id, id), eq(testingPrograms.tenantId, tenantId)));
  }

  // Drug & Alcohol Test operations
  // Drug test operations
  async createDrugTest(testData: InsertDrugTest, tenantId: string): Promise<DrugTest> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...testData, tenantId };
    if (insertData.scheduledDate instanceof Date) {
      insertData.scheduledDate = insertData.scheduledDate.toISOString().split('T')[0];
    }
    if (insertData.collectionDate instanceof Date) {
      insertData.collectionDate = insertData.collectionDate.toISOString().split('T')[0];
    }
    
    const [test] = await db
      .insert(drugTests)
      .values(insertData)
      .returning();
    return test;
  }

  async getDrugTest(id: string, tenantId: string): Promise<any | undefined> {
    const [test] = await db
      .select({
        id: drugTests.id,
        testNumber: drugTests.testNumber,
        employeeId: drugTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        patientId: drugTests.patientId,
        programId: drugTests.programId,
        testReason: drugTests.testReason,
        testMode: drugTests.testMode,
        specimenType: drugTests.specimenType,
        testingDevice: drugTests.testingDevice,
        scheduledDate: sql<string>`to_char(drug_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: drugTests.scheduledTime,
        collectionDate: sql<string>`to_char(drug_tests.collection_date, 'YYYY-MM-DD')`,
        collectionTime: drugTests.collectionTime,
        collectorName: drugTests.collectorName,
        collectionSite: drugTests.collectionSite,
        chainOfCustody: drugTests.chainOfCustody,
        testingLab: drugTests.testingLab,
        resultDate: drugTests.resultDate,
        drugResult: drugTests.drugResult,
        testResult: drugTests.drugResult,
        substancesDetected: drugTests.substancesDetected,
        cocResult: drugTests.cocResult,
        opiResult: drugTests.opiResult,
        thcResult: drugTests.thcResult,
        ampResult: drugTests.ampResult,
        metResult: drugTests.metResult,
        bzoResult: drugTests.bzoResult,
        mroReview: drugTests.mroReview,
        mroName: drugTests.mroName,
        mroNotes: drugTests.mroNotes,
        finalResult: drugTests.finalResult,
        disciplinaryAction: drugTests.disciplinaryAction,
        returnToDutyRequired: drugTests.returnToDutyRequired,
        followUpTestingRequired: drugTests.followUpTestingRequired,
        status: drugTests.status,
        notes: drugTests.notes,
        createdBy: drugTests.createdBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
        reviewedBy: drugTests.reviewedBy,
        createdAt: drugTests.createdAt,
        updatedAt: drugTests.updatedAt,
      })
      .from(drugTests)
      .leftJoin(employees, eq(drugTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`drug_tests.created_by = tester.id`)
      .where(and(eq(drugTests.id, id), eq(drugTests.tenantId, tenantId)));
    return test;
  }

  async getDrugTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<any[]> {
    const conditions = [eq(drugTests.tenantId, tenantId)];

    if (filters?.employeeId) {
      conditions.push(eq(drugTests.employeeId, filters.employeeId));
    }
    if (filters?.testType) {
      conditions.push(eq(drugTests.testingDevice, filters.testType as any));
    }
    if (filters?.result) {
      conditions.push(eq(drugTests.drugResult, filters.result as any));
    }
    if (filters?.programId) {
      conditions.push(eq(drugTests.programId, filters.programId));
    }
    if (filters?.dateFrom) {
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      conditions.push(gte(drugTests.collectionDate, dateFromStr));
    }
    if (filters?.dateTo) {
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      conditions.push(lte(drugTests.collectionDate, dateToStr));
    }

    const results = await db
      .select({
        id: drugTests.id,
        testNumber: drugTests.testNumber,
        employeeId: drugTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        patientId: drugTests.patientId,
        programId: drugTests.programId,
        testReason: drugTests.testReason,
        testMode: drugTests.testMode,
        specimenType: drugTests.specimenType,
        testingDevice: drugTests.testingDevice,
        scheduledDate: sql<string>`to_char(drug_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: drugTests.scheduledTime,
        collectionDate: sql<string>`to_char(drug_tests.collection_date, 'YYYY-MM-DD')`,
        collectionTime: drugTests.collectionTime,
        collectorName: drugTests.collectorName,
        collectionSite: drugTests.collectionSite,
        chainOfCustody: drugTests.chainOfCustody,
        testingLab: drugTests.testingLab,
        resultDate: drugTests.resultDate,
        drugResult: drugTests.drugResult,
        testResult: drugTests.drugResult,
        substancesDetected: drugTests.substancesDetected,
        cocResult: drugTests.cocResult,
        opiResult: drugTests.opiResult,
        thcResult: drugTests.thcResult,
        ampResult: drugTests.ampResult,
        metResult: drugTests.metResult,
        bzoResult: drugTests.bzoResult,
        mroReview: drugTests.mroReview,
        mroName: drugTests.mroName,
        mroNotes: drugTests.mroNotes,
        finalResult: drugTests.finalResult,
        disciplinaryAction: drugTests.disciplinaryAction,
        returnToDutyRequired: drugTests.returnToDutyRequired,
        followUpTestingRequired: drugTests.followUpTestingRequired,
        status: drugTests.status,
        notes: drugTests.notes,
        createdBy: drugTests.createdBy,
        reviewedBy: drugTests.reviewedBy,
        createdAt: drugTests.createdAt,
        updatedAt: drugTests.updatedAt,
        testedBy: drugTests.createdBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
      })
      .from(drugTests)
      .leftJoin(employees, eq(drugTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`drug_tests.created_by = tester.id`)
      .where(and(...conditions))
      .orderBy(desc(drugTests.collectionDate));

    return results;
  }

  async updateDrugTest(id: string, testData: Partial<InsertDrugTest>, tenantId: string, userId?: string): Promise<DrugTest> {
    // Fetch original data for audit logging
    const [originalTest] = await db
      .select()
      .from(drugTests)
      .where(and(eq(drugTests.id, id), eq(drugTests.tenantId, tenantId)));

    // Log the update for audit trail
    if (userId && originalTest) {
      await this.auditBeforeOperation(
        'update',
        'drug_test',
        id,
        userId,
        tenantId,
        originalTest,
        { updatedFields: Object.keys(testData) }
      );
    }

    // Convert Date objects to strings for date columns
    const updateData: any = { ...testData, updatedAt: new Date() };
    if (updateData.collectionDate instanceof Date) {
      updateData.collectionDate = updateData.collectionDate.toISOString().split('T')[0];
    }
    if (updateData.scheduledDate instanceof Date) {
      updateData.scheduledDate = updateData.scheduledDate.toISOString().split('T')[0];
    }
    
    const [updatedTest] = await db
      .update(drugTests)
      .set(updateData)
      .where(and(eq(drugTests.id, id), eq(drugTests.tenantId, tenantId)))
      .returning();
    return updatedTest;
  }

  async deleteDrugTest(id: string, tenantId: string): Promise<void> {
    await db.delete(drugTests)
      .where(and(eq(drugTests.id, id), eq(drugTests.tenantId, tenantId)));
  }

  // Alcohol test operations
  async createAlcoholTest(testData: InsertAlcoholTest, tenantId: string): Promise<AlcoholTest> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...testData, tenantId };
    if (insertData.scheduledDate instanceof Date) {
      insertData.scheduledDate = insertData.scheduledDate.toISOString().split('T')[0];
    }
    if (insertData.testDate instanceof Date) {
      insertData.testDate = insertData.testDate.toISOString().split('T')[0];
    }
    
    const [test] = await db
      .insert(alcoholTests)
      .values(insertData)
      .returning();
    return test;
  }

  async getAlcoholTest(id: string, tenantId: string): Promise<any | undefined> {
    const [test] = await db
      .select({
        id: alcoholTests.id,
        testNumber: alcoholTests.testNumber,
        employeeId: alcoholTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        patientId: alcoholTests.patientId,
        programId: alcoholTests.programId,
        testReason: alcoholTests.testReason,
        testMode: alcoholTests.testMode,
        testingDevice: alcoholTests.testingDevice,
        scheduledDate: sql<string>`to_char(alcohol_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: alcoholTests.scheduledTime,
        testDate: sql<string>`to_char(alcohol_tests.test_date, 'YYYY-MM-DD')`,
        testTime: alcoholTests.testTime,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
        testLocation: alcoholTests.testLocation,
        alcoholResult: alcoholTests.alcoholResult,
        testResult: alcoholTests.alcoholResult,
        alcoholLevel: alcoholTests.alcoholLevel,
        breathalyzerReading: alcoholTests.breathalyzerReading,
        deviceSerialNumber: alcoholTests.deviceSerialNumber,
        labResult: alcoholTests.labResult,
        labAlcoholLevel: alcoholTests.labAlcoholLevel,
        finalResult: alcoholTests.finalResult,
        disciplinaryAction: alcoholTests.disciplinaryAction,
        returnToDutyRequired: alcoholTests.returnToDutyRequired,
        followUpTestingRequired: alcoholTests.followUpTestingRequired,
        status: alcoholTests.status,
        notes: alcoholTests.notes,
        createdBy: alcoholTests.createdBy,
        reviewedBy: alcoholTests.reviewedBy,
        createdAt: alcoholTests.createdAt,
        updatedAt: alcoholTests.updatedAt,
        collectionDate: sql<string>`to_char(alcohol_tests.test_date, 'YYYY-MM-DD')`,
        collectionTime: alcoholTests.testTime,
      })
      .from(alcoholTests)
      .leftJoin(employees, eq(alcoholTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`alcohol_tests.created_by = tester.id`)
      .where(and(eq(alcoholTests.id, id), eq(alcoholTests.tenantId, tenantId)));
    return test;
  }

  async getAlcoholTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<any[]> {
    const conditions = [eq(alcoholTests.tenantId, tenantId)];

    if (filters?.employeeId) {
      conditions.push(eq(alcoholTests.employeeId, filters.employeeId));
    }
    if (filters?.testType) {
      conditions.push(eq(alcoholTests.testingDevice, filters.testType as any));
    }
    if (filters?.result) {
      conditions.push(eq(alcoholTests.alcoholResult, filters.result as any));
    }
    if (filters?.programId) {
      conditions.push(eq(alcoholTests.programId, filters.programId));
    }
    if (filters?.dateFrom) {
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      conditions.push(gte(alcoholTests.testDate, dateFromStr));
    }
    if (filters?.dateTo) {
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      conditions.push(lte(alcoholTests.testDate, dateToStr));
    }

    const results = await db
      .select({
        id: alcoholTests.id,
        testNumber: alcoholTests.testNumber,
        employeeId: alcoholTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        testReason: alcoholTests.testReason,
        scheduledDate: sql<string>`to_char(alcohol_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: alcoholTests.scheduledTime,
        testDate: sql<string>`to_char(alcohol_tests.test_date, 'YYYY-MM-DD')`,
        testTime: alcoholTests.testTime,
        collectionDate: sql<string>`to_char(alcohol_tests.test_date, 'YYYY-MM-DD')`,
        collectionTime: alcoholTests.testTime,
        testingDevice: alcoholTests.testingDevice,
        alcoholResult: alcoholTests.alcoholResult,
        testResult: alcoholTests.alcoholResult,
        alcoholLevel: alcoholTests.alcoholLevel,
        breathalyzerReading: alcoholTests.breathalyzerReading,
        status: alcoholTests.status,
        notes: alcoholTests.notes,
        createdAt: alcoholTests.createdAt,
        testedBy: alcoholTests.createdBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
      })
      .from(alcoholTests)
      .leftJoin(employees, eq(alcoholTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`alcohol_tests.created_by = tester.id`)
      .where(and(...conditions))
      .orderBy(desc(alcoholTests.testDate));

    return results;
  }

  async updateAlcoholTest(id: string, testData: Partial<InsertAlcoholTest>, tenantId: string, userId?: string): Promise<AlcoholTest> {
    // Fetch original data for audit logging
    const [originalTest] = await db
      .select()
      .from(alcoholTests)
      .where(and(eq(alcoholTests.id, id), eq(alcoholTests.tenantId, tenantId)));

    // Log the update for audit trail
    if (userId && originalTest) {
      await this.auditBeforeOperation(
        'update',
        'alcohol_test',
        id,
        userId,
        tenantId,
        originalTest,
        { updatedFields: Object.keys(testData) }
      );
    }

    // Convert Date objects to strings for date columns
    const updateData: any = { ...testData, updatedAt: new Date() };
    if (updateData.testDate instanceof Date) {
      updateData.testDate = updateData.testDate.toISOString().split('T')[0];
    }
    if (updateData.scheduledDate instanceof Date) {
      updateData.scheduledDate = updateData.scheduledDate.toISOString().split('T')[0];
    }
    
    const [updatedTest] = await db
      .update(alcoholTests)
      .set(updateData)
      .where(and(eq(alcoholTests.id, id), eq(alcoholTests.tenantId, tenantId)))
      .returning();
    return updatedTest;
  }

  async deleteAlcoholTest(id: string, tenantId: string): Promise<void> {
    await db.delete(alcoholTests)
      .where(and(eq(alcoholTests.id, id), eq(alcoholTests.tenantId, tenantId)));
  }

  // Hydration test operations
  async createHydrationTest(testData: InsertHydrationTest, tenantId: string): Promise<HydrationTest> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...testData, tenantId };
    if (insertData.scheduledDate instanceof Date) {
      insertData.scheduledDate = insertData.scheduledDate.toISOString().split('T')[0];
    }
    if (insertData.testDate instanceof Date) {
      insertData.testDate = insertData.testDate.toISOString().split('T')[0];
    }
    if (insertData.followUpDate instanceof Date) {
      insertData.followUpDate = insertData.followUpDate.toISOString().split('T')[0];
    }
    
    const [test] = await db
      .insert(hydrationTests)
      .values(insertData)
      .returning();
    return test;
  }

  async getHydrationTest(id: string, tenantId: string): Promise<any | undefined> {
    const [test] = await db
      .select({
        id: hydrationTests.id,
        testNumber: hydrationTests.testNumber,
        employeeId: hydrationTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        patientId: hydrationTests.patientId,
        programId: hydrationTests.programId,
        testReason: hydrationTests.testReason,
        testLocation: hydrationTests.testLocation,
        ugPersonnel: hydrationTests.ugPersonnel,
        scheduledDate: sql<string>`to_char(hydration_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: hydrationTests.scheduledTime,
        testDate: sql<string>`to_char(hydration_tests.test_date, 'YYYY-MM-DD')`,
        testTime: hydrationTests.testTime,
        collectionDate: sql<string>`to_char(hydration_tests.test_date, 'YYYY-MM-DD')`, // Map testDate to collectionDate for frontend compatibility
        collectionTime: hydrationTests.testTime, // Map testTime to collectionTime for frontend compatibility
        ambientTemperature: hydrationTests.ambientTemperature,
        humidity: hydrationTests.humidity,
        workIntensity: hydrationTests.workIntensity,
        urineColor: hydrationTests.urineColor,
        urineSpecificGravity: hydrationTests.urineSpecificGravity,
        specificGravity: hydrationTests.urineSpecificGravity, // Alias for frontend compatibility
        bodyWeightBefore: hydrationTests.bodyWeightBefore,
        bodyWeightAfter: hydrationTests.bodyWeightAfter,
        weightLossPercentage: hydrationTests.weightLossPercentage,
        skinTurgor: hydrationTests.skinTurgor,
        mucousMembranes: hydrationTests.mucousMembranes,
        mentalStatus: hydrationTests.mentalStatus,
        vitalSigns: hydrationTests.vitalSigns,
        hydrationLevel: hydrationTests.hydrationLevel,
        hydrationScore: hydrationTests.hydrationScore,
        recommendedAction: hydrationTests.recommendedAction,
        treatmentProvided: hydrationTests.treatmentProvided,
        treatmentNotes: hydrationTests.treatmentNotes,
        returnToWorkCleared: hydrationTests.returnToWorkCleared,
        followUpRequired: hydrationTests.followUpRequired,
        followUpDate: hydrationTests.followUpDate,
        status: hydrationTests.status,
        notes: hydrationTests.notes,
        testedBy: hydrationTests.testedBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
        reviewedBy: hydrationTests.reviewedBy,
        createdAt: hydrationTests.createdAt,
        updatedAt: hydrationTests.updatedAt,
      })
      .from(hydrationTests)
      .leftJoin(employees, eq(hydrationTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`hydration_tests.tested_by = tester.id`)
      .where(and(eq(hydrationTests.id, id), eq(hydrationTests.tenantId, tenantId)));
    return test;
  }

  async getHydrationTests(tenantId: string, filters?: { 
    employeeId?: string; 
    testType?: string; 
    result?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    programId?: string;
  }): Promise<any[]> {
    const conditions = [eq(hydrationTests.tenantId, tenantId)];

    if (filters?.employeeId) {
      conditions.push(eq(hydrationTests.employeeId, filters.employeeId));
    }
    if (filters?.result) {
      conditions.push(eq(hydrationTests.hydrationLevel, filters.result as any));
    }
    if (filters?.programId) {
      conditions.push(eq(hydrationTests.programId, filters.programId));
    }
    if (filters?.dateFrom) {
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      conditions.push(gte(hydrationTests.testDate, dateFromStr));
    }
    if (filters?.dateTo) {
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      conditions.push(lte(hydrationTests.testDate, dateToStr));
    }

    const results = await db
      .select({
        id: hydrationTests.id,
        testNumber: hydrationTests.testNumber,
        employeeId: hydrationTests.employeeId,
        employeeName: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
        employeeNumber: employees.employeeNumber,
        testReason: hydrationTests.testReason,
        scheduledDate: sql<string>`to_char(hydration_tests.scheduled_date, 'YYYY-MM-DD')`,
        scheduledTime: hydrationTests.scheduledTime,
        testDate: sql<string>`to_char(hydration_tests.test_date, 'YYYY-MM-DD')`,
        testTime: hydrationTests.testTime,
        collectionDate: sql<string>`to_char(hydration_tests.test_date, 'YYYY-MM-DD')`,
        collectionTime: hydrationTests.testTime,
        testLocation: hydrationTests.testLocation,
        urineSpecificGravity: hydrationTests.urineSpecificGravity,
        specificGravity: hydrationTests.urineSpecificGravity,
        hydrationLevel: hydrationTests.hydrationLevel,
        recommendedAction: hydrationTests.recommendedAction,
        status: hydrationTests.status,
        notes: hydrationTests.notes,
        createdAt: hydrationTests.createdAt,
        testedBy: hydrationTests.testedBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
      })
      .from(hydrationTests)
      .leftJoin(employees, eq(hydrationTests.employeeId, employees.id))
      .leftJoin(sql`users as tester`, sql`hydration_tests.tested_by = tester.id`)
      .where(and(...conditions))
      .orderBy(desc(hydrationTests.testDate));

    return results;
  }

  async updateHydrationTest(id: string, testData: Partial<InsertHydrationTest>, tenantId: string, userId?: string): Promise<HydrationTest> {
    // Fetch original data for audit logging
    const [originalTest] = await db
      .select()
      .from(hydrationTests)
      .where(and(eq(hydrationTests.id, id), eq(hydrationTests.tenantId, tenantId)));

    // Log the update for audit trail
    if (userId && originalTest) {
      await this.auditBeforeOperation(
        'update',
        'hydration_test',
        id,
        userId,
        tenantId,
        originalTest,
        { updatedFields: Object.keys(testData) }
      );
    }

    // Convert Date objects to strings for date columns
    const updateData: any = { ...testData, updatedAt: new Date() };
    if (updateData.testDate instanceof Date) {
      updateData.testDate = updateData.testDate.toISOString().split('T')[0];
    }
    if (updateData.scheduledDate instanceof Date) {
      updateData.scheduledDate = updateData.scheduledDate.toISOString().split('T')[0];
    }
    if (updateData.followUpDate instanceof Date) {
      updateData.followUpDate = updateData.followUpDate.toISOString().split('T')[0];
    }
    
    const [updatedTest] = await db
      .update(hydrationTests)
      .set(updateData)
      .where(and(eq(hydrationTests.id, id), eq(hydrationTests.tenantId, tenantId)))
      .returning();
    return updatedTest;
  }

  async deleteHydrationTest(id: string, tenantId: string): Promise<void> {
    await db.delete(hydrationTests)
      .where(and(eq(hydrationTests.id, id), eq(hydrationTests.tenantId, tenantId)));
  }

  // Instant Tests (HB, Pregnancy, Malaria, Typhoid) operations
  async createInstantTest(testData: InsertInstantTest, tenantId: string): Promise<InstantTest> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...testData, tenantId };
    if (insertData.testDate instanceof Date) {
      insertData.testDate = insertData.testDate.toISOString().split('T')[0];
    }
    
    const [test] = await db
      .insert(instantTests)
      .values(insertData)
      .returning();
    return test;
  }

  async getInstantTest(id: string, tenantId: string): Promise<any | undefined> {
    const [test] = await db
      .select({
        id: instantTests.id,
        testNumber: instantTests.testNumber,
        customerId: instantTests.customerId,
        customerName: sql<string>`NULLIF(TRIM(${customers.firstName} || ' ' || ${customers.lastName}), '')`,
        customerNumber: customers.customerNumber,
        employeeId: instantTests.employeeId,
        employeeName: sql<string>`NULLIF(TRIM(${employees.firstName} || ' ' || ${employees.lastName}), '')`,
        employeeNumber: employees.employeeNumber,
        patientId: instantTests.patientId,
        locationId: instantTests.locationId,
        locationName: careLocations.locationName,
        locationCode: careLocations.locationCode,
        testType: instantTests.testType,
        testDate: sql<string>`to_char(instant_tests.test_date, 'YYYY-MM-DD')`,
        testTime: instantTests.testTime,
        testResult: instantTests.testResult,
        hbLevel: instantTests.hbLevel,
        notes: instantTests.notes,
        testedBy: instantTests.testedBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
        createdBy: instantTests.createdBy,
        createdAt: instantTests.createdAt,
        updatedAt: instantTests.updatedAt,
      })
      .from(instantTests)
      .leftJoin(customers, eq(instantTests.customerId, customers.id))
      .leftJoin(employees, eq(instantTests.employeeId, employees.id))
      .leftJoin(careLocations, eq(instantTests.locationId, careLocations.id))
      .leftJoin(sql`users as tester`, sql`instant_tests.tested_by = tester.id`)
      .where(and(eq(instantTests.id, id), eq(instantTests.tenantId, tenantId)));
    return test;
  }

  async getInstantTests(tenantId: string, filters?: { 
    employeeId?: string;
    customerId?: string;
    testType?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
  }): Promise<any[]> {
    const conditions = [eq(instantTests.tenantId, tenantId)];
    
    if (filters?.employeeId) {
      conditions.push(eq(instantTests.employeeId, filters.employeeId));
    }
    if (filters?.customerId) {
      conditions.push(eq(instantTests.customerId, filters.customerId));
    }
    if (filters?.testType) {
      conditions.push(eq(instantTests.testType, filters.testType as any));
    }
    if (filters?.dateFrom) {
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      conditions.push(gte(instantTests.testDate, dateFromStr));
    }
    if (filters?.dateTo) {
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      conditions.push(lte(instantTests.testDate, dateToStr));
    }
    
    const results = await db
      .select({
        id: instantTests.id,
        testNumber: instantTests.testNumber,
        customerId: instantTests.customerId,
        customerName: sql<string>`NULLIF(TRIM(${customers.firstName} || ' ' || ${customers.lastName}), '')`,
        customerNumber: customers.customerNumber,
        employeeId: instantTests.employeeId,
        employeeName: sql<string>`NULLIF(TRIM(${employees.firstName} || ' ' || ${employees.lastName}), '')`,
        employeeNumber: employees.employeeNumber,
        testType: instantTests.testType,
        testDate: sql<string>`to_char(instant_tests.test_date, 'YYYY-MM-DD')`,
        testTime: instantTests.testTime,
        locationId: instantTests.locationId,
        locationName: careLocations.locationName,
        locationCode: careLocations.locationCode,
        testResult: instantTests.testResult,
        hbLevel: instantTests.hbLevel,
        notes: instantTests.notes,
        testedBy: instantTests.testedBy,
        testerName: sql<string>`tester.first_name || ' ' || tester.last_name`,
        createdAt: instantTests.createdAt,
      })
      .from(instantTests)
      .leftJoin(customers, eq(instantTests.customerId, customers.id))
      .leftJoin(employees, eq(instantTests.employeeId, employees.id))
      .leftJoin(careLocations, eq(instantTests.locationId, careLocations.id))
      .leftJoin(sql`users as tester`, sql`instant_tests.tested_by = tester.id`)
      .where(and(...conditions))
      .orderBy(desc(instantTests.testDate));
    
    return results;
  }

  async updateInstantTest(id: string, testData: Partial<InsertInstantTest>, tenantId: string, userId?: string): Promise<InstantTest> {
    // Fetch original data for audit logging
    const [originalTest] = await db
      .select()
      .from(instantTests)
      .where(and(eq(instantTests.id, id), eq(instantTests.tenantId, tenantId)));

    // Log the update for audit trail
    if (userId && originalTest) {
      await this.auditBeforeOperation(
        'update',
        'instant_test',
        id,
        userId,
        tenantId,
        originalTest,
        { updatedFields: Object.keys(testData) }
      );
    }

    // Convert Date objects to strings for date columns
    const updateData: any = { ...testData, updatedAt: new Date() };
    if (updateData.testDate instanceof Date) {
      updateData.testDate = updateData.testDate.toISOString().split('T')[0];
    }
    
    const [updatedTest] = await db
      .update(instantTests)
      .set(updateData)
      .where(and(eq(instantTests.id, id), eq(instantTests.tenantId, tenantId)))
      .returning();
    return updatedTest;
  }

  async deleteInstantTest(id: string, tenantId: string): Promise<void> {
    await db.delete(instantTests)
      .where(and(eq(instantTests.id, id), eq(instantTests.tenantId, tenantId)));
  }
  
  // Combined test history for employees
  async getEmployeeTestHistory(employeeId: string, tenantId: string): Promise<{ 
    drugTests: DrugTest[]; 
    alcoholTests: AlcoholTest[]; 
    hydrationTests: HydrationTest[]; 
  }> {
    const [drugTestsResults, alcoholTestsResults, hydrationTestsResults] = await Promise.all([
      db.select()
        .from(drugTests)
        .where(and(
          eq(drugTests.tenantId, tenantId),
          eq(drugTests.employeeId, employeeId)
        ))
        .orderBy(desc(drugTests.scheduledDate)),
      
      db.select()
        .from(alcoholTests)
        .where(and(
          eq(alcoholTests.tenantId, tenantId),
          eq(alcoholTests.employeeId, employeeId)
        ))
        .orderBy(desc(alcoholTests.scheduledDate)),
        
      db.select()
        .from(hydrationTests)
        .where(and(
          eq(hydrationTests.tenantId, tenantId),
          eq(hydrationTests.employeeId, employeeId)
        ))
        .orderBy(desc(hydrationTests.scheduledDate))
    ]);

    return {
      drugTests: drugTestsResults,
      alcoholTests: alcoholTestsResults,
      hydrationTests: hydrationTestsResults
    };
  }

  // Random Testing Pool operations
  async createRandomTestingPool(poolData: InsertRandomTestingPool, tenantId: string): Promise<RandomTestingPool> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...poolData, tenantId };
    if (insertData.lastSelectionDate instanceof Date) {
      insertData.lastSelectionDate = insertData.lastSelectionDate.toISOString().split('T')[0];
    }
    if (insertData.nextSelectionDate instanceof Date) {
      insertData.nextSelectionDate = insertData.nextSelectionDate.toISOString().split('T')[0];
    }
    
    const [pool] = await db
      .insert(randomTestingPools)
      .values(insertData)
      .returning();
    return pool;
  }

  async getRandomTestingPool(id: string, tenantId: string): Promise<RandomTestingPool | undefined> {
    const [pool] = await db
      .select()
      .from(randomTestingPools)
      .where(and(eq(randomTestingPools.id, id), eq(randomTestingPools.tenantId, tenantId)));
    return pool;
  }

  async getRandomTestingPools(tenantId: string, filters?: { department?: string; active?: boolean }): Promise<RandomTestingPool[]> {
    const conditions = [eq(randomTestingPools.tenantId, tenantId)];
    
    if (filters?.department) {
      conditions.push(eq(randomTestingPools.department, filters.department as any));
    }
    if (filters?.active !== undefined) {
      conditions.push(eq(randomTestingPools.active, filters.active));
    }
    
    return await db
      .select()
      .from(randomTestingPools)
      .where(and(...conditions))
      .orderBy(desc(randomTestingPools.createdAt));
  }

  async updateRandomTestingPool(id: string, poolData: Partial<InsertRandomTestingPool>, tenantId: string): Promise<RandomTestingPool> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...poolData, updatedAt: new Date() };
    if (updateData.lastSelectionDate instanceof Date) {
      updateData.lastSelectionDate = updateData.lastSelectionDate.toISOString().split('T')[0];
    }
    if (updateData.nextSelectionDate instanceof Date) {
      updateData.nextSelectionDate = updateData.nextSelectionDate.toISOString().split('T')[0];
    }
    
    const [updatedPool] = await db
      .update(randomTestingPools)
      .set(updateData)
      .where(and(eq(randomTestingPools.id, id), eq(randomTestingPools.tenantId, tenantId)))
      .returning();
    return updatedPool;
  }

  async deleteRandomTestingPool(id: string, tenantId: string): Promise<void> {
    await db.delete(randomTestingPools)
      .where(and(eq(randomTestingPools.id, id), eq(randomTestingPools.tenantId, tenantId)));
  }

  // Random Selection operations
  async createRandomSelection(selectionData: InsertRandomSelection, tenantId: string): Promise<RandomSelection> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...selectionData, tenantId };
    if (insertData.selectionDate instanceof Date) {
      insertData.selectionDate = insertData.selectionDate.toISOString().split('T')[0];
    }
    
    const [selection] = await db
      .insert(randomSelections)
      .values(insertData)
      .returning();
    return selection;
  }

  async getRandomSelection(id: string, tenantId: string): Promise<RandomSelection | undefined> {
    const [selection] = await db
      .select()
      .from(randomSelections)
      .where(and(eq(randomSelections.id, id), eq(randomSelections.tenantId, tenantId)));
    return selection;
  }

  async getRandomSelections(tenantId: string, filters?: { 
    poolId?: string; 
    employeeId?: string; 
    dateFrom?: Date; 
    dateTo?: Date;
    testCompleted?: boolean;
  }): Promise<RandomSelection[]> {
    const conditions = [eq(randomSelections.tenantId, tenantId)];
    
    if (filters?.poolId) {
      conditions.push(eq(randomSelections.poolId, filters.poolId));
    }
    if (filters?.employeeId) {
      conditions.push(eq(randomSelections.employeeId, filters.employeeId));
    }
    if (filters?.testCompleted !== undefined) {
      conditions.push(eq(randomSelections.testCompleted, filters.testCompleted));
    }
    if (filters?.dateFrom) {
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      conditions.push(gte(randomSelections.selectionDate, dateFromStr));
    }
    if (filters?.dateTo) {
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      conditions.push(lte(randomSelections.selectionDate, dateToStr));
    }
    
    return await db
      .select()
      .from(randomSelections)
      .where(and(...conditions))
      .orderBy(desc(randomSelections.selectionDate));
  }

  async updateRandomSelection(id: string, selectionData: Partial<InsertRandomSelection>, tenantId: string): Promise<RandomSelection> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...selectionData };
    if (updateData.selectionDate instanceof Date) {
      updateData.selectionDate = updateData.selectionDate.toISOString().split('T')[0];
    }
    
    const [updatedSelection] = await db
      .update(randomSelections)
      .set(updateData)
      .where(and(eq(randomSelections.id, id), eq(randomSelections.tenantId, tenantId)))
      .returning();
    return updatedSelection;
  }

  async deleteRandomSelection(id: string, tenantId: string): Promise<void> {
    await db.delete(randomSelections)
      .where(and(eq(randomSelections.id, id), eq(randomSelections.tenantId, tenantId)));
  }

  async generateRandomSelections(poolId: string, selectionCount: number, tenantId: string): Promise<RandomSelection[]> {
    // Get all eligible employees from the pool
    const pool = await this.getRandomTestingPool(poolId, tenantId);
    if (!pool) {
      throw new Error('Testing pool not found');
    }

    // Get employees from the specified department/classification
    let employees = await this.getEmployees(tenantId);
    if (pool.department) {
      employees = employees.filter(emp => emp.department === pool.department);
    }
    if (pool.jobClassification) {
      employees = employees.filter(emp => emp.jobTitle === pool.jobClassification);
    }

    // Randomly select employees
    const selectedEmployees = employees
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(selectionCount, employees.length));

    // Create random selections
    const today = new Date().toISOString().split('T')[0];
    const selections = await Promise.all(
      selectedEmployees.map(emp => 
        this.createRandomSelection({
          poolId,
          employeeId: emp.id,
          selectionDate: today as any,
          selectedForTesting: true,
          testCompleted: false,
          selectionMethod: 'random',
        }, tenantId)
      )
    );

    return selections;
  }

  // Testing Equipment operations
  async createTestingEquipment(equipmentData: InsertTestingEquipment, tenantId: string): Promise<TestingEquipment> {
    // Convert Date objects to strings for date columns
    const insertData: any = { ...equipmentData, tenantId };
    if (insertData.lastCalibrationDate instanceof Date) {
      insertData.lastCalibrationDate = insertData.lastCalibrationDate.toISOString().split('T')[0];
    }
    if (insertData.nextCalibrationDate instanceof Date) {
      insertData.nextCalibrationDate = insertData.nextCalibrationDate.toISOString().split('T')[0];
    }
    
    const [equipment] = await db
      .insert(testingEquipment)
      .values(insertData)
      .returning();
    return equipment;
  }

  async getTestingEquipment(id: string, tenantId: string): Promise<TestingEquipment | undefined> {
    const [equipment] = await db
      .select()
      .from(testingEquipment)
      .where(and(eq(testingEquipment.id, id), eq(testingEquipment.tenantId, tenantId)));
    return equipment;
  }

  async getTestingEquipmentList(tenantId: string, filters?: { 
    deviceType?: string; 
    status?: string; 
    location?: string;
    calibrationDue?: boolean;
  }): Promise<TestingEquipment[]> {
    const conditions = [eq(testingEquipment.tenantId, tenantId)];
    
    if (filters?.deviceType) {
      conditions.push(eq(testingEquipment.deviceType, filters.deviceType as any));
    }
    if (filters?.status) {
      conditions.push(eq(testingEquipment.status, filters.status as any));
    }
    if (filters?.location) {
      conditions.push(eq(testingEquipment.location, filters.location));
    }
    if (filters?.calibrationDue) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push(lte(testingEquipment.nextCalibrationDate, today));
    }
    
    return await db
      .select()
      .from(testingEquipment)
      .where(and(...conditions))
      .orderBy(desc(testingEquipment.createdAt));
  }

  async updateTestingEquipment(id: string, equipmentData: Partial<InsertTestingEquipment>, tenantId: string): Promise<TestingEquipment> {
    // Convert Date objects to strings for date columns
    const updateData: any = { ...equipmentData, updatedAt: new Date() };
    if (updateData.lastCalibrationDate instanceof Date) {
      updateData.lastCalibrationDate = updateData.lastCalibrationDate.toISOString().split('T')[0];
    }
    if (updateData.nextCalibrationDate instanceof Date) {
      updateData.nextCalibrationDate = updateData.nextCalibrationDate.toISOString().split('T')[0];
    }
    
    const [updatedEquipment] = await db
      .update(testingEquipment)
      .set(updateData)
      .where(and(eq(testingEquipment.id, id), eq(testingEquipment.tenantId, tenantId)))
      .returning();
    return updatedEquipment;
  }

  async deleteTestingEquipment(id: string, tenantId: string): Promise<void> {
    await db.delete(testingEquipment)
      .where(and(eq(testingEquipment.id, id), eq(testingEquipment.tenantId, tenantId)));
  }

  async getEquipmentDueForCalibration(tenantId: string): Promise<TestingEquipment[]> {
    const today = new Date().toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
    return await db.select()
      .from(testingEquipment)
      .where(and(
        eq(testingEquipment.tenantId, tenantId),
        lte(testingEquipment.nextCalibrationDate, today),
        eq(testingEquipment.status, 'active')
      ))
      .orderBy(testingEquipment.nextCalibrationDate);
  }

  // Drugs, Alcohol & Hydration Testing Analytics
  async getTestingAnalytics(tenantId: string): Promise<{
    drugTests: { total: number; positive: number; negative: number; pending: number };
    alcoholTests: { total: number; positive: number; negative: number; pending: number };
    hydrationTests: { total: number; dehydrated: number; hydrated: number; pending: number };
    equipmentCalibrationStatus: Array<{ status: string; count: number }>;
    monthlyTestTrends: Array<{ month: string; drugTests: number; alcoholTests: number; hydrationTests: number }>;
  }> {
    // Get drug test counts (drugResult can be 'pending' as per testResultEnum)
    const [drugTestsTotal, drugTestsPositive, drugTestsNegative, drugTestsPending] = await Promise.all([
      db.select({ count: count() }).from(drugTests).where(eq(drugTests.tenantId, tenantId)),
      db.select({ count: count() }).from(drugTests).where(and(eq(drugTests.tenantId, tenantId), eq(drugTests.drugResult, 'positive'))),
      db.select({ count: count() }).from(drugTests).where(and(eq(drugTests.tenantId, tenantId), eq(drugTests.drugResult, 'negative'))),
      db.select({ count: count() }).from(drugTests).where(and(eq(drugTests.tenantId, tenantId), or(eq(drugTests.drugResult, 'pending'), eq(drugTests.status, 'results_pending'))))
    ]);

    // Get alcohol test counts (alcoholResult can be 'pending' as per testResultEnum)
    const [alcoholTestsTotal, alcoholTestsPositive, alcoholTestsNegative, alcoholTestsPending] = await Promise.all([
      db.select({ count: count() }).from(alcoholTests).where(eq(alcoholTests.tenantId, tenantId)),
      db.select({ count: count() }).from(alcoholTests).where(and(eq(alcoholTests.tenantId, tenantId), eq(alcoholTests.alcoholResult, 'positive'))),
      db.select({ count: count() }).from(alcoholTests).where(and(eq(alcoholTests.tenantId, tenantId), eq(alcoholTests.alcoholResult, 'negative'))),
      db.select({ count: count() }).from(alcoholTests).where(and(eq(alcoholTests.tenantId, tenantId), or(eq(alcoholTests.alcoholResult, 'pending'), eq(alcoholTests.status, 'results_pending'))))
    ]);

    // Get hydration test counts (using hydration level enum values + status)
    const [hydrationTestsTotal, hydrationTestsDehydrated, hydrationTestsHydrated, hydrationTestsPending] = await Promise.all([
      db.select({ count: count() }).from(hydrationTests).where(eq(hydrationTests.tenantId, tenantId)),
      db.select({ count: count() }).from(hydrationTests).where(and(eq(hydrationTests.tenantId, tenantId), ne(hydrationTests.hydrationLevel, 'adequate'))),
      db.select({ count: count() }).from(hydrationTests).where(and(eq(hydrationTests.tenantId, tenantId), eq(hydrationTests.hydrationLevel, 'adequate'))),
      db.select({ count: count() }).from(hydrationTests).where(and(eq(hydrationTests.tenantId, tenantId), or(eq(hydrationTests.status, 'scheduled'), eq(hydrationTests.status, 'results_pending'))))
    ]);

    // Get equipment calibration status
    const equipmentCalibrationStatus = await db.select({
      status: testingEquipment.status,
      count: count()
    })
      .from(testingEquipment)
      .where(eq(testingEquipment.tenantId, tenantId))
      .groupBy(testingEquipment.status);

    // Get monthly test trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format

    const [monthlyDrugTests, monthlyAlcoholTests, monthlyHydrationTests] = await Promise.all([
      db.select({
        month: sql<string>`to_char(${drugTests.collectionDate}, 'YYYY-MM')`,
        count: count()
      })
        .from(drugTests)
        .where(and(
          eq(drugTests.tenantId, tenantId),
          gte(drugTests.collectionDate, twelveMonthsAgoStr)
        ))
        .groupBy(sql`to_char(${drugTests.collectionDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${drugTests.collectionDate}, 'YYYY-MM')`),
      
      db.select({
        month: sql<string>`to_char(${alcoholTests.testDate}, 'YYYY-MM')`,
        count: count()
      })
        .from(alcoholTests)
        .where(and(
          eq(alcoholTests.tenantId, tenantId),
          gte(alcoholTests.testDate, twelveMonthsAgoStr)
        ))
        .groupBy(sql`to_char(${alcoholTests.testDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${alcoholTests.testDate}, 'YYYY-MM')`),
        
      db.select({
        month: sql<string>`to_char(${hydrationTests.testDate}, 'YYYY-MM')`,
        count: count()
      })
        .from(hydrationTests)
        .where(and(
          eq(hydrationTests.tenantId, tenantId),
          gte(hydrationTests.testDate, twelveMonthsAgoStr)
        ))
        .groupBy(sql`to_char(${hydrationTests.testDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${hydrationTests.testDate}, 'YYYY-MM')`)
    ]);

    // Combine monthly trends
    const monthlyTestTrends: Array<{ month: string; drugTests: number; alcoholTests: number; hydrationTests: number }> = [];
    const allMonths = new Set([
      ...monthlyDrugTests.map(m => m.month),
      ...monthlyAlcoholTests.map(m => m.month),
      ...monthlyHydrationTests.map(m => m.month)
    ]);

    for (const month of Array.from(allMonths).sort()) {
      const drugCount = monthlyDrugTests.find(m => m.month === month)?.count || 0;
      const alcoholCount = monthlyAlcoholTests.find(m => m.month === month)?.count || 0;
      const hydrationCount = monthlyHydrationTests.find(m => m.month === month)?.count || 0;
      
      monthlyTestTrends.push({
        month,
        drugTests: drugCount,
        alcoholTests: alcoholCount,
        hydrationTests: hydrationCount
      });
    }

    return {
      drugTests: {
        total: drugTestsTotal[0]?.count || 0,
        positive: drugTestsPositive[0]?.count || 0,
        negative: drugTestsNegative[0]?.count || 0,
        pending: drugTestsPending[0]?.count || 0
      },
      alcoholTests: {
        total: alcoholTestsTotal[0]?.count || 0,
        positive: alcoholTestsPositive[0]?.count || 0,
        negative: alcoholTestsNegative[0]?.count || 0,
        pending: alcoholTestsPending[0]?.count || 0
      },
      hydrationTests: {
        total: hydrationTestsTotal[0]?.count || 0,
        dehydrated: hydrationTestsDehydrated[0]?.count || 0,
        hydrated: hydrationTestsHydrated[0]?.count || 0,
        pending: hydrationTestsPending[0]?.count || 0
      },
      equipmentCalibrationStatus: equipmentCalibrationStatus
        .filter(e => e.status !== null)
        .map(e => ({ status: e.status as string, count: e.count })),
      monthlyTestTrends
    };
  }

  private async getTenantSopVersionWithTenantCheck(
    versionId: string,
    tenantId: string
  ): Promise<{ version: TenantSopVersion; document: TenantSopDocument } | null> {
    const [row] = await db
      .select({ version: tenantSopVersions, document: tenantSopDocuments })
      .from(tenantSopVersions)
      .innerJoin(tenantSopDocuments, eq(tenantSopVersions.documentId, tenantSopDocuments.id))
      .where(and(eq(tenantSopVersions.id, versionId), eq(tenantSopDocuments.tenantId, tenantId)));
    return row ?? null;
  }

  async listTenantSopPublishedLibrary(
    tenantId: string
  ): Promise<Array<{ document: TenantSopDocument; version: TenantSopVersion }>> {
    const docs = await db
      .select()
      .from(tenantSopDocuments)
      .where(and(eq(tenantSopDocuments.tenantId, tenantId), eq(tenantSopDocuments.isArchived, false)));

    if (docs.length === 0) return [];

    const docIds = docs.map((d) => d.id);
    const published = await db
      .select()
      .from(tenantSopVersions)
      .where(
        and(inArray(tenantSopVersions.documentId, docIds), eq(tenantSopVersions.status, "published"))
      );

    const byDoc = new Map<string, TenantSopVersion>();
    for (const v of published) {
      const cur = byDoc.get(v.documentId);
      if (!cur || v.versionNumber > cur.versionNumber) {
        byDoc.set(v.documentId, v);
      }
    }

    const out: Array<{ document: TenantSopDocument; version: TenantSopVersion }> = [];
    for (const d of docs) {
      const v = byDoc.get(d.id);
      if (v) out.push({ document: d, version: v });
    }
    return out.sort((a, b) => a.document.title.localeCompare(b.document.title));
  }

  async getTenantSopPublishedForReader(
    tenantId: string,
    documentId: string
  ): Promise<{ document: TenantSopDocument; version: TenantSopVersion } | null> {
    const [doc] = await db
      .select()
      .from(tenantSopDocuments)
      .where(
        and(
          eq(tenantSopDocuments.id, documentId),
          eq(tenantSopDocuments.tenantId, tenantId),
          eq(tenantSopDocuments.isArchived, false)
        )
      );
    if (!doc) return null;

    const versions = await db
      .select()
      .from(tenantSopVersions)
      .where(
        and(eq(tenantSopVersions.documentId, documentId), eq(tenantSopVersions.status, "published"))
      );
    if (versions.length === 0) return null;
    let best = versions[0]!;
    for (const v of versions) {
      if (v.versionNumber > best.versionNumber) best = v;
    }
    return { document: doc, version: best };
  }

  async listTenantSopDocumentsAdmin(tenantId: string): Promise<
    Array<
      TenantSopDocument & {
        latestVersionNumber: number | null;
        latestStatus: TenantSopVersion["status"] | null;
      }
    >
  > {
    const docs = await db
      .select()
      .from(tenantSopDocuments)
      .where(eq(tenantSopDocuments.tenantId, tenantId))
      .orderBy(desc(tenantSopDocuments.updatedAt));

    if (docs.length === 0) return [];

    const docIds = docs.map((d) => d.id);
    const allVers = await db
      .select()
      .from(tenantSopVersions)
      .where(inArray(tenantSopVersions.documentId, docIds));

    const latestByDoc = new Map<string, TenantSopVersion>();
    for (const v of allVers) {
      const cur = latestByDoc.get(v.documentId);
      if (!cur || v.versionNumber > cur.versionNumber) {
        latestByDoc.set(v.documentId, v);
      }
    }

    return docs.map((d) => {
      const lv = latestByDoc.get(d.id);
      return {
        ...d,
        latestVersionNumber: lv?.versionNumber ?? null,
        latestStatus: lv?.status ?? null,
      };
    });
  }

  async getTenantSopDocumentWithVersions(
    tenantId: string,
    documentId: string
  ): Promise<{ document: TenantSopDocument; versions: TenantSopVersion[] } | null> {
    const [doc] = await db
      .select()
      .from(tenantSopDocuments)
      .where(and(eq(tenantSopDocuments.id, documentId), eq(tenantSopDocuments.tenantId, tenantId)));
    if (!doc) return null;

    const versions = await db
      .select()
      .from(tenantSopVersions)
      .where(eq(tenantSopVersions.documentId, documentId))
      .orderBy(desc(tenantSopVersions.versionNumber));

    return { document: doc, versions };
  }

  async createTenantSopDocument(
    tenantId: string,
    userId: string,
    data: { title: string; code?: string | null; department?: string | null }
  ): Promise<{ document: TenantSopDocument; version: TenantSopVersion }> {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(tenantSopDocuments)
        .values({
          tenantId,
          title: data.title.trim(),
          code: data.code?.trim() ? data.code.trim() : null,
          department: data.department?.trim() ? data.department.trim() : null,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
          createdByUserId: userId,
        })
        .returning();

      const [ver] = await tx
        .insert(tenantSopVersions)
        .values({
          documentId: doc!.id,
          versionNumber: 1,
          status: "draft",
          contentHtml: "",
          createdAt: now,
          createdByUserId: userId,
        })
        .returning();

      return { document: doc!, version: ver! };
    });
  }

  async createTenantSopDraftVersion(
    tenantId: string,
    documentId: string,
    userId: string,
    data: { contentHtml?: string; changeNotes?: string | null }
  ): Promise<TenantSopVersion | null> {
    const detail = await this.getTenantSopDocumentWithVersions(tenantId, documentId);
    if (!detail) return null;

    const pendingOrDraft = detail.versions.filter(
      (v) => v.status === "draft" || v.status === "pending_approval"
    );
    if (pendingOrDraft.length > 0) {
      return null;
    }

    const nextNum =
      detail.versions.length === 0
        ? 1
        : Math.max(...detail.versions.map((v) => v.versionNumber)) + 1;

    const now = new Date();
    const [ver] = await db
      .insert(tenantSopVersions)
      .values({
        documentId,
        versionNumber: nextNum,
        status: "draft",
        contentHtml: data.contentHtml ?? "",
        changeNotes: data.changeNotes?.trim() ? data.changeNotes.trim() : null,
        createdAt: now,
        createdByUserId: userId,
      })
      .returning();

    await db
      .update(tenantSopDocuments)
      .set({ updatedAt: now })
      .where(and(eq(tenantSopDocuments.id, documentId), eq(tenantSopDocuments.tenantId, tenantId)));

    return ver ?? null;
  }

  async updateTenantSopDraftVersion(
    tenantId: string,
    versionId: string,
    data: { contentHtml?: string; changeNotes?: string | null }
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "draft") return null;

    const patch: Record<string, unknown> = {};
    if (data.contentHtml !== undefined) patch.contentHtml = data.contentHtml;
    if (data.changeNotes !== undefined) {
      patch.changeNotes = data.changeNotes?.trim() ? data.changeNotes.trim() : null;
    }

    const [updated] = await db
      .update(tenantSopVersions)
      .set(patch as any)
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    if (updated) {
      await db
        .update(tenantSopDocuments)
        .set({ updatedAt: new Date() })
        .where(eq(tenantSopDocuments.id, row.document.id));
    }

    return updated ?? null;
  }

  async setTenantSopVersionAttachment(
    tenantId: string,
    versionId: string,
    file: { url: string; filename: string; mime: string | null }
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "draft") return null;

    const [updated] = await db
      .update(tenantSopVersions)
      .set({
        attachmentUrl: file.url,
        attachmentFilename: file.filename,
        attachmentMime: file.mime,
      })
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    if (updated) {
      await db
        .update(tenantSopDocuments)
        .set({ updatedAt: new Date() })
        .where(eq(tenantSopDocuments.id, row.document.id));
    }

    return updated ?? null;
  }

  async clearTenantSopVersionAttachment(
    tenantId: string,
    versionId: string
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "draft") return null;

    const [updated] = await db
      .update(tenantSopVersions)
      .set({
        attachmentUrl: null,
        attachmentFilename: null,
        attachmentMime: null,
      })
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    return updated ?? null;
  }

  async submitTenantSopVersionForApproval(
    tenantId: string,
    versionId: string,
    _userId: string
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "draft") return null;

    const text = (row.version.contentHtml ?? "").replace(/<[^>]*>/g, "").trim();
    const hasFile = Boolean(row.version.attachmentUrl);
    if (text.length === 0 && !hasFile) return null;

    const now = new Date();
    const [updated] = await db
      .update(tenantSopVersions)
      .set({
        status: "pending_approval",
        submittedAt: now,
      })
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    if (updated) {
      await db
        .update(tenantSopDocuments)
        .set({ updatedAt: now })
        .where(eq(tenantSopDocuments.id, row.document.id));
    }

    return updated ?? null;
  }

  async withdrawTenantSopSubmission(tenantId: string, versionId: string): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "pending_approval") return null;

    const now = new Date();
    const [updated] = await db
      .update(tenantSopVersions)
      .set({
        status: "draft",
        submittedAt: null,
      })
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    if (updated) {
      await db
        .update(tenantSopDocuments)
        .set({ updatedAt: now })
        .where(eq(tenantSopDocuments.id, row.document.id));
    }

    return updated ?? null;
  }

  async approveTenantSopVersion(
    tenantId: string,
    versionId: string,
    adminUserId: string
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "pending_approval") return null;

    const now = new Date();
    return await db.transaction(async (tx) => {
      await tx
        .update(tenantSopVersions)
        .set({ status: "archived" })
        .where(
          and(
            eq(tenantSopVersions.documentId, row.document.id),
            eq(tenantSopVersions.status, "published")
          )
        );

      const [updated] = await tx
        .update(tenantSopVersions)
        .set({
          status: "published",
          approvedAt: now,
          approvedByUserId: adminUserId,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectionReason: null,
        })
        .where(eq(tenantSopVersions.id, versionId))
        .returning();

      await tx
        .update(tenantSopDocuments)
        .set({ updatedAt: now })
        .where(eq(tenantSopDocuments.id, row.document.id));

      return updated ?? null;
    });
  }

  async rejectTenantSopVersion(
    tenantId: string,
    versionId: string,
    adminUserId: string,
    reason: string
  ): Promise<TenantSopVersion | null> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "pending_approval") return null;

    const now = new Date();
    const [updated] = await db
      .update(tenantSopVersions)
      .set({
        status: "rejected",
        rejectedAt: now,
        rejectedByUserId: adminUserId,
        rejectionReason: reason.trim() || "Rejected",
      })
      .where(eq(tenantSopVersions.id, versionId))
      .returning();

    if (updated) {
      await db
        .update(tenantSopDocuments)
        .set({ updatedAt: now })
        .where(eq(tenantSopDocuments.id, row.document.id));
    }

    return updated ?? null;
  }

  async deleteTenantSopDraftVersion(tenantId: string, versionId: string): Promise<boolean> {
    const row = await this.getTenantSopVersionWithTenantCheck(versionId, tenantId);
    if (!row || row.version.status !== "draft") return false;

    await db.delete(tenantSopVersions).where(eq(tenantSopVersions.id, versionId));

    await db
      .update(tenantSopDocuments)
      .set({ updatedAt: new Date() })
      .where(eq(tenantSopDocuments.id, row.document.id));

    return true;
  }

  async updateTenantSopDocument(
    tenantId: string,
    documentId: string,
    data: {
      title?: string;
      code?: string | null;
      department?: string | null;
      isArchived?: boolean;
    }
  ): Promise<TenantSopDocument | null> {
    const [existing] = await db
      .select()
      .from(tenantSopDocuments)
      .where(and(eq(tenantSopDocuments.id, documentId), eq(tenantSopDocuments.tenantId, tenantId)));
    if (!existing) return null;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.code !== undefined) patch.code = data.code?.trim() ? data.code.trim() : null;
    if (data.department !== undefined) {
      patch.department = data.department?.trim() ? data.department.trim() : null;
    }
    if (data.isArchived !== undefined) patch.isArchived = data.isArchived;

    const [row] = await db
      .update(tenantSopDocuments)
      .set(patch as any)
      .where(and(eq(tenantSopDocuments.id, documentId), eq(tenantSopDocuments.tenantId, tenantId)))
      .returning();

    return row ?? null;
  }

  async listSignedLegalDocumentsForTenant(tenantId: string): Promise<SignedLegalDocumentTenantView[]> {
    const rows = await db
      .select({
        id: tenantSignedLegalDocuments.id,
        documentType: tenantSignedLegalDocuments.documentType,
        originalFilename: tenantSignedLegalDocuments.originalFilename,
        mimeType: tenantSignedLegalDocuments.mimeType,
        fileSizeBytes: tenantSignedLegalDocuments.fileSizeBytes,
        notes: tenantSignedLegalDocuments.notes,
        createdAt: tenantSignedLegalDocuments.createdAt,
        uploadedByUserId: tenantSignedLegalDocuments.uploadedByUserId,
        uploaderFirstName: users.firstName,
        uploaderLastName: users.lastName,
      })
      .from(tenantSignedLegalDocuments)
      .leftJoin(users, eq(tenantSignedLegalDocuments.uploadedByUserId, users.id))
      .where(eq(tenantSignedLegalDocuments.tenantId, tenantId))
      .orderBy(desc(tenantSignedLegalDocuments.createdAt));
    return rows;
  }

  async listAllSignedLegalDocumentsForSuperAdmin(): Promise<SignedLegalDocumentSuperView[]> {
    const rows = await db
      .select({
        id: tenantSignedLegalDocuments.id,
        tenantId: tenantSignedLegalDocuments.tenantId,
        documentType: tenantSignedLegalDocuments.documentType,
        originalFilename: tenantSignedLegalDocuments.originalFilename,
        mimeType: tenantSignedLegalDocuments.mimeType,
        fileSizeBytes: tenantSignedLegalDocuments.fileSizeBytes,
        notes: tenantSignedLegalDocuments.notes,
        createdAt: tenantSignedLegalDocuments.createdAt,
        uploadedByUserId: tenantSignedLegalDocuments.uploadedByUserId,
        uploaderFirstName: users.firstName,
        uploaderLastName: users.lastName,
        tenantName: tenants.name,
      })
      .from(tenantSignedLegalDocuments)
      .innerJoin(tenants, eq(tenantSignedLegalDocuments.tenantId, tenants.id))
      .leftJoin(users, eq(tenantSignedLegalDocuments.uploadedByUserId, users.id))
      .orderBy(desc(tenantSignedLegalDocuments.createdAt));
    return rows;
  }

  async createSignedLegalDocument(input: {
    tenantId: string;
    documentType: string;
    storageUrl: string;
    originalFilename: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    uploadedByUserId: string | null;
    notes: string | null;
  }): Promise<TenantSignedLegalDocument> {
    const [row] = await db
      .insert(tenantSignedLegalDocuments)
      .values({
        tenantId: input.tenantId,
        documentType: input.documentType,
        storageUrl: input.storageUrl,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        uploadedByUserId: input.uploadedByUserId,
        notes: input.notes,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create signed legal document record");
    }
    return row;
  }

  async getSignedLegalDocumentById(id: string): Promise<TenantSignedLegalDocument | undefined> {
    const [row] = await db
      .select()
      .from(tenantSignedLegalDocuments)
      .where(eq(tenantSignedLegalDocuments.id, id));
    return row;
  }
}

export const storage = new DatabaseStorage();