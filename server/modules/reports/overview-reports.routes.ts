import type { RequestHandler } from "express";
import { Router } from "express";
import {
  STAFF_ACCESS_ROLES,
} from "../../shared/middleware/clinicalAuth";
import {
  INCIDENT_REPORTS_ACCESS_ROLES,
} from "../../shared/middleware/incidentReportsAuth";
import {
  OPERATIONS_REPORTS_ACCESS_ROLES,
} from "../../shared/middleware/operationsReportsAuth";
import {
  COMPLIANCE_REPORTS_ACCESS_ROLES,
} from "../../shared/middleware/complianceReportsAuth";
import { fetchOverviewReports, parseOverviewReportsQuery } from "./overview-reports.service";

export interface OverviewReportsRoutesDeps {
  authMiddleware: RequestHandler;
}

function hasRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return allowed.includes(role);
}

export function createOverviewReportsRouter(deps: OverviewReportsRoutesDeps): Router {
  const router = Router();
  const { authMiddleware } = deps;

  router.get("/reports/overview", authMiddleware, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId as string | undefined;
      if (!tenantId) {
        return res.status(403).json({
          message:
            "Overview reports require an organization context. Super admins should use impersonation.",
        });
      }

      let params;
      try {
        params = parseOverviewReportsQuery({ ...req.query });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Invalid query parameters";
        return res.status(400).json({ message: msg });
      }

      const role = (req.user?.role as string | undefined) ?? null;
      const payload = await fetchOverviewReports({
        ...params,
        tenantId,
        access: {
          incidents: hasRole(role, INCIDENT_REPORTS_ACCESS_ROLES),
          clinical: hasRole(role, STAFF_ACCESS_ROLES),
          operations: hasRole(role, OPERATIONS_REPORTS_ACCESS_ROLES),
          compliance: hasRole(role, COMPLIANCE_REPORTS_ACCESS_ROLES),
        },
      });
      return res.json(payload);
    } catch (err) {
      console.error("GET /api/reports/overview:", err);
      return res.status(500).json({ message: "Failed to load overview reports" });
    }
  });

  return router;
}
