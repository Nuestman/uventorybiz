import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import type { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.schemas";
import { createAuthController } from "./auth.controller";
import { createMfaController } from "./mfa.controller";
import { createOidcRouter } from "./oidc.routes";
import { peekStaffSessionTiming } from "./staffAuth.service";
import { staffSessionCookieMaxAgeMs } from "../../shared/sessionPolicy";
import { DEFAULT_TENANT_SECURITY_POLICY } from "../../shared/sessionPolicy";
import { logError } from "../../logger";
import { isTransientDbError } from "../../shared/dbErrors";

export interface AuthRoutesDeps {
  authService: AuthService;
  authMiddleware: RequestHandler;
  checkAdmin: RequestHandler;
  upload: Multer;
}

function getSessionToken(req: any): string | undefined {
  return req.headers.authorization?.replace("Bearer ", "") || req.cookies?.sessionToken;
}

/**
 * Create the auth router. Mount at /api.
 * Routes: register, login, verify-email, forgot-password, reset-password, logout,
 * select-location, switch-location, current-session, user, profile (PUT),
 * activation-details, complete-activation, confirm-account
 */
export function createAuthRouter(deps: AuthRoutesDeps): Router {
  const { authService, authMiddleware, checkAdmin, upload } = deps;
  const router = Router();
  const controller = createAuthController(storage, authService);
  const mfaController = createMfaController(storage, authService);

  function setStaffSessionCookie(res: any, sessionToken: string, sessionMaxAgeMs?: number) {
    res.cookie("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: sessionMaxAgeMs ?? staffSessionCookieMaxAgeMs(DEFAULT_TENANT_SECURITY_POLICY),
    });
  }

  router.post("/auth/register", validateBody(registerSchema), async (req, res) => {
    const result = await controller.register(req.body as z.infer<typeof registerSchema>);
    if (!result.ok) return sendError(res, 400, result.error);
    res.status(201).json(result.data);
  });

  router.post("/auth/login", validateBody(loginSchema), async (req, res) => {
    const result = await controller.login(req.body as z.infer<typeof loginSchema>);
    if (!result.ok) return sendError(res, 401, result.error);
    const data = result.data as Record<string, unknown>;
    if (data.requiresMfa || data.requiresMfaSetup) {
      return res.json(data);
    }
    setStaffSessionCookie(res, data.sessionToken as string, data.sessionMaxAgeMs as number | undefined);
    res.json(data);
  });

  router.post("/auth/mfa/verify-login", async (req, res) => {
    const { challengeToken, code } = req.body ?? {};
    if (!challengeToken || !code) return sendError(res, 400, "Challenge token and code required");
    const result = await mfaController.verifyLogin(String(challengeToken), String(code));
    if (!result.ok) return sendError(res, 401, result.error);
    setStaffSessionCookie(res, result.data.sessionToken, result.data.sessionMaxAgeMs);
    res.json(result.data);
  });

  router.get("/auth/mfa/status", authMiddleware, async (req: any, res) => {
    const result = await mfaController.getStatus(req.user.id);
    if (!result.ok) return sendError(res, 404, result.error);
    res.json(result.data);
  });

  router.post("/auth/mfa/setup", authMiddleware, async (req: any, res) => {
    const result = await mfaController.beginSetup(req.user.id);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/mfa/setup/confirm", authMiddleware, async (req: any, res) => {
    const code = req.body?.code;
    if (!code) return sendError(res, 400, "Verification code required");
    const result = await mfaController.confirmSetup(req.user.id, String(code));
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/mfa/setup-with-token", async (req, res) => {
    const { setupToken } = req.body ?? {};
    if (!setupToken) return sendError(res, 400, "Setup token required");
    const result = await mfaController.beginSetupWithToken(String(setupToken));
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/mfa/setup-with-token/confirm", async (req, res) => {
    const { setupToken, code } = req.body ?? {};
    if (!setupToken || !code) return sendError(res, 400, "Setup token and code required");
    const result = await mfaController.confirmSetupWithToken(String(setupToken), String(code));
    if (!result.ok) return sendError(res, 400, result.error);
    setStaffSessionCookie(res, result.data.sessionToken, result.data.sessionMaxAgeMs);
    res.json(result.data);
  });

  router.post("/auth/mfa/disable", authMiddleware, async (req: any, res) => {
    const { password, code } = req.body ?? {};
    if (!password || !code) return sendError(res, 400, "Password and authentication code required");
    const result = await mfaController.disable(req.user.id, String(password), String(code));
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/verify-email", validateBody(verifyEmailSchema), async (req, res) => {
    const result = await controller.verifyEmail(req.body as z.infer<typeof verifyEmailSchema>);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
    const result = await controller.forgotPassword(req.body as z.infer<typeof forgotPasswordSchema>);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/auth/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
    const result = await controller.resetPassword(req.body as z.infer<typeof resetPasswordSchema>);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/change-password", authMiddleware, validateBody(changePasswordSchema), async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 401, "User not authenticated");
    const result = await controller.changePassword(userId, req.body as z.infer<typeof changePasswordSchema>);
    if (!result.ok) return sendError(res, 400, result.error);
    res.json(result.data);
  });

  router.post("/auth/logout", async (req, res) => {
    const sessionToken = getSessionToken(req);
    const result = await controller.logout(sessionToken);
    res.clearCookie("sessionToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    res.clearCookie("connect.sid", { path: "/" });
    res.json(result.data);
  });

  router.post("/auth/select-location", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { locationId, reason } = req.body;
    if (!locationId) return sendError(res, 400, "Location ID is required");
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    const result = await controller.selectLocation({
      tenantId,
      userId: req.user?.id,
      locationId,
      reason,
      sessionToken,
      performedBy: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : undefined,
    });
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.error.includes("active") ? 400 : 500, result.error);
    res.json(result.data);
  });

  router.post("/auth/switch-location", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { newLocationId, reason } = req.body;
    if (!newLocationId) return sendError(res, 400, "New location ID is required");
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    const result = await controller.switchLocation({
      tenantId,
      userId: req.user?.id,
      newLocationId,
      reason,
      sessionToken,
      performedBy: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : undefined,
    });
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.error.includes("active") ? 400 : 500, result.error);
    res.json(result.data);
  });

  router.get("/auth/current-session", authMiddleware, async (req: any, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    const result = await controller.getCurrentSession(sessionToken, req.user);
    if (!result.ok) return sendError(res, result.code === "UNAUTHORIZED" ? 401 : 500, result.error);
    res.json(result.data);
  });

  /** Read-only session expiry timing (does not extend the session). */
  router.get("/auth/session-timing", async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    try {
      const timing = await peekStaffSessionTiming(storage, sessionToken);
      if (!timing) return sendError(res, 401, "Invalid or expired session");
      res.json(timing);
    } catch (err) {
      logError("Staff session timing failed", err);
      if (isTransientDbError(err)) {
        return sendError(res, 503, "Session check temporarily unavailable");
      }
      return sendError(res, 500, "Session check failed");
    }
  });

  /** Extends staff session idle timer; returns refreshed timing. */
  router.post("/auth/session-keepalive", authMiddleware, async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return sendError(res, 401, "No active session");
    try {
      const timing = await peekStaffSessionTiming(storage, sessionToken);
      if (!timing) return sendError(res, 401, "Invalid or expired session");
      res.json({ ok: true, ...timing });
    } catch (err) {
      logError("Staff session keepalive failed", err);
      if (isTransientDbError(err)) {
        return sendError(res, 503, "Session check temporarily unavailable");
      }
      return sendError(res, 500, "Session check failed");
    }
  });

  router.get("/auth/user", authMiddleware, checkAdmin, async (req: any, res) => {
    const user = req.user;
    if (!user) return sendError(res, 404, "User not found");
    res.json({
      ...user,
      isAdmin: (req as any).isAdmin || false,
      isSuperAdmin: (req as any).isSuperAdmin || false,
      impersonator: req.impersonator ?? null,
    });
  });

  router.put("/profile", authMiddleware, upload.single("profileImage"), async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 401, "User not authenticated");
    const { firstName, lastName, email, phone, bio } = req.body;
    let profileImageUrl: string | undefined;
    if (req.file) profileImageUrl = `/public/profiles/${req.file.filename}`;
    const result = await controller.updateProfile(userId, {
      firstName,
      lastName,
      email,
      phone,
      bio,
      ...(profileImageUrl && { profileImageUrl }),
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/auth/activation-details", async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).json({ success: false, message: "Missing verification token" });
    const result = await controller.getActivationDetails(token as string);
    if (!result.ok) return res.status(400).json({ success: false, message: result.error });
    res.json(result.data);
  });

  router.post("/auth/complete-activation", async (req, res) => {
    const { token, firstName, lastName, phoneNumber, password } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Missing verification token" });
    const result = await controller.completeActivation({ token, firstName, lastName, phoneNumber, password });
    if (!result.ok) return res.status(result.code === "FORBIDDEN" ? 403 : 400).json({ success: false, message: result.error });
    res.json(result.data);
  });

  router.get("/auth/confirm-account", async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).send("Missing verification token");
    const result = await controller.confirmAccount(token as string);
    if (!result.ok) return res.status(400).send(result.error);
    res.redirect(`/activate?token=${result.data.redirectToken}`);
  });

  router.use(createOidcRouter(authService));

  return router;
}
