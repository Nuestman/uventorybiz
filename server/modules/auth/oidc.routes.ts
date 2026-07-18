import type { Request, Response, RequestHandler } from "express";
import { Router } from "express";
import * as oidc from "openid-client";
import type { IDToken } from "openid-client";
import type { AuthService } from "./auth.service";
import { OidcLoginError, type OidcLoginErrorCode } from "./auth.schemas";
import { env } from "../../config/env";
import { DEFAULT_TENANT_SECURITY_POLICY, staffSessionCookieMaxAgeMs } from "../../shared/sessionPolicy";
import {
  getGoogleOidcConfiguration,
  getMicrosoftOidcConfiguration,
  oauthRedirectBase,
} from "./oidc.service";

const OIDC_SCOPE = "openid email profile";

function authErrorRedirect(res: Response, code: string): void {
  res.redirect(`${oauthRedirectBase()}/auth?error=${encodeURIComponent(code)}`);
}

function mapOidcLoginCode(code: OidcLoginErrorCode): string {
  switch (code) {
    case "no_account":
      return "oidc_no_account";
    case "account_conflict":
      return "oidc_account_conflict";
    case "inactive":
      return "oidc_inactive";
    case "invalid_domain":
      return "oidc_invalid_domain";
    case "no_email":
      return "oidc_no_email";
    case "tenant_inactive":
      return "oidc_tenant_inactive";
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

function setSessionCookie(res: Response, sessionToken: string, sessionMaxAgeMs?: number): void {
  res.cookie("sessionToken", sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: sessionMaxAgeMs ?? staffSessionCookieMaxAgeMs(DEFAULT_TENANT_SECURITY_POLICY),
  });
}

function redirectMfaChallenge(res: Response, kind: "mfa" | "setup", token: string): void {
  const param = kind === "mfa" ? "mfaChallenge" : "mfaSetup";
  res.redirect(`${oauthRedirectBase()}/auth?${param}=${encodeURIComponent(token)}`);
}

function callbackUrl(req: Request): URL {
  const host = req.get("host") || "localhost";
  const proto = req.protocol || "http";
  return new URL(req.originalUrl, `${proto}://${host}/`);
}

function readIdTokenClaims(claims: IDToken | undefined): {
  iss: string;
  sub: string;
  email?: string;
  preferred_username?: string;
} | null {
  if (!claims || typeof claims !== "object") return null;
  const rec = claims as Record<string, unknown>;
  const iss = typeof rec.iss === "string" ? rec.iss : undefined;
  const sub = typeof rec.sub === "string" ? rec.sub : undefined;
  if (!iss || !sub) return null;
  return {
    iss,
    sub,
    email: typeof rec.email === "string" ? rec.email : undefined,
    preferred_username: typeof rec.preferred_username === "string" ? rec.preferred_username : undefined,
  };
}

export function createOidcRouter(authService: AuthService): Router {
  const router = Router();

  const googleStart: RequestHandler = async (req, res, next) => {
    const clientId = env.GOOGLE_OIDC_CLIENT_ID;
    const clientSecret = env.GOOGLE_OIDC_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(503).send("Google sign-in is not configured.");
    }
    try {
      const config = await getGoogleOidcConfiguration(clientId, clientSecret);
      const codeVerifier = oidc.randomPKCECodeVerifier();
      const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      req.session.oidc = req.session.oidc ?? {};
      req.session.oidc.google = { codeVerifier, state, nonce };

      const redirectUri = `${oauthRedirectBase()}/api/auth/oidc/google/callback`;
      const redirectTo = oidc.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: OIDC_SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        nonce,
      });

      req.session.save((err) => {
        if (err) return next(err);
        res.redirect(redirectTo.href);
      });
    } catch (e) {
      next(e);
    }
  };

  const googleCallback: RequestHandler = async (req, res, next) => {
    const q = req.query as Record<string, string | undefined>;
    if (q.error) {
      const code = q.error === "access_denied" ? "oidc_denied" : "oidc_failed";
      return authErrorRedirect(res, code);
    }
    const clientId = env.GOOGLE_OIDC_CLIENT_ID;
    const clientSecret = env.GOOGLE_OIDC_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return authErrorRedirect(res, "oidc_not_configured");
    }
    const stored = req.session.oidc?.google;
    if (!stored) {
      return authErrorRedirect(res, "oidc_session_expired");
    }
    try {
      const config = await getGoogleOidcConfiguration(clientId, clientSecret);
      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl(req), {
        pkceCodeVerifier: stored.codeVerifier,
        expectedState: stored.state,
        expectedNonce: stored.nonce,
      });
      delete req.session.oidc?.google;
      if (req.session.oidc && Object.keys(req.session.oidc).length === 0) {
        delete req.session.oidc;
      }

      const parsed = readIdTokenClaims(tokens.claims());
      if (!parsed) {
        return authErrorRedirect(res, "oidc_invalid_token");
      }

      const result = await authService.completeOidcLogin({
        issuer: parsed.iss,
        sub: parsed.sub,
        email: parsed.email,
        preferredUsername: parsed.preferred_username,
        provider: "google",
      });
      if (result.kind === "mfa") {
        return redirectMfaChallenge(res, "mfa", result.mfaChallengeToken);
      }
      if (result.kind === "setup") {
        return redirectMfaChallenge(res, "setup", result.setupToken);
      }
      setSessionCookie(res, result.sessionToken, result.sessionMaxAgeMs);
      req.session.save((err) => {
        if (err) return next(err);
        res.redirect(`${oauthRedirectBase()}${result.redirectTo}`);
      });
    } catch (e) {
      if (e instanceof OidcLoginError) {
        return authErrorRedirect(res, mapOidcLoginCode(e.code));
      }
      console.error("OIDC Google callback error:", e);
      return authErrorRedirect(res, "oidc_failed");
    }
  };

  const microsoftStart: RequestHandler = async (req, res, next) => {
    const clientId = env.MICROSOFT_OIDC_CLIENT_ID;
    const clientSecret = env.MICROSOFT_OIDC_CLIENT_SECRET;
    const tenant = env.MICROSOFT_OIDC_TENANT;
    if (!clientId || !clientSecret || !tenant) {
      return res.status(503).send("Microsoft sign-in is not configured.");
    }
    try {
      const config = await getMicrosoftOidcConfiguration(tenant, clientId, clientSecret);
      const codeVerifier = oidc.randomPKCECodeVerifier();
      const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      req.session.oidc = req.session.oidc ?? {};
      req.session.oidc.microsoft = { codeVerifier, state, nonce };

      const redirectUri = `${oauthRedirectBase()}/api/auth/oidc/microsoft/callback`;
      const redirectTo = oidc.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: OIDC_SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        nonce,
      });

      req.session.save((err) => {
        if (err) return next(err);
        res.redirect(redirectTo.href);
      });
    } catch (e) {
      next(e);
    }
  };

  const microsoftCallback: RequestHandler = async (req, res, next) => {
    const q = req.query as Record<string, string | undefined>;
    if (q.error) {
      const code = q.error === "access_denied" ? "oidc_denied" : "oidc_failed";
      return authErrorRedirect(res, code);
    }
    const clientId = env.MICROSOFT_OIDC_CLIENT_ID;
    const clientSecret = env.MICROSOFT_OIDC_CLIENT_SECRET;
    const tenant = env.MICROSOFT_OIDC_TENANT;
    if (!clientId || !clientSecret || !tenant) {
      return authErrorRedirect(res, "oidc_not_configured");
    }
    const stored = req.session.oidc?.microsoft;
    if (!stored) {
      return authErrorRedirect(res, "oidc_session_expired");
    }
    try {
      const config = await getMicrosoftOidcConfiguration(tenant, clientId, clientSecret);
      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl(req), {
        pkceCodeVerifier: stored.codeVerifier,
        expectedState: stored.state,
        expectedNonce: stored.nonce,
      });
      delete req.session.oidc?.microsoft;
      if (req.session.oidc && Object.keys(req.session.oidc).length === 0) {
        delete req.session.oidc;
      }

      const parsed = readIdTokenClaims(tokens.claims());
      if (!parsed) {
        return authErrorRedirect(res, "oidc_invalid_token");
      }

      const result = await authService.completeOidcLogin({
        issuer: parsed.iss,
        sub: parsed.sub,
        email: parsed.email,
        preferredUsername: parsed.preferred_username,
        provider: "microsoft",
      });
      if (result.kind === "mfa") {
        return redirectMfaChallenge(res, "mfa", result.mfaChallengeToken);
      }
      if (result.kind === "setup") {
        return redirectMfaChallenge(res, "setup", result.setupToken);
      }
      setSessionCookie(res, result.sessionToken, result.sessionMaxAgeMs);
      req.session.save((err) => {
        if (err) return next(err);
        res.redirect(`${oauthRedirectBase()}${result.redirectTo}`);
      });
    } catch (e) {
      if (e instanceof OidcLoginError) {
        return authErrorRedirect(res, mapOidcLoginCode(e.code));
      }
      console.error("OIDC Microsoft callback error:", e);
      return authErrorRedirect(res, "oidc_failed");
    }
  };

  router.get("/auth/oidc/google/start", googleStart);
  router.get("/auth/oidc/google/callback", googleCallback);
  router.get("/auth/oidc/microsoft/start", microsoftStart);
  router.get("/auth/oidc/microsoft/callback", microsoftCallback);

  return router;
}
