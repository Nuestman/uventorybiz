import type { RequestHandler } from "express";
import { Router } from "express";
import { fetchIncidentReports, parseIncidentReportsQuery } from "./incident-reports.service";

export interface IncidentReportsRoutesDeps {
  authMiddleware: RequestHandler;
  requireIncidentReportsAccess: RequestHandler;
}

export function createIncidentReportsRouter(deps: IncidentReportsRoutesDeps): Router {
  const router = Router();
  const { authMiddleware, requireIncidentReportsAccess } = deps;

  router.get(
    "/reports/incidents",
    authMiddleware,
    requireIncidentReportsAccess,
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId as string | undefined;
        if (!tenantId) {
          return res.status(403).json({
            message:
              "Incident reports require an organization context. Super admins should use impersonation.",
          });
        }

        let params;
        try {
          params = parseIncidentReportsQuery({
            ...req.query,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Invalid query parameters";
          return res.status(400).json({ message: msg });
        }

        const payload = await fetchIncidentReports({
          ...params,
          tenantId,
        });

        res.json(payload);
      } catch (err) {
        console.error("GET /api/reports/incidents:", err);
        res.status(500).json({ message: "Failed to load incident reports" });
      }
    },
  );

  return router;
}
