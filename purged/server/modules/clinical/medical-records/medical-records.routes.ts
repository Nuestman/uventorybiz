import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertMedicalRecordSchema } from "@shared/schema";
import { createMedicalRecordsController } from "./medical-records.controller";

export interface MedicalRecordsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
}

/**
 * Create the medical records router. Mount at /api.
 */
export function createMedicalRecordsRouter(deps: MedicalRecordsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess } = deps;
  const router = Router();
  const controller = createMedicalRecordsController(storage);

  router.post(
    "/medical-records",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertMedicalRecordSchema.omit({ medicalStaffId: true })),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId || (req as any).session?.tenantId;
      if (!tenantId) return sendError(res, 400, "Tenant ID is required");
      const recordData = { ...(req.body as any), medicalStaffId: req.user.id };
      const result = await controller.create(tenantId, recordData);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/medical-records/:patientId", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId || (req as any).session?.tenantId;
    if (!tenantId) return sendError(res, 400, "Tenant ID is required");
    const result = await controller.listByPatient(req.params.patientId, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
