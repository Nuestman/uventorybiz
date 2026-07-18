import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertMedicalVisitSchema } from "@shared/schema";
import { createMedicalVisitsController } from "./medical-visits.controller";
import type { MedicalVisitListFilters } from "./medical-visits.controller";

export interface MedicalVisitsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

/**
 * Create the medical visits router. Mount at /api.
 * Routes: /api/medical-visits, /api/medical-visits/patient/:patientId, /api/medical-visits/:id
 */
export function createMedicalVisitsRouter(deps: MedicalVisitsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createMedicalVisitsController(storage);

  router.post(
    "/medical-visits",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      try {
        const normalizedVisitDate =
          typeof req.body.visitDate === "string" ? new Date(req.body.visitDate) : req.body.visitDate;
        const normalizedDispositionDateTime =
          req.body.dispositionDateTime === ""
            ? null
            : typeof req.body.dispositionDateTime === "string"
              ? new Date(req.body.dispositionDateTime)
              : req.body.dispositionDateTime;
        const normalizedLastMenstrualPeriod =
          req.body.lastMenstrualPeriod === ""
            ? null
            : typeof req.body.lastMenstrualPeriod === "string"
              ? new Date(req.body.lastMenstrualPeriod)
              : req.body.lastMenstrualPeriod;

        const processedData = {
          ...req.body,
          visitDate: normalizedVisitDate,
          dispositionDateTime: normalizedDispositionDateTime,
          followUpDate: req.body.followUpDate === "" ? null : req.body.followUpDate,
          lastMenstrualPeriod: normalizedLastMenstrualPeriod,
          medicalStaffId: req.user.claims?.sub || req.user.id,
        };
        const visitData = insertMedicalVisitSchema.parse(processedData);
        const userId = req.user.id;
        const initialVitals = req.body.initialVitals;
        const result = await controller.create(tenantId, userId, visitData, initialVitals);
        if (!result.ok) return sendError(res, 500, result.error);
        res.json(result.data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const flattened = (error as z.ZodError).flatten();
          return sendError(res, 400, "Invalid medical visit data", {
            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          });
        }
        throw error;
      }
    }
  );

  router.get("/medical-visits", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, parseMedicalVisitListFilters(req.query));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/medical-visits/patient/:patientId", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, {
      ...parseMedicalVisitListFilters(req.query),
      patientId: req.params.patientId,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/medical-visits/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
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
    "/medical-visits/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertMedicalVisitSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const updateData = { ...(req.body as Record<string, unknown>) };
      if (updateData.visitDate && typeof updateData.visitDate === "string")
        updateData.visitDate = new Date(updateData.visitDate as string);
      if (updateData.followUpDate && typeof updateData.followUpDate === "string")
        updateData.followUpDate = new Date(updateData.followUpDate as string);
      if (updateData.returnToWorkDate && typeof updateData.returnToWorkDate === "string")
        updateData.returnToWorkDate = new Date(updateData.returnToWorkDate as string);
      const result = await controller.update(req.params.id, tenantId, userId, updateData);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/medical-visits/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}

function parseMedicalVisitListFilters(query: Record<string, unknown>): MedicalVisitListFilters {
  const pageRaw = query.page;
  const pageSizeRaw = query.pageSize;
  const page =
    pageRaw !== undefined && pageRaw !== "" ? Math.max(1, parseInt(String(pageRaw), 10) || 1) : undefined;
  const pageSize =
    pageSizeRaw !== undefined && pageSizeRaw !== ""
      ? Math.min(100, Math.max(1, parseInt(String(pageSizeRaw), 10) || 25))
      : undefined;

  return {
    patientId: typeof query.patientId === "string" ? query.patientId : undefined,
    page,
    pageSize,
    search: typeof query.search === "string" ? query.search : undefined,
    statusGroup: typeof query.statusGroup === "string" ? query.statusGroup : undefined,
    visitType: typeof query.visitType === "string" ? query.visitType : undefined,
    locationId: typeof query.locationId === "string" ? query.locationId : undefined,
    companyName: typeof query.companyName === "string" ? query.companyName : undefined,
  };
}
