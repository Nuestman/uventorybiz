import type { RequestHandler } from "express";
import { sendError } from "../errors";

/** Roles that may use the Fleet module (vehicle register, pre-start checks, unit detail). */
export const FLEET_MODULE_ROLES = ["fleet_operator", "staff", "admin", "super_admin"] as const;

/** @deprecated Use FLEET_MODULE_ROLES */
export const AMBULANCE_MODULE_ROLES = FLEET_MODULE_ROLES;

export type FleetModuleRole = (typeof FLEET_MODULE_ROLES)[number];

/** @deprecated Use FleetModuleRole */
export type AmbulanceModuleRole = FleetModuleRole;

export function requireFleetModuleAccess(): RequestHandler {
  return (req: any, res, next) => {
    if (!req.user) return sendError(res, 401, "Unauthorized");
    const tenantId = req.user.tenantId as string | null | undefined;
    const role = req.user.role as string | undefined;
    if (!tenantId) return sendError(res, 403, "Tenant association required");
    if (!role || !(FLEET_MODULE_ROLES as readonly string[]).includes(role)) {
      return sendError(res, 403, "You do not have access to the Fleet module");
    }
    next();
  };
}

/** @deprecated Use requireFleetModuleAccess */
export const requireAmbulanceModuleAccess = requireFleetModuleAccess;
