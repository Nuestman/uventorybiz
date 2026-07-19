# Session Security & Tenant MFA

**Version:** 1.2.0  
**Status:** Implemented  
**Last Updated:** May 31, 2026  
**Related:** [AUTH_SYSTEM.md](./AUTH_SYSTEM.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

## Overview

MineAid separates **staff** sessions (`sessionToken` cookie) from **patient portal** sessions (`portalSessionToken` cookie). Each tenant can configure session timeouts and optionally require **TOTP MFA** for staff accounts.

## Defaults (when tenant has no custom row)

| Setting | Staff HMS | Patient portal |
|--------|-----------|----------------|
| Absolute session lifetime | **24 hours** from login | **14 days** from session creation |
| Idle timeout | **30 minutes** without API activity (togglable) | **60 minutes** without API activity (togglable) |
| Sliding renewal | No (fixed absolute expiry) | Yes — each request extends expiry up to **7 days** ahead, capped by absolute max |
| Expiry warning | **3 minutes** before logout (configurable per tenant) | Same tenant setting |
| Magic link (portal only) | — | **15 minutes**, single-use (unchanged) |

## Enforcement

- **Server-side only** — idle and absolute limits are checked on every authenticated API request.
- Expired sessions are deleted and cookies cleared on the next failed request (401).
- Staff cookie `maxAge` is set at login to match the session absolute lifetime.
- Portal cookie `maxAge` matches the current session `expires` (updated on sliding refresh).

## Expiry warning dialog

Before a session ends, users see a modal countdown so they can extend or sign out gracefully.

- Configured per tenant under **Settings → Security → Expiry warning (minutes before logout)** (default **3**, range 1–60).
- Must be **less than both** staff and portal idle timeouts.
- Applies to **staff HMS** and the **patient portal** using the same tenant value.
- The dialog appears when remaining time is within the configured lead window.
- **Stay signed in** calls a keepalive endpoint and resets the idle timer.
- Timing polls use read-only endpoints that do not extend the session (so idle countdown stays accurate).
- **Polling is visibility-aware and lazy:** hidden tabs do not poll (a fresh check runs on tab return); visible tabs count down locally and resume 30s polls only as the warning window approaches. Before declaring expiry from stale timing, the client re-confirms with the server — covers sessions extended from another tab. Keeps idle open tabs from generating DB traffic (Neon scale-to-zero).
- **Circular countdown ring** depletes as time runs out (color shifts amber → orange → red in the final minute).
- When the timer reaches zero, the modal switches to a **Session ended** state (blocking overlay, no dismiss) with **Sign in again**; server logout is called in the background.
- **Stay signed in** resets the idle timer via keepalive and closes the warning.

### MFA login UX

- Authentication code field **auto-focuses** when the verify/setup step appears.
- **Auto-submits when the 6th digit is entered** (no Enter key required); invalid codes clear the field for retry.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/session-timing` | Staff session expiry timing (read-only) |
| POST | `/api/auth/session-keepalive` | Extend staff session idle timer |
| GET | `/api/portal/auth/session-timing` | Portal session expiry timing (read-only) |
| POST | `/api/portal/auth/session-keepalive` | Extend portal session idle timer |

## Tenant security settings

Stored in `tenant_security_settings` (one row per tenant). Admins configure under **Settings → Security**.

| Field | Description |
|-------|-------------|
| `staff_session_absolute_hours` | Max staff session length (1–168) |
| `staff_session_idle_minutes` | Staff idle logout (5–480) |
| `portal_session_absolute_days` | Max portal session from creation (1–90) |
| `portal_session_idle_minutes` | Portal idle logout (5–1440) |
| `portal_session_sliding_days` | Portal sliding extension per activity (1–30) |
| `session_warning_lead_minutes` | Minutes before logout to show countdown warning (1–60; must be &lt; shortest idle timeout when idle is on) |
| `idle_timeout_enabled` | When `false`, idle logout is off for staff and portal; absolute max session still applies |
| `require_mfa` | When `true`, all tenant staff must enroll TOTP before full access |

Super admins (`tenantId = null`) use platform defaults and are not subject to tenant MFA policy.

## Staff MFA (TOTP)

- **Optional per tenant** via `require_mfa`. When `require_mfa` is **false**, sign-in does **not** ask for an authenticator code (even if a user previously enrolled MFA in Profile).
- Users enroll under **Profile → Two-factor authentication** (or forced setup after login when tenant MFA is required).
- Compatible with standard authenticator apps (Google Authenticator, Authy, Microsoft Authenticator).
- **Backup codes** generated at enrollment (one-time display).
- Login flow when MFA applies:
  1. `POST /api/auth/login` → `{ requiresMfa: true, mfaChallengeToken }` or `{ requiresMfaSetup: true, setupToken }`
  2. `POST /api/auth/mfa/verify-login` with TOTP code → full session
  3. Setup: `POST /api/auth/mfa/setup` → QR secret; `POST /api/auth/mfa/setup/confirm` → enables MFA

OIDC (Google/Microsoft) logins follow the same MFA rules after identity is verified.

## Step-up (portal)

Portal password change requires the current password (existing behavior). Staff password change requires current password. Sensitive staff admin actions continue to use role checks; optional step-up MFA can be added in a future phase.

## API summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/security-settings` | Tenant session + MFA policy (admin) |
| PUT | `/api/admin/security-settings` | Update tenant policy (admin) |
| POST | `/api/auth/mfa/setup` | Start MFA enrollment (authenticated or setup token) |
| POST | `/api/auth/mfa/setup/confirm` | Confirm TOTP and enable MFA |
| POST | `/api/auth/mfa/verify-login` | Complete login after password |
| POST | `/api/auth/mfa/disable` | Disable MFA (password + TOTP required) |
| GET | `/api/auth/mfa/status` | Current user MFA status |

## Migration

Apply `migrations/20260531_session_security_and_mfa.sql` and `migrations/20260531_session_warning_lead.sql`.

## Document history

| Version | Date | Notes |
|---------|------|-------|
| 1.3.0 | 2026-07-14 | Visibility-aware, lazy session-timing polling |
| 1.2.0 | 2026-05-31 | Circular countdown, blocking session-ended modal, MFA auto-submit UX |
| 1.1.0 | 2026-05-31 | Configurable expiry warning + countdown dialog |
| 1.0.0 | 2026-05-31 | Initial session policies + tenant MFA |
