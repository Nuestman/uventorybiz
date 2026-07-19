import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertCareLocationSchema } from "@shared/schema";
import { createCareLocationsController } from "./care-locations.controller";

export interface CareLocationsRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
}

function performedByLabel(req: any): string {
  return req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : "Admin";
}

/**
 * Create the care locations router. Mount at /api.
 * Routes: /api/care-locations, /api/care-locations/primary, /api/care-locations/:id
 */
export function createCareLocationsRouter(deps: CareLocationsRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createCareLocationsController(storage);

  router.get("/care-locations", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json([]);
    const includeInactive = req.query.includeInactive === "true";
    const status = req.query.status as string | undefined;
    const rawKind = req.query.locationKind as string | undefined;
    let locationKind: "fixed_site" | "fleet" | undefined;
    if (rawKind === "fixed_site" || rawKind === "fleet") locationKind = rawKind;
    else if (rawKind != null && rawKind !== "")
      return sendError(res, 400, "Invalid locationKind (use fixed_site or fleet)");
    const result = await controller.list(tenantId, { includeInactive, status, locationKind });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/care-locations/primary", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getPrimary(tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.get("/care-locations/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.post(
    "/care-locations",
    authMiddleware,
    requireAdmin,
    validateBody(insertCareLocationSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, userId, req.body, performedByLabel(req));
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.put(
    "/care-locations/:id",
    authMiddleware,
    requireAdmin,
    validateBody(insertCareLocationSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, userId, req.body, performedByLabel(req));
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "IS_AMBULANCE") return sendError(res, 400, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/care-locations/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId, userId, performedByLabel(req));
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (
        result.code === "CANNOT_DELETE_PRIMARY" ||
        result.code === "CANNOT_DELETE_ONLY" ||
        result.code === "IS_AMBULANCE" ||
        result.code === "AMBULANCE_HAS_STOCK"
      )
        return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
