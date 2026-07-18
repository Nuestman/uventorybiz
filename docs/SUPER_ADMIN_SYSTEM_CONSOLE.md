# Super Admin — System menu (platform console)

This document specifies the **System** section of the global super-admin sidebar (`client/src/config/superAdminNav.tsx`). These routes are for **platform operators** (`role = super_admin`, no `tenantId`). Tenant-scoped admins do not see this navigation.

**Navigation label:** System  
**Base:** All routes live under `/super-admin/*` and reuse `SuperAdminLayout`.

---

## Route map

| Page | Path | Purpose (summary) |
|------|------|-------------------|
| System status | `/super-admin/system-status` | Read-only snapshot of platform health and scale (DB, process, counts). |
| Security & access | `/super-admin/security` | Operator-facing summary of security posture, policies, and links to legal/support-impersonation docs. |
| Impersonation log | `/super-admin/impersonation-log` | **Implemented.** Platform session events and optional CRUD drill-down per session. |
| Global audit log | `/super-admin/audit` | Cross-tenant view of recent `audit_logs` rows (with tenant and actor context). |
| Integrations | `/super-admin/integrations` | Which external capabilities are **configured** in this deployment (flags only; no secrets). |
| Billing & plans | `/super-admin/billing` | Plan distribution across tenants and deep link into organisation management where plans are edited. |

---

## Access control

- **Client:** Same pattern as other super-admin pages: authenticated user with `super_admin` and no `tenantId`, wrapped in `RequireRole` where applicable.
- **APIs:** All new endpoints described below must use the existing **`requireSuperAdmin`** guard (same stack as `/api/super-admin/tenants`, impersonation APIs, etc.).
- **Data:** Global views may expose tenant names and user emails that already appear elsewhere in the super-admin console; still treat responses as **operator confidential**.

---

## 1. System status

**Goal:** Give operators a quick “is the deployment alive and roughly how big is it?” view without exposing secrets.

**Suggested UI content**

- **Database:** `connected` if a trivial query succeeds; otherwise show error state (no connection string in UI).
- **Application:** Node.js version, `NODE_ENV`, process uptime (seconds or humanized), optional server-reported timestamp (UTC).
- **Scale (from DB):** Count of organisations (`tenants`), count with `status = active`, total user rows (optional breakdown: tenant-bound vs platform `super_admin` without tenant).
- **Optional:** Recent `impersonation_events` count in last 24 hours (link to Impersonation log).

**API (to implement)**

- `GET /api/super-admin/system-status`  
  **Response (conceptual):** `{ database: "ok" | "error", nodeVersion, nodeEnv, processUptimeSeconds, generatedAt, counts: { tenants, activeTenants, users, superAdminUsers }, ... }`  
  Errors should be non-throwing for scale queries where possible; if one aggregate fails, return partial data with a field-level error message.

**Non-goals**

- External uptime probes (Pingdom, etc.) unless later integrated.
- Per-tenant health.

---

## 2. Security & access

**Goal:** A **static, accurate** hub for how MineAid handles access at the platform level, with pointers to user-facing legal pages and internal operator procedures.

**Suggested UI content (no new secrets)**

- Short bullets aligned with product reality: session cookies, HTTPS in production, RBAC, tenant isolation, audit logging.
- Links (same app, public routes): `/privacy`, `/terms`, `/security`, `/legal` (legal hub).
- Link to **Impersonation log** (`/super-admin/impersonation-log`) and reference doc **[IMPERSONATION.md](./IMPERSONATION.md)** for support impersonation rules.
- Optional: link to **[RBAC.md](./RBAC.md)** for role semantics.

**API**

- None required for v1 (purely informational). If a future version surfaces “last password policy change” or similar, that would be a separate design.

---

## 3. Impersonation log (implemented)

**Behaviour and APIs** are documented in **[IMPERSONATION.md](./IMPERSONATION.md)**.

**Quick reference**

- `GET /api/super-admin/impersonation-events` — session rows (enriched).
- `GET /api/super-admin/impersonation-events/:eventId/audit-logs` — tenant `audit_logs` for the impersonation window.
- `GET /api/super-admin/impersonation-audit-logs` — optional global list of tenant audit rows that carry impersonation metadata.

The System menu should **not** duplicate “coming soon” for this item once the UI is wired.

---

## 4. Global audit log

**Goal:** A **cross-tenant** read-only tail of `audit_logs` for compliance and investigations, distinct from:

- Tenant admin **Audit trail** in the main app (tenant-scoped).
- **Impersonation log**, which focuses on platform session events and optional CRUD scoped to impersonation windows.

**Data source**

- Table **`audit_logs`** (see `shared/schema.ts`): `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `original_data`, `details`, `ip_address`, `user_agent`, `created_at`.

**Suggested UI**

- Sortable table: time (UTC), tenant name, user (email or name), action, resource type, resource id, optional JSON details (collapsed).
- Footer note: “Showing up to N recent rows” (align N with API limit, e.g. 500).
- No delete/edit.

**API (to implement)**

- `GET /api/super-admin/global-audit-logs`  
  **Response:** Array of rows with at least: audit id, `createdAt`, `tenantId`, `tenantName`, `userId`, user display fields, `action`, `resourceType`, `resourceId`, `details` (JSON), `ipAddress`, `userAgent` as available.  
  **Query:** `ORDER BY created_at DESC LIMIT 500` with joins to `tenants` and `users`.

**Performance**

- Index on `audit_logs.created_at` is recommended if this endpoint is used regularly (verify existing migrations).

**Privacy**

- This endpoint is **super-admin only**. Do not add to public or tenant-admin routes.

---

## 5. Integrations

**Goal:** Show whether this deployment is configured to talk to **email** and other optional providers, using **boolean or presence flags only** (never return API keys, tokens, or passwords).

**Sources (from environment)**

Align with **[LOCAL_DEVELOPMENT_SETUP.md](./LOCAL_DEVELOPMENT_SETUP.md)** and `.env.example`:

- **Email — Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (show “configured” if both present and non-empty; mask values).
- **Email — Gmail SMTP (dev):** `GMAIL_USER`, `GMAIL_APP_PASSWORD` (show configured / not configured).
- **SMS (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — if any are missing, show “SMS not configured”.
- **Blob storage (optional):** `BLOB_READ_WRITE_TOKEN` — configured flag only.

**Suggested UI**

- Card per integration: name, status (Configured / Not configured), one-line behaviour note (e.g. “Transactional email via Resend when credentials present”).

**API (to implement)**

- `GET /api/super-admin/integrations-status`  
  **Response:** Structured booleans/strings like `{ email: { resend: boolean, gmailSmtp: boolean }, sms: { twilio: boolean }, blob: { vercelBlob: boolean } }`.  
  Implement by reading `process.env` on the server only.

**Non-goals**

- Testing delivery from this page (no “send test email” unless product asks for it later).
- Third-party OAuth marketplace.

---

## 6. Billing & plans

**Goal:** Surface **commercial plan assignment** across organisations using data the platform already stores, and steer edits to the existing console flows.

**Data model (existing)**

- `tenants.plan_type` — default and allowed values per `shared/schema.ts` (e.g. `basic`, `premium`, `enterprise`).

**Suggested UI**

- Summary cards: number of tenants per `plan_type`, number of active tenants per plan.
- Table: tenant name, status, plan type, user count (reuse `GET /api/super-admin/tenants` payload if it already includes `userCount` and `planType`).
- Primary action: link to **`/super-admin#tenants`** (or the tenant row action) where super admins already change plans via existing APIs (e.g. plan update endpoint on super-admin router).

**API**

- Prefer **no new endpoint** if `GET /api/super-admin/tenants` is sufficient for the dashboard.
- If aggregate-by-plan is needed server-side for performance, add `GET /api/super-admin/plan-summary` returning counts only.

**Non-goals (unless product expands)**

- Stripe subscription billing, invoices, or payment methods.
- Per-seat metering.

---

## Implementation checklist (for developers)

1. **Backend:** Done — `getGlobalAuditLogs`, `pingDatabase`, `getPlatformScaleCounts` on storage; `getSystemStatus`, `listGlobalAuditLogs`, `getIntegrationsStatus` on super-admin controller; routes under `/api/super-admin/` with `requireSuperAdmin`.
2. **Frontend:** Done — dedicated pages for system status, security, global audit, integrations, billing; `App.tsx` routes wired; `comingSoon` removed from System nav items.
3. **Docs:** **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** lists the new super-admin endpoints.
4. **Tests:** Smoke-test as super admin; confirm tenant admins receive 403 on new APIs.

---

## Related documents

- [IMPERSONATION.md](./IMPERSONATION.md) — Support impersonation and audit behaviour  
- [RBAC.md](./RBAC.md) — Roles and route guards  
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — API index  
- [AUTH_SYSTEM.md](./AUTH_SYSTEM.md) — Authentication overview  
