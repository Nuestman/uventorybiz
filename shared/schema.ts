import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  date,
  boolean,
  pgEnum,
  unique,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { AMBULANCE_PRESTART_CHECKLIST_ITEMS, isValidPrestartResponses } from "./ambulancePrestartChecklist";

// Session storage table for express-session (passport compatibility)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums for better type safety
export const userRoleEnum = pgEnum("user_role", [
  "staff",
  "operations",
  "fleet_operator",
  "admin",
  "super_admin",
]);

/** Fixed care sites vs mobile ambulance units (inventory location + fleet metadata). */
export const careLocationKindEnum = pgEnum("care_location_kind", ["fixed_site", "ambulance"]);

/** Operational status for ambulance units (fixed sites leave null). */
export const ambulanceOpsStatusEnum = pgEnum("ambulance_ops_status", [
  "available",
  "deployed",
  "standby",
  "out_of_service",
]);

/** Staff e-ticketing (operations / facilities / IT / HSE — not patient-facing). */
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "blocked", "decommissioned"]);
export const patientStatusEnum = pgEnum("patient_status", ["active", "cleared", "follow_up", "incident", "inactive"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);
/** How care is delivered — see shared/encounterPathways.ts */
export const encounterModalityEnum = pgEnum("encounter_modality", ["in_person", "telehealth", "phone"]);
export const departmentEnum = pgEnum("department", ["sales", "warehouse", "operations", "maintenance", "administration"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const notificationTypeEnum = pgEnum("notification_type", ["registration_request", "status_change", "password_reset", "incident_alert", "appointment_reminder", "low_stock_alert", "expiry_alert", "equipment_maintenance_alert", "equipment_failure_alert"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed", "read"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["new", "in_review", "resolved", "dismissed"]);

// Medical Inventory & Equipment Tracking Enums
// NOTE: inventory item category is now a tenant-scoped slug (inventory_categories.slug),
// not the legacy Postgres enum inventory_category (dropped in migration 0015).
export const inventoryStatusEnum = pgEnum("inventory_status", ["active", "discontinued", "recalled", "faulty", "maintenance"]);

// Inventory transaction types - split with explicit directions and purposes
// NOTE: Inventory is currently empty in real deployments, so we can safely extend
// the enum. We keep legacy values for backward compatibility with existing UI.
export const transactionTypeEnum = pgEnum("transaction_type", [
  // Receipts (stock in)
  "receipt_external",        // from supplier / outside the system
  "receipt_transfer",        // receipt from another internal location (alias for transfer_in)

  // Issues (stock out)
  "issue_to_client",         // issued to a patient/client, linked to visit
  "issue_internal",          // issued to internal consumer (department, procedure, etc.)

  // Adjustments
  "adjustment_increase",     // increase due to count correction, data fix, etc.
  "adjustment_decrease",     // decrease due to shrinkage, error, etc.

  // Transfers between locations
  "transfer_out",            // leaves this location (source)
  "transfer_in",             // arrives at this location (destination)

  // Returns
  "return_from_client",      // client returns items to this location
  "return_to_supplier",      // items sent back to supplier

  // Disposal
  "disposal",                // destroyed/expired/damaged, non-recoverable

  // Legacy types (kept for compatibility with existing UI)
  "requisition",
  "receipt",
  "issue",
  "adjustment",
  "transfer",
  "return"
]);
export const maintenanceTypeEnum = pgEnum("maintenance_type", ["preventive", "corrective", "calibration", "inspection", "daily_check"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["scheduled", "in_progress", "completed", "overdue", "cancelled"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "pending_approval", "approved", "ordered", "partially_received", "completed", "cancelled"]);
export const posShiftStatusEnum = pgEnum("pos_shift_status", ["open", "closed"]);
export const posSaleStatusEnum = pgEnum("pos_sale_status", ["draft", "completed", "voided", "returned"]);
export const posPaymentMethodEnum = pgEnum("pos_payment_method", ["cash", "card", "other"]);

// Drugs, Alcohol & Hydration Testing Module Enums
export const testingProgramTypeEnum = pgEnum("testing_program_type", ["pre_employment", "random", "post_incident", "reasonable_suspicion", "return_to_duty", "follow_up"]);
export const testTypeEnum = pgEnum("test_type", ["drug", "alcohol", "hydration", "combined"]);
export const testModeEnum = pgEnum("test_mode", ["simple", "comprehensive"]);
export const testReasonEnum = pgEnum("test_reason", ["pre_employment", "random", "post_incident", "reasonable_suspicion", "return_to_duty", "follow_up", "routine_screening"]);
export const hydrationTestReasonEnum = pgEnum("hydration_test_reason", ["random", "post_incident", "on_demand", "heat_illness_suspected", "routine_check"]);
export const specimenTypeEnum = pgEnum("specimen_type", ["urine", "saliva", "hair", "breath", "blood"]);
export const testResultEnum = pgEnum("test_result", ["negative", "positive", "non-negative", "dilute", "invalid", "pending", "inconclusive"]);
export const testStatusEnum = pgEnum("test_status", ["scheduled", "collected", "in_lab", "results_pending", "completed", "cancelled", "no_show"]);
export const testingDeviceEnum = pgEnum("testing_device", ["drugcheck_3000", "breathalyzer", "comprehensive_lab", "field_test", "instant_test"]);
export const dehydrationLevelEnum = pgEnum("dehydration_level", ["normal", "mild", "moderate", "severe"]);
export const hydrationLevelEnum = pgEnum("hydration_level", ["adequate", "mild_dehydration", "moderate_dehydration", "severe_dehydration"]);
export const hydrationActionEnum = pgEnum("hydration_action", ["continue_work", "rest_hydrate", "medical_evaluation", "immediate_treatment"]);
export const workIntensityEnum = pgEnum("work_intensity", ["light", "moderate", "heavy", "extreme"]);
export const urineColorEnum = pgEnum("urine_color", ["1", "2", "3", "4", "5", "6", "7", "8"]); // 1-8 scale
export const finalTestResultEnum = pgEnum("final_test_result", ["negative", "positive", "test_not_conducted", "awaiting_confirmation"]);

// POC Instant Tests Enums
export const instantTestTypeEnum = pgEnum("instant_test_type", ["hb", "pregnancy", "malaria", "typhoid"]);
export const instantTestResultEnum = pgEnum("instant_test_result", ["positive", "negative", "invalid"]);

// Staff auth users (tenant-bound HMS accounts)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phoneNumber: varchar("phone_number"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  password: varchar("password"), // Staff auth password hash
  /** OIDC issuer (`iss`) when linked to Google/Microsoft */
  oauthIssuer: varchar("oauth_issuer", { length: 512 }),
  /** OIDC subject (`sub`) when linked to Google/Microsoft */
  oauthSub: varchar("oauth_sub", { length: 255 }),
  authProvider: varchar("auth_provider").notNull().default("custom"), // DEPRECATED value name: 'custom' = staff/password; also 'google' | 'microsoft'
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  tenantId: varchar("tenant_id"), // For multitenant support - can be null for super admins
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "set null" }), // Staff auth users linked to employees
  role: userRoleEnum("role").default("staff"),
  status: userStatusEnum("status").default("pending"), // pending approval by tenant admin
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  emailVerificationToken: varchar("email_verification_token"),
  phoneVerificationCode: varchar("phone_verification_code"),
  phoneVerificationExpires: timestamp("phone_verification_expires"),
  approvedBy: varchar("approved_by"), // User ID who approved this registration
  approvedAt: timestamp("approved_at"),
  /** AES-encrypted TOTP secret (staff MFA) */
  totpSecretEnc: text("totp_secret_enc"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  /** Hashed backup codes for MFA recovery */
  mfaBackupCodes: jsonb("mfa_backup_codes"),
  /** Last app release version for which the user dismissed the What's New dialog */
  lastAcknowledgedReleaseVersion: varchar("last_acknowledged_release_version", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Businesses (tenants) — multi-tenant isolation root for uventorybiz
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Business / organization name
  organizationType: varchar("organization_type").notNull().default("business"),
  /** Extensible business category: retail, pharmacy, wholesale, services, hospitality, other, … */
  businessCategory: varchar("business_category").notNull().default("other"),
  contactEmail: varchar("contact_email").notNull(),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  planType: varchar("plan_type").notNull().default("basic"), // basic, premium, enterprise
  status: varchar("status").notNull().default("pending"), // pending, active, suspended, cancelled
  maxUsers: integer("max_users").default(50),
  maxCompanies: integer("max_companies").default(10),
  hasMultipleLocations: boolean("has_multiple_locations").default(false), // Multi-store feature flag
  // Tenant-scoped system settings (currency, white labeling)
  currencyCode: varchar("currency_code").default("GHS"), // ISO 4217 e.g. GHS, USD
  appName: varchar("app_name"), // White label: custom application name
  logoUrl: text("logo_url"), // White label: custom logo URL
  primaryColor: varchar("primary_color"), // White label: primary theme color e.g. #142F5C
  faviconUrl: text("favicon_url"), // White label: custom favicon URL
  /** Optional public slug for customer/supplier portal login. Unique when set. */
  portalSlug: varchar("portal_slug", { length: 80 }),
  /** Default VAT/tax rate for POS (e.g. 0.15 = 15%). Per-line rates may override. */
  defaultTaxRate: real("default_tax_rate").default(0),
  /** Whether this business accepts returns/refunds (gates POS returns + portal return requests). */
  returnsEnabled: boolean("returns_enabled").notNull().default(true),
  /** Whether this business offers point-of-care lab testing (instant tests). Asked at signup for pharmacies; toggleable in Settings. */
  pocTestingEnabled: boolean("poc_testing_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Platform-wide feature flags managed from the super-admin console.
 * One row per feature key; missing rows fall back to the code-defined default.
 */
export const platformFeatureFlags = pgTable("platform_feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flagKey: varchar("flag_key", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  /** Last super admin who changed the flag (informational; no FK so user deletion never blocks). */
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Catalog of business categories (data-driven; seed defaults). */
export const businessCategories = pgTable("business_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 120 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies / partner orgs operating within each business tenant
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  companyType: varchar("company_type").notNull().default("contractor"), // mother_company, contractor, subcontractor
  contactEmail: varchar("contact_email").notNull(),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  licenseNumber: varchar("license_number"),
  status: varchar("status").notNull().default("active"), // active, suspended, terminated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** External customers of a business (portal party for buyers). */
export const customers = pgTable(
  "customers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
    customerNumber: varchar("customer_number"),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name").notNull(),
    email: varchar("email"),
    phone: varchar("phone"),
    status: varchar("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantIdx: index("idx_customers_tenant").on(t.tenantId),
    tenantEmailIdx: index("idx_customers_tenant_email").on(t.tenantId, t.email),
  }),
);

// All employees working in the business (linked to companies)
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  employeeNumber: varchar("employee_number").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phoneNumber: varchar("phone_number"),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  department: departmentEnum("department").notNull(),
  position: varchar("position").notNull(),
  jobTitle: varchar("job_title").notNull(), // Specific job title for incident reporting
  hireDate: date("hire_date").notNull(),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  /** Occupational-health / roster photo; visible in staff views and patient portal (same URL). */
  profileImageUrl: text("profile_image_url"),
  medicalClearance: boolean("medical_clearance").default(true),
  status: varchar("status").default("active"), // active, on_leave, terminated, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint within tenant scope only
  uniqueEmployeeNumberPerTenant: unique().on(table.tenantId, table.employeeNumber),
}));

// Staff auth sessions (`user_sessions`)
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token").notNull().unique(),
  expires: timestamp("expires").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  activeLocationId: varchar("active_location_id"), // Current working location for session
  activeLocationName: varchar("active_location_name"), // Location name for display
  /** When set, the session acts as `userId` (target) while this user is the platform super admin who started impersonation. */
  impersonatorUserId: varchar("impersonator_user_id").references(() => users.id, { onDelete: "set null" }),
  impersonationStartedAt: timestamp("impersonation_started_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Append-only log of impersonation start/end for platform support and compliance. */
export const impersonationEvents = pgTable("impersonation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  impersonatorUserId: varchar("impersonator_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetUserId: varchar("target_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetTenantId: varchar("target_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  action: varchar("action", { length: 32 }).notNull(),
  reason: varchar("reason", { length: 64 }),
  sessionTokenPrefix: varchar("session_token_prefix", { length: 16 }),
  ipAddress: varchar("ip_address", { length: 128 }),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email verification attempts
export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code").notNull(),
  expires: timestamp("expires").notNull(),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Care Locations - Emergency care sites and mini-clinics (TENANT ISOLATED)
export const careLocations = pgTable("care_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Store / site identification (table name care_locations retained for migration compatibility)
  locationName: varchar("location_name").notNull(),
  locationCode: varchar("location_code").notNull(), // Short code like "MAIN", "SH3"
  description: text("description"),
  
  // Contact information
  address: text("address"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  
  // Geographic coordinates (optional for mapping)
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  
  // Location status
  isPrimary: boolean("is_primary").default(false), // One primary store per tenant
  status: varchar("status").notNull().default("active"), // active, inactive, maintenance

  // Kind: fixed store/warehouse vs mobile fleet unit (fleet rows share inventory_stock by location_id)
  locationKind: careLocationKindEnum("location_kind").notNull().default("fixed_site"),
  /** Home store where a fleet unit is normally stationed; null = pooled / multi-site coverage. */
  stationedAtLocationId: varchar("stationed_at_location_id").references((): any => careLocations.id, {
    onDelete: "set null",
  }),
  callSign: varchar("call_sign", { length: 128 }),
  registrationPlate: varchar("registration_plate", { length: 64 }),
  fleetNumber: varchar("fleet_number", { length: 128 }),
  /** When not tied to a single store (e.g. mobile unit covering all sites). */
  coverageNotes: text("coverage_notes"),
  ambulanceOpsStatus: ambulanceOpsStatusEnum("ambulance_ops_status"),
  
  // Operations (business stores)
  capacity: integer("capacity"), // Optional floor/storage capacity units
  operatingHours: text("operating_hours"), // Free text or JSON hours
  staffCount: integer("staff_count").default(0),
  
  // Optional structured extras (legacy JSON; prefer dedicated columns when adding features)
  capabilities: text("capabilities"),
  equipmentList: text("equipment_list"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique location codes per tenant
  uniqueLocationCodePerTenant: unique().on(table.tenantId, table.locationCode),
  // Ensure unique location names per tenant
  uniqueLocationNamePerTenant: unique().on(table.tenantId, table.locationName),
  tenantKindIdx: index("care_locations_tenant_kind_idx").on(table.tenantId, table.locationKind),
}));

/** Alias for uventorybiz naming — DB table remains `care_locations`. */
export const storeLocations = careLocations;

/** Shift pre-start safety checklist submission per ambulance (inventory location). */
export const ambulancePrestartStatusEnum = pgEnum("ambulance_prestart_status", ["draft", "completed"]);

export const ambulancePrestartChecks = pgTable(
  "ambulance_prestart_checks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ambulanceLocationId: varchar("ambulance_location_id")
      .notNull()
      .references(() => careLocations.id, { onDelete: "cascade" }),
    completedByUserId: varchar("completed_by_user_id")
      .notNull()
      .references(() => users.id),
    shiftDate: date("shift_date").notNull(),
    checkedAt: timestamp("checked_at").defaultNow(),
    status: ambulancePrestartStatusEnum("status").notNull().default("draft"),
    responses: jsonb("responses").notNull().default(sql`'{}'::jsonb`),
    deficienciesNotes: text("deficiencies_notes"),
    mileageReading: varchar("mileage_reading", { length: 32 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantAmbulanceIdx: index("ambulance_prestart_tenant_ambulance_idx").on(t.tenantId, t.ambulanceLocationId),
    tenantShiftIdx: index("ambulance_prestart_tenant_shift_idx").on(t.tenantId, t.shiftDate),
  })
);

// Referral/transfer facilities (hospitals) - tenant-specific list for "transferred to hospital" disposition
export const referralFacilities = pgTable("referral_facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: text("address"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  status: varchar("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients table - references employees
// DB function: drizzle/0000_patient_id_function.sql (applied before patients via db:drizzle-migrate)
// LEGACY (clinical) — retained for FK integrity (portal users, appointments history); candidate for future drop migration.
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`generate_patient_id()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  status: patientStatusEnum("status").default("active"),
  medicalClearance: boolean("medical_clearance").default(true),
  notes: text("notes"),
  /** Known allergies (free text; e.g. drugs, foods, latex). */
  allergies: text("allergies"),
  /** Chronic conditions / past medical history (e.g. hypertension, diabetes). */
  medicalHistory: text("medical_history"),
  /** Current or home medications (not visit-specific). */
  medications: text("medications"),
  /** Disability or relevant functional needs (free text). */
  disability: text("disability"),
  firstVisit: timestamp("first_visit").defaultNow(),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments — operations scheduling (employee subject; optional customer)
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  medicalStaffId: varchar("medical_staff_id").notNull().references(() => users.id),
  locationId: varchar("location_id").references(() => careLocations.id), // Store location for appointment
  appointmentDate: timestamp("appointment_date").notNull(),
  /** Scheduled slot length in minutes (default 30). */
  durationMinutes: integer("duration_minutes").notNull().default(30),
  appointmentType: varchar("appointment_type").notNull(),
  status: appointmentStatusEnum("status").default("scheduled"),
  /** in_person | telehealth | phone — telehealth retained for legacy rows; new UI should prefer in_person */
  modality: encounterModalityEnum("modality").notNull().default("in_person"),
  notes: text("notes"),
  /** When status=scheduled: which party must confirm (customer | staff). Null when confirmed. */
  confirmationRequiredFrom: varchar("confirmation_required_from", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Per-tenant session timeouts and staff MFA policy. */
export const tenantSecuritySettings = pgTable("tenant_security_settings", {
  tenantId: varchar("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  staffSessionAbsoluteHours: integer("staff_session_absolute_hours").notNull().default(12),
  staffSessionIdleMinutes: integer("staff_session_idle_minutes").notNull().default(30),
  portalSessionAbsoluteDays: integer("portal_session_absolute_days").notNull().default(14),
  portalSessionIdleMinutes: integer("portal_session_idle_minutes").notNull().default(60),
  portalSessionSlidingDays: integer("portal_session_sliding_days").notNull().default(7),
  sessionWarningLeadMinutes: integer("session_warning_lead_minutes").notNull().default(3),
  requireMfa: boolean("require_mfa").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Short-lived tokens for MFA login step or enrollment. */
export const mfaChallenges = pgTable(
  "mfa_challenges",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    token: varchar("token", { length: 128 }).notNull().unique(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    expires: timestamp("expires").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_mfa_challenges_user").on(t.userId),
    expIdx: index("idx_mfa_challenges_expires").on(t.expires),
  }),
);

/** Per-tenant feature flags and support info for the customer/supplier portal. */
export const tenantPortalSettings = pgTable("tenant_portal_settings", {
  tenantId: varchar("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  supportEmail: varchar("support_email"),
  privacyPolicyUrl: text("privacy_policy_url"),
  featuresJson: jsonb("features_json").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Tenant-uploaded executed legal documents (PDF/Word), stored via FileStorageService.
 * Listing APIs omit `storageUrl`; downloads go through authenticated proxy routes.
 */
export const tenantSignedLegalDocuments = pgTable(
  "tenant_signed_legal_documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 64 }).notNull(),
    storageUrl: text("storage_url").notNull(),
    originalFilename: varchar("original_filename", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    fileSizeBytes: integer("file_size_bytes"),
    uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    tenantIdx: index("idx_tenant_signed_legal_tenant").on(t.tenantId),
    tenantCreatedIdx: index("idx_tenant_signed_legal_tenant_created").on(t.tenantId, t.createdAt),
  }),
);

export type TenantSignedLegalDocument = typeof tenantSignedLegalDocuments.$inferSelect;

/** Customer or supplier portal login (not staff `users`). */
export const portalUsers = pgTable(
  "portal_users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Transitional bridge to occupational-health patients; nullable for customer/supplier accounts. */
    patientId: varchar("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    partyType: varchar("party_type", { length: 32 }).notNull().default("customer"),
    customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lastLoginAt: timestamp("last_login_at"),
    lastAcknowledgedReleaseVersion: varchar("last_acknowledged_release_version", { length: 32 }),
    passwordResetToken: varchar("password_reset_token", { length: 128 }),
    passwordResetExpires: timestamp("password_reset_expires"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantEmailUnique: unique().on(t.tenantId, t.email),
    customerIdx: index("idx_portal_users_customer").on(t.customerId),
    supplierIdx: index("idx_portal_users_supplier").on(t.supplierId),
  }),
);

export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    portalUserId: varchar("portal_user_id")
      .notNull()
      .references(() => portalUsers.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 128 }).notNull().unique(),
    expires: timestamp("expires").notNull(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_portal_sessions_user").on(t.portalUserId),
    expIdx: index("idx_portal_sessions_expires").on(t.expires),
  }),
);

export const portalNotifications = pgTable(
  "portal_notifications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    portalUserId: varchar("portal_user_id")
      .notNull()
      .references(() => portalUsers.id, { onDelete: "cascade" }),
    notificationType: varchar("notification_type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userUnreadIdx: index("idx_portal_notifications_user_unread").on(
      t.portalUserId,
      t.readAt,
      t.createdAt,
    ),
    tenantIdx: index("idx_portal_notifications_tenant").on(t.tenantId, t.createdAt),
  }),
);

export const portalUserNotificationPreferences = pgTable(
  "portal_user_notification_preferences",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    portalUserId: varchar("portal_user_id")
      .notNull()
      .references(() => portalUsers.id, { onDelete: "cascade" }),
    preferenceKey: varchar("preference_key", { length: 64 }).notNull(),
    channel: varchar("channel", { length: 32 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userKeyChannelUnique: unique().on(t.portalUserId, t.preferenceKey, t.channel),
    userIdx: index("idx_portal_unp_user").on(t.portalUserId),
    tenantIdx: index("idx_portal_unp_tenant").on(t.tenantId),
  }),
);

export const portalAppointmentRequests = pgTable(
  "portal_appointment_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    patientId: varchar("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    preferredDate: date("preferred_date"),
    preferredTimeWindow: varchar("preferred_time_window", { length: 120 }),
    /** Patient preference: in_person or telehealth (not limited to follow-ups) */
    preferredModality: encounterModalityEnum("preferred_modality").notNull().default("in_person"),
    /** Preferred medical post for in-person requests */
    preferredLocationId: varchar("preferred_location_id").references(() => careLocations.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    staffNotes: text("staff_notes"),
    linkedAppointmentId: varchar("linked_appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    patientIdx: index("idx_portal_appt_req_patient").on(t.tenantId, t.patientId),
  }),
);

/** Patient-initiated portal access / sign-in help requests (admin review queue). */
export const portalAccessRequests = pgTable(
  "portal_access_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
    supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    requestKind: varchar("request_kind", { length: 32 }).notNull().default("new_access"),
    matchKind: varchar("match_kind", { length: 32 }).notNull().default("unknown"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    reviewerNotes: text("reviewer_notes"),
    reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantStatusIdx: index("idx_portal_access_requests_tenant_status").on(t.tenantId, t.status, t.createdAt),
  }),
);

export type PortalAccessRequest = typeof portalAccessRequests.$inferSelect;

export const portalAuditEvents = pgTable(
  "portal_audit_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    patientId: varchar("patient_id").references(() => patients.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    tenantIdx: index("idx_portal_audit_tenant").on(t.tenantId, t.createdAt),
  }),
);

export const portalMagicLoginTokens = pgTable(
  "portal_magic_login_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    portalUserId: varchar("portal_user_id")
      .notNull()
      .references(() => portalUsers.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 128 }).notNull().unique(),
    expires: timestamp("expires").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_portal_magic_tokens_user").on(t.portalUserId),
    expIdx: index("idx_portal_magic_tokens_expires").on(t.expires),
  }),
);

// --- Portal customer orders ---

export const portalOrderStatusEnum = pgEnum("portal_order_status", [
  "pending",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "not_received",
  "completed",
  "return_requested",
  "returned",
  "cancelled",
  "rejected",
]);

export const portalOrderFulfillmentEnum = pgEnum("portal_order_fulfillment", ["pickup", "delivery"]);

/** Customer orders placed through the portal (pickup at a store location or delivery). */
export const portalOrders = pgTable(
  "portal_orders",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    status: portalOrderStatusEnum("status").notNull().default("pending"),
    fulfillmentType: portalOrderFulfillmentEnum("fulfillment_type").notNull(),
    /** Store location for pickup orders, and the stock source for delivery orders. */
    locationId: varchar("location_id").references(() => careLocations.id, { onDelete: "set null" }),
    deliveryAddress: text("delivery_address"),
    customerNotes: text("customer_notes"),
    staffNotes: text("staff_notes"),
    subtotal: varchar("subtotal").notNull().default("0"),
    total: varchar("total").notNull().default("0"),
    currencyCode: varchar("currency_code").notNull().default("GHS"),
    reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Delivery courier contact shown to the customer while out for delivery. */
    deliveryContactName: varchar("delivery_contact_name", { length: 200 }),
    deliveryContactPhone: varchar("delivery_contact_phone", { length: 64 }),
    confirmedAt: timestamp("confirmed_at"),
    /** When the order entered ready_for_pickup / out_for_delivery — starts the receipt grace window. */
    readyAt: timestamp("ready_at"),
    /** Customer acknowledged receipt (completes the order immediately). */
    receiptConfirmedAt: timestamp("receipt_confirmed_at"),
    notReceivedAt: timestamp("not_received_at"),
    notReceivedReason: text("not_received_reason"),
    /** Customer-requested return on a completed order (gated by tenants.returns_enabled). */
    returnRequestedAt: timestamp("return_requested_at"),
    returnReason: text("return_reason"),
    returnedAt: timestamp("returned_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantOrderNumberUnique: unique().on(t.tenantId, t.orderNumber),
    tenantStatusIdx: index("idx_portal_orders_tenant_status").on(t.tenantId, t.status, t.createdAt),
    customerIdx: index("idx_portal_orders_customer").on(t.tenantId, t.customerId),
  }),
);

export const portalOrderItems = pgTable(
  "portal_order_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderId: varchar("order_id")
      .notNull()
      .references(() => portalOrders.id, { onDelete: "cascade" }),
    itemId: varchar("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    /** Snapshots survive later catalog edits/deletes. */
    itemNameSnapshot: varchar("item_name_snapshot").notNull(),
    itemCodeSnapshot: varchar("item_code_snapshot"),
    quantity: integer("quantity").notNull(),
    unitPrice: varchar("unit_price").notNull(),
    lineTotal: varchar("line_total").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    orderIdx: index("idx_portal_order_items_order").on(t.orderId),
  }),
);

export type PortalOrder = typeof portalOrders.$inferSelect;
export type PortalOrderItem = typeof portalOrderItems.$inferSelect;

// --- Supplier invoices (submitted through the portal against purchase orders) ---

export const supplierInvoiceStatusEnum = pgEnum("supplier_invoice_status", [
  "submitted",
  "accepted",
  "rejected",
  "paid",
]);

export const supplierInvoices = pgTable(
  "supplier_invoices",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
    portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
    amount: varchar("amount").notNull(),
    invoiceDate: date("invoice_date"),
    status: supplierInvoiceStatusEnum("status").notNull().default("submitted"),
    notes: text("notes"),
    reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    tenantSupplierInvoiceUnique: unique().on(t.tenantId, t.supplierId, t.invoiceNumber),
    tenantStatusIdx: index("idx_supplier_invoices_tenant_status").on(t.tenantId, t.status, t.createdAt),
    poIdx: index("idx_supplier_invoices_po").on(t.purchaseOrderId),
  }),
);

export type SupplierInvoice = typeof supplierInvoices.$inferSelect;

// Incident reports — workplace / business incidents (employee subject)
export const incidentReports = pgTable("incident_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  locationId: varchar("location_id").references(() => careLocations.id),
  
  // Incident details
  incidentDate: timestamp("incident_date").notNull(),
  reportedToFapDate: timestamp("reported_to_fap_date"), // legacy column name; UI copy = reported to site
  incidentLocation: varchar("incident_location").notNull(),
  jobTitle: varchar("job_title").notNull(),
  incidentType: varchar("incident_type").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity").notNull(),
  
  treatedOnSite: boolean("treated_on_site").default(false),
  detainedAtFap: boolean("detained_at_fap").default(false), // legacy column name; UI = detained on site
  ambulanceUsed: boolean("ambulance_used").default(false),
  emergencyMedicalMgt: text("emergency_medical_mgt"),
  
  dispositionDateTime: timestamp("disposition_date_time"),
  generalConditionAtDisposition: varchar("general_condition_at_disposition"),
  
  lastMenstrualPeriod: date("last_menstrual_period"),
  
  reportedTo: text("reported_to"),
  incidentUploads: text("incident_uploads"),
  
  status: varchar("status").default("open"),
  isDrillOrSimulation: boolean("is_drill_or_simulation").default(false),
  actionsTaken: text("actions_taken"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Types - Data-driven notification type definitions
export const notificationTypes = pgTable("notification_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(), // Lowercase snake_case: 'incident_created', 'inventory_low_stock'
  category: varchar("category").notNull(), // 'incident' | 'inventory' | 'equipment' | 'system'
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  severitySupported: boolean("severity_supported").default(false),
  systemDefined: boolean("system_defined").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyIdx: index("idx_notification_types_key").on(table.key),
  categoryIdx: index("idx_notification_types_category").on(table.category),
}));

// User Notification Preferences - Row-based preferences (one row per tenant, user, notification_type, channel)
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationTypeId: varchar("notification_type_id").notNull().references(() => notificationTypes.id, { onDelete: "cascade" }),
  channel: varchar("channel").notNull(), // 'email' | 'in_app' | 'sms' | 'whatsapp'
  enabled: boolean("enabled").notNull().default(true),
  minSeverity: varchar("min_severity"), // 'low' | 'medium' | 'high' | 'critical' | null
  adminManaged: boolean("admin_managed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTenantUserTypeChannel: unique().on(table.tenantId, table.userId, table.notificationTypeId, table.channel),
  tenantIdx: index("idx_unp_tenant").on(table.tenantId),
  userIdx: index("idx_unp_user").on(table.userId),
  notificationTypeIdx: index("idx_unp_notification_type").on(table.notificationTypeId),
  channelIdx: index("idx_unp_channel").on(table.channel),
  tenantTypeEnabledIdx: index("idx_unp_tenant_type_enabled").on(table.tenantId, table.notificationTypeId, table.enabled),
}));

// Notification system for admin approvals and alerts - Updated to use notification_type_id
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: "set null" }),
  notificationTypeId: varchar("notification_type_id").notNull().references(() => notificationTypes.id, { onDelete: "set null" }),
  channel: varchar("channel").notNull(), // 'email' | 'in_app' | 'sms' | 'whatsapp'
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: notificationStatusEnum("status").default("pending"),
  metadata: jsonb("metadata"), // Additional data like incidentId, inventoryItemId, severity, viewLink, etc.
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_notifications_tenant").on(table.tenantId),
  recipientIdx: index("idx_notifications_recipient").on(table.recipientId),
  typeIdx: index("idx_notifications_type").on(table.notificationTypeId),
  statusIdx: index("idx_notifications_status").on(table.status),
  channelIdx: index("idx_notifications_channel").on(table.channel),
}));

// Notification Delivery Logs - Low-level delivery audit for email/SMS/WhatsApp providers
export const notificationDeliveryLogs = pgTable("notification_delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  notificationId: varchar("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  channel: varchar("channel").notNull(), // 'email' | 'in_app' | 'sms' | 'whatsapp'
  provider: varchar("provider").notNull(), // 'gmail_smtp' | 'sendgrid' | 'twilio' | 'meta_whatsapp' | 'system'
  status: varchar("status").notNull(), // 'sent' | 'failed' | 'retried' | 'queued'
  errorMessage: text("error_message"),
  providerResponse: jsonb("provider_response"), // Raw response from email/SMS/WhatsApp API
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  notificationIdx: index("idx_ndl_notification").on(table.notificationId),
  statusIdx: index("idx_ndl_status").on(table.status),
  channelIdx: index("idx_ndl_channel").on(table.channel),
  tenantIdx: index("idx_ndl_tenant").on(table.tenantId),
}));

// Audit log for tracking all user actions across the system - TENANT ISOLATED
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action").notNull(), // create, update, delete, login, logout, view, complete, cancel, etc.
    resourceType: varchar("resource_type").notNull(), // patient, appointment, incident, duty_assignment, etc.
    resourceId: varchar("resource_id"), // ID of the affected resource
    originalData: jsonb("original_data"), // Original data before update or delete - CRITICAL for compliance
    details: jsonb("details"), // JSON object with additional context
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_audit_logs_tenant_created_at").on(table.tenantId, table.createdAt)],
);

// System-wide feedback about uventorybiz itself (UX, UI, performance, etc.) - not tenant constrained
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Optional links to user and tenant if available (for context only)
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  // Where the user was when they opened the widget
  path: varchar("path").notNull(),
  context: varchar("context"),
  // High-level category of feedback: global, ces, nps, etc.
  kind: varchar("kind").notNull().default("global"),
  // UX / UI ratings (1-5 Likert-style)
  uxRating: integer("ux_rating"),
  uiRating: integer("ui_rating"),
  navigationRating: integer("navigation_rating"),
  speedRating: integer("speed_rating"),
  reliabilityRating: integer("reliability_rating"),
  // NPS-style recommendation score (0-10 or 1-10)
  npsScore: integer("nps_score"),
  // Areas of the app the user interacted with (["Dashboard", "Patients", ...])
  areasUsed: jsonb("areas_used"),
  // Free-text comment from the user
  comment: text("comment"),
  // Optional contact email if they want follow-up
  contactEmail: varchar("contact_email"),
  // Admin workflow
  status: feedbackStatusEnum("status").notNull().default("new"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("idx_feedback_status").on(table.status),
  pathIdx: index("idx_feedback_path").on(table.path),
  createdAtIdx: index("idx_feedback_created_at").on(table.createdAt),
}));

// ---------------------------------------------------------------------------
// OUR PEOPLE MODULE TABLES (follow-ups, medication declarations, feedback)
// ---------------------------------------------------------------------------

// Patient follow-ups (onsite + external care) - TENANT ISOLATED
export const patientFollowUps = pgTable("patient_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").references(() => careLocations.id),

  // Subject: always an in-system patient (auto-created if needed)
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id),

  // Care context: where the relevant care happened
  careContext: varchar("care_context").notNull().default("onsite"), // onsite, external

  // External care details (when care_context = 'external')
  externalReferralFacilityId: varchar("external_referral_facility_id").references(() => referralFacilities.id),
  externalReferralFacilityOther: text("external_referral_facility_other"),
  externalDiagnosis: text("external_diagnosis"),
  externalReferralReason: text("external_referral_reason"),
  externalReferralDate: date("external_referral_date"),
  externalReferralIdentifier: varchar("external_referral_identifier"),

  // Follow-up plan
  followUpType: varchar("follow_up_type").notNull(), // phone_call, in_person, telehealth
  reason: text("reason").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time"),
  dueByDate: date("due_by_date"),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent

  // Outcome
  status: varchar("status").notNull().default("scheduled"), // scheduled, completed, cancelled, no_answer, rescheduled
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  outcomeNotes: text("outcome_notes"),
  outcomeCode: varchar("outcome_code"), // improved, stable, needs_revisit, admitted, deceased
  nextFollowUpDate: date("next_follow_up_date"),

  // Reminders & metadata
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
}, (table) => ({
  tenantIdx: index("idx_follow_ups_tenant").on(table.tenantId),
  locationIdx: index("idx_follow_ups_location").on(table.locationId),
  patientIdx: index("idx_follow_ups_patient").on(table.tenantId, table.patientId),
  scheduledIdx: index("idx_follow_ups_scheduled").on(table.tenantId, table.scheduledDate),
  statusIdx: index("idx_follow_ups_status").on(table.tenantId, table.status),
  careContextIdx: index("idx_follow_ups_care_context").on(table.tenantId, table.careContext),
}));

// Employee work fitness cases — medication review for return-to-work & safety (TENANT ISOLATED)
export const employeeWorkFitnessCases = pgTable("employee_work_fitness_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").references(() => careLocations.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),

  caseType: varchar("case_type").notNull().default("return_to_work"),
  contextNotes: text("context_notes"),
  employeeFeelingNotes: text("employee_feeling_notes"),

  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  submittedByEmployee: boolean("submitted_by_employee").default(true),
  submittedByUserId: varchar("submitted_by_user_id").references(() => users.id),

  status: varchar("status").notNull().default("submitted"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),

  fitnessOutcome: varchar("fitness_outcome"),
  fitnessImpact: varchar("fitness_impact"),
  workRestrictions: text("work_restrictions"),
  restrictionStartDate: date("restriction_start_date"),
  restrictionEndDate: date("restriction_end_date"),
  clearedUnderground: boolean("cleared_underground"),
  clearedHeavyMachinery: boolean("cleared_heavy_machinery"),

  mayAffectDrugTest: boolean("may_affect_drug_test").default(false),
  drugTestDisclosureNotes: text("drug_test_disclosure_notes"),

  assessmentNotes: text("assessment_notes"),
  actionTaken: varchar("action_taken"),
  actionNotes: text("action_notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
}, (table) => ({
  tenantIdx: index("idx_wf_cases_tenant").on(table.tenantId),
  employeeIdx: index("idx_wf_cases_employee").on(table.tenantId, table.employeeId),
  statusIdx: index("idx_wf_cases_status").on(table.tenantId, table.status),
  submittedIdx: index("idx_wf_cases_submitted").on(table.tenantId, table.submittedAt),
  outcomeIdx: index("idx_wf_cases_outcome").on(table.tenantId, table.fitnessOutcome),
}));

export const employeeWorkFitnessMedications = pgTable("employee_work_fitness_medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => employeeWorkFitnessCases.id, { onDelete: "cascade" }),

  medicationName: varchar("medication_name").notNull(),
  genericName: varchar("generic_name"),
  strength: varchar("strength"),
  dosageForm: varchar("dosage_form"),
  route: varchar("route"),
  frequency: varchar("frequency"),
  prescribedFor: text("prescribed_for"),
  prescriberName: varchar("prescriber_name"),
  prescriberFacility: varchar("prescriber_facility"),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  isOngoing: boolean("is_ongoing").default(true),

  employeeSideEffects: text("employee_side_effects"),
  employeeNoSideEffects: boolean("employee_no_side_effects").default(false),
  clinicianMedicationNotes: text("clinician_medication_notes"),
  medicationImageUrl: text("medication_image_url"),
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("idx_wf_meds_case").on(table.caseId),
  tenantIdx: index("idx_wf_meds_tenant").on(table.tenantId),
}));

// Employee feedback surveys - TENANT ISOLATED
export const employeeFeedbackSurveys = pgTable("employee_feedback_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  name: varchar("name").notNull(),
  description: text("description"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  questions: jsonb("questions").notNull(), // [{ id, type, text, options, required }]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_emp_feedback_surveys_tenant").on(table.tenantId),
  activeIdx: index("idx_emp_feedback_surveys_active").on(table.tenantId, table.isActive),
}));

// Employee feedback (Our People) - TENANT ISOLATED
export const employeeFeedback = pgTable("employee_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").notNull().references(() => careLocations.id),

  // Who gave feedback (optional for anonymity)
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: "set null" }),
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "set null" }),
  anonymous: boolean("anonymous").default(false),

  // When and where
  feedbackDate: date("feedback_date").defaultNow(),
  feedbackType: varchar("feedback_type").notNull().default("survey"), // survey, free_text, complaint, compliment

  // Structured survey (optional)
  surveyId: varchar("survey_id").references(() => employeeFeedbackSurveys.id),
  responses: jsonb("responses"), // { "question_id": "rating" or "choice_id" or "text" }

  // Overall and dimension ratings (simple 1–5 scales)
  overallExperienceRating: integer("overall_experience_rating"),
  staffCourtesyRating: integer("staff_courtesy_rating"),
  waitTimeRating: integer("wait_time_rating"),
  environmentCleanlinessRating: integer("environment_cleanliness_rating"),
  explanationClarityRating: integer("explanation_clarity_rating"),
  perceivedSafetyRating: integer("perceived_safety_rating"),
  wouldRecommend: boolean("would_recommend"),
  wouldReturn: boolean("would_return"),

  // Free-text feedback
  freeTextFeedback: text("free_text_feedback"),

  // Categorization for reporting (easily filterable)
  primaryCategory: varchar("primary_category"),   // wait_time, staff_courtesy, cleanliness, treatment_quality, environment, communication, access
  secondaryCategory: varchar("secondary_category"),
  sentiment: varchar("sentiment"),                // positive, neutral, negative
  tags: text("tags").array(),

  // Follow-up workflow
  status: varchar("status").default("new"), // new, in_review, acknowledged, resolved, closed
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  responseToFeedback: text("response_to_feedback"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_emp_feedback_tenant").on(table.tenantId),
  locationIdx: index("idx_emp_feedback_location").on(table.locationId),
  dateIdx: index("idx_emp_feedback_date").on(table.tenantId, table.feedbackDate),
  typeIdx: index("idx_emp_feedback_type").on(table.tenantId, table.feedbackType),
  statusIdx: index("idx_emp_feedback_status").on(table.tenantId, table.status),
}));

// Daily Operational Duties - TENANT ISOLATED
export const operationalDuties = pgTable("operational_duties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Duty details: title is the duty name (single concept)
  title: varchar("title").notNull(),
  description: text("description"),
  frequency: varchar("frequency").notNull(), // daily, weekly, monthly, scheduled
  
  // Scheduling
  scheduledTime: varchar("scheduled_time"), // e.g., "08:00" for airport stand-by
  scheduledDays: text("scheduled_days"), // JSON array: ["monday", "wednesday", "friday"]
  
  // Status and metadata
  isActive: boolean("is_active").default(true),
  priority: varchar("priority").default("normal"), // low, normal, high, critical
  estimatedDuration: integer("estimated_duration"), // in minutes
  category: varchar("category").notNull(), // medical, safety, equipment, inspection
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const operationalDutyAssignments = pgTable("operational_duty_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  dutyId: varchar("duty_id").notNull().references(() => operationalDuties.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  locationId: varchar("location_id").references(() => careLocations.id), // Care location for duty assignment
  
  // Assignment details
  assignmentDate: timestamp("assignment_date").notNull(),
  shift: varchar("shift").notNull(), // day, night
  status: varchar("status").default("pending"), // pending, in_progress, completed, cancelled, overdue
  
  // Completion tracking
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"), // When work actually began
  notes: text("notes"),
  
  // Cancellation tracking
  cancelledAt: timestamp("cancelled_at"),
  cancelledById: varchar("cancelled_by_id").references(() => users.id, { onDelete: "set null" }),
  cancellationReason: text("cancellation_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const operationalDutyCompletions = pgTable("operational_duty_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  assignmentId: varchar("assignment_id").notNull().references(() => operationalDutyAssignments.id, { onDelete: "cascade" }),
  dutyId: varchar("duty_id").notNull().references(() => operationalDuties.id, { onDelete: "cascade" }),
  completedById: varchar("completed_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Completion details
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  completionNotes: text("completion_notes"),
  issuesFound: boolean("issues_found").default(false),
  issueDescription: text("issue_description"),
  followUpRequired: boolean("follow_up_required").default(false),
  
  // Evidence/documentation
  attachments: text("attachments"), // File paths for photos/documents
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Demo table for the Drizzle migration workflow (schema.ts → db:generate → db:drizzle-migrate).
 * Safe to drop later; not used by production features.
 */
export const schemaMigrationDemos = pgTable(
  "schema_migration_demos",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_schema_migration_demos_tenant").on(table.tenantId),
    index("idx_schema_migration_demos_tenant_active").on(table.tenantId, table.isActive),
  ],
);

/** Optional JSON shape for ShiftOver structured handover (shift_reports.handover_structured) */
export const handoverStructuredSchema = z.object({
  completed: z.string().optional(),
  inProgress: z.string().optional(),
  blocked: z.string().optional(),
  risksWatch: z.string().optional(),
  forNextShift: z.string().optional(),
});
export type HandoverStructured = z.infer<typeof handoverStructuredSchema>;

// Shift reports - end-of-shift narrative reports per location (tenant isolated)
export const shiftReports = pgTable(
  "shift_reports",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    locationId: varchar("location_id").notNull().references(() => careLocations.id, { onDelete: "cascade" }),
    reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reportDate: date("report_date").notNull(),
    shift: varchar("shift").notNull(), // day, night
    summary: varchar("summary").notNull(), // short sentence from select
    notes: text("notes"),
    activitiesNotes: text("activities_notes"),
    handoverNotes: text("handover_notes"),
    hasIssues: boolean("has_issues").default(false),
    issuesNotes: text("issues_notes"),
    /** Structured handover sections (optional); complements notes / handover_notes */
    handoverStructured: jsonb("handover_structured").$type<HandoverStructured | null>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_shift_reports_tenant_date").on(table.tenantId, table.reportDate),
    index("idx_shift_reports_location_date").on(table.locationId, table.reportDate),
  ]
);

export const shiftReportAcknowledgments = pgTable(
  "shift_report_acknowledgments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    shiftReportId: varchar("shift_report_id")
      .notNull()
      .references(() => shiftReports.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shift_report_ack_tenant").on(table.tenantId),
    index("idx_shift_report_ack_report").on(table.shiftReportId),
    unique("shift_report_ack_report_user_unique").on(table.shiftReportId, table.userId),
  ]
);

export const shiftReportLinks = pgTable(
  "shift_report_links",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    shiftReportId: varchar("shift_report_id")
      .notNull()
      .references(() => shiftReports.id, { onDelete: "cascade" }),
    linkedType: varchar("linked_type").notNull(), // ticket | incident | duty
    linkedId: varchar("linked_id").notNull(),
    note: text("note"),
    createdByUserId: varchar("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shift_report_links_tenant").on(table.tenantId),
    index("idx_shift_report_links_report").on(table.shiftReportId),
    index("idx_shift_report_links_target").on(table.linkedType, table.linkedId),
    unique("shift_report_links_report_target_unique").on(table.shiftReportId, table.linkedType, table.linkedId),
  ]
);

export const shiftReportAttachments = pgTable(
  "shift_report_attachments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    shiftReportId: varchar("shift_report_id")
      .notNull()
      .references(() => shiftReports.id, { onDelete: "cascade" }),
    fileUrl: varchar("file_url").notNull(),
    originalName: varchar("original_name").notNull(),
    mimeType: varchar("mime_type"),
    sizeBytes: integer("size_bytes"),
    uploadedByUserId: varchar("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_shift_report_attachments_report").on(table.shiftReportId)]
);

export const shiftReportRevisionHistory = pgTable(
  "shift_report_revision_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    shiftReportId: varchar("shift_report_id")
      .notNull()
      .references(() => shiftReports.id, { onDelete: "cascade" }),
    editedByUserId: varchar("edited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    previousSnapshot: jsonb("previous_snapshot").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shift_report_revision_report").on(table.shiftReportId, table.createdAt),
  ]
);

// Staff e-ticketing — tenant isolated (see docs/E_TICKETING_STAFF_PLAN.md)
export const ticketNumberSequences = pgTable(
  "ticket_number_sequences",
  {
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.year] })]
);

export const ticketCategories = pgTable(
  "ticket_categories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ticket_categories_tenant").on(table.tenantId),
    unique("ticket_categories_tenant_slug_unique").on(table.tenantId, table.slug),
  ]
);

export const tickets = pgTable(
  "tickets",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketNumber: varchar("ticket_number").notNull(),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => ticketCategories.id, { onDelete: "restrict" }),
    title: varchar("title").notNull(),
    descriptionHtml: text("description_html").notNull().default(""),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    requesterUserId: varchar("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assigneeUserId: varchar("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    locationId: varchar("location_id").references(() => careLocations.id, { onDelete: "set null" }),
    relatedIncidentId: varchar("related_incident_id").references(() => incidentReports.id, {
      onDelete: "set null",
    }),
    assetTag: varchar("asset_tag", { length: 255 }),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("tickets_tenant_ticket_number_unique").on(table.tenantId, table.ticketNumber),
    index("idx_tickets_tenant_status_updated").on(table.tenantId, table.status, table.updatedAt),
    index("idx_tickets_tenant_requester").on(table.tenantId, table.requesterUserId),
    index("idx_tickets_tenant_assignee").on(table.tenantId, table.assigneeUserId),
  ]
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    authorUserId: varchar("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bodyHtml: text("body_html").notNull().default(""),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_ticket_comments_ticket").on(table.ticketId, table.createdAt)]
);

export const ticketAttachments = pgTable(
  "ticket_attachments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    fileUrl: varchar("file_url").notNull(),
    originalName: varchar("original_name").notNull(),
    mimeType: varchar("mime_type"),
    sizeBytes: integer("size_bytes"),
    uploadedByUserId: varchar("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_ticket_attachments_ticket").on(table.ticketId)]
);

export const ticketActivity = pgTable(
  "ticket_activity",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 64 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_ticket_activity_ticket").on(table.ticketId, table.createdAt)]
);

/** Secure messaging — patient ↔ staff threads (tenant-scoped). */
export const conversationTypeEnum = pgEnum("conversation_type", [
  "patient_staff",
  "staff_internal",
  "encounter_thread",
  "appointment_thread",
]);

export const conversationStatusEnum = pgEnum("conversation_status", ["open", "closed", "archived"]);

export const messageSenderTypeEnum = pgEnum("message_sender_type", ["staff", "portal", "system"]);

export const messagingParticipantTypeEnum = pgEnum("messaging_participant_type", ["staff", "portal"]);

export const messagingAuditActorTypeEnum = pgEnum("messaging_audit_actor_type", ["staff", "portal", "system"]);

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: conversationTypeEnum("type").notNull().default("patient_staff"),
    subject: varchar("subject", { length: 255 }),
    patientId: varchar("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    status: conversationStatusEnum("status").notNull().default("open"),
    assignedStaffUserId: varchar("assigned_staff_user_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }),
    createdByType: messagingParticipantTypeEnum("created_by_type").notNull(),
    createdByStaffUserId: varchar("created_by_staff_user_id").references(() => users.id, { onDelete: "set null" }),
    createdByPortalUserId: varchar("created_by_portal_user_id").references(() => portalUsers.id, {
      onDelete: "set null",
    }),
    retentionUntil: timestamp("retention_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conversations_tenant_last_message").on(table.tenantId, table.lastMessageAt),
    index("idx_conversations_tenant_patient").on(table.tenantId, table.patientId),
    index("idx_conversations_tenant_status").on(table.tenantId, table.status),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    participantType: messagingParticipantTypeEnum("participant_type").notNull(),
    staffUserId: varchar("staff_user_id").references(() => users.id, { onDelete: "cascade" }),
    portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
    lastReadAt: timestamp("last_read_at"),
    notificationsMuted: boolean("notifications_muted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_conversation_participants_conversation").on(table.conversationId)],
);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderType: messageSenderTypeEnum("sender_type").notNull(),
    senderStaffUserId: varchar("sender_staff_user_id").references(() => users.id, { onDelete: "set null" }),
    senderPortalUserId: varchar("sender_portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    deletedAt: timestamp("deleted_at"),
    editedAt: timestamp("edited_at"),
    clientMessageId: varchar("client_message_id", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_messages_conversation_created").on(table.conversationId, table.createdAt)],
);

export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    messageId: varchar("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    fileUrl: varchar("file_url", { length: 2048 }).notNull(),
    originalName: varchar("original_name", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    sizeBytes: integer("size_bytes"),
    uploadedByType: messagingParticipantTypeEnum("uploaded_by_type").notNull(),
    uploadedByStaffUserId: varchar("uploaded_by_staff_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedByPortalUserId: varchar("uploaded_by_portal_user_id").references(() => portalUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_message_attachments_message").on(table.messageId)],
);

export const messagingAuditLog = pgTable(
  "messaging_audit_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    actorType: messagingAuditActorTypeEnum("actor_type").notNull(),
    actorStaffUserId: varchar("actor_staff_user_id").references(() => users.id, { onDelete: "set null" }),
    actorPortalUserId: varchar("actor_portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    messageId: varchar("message_id").references(() => messages.id, { onDelete: "set null" }),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messaging_audit_tenant_created").on(table.tenantId, table.createdAt),
    index("idx_messaging_audit_conversation").on(table.conversationId, table.createdAt),
  ],
);

/** Tenant-authored standard operating procedures (versioned, approval workflow). */
export const tenantSopVersionStatusEnum = pgEnum("tenant_sop_version_status", [
  "draft",
  "pending_approval",
  "published",
  "archived",
  "rejected",
]);

export const tenantSopDocuments = pgTable(
  "tenant_sop_documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 512 }).notNull(),
    code: varchar("code", { length: 64 }),
    department: varchar("department", { length: 128 }),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_tenant_sop_documents_tenant").on(table.tenantId),
    index("idx_tenant_sop_documents_tenant_archived").on(table.tenantId, table.isArchived),
  ]
);

export const tenantSopVersions = pgTable(
  "tenant_sop_versions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id")
      .notNull()
      .references(() => tenantSopDocuments.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: tenantSopVersionStatusEnum("status").notNull().default("draft"),
    contentHtml: text("content_html").notNull().default(""),
    attachmentUrl: varchar("attachment_url", { length: 2048 }),
    attachmentFilename: varchar("attachment_filename", { length: 512 }),
    attachmentMime: varchar("attachment_mime", { length: 128 }),
    changeNotes: text("change_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    approvedByUserId: varchar("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at"),
    rejectedByUserId: varchar("rejected_by_user_id").references(() => users.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
  },
  (table) => [
    unique("uq_tenant_sop_versions_doc_ver").on(table.documentId, table.versionNumber),
    index("idx_tenant_sop_versions_document").on(table.documentId),
    index("idx_tenant_sop_versions_status").on(table.status),
  ]
);

// Suppliers (Tenant Isolated) - normalized supplier data for POs and optional default per item
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  name: varchar("name").notNull(),
  contactName: varchar("contact_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant-scoped inventory categories (defaults seeded per tenant; businesses can add their own)
export const inventoryCategories = pgTable(
  "inventory_categories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    itemCodePrefix: varchar("item_code_prefix", { length: 8 }).notNull(),
    /** Drives form fields: medication | supplies | equipment | consumables */
    fieldTemplate: varchar("field_template").notNull().default("supplies"),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_inventory_categories_tenant").on(table.tenantId),
    unique("inventory_categories_tenant_slug_unique").on(table.tenantId, table.slug),
  ]
);

// Medical Inventory & Equipment Tracking Tables
// Master catalog: one row per logical item (no stock, no location)
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id),

  itemName: varchar("item_name").notNull(),
  itemCode: varchar("item_code").notNull(),
  /** Category slug — matches inventory_categories.slug for the tenant */
  category: varchar("category").notNull(),
  brand: varchar("brand"),
  model: varchar("model"),
  description: text("description"),
  unitOfMeasure: varchar("unit_of_measure").notNull(),
  dosageForm: varchar("dosage_form"),

  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplier: varchar("supplier"),
  supplierContact: varchar("supplier_contact"),

  imageUrl: varchar("image_url"),
  barcode: varchar("barcode"),

  status: inventoryStatusEnum("status").default("active"),
  equipmentStatus: varchar("equipment_status"),
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"),
  warrantyExpiry: date("warranty_expiry"),
  serialNumber: varchar("serial_number"),

  lowStockAlert: boolean("low_stock_alert").default(true),
  expiryAlert: boolean("expiry_alert").default(true),
  expiryAlertDays: integer("expiry_alert_days").default(30),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueItemCodePerTenant: unique().on(table.tenantId, table.itemCode),
  idxInventoryItemsCategory: index("idx_inventory_items_category").on(table.tenantId, table.category),
}));

// Per-location stock: one row per (item, location)
export const inventoryStock = pgTable("inventory_stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").notNull().references(() => careLocations.id, { onDelete: "cascade" }),

  currentStock: integer("current_stock").default(0),
  minimumStock: integer("minimum_stock").default(0),
  maximumStock: integer("maximum_stock").default(100),
  reorderPoint: integer("reorder_point").default(10),

  unitCost: varchar("unit_cost"),
  totalValue: varchar("total_value"),

  expiryDate: date("expiry_date"),
  batchNumber: varchar("batch_number"),
  lotNumber: varchar("lot_number"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueItemLocationPerTenant: unique().on(table.tenantId, table.itemId, table.locationId)
}));

// Inventory Transactions (Tenant Isolated)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryStock.id, { onDelete: "cascade" }),

  // Location context
  locationId: varchar("location_id").references(() => careLocations.id),              // where this stock change occurred
  counterpartyLocationId: varchar("counterparty_location_id").references(() => careLocations.id), // the "other side" for transfers
  
  // Transaction details
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  unitCost: varchar("unit_cost"), // Cost per unit for receipts
  totalCost: varchar("total_cost"), // Total transaction cost
  
  // References
  reference: varchar("reference"),
  reason: varchar("reason"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  
  // Patient linkage for clinic issues (medical_visit_id dropped with encounters)
  patientId: varchar("patient_id").references(() => patients.id),

  // Parent document linkage (requisition, transfer, purchase order, visit, etc.)
  documentType: varchar("document_type"), // e.g. 'requisition', 'transfer', 'purchase_order', 'visit', 'manual'
  documentId: varchar("document_id"),

  // Additional details
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stock Requisitions (requesting stock between locations)
export const stockRequisitions = pgTable("stock_requisitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  requestingLocationId: varchar("requesting_location_id").notNull().references(() => careLocations.id),
  fulfillingLocationId: varchar("fulfilling_location_id").notNull().references(() => careLocations.id),

  status: varchar("status").notNull().default("submitted"), // draft, submitted, approved, rejected, partially_fulfilled, fulfilled, cancelled

  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  approvedById: varchar("approved_by_id").references(() => users.id),

  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stockRequisitionItems = pgTable("stock_requisition_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  requisitionId: varchar("requisition_id").notNull().references(() => stockRequisitions.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),

  requestedQuantity: integer("requested_quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),

  unitOfMeasure: varchar("unit_of_measure"),
  unitCost: varchar("unit_cost"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Stock Transfers (movement of stock between locations)
export const stockTransfers = pgTable("stock_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  fromLocationId: varchar("from_location_id").notNull().references(() => careLocations.id),
  toLocationId: varchar("to_location_id").notNull().references(() => careLocations.id),

  type: varchar("type").notNull().default("normal"), // normal, return, loan, etc.
  status: varchar("status").notNull().default("pending_dispatch"), // draft, pending_dispatch, in_transit, partially_received, received, cancelled

  requisitionId: varchar("requisition_id").references(() => stockRequisitions.id),

  dispatchedById: varchar("dispatched_by_id").references(() => users.id),
  dispatchedAt: timestamp("dispatched_at"),

  receivedById: varchar("received_by_id").references(() => users.id),
  receivedAt: timestamp("received_at"),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  transferId: varchar("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),

  quantityPlanned: integer("quantity_planned").notNull(),
  quantityDispatched: integer("quantity_dispatched"),
  quantityReceived: integer("quantity_received"),

  unitOfMeasure: varchar("unit_of_measure"),
  unitCost: varchar("unit_cost"),

  batchNumber: varchar("batch_number"),
  expiryDate: date("expiry_date"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Point of Sale (registers, shifts, sales)
export const posRegisters = pgTable("pos_registers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").notNull().references(() => careLocations.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantLocationIdx: index("idx_pos_registers_tenant_location").on(table.tenantId, table.locationId),
}));

export const posShifts = pgTable("pos_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  registerId: varchar("register_id").notNull().references(() => posRegisters.id, { onDelete: "cascade" }),
  openedByUserId: varchar("opened_by_user_id").notNull().references(() => users.id),
  closedByUserId: varchar("closed_by_user_id").references(() => users.id),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  openingFloat: varchar("opening_float").notNull().default("0"),
  closingFloat: varchar("closing_float"),
  status: posShiftStatusEnum("status").notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  registerStatusIdx: index("idx_pos_shifts_register_status").on(table.registerId, table.status),
}));

export const posSales = pgTable("pos_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  registerId: varchar("register_id").notNull().references(() => posRegisters.id),
  shiftId: varchar("shift_id").notNull().references(() => posShifts.id),
  locationId: varchar("location_id").notNull().references(() => careLocations.id),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  cashierUserId: varchar("cashier_user_id").notNull().references(() => users.id),
  status: posSaleStatusEnum("status").notNull().default("draft"),
  subtotal: varchar("subtotal").notNull().default("0"),
  taxTotal: varchar("tax_total").notNull().default("0"),
  total: varchar("total").notNull().default("0"),
  currencyCode: varchar("currency_code").notNull().default("GHS"),
  completedAt: timestamp("completed_at"),
  voidedAt: timestamp("voided_at"),
  receiptNumber: varchar("receipt_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantShiftIdx: index("idx_pos_sales_tenant_shift").on(table.tenantId, table.shiftId),
  receiptIdx: index("idx_pos_sales_receipt").on(table.tenantId, table.receiptNumber),
}));

export const posSaleLines = pgTable("pos_sale_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull().references(() => posSales.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inventoryItemId: varchar("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: varchar("unit_price").notNull(),
  taxRate: real("tax_rate").notNull().default(0),
  taxAmount: varchar("tax_amount").notNull().default("0"),
  lineTotal: varchar("line_total").notNull(),
  barcodeSnapshot: varchar("barcode_snapshot"),
});

export const posPayments = pgTable("pos_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull().references(() => posSales.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  method: posPaymentMethodEnum("method").notNull(),
  amount: varchar("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posReturns = pgTable("pos_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  originalSaleId: varchar("original_sale_id").notNull().references(() => posSales.id),
  saleId: varchar("sale_id").notNull().references(() => posSales.id),
  reason: text("reason"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment Maintenance (Tenant Isolated)
export const equipmentMaintenance = pgTable("equipment_maintenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").notNull().references(() => inventoryStock.id, { onDelete: "cascade" }),
  
  // Maintenance details
  maintenanceType: maintenanceTypeEnum("maintenance_type").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  completedDate: date("completed_date"),
  maintenanceDescription: text("maintenance_description").notNull(),
  
  // Service details
  technicianName: varchar("technician_name"),
  serviceCompany: varchar("service_company"),
  cost: varchar("cost"), // Using varchar for decimal precision
  
  // Scheduling
  nextMaintenanceDate: date("next_maintenance_date"),
  certificationExpires: date("certification_expires"),
  
  // Status and tracking
  status: maintenanceStatusEnum("status").default("scheduled"),
  completedBy: varchar("completed_by").references(() => users.id),
  
  // Issues and results
  issuesFound: boolean("issues_found").default(false),
  issueDescription: text("issue_description"),
  equipmentStatus: inventoryStatusEnum("equipment_status").default("active"), // Updated equipment status after maintenance
  
  // Documentation
  attachments: text("attachments"), // File paths for photos/documents
  notes: text("notes"),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Orders (Tenant Isolated)
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Order details
  poNumber: varchar("po_number").notNull(),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),

  // Dates
  orderDate: date("order_date").notNull(),
  expectedDelivery: date("expected_delivery"),
  actualDelivery: date("actual_delivery"),

  // Financial
  totalAmount: varchar("total_amount").notNull(), // Using varchar for decimal precision

  // Status and approval
  status: purchaseOrderStatusEnum("status").default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),

  // Tracking
  createdBy: varchar("created_by").notNull().references(() => users.id),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique PO numbers per tenant
  uniquePoNumberPerTenant: unique().on(table.tenantId, table.poNumber)
}));

// Purchase Order Items (Tenant Isolated)
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  poId: varchar("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  
  // Quantities
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").default(0),
  
  // Costs
  unitCost: varchar("unit_cost").notNull(), // Using varchar for decimal precision
  totalCost: varchar("total_cost").notNull(), // Calculated: quantity * unit_cost
  
  // Item details at time of order
  itemDescription: text("item_description"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory Alerts (Tenant Isolated) - For tracking alert history and status
export const inventoryAlerts = pgTable("inventory_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryStock.id, { onDelete: "cascade" }),
  
  // Alert details
  alertType: varchar("alert_type").notNull(), // low_stock, expiry, equipment_maintenance, equipment_failure
  severity: varchar("severity").default("medium"), // low, medium, high, critical
  message: text("message").notNull(),
  
  // Alert status
  isActive: boolean("is_active").default(true),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  
  // Alert data snapshot
  currentStock: integer("current_stock"),
  minimumStock: integer("minimum_stock"),
  expiryDate: date("expiry_date"),
  daysToExpiry: integer("days_to_expiry"),
  
  // Notification tracking
  notificationSentAt: timestamp("notification_sent_at"), // Track when notifications were last sent
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========================================
// DRUGS, ALCOHOL & HYDRATION TESTING MODULE  
// ========================================

// Testing Programs (Tenant Isolated) - Covers D&A&H
export const testingPrograms = pgTable("testing_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Program details
  programName: varchar("program_name").notNull(),
  programType: testingProgramTypeEnum("program_type").notNull(),
  testingFrequency: varchar("testing_frequency"), // "monthly", "quarterly", "annually"
  poolSize: integer("pool_size").default(0),
  active: boolean("active").default(true),
  
  // Configuration - Now includes hydration testing
  requiredTests: text("required_tests"), // JSON array: ["drug", "alcohol", "hydration"]
  departments: text("departments"), // JSON array of applicable departments
  jobClassifications: text("job_classifications"), // JSON array of job titles
  ugPersonnelFocused: boolean("ug_personnel_focused").default(false), // Hydration focus for underground
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique program names per tenant
  uniqueProgramNamePerTenant: unique().on(table.tenantId, table.programName)
}));

// Drug Tests (Tenant Isolated)
export const drugTests = pgTable("drug_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Test identification
  testNumber: varchar("test_number").notNull(),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").references(() => patients.id),
  programId: varchar("program_id").references(() => testingPrograms.id),
  locationId: varchar("location_id").references(() => careLocations.id), // Care location where test conducted
  
  // Test configuration
  testReason: testReasonEnum("test_reason").notNull(),
  testMode: testModeEnum("test_mode").default("simple"), // simple, comprehensive
  specimenType: specimenTypeEnum("specimen_type").default("urine"),
  testingDevice: testingDeviceEnum("testing_device").default("drugcheck_3000"),
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  collectionDate: date("collection_date"),
  collectionTime: varchar("collection_time"),
  
  // Collection details
  collectorName: varchar("collector_name"),
  collectionSite: varchar("collection_site"),
  chainOfCustody: varchar("chain_of_custody"),
  
  // Testing details
  testingLab: varchar("testing_lab"),
  resultDate: date("result_date"),
  
  // DrugCheck 3000 results (simple test)
  drugResult: testResultEnum("drug_result"),
  substancesDetected: text("substances_detected"), // JSON array
  cocResult: testResultEnum("coc_result"), // Cocaine
  opiResult: testResultEnum("opi_result"), // Opioids  
  thcResult: testResultEnum("thc_result"), // Cannabis
  ampResult: testResultEnum("amp_result"), // Amphetamines
  metResult: testResultEnum("met_result"), // Methamphetamines
  bzoResult: testResultEnum("bzo_result"), // Benzodiazepines
  
  // MRO Review and final results
  mroReview: boolean("mro_review").default(false),
  mroName: varchar("mro_name"),
  mroNotes: text("mro_notes"),
  finalResult: finalTestResultEnum("final_result"),
  
  // Actions and follow-up
  disciplinaryAction: text("disciplinary_action"),
  returnToDutyRequired: boolean("return_to_duty_required").default(false),
  followUpTestingRequired: boolean("follow_up_testing_required").default(false),
  
  // Status and metadata
  status: testStatusEnum("status").default("scheduled"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTestNumberPerTenant: unique().on(table.tenantId, table.testNumber)
}));

// Alcohol Tests (Tenant Isolated)
export const alcoholTests = pgTable("alcohol_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Test identification
  testNumber: varchar("test_number").notNull(),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").references(() => patients.id),
  programId: varchar("program_id").references(() => testingPrograms.id),
  locationId: varchar("location_id").references(() => careLocations.id), // Care location where test conducted
  
  // Test configuration
  testReason: testReasonEnum("test_reason").notNull(),
  testMode: testModeEnum("test_mode").default("simple"), // simple (breathalyzer), comprehensive (lab)
  testingDevice: varchar("testing_device").default("breathalyzer"),
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  testDate: date("test_date"),
  testTime: varchar("test_time"),
  
  // Test details
  testerName: varchar("tester_name"),
  testLocation: varchar("test_location"),
  
  // Breathalyzer results (simple test)
  alcoholResult: testResultEnum("alcohol_result"),
  alcoholLevel: varchar("alcohol_level"), // BAC level as decimal
  breathalyzerReading: varchar("breathalyzer_reading"),
  deviceSerialNumber: varchar("device_serial_number"),
  
  // Lab test results (blood/urine if escalated)
  labResult: testResultEnum("lab_result"),
  labAlcoholLevel: varchar("lab_alcohol_level"),
  finalResult: finalTestResultEnum("final_result"),
  
  // Actions and follow-up
  disciplinaryAction: text("disciplinary_action"),
  returnToDutyRequired: boolean("return_to_duty_required").default(false),
  followUpTestingRequired: boolean("follow_up_testing_required").default(false),
  
  // Status and metadata
  status: testStatusEnum("status").default("scheduled"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTestNumberPerTenant: unique().on(table.tenantId, table.testNumber)
}));

// Hydration Tests (Tenant Isolated) - Independent peer to D&A
export const hydrationTests = pgTable("hydration_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Test identification
  testNumber: varchar("test_number").notNull(),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").references(() => patients.id),
  programId: varchar("program_id").references(() => testingPrograms.id),
  locationId: varchar("location_id").references(() => careLocations.id), // Care location where test conducted
  
  // Test configuration
  testReason: hydrationTestReasonEnum("test_reason").notNull(), // random, post_incident, on_demand, heat_illness_suspected
  testLocation: varchar("test_location"), // underground, surface, medical_station (work area where tested)
  ugPersonnel: boolean("ug_personnel").default(false), // Underground personnel flag
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  testDate: date("test_date"),
  testTime: varchar("test_time"),
  
  // Environmental conditions
  ambientTemperature: varchar("ambient_temperature"),
  humidity: varchar("humidity"),
  workIntensity: workIntensityEnum("work_intensity"), // light, moderate, heavy, extreme
  
  // Hydration assessment methods
  urineColor: urineColorEnum("urine_color"), // 1-8 scale (1=pale_yellow, 8=brown)
  urineSpecificGravity: varchar("urine_specific_gravity"), // 1.000-1.030
  bodyWeightBefore: varchar("body_weight_before"), // kg
  bodyWeightAfter: varchar("body_weight_after"), // kg
  weightLossPercentage: varchar("weight_loss_percentage"), // calculated
  
  // Clinical signs assessment
  skinTurgor: hydrationLevelEnum("skin_turgor"), // normal, mild, moderate, severe
  mucousMembranes: hydrationLevelEnum("mucous_membranes"),
  mentalStatus: varchar("mental_status"), // alert, confused, lethargic
  vitalSigns: text("vital_signs"), // JSON: {bp, hr, temp, resp_rate}
  
  // Results
  hydrationLevel: hydrationLevelEnum("hydration_level").notNull(), // normal, mild_dehydration, moderate_dehydration, severe_dehydration
  hydrationScore: integer("hydration_score"), // Calculated composite score
  recommendedAction: hydrationActionEnum("recommended_action"), // continue_work, rest_hydrate, medical_evaluation, immediate_treatment
  
  // Follow-up
  treatmentProvided: boolean("treatment_provided").default(false),
  treatmentNotes: text("treatment_notes"),
  returnToWorkCleared: boolean("return_to_work_cleared").default(false),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: date("follow_up_date"),
  
  // Status and metadata
  status: testStatusEnum("status").default("scheduled"),
  notes: text("notes"),
  testedBy: varchar("tested_by").notNull().references(() => users.id), // Medical staff
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTestNumberPerTenant: unique().on(table.tenantId, table.testNumber)
}));

// POC Instant Tests (Tenant Isolated) - HB, Pregnancy, Malaria, Typhoid
// Subject is primarily a customer; employee is an optional alternative.
export const instantTests = pgTable("instant_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Test identification
  testNumber: varchar("test_number").notNull(),
  /** Walk-in / retail subject (primary). Nullable when the subject is an employee. */
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  /** Staff/employee subject (optional alternative to customer). */
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "set null" }),
  patientId: varchar("patient_id").references(() => patients.id),
  locationId: varchar("location_id").references(() => careLocations.id), // Store location where test conducted
  
  // Test configuration
  testType: instantTestTypeEnum("test_type").notNull(), // hb, pregnancy, malaria, typhoid
  testDate: date("test_date").notNull(),
  testTime: varchar("test_time"),
  testedBy: varchar("tested_by").notNull().references(() => users.id),
  
  // Results
  testResult: instantTestResultEnum("test_result"), // positive, negative, invalid (not applicable for HB)
  hbLevel: varchar("hb_level"), // For HB tests only - e.g., "12.5" (g/dL)
  
  // Metadata
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueTestNumberPerTenant: unique().on(table.tenantId, table.testNumber),
  customerIdx: index("idx_instant_tests_customer").on(table.customerId),
  employeeIdx: index("idx_instant_tests_employee").on(table.employeeId),
}));

// Random Testing Pools (Tenant Isolated)
export const randomTestingPools = pgTable("random_testing_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Pool configuration
  poolName: varchar("pool_name").notNull(),
  department: departmentEnum("department"),
  jobClassification: varchar("job_classification"),
  employeeCount: integer("employee_count").default(0),
  testingRate: varchar("testing_rate"), // Percentage as decimal
  
  // Selection scheduling
  lastSelectionDate: date("last_selection_date"),
  nextSelectionDate: date("next_selection_date"),
  
  // Status
  active: boolean("active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique pool names per tenant
  uniquePoolNamePerTenant: unique().on(table.tenantId, table.poolName)
}));

// Random Selection History (Tenant Isolated)
export const randomSelections = pgTable("random_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  poolId: varchar("pool_id").notNull().references(() => randomTestingPools.id, { onDelete: "cascade" }),
  
  // Selection details
  selectionDate: date("selection_date").notNull(),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  selectedForTesting: boolean("selected_for_testing").default(true),
  
  // Test tracking
  testCompleted: boolean("test_completed").default(false),
  drugTestId: varchar("drug_test_id").references(() => drugTests.id),
  alcoholTestId: varchar("alcohol_test_id").references(() => alcoholTests.id),
  hydrationTestId: varchar("hydration_test_id").references(() => hydrationTests.id),
  
  // Selection metadata
  selectionMethod: varchar("selection_method"), // "random", "manual", "system"
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Testing Equipment & Devices (Tenant Isolated)
export const testingEquipment = pgTable("testing_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Equipment details
  deviceName: varchar("device_name").notNull(),
  deviceType: testingDeviceEnum("device_type").notNull(),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  manufacturer: varchar("manufacturer"),
  
  // Calibration and maintenance
  lastCalibrationDate: date("last_calibration_date"),
  nextCalibrationDate: date("next_calibration_date"),
  calibrationCertificate: varchar("calibration_certificate"),
  
  // Status
  status: inventoryStatusEnum("status").default("active"),
  location: varchar("location"),
  
  // Capabilities
  supportedTests: text("supported_tests"), // JSON array of supported test types
  testAccuracy: varchar("test_accuracy"), // e.g., "99.5%"
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for better query handling
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
  appointments: many(appointments),
  incidentReports: many(incidentReports),
  sentNotifications: many(notifications, { relationName: "sender" }),
  receivedNotifications: many(notifications, { relationName: "recipient" }),
  dutyAssignments: many(operationalDutyAssignments, { relationName: "assignedTo" }),
  dutyCompletions: many(operationalDutyCompletions),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  companies: many(companies),
  employees: many(employees),
  patients: many(patients),
  careLocations: many(careLocations),
  referralFacilities: many(referralFacilities),
  appointments: many(appointments),
  incidentReports: many(incidentReports),
  notifications: many(notifications),
  operationalDuties: many(operationalDuties),
  dutyAssignments: many(operationalDutyAssignments),
  dutyCompletions: many(operationalDutyCompletions),
  schemaMigrationDemos: many(schemaMigrationDemos),
  inventoryItems: many(inventoryItems),
  inventoryStock: many(inventoryStock),
  inventoryTransactions: many(inventoryTransactions),
  equipmentMaintenance: many(equipmentMaintenance),
  purchaseOrders: many(purchaseOrders),
  purchaseOrderItems: many(purchaseOrderItems),
  inventoryAlerts: many(inventoryAlerts),
  testingPrograms: many(testingPrograms),
  drugTests: many(drugTests),
  alcoholTests: many(alcoholTests),
  hydrationTests: many(hydrationTests),
  randomTestingPools: many(randomTestingPools),
  randomSelections: many(randomSelections),
  testingEquipment: many(testingEquipment),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [companies.tenantId],
    references: [tenants.id],
  }),
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [employees.id],
    references: [users.employeeId],
  }),
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [patients.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [patients.employeeId],
    references: [employees.id],
  }),
  appointments: many(appointments),
  incidentReports: many(incidentReports),
}));

// Care Locations relations
export const careLocationsRelations = relations(careLocations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [careLocations.tenantId],
    references: [tenants.id],
  }),
  stationedAtLocation: one(careLocations, {
    fields: [careLocations.stationedAtLocationId],
    references: [careLocations.id],
    relationName: "stationed_at_post",
  }),
  ambulancesStationedHere: many(careLocations, {
    relationName: "stationed_at_post",
  }),
  appointments: many(appointments),
  incidentReports: many(incidentReports),
  drugTests: many(drugTests),
  alcoholTests: many(alcoholTests),
  hydrationTests: many(hydrationTests),
  dutyAssignments: many(operationalDutyAssignments),
  ambulancePrestartChecks: many(ambulancePrestartChecks),
}));

export const ambulancePrestartChecksRelations = relations(ambulancePrestartChecks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ambulancePrestartChecks.tenantId],
    references: [tenants.id],
  }),
  ambulanceLocation: one(careLocations, {
    fields: [ambulancePrestartChecks.ambulanceLocationId],
    references: [careLocations.id],
  }),
  completedByUser: one(users, {
    fields: [ambulancePrestartChecks.completedByUserId],
    references: [users.id],
  }),
}));

// Referral facilities relations
export const referralFacilitiesRelations = relations(referralFacilities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [referralFacilities.tenantId],
    references: [tenants.id],
  }),
}));

// Operational duty relations
export const operationalDutiesRelations = relations(operationalDuties, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [operationalDuties.tenantId],
    references: [tenants.id],
  }),
  assignments: many(operationalDutyAssignments),
  completions: many(operationalDutyCompletions),
}));

export const operationalDutyAssignmentsRelations = relations(operationalDutyAssignments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [operationalDutyAssignments.tenantId],
    references: [tenants.id],
  }),
  duty: one(operationalDuties, {
    fields: [operationalDutyAssignments.dutyId],
    references: [operationalDuties.id],
  }),
  assignedTo: one(users, {
    fields: [operationalDutyAssignments.assignedToId],
    references: [users.id],
  }),
  completedBy: one(users, {
    fields: [operationalDutyAssignments.completedById],
    references: [users.id],
  }),
}));

export const operationalDutyCompletionsRelations = relations(operationalDutyCompletions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [operationalDutyCompletions.tenantId],
    references: [tenants.id],
  }),
  assignment: one(operationalDutyAssignments, {
    fields: [operationalDutyCompletions.assignmentId],
    references: [operationalDutyAssignments.id],
  }),
  duty: one(operationalDuties, {
    fields: [operationalDutyCompletions.dutyId],
    references: [operationalDuties.id],
  }),
  completedBy: one(users, {
    fields: [operationalDutyCompletions.completedById],
    references: [users.id],
  }),
}));

export const schemaMigrationDemosRelations = relations(schemaMigrationDemos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [schemaMigrationDemos.tenantId],
    references: [tenants.id],
  }),
}));

// Master items & per-location stock relations
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [suppliers.tenantId], references: [tenants.id] }),
  purchaseOrders: many(purchaseOrders),
  inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  tenant: one(tenants, { fields: [inventoryItems.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [inventoryItems.companyId], references: [companies.id] }),
  supplier: one(suppliers, { fields: [inventoryItems.supplierId], references: [suppliers.id] }),
  stock: many(inventoryStock),
  requisitionItems: many(stockRequisitionItems),
  transferItems: many(stockTransferItems),
  purchaseOrderItems: many(purchaseOrderItems),
}));

export const inventoryStockRelations = relations(inventoryStock, ({ one, many }) => ({
  tenant: one(tenants, { fields: [inventoryStock.tenantId], references: [tenants.id] }),
  item: one(inventoryItems, { fields: [inventoryStock.itemId], references: [inventoryItems.id] }),
  location: one(careLocations, { fields: [inventoryStock.locationId], references: [careLocations.id] }),
  transactions: many(inventoryTransactions),
  maintenance: many(equipmentMaintenance),
  alerts: many(inventoryAlerts),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventoryTransactions.tenantId],
    references: [tenants.id],
  }),
  item: one(inventoryStock, {
    fields: [inventoryTransactions.itemId],
    references: [inventoryStock.id],
  }),
  createdBy: one(users, {
    fields: [inventoryTransactions.createdBy],
    references: [users.id],
  }),
  location: one(careLocations, {
    fields: [inventoryTransactions.locationId],
    references: [careLocations.id],
  }),
  counterpartyLocation: one(careLocations, {
    fields: [inventoryTransactions.counterpartyLocationId],
    references: [careLocations.id],
  }),
}));

export const stockRequisitionsRelations = relations(stockRequisitions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stockRequisitions.tenantId],
    references: [tenants.id],
  }),
  requestingLocation: one(careLocations, {
    fields: [stockRequisitions.requestingLocationId],
    references: [careLocations.id],
  }),
  fulfillingLocation: one(careLocations, {
    fields: [stockRequisitions.fulfillingLocationId],
    references: [careLocations.id],
  }),
  requestedBy: one(users, {
    fields: [stockRequisitions.requestedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [stockRequisitions.approvedById],
    references: [users.id],
  }),
  items: many(stockRequisitionItems),
  transfers: many(stockTransfers),
}));

export const stockRequisitionItemsRelations = relations(stockRequisitionItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stockRequisitionItems.tenantId],
    references: [tenants.id],
  }),
  requisition: one(stockRequisitions, {
    fields: [stockRequisitionItems.requisitionId],
    references: [stockRequisitions.id],
  }),
  item: one(inventoryItems, {
    fields: [stockRequisitionItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stockTransfers.tenantId],
    references: [tenants.id],
  }),
  fromLocation: one(careLocations, {
    fields: [stockTransfers.fromLocationId],
    references: [careLocations.id],
  }),
  toLocation: one(careLocations, {
    fields: [stockTransfers.toLocationId],
    references: [careLocations.id],
  }),
  requisition: one(stockRequisitions, {
    fields: [stockTransfers.requisitionId],
    references: [stockRequisitions.id],
  }),
  dispatchedBy: one(users, {
    fields: [stockTransfers.dispatchedById],
    references: [users.id],
  }),
  receivedBy: one(users, {
    fields: [stockTransfers.receivedById],
    references: [users.id],
  }),
  items: many(stockTransferItems),
}));

export const stockTransferItemsRelations = relations(stockTransferItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stockTransferItems.tenantId],
    references: [tenants.id],
  }),
  transfer: one(stockTransfers, {
    fields: [stockTransferItems.transferId],
    references: [stockTransfers.id],
  }),
  item: one(inventoryItems, {
    fields: [stockTransferItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const equipmentMaintenanceRelations = relations(equipmentMaintenance, ({ one }) => ({
  tenant: one(tenants, {
    fields: [equipmentMaintenance.tenantId],
    references: [tenants.id],
  }),
  equipment: one(inventoryStock, {
    fields: [equipmentMaintenance.equipmentId],
    references: [inventoryStock.id],
  }),
  completedBy: one(users, {
    fields: [equipmentMaintenance.completedBy],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [equipmentMaintenance.createdBy],
    references: [users.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [purchaseOrders.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  approvedBy: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [purchaseOrderItems.tenantId],
    references: [tenants.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.poId],
    references: [purchaseOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [purchaseOrderItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const inventoryAlertsRelations = relations(inventoryAlerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventoryAlerts.tenantId],
    references: [tenants.id],
  }),
  item: one(inventoryStock, {
    fields: [inventoryAlerts.itemId],
    references: [inventoryStock.id],
  }),
  acknowledgedBy: one(users, {
    fields: [inventoryAlerts.acknowledgedBy],
    references: [users.id],
  }),
  resolvedBy: one(users, {
    fields: [inventoryAlerts.resolvedBy],
    references: [users.id],
  }),
}));

// Drugs, Alcohol & Hydration Testing Relations
export const testingProgramsRelations = relations(testingPrograms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [testingPrograms.tenantId],
    references: [tenants.id],
  }),
  drugTests: many(drugTests),
  alcoholTests: many(alcoholTests),
  hydrationTests: many(hydrationTests),
  randomPools: many(randomTestingPools),
}));

export const drugTestsRelations = relations(drugTests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [drugTests.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [drugTests.employeeId],
    references: [employees.id],
  }),
  patient: one(patients, {
    fields: [drugTests.patientId],
    references: [patients.id],
  }),
  program: one(testingPrograms, {
    fields: [drugTests.programId],
    references: [testingPrograms.id],
  }),
  createdBy: one(users, {
    fields: [drugTests.createdBy],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [drugTests.reviewedBy],
    references: [users.id],
  }),
}));

export const alcoholTestsRelations = relations(alcoholTests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [alcoholTests.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [alcoholTests.employeeId],
    references: [employees.id],
  }),
  patient: one(patients, {
    fields: [alcoholTests.patientId],
    references: [patients.id],
  }),
  program: one(testingPrograms, {
    fields: [alcoholTests.programId],
    references: [testingPrograms.id],
  }),
  createdBy: one(users, {
    fields: [alcoholTests.createdBy],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [alcoholTests.reviewedBy],
    references: [users.id],
  }),
}));

export const hydrationTestsRelations = relations(hydrationTests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hydrationTests.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [hydrationTests.employeeId],
    references: [employees.id],
  }),
  patient: one(patients, {
    fields: [hydrationTests.patientId],
    references: [patients.id],
  }),
  program: one(testingPrograms, {
    fields: [hydrationTests.programId],
    references: [testingPrograms.id],
  }),
  testedBy: one(users, {
    fields: [hydrationTests.testedBy],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [hydrationTests.reviewedBy],
    references: [users.id],
  }),
}));

export const randomTestingPoolsRelations = relations(randomTestingPools, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [randomTestingPools.tenantId],
    references: [tenants.id],
  }),
  program: one(testingPrograms, {
    fields: [randomTestingPools.tenantId],
    references: [testingPrograms.tenantId],
  }),
  selections: many(randomSelections),
}));

export const randomSelectionsRelations = relations(randomSelections, ({ one }) => ({
  tenant: one(tenants, {
    fields: [randomSelections.tenantId],
    references: [tenants.id],
  }),
  pool: one(randomTestingPools, {
    fields: [randomSelections.poolId],
    references: [randomTestingPools.id],
  }),
  employee: one(employees, {
    fields: [randomSelections.employeeId],
    references: [employees.id],
  }),
  drugTest: one(drugTests, {
    fields: [randomSelections.drugTestId],
    references: [drugTests.id],
  }),
  alcoholTest: one(alcoholTests, {
    fields: [randomSelections.alcoholTestId],
    references: [alcoholTests.id],
  }),
  hydrationTest: one(hydrationTests, {
    fields: [randomSelections.hydrationTestId],
    references: [hydrationTests.id],
  }),
}));

export const testingEquipmentRelations = relations(testingEquipment, ({ one }) => ({
  tenant: one(tenants, {
    fields: [testingEquipment.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas for forms
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  tenantId: true, // Server-side managed for security
  createdAt: true,
  updatedAt: true,
  firstVisit: true,
  lastVisit: true,
});

/** Partial update for patient health profile + notes (detail page / API PATCH-style body). */
export const patientHealthProfilePatchSchema = insertPatientSchema
  .pick({
    allergies: true,
    medicalHistory: true,
    medications: true,
    disability: true,
    notes: true,
  })
  .partial();

export type PatientHealthProfilePatch = z.infer<typeof patientHealthProfilePatchSchema>;

const appointmentStatusZod = z.enum([
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  confirmationRequiredFrom: true,
}).extend({
  appointmentDate: z.coerce.date(),
  modality: z.enum(["in_person", "telehealth", "phone"]).optional(),
});

/** Staff updates (status changes, rescheduling) — confirmation party is server-managed. */
export const updateAppointmentSchema = insertAppointmentSchema.partial().extend({
  status: appointmentStatusZod.optional(),
  confirmationRequiredFrom: z.enum(["patient", "staff"]).nullable().optional(),
});

export const insertIncidentReportSchema = createInsertSchema(incidentReports).omit({
  id: true,
  tenantId: true, // Server-side managed for security
  createdAt: true,
  updatedAt: true,
}).extend({
  incidentDate: z.coerce.date(),
  reportedToFapDate: z.coerce.date().optional(),
  dispositionDateTime: z.coerce.date().optional(),
  lastMenstrualPeriod: z.coerce.date().optional().nullable(), // For female patients
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateOfBirth: z.coerce.date(),
  hireDate: z.coerce.date(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareLocationSchema = createInsertSchema(careLocations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

/** API body for POST /api/ambulances — creates a care_locations row with location_kind = ambulance. */
export const createAmbulanceSchema = z.object({
  locationName: z.string().min(1).max(200),
  locationCode: z.string().min(1).max(64),
  description: z.string().max(2000).optional().nullable(),
  /** Fixed post/clinic id; omit or null when the unit covers multiple posts (use coverageNotes). */
  stationedAtLocationId: z.string().min(1).max(128).optional().nullable(),
  callSign: z.string().max(128).optional().nullable(),
  registrationPlate: z.string().max(32).optional().nullable(),
  fleetNumber: z.string().max(128).optional().nullable(),
  coverageNotes: z.string().max(4000).optional().nullable(),
  ambulanceOpsStatus: z.enum(["available", "deployed", "standby", "out_of_service"]).optional(),
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
});

export const updateAmbulanceSchema = createAmbulanceSchema.partial();

export type CreateAmbulanceInput = z.infer<typeof createAmbulanceSchema>;
export type UpdateAmbulanceInput = z.infer<typeof updateAmbulanceSchema>;

export const createAmbulancePrestartSchema = z
  .object({
    ambulanceLocationId: z.string().min(1),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    responses: z.record(z.boolean()),
    deficienciesNotes: z.string().max(5000).optional().nullable(),
    mileageReading: z.string().max(32).optional().nullable(),
    status: z.enum(["draft", "completed"]).optional(),
  })
  .refine((data) => isValidPrestartResponses(data.responses), {
    message: "Unknown checklist item key in responses",
    path: ["responses"],
  })
  .refine(
    (data) =>
      data.status !== "completed" ||
      AMBULANCE_PRESTART_CHECKLIST_ITEMS.every((item) => data.responses[item.key] === true),
    {
      message: "All checklist items must pass before marking the form completed",
      path: ["status"],
    }
  );

export const updateAmbulancePrestartSchema = z
  .object({
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    responses: z.record(z.boolean()).optional(),
    deficienciesNotes: z.string().max(5000).optional().nullable(),
    mileageReading: z.string().max(32).optional().nullable(),
    status: z.enum(["draft", "completed"]).optional(),
  })
  .refine((data) => data.responses == null || isValidPrestartResponses(data.responses), {
    message: "Unknown checklist item key in responses",
    path: ["responses"],
  });

export type CreateAmbulancePrestartInput = z.infer<typeof createAmbulancePrestartSchema>;
export type UpdateAmbulancePrestartInput = z.infer<typeof updateAmbulancePrestartSchema>;

export const insertReferralFacilitySchema = createInsertSchema(referralFacilities).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
  sentAt: true,
});

// Operational Duties schemas
export const insertOperationalDutySchema = createInsertSchema(operationalDuties).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemaMigrationDemoSchema = createInsertSchema(schemaMigrationDemos).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDutyAssignmentSchema = createInsertSchema(operationalDutyAssignments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  assignmentDate: z.coerce.date(),
});

export const insertDutyCompletionSchema = createInsertSchema(operationalDutyCompletions).omit({
  id: true,
  tenantId: true,
});

export const insertShiftReportSchema = createInsertSchema(shiftReports).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reportDate: z.string().or(z.coerce.date()),
  handoverStructured: handoverStructuredSchema.nullish(),
});

export const insertTicketCategorySchema = createInsertSchema(ticketCategories).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  tenantId: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertTicketActivitySchema = createInsertSchema(ticketActivity).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

// Master item & per-location stock schemas
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

/** POST /api/inventory-catalog — itemCode optional (server auto-generates from category prefix). */
export const createInventoryCatalogItemSchema = insertInventoryItemSchema
  .omit({ itemCode: true })
  .extend({
    itemName: z.string().min(1).max(500),
    category: z.string().min(1).max(128),
    unitOfMeasure: z.string().min(1).max(64).default("units"),
    itemCode: z
      .string()
      .max(64)
      .optional()
      .nullable()
      .transform((v) => {
        const t = (v ?? "").trim();
        return t.length > 0 ? t : undefined;
      }),
    description: z.string().max(4000).optional().nullable(),
    brand: z.string().max(200).optional().nullable(),
    model: z.string().max(200).optional().nullable(),
    barcode: z.string().max(128).optional().nullable(),
    supplier: z.string().max(200).optional().nullable(),
    supplierContact: z.string().max(200).optional().nullable(),
    dosageForm: z.string().max(128).optional().nullable(),
    status: z.enum(["active", "inactive", "discontinued"]).optional(),
  });

export const updateInventoryCatalogItemSchema = createInventoryCatalogItemSchema.partial();

export const insertInventoryStockSchema = createInsertSchema(inventoryStock).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expiryDate: z.coerce.date().optional().nullable(),
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  previousStock: true, // Calculated internally by storage function
  newStock: true, // Calculated internally by storage function
});

export const insertStockRequisitionSchema = createInsertSchema(stockRequisitions).omit({
  id: true,
  tenantId: true,
  requestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockRequisitionItemSchema = createInsertSchema(stockRequisitionItems).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertStockTransferSchema = createInsertSchema(stockTransfers).omit({
  id: true,
  tenantId: true,
  dispatchedAt: true,
  receivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockTransferItemSchema = createInsertSchema(stockTransferItems).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertEquipmentMaintenanceSchema = createInsertSchema(equipmentMaintenance).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.coerce.date(),
  completedDate: z.coerce.date().optional().nullable(),
  nextMaintenanceDate: z.coerce.date().optional().nullable(),
  certificationExpires: z.coerce.date().optional().nullable(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
}).extend({
  orderDate: z.coerce.date(),
  expectedDelivery: z.coerce.date().optional().nullable(),
  actualDelivery: z.coerce.date().optional().nullable(),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertInventoryAlertSchema = createInsertSchema(inventoryAlerts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
}).extend({
  expiryDate: z.coerce.date().optional().nullable(),
});

export const insertPosRegisterSchema = createInsertSchema(posRegisters).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPosShiftSchema = createInsertSchema(posShifts).omit({
  id: true,
  tenantId: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPosSaleSchema = createInsertSchema(posSales).omit({
  id: true,
  tenantId: true,
  subtotal: true,
  taxTotal: true,
  total: true,
  completedAt: true,
  voidedAt: true,
  receiptNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPosSaleLineSchema = createInsertSchema(posSaleLines).omit({
  id: true,
  tenantId: true,
  taxAmount: true,
  lineTotal: true,
});

export const insertPosPaymentSchema = createInsertSchema(posPayments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertPosReturnSchema = createInsertSchema(posReturns).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Our People module insert schemas
export const insertPatientFollowUpSchema = createInsertSchema(patientFollowUps).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  scheduledDate: z.coerce.date(),
  dueByDate: z.coerce.date().optional().nullable(),
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  externalReferralDate: z.coerce.date().optional().nullable(),
});

const workFitnessMedicationFieldsSchema = z.object({
  medicationName: z.string().min(1).max(255),
  genericName: z.string().max(255).optional().nullable(),
  strength: z.string().max(120).optional().nullable(),
  dosageForm: z.string().max(120).optional().nullable(),
  route: z.string().max(120).optional().nullable(),
  frequency: z.string().max(255).optional().nullable(),
  prescribedFor: z.string().max(4000).optional().nullable(),
  prescriberName: z.string().max(255).optional().nullable(),
  prescriberFacility: z.string().max(255).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  isOngoing: z.boolean().optional(),
  employeeSideEffects: z.string().max(4000).optional().nullable(),
  employeeNoSideEffects: z.boolean().optional(),
  clinicianMedicationNotes: z.string().max(4000).optional().nullable(),
  medicationImageUrl: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const insertEmployeeWorkFitnessCaseSchema = createInsertSchema(employeeWorkFitnessCases).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
}).extend({
  restrictionStartDate: z.coerce.date().optional().nullable(),
  restrictionEndDate: z.coerce.date().optional().nullable(),
  medications: z.array(workFitnessMedicationFieldsSchema).min(1, "At least one medication is required"),
});

export const insertEmployeeWorkFitnessMedicationSchema = createInsertSchema(employeeWorkFitnessMedications).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().optional().nullable(),
  expectedEndDate: z.coerce.date().optional().nullable(),
});

export const insertEmployeeFeedbackSurveySchema = createInsertSchema(employeeFeedbackSurveys).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeFeedbackSchema = createInsertSchema(employeeFeedback).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  feedbackDate: z.coerce.date().optional().nullable(),
});

// Drug & Alcohol Testing Insert Schemas
export const insertTestingProgramSchema = createInsertSchema(testingPrograms).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrugTestSchema = createInsertSchema(drugTests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.coerce.date().optional().nullable(),
  collectionDate: z.coerce.date().optional().nullable(),
  resultDate: z.coerce.date().optional().nullable(),
});

export const insertAlcoholTestSchema = createInsertSchema(alcoholTests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.coerce.date().optional().nullable(),
  testDate: z.coerce.date().optional().nullable(),
});

export const insertHydrationTestSchema = createInsertSchema(hydrationTests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.coerce.date().optional().nullable(),
  testDate: z.coerce.date().optional().nullable(),
  followUpDate: z.coerce.date().optional().nullable(),
});

export const insertInstantTestSchema = createInsertSchema(instantTests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  testDate: z.coerce.date(),
  customerId: z.string().min(1).optional().nullable(),
  employeeId: z.string().min(1).optional().nullable(),
}).superRefine((data, ctx) => {
  const hasCustomer = !!data.customerId;
  const hasEmployee = !!data.employeeId;
  if (!hasCustomer && !hasEmployee) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a customer or an employee as the test subject",
      path: ["customerId"],
    });
  }
  if (hasCustomer && hasEmployee) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose either a customer or an employee, not both",
      path: ["employeeId"],
    });
  }
});

/** Partial update schema (no subject exclusivity check — subject is usually set at create). */
export const updateInstantTestSchema = createInsertSchema(instantTests).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  testDate: z.coerce.date().optional(),
  customerId: z.string().min(1).optional().nullable(),
  employeeId: z.string().min(1).optional().nullable(),
}).partial();

export const insertRandomTestingPoolSchema = createInsertSchema(randomTestingPools).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastSelectionDate: z.coerce.date().optional().nullable(),
  nextSelectionDate: z.coerce.date().optional().nullable(),
});

export const insertRandomSelectionSchema = createInsertSchema(randomSelections).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  selectionDate: z.coerce.date(),
});

export const insertTestingEquipmentSchema = createInsertSchema(testingEquipment).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastCalibrationDate: z.coerce.date().optional().nullable(),
  nextCalibrationDate: z.coerce.date().optional().nullable(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type ImpersonationEvent = typeof impersonationEvents.$inferSelect;
export type InsertImpersonationEvent = typeof impersonationEvents.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type UpsertTenant = typeof tenants.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type PlatformFeatureFlag = typeof platformFeatureFlags.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type CareLocation = typeof careLocations.$inferSelect;
export type AmbulancePrestartCheck = typeof ambulancePrestartChecks.$inferSelect;
export type InsertCareLocation = z.infer<typeof insertCareLocationSchema>;
export type ReferralFacility = typeof referralFacilities.$inferSelect;
export type InsertReferralFacility = z.infer<typeof insertReferralFacilitySchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertIncidentReport = z.infer<typeof insertIncidentReportSchema>;
export type IncidentReport = typeof incidentReports.$inferSelect;
// Notification types
export type NotificationType = typeof notificationTypes.$inferSelect;
export type InsertNotificationType = typeof notificationTypes.$inferInsert;
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type InsertNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;

// Operational Duties types
export type OperationalDuty = typeof operationalDuties.$inferSelect;
export type InsertOperationalDuty = z.infer<typeof insertOperationalDutySchema>;
export type SchemaMigrationDemo = typeof schemaMigrationDemos.$inferSelect;
export type InsertSchemaMigrationDemo = z.infer<typeof insertSchemaMigrationDemoSchema>;
export type DutyAssignment = typeof operationalDutyAssignments.$inferSelect;
export type InsertDutyAssignment = z.infer<typeof insertDutyAssignmentSchema>;
export type DutyCompletion = typeof operationalDutyCompletions.$inferSelect;
export type InsertDutyCompletion = z.infer<typeof insertDutyCompletionSchema>;

export type ShiftReport = typeof shiftReports.$inferSelect;
export type InsertShiftReport = z.infer<typeof insertShiftReportSchema>;

export type ShiftReportAcknowledgment = typeof shiftReportAcknowledgments.$inferSelect;
export type ShiftReportLink = typeof shiftReportLinks.$inferSelect;
export type ShiftReportAttachment = typeof shiftReportAttachments.$inferSelect;
export type ShiftReportRevisionHistory = typeof shiftReportRevisionHistory.$inferSelect;

export type TicketCategory = typeof ticketCategories.$inferSelect;
export type InsertTicketCategory = z.infer<typeof insertTicketCategorySchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;
export type TicketActivity = typeof ticketActivity.$inferSelect;
export type InsertTicketActivity = z.infer<typeof insertTicketActivitySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type PortalNotification = typeof portalNotifications.$inferSelect;
export type MessagingAuditLogEntry = typeof messagingAuditLog.$inferSelect;

// Master item & per-location stock types
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryStock = typeof inventoryStock.$inferSelect;
export type InsertInventoryStock = z.infer<typeof insertInventoryStockSchema>;
// Legacy alias: list/detail API often returns stock row joined with item (same shape as old medical_inventory row)
// Flatten item identity fields onto the stock row while keeping nested `item` for full details.
export type MedicalInventory = InventoryStock & InventoryItem & { item?: InventoryItem };
export type InsertMedicalInventory = InsertInventoryItem;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type StockRequisition = typeof stockRequisitions.$inferSelect;
export type InsertStockRequisition = z.infer<typeof insertStockRequisitionSchema>;
export type StockRequisitionItem = typeof stockRequisitionItems.$inferSelect;
export type InsertStockRequisitionItem = z.infer<typeof insertStockRequisitionItemSchema>;
export type StockTransfer = typeof stockTransfers.$inferSelect;
export type InsertStockTransfer = z.infer<typeof insertStockTransferSchema>;
export type StockTransferItem = typeof stockTransferItems.$inferSelect;
export type InsertStockTransferItem = z.infer<typeof insertStockTransferItemSchema>;
export type EquipmentMaintenance = typeof equipmentMaintenance.$inferSelect;
export type InsertEquipmentMaintenance = z.infer<typeof insertEquipmentMaintenanceSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type InsertInventoryAlert = z.infer<typeof insertInventoryAlertSchema>;

export type PosRegister = typeof posRegisters.$inferSelect;
export type InsertPosRegister = z.infer<typeof insertPosRegisterSchema>;
export type PosShift = typeof posShifts.$inferSelect;
export type InsertPosShift = z.infer<typeof insertPosShiftSchema>;
export type PosSale = typeof posSales.$inferSelect;
export type InsertPosSale = z.infer<typeof insertPosSaleSchema>;
export type PosSaleLine = typeof posSaleLines.$inferSelect;
export type InsertPosSaleLine = z.infer<typeof insertPosSaleLineSchema>;
export type PosPayment = typeof posPayments.$inferSelect;
export type InsertPosPayment = z.infer<typeof insertPosPaymentSchema>;
export type PosReturn = typeof posReturns.$inferSelect;
export type InsertPosReturn = z.infer<typeof insertPosReturnSchema>;

// Our People types
export type PatientFollowUp = typeof patientFollowUps.$inferSelect;
export type InsertPatientFollowUp = z.infer<typeof insertPatientFollowUpSchema>;
export type EmployeeWorkFitnessCase = typeof employeeWorkFitnessCases.$inferSelect;
export type InsertEmployeeWorkFitnessCase = z.infer<typeof insertEmployeeWorkFitnessCaseSchema>;
export type EmployeeWorkFitnessMedication = typeof employeeWorkFitnessMedications.$inferSelect;
export type InsertEmployeeWorkFitnessMedication = z.infer<typeof insertEmployeeWorkFitnessMedicationSchema>;
export type EmployeeFeedbackSurvey = typeof employeeFeedbackSurveys.$inferSelect;
export type InsertEmployeeFeedbackSurvey = z.infer<typeof insertEmployeeFeedbackSurveySchema>;
export type EmployeeFeedback = typeof employeeFeedback.$inferSelect;
export type InsertEmployeeFeedback = z.infer<typeof insertEmployeeFeedbackSchema>;

// Drugs, Alcohol & Hydration Testing types
export type TestingProgram = typeof testingPrograms.$inferSelect;
export type InsertTestingProgram = z.infer<typeof insertTestingProgramSchema>;
export type DrugTest = typeof drugTests.$inferSelect;
export type InsertDrugTest = z.infer<typeof insertDrugTestSchema>;
export type AlcoholTest = typeof alcoholTests.$inferSelect;
export type InsertAlcoholTest = z.infer<typeof insertAlcoholTestSchema>;
export type HydrationTest = typeof hydrationTests.$inferSelect;
export type InsertHydrationTest = z.infer<typeof insertHydrationTestSchema>;
export type InstantTest = typeof instantTests.$inferSelect;
export type InsertInstantTest = z.infer<typeof insertInstantTestSchema>;
export type RandomTestingPool = typeof randomTestingPools.$inferSelect;
export type InsertRandomTestingPool = z.infer<typeof insertRandomTestingPoolSchema>;
export type RandomSelection = typeof randomSelections.$inferSelect;
export type InsertRandomSelection = z.infer<typeof insertRandomSelectionSchema>;
export type TestingEquipment = typeof testingEquipment.$inferSelect;
export type InsertTestingEquipment = z.infer<typeof insertTestingEquipmentSchema>;

// Audit log types
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Feedback types
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Tenant SOPs
export type TenantSopDocument = typeof tenantSopDocuments.$inferSelect;
export type TenantSopVersion = typeof tenantSopVersions.$inferSelect;