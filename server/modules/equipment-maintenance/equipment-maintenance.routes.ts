import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertEquipmentMaintenanceSchema } from "@shared/schema";
import { createEquipmentMaintenanceController } from "./equipment-maintenance.controller";
import type { MaintenanceListFilters } from "./equipment-maintenance.controller";

// createdBy is resolved from the session, and cost is a varchar (decimal precision)
// column that clients send as a number — accept both and normalize to string.
const costString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, { message: "Must be a non-negative number" })
  .nullish();

const maintenanceBodySchema = insertEquipmentMaintenanceSchema
  .omit({ createdBy: true })
  .extend({ cost: costString });

export interface EquipmentMaintenanceRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Create the equipment maintenance router. Mount at /api.
 * Routes: /equipment-maintenance (CRUD), /equipment/maintenance-due
 */
export function createEquipmentMaintenanceRouter(deps: EquipmentMaintenanceRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createEquipmentMaintenanceController(storage);

  router.get("/equipment/maintenance-due", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getMaintenanceDue(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/equipment-maintenance",
    authMiddleware,
    validateBody(maintenanceBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const userId = req.user?.id;
      if (!userId) return sendError(res, 400, "User ID required");
      const result = await controller.create(tenantId, { ...req.body, createdBy: userId });
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/equipment-maintenance", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const filters: MaintenanceListFilters = {
      status: req.query.status as string,
      equipmentId: req.query.equipmentId as string,
      overdue: req.query.overdue === "true",
    };
    const result = await controller.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/equipment-maintenance/:id", authMiddleware, async (req: any, res) => {
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
    "/equipment-maintenance/:id",
    authMiddleware,
    validateBody(maintenanceBodySchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/equipment-maintenance/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
