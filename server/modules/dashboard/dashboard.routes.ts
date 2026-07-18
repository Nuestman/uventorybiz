import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createDashboardController } from "./dashboard.controller";

export interface DashboardRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Create the dashboard router. Mount at /api.
 * Routes: /api/dashboard/metrics
 */
export function createDashboardRouter(deps: DashboardRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createDashboardController(storage);

  router.get("/dashboard/metrics", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getMetrics(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
