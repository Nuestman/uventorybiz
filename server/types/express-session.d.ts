import "express-session";

declare module "express-session" {
  interface SessionData {
    oidc?: {
      google?: { codeVerifier: string; state: string; nonce: string };
      microsoft?: { codeVerifier: string; state: string; nonce: string };
    };
  }
}
