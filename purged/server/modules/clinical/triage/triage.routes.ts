import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertTriageSchema } from "@shared/schema";
import { z } from "zod";
import type { VitalsAtTriageInput } from "./triage-vitals";
import { createTriageController } from "./triage.controller";
import type { TriageListFilters } from "./triage.controller";

export interface TriageRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

function buildTriageFilters(req: any): TriageListFilters | undefined {
  const { patientId, locationId, acuity, encounterId, from, to } = req.query;
  const filters: TriageListFilters = {};
  if (patientId) filters.patientId = patientId as string;
  if (locationId) filters.locationId = locationId as string;
  if (acuity) filters.acuity = acuity as string;
  if (encounterId) filters.encounterId = encounterId as string;
  if (from) filters.from = new Date(from as string);
  if (to) filters.to = new Date(to as string);
  return Object.keys(filters).length ? filters : undefined;
}

const createTriageRequestSchema = insertTriageSchema.omit({ recordedBy: true }).extend({
  vitalsAtTriage: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Create the triage (SATS) router. Mount at /api.
 */
export function createTriageRouter(deps: TriageRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createTriageController(storage);

  router.post(
    "/triage",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    validateBody(createTriageRequestSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof createTriageRequestSchema>;
      const { vitalsAtTriage, ...triageFields } = body;
      const data = { ...triageFields, recordedBy: req.user.id };
      const result = await controller.create(
        tenantId,
        req.user.id,
        data,
        vitalsAtTriage as VitalsAtTriageInput | undefined,
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "ENCOUNTER_REQUIRED" || result.code === "CLOSED") {
          return sendError(res, 400, result.error);
        }
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get("/triage", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, buildTriageFilters(req));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/triage/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.patch(
    "/triage/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertTriageSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.user.id, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  return router;
}
