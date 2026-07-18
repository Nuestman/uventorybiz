import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

/** Operations reporting is admin-focused in v1, with super_admin support through impersonation. */
export const OPERATIONS_REPORTS_ACCESS_ROLES = ["admin"] as const;

export function requireOperationsReportsAccess(storage: IStorage) {
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
          message: "Operations reports require an organization context.",
        });
      }
      const role = user.role ?? "";
      if (!(OPERATIONS_REPORTS_ACCESS_ROLES as readonly string[]).includes(role)) {
        return res.status(403).json({
          message: "You do not have permission to access operations reports.",
        });
      }
      req.user = user as any;
      next();
    } catch (error) {
      console.error("Error in requireOperationsReportsAccess:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}
