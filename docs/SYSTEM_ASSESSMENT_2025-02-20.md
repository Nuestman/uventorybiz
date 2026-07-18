# MineAid HMS – System Assessment

**Date:** 2025-02-20  
**Updated:** 2026-02-23 (shift reporting, module routes)

---

## 1. Repo and layout

- **Single full-stack app** (one root `package.json`).
- **Important dirs:**
  - **`client/`** – React + Vite frontend (`client/index.html`, `client/src/`).
  - **`server/`** – Node + Express backend (entry `server/index.ts`).
  - **`shared/`** – Shared code; main file **`shared/schema.ts`** (Drizzle schema + Zod insert schemas).
  - **`migrations/`** – SQL migrations (Drizzle output + manual scripts).
  - **`public/`** – Static assets (e.g. favicon, uploaded profiles under `public/profiles`).
  - **`docs/`** – README, CHANGELOG, implementation/deployment guides.
- **Config:** `vite.config.ts` (root `client`, build → `dist/public`, aliases `@` → `client/src`, `@shared` → `shared`), `drizzle.config.ts` (schema `./shared/schema.ts`, migrations `./drizzle`, Postgres via `DATABASE_URL` in `.env`). Scripts: `dev`/`start` → `tsx server/index.ts`, `build` → `vite build`, `db:drizzle-migrate`, `db:generate`, `db:sql-migrate`. See `docs/DRIZZLE_MIGRATIONS.md`.

---

## 2. Backend

- **Entry:** `server/index.ts` – loads `./env`, Express + cookie-parser, optional `express.static('public')`, request logging, then **`registerRoutes(app)`** from `server/routes.ts`. After routes: global error handler, then in dev `setupVite(app, server)`, in prod `serveStatic(app)`. Cron jobs started via `initializeCronJobs(storage)`. Server listens on `PORT` (default 5000).
- **Routes:** API routes are registered via **`server/routes/index.ts`** (which may delegate to module routers). Prefix **`/api`** (e.g. `/api/tenants`, `/api/auth/*`, `/api/patients`, `/api/medical-visits`, `/api/incident-reports`, `/api/notifications`, `/api/admin/*`, inventory, testing, **`/api/shift-reports`**, etc.). Domain modules live under **`server/modules/`** (e.g. `shift-reports` with controller + routes).
- **Logic:** No `controllers/` folder. Handlers in `routes.ts` call:
  - **`server/storage.ts`** – Main data layer (implements `IStorage`; Drizzle + `server/db.ts`).
  - **`server/modules/auth/auth.service.ts`** – Registration, login, tokens, email verification, forgot/reset password; **`createAuthMiddleware`** in `auth.middleware.ts` for protected routes.
  - **`server/notificationService.ts`** – `sendEmail`, `createAndSendNotifications` (used by routes, cron, triggers).
  - **`server/notificationTriggers.ts`** – `notifyIncidentCreated`, `notifyIncidentUpdated`, `notifyInventoryAlert` (called from storage and equipment/cron).
  - **`server/equipmentHealthService.ts`** – Equipment health and maintenance reminders (uses `createAndSendNotifications`).
  - **`server/adminAuth.ts`** – `requireAdminAccess`, `requireSuperAdminAccess`, `checkAdminStatus` (storage-based middleware).
- **DB:** Drizzle ORM; schema in **`shared/schema.ts`**; connection in **`server/db.ts`** (pg Pool + `env.DATABASE_URL`, `drizzle(pool, { schema })`). Works with local Postgres and Neon; `env.USING_NEON_DATABASE` derived from URL.
- **Auth/session:** **Staff auth** (email/password + optional OIDC; no Passport for main app). **`server/session.ts`** – `express-session` with `connect-pg-simple` (Postgres store, table `sessions`). `getSession()` applied in `routes.ts`. Protected routes use **`authMiddleware`**; admin routes add **`requireAdmin`** / **`requireSuperAdmin`**.

---

## 3. Frontend

- **Entry:** `client/index.html` → script to `client/src/main.tsx`; `main.tsx` mounts `<App />` and imports `index.css`. Build: Vite with React plugin.
- **Routing:** **wouter** (`Switch`, `Route`, `useLocation`). **MainLayout** (sidebar/nav + content) wraps most authenticated pages; `/docs` is protected but can have its own layout.
- **Pages (from `App.tsx`):** Landing, AuthPage, SuperAdminRegistration, ActivateAccount, Dashboard, Patients, PatientDetails, Appointments, Records, Incidents, OperationalDuties, AssignmentHistory, AuditTrail, MedicalVisit, Inventory, StockTransfers, EquipmentTracking, PurchaseOrders, Suppliers, InventoryTransactions, TransactionHistory, DrugAlcoholTesting, TestResultForm, TestScheduling, TestingReports, **Reports** (Operations → shift reports), Admin, SuperAdmin, Profile, Docs; NotFound, Unauthorized, AccessDenied.
- **Guards:** `PROTECTED_ROUTES` / `PUBLIC_ROUTES`; **`ProtectedRouteGuard`** and **`useAuth()`** cancel auth/session queries when unauthenticated on protected routes.
- **API:** **`client/src/lib/queryClient.ts`** – `apiRequest(method, url, data?)` and **`getQueryFn`** use `fetch` with `credentials: 'include'`. **TanStack Query** (`useQuery` / `useMutation`) with query keys like `["/api/auth/user"]`, `["/api/patients"]`, etc.
- **Shared types:** Frontend imports from `@shared` (Vite alias); **`shared/schema.ts`** provides Drizzle tables and Zod schemas (e.g. `insertPatientSchema`).

---

## 4. Notifications and email

- **Email sending:** **`server/notificationService.ts`** only. Nodemailer (Gmail SMTP: `GMAIL_USER`, `GMAIL_APP_PASSWORD`). `sendEmail({ to, subject, text?, html?, attachments? })`. If Gmail env is missing, it only logs (mock) and returns success. Auth-related emails (verification, password reset, invites) and notification-system emails both go through this service.
- **Flow:** No event bus. **Trigger-based:** e.g. **`server/storage.ts`** (after create/update incident or inventory alert) and **`server/equipmentHealthService.ts`** / **`server/cronJobs.ts`** call **`server/notificationTriggers.ts`** (`notifyIncidentCreated`, `notifyIncidentUpdated`, `notifyInventoryAlert`, equipment reminders), which call **`createAndSendNotifications(storage, params)`** in `notificationService.ts`. That resolves type, gets recipients from preferences, creates notification rows, sends email (and in-app), and writes delivery logs.
- **Trigger-based (no event bus):** Notifications are trigger-based: storage and cron call `notificationTriggers` / `notificationService` directly; there is no event bus. Introduce an event bus only if we need multiple subscribers or async decoupling.
- **Schema (in `shared/schema.ts`):**
  - **`notification_types`** – id, key, category, displayName, description, severitySupported, systemDefined (data-driven).
  - **`user_notification_preferences`** – Row per (tenant, user, notification_type, channel); columns include notificationTypeId, channel, enabled, minSeverity, adminManaged (row-based; no boolean columns per type).
  - **`notifications`** – Delivery/audit rows (tenantId, recipientId, senderId, notificationTypeId, channel, title, message, status, metadata, readAt, sentAt).
  - **`notification_delivery_logs`** – Per-delivery audit (notificationId, channel, provider, status, errorMessage, providerResponse).
- Recipients: **`storage.getUsersForNotificationType(tenantId, notificationTypeKey)`** uses `notification_types` and `user_notification_preferences`; fallback to tenant admins when no preferences.

---

## 5. Conventions and env

- **Naming:** TS files like `routes.ts`, `storage.ts`, `notificationService.ts`; components in `client/src/components`, pages in `client/src/pages`.
- **Types:** Centralized in **`shared/schema.ts`** (Drizzle + `createInsertSchema`). Backend and frontend import from `@shared/schema` or `@shared`.
- **Env:** **`server/env.ts`** loads `dotenv` from project root `../.env`; validates `DATABASE_URL`; sets `FRONTEND_URL` (from `FRONTEND_URL` or `RAILWAY_PUBLIC_DOMAIN`), `USING_NEON_DATABASE`, `BLOB_READ_WRITE_TOKEN`, `NODE_ENV`. No `.env.example` in repo; README/docs mention env (e.g. Gmail, DATABASE_URL).
- **Docs:** Root **README.md**; **docs/** (CHANGELOG, IMPLEMENTATION_STATUS, IMPLEMENTATION_PLAN, DEPLOYMENT_GUIDE, LOCAL_DEVELOPMENT_SETUP, API_DOCUMENTATION, etc.). **`.cursorrules`** define stack (Node, React, Tailwind, Neon, Railway, Nodemailer), event-driven notifications, centralized email, DB and notification schema rules (row-based preferences, data-driven types, no boolean channel flags).

---

## 6. Server modules (quick reference)

| File / Dir | Role |
|------------|------|
| `index.ts` | Express app, static, logging, registerRoutes, error handler, Vite/static, cron init, listen |
| `routes/index.ts` | Registers API routes (may mount module routers, e.g. shift-reports) |
| `modules/shift-reports/` | Shift reports CRUD: controller, routes (GET/POST `/api/shift-reports`, GET/PUT/DELETE `/api/shift-reports/:id`) |
| `storage.ts` | Main DB layer (IStorage); calls notification triggers |
| `db.ts` | Drizzle + pg Pool from `DATABASE_URL` |
| `env.ts` | Load .env, export env (DATABASE_URL, FRONTEND_URL, etc.) |
| `session.ts` | express-session + connect-pg-simple |
| `modules/auth/auth.service.ts` | Staff auth service (login, sessions, OIDC) |
| `modules/auth/auth.middleware.ts` | Session cookie validation (`createAuthMiddleware`) |
| `adminAuth.ts` | requireAdmin / requireSuperAdmin / checkAdminStatus |
| `notificationService.ts` | sendEmail, createAndSendNotifications, delivery logs |
| `notificationTriggers.ts` | notifyIncidentCreated/Updated, notifyInventoryAlert |
| `equipmentHealthService.ts` | Equipment health + maintenance reminders |
| `cronJobs.ts` | Scheduled jobs (e.g. maintenance reminders) |
| `emailTemplates.ts` | HTML/text templates for emails |
| `fileStorage.ts` | File storage (e.g. incident docs, tenant paths) |
| `vercelBlobStorage.ts` | Optional Vercel Blob integration |
| `locationMiddleware.ts` | injectLocationMiddleware, requireLocationMiddleware |
| `logger.ts` | logDebug, logInfo, logError, sanitizeForLogging |
| `vite.ts` | setupVite, serveStatic for dev/prod |

---

## 7. Rules to follow (from `.cursorrules`)

- Business logic must not send email directly; notifications are trigger-driven; all email via centralized service; notification logic in a dedicated module.
- DB: PostgreSQL-compatible SQL, UUID PKs, `created_at`/`updated_at`; avoid changing existing tables unless requested.
- Notifications: types and channels data-driven (DB-backed); recipients from `user_notification_preferences`; no hardcoded emails; support per-user, per-notification enable/disable; log attempts in `notification_delivery_logs`.
- No `any` unless allowed; prefer enums or string unions; share types between frontend and backend where possible.
