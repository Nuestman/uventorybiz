import type { RequestHandler } from "express";
import { Router } from "express";
import {
  fetchOperationsReports,
  parseOperationsReportsQuery,
} from "./operations-reports.service";

export interface OperationsReportsRoutesDeps {
  authMiddleware: RequestHandler;
  requireOperationsReportsAccess: RequestHandler;
}

export function createOperationsReportsRouter(deps: OperationsReportsRoutesDeps): Router {
  const router = Router();
  const { authMiddleware, requireOperationsReportsAccess } = deps;

  router.get(
    "/reports/operations",
    authMiddleware,
    requireOperationsReportsAccess,
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId as string | undefined;
        if (!tenantId) {
          return res.status(403).json({
            message:
              "Operations reports require an organization context. Super admins should use impersonation.",
          });
        }

        let params;
        try {
          params = parseOperationsReportsQuery({
            ...req.query,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Invalid query parameters";
          return res.status(400).json({ message: msg });
        }

        const { comparePriorPeriod, ...dataParams } = params;
        const payload = await fetchOperationsReports({
          ...dataParams,
          tenantId,
          comparePriorPeriod,
        });
        return res.json(payload);
      } catch (err) {
        console.error("GET /api/reports/operations:", err);
        return res.status(500).json({ message: "Failed to load operations reports" });
      }
    },
  );

  return router;
}
