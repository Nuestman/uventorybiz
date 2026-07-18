import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

/** Compliance / audit summaries: tenant admin (and super admin via impersonation) in v1. */
export const COMPLIANCE_REPORTS_ACCESS_ROLES = ["admin"] as const;

export function requireComplianceReportsAccess(storage: IStorage) {
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
          message: "Compliance reports require an organization context.",
        });
      }
      const role = user.role ?? "";
      if (!(COMPLIANCE_REPORTS_ACCESS_ROLES as readonly string[]).includes(role)) {
        return res.status(403).json({
          message: "You do not have permission to access compliance reports.",
        });
      }
      req.user = user as any;
      next();
    } catch (error) {
      console.error("Error in requireComplianceReportsAccess:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}
