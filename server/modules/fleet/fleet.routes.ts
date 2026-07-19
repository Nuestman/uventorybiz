import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import {
  createFleetUnitSchema,
  updateFleetUnitSchema,
  createFleetPrestartSchema,
  updateFleetPrestartSchema,
} from "@shared/schema";
import { createFleetController } from "./fleet.controller";
import { createFleetPrestartController } from "./fleet-prestart.controller";

export interface FleetRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  requireFleetModuleAccess: RequestHandler;
}

function performedByLabel(req: { user?: { firstName?: string; lastName?: string } }): string {
  return req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : "Admin";
}

/**
 * Fleet API: vehicle register + pre-start checks. Mount at /api.
 */
export function createFleetRouter(deps: FleetRoutesDeps): Router {
  const { authMiddleware, requireAdmin, requireFleetModuleAccess } = deps;
  const router = Router();
  const controller = createFleetController(storage);
  const prestartController = createFleetPrestartController(storage);

  router.get(
    "/fleet-prestart-checks",
    authMiddleware,
    requireFleetModuleAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await prestartController.list(tenantId, {
        fleetLocationId: req.query.fleetLocationId as string | undefined,
        fromShiftDate: req.query.fromShiftDate as string | undefined,
        toShiftDate: req.query.toShiftDate as string | undefined,
      });
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get(
    "/fleet-prestart-checks/:id",
    authMiddleware,
    requireFleetModuleAccess,
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
    "/fleet-prestart-checks",
    authMiddleware,
    requireFleetModuleAccess,
    validateBody(createFleetPrestartSchema),
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
    "/fleet-prestart-checks/:id",
    authMiddleware,
    requireFleetModuleAccess,
    validateBody(updateFleetPrestartSchema),
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

  router.get("/fleet", authMiddleware, requireFleetModuleAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json([]);
    const includeInactive = req.query.includeInactive === "true";
    const result = await controller.list(tenantId, { includeInactive });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get(
    "/fleet/:id/stock-summary",
    authMiddleware,
    requireFleetModuleAccess,
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
    "/fleet/:id/stock-on-board",
    authMiddleware,
    requireFleetModuleAccess,
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
    "/fleet/:id/inventory-activity",
    authMiddleware,
    requireFleetModuleAccess,
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
    "/fleet/:id/stock-transfers",
    authMiddleware,
    requireFleetModuleAccess,
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

  router.get("/fleet/:id", authMiddleware, requireFleetModuleAccess, async (req: any, res) => {
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
    "/fleet",
    authMiddleware,
    requireFleetModuleAccess,
    requireAdmin,
    validateBody(createFleetUnitSchema),
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
    "/fleet/:id",
    authMiddleware,
    requireFleetModuleAccess,
    requireAdmin,
    validateBody(updateFleetUnitSchema),
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
    "/fleet/:id",
    authMiddleware,
    requireFleetModuleAccess,
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

/** @deprecated Use createFleetRouter */
export const createAmbulancesRouter = createFleetRouter;
