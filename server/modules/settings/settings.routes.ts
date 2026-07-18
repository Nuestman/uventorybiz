import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createSettingsController } from "./settings.controller";

export interface SettingsRoutesDeps {
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
 * Create the settings router. Mount at /api.
 * Routes:
 *   GET  /settings  - tenant-scoped settings (any authenticated user)
 *   PATCH /settings  - update tenant-scoped settings (admin only)
 */
export function createSettingsRouter(deps: SettingsRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createSettingsController(storage);

  router.get("/settings", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.get(tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "NO_TENANT") return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.patch("/settings", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.update(tenantId, req.body);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "NO_TENANT") return sendError(res, 400, result.error);
      if (result.code === "POC_CATEGORY_REQUIRED") return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
