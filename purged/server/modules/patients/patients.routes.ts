import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertPatientSchema } from "@shared/schema";
import { resolveSymptomDisplayLabel } from "@shared/symptomCatalog";
import { createPatientsController } from "./patients.controller";

export interface PatientsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
}

/**
 * Create the patients router. Mount at /api so that routes are
 * /api/patients, /api/patients/search, /api/patients/:id.
 */
export function createPatientsRouter(deps: PatientsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess } = deps;
  const router = Router();
  const controller = createPatientsController(storage);

  router.get("/patients/search", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { q } = req.query;
    const result = await controller.search(tenantId, (q as string) ?? "");
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/patients",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertPatientSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const patientData = req.body as z.infer<typeof insertPatientSchema>;
      const result = await controller.create(tenantId, patientData);
      if (!result.ok) {
        if (result.code === "ALREADY_REGISTERED" && "employeeId" in result) {
          return sendError(res, 409, result.error, { errors: { employeeId: result.employeeId } });
        }
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    },
  );

  router.get("/patients", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const result = await controller.list(tenantId, { search, limit });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/patients/:id/symptom-logs", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const patient = await storage.getPatient(req.params.id, tenantId);
    if (!patient) return sendError(res, 404, "Patient not found");
    const { from, to, symptomTypeId, limit } = req.query;
    const filters: { from?: Date; to?: Date; symptomTypeId?: string; limit?: number } = {};
    if (from) filters.from = new Date(from as string);
    if (to) filters.to = new Date(to as string);
    if (symptomTypeId) filters.symptomTypeId = symptomTypeId as string;
    if (limit) filters.limit = parseInt(limit as string, 10);
    const rows = await storage.listSymptomLogEntries(tenantId, { patientId: req.params.id, ...filters });
    res.json(
      rows.map(({ entry, type }) => ({
        id: entry.id,
        symptomTypeId: entry.symptomTypeId,
        symptomCode: type.code,
        symptomLabel: resolveSymptomDisplayLabel(type.code, type.label, entry.notes),
        recordedAt: entry.recordedAt,
        severity: entry.severity,
        bodyLocation: entry.bodyLocation ?? null,
        durationMinutes: entry.durationMinutes ?? null,
        symptomQuality: entry.symptomQuality ?? null,
        provocation: entry.provocation ?? null,
        palliation: entry.palliation ?? null,
        radiation: entry.radiation ?? null,
        notes: entry.notes ?? null,
        source: entry.source ?? "patient_self",
        createdAt: entry.createdAt ?? null,
      })),
    );
  });

  router.get("/patients/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.put(
    "/patients/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertPatientSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const patientData = req.body as z.infer<typeof insertPatientSchema>;
      const result = await controller.update(req.params.id, tenantId, patientData);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    },
  );

  return router;
}
