import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

/** Roles that may access patient-identifiable and staff-facing PHI APIs. Operations role is excluded. */
export const STAFF_ACCESS_ROLES = ["staff", "admin"] as const;

/** @deprecated Use STAFF_ACCESS_ROLES */
export const CLINICAL_ACCESS_ROLES = STAFF_ACCESS_ROLES;

export function hasStaffAccess(role: string | null | undefined): boolean {
  if (role == null || role === "") return false;
  if (role === "super_admin") return true;
  return (STAFF_ACCESS_ROLES as readonly string[]).includes(role);
}

/** @deprecated Use hasStaffAccess */
export const hasClinicalAccess = hasStaffAccess;

/**
 * Require staff or tenant admin for patient/clinical data. Super admins may access for support.
 * Operations users use separate modules (e.g. employee wellbeing read-only, incidents, operational duties).
 */
export function requireStaffAccess(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      if (user.status !== "active") {
        return res.status(403).json({
          message: "Account is not active. Please contact support.",
        });
      }
      if (user.role === "super_admin") {
        req.user = user as any;
        return next();
      }
      if (!user.tenantId) {
        return res.status(403).json({
          message: "Staff data access requires a tenant association.",
        });
      }
      const role = user.role ?? "";
      if (!(STAFF_ACCESS_ROLES as readonly string[]).includes(role)) {
        return res.status(403).json({
          message:
            "You do not have permission to access this data. This area is restricted to staff and administrators.",
        });
      }
      req.user = user as any;
      next();
    } catch (error) {
      console.error("Error in requireStaffAccess:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

/** @deprecated Use requireStaffAccess */
export const requireClinicalAccess = requireStaffAccess;
