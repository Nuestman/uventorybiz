import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import {
  createAmbulanceSchema,
  updateAmbulanceSchema,
  createAmbulancePrestartSchema,
  updateAmbulancePrestartSchema,
} from "@shared/schema";
import { createAmbulancesController } from "./ambulances.controller";
import { createAmbulancePrestartController } from "./ambulance-prestart.controller";

export interface AmbulancesRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  requireAmbulanceModuleAccess: RequestHandler;
}

function performedByLabel(req: { user?: { firstName?: string; lastName?: string } }): string {
  return req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : "Admin";
}

/**
 * Ambulance & EMS API: fleet (care_locations ambulances) + shift pre-start checks.
 * Mount at /api.
 */
export function createAmbulancesRouter(deps: AmbulancesRoutesDeps): Router {
  const { authMiddleware, requireAdmin, requireAmbulanceModuleAccess } = deps;
  const router = Router();
  const controller = createAmbulancesController(storage);
  const prestartController = createAmbulancePrestartController(storage);

  // --- Pre-start checks (fleet_operator, staff, admin, super_admin with tenant) ---
  router.get(
    "/ambulance-prestart-checks",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await prestartController.list(tenantId, {
        ambulanceLocationId: req.query.ambulanceLocationId as string | undefined,
        fromShiftDate: req.query.fromShiftDate as string | undefined,
        toShiftDate: req.query.toShiftDate as string | undefined,
      });
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get(
    "/ambulance-prestart-checks/:id",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await prestartController.getById(req.params.id, tenantId);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.post(
    "/ambulance-prestart-checks",
    authMiddleware,
    requireAmbulanceModuleAccess,
    validateBody(createAmbulancePrestartSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await prestartController.create(tenantId, userId, req.body);
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    }
  );

  router.patch(
    "/ambulance-prestart-checks/:id",
    authMiddleware,
    requireAmbulanceModuleAccess,
    validateBody(updateAmbulancePrestartSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const role = req.user?.role as string;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await prestartController.update(req.params.id, tenantId, userId, role, req.body);
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    }
  );

  // --- Fleet ---
  router.get("/ambulances", authMiddleware, requireAmbulanceModuleAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json([]);
    const includeInactive = req.query.includeInactive === "true";
    const result = await controller.list(tenantId, { includeInactive });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get(
    "/ambulances/:id/stock-summary",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.stockSummary(req.params.id, tenantId);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get(
    "/ambulances/:id/stock-on-board",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.stockOnBoard(req.params.id, tenantId);
      if (!result.ok) {
        if ("code" in result && result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get(
    "/ambulances/:id/inventory-activity",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === "string" && /^\d+$/.test(limitRaw) ? parseInt(limitRaw, 10) : undefined;
      const result = await controller.inventoryActivity(req.params.id, tenantId, { limit });
      if (!result.ok) {
        if ("code" in result && result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get(
    "/ambulances/:id/stock-transfers",
    authMiddleware,
    requireAmbulanceModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === "string" && /^\d+$/.test(limitRaw) ? parseInt(limitRaw, 10) : undefined;
      const result = await controller.recentStockTransfers(req.params.id, tenantId, { limit });
      if (!result.ok) {
        if ("code" in result && result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get("/ambulances/:id", authMiddleware, requireAmbulanceModuleAccess, async (req: any, res) => {
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
    "/ambulances",
    authMiddleware,
    requireAmbulanceModuleAccess,
    requireAdmin,
    validateBody(createAmbulanceSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, userId, req.body, performedByLabel(req));
      if (!result.ok) return sendError(res, 400, result.error);
      res.json(result.data);
    }
  );

  router.patch(
    "/ambulances/:id",
    authMiddleware,
    requireAmbulanceModuleAccess,
    requireAdmin,
    validateBody(updateAmbulanceSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, userId, req.body, performedByLabel(req));
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete(
    "/ambulances/:id",
    authMiddleware,
    requireAmbulanceModuleAccess,
    requireAdmin,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.delete(req.params.id, tenantId, userId, performedByLabel(req));
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "HAS_STOCK") return sendError(res, 400, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  return router;
}
