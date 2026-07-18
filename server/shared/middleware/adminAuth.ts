import { Request, Response, NextFunction } from "express";
import type { IStorage } from "../../storage";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string | null;
        role?: string | null;
        tenantId?: string | null;
        status?: string | null;
        [key: string]: any;
      };
      /** Set when the session is a super-admin impersonation of a tenant user. */
      impersonatorUserId?: string | null;
      impersonator?: {
        id: string;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      };
    }
  }
}

export function requireAdminAccess(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      if (user.status !== 'active') {
        return res.status(403).json({
          message: "Account is not active. Please contact support."
        });
      }
      if (user.role === 'admin' && user.tenantId) {
        req.user = user;
        return next();
      }
      if (user.role === 'super_admin' && !user.tenantId) {
        req.user = user;
        return next();
      }
      return res.status(403).json({
        message: "Admin access required. You must have the 'admin' role within a tenant."
      });
    } catch (error) {
      console.error("Error in requireAdminAccess:", error);
      return res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}

export function requireSuperAdminAccess(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      if (user.status !== 'active') {
        return res.status(403).json({
          message: "Account is not active. Please contact support."
        });
      }
      if (user.role === 'super_admin' && !user.tenantId) {
        req.user = user;
        return next();
      }
      return res.status(403).json({
        message: "Super admin access required. This operation is restricted to platform administrators."
      });
    } catch (error) {
      console.error("Error in requireSuperAdminAccess:", error);
      return res.status(500).json({ message: "Internal server error during authorization" });
    }
  };
}

export function checkAdminStatus(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let isAdmin = false;
      let isSuperAdmin = false;
      if (req.user && req.user.id) {
        const user = await storage.getUserById(req.user.id);
        if (user && user.status === 'active') {
          if (user.role === 'admin' && user.tenantId) isAdmin = true;
          if (user.role === 'super_admin' && !user.tenantId) {
            isSuperAdmin = true;
            isAdmin = true;
          }
        }
      }
      (req as any).isAdmin = isAdmin;
      (req as any).isSuperAdmin = isSuperAdmin;
      next();
    } catch (error) {
      console.error("Error in checkAdminStatus:", error);
      (req as any).isAdmin = false;
      (req as any).isSuperAdmin = false;
      next();
    }
  };
}
