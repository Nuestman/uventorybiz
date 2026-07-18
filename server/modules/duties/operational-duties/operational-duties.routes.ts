import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertOperationalDutySchema } from "@shared/schema";
import { createOperationalDutiesController } from "./operational-duties.controller";

export interface OperationalDutiesRoutesDeps {
  authMiddleware: RequestHandler;
}

async function resolveTenantId(req: any): Promise<string | null> {
  let tenantId = req.user?.tenantId || req.tenantId;
  if (!tenantId && req.user?.id) {
    const fullUser = await storage.getUserById(req.user.id);
    tenantId = fullUser?.tenantId ?? null;
  }
  return tenantId ?? null;
}

/**
 * Create the operational duties router. Mount at /api.
 * Routes: POST/GET /operational-duties, PUT/DELETE /operational-duties/:id
 */
export function createOperationalDutiesRouter(deps: OperationalDutiesRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createOperationalDutiesController(storage);

  router.post(
    "/operational-duties",
    authMiddleware,
    validateBody(insertOperationalDutySchema),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(
        tenantId,
        req.user.id,
        req.body as z.infer<typeof insertOperationalDutySchema>
      );
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.get("/operational-duties", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put(
    "/operational-duties/:id",
    authMiddleware,
    validateBody(insertOperationalDutySchema.partial()),
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.user.id, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/operational-duties/:id", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId, req.user.id);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
