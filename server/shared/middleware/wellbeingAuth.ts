import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

const WELLBEING_READ_ROLES = ["staff", "operations", "admin"];
const WELLBEING_WRITE_ROLES = ["staff", "admin"];

/**
 * Allow access to employee wellbeing read operations: staff, operations, admin.
 */
export function requireWellbeingRead(storage: IStorage) {
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
          message: "Wellbeing access requires a tenant association.",
        });
      }
      const role = user.role ?? "";
      if (!WELLBEING_READ_ROLES.includes(role)) {
        return res.status(403).json({
          message: "You do not have permission to access employee wellbeing data.",
        });
      }
      req.user = user as any;
      next();
    } catch (error) {
      console.error("Error in requireWellbeingRead:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

/**
 * Allow access to employee wellbeing write operations: staff, admin only.
 */
export function requireWellbeingWrite(storage: IStorage) {
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
          message: "Wellbeing access requires a tenant association.",
        });
      }
      const role = user.role ?? "";
      if (!WELLBEING_WRITE_ROLES.includes(role)) {
        return res.status(403).json({
          message: "You do not have permission to modify employee wellbeing data.",
        });
      }
      req.user = user as any;
      next();
    } catch (error) {
      console.error("Error in requireWellbeingWrite:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}
