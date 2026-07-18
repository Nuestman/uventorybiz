# OIDC login (Google + Microsoft) — implementation plan

**Overview:** Add OpenID Connect sign-in for Google and Microsoft using `openid-client`, reusing the existing `sessionToken` / `user_sessions` model. Unknown identities are denied (invite-only): OAuth succeeds only when a matching user already exists, with optional first-time linking by verified email and stable `iss` + `sub` stored on the user row.

## Status (4.19.0+)

- **Shipped in codebase:** Google + Microsoft routes, `completeOidcLogin`, DB columns, Auth UI, `.env.example` / `env.ts`.
- **Google:** Operational when OAuth client ID/secret and redirect URIs match `{FRONTEND_URL}/api/auth/oidc/google/callback` (configured in **Google Cloud Console**).
- **Microsoft:** **Validated locally** with a **personal Microsoft account** (MSA) using Entra **`signInAudience`** that includes personal accounts, **`MICROSOFT_OIDC_TENANT=common`**, manifest **`api.requestedAccessTokenVersion: 2`**, and redirect URI **`{FRONTEND_URL}/api/auth/oidc/microsoft/callback`** registered in **Entra** (not the Google callback path). Production/staging: register the same **microsoft** callback for each origin (e.g. `https://mineaidhms.com/.../microsoft/callback`). **Enterprise tenants** may still require **admin consent** or stricter policies; work/school-only setups use **`organizations`** (or a tenant GUID) instead of `common`.

### Redirect URI pitfall (Microsoft)

**Entra must list the Microsoft callback, not the Google one.** If you only register `.../api/auth/oidc/google/callback` in Azure, Microsoft sign-in fails with `invalid_request` / redirect_uri mismatch. Add the same origins with **`/api/auth/oidc/microsoft/callback`**. Google credentials are configured in **Google Cloud Console**; those `.../google/callback` URIs do not fix Microsoft login in Entra.

---

## Product rule (confirmed)

- **No JIT provisioning:** If OIDC completes but there is **no** existing MineAid user to attach (no row matched by `issuer` + `sub`, and no eligible row by email — see below), redirect back to `/auth` with an error (e.g. `oidc_no_account`).
- **Existing users only:** Admins continue to invite/register users; those users may then sign in with Microsoft/Google.

---

## Architecture

```mermaid
sequenceDiagram
  participant Browser
  participant Express
  participant IdP as Google_or_Entra
  participant DB as Postgres

  Browser->>Express: GET /api/auth/oidc/google/start
  Express->>Express: state, nonce, PKCE in express-session
  Express->>Browser: 302 to IdP authorize URL
  Browser->>IdP: login and consent
  IdP->>Browser: 302 to /api/auth/oidc/google/callback?code=...
  Browser->>Express: GET callback
  Express->>IdP: code exchange + validate ID token
  Express->>DB: find user by iss+sub or link by email
  alt no matching user
    Express->>Browser: 302 /auth?error=oidc_no_account
  else success
    Express->>DB: createUserSession (same as password login)
    Express->>Browser: Set-Cookie sessionToken; 302 to app home
  end
```

Reuse the same session creation path as password login in `server/modules/auth/auth.service.ts` and `staffAuth.service.ts` (`generateToken`, `createUserSession`, `updateUserLastLogin`, same `redirectTo` rules as `loginUser`).

---

## Database

- Add nullable columns on `shared/schema.ts` `users` table (with a new SQL migration under `migrations/`):
  - `oauth_issuer` (text/varchar) — OIDC `iss` claim
  - `oauth_sub` (text/varchar) — OIDC `sub` claim
- Add a **unique constraint** on `(oauth_issuer, oauth_sub)` where both are non-null (partial unique index in Postgres), so one external identity maps to at most one user.
- Optional index on `oauth_issuer` for lookups.

---

## Backend implementation

1. **Dependency:** Add **`openid-client`** (and types if needed). Prefer this over wiring Passport from scratch; the repo lists `passport` but it is **not** used in application code today — avoid adding a second auth stack unless explicitly desired.

2. **Config** (`server/config/env.ts` + `.env.example`):
   - **Google:** `GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET` (optional: only enable Google routes if both set).
   - **Microsoft (Entra):** `MICROSOFT_OIDC_CLIENT_ID`, `MICROSOFT_OIDC_CLIENT_SECRET`, `MICROSOFT_OIDC_TENANT` (e.g. `organizations`, a specific tenant GUID, or `common` — document tradeoffs; default recommendation for B2B: `organizations` or customer tenant ID).
   - **Redirect base:** derive callback URLs from existing `FRONTEND_URL` (same origin as API in this app, e.g. `http://localhost:17009`), e.g. `{FRONTEND_URL}/api/auth/oidc/google/callback` and `{FRONTEND_URL}/api/auth/oidc/microsoft/callback`. Register these exact URLs in Google Cloud Console and Azure App Registration.

3. **OIDC clients** (new module, e.g. `server/modules/auth/oidc.service.ts`):
   - **Google:** `Issuer.discover('https://accounts.google.com')` then instantiate `Client` with `client_id` / `secret`, `redirect_uris`.
   - **Microsoft:** `Issuer.discover(\`https://login.microsoftonline.com/${tenant}/v2.0\`)` then same pattern.
   - Scopes: `openid profile email` (ensure `email` claim available for matching).

4. **Routes** (extend `server/modules/auth/auth.routes.ts` or add `oidc.routes.ts` mounted from the same auth router):
   - `GET /auth/oidc/google/start` → build authorization URL with **state**, **nonce**, **PKCE**; store verifier/state/nonce in **`express-session`** (already applied in `server/routes.ts`); redirect.
   - `GET /auth/oidc/google/callback` → `client.callback()`, validate `TokenSet`, read claims (`iss`, `sub`, `email`, `given_name`, `family_name`).
   - Same pair for `/auth/oidc/microsoft/...`.
   - **Important:** Mount paths under `/api` so final paths are `/api/auth/oidc/...` (consistent with `server/routes/index.ts`).

5. **User resolution** (`AuthService.completeOidcLogin` in `server/modules/auth/auth.service.ts`):
   - Normalize email from claims (lowercase trim).
   - **Lookup 1:** `WHERE oauth_issuer = iss AND oauth_sub = sub` (new storage method in `server/storage.ts`).
   - **Lookup 2** (link on first SSO): `WHERE lower(email) = normalized email` **and** user is allowed to use SSO (e.g. `authProvider` is `custom` or already `google` / `microsoft`). On first successful link, set `oauth_issuer`, `oauth_sub`, and update `authProvider` to `google` or `microsoft`.
   - **Reject** if no row: redirect `FRONTEND_URL/auth?error=oidc_no_account`.
   - **Reject** if user `status !== 'active'` or tenant inactive (mirror checks in `loginUser`).
   - **Conflict:** if `(iss, sub)` matches a different user than email (extremely rare), fail closed with `oidc_account_conflict`.

6. **Security**
   - Validate `iss` against expected issuer for that provider.
   - Use PKCE + state + nonce (library-supported checks).
   - Optional env **`OIDC_ALLOWED_EMAIL_DOMAINS`** (comma-separated): if set, require `email` claim’s domain to match one entry (defense-in-depth for multi-tenant Entra apps).

---

## Frontend

- `client/src/pages/AuthPage.tsx`: On **login** tab, add “Continue with Microsoft” / “Continue with Google” buttons (only when online) that navigate the browser to `/api/auth/oidc/microsoft/start` and `/api/auth/oidc/google/start` (use `window.location.href` so the redirect chain stays top-level).
- Read `?error=` from the query string on load and show a toast or inline alert (map `oidc_no_account`, `oidc_denied`, etc., to user-friendly copy).

---

## Registration / configuration

- Update `.env.example` with OIDC variables and short pointers to Azure / Google console setup.
- Optionally update `README.md` tech stack when OIDC is implemented.

---

## Verification

- Run `npm run check` (TypeScript).
- Manual: configure test Google + Azure app registrations; verify happy path, unknown user denial, and inactive user denial.

---

## Implementation checklist

| Step | Task |
|------|------|
| 1 | Add `users.oauth_issuer` / `users.oauth_sub` + partial unique index; export types in `shared/schema.ts` |
| 2 | Add storage: `getUserByOidcSubject(issuer, sub)`; `updateUserOidcProfile` (or equivalent) for linking |
| 3 | Implement `openid-client` Issuer/Client setup, session-backed PKCE, routes under `/api/auth/oidc/*` |
| 4 | Implement user resolution + session issuance + redirects; mirror `loginUser` guards |
| 5 | Document `GOOGLE_*`, `MICROSOFT_*`, optional `OIDC_ALLOWED_EMAIL_DOMAINS` in `.env.example` and `env.ts` |
| 6 | Add Microsoft/Google buttons + query error handling on `AuthPage` |
