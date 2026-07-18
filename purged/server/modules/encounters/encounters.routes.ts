import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import {
  dischargeEncounterSchema,
  editEncounterHeaderSchema,
  insertEncounterSchema,
  openEncounterSchema,
} from "@shared/schema";
import { createMedicalVisitsController } from "../clinical/medical-visits/medical-visits.controller";
import { createEncountersController } from "./encounters.controller";
import { listEncounterPathways, getEncounterTypeDefinition } from "./encounter-pathways.service";
import { ENCOUNTER_TYPES, type EncounterType } from "@shared/encounterPathways";
import { finalizeTelehealthVisitFromEncounter, syncTelehealthOutcomeFromEncounterCancel } from "../telecare/telecare-appointment-sync.service";

export interface EncountersRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

function mapEncounterError(res: any, result: { ok: false; error: string; code?: string }) {
  if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
  if (
    result.code === "CLOSED" ||
    result.code === "ACTIVE_ENCOUNTER_EXISTS" ||
    result.code === "ENCOUNTER_REQUIRED"
  ) {
    return sendError(res, 400, result.error);
  }
  return sendError(res, 500, result.error);
}

/**
 * Encounter API — pathway metadata + lifecycle at /api/encounters.
 * See docs/ENCOUNTER_FIRST_MODEL.md
 */
export function createEncountersRouter(deps: EncountersRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();
  const lifecycle = createEncountersController(storage);
  const legacy = createMedicalVisitsController(storage);

  router.get("/encounters/types", authMiddleware, requireClinicalAccess, (_req, res) => {
    res.json(listEncounterPathways());
  });

  router.get("/encounters/pathways", authMiddleware, requireClinicalAccess, (_req, res) => {
    res.json(listEncounterPathways());
  });

  router.get("/encounters/types/:typeId", authMiddleware, requireClinicalAccess, (req, res) => {
    const id = req.params.typeId;
    if (!ENCOUNTER_TYPES.includes(id as EncounterType)) {
      return sendError(res, 404, "Unknown encounter type");
    }
    res.json(getEncounterTypeDefinition(id));
  });

  router.get("/encounters/pathways/:pathwayId", authMiddleware, requireClinicalAccess, (req, res) => {
    const id = req.params.pathwayId;
    if (!ENCOUNTER_TYPES.includes(id as EncounterType)) {
      return sendError(res, 404, "Unknown encounter type");
    }
    res.json(getEncounterTypeDefinition(id));
  });

  router.get("/encounters/active", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const patientId = req.query.patientId as string | undefined;
    if (!patientId) return sendError(res, 400, "patientId query parameter is required");
    const result = await lifecycle.getActive(tenantId, patientId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/encounters/open",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    validateBody(openEncounterSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = {
        ...req.body,
        locationId: req.body.locationId ?? req.user?.activeLocationId ?? null,
      };
      const result = await lifecycle.open(tenantId, req.user.id, body);
      if (!result.ok) return mapEncounterError(res, result);
      res.status(201).json(result.data);
    },
  );

  /** Legacy: single-shot create (full clinical record). Prefer open → update → discharge. */
  router.post(
    "/encounters",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      try {
        const processedData = normalizeEncounterBody(req.body, req.user);
        const visitData = insertEncounterSchema.parse(processedData);
        const result = await legacy.create(tenantId, req.user.id, visitData, req.body.initialVitals);
        if (!result.ok) return sendError(res, 500, result.error);
        res.json(result.data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const flattened = error.flatten();
          return sendError(res, 400, "Invalid encounter data", {
            errors: { fieldErrors: flattened.fieldErrors, formErrors: flattened.formErrors },
          });
        }
        throw error;
      }
    },
  );

  router.get("/encounters", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const filters = parseEncounterListFilters(req.query);
    const result = await legacy.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/encounters/patient/:patientId", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await legacy.list(tenantId, {
      ...parseEncounterListFilters(req.query),
      patientId: req.params.patientId,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/encounters/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await lifecycle.getById(req.params.id, tenantId);
    if (!result.ok) return mapEncounterError(res, result);
    res.json(result.data);
  });

  router.patch(
    "/encounters/:id/header",
    authMiddleware,
    requireClinicalAccess,
    validateBody(editEncounterHeaderSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await lifecycle.editHeader(req.params.id, tenantId, req.user.id, req.body);
      if (!result.ok) return mapEncounterError(res, result);
      res.json(result.data);
    },
  );

  router.put(
    "/encounters/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertEncounterSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const updateData = normalizeEncounterUpdate(req.body);
      const result = await lifecycle.update(req.params.id, tenantId, userId, updateData);
      if (!result.ok) return mapEncounterError(res, result);
      res.json(result.data);
    },
  );

  router.post(
    "/encounters/:id/discharge",
    authMiddleware,
    requireClinicalAccess,
    validateBody(dischargeEncounterSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await lifecycle.discharge(req.params.id, tenantId, req.user.id, req.body);
      if (!result.ok) return mapEncounterError(res, result);
      await finalizeTelehealthVisitFromEncounter(storage, tenantId, req.params.id);
      res.json(result.data);
    },
  );

  router.post("/encounters/:id/cancel", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await lifecycle.cancel(req.params.id, tenantId, req.user.id);
    if (!result.ok) return mapEncounterError(res, result);
    await syncTelehealthOutcomeFromEncounterCancel(storage, tenantId, req.params.id);
    res.json(result.data);
  });

  router.delete("/encounters/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await legacy.delete(req.params.id, tenantId, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}

function parseEncounterListFilters(query: Record<string, unknown>) {
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

function normalizeEncounterBody(body: Record<string, unknown>, user: any): Record<string, unknown> {
  const normalizedVisitDate =
    typeof body.visitDate === "string" ? new Date(body.visitDate) : body.visitDate;
  const normalizedDispositionDateTime =
    body.dispositionDateTime === ""
      ? null
      : typeof body.dispositionDateTime === "string"
        ? new Date(body.dispositionDateTime)
        : body.dispositionDateTime;
  const normalizedLastMenstrualPeriod =
    body.lastMenstrualPeriod === ""
      ? null
      : typeof body.lastMenstrualPeriod === "string"
        ? new Date(body.lastMenstrualPeriod)
        : body.lastMenstrualPeriod;

  return {
    ...body,
    visitDate: normalizedVisitDate,
    dispositionDateTime: normalizedDispositionDateTime,
    followUpDate: body.followUpDate === "" ? null : body.followUpDate,
    lastMenstrualPeriod: normalizedLastMenstrualPeriod,
    medicalStaffId: user.claims?.sub || user.id,
  };
}

function normalizeEncounterUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const updateData = { ...body };
  if (updateData.visitDate && typeof updateData.visitDate === "string")
    updateData.visitDate = new Date(updateData.visitDate as string);
  if (updateData.followUpDate && typeof updateData.followUpDate === "string")
    updateData.followUpDate = new Date(updateData.followUpDate as string);
  if (updateData.returnToWorkDate && typeof updateData.returnToWorkDate === "string")
    updateData.returnToWorkDate = new Date(updateData.returnToWorkDate as string);
  return updateData;
}
