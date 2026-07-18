# MineAid HMS - Implementation Status

## Overview
Multi-tenant healthcare management system for mining operations with complete tenant isolation, dual authentication, comprehensive CRUD operations, system-wide audit logging, and advanced Super Admin capabilities. Features hierarchical architecture: Super Admin → Tenants (Mining Sites) → Companies (Contractors) → Employees → Users (Medical Staff) → Patients.

**Version**: 4.34.0 | **Last Updated**: July 1, 2026

## Database tooling & portal marketing (4.34.0)

**Schema:** [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md) — `db:drizzle-migrate`, `db:drizzle-baseline`, `db:generate`.  
**Seeds:** `npm run db:seed` (notification types, staff prefs, portal defaults).

### Drizzle journal
- `drizzle/0000_patient_id_function.sql`, `0001_initial_schema.sql`, incremental `0002+`.
- Legacy `migrations/*.sql` archived to `migrations/_archive/legacy_upgrades/`.
- `.env` only for server, drizzle-kit, and migration scripts.

### Portal & public UX
- Portal marketing: signed-in patients see “Go to dashboard” on `/portal`; no auto-redirect from `?signin=1`.
- Public/staff links to `/portal` instead of `/portal?signin=1`.
- Portal marketing display headings use accent color.

## What's New & portal UX (4.33.0)

**Run two June 2026 migrations if not yet applied** — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

### What's New (in-app release notes)
- Curated staff + portal dialogs on sign-in; server-tracked `last_acknowledged_release_version`.
- `GET/POST /api/release-notes/*` and `/api/portal/release-notes/*`.
- Curated copy in `shared/curatedReleaseNotes.ts`.

### Portal UX
- Mobile hamburger → full sidebar sheet (`PortalMobileSidebar`, `PortalSidebarContent`).
- Headings use Outfit (display); body Jakarta Sans; larger `PortalPageHeader` titles.

## Portal notification preferences & UX polish (4.32.0)

### Portal notification preferences
- Per-channel opt-in/out for appointment emails, secure message email alerts, and in-app message alerts.
- `GET/PUT /api/portal/notification-preferences`; Settings card on portal profile.

### Portal UX
- Teal primary actions; multi-color quick-access cards; sidebar spacing; Appointments nav active-state fix.
- Care contact card on portal home; shared `DashboardGreeting` on portal home and staff dashboard.

### Public site & feedback
- Public header: Features nav, removed Security/Changelog/duplicate portal sign-in.
- Feedback widget: vertical tab fixed to right edge.

### Dependencies
- `@vercel/blob` ^2.4.1; `undici` >=6.27.0 (npm audit clean).

## Portal access requests & messaging defaults (4.31.1)

**Run two additional June 2026 migrations** — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

### Portal access
- Email lookup (portal account + employee on file + patient-linked portal account).
- `portal_access_requests` queue; admin approve/reject in Settings; `portal_access_request` notifications.
- Explicit magic-link / access-request feedback; suspend/reactivate portal accounts.

### Portal messaging
- Messaging feature **on by default** (opt-out); migration backfill for active portal tenants.

## Patient portal style system & UX (4.31.0)

**Run five additional June 2026 migrations** — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

### Portal UI
- Isolated CSS bundle (`portal/styles/*`, `bootstrap.ts`); `.portal-root` boundary; teal tokens; marketing landing; desktop sidebar.
- Appointment request modal (multi-step, time blocks); portal vitals; work fitness & medication declarations.
- Email-only access request on login.

### Telecare in-call polish
- Fullscreen light shell; visit meta in context **Appt** tab; inline session time banners; messaging tab layout fixes.
- **Docs:** [PORTAL_STYLES.md](./PORTAL_STYLES.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md).

### Appointments
- Confirmation party; staff/portal reschedule with notifications.

### Wellbeing
- `/wellbeing` hub (replaces Our People).

### Patient ID
- `generate_patient_id()` sequence sync + retry on duplicate key.

### Dependencies
- nodemailer 9.0.1.

## Secure messaging — rich text, SMS, offline (4.30.0)

No new SQL migrations.

### Rich text
- Optional **Plain text** / **Rich text** composer; server HTML allowlist (`messagingHtml.ts`); tables and underline supported in thread view.

### SMS alerts
- `message_received` via notification **sms** channel + Twilio; no PHI in SMS body.

### Offline messaging
- IndexedDB cache + outbox; read/send while offline; sync on reconnect.
- **Docs:** [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md), [OFFLINE_MODE_AND_SYNC.md](./OFFLINE_MODE_AND_SYNC.md).

## Appointments UX, no-show fix & telecare polish (4.29.0)

Patch/minor follow-up to 4.28.0. **No new SQL migrations.**

### Staff appointments page
- List + calendar only; today's queue and paginated full record in **separate side-by-side cards**.
- Server-paginated `GET /api/appointments?page=…` (20 rows/page default).

### Telehealth attendance
- **Fix:** Staff-scheduled telehealth visits that nobody joined now end as **no_show** (not **completed**) when reconcile runs after slot end + grace.
- Session **extend** API (+15/+30 min) and in-call time-up UX; no-show grace default **15 min after slot end**.

### Telehealth hub & messaging
- Queue spotlight (up next / live); `created_at` desc sort on appointments and telecare queue.
- In-call messaging: auto-assign clinician thread, consent accept step.

### Dev
- esbuild 0.28+ / Vite dev fix for local `npm run dev`.

## Telehealth UX, messaging & appointment sync (4.28.0)

Major release since 4.27.0. **Run four additional June 2026 migrations** — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

### Telehealth in-call & hub
- **Room:** 3-column layout (video, embedded encounter doc, context/health); patient consent; join window to `scheduled_end`; scheduled-end warnings; staff encounter modal with auto-join.
- **Hub:** `/telecare` — Today / Upcoming / Live / Recent / History tabs, summary stats, filters, **Schedule video visit** modal.
- **Sync:** `telecare-appointment-sync.service.ts` — appointments ↔ sessions ↔ portal requests ↔ encounters.
- **Docs:** [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md), [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md).

### Secure messaging
- Staff `/messages`, portal `/portal/messages`, SSE streams, context threads (appointment/encounter/telecare), in-call messaging panel.
- **Doc:** [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md).

### Portal
- Request status reflects visit outcomes (`completed`, `no_show`, `cancelled`).
- Portal notifications feed in header.

## Encounter-first model, telehealth, portal & interop (4.27.0)

Major release since 4.26.1. **Run all June 2026 migrations before deploy** — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) and [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md).

### Encounter-first clinical workflow
- **DB:** `medical_visits` → **`encounters`**; modality, pathway, lifecycle timestamps; nullable complaint/disposition until discharge.
- **API:** **`/api/encounters/*`** — open, discharge, cancel, edit header, list, active lookup. Pathways in `shared/encounterPathways.ts`.
- **UI:** Medical Visit refactor; DischargeEncounterModal; EditEncounterModal; Records/PatientDetails slimmed.
- **Guards:** Triage/vitals require active encounter where configured.
- **Docs:** [ENCOUNTER_FIRST_MODEL.md](./ENCOUNTER_FIRST_MODEL.md), [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md), [ENCOUNTER_SCHEMA_MIGRATION.md](./ENCOUNTER_SCHEMA_MIGRATION.md).

### Telehealth (LiveKit + Teams)
- **Providers:** `TELEHEALTH_PROVIDER=livekit` (default) or `teams`; UI copy and join flow match provider.
- **Routes:** Staff `/telecare`, `/telecare/:sessionId`; portal `/portal/visits/:sessionId/join`.
- **Backend:** `server/modules/telecare/` — LiveKit tokens, Teams Graph, join window, queue; session expiry via **in-memory timers** + hourly backup cron (**4.35.1**).
- **Docs:** [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md), [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md).

### Patient portal expansion
- Appointment confirm/decline/cancel; appointment requests; vitals trends/detail; telecare join from Home/Appointments.
- **Doc:** [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md).

### Appointments & notifications
- Calendar/table UI; PATCH updates; conflict detection; telehealth session provisioning; event notifications; hourly no-show cron; telecare expiry backup cron hourly at `:15`.
- **Doc:** [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md).

### FHIR interoperability
- Staff FHIR read; interop partners; care-transfer bundles; `/interop` admin UI.
- **Doc:** [FHIR_INTEROPERABILITY_FLOWS.md](./FHIR_INTEROPERABILITY_FLOWS.md).

### Vitals & glucose
- mmol/L storage; fasting/random context; triage vitals-at-triage; trend charts and detail pages.

### Incidents
- Close dialog; drill/simulation flag; reports exclude drills from operational counts.
- **Doc:** [INCIDENT_STATUS_LIFECYCLE.md](./INCIDENT_STATUS_LIFECYCLE.md).

## Auth module rename & MFA login fix (4.26.1)

- **Backend:** `customAuth` removed; **`AuthService`**, **`authMiddleware`**, **`auth.schemas.ts`**, **`auth.constants.ts`** under `server/modules/auth/`. See [AUTH_SYSTEM.md](./AUTH_SYSTEM.md) terminology table.
- **MFA at login:** Only when tenant **`require_mfa`** is true (Profile enrollment alone no longer forces MFA prompt when org MFA is off).
- **UX:** Location modal card hover; staff/portal auth cross-links; Tailwind `mineaid-*` colors; `.local/` gitignored.

## Session security, tenant MFA & expiry warnings (4.26.0)

- **Policy storage:** `tenant_security_settings` — staff/portal session timeouts, optional `require_mfa`, configurable expiry warning lead (`session_warning_lead_minutes`). Admin: **Settings → Security**. Doc: [SESSION_SECURITY_AND_MFA.md](./SESSION_SECURITY_AND_MFA.md).
- **Staff MFA:** TOTP via `otplib`; login/OIDC gate (`MfaAuthPanel`); profile enrollment (`MfaProfileCard`); APIs `/api/auth/mfa/*`, `/api/admin/security-settings`.
- **Session enforcement:** idle + absolute limits on every authenticated request; separate staff (`sessionToken`) and portal (`portalSessionToken`) cookies.
- **Client expiry UX:** `SessionTimeoutWarning` — circular countdown, keepalive, blocking session-ended modal; wired in `MainLayout`, `SuperAdminLayout`, `PortalLayout`.
- **Migrations:** `20260531_02_session_security_and_mfa.sql`, `20260531_session_warning_lead.sql`.

## Patient portal — magic link & welcome email (4.26.0)

- **Magic link:** primary sign-in on `/portal/login`; `portal_magic_login_tokens`; `portal-auth.service.ts`; migration `20260531_01_portal_magic_login_tokens.sql`.
- **Welcome email:** sent on portal account create with magic link + password backup; Resend/Gmail send path fixed in `notificationService.ts`.
- **Discovery links:** public header/footer, landing, and `/auth` link to patient portal.
- **Doc:** [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md) implementation notes updated.

## Overview reports — `/reports/overview` (4.26.0)

- **Route / UI:** `client/src/pages/reports/OverviewReportsPage.tsx` — executive KPI snapshot with role-aware sections; hub entry in `ReportsHome.tsx`.
- **API:** `GET /api/reports/overview` — `overview-reports.service.ts`, `overview-reports.routes.ts`.
- **Doc:** [REPORTS_OVERVIEW_MODULE_PLAN.md](./REPORTS_OVERVIEW_MODULE_PLAN.md) status updated to implemented (R-OVR-1 baseline).

## UX — working location modal (4.26.0)

- **LocationSelectionModal:** compact card picker (name, code, badges); last-used one-click confirm; icons and hover shadow; verbose location details removed.

## Compliance reports — `/reports/compliance` (4.25.0)

- **Route / UI:** `client/src/pages/reports/ComplianceReportsPage.tsx` — filters (`from`/`to`, `groupBy`, shift-location scope, optional audit action/resource-type lists), KPI row (audit totals/actors/delete+failed-auth, SOP posture, signed legal uploads), audit trend chart, breakdown tables (resource/action/high-signal actions/top actors/SOP status), CSV exports, print styling, and exception alerts.
- **Access:** `RequireComplianceReportsAccess` + `hasComplianceReportsAccess` — tenant **`admin`** and **`super_admin`** (impersonation); see `server/shared/middleware/complianceReportsAuth.ts`.
- **API:** `GET /api/reports/compliance` — `compliance-reports.service.ts`, `compliance-reports.routes.ts`; tenant/date-scoped aggregates from `audit_logs`, SOP, and signed legal docs with optional `auditActions` / `auditResourceTypes` narrowing.
- **Shared KPI helper:** `server/modules/reports/shift-handover-ack-summary.ts` reused by compliance and operations for shift report acknowledgment summary consistency.
- **Performance:** migration `migrations/20260421_audit_logs_tenant_created_at.sql` adds `idx_audit_logs_tenant_created_at`; index mirrored in `shared/schema.ts`.

## Notifications center — `/notifications` (post-4.25.0 update)

- **Route / UI:** `client/src/pages/NotificationsPage.tsx` with channel tabs (`all`, `incident`, `equipment`, `staff`, `system`), unread-only toggle, limit handling, read/unread visual state, mark-one-read, mark-all-read (scoped by channel), and deep links to linked records where available.
- **Entry points:** `NotificationBell` replaces placeholder bells in `Header` and `MainLayout`; dashboard/sidebar includes `Notifications` item (`/notifications`) with unread badge.
- **API additions:** `GET /api/notifications` now accepts `limit` + `unreadOnly`; `GET /api/notifications/unread-count` accepts optional `channel`; new `PUT /api/notifications/read-all` supports optional channel filter.
- **Storage/service behavior:** read actions now update both `readAt` and `status='read'`; unread counting treats notifications without `readAt` and not `status='read'` as unread.
- **Alert recipient behavior (incident category):** incident notifications include active `safety_officer` users by default (fallback active admins if no candidates). If users have no preference rows for the incident type, defaults to `email` + `in_app`; explicit disabled rows remain opt-out. Test coverage updated in `server/__tests__/notification-preferences.test.ts`.

## Operations reports — `/reports/operations` (4.24.0)

- **Route / UI:** `client/src/pages/reports/OperationsReportsPage.tsx` — filters (date range, `groupBy`, locations, ticket categories/statuses/priorities, **assignees + requesters**, duty catalog, duty assignment statuses, duty shifts, shift-report shifts, only-with-issues, **compare prior period**), **saved views** (local storage), KPI row (with optional prior-period hints), charts (tickets/duties/shift reports over time, status pie, priority bar, aging buckets, link-type mix), **assignee workload** table, **duties by duty** and **by category** tables, duties-by-location table, CSV exports (aging, ticket breakdowns, duty-by-location, assignee workload, duties by duty/category), print via `ClinicalReportsPrintStyles` + `clinical-reports-print` body class.
- **Access:** `RequireOperationsReportsAccess` + `hasOperationsReportsAccess` — tenant **`admin`** and **`super_admin`** (impersonation); see `server/shared/middleware/operationsReportsAuth.ts`.
- **API:** `GET /api/reports/operations` — `operations-reports.service.ts` (incl. **`comparePriorPeriod`**, **`tables.ticketsByAssignee`**, **`tables.dutiesByDuty`**, **`tables.dutiesByCategory`**), `operations-reports.routes.ts`.
- **Resume after prod validation:** **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md` §8.0** / **§8.2** — optional **`ticket_activity`**, ack KPI validation under multi-ack, performance indexes, broader roles.

## Incident reports — `/reports/incidents` (4.23.0 production release; 4.23.1 visualization polish)

- **Route / UI:** `client/src/pages/reports/IncidentReportsPage.tsx` — production-focused incident analytics dashboard with filter bar, saved views, KPI cards, trends, severity/type/status mixes, top care locations, top incident sites, company metrics table, company×location table, incidents-by-day×post matrix, type×severity table, CSV exports, print/PDF styling, and optional paginated identifier-safe detail.
- **4.23.1 UI polish:** severity pie chart, top-care-locations donut chart, and dedicated detained-at-FAP by location chart + right-column table (against total incidents).
- **Access / navigation:** UI guards `RequireIncidentReportsAccess` and `RequireReportsHubAccess`; reports hub + sidebar now include incidents with role-aware visibility (`client/src/pages/reports/ReportsHome.tsx`, `client/src/config/sidebarConfig.tsx`).
- **API:** `GET /api/reports/incidents` — `server/modules/reports/incident-reports.service.ts`, `incident-reports.routes.ts`; tenant-scoped aggregate queries with filters (`from/to/groupBy/location/company/severity/type/status`), prior-period replay, optional detail payload, unknown bucket handling.
- **4.23.1 data shape:** top-care-location rows include `detainedCount` and `detainedRate` for detained-location analysis.
- **Auth middleware:** `server/shared/middleware/incidentReportsAuth.ts`; route registration wiring in `server/routes.ts` and `server/routes/index.ts`.
- **Docs:** [REPORTS_INCIDENTS_MODULE_PLAN.md](./REPORTS_INCIDENTS_MODULE_PLAN.md), [REPORTS_COMPREHENSIVE_MODULE_PLAN.md](./REPORTS_COMPREHENSIVE_MODULE_PLAN.md), [CHANGELOG.md](./CHANGELOG.md) `## [4.23.0]`, `## [4.23.1]`.

## Clinical reports — `/reports/clinical` (4.21.0 baseline; **4.22.0** R-CLIN-3/4; **4.22.1** guide UX)

- **Route / UI:** `client/src/pages/reports/ClinicalReportsPage.tsx` — KPI row, charts (visits over time, disposition mix, detention pie, operational continuity, visit/triage panels, top locations, visit type × disposition, incidents per post table + donut, visits by company stack, metrics-by-company table, cases-per-post-by-day matrix). **Optional visit-level detail table** and **prior-period KPI compare** (**4.22.0**). **Ambulance usage** block: summary, **`tables.ambulanceByClinic`** bar/tables, by-source breakdown (**4.22.0**). **How to use this page** card: **collapsible**, **closed by default**; hidden when printing (**4.22.1**). **CSV** exports (by company, breakdown bundle, cases matrix); **Print / Save as PDF** (`ClinicalReportsPrintStyles`, `clinical-reports-print` print CSS in `client/src/index.css`). Requires clinical access (`RequireClinicalAccess`).
- **API:** `GET /api/reports/clinical` — `server/modules/reports/clinical-reports.service.ts`, `clinical-reports.routes.ts`; aggregates visits, triage, incidents (tenant + date + location + company filters). Response includes `tables.casesByDayByPost`, `tables.incidentsPerPost`, `tables.companyByLocation`, `tables.ambulanceByClinic` (**4.22.0**), `includeDetail` rows when permitted, `comparePriorPeriod` replay, expanded `series` and KPIs.
- **Docs:** [REPORTS_CLINICAL_MODULE_PLAN.md](./REPORTS_CLINICAL_MODULE_PLAN.md), [REPORTS_COMPREHENSIVE_MODULE_PLAN.md](./REPORTS_COMPREHENSIVE_MODULE_PLAN.md). Optional **performance** tuning deferred until profiling.

## OIDC sign-in — Google & Microsoft (4.19.0+)

- **Implementation:** `openid-client`; `server/modules/auth/oidc.service.ts`, `oidc.routes.ts`; mounted from `auth.routes.ts`. PKCE/state/nonce in `express-session` (`server/types/express-session.d.ts`).
- **Routes:** `GET /api/auth/oidc/google/start`, `.../google/callback`, `GET /api/auth/oidc/microsoft/start`, `.../microsoft/callback`.
- **Data:** `users.oauth_issuer`, `users.oauth_sub`; migration `migrations/20260405_users_oauth_oidc.sql`. Storage: `getUserByOidcSubject`, `getUserByEmailNormalized`. `AuthService.completeOidcLogin` — invite-only (existing user or link by email); optional `OIDC_ALLOWED_EMAIL_DOMAINS`.
- **UI:** `AuthPage` — Continue with Google / Microsoft; OIDC error query → toast.
- **Config:** `GOOGLE_OIDC_*`, `MICROSOFT_OIDC_*`, `MICROSOFT_OIDC_TENANT` in `server/config/env.ts` and `.env.example`.
- **Status:** **Google** validated when credentials and redirect URIs are set. **Microsoft** — validated **locally** with personal MSA (`common` + Entra `microsoft/callback` URIs + manifest fixes); each deployed origin still needs its own **`/api/auth/oidc/microsoft/callback`** in Entra; restrictive orgs may require admin consent. See [OIDC_LOGIN_PLAN.md](./OIDC_LOGIN_PLAN.md).

## Super Admin impersonation, legal hub & signed documents (4.18.0)

- **Impersonation:** Global super admin starts/ends session as tenant user; `user_sessions.impersonator_user_id` / `impersonation_started_at`; `impersonation_events` table; audit logs carry impersonator in details. API: `POST /api/super-admin/impersonation/start`, `POST /api/super-admin/impersonation/end`, `GET /api/super-admin/impersonation-events`, `GET /api/super-admin/impersonation-audit-logs`, `GET /api/super-admin/impersonation-events/:eventId/audit-logs`. UI: `ImpersonationBanner` in `MainLayout`, `/super-admin/impersonation-log`. Migration: `20260404_super_admin_impersonation.sql`. Doc: [IMPERSONATION.md](./IMPERSONATION.md).
- **Public legal:** `/legal`, `/legal/:docId`; `GET /api/legal/documents`, `GET /api/legal/document/:id`, `GET /api/legal/document/:id/raw`; markdown sources in `docs/` (commercial agreement, DPA, BAA template, subprocessors).
- **Signed legal uploads:** `tenant_signed_legal_documents`; tenant UI `/admin/legal-agreements` (MainLayout); super-admin `/super-admin/signed-legal-documents`; APIs under `/api/admin/legal-signed-documents` and `/api/super-admin/legal-signed-documents`. Migration: `20260404_tenant_signed_legal_documents.sql`.
- **System console pages:** `/super-admin/system-status`, `/super-admin/security`, `/super-admin/audit`, `/super-admin/integrations`, `/super-admin/billing` with `GET /api/super-admin/system-status`, `global-audit-logs`, `integrations-status`. Spec: [SUPER_ADMIN_SYSTEM_CONSOLE.md](./SUPER_ADMIN_SYSTEM_CONSOLE.md).
- **Auth registration:** Custom register requires `acceptTermsAndPrivacy`; `AuthPage`, `Privacy`, `Terms` aligned.

## Super Admin — UMA Obuasi pitch (4.17.0)

- **Deck:** `/super-admin/pitch-uma-obuasi` — UMA (Underground Mining Alliance) contractor / First Aider narrative. `pitchDeckUmaObuasiData.ts`, `SuperAdminPitchDeckUmaObuasi.tsx`.
- **Narrative:** `docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md` (appendix speaker notes). Cross-link: `docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md`.

## Super Admin commercial collateral (4.16.0)

- **Pitch decks (super admin):** `/super-admin/pitch` (features), `/super-admin/pitch-why` (Start With Why), `/super-admin/pitch-uma-obuasi` (UMA Obuasi — **4.17.0**), `/super-admin/pitch-aga-obuasi` (AGA Obuasi mine). Implementation: `PitchDeckShell.tsx`, `PitchSlideBody.tsx`, `pitchDeckData.ts`, `pitchDeckV2Data.ts`, `pitchDeckUmaObuasiData.ts`, `pitchDeckAgaObuasiData.ts`, `pitchDeckTypes.ts`.
- **Print / PDF–friendly pages:** `/super-admin/concept-note` and `/super-admin/business-proposal` render canonical markdown from `docs/MINEAID_ENTERPRISE_CONCEPT_NOTE.md` and `docs/MINEAID_BUSINESS_PROPOSAL.md`; shared print pipeline in `client/src/lib/superAdminPrintDocument.ts`, `SuperAdminPrintDocumentStyles.tsx`, `ensureSourceSans3.ts`, and `.super-admin-print-document` in `client/src/index.css`.
- **Stakeholder narrative docs:** `docs/MINEAID_PITCH_DECK_V2_START_WITH_WHY.md`, `docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md`, `docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md`.

## Tenant SOP, patient portal & product changelog (4.15.0)

- **SOP:** Published library and admin authoring (`/sop`, `/admin/sops`); versioned HTML + approval; migrations `migrations/20260403_*`. Details: [SOP_MODULE_IMPLEMENTATION.md](./SOP_MODULE_IMPLEMENTATION.md).
- **Patient portal / health profile:** Extended patient fields; portal users and settings; migrations `20260402_*`; `server/modules/portal`. Details: [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md).
- **Changelog page:** `/changelog`, `GET /api/changelog` from `docs/CHANGELOG.md`.

## Authentication System Implementation ✅ COMPLETE

### Authentication architecture
- **Staff auth**: Email/phone + password (`AuthService` in `server/modules/auth/auth.service.ts`, `user_sessions`, secure cookies)
- **OIDC (optional)**: Google and Microsoft sign-in when env credentials are set (`openid-client`, invite-only linking); see [OIDC_LOGIN_PLAN.md](./OIDC_LOGIN_PLAN.md)
- **Middleware**: `authMiddleware` (`createAuthMiddleware` in `auth.middleware.ts`) validates session tokens for API routes

### Staff authentication features
- [x] User registration with email or phone number
- [x] Secure password hashing with bcrypt (12 salt rounds)
- [x] Session management with secure tokens
- [x] Email verification system (mock implementation ready for real service)
- [x] Password reset functionality
- [x] Phone verification support (mock implementation ready for SMS service)
- [x] Comprehensive validation with Zod schemas
- [x] Security features: token expiration, attempt limiting, secure cookies

### Multi-Tenant Database Schema ✅ COMPLETE
- [x] **Hierarchical Tenant Architecture**: super_admin → tenants → companies → employees → users → patients
- [x] **Complete Tenant Isolation**: All tables include tenant_id with cascading foreign keys
- [x] **Admin Management**: notifications, user approval workflow, role management
- [x] **Super Admin System**: Global tenant management with plan assignment capabilities
- [x] **Staff authentication**: user_sessions, email_verifications, password_resets
- [x] **Medical Operations**: patients, appointments, medical_visits, medical_records, incident_reports
- [x] **Employee Integration**: Automatic employee creation with unique employee numbers
- [x] **Data Integrity**: Bulletproof tenant isolation preventing cross-tenant access

### API Endpoints
- [x] `POST /api/auth/register` - User registration
- [x] `POST /api/auth/login` - User login
- [x] `POST /api/auth/logout` - Universal logout
- [x] `POST /api/auth/verify-email` - Email verification
- [x] `POST /api/auth/forgot-password` - Password reset request
- [x] `POST /api/auth/reset-password` - Password reset execution
- [x] `GET /api/auth/user` - User profile (session token)
- [x] `GET /api/auth/oidc/google/start` / `callback` - Google OIDC (when configured)
- [x] `GET /api/auth/oidc/microsoft/start` / `callback` - Microsoft OIDC (when configured)

### Frontend Implementation
- [x] Comprehensive AuthPage with login/register forms
- [x] Form validation with react-hook-form and Zod
- [x] Toast notifications for user feedback
- [x] Responsive design with mobile support
- [x] Brand-consistent styling with MineAid colors
- [x] Integration with existing Landing page
- [x] Hybrid routing for authenticated/unauthenticated users

## 🔐 Super Admin System ✅ COMPLETE

### Global Tenant Management
- [x] **Super Admin Authentication**: Secure password-based access ("superadmin123")
- [x] **Tenant CRUD Operations**: Complete tenant lifecycle management (create, read, update, delete)
- [x] **Tenant Plan Management**: Basic/Premium/Enterprise plan assignments with real-time updates
- [x] **Tenant Status Control**: Active/Suspended/Inactive status management with notifications
- [x] **Automated Tenant Creation**: Streamlined tenant and admin user creation workflow

### Advanced Administrative Controls
- [x] **Tenant Administrator Management**: Full CRUD operations for tenant admins
- [x] **User Management**: Complete user management across all tenant organizations
- [x] **Approval Workflows**: Tenant admin approval system with email notifications
- [x] **Bulk Operations**: Mass approval and management capabilities
- [x] **Cross-Tenant Visibility**: System-wide statistics and monitoring dashboards

### Professional Email Integration
- [x] **Gmail SMTP Integration**: Seamless email service using existing configuration
- [x] **Welcome Email System**: Professional branded welcome emails for approved entities
- [x] **Notification Pipeline**: Comprehensive email notifications for all admin actions
- [x] **Template Consistency**: Unified MineAid HMS branding across communications
- [x] **Fallback Logging**: Console logging when email credentials unavailable

### Enhanced Audit & Security
- [x] **Super Admin Audit Trail**: Complete logging of all Super Admin operations
- [x] **Security Monitoring**: Comprehensive access logging with debug information
- [x] **Compliance Ready**: Full regulatory compliance tracking
- [x] **Action Tracking**: Plan changes, status updates, and administrative actions logged
- [x] **Multi-Level Security**: Environment variable fallbacks with secure defaults

### Commercial collateral (pitch decks & print documents) — 4.16.0+
- [x] **Fullscreen pitch decks**: `/super-admin/pitch`, `/super-admin/pitch-why`, `/super-admin/pitch-uma-obuasi` (4.17.0), `/super-admin/pitch-aga-obuasi` with shared shell and keyboard/fullscreen UX.
- [x] **Enterprise print pages**: `/super-admin/concept-note`, `/super-admin/business-proposal` with shared print styles and Source Sans 3 for output fidelity.
- [x] **Navigation**: `superAdminNav` Commercial section entries for all routes above.

## Core Features Status

### Ambulance & EMS Module ✅ COMPLETE (Phase 1)
- [x] Standalone Ambulance & EMS module with tabs for fleet, pre-start, and on-board inventory.
- [x] Ambulance fleet register (CRUD), stationing metadata, operational status tracking.
- [x] Ambulance unit detail page with Overview, On-board stock, Movements, and Transfers tabs.
- [x] On-board inventory management via ambulance-scoped inventory mode.
- [x] Transfer receive action from ambulance Transfers tab for inbound in-transit stock.
- [x] EMT role support and ambulance module route/API guards.

### Multi-Tenant Architecture ✅ COMPLETE
- [x] **Tenant Hierarchy**: MineAid Admin → Tenants → Companies → Employees → Users → Patients  
- [x] **Complete Data Isolation**: All operations filtered by tenantId
- [x] **Admin Panel**: Comprehensive tenant and user management with approval workflow
- [x] **User Invitation System**: Email-based invitations with automatic tenant association
- [x] **Role Management**: Real-time role changes with professional email notifications
- [x] **Employee Integration**: Automatic employee record creation for seamless patient operations
- [x] **Notification System**: Comprehensive alert and approval workflow management
- [x] **Email System**: Professional branded templates using Gmail SMTP (cost-effective)

### Patient Management ✅ COMPLETE
- [x] Patient registration and profiles
- [x] Medical history tracking
- [x] Department assignment (extraction, processing, maintenance, safety, administration)
- [x] Status management (active, cleared, follow_up, incident, inactive)
- [x] Medical clearance tracking
- [x] Employee ID integration
- [x] Search and filtering capabilities

### Appointment Scheduling ✅ COMPLETE
- [x] Appointment creation and management
- [x] Multiple appointment types (routine checkup, incident follow-up, pre-employment medical, fitness for duty)
- [x] Status tracking (scheduled, confirmed, completed, cancelled, no_show, in_progress)
- [x] **CRUD Operations**: Full 3-dots menu functionality (create, read, update, delete)
- [x] **Status Management**: Complete appointment lifecycle with reassignment capabilities
- [x] **Appointment Reassignment**: Ability to correct statuses (e.g., completed → no_show)
- [x] **Audit Logging**: Complete audit trail for all appointment operations
- [x] Date/time validation

### Medical Visit Documentation ✅ COMPLETE
- [x] Comprehensive examination forms with vitals tracking
- [x] Chief complaints and physical examination records
- [x] Treatment plans and work disposition decisions
- [x] **CRUD Operations**: Full 3-dots menu functionality (create, read, update, delete)
- [x] **Detailed Modal Views**: Comprehensive medical visit details with inline editing
- [x] **Audit Logging**: Complete audit trail for all medical visit operations
- [x] Work disposition tracking (fit for duty, restricted duty, unfit for duty)
- [x] **Disposition options**: Return to Work, Transferred to Hospital (with tenant referral facility dropdown), Transferred to Hospital (Other) with free-text facility name; see [REFERRAL_FACILITIES_AND_DISPOSITION.md](./REFERRAL_FACILITIES_AND_DISPOSITION.md)
- [x] **Referral facilities**: Tenant-scoped CRUD (Admin → Locations); API `/api/referral-facilities`; medical visits store `transfer_facility_id` or `transfer_facility_other`
- [x] **Items used / dispensed**: Section on visit form and in Records 3-dots menu; search-as-you-type item picker; modal for later entry; transactions scoped to visit and patient via backend validation

### Incident Reporting ✅ COMPLETE
- [x] Comprehensive incident tracking and management
- [x] Multiple incident types (injury, near miss, equipment failure, environmental)
- [x] Severity classification (minor, moderate, major, critical)
- [x] **CRUD Operations**: Full 3-dots menu functionality (create, read, update, delete)
- [x] **Status Management**: Complete incident lifecycle (open, investigating, closed)
- [x] **Audit Logging**: Complete audit trail for all incident operations
- [x] Witness tracking and follow-up management
- [x] **Items used / dispensed**: Section on new and edit incident forms; 3-dots row action opens items modal; search-as-you-type picker; transactions scoped to incident and patient (medical_visit_id forced null)

### Operational Duties ✅ COMPLETE

### Employee wellbeing Module ✅ COMPLETE
- [x] **Employee wellbeing hub**: Employee wellbeing module covering follow-ups (onsite + external care), employee Work fitness & medications, and feedback/surveys for treatment services, plus an overview dashboard for due follow-ups, medications with work impact, and recent feedback.
- [x] **Module-level RBAC**: Read/write middleware for Employee wellbeing; safety officers have read-only access (with work-impact-only restrictions for Work fitness & medications). UI enforces read-only behaviour for safety officers on follow-ups, medications, feedback, feedback poster sharing, and dashboard shortcuts.
- [x] **Follow-up reminders**: Daily digest email for follow-ups that are due or overdue and have not yet had a reminder sent, via the `follow_up_due` notification type and a 7:00 AM cron job.
- [x] **Detailed docs**: See `WELLBEING_MODULE_PLAN.md` (design/spec) and `WELLBEING_IMPLEMENTATION_STATUS.md` (module-level implementation status, RBAC, and notifications).
- [x] Daily operational task management and assignment
- [x] Priority-based duty scheduling and tracking
- [x] **CRUD Operations**: Full 3-dots menu functionality (create, read, update, delete)
- [x] **Assignment Management**: Complete duty lifecycle (pending, in_progress, completed)
- [x] **History Tracking**: Assignment history with completion tracking
- [x] **Audit Logging**: Complete audit trail for all duty operations
- [x] Due date management and priority classification

## 📊 Comprehensive Audit Logging System ✅ COMPLETE

### Database Schema
- [x] **audit_logs Table**: Complete audit logging schema with tenant isolation
- [x] **Tenant Isolation**: All audit logs include tenant_id for data separation
- [x] **Action Tracking**: INSERT, UPDATE, DELETE operations with old/new data
- [x] **User Tracking**: All actions linked to authenticated users
- [x] **Timestamp Precision**: All operations timestamped with timezone support

### Automatic Integration
- [x] **CRUD Middleware**: Systematic audit logging integrated into all database operations
- [x] **Change Tracking**: Complete old_data and new_data preservation
- [x] **Admin Operations**: Comprehensive audit logging for all admin actions
  - [x] User approval/rejection tracking (`admin_approve`)
  - [x] Role change operations (`admin_update_role`)
  - [x] User invitation audit trails (`admin_invite`)
  - [x] Employee initialization tracking (`admin_initialize`)
  - [x] Super admin approval operations (`admin_approve_admin`)
- [x] **Error Handling**: Enhanced error management with detailed audit logging
- [x] **Performance Optimization**: Indexes for efficient audit queries

### Audit Trail Interface
- [x] **Dedicated Audit Page**: Complete interface for viewing system-wide audit history
- [x] **Advanced Filtering**: Filter by table, action, user, date range
- [x] **Regulatory Compliance**: Complete audit trail for mining safety regulations
- [x] **Export Capabilities**: Data export for compliance reporting

## 🔄 System-Wide CRUD Operations ✅ COMPLETE

### Standardized 3-Dots Menu Interface
- [x] **Consistent UI**: Standardized dropdown interface across all modules
- [x] **Appointment CRUD**: Complete lifecycle management with status transitions
- [x] **Medical Visit CRUD**: Full operations with detailed modal views
- [x] **Incident Report CRUD**: Comprehensive operations with status tracking
- [x] **Operational Duty CRUD**: Assignment, completion, and history management

### Status Management Workflows
- [x] **Appointment Workflow**: scheduled → in_progress → completed (with reassignment)
- [x] **Incident Workflow**: open → investigating → closed
- [x] **Duty Workflow**: pending → in_progress → completed
- [x] **Validation Rules**: Server-side validation for status transitions

### Enhanced UI/UX Features
- [x] **Card Hover Effects**: Coral accent color hover states with smooth animations
- [x] **Navigation Enhancement**: Header links with proper vertical centering
- [x] **Sidebar Improvements**: Enhanced mobile background with blur effects
- [x] **Responsive Design**: Improved mobile responsiveness across all components
- [x] Patient association
- [x] Calendar integration ready

### Medical Records ✅ COMPLETE
- [x] Medical visit documentation
- [x] Vital signs tracking (blood pressure, heart rate, respiratory rate, oxygen saturation)
- [x] Treatment and disposition recording
- [x] Follow-up scheduling
- [x] Medical staff assignment
- [x] Comprehensive visit history
- [x] **Triage & vitals history**: Patient details page shows tabular triage and vitals history; Records page has dedicated "Triage & Vitals" tab with tenant-wide tables and sidebar/URL hash support

### Incident Reporting ✅ COMPLETE
- [x] Incident report creation
- [x] Severity levels and categorization
- [x] Location and department tracking
- [x] Witness information
- [x] Actions taken documentation
- [x] Status management
- [x] Items used / dispensed (forms + modal) with visit/incident-scoped transactions

### Inventory & Dispensing Integration ✅
- [x] **Location-scoped inventory**: GET `/api/inventory` defaults to session active location (user’s store) when `locationId` omitted
- [x] **Visit/incident issue_to_client**: POST validates visit or incident (tenant, patient); sets documentType/documentId/medicalVisitId accordingly; incidents store medical_visit_id = null
- [x] **Strict GET filters**: Transactions by visit (medicalVisitId + document_type) and by incident (documentType/documentId + medical_visit_id IS NULL) prevent cross-context mixing

### Dashboard & Analytics ✅ COMPLETE
- [x] Real-time metrics dashboard
- [x] Active patient counts
- [x] Appointment statistics
- [x] Incident tracking
- [x] Performance indicators
- [x] Responsive charts and visualizations

## Technical Architecture

### Security Features
- [x] Input validation and sanitization
- [x] SQL injection protection with Drizzle ORM
- [x] Secure session management
- [x] Password strength requirements
- [x] Rate limiting ready (implement with middleware)
- [x] HTTPS-ready cookie configuration
- [x] Tenant data isolation

### Multi-Tenant Database Design
- [x] **PostgreSQL with Neon**: Serverless architecture with WebSocket support
- [x] **Drizzle ORM**: Type-safe operations with tenant-aware queries
- [x] **Hierarchical Foreign Keys**: Complete tenant isolation with cascading deletes
- [x] **Optimized Indexes**: Multi-column indexes for tenant + entity queries
- [x] **UUID Primary Keys**: Globally unique identifiers across all tenants
- [x] **Automatic Timestamps**: Created/updated tracking with timezone support
- [x] **Bulletproof Isolation**: No cross-tenant data access possible

### Frontend Stack
- [x] React with TypeScript
- [x] Tailwind CSS for styling
- [x] shadcn/ui component library
- [x] TanStack Query for state management
- [x] Wouter for routing
- [x] React Hook Form for form handling
- [x] Zod for validation

### Backend Stack
- [x] Express.js with TypeScript
- [x] Staff auth + optional OIDC (`openid-client`); Passport packages are legacy/unused in app code
- [x] bcrypt for password hashing
- [x] Session management
- [x] Comprehensive error handling
- [x] Request validation
- [x] Logging and monitoring ready

## Next Steps for Production

### Enhanced Multi-Tenant Features
- [x] **Admin Panel**: Complete with user management, approval workflow, and cross-tab navigation ✅
- [x] **Tenant Isolation**: Bulletproof data separation with admin authentication ✅
- [x] **Employee Integration**: Automatic employee creation with unique numbers ✅
- [x] **Email System**: Professional Gmail SMTP integration with branded templates ✅
- [ ] **Tenant Onboarding**: Automated tenant registration and setup flow
- [ ] **Subdomain Routing**: tenant.mineaid.com routing architecture  
- [ ] **Tenant Branding**: Custom logos and color schemes per tenant
- [ ] **Billing Integration**: Subscription management and usage tracking
- [ ] **Data Export/Import**: Tenant-specific data migration tools

### File Management Enhancement
- [x] **Local File Storage**: Cost-effective profile picture storage in /public/profiles/ ✅
- [ ] **Document Management**: Medical document storage and retrieval system
- [ ] **File Categorization**: Organized storage by tenant and document type
- [ ] **Access Controls**: Tenant-isolated file permissions

### Advanced Features
- [ ] Real-time notifications
- [ ] File upload for medical documents
- [ ] Integration with medical devices
- [ ] Compliance reporting
- [ ] Advanced analytics
- [ ] Mobile app development

### Deployment & Operations
- [ ] Production environment setup
- [ ] CI/CD pipeline
- [ ] Monitoring and alerting
- [ ] Backup and recovery
- [ ] Performance optimization
- [ ] Security audit

## Testing Status
- [ ] Unit tests for authentication
- [ ] Integration tests for API endpoints
- [ ] Frontend component testing
- [ ] End-to-end testing
- [ ] Security testing
- [ ] Performance testing

## Documentation Status
- [x] Implementation documentation
- [x] API endpoint documentation
- [x] Database schema documentation
- [ ] User documentation
- [ ] Admin documentation
- [ ] Deployment documentation

---

**Current Status**: Production-ready multi-tenant HMS with complete tenant isolation, dual authentication, comprehensive admin panel, Super Admin system with tenant plan management, and cost-effective local file storage. Gmail SMTP integration provides professional email notifications. System ready for immediate deployment with full administrative capabilities.

**Architecture**: Multi-level tenant hierarchy with Super Admin oversight and bulletproof data isolation  
**Version**: 3.5.0  
**Last Updated**: February 14, 2026