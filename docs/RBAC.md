# Role-Based Access Control (RBAC)

This document is the **single consolidated reference** for how roles are defined and enforced in MineAid HMS. Older notes in `CHANGELOG.md`, `VERSION.md`, and module-specific docs may mention RBAC; treat **this file** as authoritative for architecture and enforcement locations.

**Baseline**: Release **4.11.0** — client guards (`RequireClinicalAccess`, `routes.ts`) align with server `requireClinicalAccess` in `server/shared/middleware/clinicalAuth.ts`.

## Roles

| Role | Typical use | Tenant |
|------|-------------|--------|
| `emt` | EMS crew: **Ambulance & EMS** module (fleet view, shift pre-start checks, unit stock links); not granted clinical/PHI APIs by default | Required |
| `medical_staff` | Clinical staff: patients, visits, records, appointments tied to care | Required |
| `admin` | Tenant administrator: users, settings, inventory configuration, full clinical access | Required |
| `safety_officer` | Safety / HSE: incidents, operational duties, Employee wellbeing (read-heavy), no standalone patient directory access | Required |
| `super_admin` | Platform operator: tenant lifecycle, global users | Usually no `tenantId` |

Defined in `shared/schema.ts` (`user_role` enum) and mirrored in client types (`client/src/types/auth.ts` / sidebar types).

## Current access matrix (what each role can/cannot access)

Legend: `Yes` = allowed by current implementation, `No` = blocked, `Limited` = allowed with redaction/read-only restrictions.

| Capability / module | `emt` | `medical_staff` | `safety_officer` | `admin` | `super_admin` |
|---|---|---|---|---|---|
| Dashboard (`/dashboard`, `/api/dashboard/metrics`) | Yes | Yes | Yes | Yes | Yes* |
| Ambulance & EMS (`/ambulance`, fleet & pre-start APIs) | Yes | Yes | No | Yes | Yes* |
| Patients directory (`/patients`, `/api/patients*`) | No | Yes | No | Yes | Yes |
| Medical records / visits / triage / vitals | No | Yes | No | Yes | Yes |
| Appointments | No | Yes | No | Yes | Yes |
| Incidents list/edit | Yes | Yes | Limited (PII redacted) | Yes | Yes |
| Incidents - create new (patient picker required) | No | Yes | No (blocked in UI) | Yes | Yes |
| Incident items used/dispensed | Yes | Yes | Yes (incident-driven; no patient shown) | Yes | Yes |
| Employee wellbeing - read | Yes | Yes | Yes | Yes | Yes |
| Employee wellbeing - write | No | Yes | No | Yes | Yes |
| Admin panel (`/admin`) | No | No | No | Yes | Yes |
| Super admin (`/super-admin`) | No | No | No | No | Yes |
| **Staff tickets** (`/tickets`, `/api/tickets*`, `/api/ticket-categories`) | Yes | Yes | Yes | Yes | Yes* |
| Staff tickets — list **all** tenant queue / assign / triage | No | No | No | Yes | Yes* |
| Staff tickets — **internal** comments | Assignee only | Assignee only | Assignee only | Yes | Yes* |
| Staff tickets — edit **title / description / links** (request fields) | Own tickets only | Own tickets only | Own tickets only | Own tickets only | Yes* |

`*` Super admins are global operators; tenant-scoped features depend on tenant context/association for meaningful data.

## Design principles

1. **Tenant isolation** – Data is scoped by `tenant_id`; users without a tenant (except `super_admin`) cannot access tenant APIs.
2. **PHI / clinical access** – Patient-identifiable data and clinical workflows are restricted to **`medical_staff`** and **`admin`**, plus **`super_admin`** where applicable. **`safety_officer` is excluded** from these APIs by design (medical confidentiality and least privilege).
3. **Sidebar `minRole` is not used for PHI** – The sidebar supports a numeric hierarchy (`medical_staff` &lt; `safety_officer` &lt; `admin`). A “minimum role” rule would incorrectly grant **safety officers** access to anything marked “at least medical_staff”. For patient/clinical navigation, the UI uses **`allowedRoles`** (see `client/src/config/sidebarConfig.tsx`).
4. **Defense in depth** – The server remains authoritative for enforcement. The UI now keeps links visible and gives non-disruptive feedback (toast + redirect) when a user opens a blocked route.

## Clinical / PHI API access (`requireClinicalAccess`)

**Server middleware:** `server/shared/middleware/clinicalAuth.ts`

**Allowed roles:** `medical_staff`, `admin`. **`super_admin`** is allowed (e.g. support scenarios). **`safety_officer`** receives `403`.

**Applied to routes** (after session auth, before handlers), including but not limited to:

| Area | Router / module |
|------|-------------------|
| Patients | `server/modules/patients/patients.routes.ts` |
| Appointments | `server/modules/appointments/appointments.routes.ts` |
| Dashboard metrics | `server/modules/dashboard/dashboard.routes.ts` |
| Medical visits, triage, vitals, medical records | `server/modules/clinical/**` |
| Procedures (list + admin mutations) | `server/modules/procedures/procedures.routes.ts` |
| Referral facilities | `server/modules/referral-facilities/referral-facilities.routes.ts` |

Registration order and dependencies: `server/routes/index.ts`, middleware wiring in `server/routes.ts`.

**Not automatically restricted by this middleware** (still authenticated + tenant checks as today):

- **Inventory, testing, operational duties, shift reports**, etc. – Use their existing route guards; some flows may still reference visits/patients through other endpoints (evaluate when touching those features).

## Incidents and safety officers (PHI redaction)

Safety officers need incident workflows without the patient directory (`/api/patients` is clinical-only). Incident APIs remain available; responses for **`safety_officer`** are passed through **`redactIncidentForSafetyOfficer`** (`server/shared/incidentSafetyRedaction.ts`):

- **Structured fields:** Employee first/last name and employee number are cleared in the nested `patient` object; **employer `company.name`** is kept; **job title** remains on the incident where present. **`patientId`** is retained for server-side joins (e.g. inventory issue to incident) but must not be shown in the UI for safety roles.
- **Free text:** `description`, `emergencyMedicalMgt`, `actionsTaken`, `reportedTo`, and `incidentLocation` are scanned for the casualty’s first/last name and employee number; matches are replaced with **`Casualty/IP`**.
- **LMP:** `lastMenstrualPeriod` is cleared in these responses.

**Routes:** `server/modules/incidents/incidents.routes.ts` applies redaction on **GET list**, **POST create**, and **PUT update** when the requester’s role is `safety_officer`.

**Client:** `client/src/lib/incidentSafetyDisplay.ts` formats list/detail copy as **Casualty/IP** plus “a worker of {company}” where applicable. **`IncidentModal`:** new reports that require choosing a patient are blocked for safety (no patient list); editing existing incidents shows a redacted read-only line and a hidden `patientId` for saves. **`IncidentDispensedItemsModal`** resolves inventory issues by **incident id** only (no `patientId` in the POST body).

## Staff e-ticketing (operations)

Tenant-scoped **staff** requests (repairs, complaints, IT, HSE) — not patient-facing. **Server:** `server/modules/tickets/**`; **storage:** `server/storage.ts` (ticket tables). **HTML** descriptions and comments are sanitized on save (`server/shared/ticketHtmlSanitize.ts`).

- **Authenticated + tenant:** any staff role may **create** tickets and view tickets they **requested** or that are **assigned** to them (`scope=requested|assigned|mine` on `GET /api/tickets`).
- **`admin` / `super_admin` (with tenant):** `scope=all`, **triage** `PATCH` (assignee, category, status workflow, priority), **category CRUD** (`POST/PATCH/DELETE /api/ticket-categories`). Admins do **not** use `PATCH` to rewrite the requester’s title/description/location/incident/asset fields (those are requester-only).
- **Requester:** may update **own** ticket **content** (title, description HTML, location, incident/asset links) while not **closed** or **cancelled**; may **cancel** while status is `open` (`PATCH` status `cancelled`). Server rejects a single `PATCH` that mixes content fields with triage fields.
- **Assignee (non-admin):** `PATCH` **status** (`in_progress`, `resolved`) and **priority** only; **internal** comments allowed.
- **Attachments:** requester, assignee, or admin (`POST /api/tickets/:id/attachments`). Response includes **`storageBackend`** (`vercel-blob` | `local`) for client feedback when Blob is unavailable.

See **`docs/E_TICKETING_STAFF_PLAN.md`** for the full product plan; implementation status is noted there.

## Employee wellbeing module (separate RBAC)

**Server:** `server/shared/middleware/wellbeingAuth.ts`

- **Read:** `medical_staff`, `safety_officer`, `admin` (and `super_admin` as implemented).
- **Write:** `medical_staff`, `admin` only; safety officers are **read-only** (with extra rules for Work fitness & medications).

Detailed behaviour and UI toggles: **`docs/WELLBEING_IMPLEMENTATION_STATUS.md`** and **`docs/WELLBEING_MODULE_PLAN.md`**.

## Tenant admin and super admin

- **Tenant admin:** `server/shared/middleware/adminAuth.ts` – `requireAdmin`, `checkAdminStatus`; used for `/api/admin/*`, audit logs, some settings, referral CRUD (together with clinical access where applicable).
- **Super admin:** `requireSuperAdmin` – `/api/super-admin/*` and Super Admin UI (`/super-admin`).

## Client enforcement

| Mechanism | File(s) | Purpose |
|-----------|---------|---------|
| Route guard for PHI pages | `client/src/components/RequireClinicalAccess.tsx` | Toast + redirect for blocked clinical routes |
| Route guard for Ambulance & EMS | `client/src/components/RequireAmbulanceAccess.tsx` | Toast + redirect; uses `hasAmbulanceModuleAccess` in `client/src/routes.ts` |
| Wrapped routes | `client/src/App.tsx` | Patients, patient details, appointments, records, medical visit; `/ambulance` and `/ambulance/units/:id` (dashboard is open to authenticated users) |
| Clinical role helper | `client/src/routes.ts` – `hasClinicalAccess`, `CLINICAL_ACCESS_ROLES` | Aligns with server rules |
| Ambulance module roles | `client/src/routes.ts` – `AMBULANCE_MODULE_ROLES`, `hasAmbulanceModuleAccess` | Mirrors server `server/shared/middleware/ambulanceAuth.ts` |
| Sidebar | `client/src/config/sidebarConfig.tsx` | Links are visible; route/API guards still enforce access |
| Mobile bottom nav | `client/src/components/MobileNav.tsx` | Links remain visible; blocked destinations show guard feedback |
| Admin / Super Admin | `client/src/components/RequireRole.tsx`, `client/src/routes.ts` – `ROLE_ROUTES`, `hasRoleFor` | Admin vs super_admin only |

## Login redirects

- **Server session payload:** `server/modules/auth/staffAuth.service.ts` – `redirectTo`: `super_admin` without tenant → `/super-admin`; `safety_officer` → `/operational-duties`; others → `/dashboard`.
- **Client login:** `client/src/pages/AuthPage.tsx` – `getPostLoginPath` uses `getPostLoginHome` (`client/src/routes.ts`): `emt` with a tenant → `/ambulance`; other non-clinical roles → `/operational-duties`; clinical/super_admin (client definition) → `/dashboard` unless a `returnTo` applies.

## Ambulance & EMS (API)

**Server:** `requireAmbulanceModuleAccess` in `server/shared/middleware/ambulanceAuth.ts` – allowed roles: `emt`, `medical_staff`, `admin`, `super_admin`; requires `tenantId`. Applied to fleet and pre-start routes in `server/modules/ambulances/ambulances.routes.ts`.

## Adding a new PHI-heavy feature

1. Add **`requireClinicalAccess`** to new API routes (after `authMiddleware`).
2. Use **`allowedRoles`** (or an explicit allow-list) in the sidebar; do **not** rely on `minRole` alone for PHI.
3. Wrap new pages with **`RequireClinicalAccess`** (or `RequireRole` for admin-only tools).
4. Update this document and, if relevant, **`docs/API_DOCUMENTATION.md`**.

## Scaling RBAC (recommended next step)

Current RBAC is role-based with some special-case middleware. As the HMS grows, move to **permission-based access control** (RBAC + fine-grained permissions).

### Roles to consider as you scale

| Proposed role | Why it helps | Typical permissions |
|---|---|---|
| `clinic_manager` | Separate operational management from full tenant admin | Read clinical dashboards, approve workflows, limited config; no tenant-level user admin by default |
| `occupational_physician` | Distinguish doctor-level actions from general clinical staff | Diagnose/clearance decisions, certify return-to-work, approve sensitive notes |
| `nurse_or_paramedic` | Narrow day-to-day clinical operations | Triage/vitals/encounter notes, no high-trust disposition approvals |
| `pharmacist_or_storekeeper` | Inventory and dispensing segregation of duties | Inventory CRUD/dispense, no patient record browsing beyond dispense context |
| `compliance_auditor` (read-only) | Internal/external audit needs | Read-only access to audit logs and compliance reports, no edit/delete |
| `report_viewer` / `executive_viewer` | Leadership visibility without operational privileges | Aggregated dashboards and reports only (no PHI detail) |
| `company_hr_case_manager` (limited) | Employer-side follow-up collaboration | See redacted incident/case status for their company; no patient identity |

### Ambulance module role suggestions (intended usage)

These roles are recommended if you want finer control than the current broad Ambulance module allow-list (`emt`, `medical_staff`, `admin`, `super_admin`).

| Proposed role | Intended day-to-day usage | Recommended permissions |
|---|---|---|
| `fleet_manager` | Own ambulance register quality and operational metadata | `ambulance.fleet.read`, `ambulance.fleet.create`, `ambulance.fleet.update`, `ambulance.fleet.delete`, `ambulance.prestart.read` |
| `ems_shift_lead` | Shift-level control for one active unit/team | `ambulance.prestart.create`, `ambulance.prestart.read`, `ambulance.transfers.receive`, `ambulance.stock.read`, optional `ambulance.transfers.request` |
| `ambulance_storekeeper` | Handle restock, reconciliation, and on-board stock accuracy | `inventory.ambulance.read`, `inventory.ambulance.adjust`, `stock_transfers.create`, `stock_transfers.dispatch`, `stock_transfers.receive` (ambulance-scoped) |
| `dispatch_coordinator` | Coordinate where units are stationed/deployed, not clinical notes | `ambulance.fleet.read`, `ambulance.status.update`, `ambulance.assignment.manage`, no PHI permissions by default |
| `ems_observer` (read-only) | Supervisors/auditors reviewing readiness without making changes | `ambulance.fleet.read`, `ambulance.prestart.read`, `inventory.ambulance.read`, `stock_transfers.read` |

Implementation guidance:
- Prefer **permission flags** over many hardcoded role checks.
- Scope ambulance permissions by `location_kind = ambulance` where possible.
- Keep PHI access separate (do not imply patient/clinical access from ambulance operational roles).

### Permission model to introduce later

- Define permissions like `patients.read`, `incidents.read_redacted`, `incidents.update`, `inventory.dispense`, `users.manage`, `audit.read`.
- Map roles -> permissions in DB (not hardcoded arrays).
- Support tenant-specific custom roles (e.g., one site’s “HSE Lead”).
- Add field-level scopes (`incident.patient_identity.read`) for explicit PHI controls.
- Add policy tests for each permission edge (especially redaction paths).

## Related files (quick index)

| Concern | Location |
|---------|----------|
| Clinical middleware | `server/shared/middleware/clinicalAuth.ts` |
| Employee wellbeing middleware | `server/shared/middleware/wellbeingAuth.ts` |
| Admin middleware | `server/shared/middleware/adminAuth.ts` |
| Route registration | `server/routes/index.ts`, `server/routes.ts` |
| Client route roles | `client/src/routes.ts` |
| Sidebar RBAC filter | `client/src/config/sidebarConfig.tsx` – `getFilteredSidebarGroups` |
| Incident PHI redaction (safety) | `server/shared/incidentSafetyRedaction.ts`, `server/modules/incidents/incidents.routes.ts` |
| Incident UI labels (safety) | `client/src/lib/incidentSafetyDisplay.ts`, `client/src/pages/Incidents.tsx` |
