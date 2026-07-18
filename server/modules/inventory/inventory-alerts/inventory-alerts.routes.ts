import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertInventoryAlertSchema } from "@shared/schema";
import { createInventoryAlertsController } from "./inventory-alerts.controller";

export interface InventoryAlertsRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
}

/**
 * Create the inventory alerts router. Mount at /api.
 * Routes: POST/GET /inventory-alerts, POST process-pending, PUT :id, PUT :id/acknowledge, PUT :id/resolve
 */
export function createInventoryAlertsRouter(deps: InventoryAlertsRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createInventoryAlertsController(storage);

  router.post("/inventory-alerts/process-pending", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.processPending(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json({ success: true, message: `Processed ${result.data.processed} alerts, ${result.data.errors} errors`, ...result.data });
  });

  router.post(
    "/inventory-alerts",
    authMiddleware,
    validateBody(insertInventoryAlertSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertInventoryAlertSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/inventory-alerts", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const filters = {
      isActive: req.query.isActive === "true",
      alertType: req.query.alertType as string,
      severity: req.query.severity as string,
    };
    const result = await controller.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put(
    "/inventory-alerts/:id",
    authMiddleware,
    validateBody(insertInventoryAlertSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.put("/inventory-alerts/:id/acknowledge", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const acknowledgedBy = req.user?.id;
    if (!acknowledgedBy) return sendError(res, 400, "User information not available");
    const result = await controller.acknowledge(req.params.id, acknowledgedBy, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/inventory-alerts/:id/resolve", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const resolvedBy = req.user?.id;
    if (!resolvedBy) return sendError(res, 400, "User information not available");
    const result = await controller.resolve(req.params.id, resolvedBy, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
