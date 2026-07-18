import { Request, Response, NextFunction } from "express";
import { auditContext } from "../../shared/auditContext";
import type { AuthService } from "./auth.service";

export function createAuthMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
        req.cookies?.sessionToken;
      if (!sessionToken) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const ctx = await authService.validateSessionForRequestWithContext(sessionToken);
      if (!ctx) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      req.user = ctx.user as Express.Request["user"];
      req.impersonatorUserId = ctx.session.impersonatorUserId ?? undefined;
      req.impersonator = ctx.impersonator
        ? {
            id: ctx.impersonator.id,
            email: ctx.impersonator.email,
            firstName: ctx.impersonator.firstName,
            lastName: ctx.impersonator.lastName,
          }
        : undefined;
      auditContext.run(
        { impersonatorUserId: ctx.session.impersonatorUserId ?? null },
        () => next()
      );
    } catch (error) {
      res.status(401).json({ message: "Authentication failed" });
    }
  };
}
