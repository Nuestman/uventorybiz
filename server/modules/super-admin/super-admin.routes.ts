import type { RequestHandler } from "express";
import type { AuthService } from "../auth/auth.service";
import { Router } from "express";
import { z } from "zod";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { createSuperAdminController } from "./super-admin.controller";
import { storage } from "../../storage";

export interface SuperAdminRoutesDeps {
  authMiddleware: RequestHandler;
  requireSuperAdmin: RequestHandler;
  requireActiveImpersonation: RequestHandler;
  authService: AuthService;
}

const startImpersonationSchema = z.object({
  targetUserId: z.string().min(1),
});

function getSessionToken(req: { headers: { authorization?: string }; cookies?: { sessionToken?: string } }): string | undefined {
  return req.headers.authorization?.replace("Bearer ", "") || req.cookies?.sessionToken;
}

function statusFromCode(code?: string): number {
  if (code === "NOT_FOUND") return 404;
  if (code === "FORBIDDEN") return 403;
  if (code === "UNAUTHORIZED") return 401;
  if (code === "BAD_REQUEST") return 400;
  return 500;
}

/**
 * Create the super-admin router. Mount at /api.
 */
export function createSuperAdminRouter(deps: SuperAdminRoutesDeps): Router {
  const { authMiddleware, requireSuperAdmin, requireActiveImpersonation, authService } = deps;
  const router = Router();
  const controller = createSuperAdminController(storage, authService);

  router.get("/super-admin/tenants", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getTenants();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/feedback", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getFeedback();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.patch("/super-admin/feedback/:id", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateFeedback(req.params.id, req.body || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.get("/super-admin/tenant-admins", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getTenantAdmins();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/users", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getUsersGroupedByTenant();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/super-admin/approve-admin/:adminId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.approveAdmin(req.params.adminId, req.user || {});
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/super-admin/create-tenant", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.createTenant(req.body, req.hostname || req.get("host") || "localhost");
    if (!result.ok) return res.status(500).json({ message: result.error });
    res.status(201).json(result.data);
  });

  router.patch("/super-admin/users/:userId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateUser(req.params.userId, req.body, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.delete("/super-admin/users/:userId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.deleteUser(req.params.userId, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.patch("/super-admin/tenant-admins/:adminId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateTenantAdmin(req.params.adminId, req.body, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.delete("/super-admin/tenant-admins/:adminId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.deleteTenantAdmin(req.params.adminId, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.post("/super-admin/tenants/:tenantId/status", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateTenantStatus(req.params.tenantId, req.body.status, req.get("host") || "");
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/super-admin/tenants/:tenantId/plan", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateTenantPlan(req.params.tenantId, req.body.planType, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.put("/super-admin/tenants/:tenantId", authMiddleware, requireSuperAdmin, async (req: any, res) => {
    const result = await controller.updateTenant(req.params.tenantId, req.body, req.user || {});
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.post(
    "/super-admin/impersonation/start",
    authMiddleware,
    requireSuperAdmin,
    validateBody(startImpersonationSchema),
    async (req: any, res) => {
      const sessionToken = getSessionToken(req);
      if (!sessionToken) return sendError(res, 401, "No active session");
      const result = await controller.startImpersonation({
        superAdminId: req.user?.id,
        sessionToken,
        targetUserId: (req.body as z.infer<typeof startImpersonationSchema>).targetUserId,
        ipAddress: req.ip || req.socket?.remoteAddress || null,
        userAgent: req.get("user-agent") || null,
      });
      if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
      res.json(result.data);
    }
  );

  router.post("/super-admin/impersonation/end", authMiddleware, requireActiveImpersonation, async (req: any, res) => {
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    const result = await controller.endImpersonation({
      sessionToken,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.get("user-agent") || null,
    });
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  router.get(
    "/super-admin/impersonation-events/:eventId/audit-logs",
    authMiddleware,
    requireSuperAdmin,
    async (req: any, res) => {
      const result = await controller.getImpersonationSessionAuditLogs(req.params.eventId);
      if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
      res.json(result.data);
    }
  );

  router.get("/super-admin/impersonation-events", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.listImpersonationEvents();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/impersonation-audit-logs", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.listImpersonationCrudAuditLogs();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/system-status", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getSystemStatus();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/global-audit-logs", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.listGlobalAuditLogs();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/super-admin/integrations-status", authMiddleware, requireSuperAdmin, async (req, res) => {
    const result = await controller.getIntegrationsStatus();
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
