import type { Express, RequestHandler } from "express";
import type { Multer } from "multer";
import type { AuthService } from "../modules/auth/auth.service";
import { createAuthRouter } from "../modules/auth/auth.routes";
import { createAppointmentsRouter } from "../modules/appointments/appointments.routes";
import { createCompaniesRouter } from "../modules/companies/companies.routes";
import { createCareLocationsRouter } from "../modules/care-locations/care-locations.routes";
import { createFleetRouter } from "../modules/fleet/fleet.routes";
import { createBusinessAssetsRouter } from "../modules/business-assets/business-assets.routes";
import { createReferralFacilitiesRouter } from "../modules/referral-facilities/referral-facilities.routes";
import { createEmployeesRouter } from "../modules/employees/employees.routes";
import { createDashboardRouter } from "../modules/dashboard/dashboard.routes";
import { createAuditLogsRouter } from "../modules/audit-logs/audit-logs.routes";
import { createUsersRouter } from "../modules/users/users.routes";
import { createAdminRouter } from "../modules/admin/admin.routes";
import { createNotificationsRouter } from "../modules/notifications/notifications.routes";
import { createFeedbackRouter } from "../modules/feedback/feedback.routes";
import { createTenantsRouter } from "../modules/tenants/tenants.routes";
import { createSettingsRouter } from "../modules/settings/settings.routes";
import { createSuperAdminRouter } from "../modules/super-admin/super-admin.routes";
import { createDutiesRouter } from "../modules/duties/duties.routes";
import { createSuppliersRouter } from "../modules/suppliers/suppliers.routes";
import { createCustomersRouter } from "../modules/customers/customers.routes";
import { createEquipmentMaintenanceRouter } from "../modules/equipment-maintenance/equipment-maintenance.routes";
import { createInventoryFeatureRouter } from "../modules/inventory/inventory.feature.routes";
import { createTestingRouter } from "../modules/testing/testing.routes";
import { createIncidentRouter } from "../modules/incidents/incidents.routes";
import { createShiftReportsRouter } from "../modules/shift-reports/shift-reports.routes";
import { createWellbeingRouter } from "../modules/wellbeing/wellbeing.routes";
import { createWellbeingWorkFitnessRouter } from "../modules/wellbeing/wellbeing-work-fitness.routes";
import { createWellbeingFeedbackRouter } from "../modules/wellbeing/wellbeing-feedback.routes";
import { createPosRouter } from "../modules/pos/pos.routes";
import { createOrdersRouter } from "../modules/orders/orders.routes";
import { createSyncRouter } from "../modules/sync/sync.routes";
import { createIncidentReportsRouter } from "../modules/reports/incident-reports.routes";
import { createOperationsReportsRouter } from "../modules/reports/operations-reports.routes";
import { createComplianceReportsRouter } from "../modules/reports/compliance-reports.routes";
import { createOverviewReportsRouter } from "../modules/reports/overview-reports.routes";
import { createChangelogRouter } from "../modules/changelog/changelog.routes";
import { createReleaseNotesRouter } from "../modules/release-notes/release-notes.routes";
import { createLegalRouter } from "../modules/legal/legal.routes";
import { createSignedLegalRouter } from "../modules/legal/signed-legal.routes";
import { createTicketsRouter } from "../modules/tickets/tickets.routes";
import { createPortalRouter } from "../modules/portal/portal.routes";
import { createStaffMessagingRouter } from "../modules/messaging/messaging.routes";
import { createPortalAppointmentRequestsRouter } from "../modules/portal/portal-appointment-requests.routes";
import { createSopRouter } from "../modules/sop/sop.routes";
import { createFeatureFlagsRouter, requireFeature } from "../modules/feature-flags/feature-flags.routes";
import { storage } from "../storage";

export interface RouteRegistrationDeps {
  authService: AuthService;
  authMiddleware: RequestHandler;
  checkAdmin: RequestHandler;
  requireAdmin: RequestHandler;
  requireSuperAdmin: RequestHandler;
  requireActiveImpersonation: RequestHandler;
  requireWellbeingRead: RequestHandler;
  requireWellbeingWrite: RequestHandler;
  requireClinicalAccess: RequestHandler;
  requireIncidentReportsAccess: RequestHandler;
  requireOperationsReportsAccess: RequestHandler;
  requireComplianceReportsAccess: RequestHandler;
  requireAmbulanceModuleAccess: RequestHandler;
  upload: Multer;
  injectLocationMiddleware: RequestHandler;
  csvUpload: Multer;
  inventoryImageUpload: Multer;
  incidentUpload: Multer;
  ticketUpload: Multer;
  /** Portal patient profile photo (memory, same limits as inventory images). */
  portalAvatarUpload: Multer;
  messagingUpload: Multer;
}

/**
 * Mount all domain API routers under /api.
 * Single place that defines the full API surface (list of routers and mount paths).
 * App-level middleware (session, auth init, multer configs) remains in server/routes.ts.
 */
export function registerAllRoutes(app: Express, deps: RouteRegistrationDeps): void {
  const {
    authService,
    authMiddleware,
    checkAdmin,
    requireAdmin,
    requireSuperAdmin,
    requireActiveImpersonation,
    requireWellbeingRead,
    requireWellbeingWrite,
    requireClinicalAccess,
    requireIncidentReportsAccess,
    requireOperationsReportsAccess,
    requireComplianceReportsAccess,
    requireAmbulanceModuleAccess,
    upload,
    injectLocationMiddleware,
    csvUpload,
    inventoryImageUpload,
    incidentUpload,
    ticketUpload,
    portalAvatarUpload,
    messagingUpload,
  } = deps;

  const sopUpload = incidentUpload;

  app.use("/api", createAuthRouter({ authService, authMiddleware, checkAdmin, upload }));
  app.use("/api", createFeatureFlagsRouter({ authMiddleware, requireSuperAdmin }));

  // Platform feature gates (must mount ahead of the feature routers).
  app.use("/api/appointments", requireFeature("appointments"));
  app.use("/api/portal-appointment-requests", requireFeature("appointments"));
  app.use("/api/portal/appointments", requireFeature("appointments"));
  app.use("/api/portal/appointment-requests", requireFeature("appointments"));

  app.use("/api/portal", requireFeature("portal"));
  app.use("/api/orders", requireFeature("portal"));
  app.use("/api/fleet", requireFeature("fleet"));
  app.use("/api/fleet-prestart-checks", requireFeature("fleet"));
  app.use("/api/wellbeing", requireFeature("wellbeing"));
  app.use("/api/incident-reports", requireFeature("incidents"));
  app.use("/api/incident-uploads", requireFeature("incidents"));
  app.use("/api/shift-reports", requireFeature("shiftover"));
  app.use("/api/shiftover", requireFeature("shiftover"));
  app.use("/api/tickets", requireFeature("tickets"));
  app.use("/api/messaging", requireFeature("messaging"));
  app.use("/api/portal/messaging", requireFeature("messaging"));

  app.use("/api", createPortalRouter({ storage, authService, portalAvatarUpload, messagingUpload }));
  app.use(
    "/api",
    createPortalAppointmentRequestsRouter({ authMiddleware, requireClinicalAccess, injectLocationMiddleware }),
  );
  app.use("/api", createAppointmentsRouter({ authMiddleware, requireClinicalAccess, injectLocationMiddleware }));
  app.use(
    "/api",
    createStaffMessagingRouter({ storage, authMiddleware, requireClinicalAccess, messagingUpload }),
  );
  app.use("/api", createOverviewReportsRouter({ authMiddleware }));
  app.use(
    "/api",
    createIncidentReportsRouter({ authMiddleware, requireIncidentReportsAccess }),
  );
  app.use(
    "/api",
    createOperationsReportsRouter({ authMiddleware, requireOperationsReportsAccess }),
  );
  app.use(
    "/api",
    createComplianceReportsRouter({ authMiddleware, requireComplianceReportsAccess }),
  );
  app.use("/api", createCompaniesRouter({ authMiddleware, csvUpload }));
  app.use("/api", createCareLocationsRouter({ authMiddleware, requireAdmin }));
  app.use(
    "/api",
    createFleetRouter({ authMiddleware, requireAdmin, requireFleetModuleAccess: requireAmbulanceModuleAccess })
  );
  app.use("/api", createBusinessAssetsRouter({ authMiddleware }));
  app.use("/api", createReferralFacilitiesRouter({ authMiddleware, requireAdmin, requireClinicalAccess }));
  app.use("/api", createEmployeesRouter({ authMiddleware, csvUpload }));
  app.use("/api", createDashboardRouter({ authMiddleware }));
  app.use("/api", createAuditLogsRouter({ authMiddleware, requireAdmin }));
  app.use("/api", createUsersRouter({ authMiddleware }));
  app.use("/api", createAdminRouter({ authMiddleware, requireAdmin }));
  app.use(
    "/api",
    createSopRouter({ authMiddleware, requireAdmin, sopUpload })
  );
  app.use("/api", createNotificationsRouter({ authMiddleware }));
  app.use("/api", createWellbeingRouter({ authMiddleware, requireWellbeingRead, requireWellbeingWrite }));
  app.use("/api", createWellbeingWorkFitnessRouter({ authMiddleware, requireWellbeingRead, requireWellbeingWrite }));
  app.use("/api", createWellbeingFeedbackRouter({ authMiddleware, requireWellbeingRead, requireWellbeingWrite }));
  app.use("/api", createFeedbackRouter());
  app.use("/api", createChangelogRouter());
  app.use("/api", createReleaseNotesRouter({ authMiddleware, storage }));
  app.use("/api", createLegalRouter());
  app.use(
    "/api",
    createSignedLegalRouter({
      authMiddleware,
      requireAdmin,
      requireSuperAdmin,
      legalUpload: incidentUpload,
    })
  );
  app.use("/api", createTenantsRouter({ authMiddleware, requireAdmin }));
  app.use("/api", createSettingsRouter({ authMiddleware, requireAdmin }));
  app.use(
    "/api",
    createSuperAdminRouter({ authMiddleware, requireSuperAdmin, requireActiveImpersonation, authService })
  );
  app.use("/api", createDutiesRouter({ authMiddleware, injectLocationMiddleware }));
  app.use("/api", createSuppliersRouter({ authMiddleware, csvUpload }));
  app.use("/api", createCustomersRouter({ authMiddleware, csvUpload }));
  app.use("/api", createEquipmentMaintenanceRouter({ authMiddleware }));
  app.use("/api", createInventoryFeatureRouter({
    authMiddleware,
    requireAdmin,
    injectLocationMiddleware,
    inventoryImageUpload,
  }));
  // Platform feature gate: when the POC laboratory flag is off, every testing
  // API surface (instant + legacy suites) returns 403 FEATURE_DISABLED.
  for (const testingPath of [
    "/api/testing",
    "/api/instant-tests",
    "/api/drug-tests",
    "/api/alcohol-tests",
    "/api/drug-alcohol-tests",
    "/api/hydration-tests",
    "/api/random-testing-pools",
    "/api/random-selections",
    "/api/testing-programs",
    "/api/testing-equipment",
  ]) {
    app.use(testingPath, requireFeature("poc_testing"));
  }
  app.use("/api", createTestingRouter({ authMiddleware, injectLocationMiddleware }));
  app.use("/api", createIncidentRouter({
    authMiddleware,
    injectLocationMiddleware,
    incidentUpload,
  }));
  app.use(
    "/api",
    createShiftReportsRouter({ authMiddleware, shiftReportUpload: incidentUpload })
  );
  app.use(
    "/api",
    createTicketsRouter({ authMiddleware, requireAdmin, ticketUpload })
  );
  app.use("/api", createPosRouter({ authMiddleware, injectLocationMiddleware }));
  app.use("/api", createOrdersRouter({ authMiddleware }));
  app.use("/api", createSyncRouter());
}
