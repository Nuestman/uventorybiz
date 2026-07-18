import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createUsersController } from "./users.controller";

export interface UsersRoutesDeps {
  authMiddleware: RequestHandler;
}

/** Resolve tenantId from req (matches legacy behavior for list/export). */
async function resolveTenantId(req: any): Promise<string | null> {
  let tenantId = req.user?.tenantId || req.tenantId;
  if (!tenantId && req.user?.id) {
    const fullUser = await storage.getUserById(req.user.id);
    tenantId = fullUser?.tenantId ?? null;
  }
  return tenantId ?? null;
}

/**
 * Create the users router. Mount at /api.
 * Routes: /api/users, /api/users/export, /api/users/:id
 */
export function createUsersRouter(deps: UsersRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createUsersController(storage);

  router.get("/users", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/users/export", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.export(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
    res.send(result.data.csvContent);
  });

  router.get("/users/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
