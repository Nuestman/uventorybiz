import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertVitalSignsSchema } from "@shared/schema";
import { createVitalSignsController } from "./vital-signs.controller";
import type { VitalSignsListFilters } from "./vital-signs.controller";

export interface VitalSignsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

function buildVitalSignsFilters(req: any): VitalSignsListFilters | undefined {
  const { patientId, medicalVisitId, encounterId, triageId, from, to } = req.query;
  const filters: VitalSignsListFilters = {};
  if (patientId) filters.patientId = patientId as string;
  if (medicalVisitId) filters.medicalVisitId = medicalVisitId as string;
  if (encounterId) filters.encounterId = encounterId as string;
  if (triageId) filters.triageId = triageId as string;
  if (from) filters.from = new Date(from as string);
  if (to) filters.to = new Date(to as string);
  return Object.keys(filters).length ? filters : undefined;
}

/**
 * Create the vital signs router. Mount at /api.
 */
export function createVitalSignsRouter(deps: VitalSignsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createVitalSignsController(storage);

  router.post(
    "/vital-signs",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    validateBody(insertVitalSignsSchema.omit({ recordedBy: true })),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const data = { ...(req.body as any), recordedBy: req.user.id };
      const result = await controller.create(tenantId, data);
      if (!result.ok) {
        if (result.code === "ENCOUNTER_REQUIRED" || result.code === "CLOSED") {
          return sendError(res, 400, result.error);
        }
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get("/vital-signs", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, buildVitalSignsFilters(req));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/vital-signs/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
