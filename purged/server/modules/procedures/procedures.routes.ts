import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertProcedureSchema } from "@shared/schema";
import { createProceduresController } from "./procedures.controller";

export interface ProceduresRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  requireClinicalAccess: RequestHandler;
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
 * Create the procedures router. Mount at /api.
 * Routes: GET /procedures (any auth), POST /procedures, PUT /procedures/:id, DELETE /procedures/:id (admin only).
 */
export function createProceduresRouter(deps: ProceduresRoutesDeps): Router {
  const { authMiddleware, requireAdmin, requireClinicalAccess } = deps;
  const router = Router();
  const controller = createProceduresController(storage);

  router.get("/procedures", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const activeOnly = req.query.activeOnly !== "false";
    const result = await controller.list(tenantId, activeOnly);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/procedures",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertProcedureSchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertProcedureSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.put(
    "/procedures/:id",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertProcedureSchema.partial()),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/procedures/:id", authMiddleware, requireClinicalAccess, requireAdmin, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
