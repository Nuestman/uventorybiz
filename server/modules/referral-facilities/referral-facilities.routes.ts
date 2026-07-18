import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertReferralFacilitySchema } from "@shared/schema";
import { createReferralFacilitiesController } from "./referral-facilities.controller";

export interface ReferralFacilitiesRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  requireClinicalAccess: RequestHandler;
}

/**
 * Referral facilities router. Mount at /api.
 * GET /api/referral-facilities - list (active by default; used by medical visit form)
 * GET /api/referral-facilities/:id - get one
 * POST /api/referral-facilities - create (admin)
 * PUT /api/referral-facilities/:id - update (admin)
 * DELETE /api/referral-facilities/:id - delete (admin)
 */
export function createReferralFacilitiesRouter(deps: ReferralFacilitiesRoutesDeps): Router {
  const { authMiddleware, requireAdmin, requireClinicalAccess } = deps;
  const router = Router();
  const controller = createReferralFacilitiesController(storage);

  router.get("/referral-facilities", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json([]);
    const includeInactive = req.query.includeInactive === "true";
    const status = req.query.status as string | undefined;
    const result = await controller.list(tenantId, { includeInactive, status });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/referral-facilities/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
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
    "/referral-facilities",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertReferralFacilitySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.put(
    "/referral-facilities/:id",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertReferralFacilitySchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/referral-facilities/:id", authMiddleware, requireClinicalAccess, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
