import type { RequestHandler } from "express";
import { Router } from "express";
import {
  fetchClinicalReports,
  parseClinicalReportsQuery,
} from "./clinical-reports.service";

export interface ClinicalReportsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
}

export function createClinicalReportsRouter(deps: ClinicalReportsRoutesDeps): Router {
  const router = Router();
  const { authMiddleware, requireClinicalAccess } = deps;

  router.get(
    "/reports/clinical",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId as string | undefined;
        if (!tenantId) {
          return res.status(403).json({
            message:
              "Clinical reports require an organization context. Super admins should use impersonation.",
          });
        }

        let params;
        try {
          params = parseClinicalReportsQuery({
            ...req.query,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Invalid query parameters";
          return res.status(400).json({ message: msg });
        }

        const payload = await fetchClinicalReports({
          ...params,
          tenantId,
        });

        res.json(payload);
      } catch (err) {
        console.error("GET /api/reports/clinical:", err);
        res.status(500).json({ message: "Failed to load clinical reports" });
      }
    }
  );

  return router;
}
