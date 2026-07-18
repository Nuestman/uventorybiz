import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

export const INCIDENT_REPORTS_ACCESS_ROLES = ["staff", "admin", "operations"] as const;

/**
 * Require tenant-bound user with staff, admin, or operations (or super_admin).
 * Broader than `requireStaffAccess` so operations leadership can use `/reports/incidents` without PHI APIs.
 */
export function requireIncidentReportsAccess(storage: IStorage) {
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
        req.user = user;
        return next();
      }
      if (!user.tenantId) {
        return res.status(403).json({
          message: "Incident reports require a tenant association.",
        });
      }
      const role = user.role ?? "";
      if (!(INCIDENT_REPORTS_ACCESS_ROLES as readonly string[]).includes(role)) {
        return res.status(403).json({
          message: "You do not have permission to access incident reports.",
        });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("Error in requireIncidentReportsAccess:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}
