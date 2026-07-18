import type { RequestHandler } from "express";
import { Router } from "express";
import { createOperationalDutiesRouter } from "./operational-duties/operational-duties.routes";
import { createDutyAssignmentsRouter } from "./duty-assignments/duty-assignments.routes";

export interface DutiesRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware?: RequestHandler;
}

/**
 * Duties feature router: operational duties and duty assignments/completions.
 * Mount at /api. Registers: /operational-duties, /duty-assignments.
 */
export function createDutiesRouter(deps: DutiesRoutesDeps): Router {
  const router = Router();
  router.use(createOperationalDutiesRouter(deps));
  router.use(createDutyAssignmentsRouter(deps));
  return router;
}
