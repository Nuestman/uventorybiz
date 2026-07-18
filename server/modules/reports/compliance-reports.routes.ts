import type { RequestHandler } from "express";
import { Router } from "express";
import { fetchComplianceReports, parseComplianceReportsQuery } from "./compliance-reports.service";

export interface ComplianceReportsRoutesDeps {
  authMiddleware: RequestHandler;
  requireComplianceReportsAccess: RequestHandler;
}

export function createComplianceReportsRouter(deps: ComplianceReportsRoutesDeps): Router {
  const router = Router();
  const { authMiddleware, requireComplianceReportsAccess } = deps;

  router.get(
    "/reports/compliance",
    authMiddleware,
    requireComplianceReportsAccess,
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId as string | undefined;
        if (!tenantId) {
          return res.status(403).json({
            message:
              "Compliance reports require an organization context. Super admins should use impersonation.",
          });
        }

        let queryParams;
        try {
          queryParams = parseComplianceReportsQuery({ ...req.query });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Invalid query parameters";
          return res.status(400).json({ message: msg });
        }

        const payload = await fetchComplianceReports({
          ...queryParams,
          tenantId,
        });
        return res.json(payload);
      } catch (err) {
        console.error("GET /api/reports/compliance:", err);
        return res.status(500).json({ message: "Failed to load compliance reports" });
      }
    },
  );

  return router;
}
