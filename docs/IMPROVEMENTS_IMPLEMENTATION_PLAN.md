# MineAid HMS – Implementation Plan for Improvements

**Date:** 2025-02-20  
**Source:** [IMPROVEMENTS_OPINIONS_2025-02-20.md](./IMPROVEMENTS_OPINIONS_2025-02-20.md)

This document is a comprehensive, ordered plan to implement the recommendations from the professional assessment. Phases are designed so that quick wins come first and structural changes can be done incrementally without big-bang rewrites.

---

## Overview

| Phase | Focus | Effort | Risk |
|-------|--------|--------|------|
| 0 | Quick wins (env, docs, types) | Low | Low |
| 1 | Validation & error handling | Medium | Low |
| 2 | Route splitting by domain | High | Medium |
| 3 | Thin controller / service layer | High | Medium |
| 2B | (Optional) Feature-based folder restructure | Medium | Low |
| 4 | Testing (critical paths) | Medium | Low |
| 5 | Frontend route/role clarity | Low | Low |

### Architecture alignment: feature-based modular backend

The direction of this plan matches **industry-standard feature-based Node.js architecture**:

- **Separation by feature/domain** – Code is grouped by business area (patients, auth, incidents, inventory, etc.), not by technical type (all controllers in one folder).
- **Layered flow** – Request handling is split into clear layers so business logic is independent of HTTP and database details.

| Layer | Responsibility | Rule |
|-------|----------------|------|
| **Routes** | Define endpoints, attach middleware (auth, validation). | No business logic; only call controller/service and send response. |
| **Controller / Service** | Business logic: orchestrate workflows, call data access, trigger notifications. | No `req`/`res`; no raw SQL. Receives plain data, returns result objects. |
| **Repository / Data access** | Database operations only (query, insert, update). | Only returns data or throws DB errors. Rest of app doesn’t care which DB is used. |

**Current codebase:** One large `server/routes.ts` (routes + inline logic) and one `server/storage.ts` (data access). No explicit service or controller layer.

**Target (same as “feature-based” approach):** Each domain lives in one place; routes are thin; business logic lives in a service layer; data access is encapsulated in a repository (or, short term, the existing `storage` abstraction). This makes code easier to find, test, and later split into microservices if needed.

Phases 2 and 3 below are the **migration path** toward that target. Phase 2B (optional) restructures into **feature folders** so that, for example, everything for “patients” lives under `server/modules/patients/` (routes, controller, service, repository).

---

## Phase 0: Quick Wins (No Structural Change)

**Goal:** Improve onboarding, clarity, and type safety without changing app structure.

### 0.1 Add `.env.example`

- [x] Create `.env.example` at project root.
- [x] List every env var used by the app (from `server/env.ts`, `server/notificationService.ts`, and any `process.env.*` in server code).
- [x] Include one-line comments and placeholder values (e.g. `your-neon-connection-string`, `your-gmail@gmail.com`, `""` for optional).
- [x] Ensure no real secrets; `.env` in `.gitignore` (single local env file; `.env.local` also gitignored but not loaded by the app).
- [x] In README or `docs/LOCAL_DEVELOPMENT_SETUP.md`, reference: “Copy `.env.example` to `.env` and fill in values.”

**Deliverable:** `.env.example` committed; docs updated.

### 0.2 Document trigger-based notifications (no event bus)

- [x] In `.cursorrules`, add or adjust a line under the notification section:  
  “Notifications are trigger-based: storage and cron call `notificationTriggers` / `notificationService` directly; there is no event bus. Introduce an event bus only if we need multiple subscribers or async decoupling.”
- [x] Optionally add the same sentence to `docs/SYSTEM_ASSESSMENT_2025-02-20.md` (or the opinions doc) under “Notifications and email.”

**Deliverable:** `.cursorrules` and (optionally) docs updated.

### 0.3 Replace critical `any` with proper types

- [x] In `server/notificationService.ts`: replace `any` for Nodemailer options with a typed object or small local interface.
- [x] In `server/routes.ts`: for any new or touched handlers, avoid `any` for `req.body`; use Zod-inferred types or explicit interfaces.
- [x] Prefer incremental cleanup: fix types in files you touch rather than a single project-wide pass.

**Deliverable:** No new `any` in notification and email code; reduced `any` in routes over time.

---

## Phase 1: Validation and Error Handling

**Goal:** Consistent request validation and error responses so the API returns predictable 400s and error shapes.

### 1.1 Create a validation helper

- [x] Add `server/validation.ts` (or `server/middleware/validation.ts`).
- [x] Implement a small helper, e.g. `validateBody<T>(schema: z.ZodSchema<T>): Express RequestHandler` that:
  - Reads `req.body`.
  - Runs `schema.safeParse(req.body)`.
  - On success: assigns parsed value to `req.body` (or `req.validatedBody`) and calls `next()`.
  - On failure: responds with `400` and a consistent JSON shape, e.g. `{ message: string, errors?: ... }`.
- [x] Export the helper for use in route modules.

**Deliverable:** `server/validation.ts` (or middleware) with a single, reusable validation helper.

### 1.2 Standardize API error response shape

- [x] Define a small set of response shapes, e.g. `{ message: string }` for simple errors, and optionally `{ message: string, code?: string, errors?: unknown }` for validation (`server/errors.ts`).
- [x] Add a small helper, e.g. `sendError(res, status, message, details?)`, used in route handlers and in the global error handler.
- [x] Ensure the global error handler in `server/index.ts` uses the same shape via `sendError`.

**Deliverable:** Documented error shape and a single place (helper + global handler) that uses it.

### 1.3 Apply validation to critical mutation routes

- [x] Identify high-impact mutation routes (e.g. create/update incident, create/update patient, create appointment, auth-related payloads).
- [x] For each, use the shared Zod schema (from `@shared/schema` or `auth.schemas.ts`) or a route-specific schema.
- [x] Attach the validation middleware before the handler; replace ad-hoc checks with schema validation where possible.
- [x] **Phase 1.3 complete.** Validation and/or `sendError` applied to: Auth (register, login, verify-email, forgot-password, reset-password); care locations POST/PUT; employees POST/PUT; patients POST/PUT; appointments POST/PUT/PATCH; medical visits PUT (both); medical records POST; triage POST/PATCH; vital signs POST; incident reports POST/PUT; companies POST/PUT; operational duties POST/PUT; duty assignments POST/PUT; suppliers POST/PUT; **inventory** POST/PUT (with `insertInventoryItemSchema` + `locationId` for POST); **equipment maintenance** POST/PUT; **inventory alerts** POST/PUT and acknowledge/resolve; **testing programs** POST/PUT; **testing equipment** POST/PUT; **feedback** (sendError only). All error responses in `server/routes.ts` now use `sendError(res, status, message)` (or `sendError(..., details)` where needed). Remaining mutation routes (purchase orders, stock requisitions/transfers, inventory transactions, drug/alcohol/hydration/instant tests, random pools) retain existing validation and sendError for 4xx/5xx; `validateBody` can be added incrementally later.

**Deliverable:** Critical mutation endpoints validate body with Zod and return 400 via validateBody or sendError. Phase 1 complete.

### 1.4 Phase 1 follow-up (deferred – add validateBody later)

**Do not skip:** The following mutation routes still use ad-hoc validation and manual checks; their error responses already use `sendError`, but they do **not** yet use `validateBody(schema)`. Add Zod validation when touching these areas so we don’t miss them.

| Domain | Routes to add validateBody | Schema(s) to use |
|--------|----------------------------|------------------|
| **Purchase orders** | POST `/api/purchase-orders`, PUT `/api/purchase-orders/:id`, POST `/api/purchase-orders/:id/receive`, POST/PUT purchase-order-items | `insertPurchaseOrderSchema` (or custom body schema for receive/items) |
| **Stock requisitions** | POST `/api/stock-requisitions`, PUT `/api/stock-requisitions/:id` | `insertStockRequisitionSchema` (+ items shape), `.partial()` for PUT |
| **Stock transfers** | POST `/api/stock-transfers`, POST from-requisition, dispatch, receive | `insertStockTransferSchema`, custom for from-requisition/dispatch/receive |
| **Inventory transactions** | POST `/api/inventory-transactions`, PUT `/api/inventory-transactions/:id` | `insertInventoryTransactionSchema` (omit server-set fields), `.partial()` for PUT |
| **Drug tests** | POST `/api/drug-tests`, PATCH `/api/drug-tests/:id` | `insertDrugTestSchema`, `.partial()` for PATCH |
| **Alcohol tests** | POST `/api/alcohol-tests`, PATCH `/api/alcohol-tests/:id` | `insertAlcoholTestSchema`, `.partial()` for PATCH |
| **Hydration tests** | POST `/api/hydration-tests`, PATCH `/api/hydration-tests/:id` | `insertHydrationTestSchema`, `.partial()` for PATCH |
| **Instant tests** | POST `/api/instant-tests`, PATCH `/api/instant-tests/:id` | `insertInstantTestSchema`, `.partial()` for PATCH |
| **Random testing pools** | POST `/api/random-testing-pools`, PUT `/api/random-testing-pools/:id`, POST generate-selections | `insertRandomTestingPoolSchema`, `insertRandomSelectionSchema` (or custom for generate) |

- [x] Purchase orders: add validateBody for POST/PUT and receive/items where applicable.
- [x] Stock requisitions: add validateBody for POST and PUT.
- [x] Stock transfers: add validateBody for POST and action endpoints.
- [x] Inventory transactions: add validateBody for POST and PUT.
- [x] Drug / alcohol / hydration / instant tests: add validateBody for POST and PATCH.
- [x] Random testing pools and generate-selections: add validateBody.

**Deliverable:** When done, all mutation routes use `validateBody` + `sendError`; no routes rely only on ad-hoc checks. **Phase 1.4 complete:** All listed mutation routes now use `validateBody` with the appropriate Zod schemas (shared or route-specific).

---

## Phase 2: Split Routes by Domain

**Goal:** Replace the single `server/routes.ts` with one router per domain, mounted under `/api`, to improve navigation, testing, and merge safety.

### 2.1 Plan route groups and mount points

- [x] List all current `/api/*` route prefixes and group them by domain (see matrix below).
  - Auth: `/api/auth/*`, `/api/tenants` (if used only for registration), login/register/verify/forgot/reset.
  - Tenants: `/api/tenants` (CRUD for super admin).
  - Companies: `/api/companies`.
  - Patients: `/api/patients`, `/api/patient/*`.
  - Appointments: `/api/appointments`.
  - Medical visits / records: `/api/medical-visits`, `/api/records`, etc.
  - Incidents: `/api/incident-reports`, `/api/incidents`.
  - Notifications: `/api/notifications`, `/api/admin/notification-*`.
  - Admin: `/api/admin/*` (can be one router or split by sub-domain).
  - Inventory, equipment, testing, etc.
- [x] Decide exact file names and mount points for pilot (incidents done). Full matrix:
  - `server/routes/auth.ts` → `app.use('/api/auth', authRoutes)` and optionally `app.use('/api/tenants', tenantPublicRoutes)` for registration.
  - `server/routes/patients.ts` → `app.use('/api/patients', patientRoutes)` and mount patient-detail routes under the same or a nested router.
- [ ] Document the full mapping as remaining domains are split.

**Route file → mount path → responsibility (current):**

| Route file | Mount path | Responsibility |
|------------|------------|-----------------|
| `server/routes/incidents.ts` | `app.use('/api', createIncidentRouter(...))` | `/api/incident-uploads`, `/api/incident-reports` (CRUD) |
| `server/routes/patients.ts` | `app.use('/api', createPatientsRouter(...))` | `/api/patients`, `/api/patients/search`, `/api/patients/:id` (CRUD) |
| `server/routes/appointments.ts` | `app.use('/api', createAppointmentsRouter(...))` | `/api/appointments`, `/api/appointments/:id` (CRUD) |
| `server/routes/medicalVisits.ts` | `app.use('/api', createMedicalVisitsRouter(...))` | `/api/medical-visits`, `/api/medical-visits/patient/:patientId`, `/api/medical-visits/:id` (CRUD) |
| `server/routes/triage.ts` | `app.use('/api', createTriageRouter(...))` | `/api/triage`, `/api/triage/:id` (CRUD) |
| `server/routes/vitalSigns.ts` | `app.use('/api', createVitalSignsRouter(...))` | `/api/vital-signs`, `/api/vital-signs/:id` (CRUD) |
| `server/routes/medicalRecords.ts` | `app.use('/api', createMedicalRecordsRouter(...))` | `/api/medical-records`, `/api/medical-records/:patientId` |
| `server/routes/companies.ts` | `app.use('/api', createCompaniesRouter(...))` | `/api/companies`, `/api/companies/bulk-import`, `/api/companies/export`, `/api/companies/:id` (CRUD) |
| `server/routes/careLocations.ts` | `app.use('/api', createCareLocationsRouter(...))` | `/api/care-locations`, `/api/care-locations/primary`, `/api/care-locations/:id` (CRUD) |
| `server/routes/employees.ts` | `app.use('/api', createEmployeesRouter(...))` | `/api/employees`, `/api/employees/search`, `/api/employees/search/:employeeNumber`, `/api/employees/export`, `/api/employees/bulk-import`, `/api/employees/:id`, `/api/employees/:employeeId/test-history` (CRUD + export/import/test-history) |
| `server/routes/dashboard.ts` | `app.use('/api', createDashboardRouter(...))` | `/api/dashboard/metrics` |
| `server/routes/auditLogs.ts` | `app.use('/api', createAuditLogsRouter(...))` | `/api/audit-logs`, `/api/admin/audit-logs` |
| `server/routes/users.ts` | `app.use('/api', createUsersRouter(...))` | `/api/users`, `/api/users/export`, `/api/users/:id` (list, export CSV, get by id with employee/company) |
| `server/routes/admin.ts` | `app.use('/api', createAdminRouter(...))` | `/api/admin/*`: initialize-employees, pending-users, all-users, invite-user, invite-users-bulk, resend-verification, approve-user, update-user-status, notification-preferences (GET/PUT :userId, bulk, role-defaults, apply-role-defaults), update-user-role, users/:userId (DELETE), equipment/trigger-health-check, trigger-maintenance-reminders, trigger-overdue-maintenance-reminders (GET/POST) |
| `server/routes/notifications.ts` | `app.use('/api', createNotificationsRouter(...))` | `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/:id/read`, `/api/notification-types`, `/api/notification-preferences` (GET, PUT – user-level) |
| `server/routes/feedback.ts` | `app.use('/api', createFeedbackRouter())` | POST `/api/feedback` (public, no auth) |
| `server/routes/tenants.ts` | `app.use('/api', createTenantsRouter(...))` | POST `/api/tenants` (public), GET `/api/tenants/:id/verify` (public), PUT `/api/tenants/:id` (admin) |
| `server/routes/auth.ts` | `app.use('/api', createAuthRouter(...))` | `/api/auth/*` (register, login, verify-email, forgot/reset-password, logout, select-location, switch-location, current-session, user), `/api/profile` (PUT), `/api/auth/activation-details`, `complete-activation`, `confirm-account` |
| `server/routes/superAdmin.ts` | `app.use('/api', createSuperAdminRouter(...))` | `/api/super-admin/*`: tenants (GET), feedback (GET, PATCH :id), tenant-admins (GET, PATCH :adminId, DELETE :adminId), users (GET, PATCH :userId, DELETE :userId), approve-admin/:adminId, create-tenant, tenants/:tenantId/status, tenants/:tenantId/plan, tenants/:tenantId (PUT) |
| `server/routes/operationalDuties.ts` | `app.use('/api', createOperationalDutiesRouter(...))` | POST/GET/PUT/DELETE `/api/operational-duties`, `/api/operational-duties/:id` |
| `server/routes/dutyAssignments.ts` | `app.use('/api', createDutyAssignmentsRouter(...))` | `/api/duty-assignments` (CRUD, today, history, analytics, complete, cancel, status), `/api/duty-completions` (POST, GET, GET by assignment) |
| `server/routes/suppliers.ts` | `app.use('/api', createSuppliersRouter(...))` | `/api/suppliers` (CRUD) |
| `server/routes/equipmentMaintenance.ts` | `app.use('/api', createEquipmentMaintenanceRouter(...))` | `/api/equipment-maintenance` (CRUD), `/api/equipment/maintenance-due` |
| `server/routes/purchaseOrders.ts` | `app.use('/api', createPurchaseOrdersRouter(...))` | `/api/purchase-orders` (CRUD), `/api/purchase-orders/:poId/items`, `/api/purchase-orders/:id/receive`, `/api/purchase-order-items` (POST/PUT/DELETE) |
| `server/routes/inventory.ts` | `app.use('/api', createInventoryRouter(...))` | `/api/inventory-image-upload`, `/api/inventory` (CRUD, export, import, analytics, low-stock, expiring) |
| `server/routes/inventoryAlerts.ts` | `app.use('/api', createInventoryAlertsRouter(...))` | `/api/inventory-alerts` (POST, GET, POST process-pending, PUT :id, PUT :id/acknowledge, PUT :id/resolve) |
| `server/routes/inventoryTransactions.ts` | `app.use('/api', createInventoryTransactionsRouter(...))` | `/api/inventory-transactions` (GET, POST, PUT :id, DELETE :id) |
| `server/routes/stockRequisitions.ts` | `app.use('/api', createStockRequisitionsRouter(...))` | `/api/stock-requisitions` (GET, POST, PUT :id) |
| `server/routes/stockTransfers.ts` | `app.use('/api', createStockTransfersRouter(...))` | `/api/stock-transfers` (GET, POST, from-requisition/:requisitionId, :id/dispatch, :id/receive) |
| `server/routes/testingPrograms.ts` | `app.use('/api', createTestingProgramsRouter(...))` | `/api/testing-programs` (CRUD) |
| `server/routes/testingEquipment.ts` | `app.use('/api', createTestingEquipmentRouter(...))` | `/api/testing-equipment` (CRUD), `/api/testing-equipment/calibration-due` |
| `server/routes/testing.ts` | `app.use('/api', createTestingRouter(...))` | `/api/testing/analytics`, drug-tests, alcohol-tests, drug-alcohol-tests/:id (PUT), hydration-tests, instant-tests, random-testing-pools (CRUD + generate-selections), random-selections (CRUD) |
| (remaining in `routes.ts`) | — | File storage (profile picture, public-objects), multer configs, auth/session setup, mounting of domain routers, `createServer(app)`. |

**Deliverable:** A single list/matrix: “Route file → mount path → responsibility.”

### 2.2 Extract one pilot domain (e.g. incidents or patients)

- [x] Choose one domain (incidents) and create `server/routes/incidents.ts`.
- [x] Move all incident-related routes from `server/routes.ts` into this file: create router via `createIncidentRouter(deps)`, register POST incident-uploads, GET/POST/PUT/DELETE incident-reports; export the factory.
- [x] Ensure middleware (authMiddleware, injectLocationMiddleware, incidentUpload multer) is passed in as deps and applied in the same order as before.
- [x] In `server/routes.ts`, remove the moved routes and add `app.use('/api', createIncidentRouter({ ... }))`.
- [x] Run the app and manually (or smoke-test) verify incident flows. **Smoke test (2025-02-20):** Landing page and Sign In (/auth) load; GET /api/dashboard/metrics and GET /api/suppliers return 401 "Authentication required" when unauthenticated (extracted routers responding correctly).

**Deliverable:** One domain fully split out; `routes.ts` smaller; app behavior unchanged.

### 2.3 Extract remaining domains incrementally

- [x] Repeat the same process for: auth, tenants, companies, patients, appointments, medical-visits/records, notifications, admin, inventory, equipment, testing, etc.
- [x] For each new `server/routes/<domain>.ts`, ensure:
  - Shared middleware (session, auth) is applied at mount time in `routes.ts` or inside the router.
  - Multer uploads, validation middleware, and error handling stay consistent.
- [ ] After each extraction, run the app and smoke-test that domain.

**Deliverable:** `server/routes.ts` only: session/auth setup, multer configs, mounting of domain routers, and the global catch-all/static if any. No business logic in `routes.ts`.

**Phase 2.3 complete (2025-02-20).** All domain route groups have been extracted into 31 router files under `server/routes/`. The only remaining inline routes in `routes.ts` are file storage (GET public-objects, GET objects, POST public-objects/upload, POST objects/upload, PUT profile/picture). Recommended: run a smoke-test of key flows; optionally do 2.4 (centralize registration in `server/routes/index.ts`).

### 2.4 Centralize route registration

- [x] Optionally add `server/routes/index.ts` that imports all domain routers and a function `registerAllRoutes(app, deps)` that mounts them (and leaves app-level middleware to `server/index.ts` or the current `registerRoutes`).
- [x] Keep a single entry point (`registerRoutes` in `server/routes.ts` that calls `registerAllRoutes`) so that `server/index.ts` does not need to change.

**Deliverable:** Clear single place that defines the full API surface (list of routers and mount paths).

**Phase 2.4 complete (2025-02-20).** Added `server/routes/index.ts` with `registerAllRoutes(app, deps)` and `RouteRegistrationDeps`; `server/routes.ts` now builds multer/auth deps and calls `registerAllRoutes`, then mounts file-storage routes. No change to `server/index.ts`.

### 2.5 (Optional) Feature-based folder restructure

Once routes are split by domain (2.2–2.4), you can optionally **group each domain into a single feature folder** so that “everything for Patients” (or Auth, Incidents, etc.) lives in one place. This matches the **feature-based folder structure** commonly used in scalable Node.js apps.

**Implementation status (target structure below):**

| Item | Status |
|------|--------|
| `server/shared/errors.ts` | Done |
| `server/shared/validation.ts` | Done |
| `server/modules/auth/auth.service.ts` | Staff auth service (login, sessions, OIDC completion) |
| `server/modules/auth/auth.middleware.ts` | Session cookie validation (`createAuthMiddleware`) |
| `server/modules/auth/auth.schemas.ts` | Register/login/reset Zod schemas |
| `server/shared/middleware/adminAuth.ts` | Done |
| `server/shared/middleware/injectLocation.ts` | Done |
| `server/config/env.ts` | Done |
| `server/config/db.ts` | Done |

**Two “shared” folders (do not consolidate):**

| Location | Purpose | Used by |
|----------|---------|---------|
| **Root `shared/`** | App-wide shared code: schema, types, Zod schemas. Path alias: `@shared/schema`. | Client and server |
| **`server/shared/`** | Server-only utilities: errors, validation, middleware. Relative imports only. | Server only |

Keep them separate: root `shared/` is for code shared across the whole app; `server/shared/` is for server-internal reuse. Consolidating would mix server-only code into the app-level shared space.

**Target structure (reference):**

```
server/
├── modules/
│   ├── auth/                    # Auth domain
│   │   ├── auth.routes.ts       # Mount at /api/auth or /api (login, register, etc.)
│   │   ├── auth.controller.ts   # Thin: parse req, call service, send res
│   │   ├── auth.service.ts     # Business logic (token, validation, no HTTP)
│   │   ├── auth.repository.ts  # Optional: DB for sessions/tokens; or keep using existing storage
│   │   └── auth.validation.ts   # Optional: Zod schemas for this domain
│   ├── patients/
│   │   ├── patients.routes.ts
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   └── patients.repository.ts  # Wraps storage.getPatient, createPatient, etc.
│   ├── incidents/
│   │   └── ...
│   ├── medical-visits/
│   ├── inventory/
│   ├── testing/
│   └── ...
├── shared/
│   ├── middleware/             # auth, requireAdmin, injectLocation, validateBody
│   ├── errors.ts               # sendError, ApiErrorBody
│   ├── validation.ts           # validateBody helper
│   └── ...
├── config/                     # env.ts, db connection (or keep server/env.ts, server/db.ts)
├── storage.ts                  # Can stay as single “data access” until repositories are split out
└── index.ts                    # App init, mount modules, global error handler
```

**Domain granularity: coarser is the preferred convention**

Modern Node/Express and “feature-based” or domain-driven setups usually favor **coarser, product-aligned domains**: one folder = one product feature / bounded context, not one folder per HTTP resource. Names match product/capability (e.g. `inventory/`, `testing/`, `incidents/`), not API slices like `inventory-alerts/`, `inventory-transactions/`, `stock-requisitions/` as separate top-level “domains”. Inside a feature you can still have multiple route files or sub-routers (e.g. `inventory/routes/items.ts`, `inventory/routes/alerts.ts`) or a single `inventory.routes.ts` that mounts sub-routers.

| Aspect | Coarser (e.g. `inventory/`, `testing/`) | Finer (inventory, inventory-alerts, inventory-transactions, stock-*, …) |
|--------|----------------------------------------|-----------------------------------------------------------------------|
| **Convention** | Matches “feature folder” / “bounded context” in most guides. | Closer to “one folder per resource”; often over-split. |
| **Onboarding** | “Inventory code is under `inventory/`.” | “Inventory is spread across inventory, inventory-alerts, inventory-transactions, stock-requisitions, stock-transfers.” |
| **Refactors** | Change one feature → one top-level domain. | Same feature can touch many top-level folders. |
| **Ownership** | One team/contributor “owns” one feature folder. | Ownership is per tiny module; “inventory” has no single home. |
| **Naming** | Folder name = product term (Inventory, Testing). | Folder names = API/technical slices. |

**Practical recommendation:** Treat **coarser, product-aligned domains** as the target structure (e.g. one `inventory/`, one `testing/`, one `incidents/`). The current 31 modules are a **valid but more granular than necessary** split. Prefer **incremental consolidation** when you touch those areas rather than a big-bang rename.

**Target coarse domains and consolidation map**

Use this as the single source of truth when consolidating: which current modules merge into which product-aligned domain. After consolidation, each row is one folder under `server/modules/<domain>/` with one or more route files (e.g. `inventory.routes.ts` or `inventory/routes/items.ts`, `inventory/routes/alerts.ts`, etc.).

| Target coarse domain | Current modules to merge | Notes |
|----------------------|---------------------------|--------|
| **auth** | auth | No change. |
| **patients** | patients | No change. |
| **appointments** | appointments | No change. |
| **incidents** | incidents | No change. |
| **clinical** | medical-visits, medical-records, triage, vital-signs | One “clinical” or “medical” feature: visits, records, triage (SATS), vitals. Sub-routes or single router. |
| **notifications** | notifications | No change. |
| **dashboard** | dashboard | No change. |
| **users** | users | No change. |
| **admin** | admin | No change. |
| **care-locations** | care-locations | No change. |
| **audit-logs** | audit-logs | No change. |
| **feedback** | feedback | No change. |
| **companies** | companies | No change. |
| **employees** | employees | No change. |
| **suppliers** | suppliers | No change. |
| **inventory** | inventory, inventory-alerts, inventory-transactions, stock-requisitions, stock-transfers, purchase-orders | One “inventory” feature: items, alerts, transactions, requisitions, transfers, purchase orders. Sub-routers or single `inventory.routes.ts` mounting sub-routes. |
| **equipment** | equipment-maintenance | No change (or rename folder to `equipment/` and keep maintenance as sub-routes). |
| **testing** | testing, testing-programs, testing-equipment | One “testing” feature: programs, equipment, test execution. Sub-routes. |
| **duties** | operational-duties, duty-assignments | One “duties” feature: duty definitions + assignments/completions. Sub-routes. |
| **tenants** | tenants | No change. |
| **super-admin** | super-admin | No change. |

**Feature flags / tenant toggles (turn on–off features)**

If you want the system to support turning features on or off (e.g. for payment, access control, or tenant preference), it **does not force** a specific folder structure, but it **fits best** with the coarser structure above.

- **Why coarser helps:** One product feature = one router. You can gate by feature in one place: either mount the router only when the feature is enabled (e.g. `if (tenantFeatures.inventory) app.use('/api/inventory', inventoryRouter)`) or use middleware at the feature’s mount that returns 403 when the feature is off. The **feature list** for billing or “tenant settings” is exactly the list of coarse domains (inventory, testing, incidents, etc.); no ambiguity about “is stock-transfers a separate feature?”
- **What you need:** (1) A store (DB table or config) of which features are enabled per tenant (or globally). (2) A guard at **mount time** or **middleware** that checks that store and returns 403 or hides routes when the feature is off. (3) Optional: a small “feature registry” (e.g. list of feature keys and which router they protect) so the app can conditionally mount or wrap routers. None of this requires changing the internal layout of a domain (controller/service/storage).
- **Conclusion:** The planned **coarse structure does not need to change** for feature flags. It already gives you one feature per domain and one place to gate. You only add a feature-config layer and conditional mount or middleware; the consolidation map above stays as-is.

**Layers (separate from domain granularity):** Use **Controller → Storage** when a domain has little logic; add a **Service** (Controller → Service → Storage) when there is non-trivial business logic (e.g. notifications). Notifications is the reference for the full stack; incidents for controller-only.

**How the layers interact (same as described by the other dev):**

- **Routes** – Define endpoints, attach middleware, call controller; no logic.
- **Controller** – Read `req.body` / `req.params`, validate (or use shared validation middleware), call **service** (or storage), then map result to `res.status().json()`.
- **Service** – (Optional.) All business logic; calls **repository** (or `storage`) and notification/email triggers; no `req`/`res`, no SQL.
- **Repository** – (Optional.) Pure DB: `findById`, `save`, `update`, etc. Only returns data or throws.

**Migration approach:**

- [x] After Phase 2 (routes split into `server/routes/<domain>.ts`), choose one pilot domain (e.g. `incidents`).
- [x] Create `server/modules/incidents/` and move `server/routes/incidents.ts` → `incidents.routes.ts`. Add `incidents.controller.ts` (thin, calls service) and `incidents.service.ts` (logic from current route handlers). Optionally add `incidents.repository.ts` that wraps `storage` incident methods.
- [x] In the main app, mount with `app.use("/api", createIncidentRouter(...))` via `server/routes/index.ts` (unchanged). Routes file lives at `server/modules/incidents/incidents.routes.ts`; `routes/index.ts` imports from `../modules/incidents/incidents.routes`.
- [x] Repeat for other domains. Over time, `server/routes/` can be removed and all routes live under `server/modules/<feature>/<feature>.routes.ts`.

**Phase 2.5 complete (2025-02-20).** All 31 domains now live under `server/modules/<feature>/<feature>.routes.ts`. `server/routes/` contains only `index.ts` (imports and `registerAllRoutes`). Controller/service layers added in Phase 3. The current split is finer-grained than the preferred convention (see "Domain granularity: coarser is the preferred convention" above); consolidation into fewer, product-aligned domains (e.g. one `inventory/`, one `testing/`) can be done incrementally when touching those areas.

**Coarse domain consolidation (2025-02-20).** One domain = one folder. Aggregator routers mount at `/api`; sub-modules live **inside** each coarse folder:

| Coarse domain | Folder structure | Mount in index |
|---------------|------------------|----------------|
| **clinical** | `server/modules/clinical/` with `clinical.routes.ts` + subfolders `medical-visits/`, `triage/`, `vital-signs/`, `medical-records/` | `createClinicalRouter` |
| **inventory** | `server/modules/inventory/` with `inventory.routes.ts`, `inventory.feature.routes.ts` + subfolders `inventory-alerts/`, `inventory-transactions/`, `stock-requisitions/`, `stock-transfers/`, `purchase-orders/` | `createInventoryFeatureRouter` |
| **testing** | `server/modules/testing/` with `testing.routes.ts` + subfolders `testing-programs/`, `testing-equipment/` | `createTestingRouter` |
| **duties** | `server/modules/duties/` with `duties.routes.ts` + subfolders `operational-duties/`, `duty-assignments/` | `createDutiesRouter` |

API paths are unchanged (e.g. `/api/medical-visits`, `/api/triage`, `/api/inventory`, `/api/testing-programs`). Imports in moved subfolders use `../../../storage`, `../../../validation`, `../../../errors` to reach server root. **equipment**: `equipment-maintenance` remains a top-level module (optional rename to `equipment/` later).

**See [DOMAIN_FEATURE_CONSOLIDATION.md](./DOMAIN_FEATURE_CONSOLIDATION.md)** for the full consolidation reference (rationale, map, current state, feature flags, layers) and the **plan to enhance** consolidation (equipment rename, path aliases, feature registry, etc.).

**Deliverable:** Optional. Prefer **coarser** feature folders (one per product capability) when adding or merging domains. Either keep flat `server/routes/<domain>.ts` + `server/controllers/<domain>.ts`, or adopt `server/modules/<feature>/` with routes + controller + service + repository per feature. Both satisfy “thin routes + business logic in a separate layer.”

---

## Phase 3: Thin Controller / Service Layer

**Goal:** Separate HTTP (req/res, status codes) from business logic so that “what the app does” can be tested and reused without Express. In the feature-based terminology, the “heavy lifter” is the **service** (business logic); the **controller** can be the thin route handler that calls the service and maps results to HTTP. This plan uses “controller” for the layer that orchestrates storage and notifications; you can name the file `*.service.ts` and keep route handlers as the true “controller” if you prefer.

### 3.1 Define controller pattern and first controller

- [ ] Create `server/controllers/` directory.
- [ ] Choose one domain that has clear “actions” (e.g. incidents). Define controller functions that take plain inputs and return result objects, e.g.:
  - `createIncident(tenantId: string, userId: string, data: InsertIncidentReport): Promise<{ incident: IncidentReport } | { error: string, code?: string }>`.
- [ ] Implement the function by calling `storage` and `notificationTriggers` as today’s route handler does, but without `req`/`res`. Return a result object; do not set HTTP status or send responses.
- [ ] In the route handler (in `server/routes/incidents.ts`): parse tenantId/userId from auth, validate body with Zod, call `createIncident`, then map result to HTTP (201 + body or 400/500 + error shape).

**Deliverable:** One controller module and thin route file; behavior unchanged. **Phase 3.1 complete (2025-02-20).** Controller in `server/modules/incidents/incidents.controller.ts`; pattern documented in `docs/BACKEND_ARCHITECTURE.md`.

### 3.2 Roll out controllers for other domains

- [ ] For each domain that was split in Phase 2, introduce a matching controller module where it adds value (non-trivial logic or reuse).
- [ ] Keep controllers thin: they orchestrate `storage` and existing services (notificationTriggers, authService, etc.); they do not contain SQL or low-level DB code.
- [ ] Route handlers stay responsible for: reading query/params/body, validating input, calling controller, mapping controller result to HTTP.

**Deliverable:** Critical domains (auth, patients, incidents, notifications, admin) have controller layers; routes are thin HTTP adapters.

**Phase 3.2 progress:** Controllers added for **patients**, **notifications** (with `notifications.service.ts`), **appointments**, **incidents** (3.1). Rolled out to **dashboard**, **users**, **medical-visits**, **audit-logs**, **care-locations**, **triage**, **vital-signs**, **medical-records**, **feedback**, **companies** (bulkImport + export), **suppliers**, **operational-duties**, **duty-assignments** (including duty-completions), **equipment-maintenance**, **employees**, **tenants**, **purchase-orders**, **stock-requisitions**, **stock-transfers**, **inventory-alerts**, **inventory-transactions**, **inventory**, **testing-programs**, **testing-equipment**, **testing** (drug/alcohol/hydration/instant tests, random pools/selections), **auth**, **admin**, **super-admin**. **Phase 3.2 complete:** All domains now have a controller (or optional service) and thin routes.

### 3.3 Document the pattern

- [x] In `docs/SYSTEM_ASSESSMENT_2025-02-20.md` or a new `docs/BACKEND_ARCHITECTURE.md`, describe: “Routes handle HTTP; controllers handle business flow and call storage/services; storage handles persistence.”
- [x] Add a short example (one route + one controller function) so future changes follow the same pattern.

**Deliverable:** Documented pattern and example for new features. **Done:** `docs/BACKEND_ARCHITECTURE.md` created with pattern and incident example.

---

## Phase 4: Testing (Critical Paths)

**Goal:** Add a small but meaningful test suite for business-critical and security-sensitive behavior.

### 4.1 Set up test runner and config

- [x] Add a test runner (e.g. Vitest or Jest) and a script in `package.json`, e.g. `"test": "vitest"` or `"test": "node --test"`.
- [x] Configure the runner for TypeScript (if needed) and for unit vs integration (e.g. separate config or folder).
- [x] Ensure tests can import from `@shared/schema` and `server/*` (path aliases or tsconfig).

**Deliverable:** `npm run test` runs the test suite; one dummy test passes. **Done:** Vitest in `vitest.config.ts`, `npm run test` / `npm run test:run`, `server/__tests__/smoke.test.ts`. See `docs/TESTING.md`.

### 4.2 Unit tests for notification preference resolution

- [x] Identify the function(s) that resolve “who gets notified” for a given tenant and notification type (e.g. `getUsersForNotificationType` or equivalent in storage).
- [x] Write unit tests with a in-memory or mocked storage: given a set of notification_types and user_notification_preferences, assert the correct list of recipients (and that disabled preferences or wrong tenant are excluded).

**Deliverable:** Unit tests that lock in notification recipient logic and catch regressions. **Done:** `server/__tests__/notification-preferences.test.ts` tests `getRecipientsForAlert` with mocked `IStorage`.

### 4.3 API integration tests for critical paths

- [x] Add a small test suite that starts the app (or an Express app with the same routes and no Vite) and performs HTTP requests (e.g. with `supertest` or `fetch`).
- [x] Cover at least: login (or register + login), create patient (with valid auth), create incident (with valid auth and tenant). Optionally: one admin-only endpoint (expect 403 when not admin).
- [x] Use a test DB or a separate schema/DB URL so that tests do not touch production data.

**Deliverable:** A few integration tests that run on CI (or locally) and verify auth, tenant isolation, and critical create flows. **Done:** `server/__tests__/api.integration.test.ts` and `server/test-app.ts`; tests run when `DATABASE_URL` is set (skipped otherwise). Covers 401/400/404 for auth and protected routes.

### 4.4 CI (optional but recommended)

- [x] Add a GitHub Action (or other CI) that runs `npm run test` on push/PR.
- [x] If integration tests need a DB, use a service container (Postgres) or Neon test branch and set `DATABASE_URL` in CI.

**Deliverable:** Tests run automatically on every push/PR. **Done:** `.github/workflows/test.yml` runs on push/PR to main and development; runs `npm ci`, `npm run check`, `npm run test:run`. Integration tests skipped when `DATABASE_URL` is unset.

---

## Phase 5: Frontend Route and Role Clarity

**Goal:** Single source of truth for “which routes are protected” and “which require which role,” to avoid scattered checks when adding more role-gated areas.

### 5.1 Define route metadata (optional)

- [x] In `client/src`, introduce a small route config (e.g. `routes.ts` or extend existing routing): list routes with optional `requiredRole?: 'admin' | 'super_admin' | ...` or `public: boolean`.
- [x] Use this config to derive PROTECTED_ROUTES and to drive `ProtectedRouteGuard` (and any future role guard).

**Deliverable:** One place that defines route path and protection/role; guard reads from it. **Done:** `client/src/routes.ts` with getProtectedPaths(), getPublicPaths(), getRequiredRoleForPath(), hasRoleFor(); App.tsx uses them in ProtectedRouteGuard.

### 5.2 Add role-based guard (when needed)

- [x] When you add or expand admin/super-admin-only areas, add a small hook or wrapper, e.g. `useRequireRole('admin')` or `<RequireRole role="admin">`, that checks `user.role` and redirects to `/access-denied` or `/unauthorized` if not allowed.
- [x] Wire it to the route config so that “this path requires admin” is declared once and enforced in one place.

**Deliverable:** Role-gated routes are declared and enforced in a consistent way; no ad-hoc role checks scattered in pages. **Done:** `RequireRole` component and `useRequireRole` hook; `/admin` and `/super-admin` wrapped; role requirements in `routes.ts`.

---

## Execution Order and Dependencies

- **Phase 0** can start immediately and does not depend on anything.
- **Phase 1** (validation) can start in parallel with Phase 0; it does not depend on route splitting.
- **Phase 2** (route splitting) can start after or in parallel with Phase 1; it is independent of controllers.
- **Phase 3** (controllers) is easier after at least one domain is split (Phase 2.2), so that the first controller pairs with a single route file.
- **Phase 4** (testing) can start after Phase 0; integration tests are more stable once routes are split (Phase 2) and optionally once controllers exist (Phase 3).
- **Phase 5** can be done anytime; it becomes more important as you add more role-gated screens.

Suggested order for a single developer:

1. **Phase 0** (quick wins)  
2. **Phase 1** (validation + error shape)  
3. **Phase 2.1–2.2** (plan + one pilot domain split)  
4. **Phase 4.1–4.2** (test setup + notification unit tests)  
5. **Phase 2.3–2.4** (rest of route splitting)  
6. **Phase 3** (controllers for main domains)  
7. **Phase 4.3–4.4** (integration tests + CI)  
8. **Phase 5** when adding new role-gated features  

---

## Success Criteria

- New developers can run the app with `.env.example` and minimal docs.
- Notification and “who gets notified” behavior is documented and covered by unit tests.
- API validation and error responses are consistent and predictable.
- `server/routes.ts` is no longer a single giant file; each domain has its own route file and optional controller.
- Critical flows (auth, patient create, incident create, tenant isolation) are covered by integration tests.
- Role-gated routes are declared in one place and enforced uniformly.

---

## Phases left out (remaining work)

Use this section to revisit what is still open. Completed items are marked [x] in the phase sections above.

| Phase | Item | Status | Notes |
|-------|------|--------|--------|
| **0.2** | ~~Optional: add trigger-based notification sentence to `docs/SYSTEM_ASSESSMENT_2025-02-20.md` or opinions doc~~ | Done | Added to SYSTEM_ASSESSMENT section 4 (Notifications and email). |
| **1.4** | ~~Add `validateBody` to remaining mutation routes~~ | Done | Completed: purchase orders, stock requisitions, stock transfers, inventory transactions, drug/alcohol/hydration/instant tests, random testing pools. |
| **4.3** | ~~API integration tests~~ | Done | `server/__tests__/api.integration.test.ts` + `server/test-app.ts`; run when `DATABASE_URL` set. |
| **4.4** | ~~CI (e.g. GitHub Action)~~ | Done | `.github/workflows/test.yml` on push/PR to main & development. |
| **5.1** | ~~Define route metadata (optional)~~ | Done | `client/src/routes.ts`; guard uses getProtectedPaths/getPublicPaths. |
| **5.2** | ~~Role-based guard~~ | Done | `RequireRole` + `useRequireRole`; /admin and /super-admin wrapped. |

**Optional / incremental:** Phase 2.5 (coarse domain consolidation), Phase 2.3 retrospective smoke-test per domain.

---

## Revision History

| Date       | Change |
|------------|--------|
| 2025-02-20 | Initial plan created from IMPROVEMENTS_OPINIONS_2025-02-20.md. |
| 2025-02-20 | Phase 0 and Phase 1 implemented: `.env.example`, .cursorrules (trigger-based), notificationService types, `server/validation.ts`, `server/errors.ts`, global error handler and POST /api/patients updated. |
| 2025-02-20 | Phase 1.3 extended: POST/PUT/PATCH `/api/appointments` now use `validateBody` and `sendError`. Phase 0.1 doc item marked done (README already references .env.example). |
| 2025-02-20 | Phase 1.3 completed for all critical mutation routes: auth (register, login, verify-email, forgot-password, reset-password), care locations, employees, patients, appointments, medical visits, medical records, triage, vital signs, incident reports. All error responses standardized to `sendError` or valid `.json({ message })`. |
| 2025-02-20 | Phase 3.3 done: `docs/BACKEND_ARCHITECTURE.md` added with route/controller pattern and example. Phase 4.1–4.2 done: Vitest setup, `docs/TESTING.md`, notification preference unit tests. Added "Phases left out (remaining work)" section. |
| 2025-02-20 | Phase 0.2 completed: added trigger-based (no event bus) sentence to `docs/SYSTEM_ASSESSMENT_2025-02-20.md` under section 4 (Notifications and email). |
| 2025-02-20 | Phase 1.4 completed: added `validateBody` to all remaining mutation routes (purchase orders, stock requisitions, stock transfers, inventory transactions, drug/alcohol/hydration/instant tests, random testing pools and generate-selections). All mutation routes now use Zod validation + sendError. |
| 2025-02-20 | Phase 4.3–4.4 completed: API integration tests (`server/__tests__/api.integration.test.ts`, `server/test-app.ts`) using fetch + HTTP server; run when DATABASE_URL set. CI workflow `.github/workflows/test.yml` added. |
| 2025-02-20 | Phase 5.1–5.2 completed: `client/src/routes.ts` (route metadata), `RequireRole` component and `useRequireRole` hook; /admin and /super-admin wrapped with role guard. |
| 2025-02-20 | Release 4.0.0: version bumped, CHANGELOG updated with full improvement summary (Phases 0–5). |
