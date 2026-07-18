import type { RequestHandler } from "express";
import type { IStorage } from "../../storage";

function getSessionToken(req: { headers: { authorization?: string }; cookies?: { sessionToken?: string } }): string | undefined {
  return req.headers.authorization?.replace("Bearer ", "") || req.cookies?.sessionToken;
}

/**
 * Requires an authenticated session whose row has `impersonatorUserId` set (super admin acting as a tenant user).
 * Used to end impersonation without granting super-admin API access to the impersonated identity.
 */
export function requireActiveImpersonation(storage: IStorage): RequestHandler {
  return async (req, res, next) => {
    try {
      const token = getSessionToken(req);
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const session = await storage.getUserSession(token);
      if (!session?.impersonatorUserId) {
        return res.status(403).json({ message: "Not in an impersonation session" });
      }
      const impersonator = await storage.getUserById(session.impersonatorUserId);
      if (!impersonator || impersonator.role !== "super_admin" || impersonator.tenantId) {
        return res.status(403).json({ message: "Invalid impersonation session" });
      }
      (req as { impersonationSession?: typeof session }).impersonationSession = session;
      next();
    } catch (e) {
      console.error("requireActiveImpersonation:", e);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}
