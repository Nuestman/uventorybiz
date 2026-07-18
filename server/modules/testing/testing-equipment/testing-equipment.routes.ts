import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertTestingEquipmentSchema } from "@shared/schema";
import { createTestingEquipmentController } from "./testing-equipment.controller";

export interface TestingEquipmentRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Create the testing equipment router. Mount at /api.
 * Routes: GET /testing-equipment/calibration-due, then CRUD /testing-equipment
 */
export function createTestingEquipmentRouter(deps: TestingEquipmentRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createTestingEquipmentController(storage);

  router.get("/testing-equipment/calibration-due", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getCalibrationDue(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/testing-equipment", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const filters = {
      deviceType: req.query.deviceType as string,
      status: req.query.status as string,
      location: req.query.location as string,
      calibrationDue: req.query.calibrationDue === "true" ? true : undefined,
    };
    const result = await controller.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/testing-equipment",
    authMiddleware,
    validateBody(insertTestingEquipmentSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertTestingEquipmentSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.get("/testing-equipment/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    if (result.data === null) return sendError(res, 404, "Testing equipment not found");
    res.json(result.data);
  });

  router.put(
    "/testing-equipment/:id",
    authMiddleware,
    validateBody(insertTestingEquipmentSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/testing-equipment/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json({ success: true, message: "Testing equipment deleted successfully" });
  });

  return router;
}
