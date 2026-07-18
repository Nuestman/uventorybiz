import type { RequestHandler } from "express";
import { Router } from "express";
import { createMedicalVisitsRouter } from "./medical-visits/medical-visits.routes";
import { createTriageRouter } from "./triage/triage.routes";
import { createVitalSignsRouter } from "./vital-signs/vital-signs.routes";
import { createMedicalRecordsRouter } from "./medical-records/medical-records.routes";

export interface ClinicalRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

/**
 * Clinical (medical) feature router: visits, records, triage (SATS), vital signs.
 * Mount at /api. Registers: /medical-visits, /medical-records, /triage, /vital-signs.
 */
export function createClinicalRouter(deps: ClinicalRoutesDeps): Router {
  const router = Router();
  router.use(createMedicalVisitsRouter(deps));
  router.use(createTriageRouter(deps));
  router.use(createVitalSignsRouter(deps));
  router.use(
    createMedicalRecordsRouter({
      authMiddleware: deps.authMiddleware,
      requireClinicalAccess: deps.requireClinicalAccess,
    }),
  );
  return router;
}
