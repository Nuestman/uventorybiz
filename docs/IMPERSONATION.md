# Support impersonation (super admin)

Platform super administrators can **impersonate** an active tenant user to reproduce issues and assist with support. Impersonation is explicit, time-bounded in practice by session, and **fully audited** at both the tenant and platform level.

## Who may use it

- Users with role `super_admin` and **no** `tenantId` (global operator accounts).
- Impersonation **cannot** be started while already in an impersonation session.
- **Targets** must be tenant-bound users (`tenantId` set), `status = active`, not `super_admin`, and their organisation (tenant) must be `active`.

## What the user sees

- After starting impersonation, the browser session acts as the **target user**: permissions, tenant scope, and navigation match that user’s role (for example tenant admin vs medical staff).
- A **banner** appears in the main app layout explaining support mode, naming the **platform operator** (the super admin) and the **effective user** (the tenant account). The tenant user’s normal permissions apply; the operator does not gain extra clinical rights beyond what the target user has.
- Super-admin-only routes (for example `/super-admin/*` APIs and console pages) are **not** available while impersonating, because the authenticated identity is the tenant user.

## How to start and end

### Start (UI)

1. Sign in as a platform super admin.
2. Open **Super admin → All users** (hash tab `#users` on `/super-admin`).
3. For an **active** user row, use the **impersonate** control (user icon). The app redirects to the tenant experience (typically `/dashboard`, or `/operational-duties` for safety officer targets).

### Start (API)

`POST /api/super-admin/impersonation/start`  
Body: `{ "targetUserId": "<user id>" }`  
Requires: authenticated super-admin session **without** an existing impersonation.

### End

- **UI:** Use **Exit impersonation** on the support banner.  
- **API:** `POST /api/super-admin/impersonation/end`  
  Allowed when the current session is an impersonation session (does not require the super-admin-only guard; the session row carries `impersonator_user_id`).

Ending restores the session to the platform super admin and redirects to `/super-admin/dashboard`.

### Logout while impersonating

If the operator logs out while impersonating, the session is destroyed and an **end** event is recorded (reason aligned with session deletion), with tenant audit where applicable.

## Audit and logging

### Platform table: `impersonation_events`

Append-only rows for:

- **start** — super admin begins acting as the target.
- **end** — explicit end, or session ended while impersonating (for example logout).

Stored fields include: operator id, target user id, target tenant id, action, optional reason, first characters of the session token for correlation, client IP, user agent, optional JSON `details`, and timestamp.

Super admins can review these in the console: **System → Impersonation log** (`/super-admin/impersonation-log`). The UI calls `GET /api/super-admin/impersonation-events` (up to 500 recent rows, enriched with names).

### CRUD actions for one session (modal)

On each **start** or **end** session row, **View CRUD** opens a modal that loads tenant audit entries **only for that impersonation window**:

- **API:** `GET /api/super-admin/impersonation-events/:eventId/audit-logs` (super admin only).
- **Window:** If the row is **start**, the window runs from that timestamp to the next **end** for the same operator, target user, and (when present) session token prefix—or **now** if the session is still active. If the row is **end**, the window runs from the matching **start** to that end time.
- **Query:** Rows from **`audit_logs`** for that tenant and effective user, with `details.impersonation.impersonatorUserId` set to the platform operator, and `created_at` inside the window.

### Global CRUD list (optional)

`GET /api/super-admin/impersonation-audit-logs` returns up to 500 recent **`audit_logs`** rows with impersonation metadata across all tenants (used if you build a global table elsewhere).

Not every code path may attach impersonation metadata; rows are only included when the audit pipeline merged `details.impersonation` for that request.

### Tenant audit log (`audit_logs`)

When impersonation **starts** or **ends**, a tenant-scoped admin audit entry is written for the **target tenant** (actions such as `admin_impersonation_start` / `admin_impersonation_end`).

### Ongoing actions while impersonating

During impersonation, routine audit helpers attach **`details.impersonation.impersonatorUserId`** (the platform operator’s user id) so tenant audit entries show that changes were performed under support impersonation. This uses request-scoped context (`AsyncLocalStorage`) set by the auth middleware.

## Data model (summary)

- **`user_sessions`**: `impersonator_user_id`, `impersonation_started_at`. While impersonating, `user_id` is the **target** user; `impersonator_user_id` points to the super admin.
- **`impersonation_events`**: platform-level history as described above.

SQL migration: `migrations/20260404_super_admin_impersonation.sql`.

## Operational notes

- Treat super-admin accounts like **highly privileged** credentials; impersonation increases impact on tenant data—use only for legitimate support.
- The impersonation log is intended for **compliance and investigations**; access is restricted to super-admin routes.
- If you rely on external analytics, ensure they do not strip audit `details` needed to prove operator identity during support sessions.

## See also

- **[SUPER_ADMIN_SYSTEM_CONSOLE.md](./SUPER_ADMIN_SYSTEM_CONSOLE.md)** — Full **System** menu specification for the super-admin console (includes Impersonation log route and related platform pages).
