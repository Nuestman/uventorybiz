import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createAuditLogsController } from "./audit-logs.controller";

export interface AuditLogsRoutesDeps {
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

/**
 * Create the audit logs router. Mount at /api.
 * Routes: /api/audit-logs, /api/admin/audit-logs
 */
export function createAuditLogsRouter(deps: AuditLogsRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createAuditLogsController(storage);

  const buildFilters = (req: any) => ({
    resourceType: req.query.resourceType as string,
    action: req.query.action as string,
    userId: req.query.userId as string,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
  });

  router.get("/audit-logs", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, buildFilters(req));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/admin/audit-logs", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, buildFilters(req));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
