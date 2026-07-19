import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { createAdminController } from "./admin.controller";

export interface AdminRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
}

async function resolveTenantId(req: any): Promise<string | null> {
  let tenantId = req.user?.tenantId;
  if (!tenantId && req.user?.id) {
    const fullUser = await storage.getUserById(req.user.id);
    tenantId = fullUser?.tenantId ?? null;
  }
  return tenantId ?? null;
}

function statusFromCode(code?: string): number {
  if (code === "NOT_FOUND") return 404;
  if (code === "FORBIDDEN") return 403;
  return 500;
}

const adminPortalSettingsPutSchema = z.object({
  enabled: z.boolean(),
  supportEmail: z.string().max(255).optional().nullable(),
  privacyPolicyUrl: z.string().max(2000).optional().nullable(),
  portalSlug: z.string().max(80).optional().nullable(),
  features: z.record(z.string(), z.boolean()).optional(),
});

const adminCreatePortalUserSchema = z
  .object({
    partyType: z.enum(["customer", "supplier"]).optional(),
    customerId: z.string().min(1).optional(),
    supplierId: z.string().min(1).optional(),
    email: z.string().email(),
    password: z.string().min(8),
  })
  .refine(
    (d) => !!(d.customerId || d.supplierId),
    { message: "Link portal account to a customer or supplier record" },
  )
  .refine(
    (d) => {
      const partyType = d.partyType ?? (d.supplierId ? "supplier" : "customer");
      return partyType === "supplier" ? !!d.supplierId : !!d.customerId;
    },
    { message: "partyType must match the linked party id" },
  );

const adminSecuritySettingsPutSchema = z.object({
  staffSessionAbsoluteHours: z.number().int().min(1).max(168).optional(),
  staffSessionIdleMinutes: z.number().int().min(5).max(480).optional(),
  portalSessionAbsoluteDays: z.number().int().min(1).max(90).optional(),
  portalSessionIdleMinutes: z.number().int().min(5).max(1440).optional(),
  portalSessionSlidingDays: z.number().int().min(1).max(30).optional(),
  sessionWarningLeadMinutes: z.number().int().min(1).max(60).optional(),
  idleTimeoutEnabled: z.boolean().optional(),
  requireMfa: z.boolean().optional(),
});

/**
 * Create the admin router. Mount at /api.
 */
export function createAdminRouter(deps: AdminRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createAdminController(storage);

  router.get("/admin/portal-settings", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getPortalSettings(tenantId);
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.put(
    "/admin/portal-settings",
    authMiddleware,
    requireAdmin,
    validateBody(adminPortalSettingsPutSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const b = req.body as z.infer<typeof adminPortalSettingsPutSchema>;
      const se = b.supportEmail?.trim();
      const pu = b.privacyPolicyUrl?.trim();
      const result = await controller.updatePortalSettings(tenantId, {
        enabled: b.enabled,
        supportEmail: se === "" || !se ? null : se,
        privacyPolicyUrl: pu === "" || !pu ? null : pu,
        portalSlug: b.portalSlug === "" || !b.portalSlug?.trim() ? null : b.portalSlug.trim(),
        features: b.features,
      });
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    },
  );

  router.get("/admin/portal-users", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.listPortalUsers(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/admin/portal-users",
    authMiddleware,
    requireAdmin,
    validateBody(adminCreatePortalUserSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.createPortalUser(tenantId, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 400, result.error);
      res.status(201).json(result.data);
    },
  );

  router.delete("/admin/portal-users/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.deletePortalUser(tenantId, req.params.id);
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  const adminPortalUserStatusSchema = z.object({
    status: z.enum(["active", "suspended"]),
  });

  router.patch(
    "/admin/portal-users/:id/status",
    authMiddleware,
    requireAdmin,
    validateBody(adminPortalUserStatusSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.updatePortalUserStatus(tenantId, req.params.id, req.body.status);
      if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
      res.json(result.data);
    },
  );

  router.post("/admin/portal-users/:id/magic-link", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.resendPortalUserMagicLink(tenantId, req.params.id);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.get("/admin/portal-access-requests", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await controller.listPortalAccessRequests(tenantId, status);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  const adminReviewAccessRequestSchema = z.object({
    notes: z.string().max(2000).optional().nullable(),
    password: z.string().min(8).optional(),
  });

  router.post(
    "/admin/portal-access-requests/:id/approve",
    authMiddleware,
    requireAdmin,
    validateBody(adminReviewAccessRequestSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.approvePortalAccessRequest(
        tenantId,
        req.params.id,
        req.user?.id,
        req.body,
      );
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    },
  );

  router.post(
    "/admin/portal-access-requests/:id/reject",
    authMiddleware,
    requireAdmin,
    validateBody(adminReviewAccessRequestSchema.pick({ notes: true })),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.rejectPortalAccessRequest(
        tenantId,
        req.params.id,
        req.user?.id,
        req.body,
      );
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    },
  );

  router.get("/admin/security-settings", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getSecuritySettings(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put(
    "/admin/security-settings",
    authMiddleware,
    requireAdmin,
    validateBody(adminSecuritySettingsPutSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.updateSecuritySettings(tenantId, req.body);
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    },
  );

  router.post("/admin/initialize-employees", authMiddleware, requireAdmin, async (req: any, res) => {
    const result = await controller.initializeEmployees(req.user?.id, req.user?.tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/admin/pending-users", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getPendingUsers(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/admin/all-users", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getAllUsers(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/admin/invite-user", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "Admin has no tenant association");
    const result = await controller.inviteUser(tenantId, req.user || {}, req.body);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 400, result.error);
    res.json(result.data);
  });

  router.post("/admin/invite-users-bulk", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "Admin has no tenant association");
    const { invitations } = req.body as { invitations: { email: string; role?: string; employeeId?: string }[] };
    const result = await controller.inviteUsersBulk(tenantId, req.user || {}, invitations ?? []);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/admin/resend-verification/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const inviterName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : undefined;
    const result = await controller.resendVerification(req.params.userId, inviterName);
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.post("/admin/approve-user/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const result = await controller.approveUser(req.params.userId, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.post("/admin/update-user-status/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const result = await controller.updateUserStatus(req.params.userId, req.body.status);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/admin/notification-preferences/role-defaults/:role", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const result = await controller.getNotificationRoleDefaults(tenantId, req.params.role);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/admin/notification-preferences/apply-role-defaults", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const { role, preferences } = req.body;
    const result = await controller.applyRoleDefaults(tenantId, role, preferences ?? []);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/admin/notification-preferences/bulk", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const result = await controller.bulkUpdateNotificationPreferences(tenantId, req.body);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.get("/admin/notification-preferences/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const result = await controller.getNotificationPreferences(tenantId, req.params.userId);
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.put("/admin/notification-preferences/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const { preferences } = req.body;
    const result = await controller.updateNotificationPreferences(tenantId, req.params.userId, preferences ?? []);
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.post("/admin/update-user-role/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const result = await controller.updateUserRole(req.params.userId, req.body.role, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.delete("/admin/users/:userId", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.deleteUser(req.params.userId, tenantId, req.user.id, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  const triggerHandler = (fn: () => Promise<{ ok: boolean; data?: unknown; error?: string }>, successMessage: string): RequestHandler =>
    async (_req, res) => {
      const result = await fn();
      if (!result.ok) return sendError(res, 500, result.error ?? "Failed to trigger");
      res.json(result.data ?? { success: true, message: successMessage });
    };

  router.get("/admin/equipment/trigger-health-check", authMiddleware, requireAdmin, triggerHandler(controller.triggerHealthCheck, "Equipment health check triggered successfully"));
  router.post("/admin/equipment/trigger-health-check", authMiddleware, requireAdmin, triggerHandler(controller.triggerHealthCheck, "Equipment health check triggered successfully"));
  router.get("/admin/equipment/trigger-maintenance-reminders", authMiddleware, requireAdmin, triggerHandler(controller.triggerMaintenanceReminders, "Maintenance reminder check triggered successfully"));
  router.post("/admin/equipment/trigger-maintenance-reminders", authMiddleware, requireAdmin, triggerHandler(controller.triggerMaintenanceReminders, "Maintenance reminder check triggered successfully"));
  router.get("/admin/equipment/trigger-overdue-maintenance-reminders", authMiddleware, requireAdmin, triggerHandler(controller.triggerOverdueMaintenanceReminders, "Overdue maintenance reminder check triggered successfully"));
  router.post("/admin/equipment/trigger-overdue-maintenance-reminders", authMiddleware, requireAdmin, triggerHandler(controller.triggerOverdueMaintenanceReminders, "Overdue maintenance reminder check triggered successfully"));
  router.get("/admin/duties/trigger-duty-spawn", authMiddleware, requireAdmin, triggerHandler(controller.triggerDutySpawn, "Duty spawn triggered successfully"));
  router.post("/admin/duties/trigger-duty-spawn", authMiddleware, requireAdmin, triggerHandler(controller.triggerDutySpawn, "Duty spawn triggered successfully"));

  return router;
}
