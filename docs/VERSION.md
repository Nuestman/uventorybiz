# MineAid HMS - Version Information

## Current package version: 4.35.2
**Release (see [CHANGELOG.md](./CHANGELOG.md))**: July 14, 2026 — **4.35.2**

## Version History

### Version 4.35.2 (current)
- **Release Type**: Patch — **Session-timing polling** is visibility-aware and lazy (hidden tabs stop polling; visible tabs poll only near expiry warning); **`HOURLY_CRON_JOBS_ENABLED`** kill switch for the hourly no-show + telecare backup crons.
- **Status**: Current
- **See**: [SESSION_SECURITY_AND_MFA.md](./SESSION_SECURITY_AND_MFA.md), [CHANGELOG.md](./CHANGELOG.md) `## [4.35.2]`

### Version 4.35.1
- **Release Type**: Patch — **Telecare expiry**: in-memory timers + hourly DB backup cron (was every 5 minutes); enables Neon Free **scale-to-zero** under Railway always-on hosting.
- **Status**: Superseded by 4.35.2
- **See**: [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md), [CHANGELOG.md](./CHANGELOG.md) `## [4.35.1]`

### Version 4.35.0
- **Release Type**: Minor — **Portal symptoms tracker** (OPQRST-structured diary, multi-select logging, offline cache/outbox, staff read-only view, `symptom_alert` notifications); **connectivity banner** layout fixes for staff/portal headers.
- **Status**: Superseded by 4.35.1 — run legacy symptom migrations on existing DBs (see [CHANGELOG.md](./CHANGELOG.md) `## [4.35.0]`).
- **See**: [PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md](./PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md), [CHANGELOG.md](./CHANGELOG.md) `## [4.35.0]`

### Version 4.34.0
- **Release Type**: Minor — **Drizzle migration journal** (`drizzle/`, `db:drizzle-migrate`, `db:drizzle-baseline`); **consolidated SQL seeds** (`migrations/seeds/`, `db:seed`); **legacy SQL archived**; **`.env` only** for all DB tools; **portal marketing** UX (dashboard CTAs for signed-in patients, accent headings); **public portal links** to `/portal`.
- **Status**: Superseded by 4.35.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.34.0]`, [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)

### Version 4.33.0
- **Release Type**: Minor — **What's New** in-app release announcements (staff + portal, server-tracked, curated); **portal mobile sidebar** sheet; **portal typography** (Outfit headings, larger page titles).
- **Status**: Superseded by 4.34.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.33.0]`, [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

### Version 4.32.0
- **Release Type**: Minor — **Portal notification preferences** (per-channel opt-in/out); **portal UX polish** (teal actions, quick-access cards, care contact card, shared greeting); **public header** cleanup; **feedback widget** vertical tab; **`@vercel/blob` / `undici`** security bump.
- **Status**: Superseded by 4.33.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.32.0]`, [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

### Version 4.31.1
- **Release Type**: Patch — **Portal access requests** (employee + portal email lookup, admin approve/reject queue, explicit magic-link feedback); **portal account admin actions** (suspend/reactivate, resend magic link); **messaging default on** for active portal tenants.
- **Status**: Superseded by 4.32.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.31.1]`, [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

### Version 4.31.0
- **Release Type**: Minor — **Patient portal UX** (isolated style system, marketing landing, desktop sidebar, appointment request modal, portal vitals, work fitness); **telecare in-call polish** (fullscreen light UI, session time banners, messaging layout); **appointments** (confirmation party, reschedule); **wellbeing** module rename; **patient ID** sequence fix; **nodemailer** 9.0.1 security bump.
- **Status**: Superseded by 4.31.1
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.31.0]`, [PORTAL_STYLES.md](./PORTAL_STYLES.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

### Version 4.30.0
- **Release Type**: Minor — **Secure messaging**: optional rich text (sanitized HTML), **SMS** alerts for `message_received` (Twilio), **offline** inbox/thread cache + outbox sync.
- **Status**: Superseded by 4.31.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.30.0]`, [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md), [OFFLINE_MODE_AND_SYNC.md](./OFFLINE_MODE_AND_SYNC.md)

### Version 4.29.0
- **Release Type**: Patch — **Appointments page** redesign (list/calendar, side-by-side cards, server pagination); **telehealth no-show fix** for staff-scheduled visits (reconcile no longer auto-completes unstarted sessions); session **extend** API; hub spotlight; in-call messaging consent/auto-assign; **created_at** desc sort; esbuild/Vite dev fix.
- **Status**: Superseded by 4.30.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.29.0] - 2026-06-16`, [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md)

### Version 4.28.0
- **Release Type**: Minor — **Telehealth room UX** (3-column in-call shell, consent, join window to `scheduled_end`, encounter auto-join); **Telehealth hub** (multi-tab queue, summary API, telehealth-only scheduling modal); **appointment/portal/telecare sync** service; **secure messaging** (staff + portal, SSE, telecare panel); **portal notifications** feed.
- **Status**: Superseded by 4.29.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.28.0] - 2026-06-15`, [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md), [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md)

### Version 4.27.0
- **Release Type**: Minor — **Encounter-first model** (`encounters` table, lifecycle APIs, Medical Visit refactor); **telehealth** (LiveKit in-app WebRTC + optional Teams); **patient portal** expansion (appointments, requests, vitals trends, telecare join); **FHIR/interop** partners and care transfers; **appointment notifications** + auto no-show; **glucose mmol/L**; **incident drill flag**; 8 SQL migrations.
- **Status**: Superseded by 4.28.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.27.0] - 2026-06-13`, [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md)

### Version 4.26.1
- **Release Type**: Patch — **Auth module rename** (`AuthService` / `authMiddleware` split); **staff auth** terminology + `LEGACY_STAFF_AUTH_PROVIDER`; **MFA login fix** (tenant `require_mfa` only); remove Replit `.local` cache from repo; location-modal hover; auth cross-link accent colors; Tailwind `mineaid-*` utilities.
- **Status**: Superseded by 4.27.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.26.1] - 2026-05-31`

### Version 4.26.0
- **Release Type**: Minor — **Session security & tenant MFA** (configurable timeouts, optional TOTP, expiry warning dialog with circular countdown and blocking session-ended state); **patient portal magic link** sign-in + welcome email fix; **`/reports/overview`** executive snapshot; simplified working-location modal; MFA OTP auto-focus and auto-submit on 6th digit.
- **Status**: Superseded by 4.26.1
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.26.0] - 2026-05-31`

### Version 4.25.1
- **Release Type**: Patch — Notifications center rollout (`/notifications`), notifications API/filtering + read-all endpoint, incident alert recipient defaults for safety officers, incident edit patient-resolution hardening, and minor UI/content polish updates.
- **Status**: Superseded by 4.26.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.25.1] - 2026-05-28`

### Version 4.25.0
- **Release Type**: Minor — **Compliance reports (new module):** **`/reports/compliance`** and **`GET /api/reports/compliance`** (audit/SOP/legal/shift-ack governance summaries, exports, exception flags), plus **`audit_logs (tenant_id, created_at)`** index migration **`20260421_audit_logs_tenant_created_at.sql`** for tenant time-window reporting performance.
- **Status**: Superseded by 4.25.1
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.25.0] - 2026-04-21`

### Version 4.24.0
- **Release Type**: Minor — **Operations reports (new module):** **`/reports/operations`** and **`GET /api/reports/operations`** (tickets, duties, shift-report metrics; admin + super_admin impersonation). **Reports hub** UX: in-card links for available modules. **Documentation** refresh with **post-production** resume line for **R-OPS-4** and related follow-ups (see **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`**).
- **Status**: Superseded by 4.25.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.24.0] - 2026-04-21`

### Version 4.23.1
- **Release Type**: Patch — Incident reports visualization and analysis polish on **`/reports/incidents`**: severity pie chart, top-care-location donut chart, and dedicated detained-at-FAP by location chart + table (against total incidents), backed by location-level `detainedCount` / `detainedRate` aggregates.
- **Status**: Superseded by 4.24.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.23.1] - 2026-04-20`

### Version 4.23.0
- **Release Type**: Minor — **Incident reports** production release: **`/reports/incidents`** and **`GET /api/reports/incidents`** with role-gated access, incident filters, KPI/series/tables, prior-period compare, optional identifier-safe detail, CSV exports, print styling, and reports-hub/sidebar integration.
- **Status**: Superseded by 4.23.1
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.23.0] - 2026-04-20`

### Version 4.22.1
- **Release Type**: Patch — **Clinical reports** UX: **`/reports/clinical`** **How to use this page** guide is **collapsible** and **closed by default** (§4.0 in **`REPORTS_CLINICAL_MODULE_PLAN.md`**); hidden from print/PDF. Repository **changelog** and **version** docs aligned for **4.22.0**–**4.22.1**.
- **Status**: Superseded by 4.23.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.22.1] - 2026-04-20`

### Version 4.22.0
- **Release Type**: Minor — **Medical visits:** **`ambulance_used`** on hospital-transfer dispositions (new/edit/details). **Clinical reports (R-CLIN-4):** **`GET /api/reports/clinical`** ambulance KPIs and **`tables.ambulanceByClinic`**; **Ambulance usage** UI on **`/reports/clinical`**.
- **Status**: Superseded by 4.22.1
- **Key Features**:
  - **API / UI**: `clinical-reports.service.ts`, `ClinicalReportsPage.tsx`; **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** §4.5; **`docs/MEDICAL_VISIT_FIXES.md`**.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.22.0] - 2026-04-17`

### Version 4.21.1
- **Release Type**: Patch — **npm audit / Dependabot** dependency resolutions (no application logic changes intended). Drizzle ORM ≥0.45.2, Vite ≥6.4.2, Vitest 4.x, axios/follow-redirects, nodemailer ≥8.0.5, sanitize-html ≥2.17.3.
- **Status**: Superseded by 4.22.0

### Version 4.21.0
- **Release Type**: Minor — **Clinical reports** (`/reports/clinical`) analytics dashboard and **`GET /api/reports/clinical`** expansions (R-CLIN-2–aligned scope): triage/visit-type/location/company breakdowns, cases-by-day matrix, incidents-per-post counts, CSV + print exports; staging/production validation build.
- **Status**: Superseded by 4.21.1
- **Key Features**:
  - **Clinical route**: `client/src/pages/reports/ClinicalReportsPage.tsx`; API `server/modules/reports/clinical-reports.service.ts`, `clinical-reports.routes.ts`.
  - **Exports / print**: CSV (by company, breakdowns, cases matrix); browser **Print / Save as PDF**; `client/src/components/ClinicalReportsPrintStyles.tsx`, `client/src/lib/clinicalReportsPrint.ts`, print CSS in `client/src/index.css`.
  - **Docs**: `REPORTS_CLINICAL_MODULE_PLAN.md`, changelog entry `## [4.21.0] - 2026-04-18`.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.21.0] - 2026-04-18`

### Version 4.20.0
- **Release Type**: Minor — **ShiftOver production-readiness** release and documentation refresh for preview/production testing.
- **Status**: Superseded by 4.21.0
- **Key Features**:
  - **ShiftOver hub + open items polish**: quick stats and release snippet on `/shiftover`; open items flow and summary aligned.
  - **Shift reports upgraded for continuity**: structured handover, acknowledgments, linked records, attachments, revision history, open-items register.
  - **Linked-record UX**: search-based picker with **multi-select** (no manual UUID typing).
  - **Docs**: `SHIFTOVER_IMPLEMENTATION_PLAN.md`, `SHIFTOVER_SYSTEM_ADDENDUM.md`, and new `REPORTS_COMPREHENSIVE_MODULE_PLAN.md`.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.20.0] - 2026-04-17`

### Version 4.19.1
- **Release Type**: Patch — **Documentation** for OIDC / Microsoft Entra redirect URIs (`microsoft/callback` vs Google); **Microsoft** sign-in validated **locally** with personal MSA.
- **Status**: Superseded by 4.20.0
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.19.1] - 2026-04-11`

### Version 4.19.0
- **Release Type**: Minor — **OIDC sign-in** for **Google** and **Microsoft** (`openid-client`, `/api/auth/oidc/*`, `users.oauth_issuer` / `oauth_sub`, migration **`20260405_users_oauth_oidc.sql`**, invite-only linking). **Google** operational when env is set.
- **Status**: Superseded by 4.19.1
- **Key Features**:
  - **OIDC**: `server/modules/auth/oidc.service.ts`, `oidc.routes.ts`; `AuthService.completeOidcLogin`; optional `OIDC_ALLOWED_EMAIL_DOMAINS`.
  - **Docs**: [OIDC_LOGIN_PLAN.md](./OIDC_LOGIN_PLAN.md).
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.19.0] - 2026-04-10`

### Version 4.18.0
- **Release Type**: Minor — **Super Admin impersonation** (audited support sessions, `impersonation_events`, `20260404_super_admin_impersonation.sql`); **public legal hub** (`/legal`, `/api/legal/*`) and **manual signed legal uploads** (`tenant_signed_legal_documents`, `20260404_tenant_signed_legal_documents.sql`, `/admin/legal-agreements`, `/super-admin/signed-legal-documents`); **system console** super-admin pages; **registration** Terms & Privacy acceptance.
- **Status**: Superseded by 4.19.1
- **Key Features**:
  - **Impersonation**: `POST /api/super-admin/impersonation/start|end`, event log APIs, `ImpersonationBanner`, `/super-admin/impersonation-log`. See [IMPERSONATION.md](./IMPERSONATION.md).
  - **Legal**: `server/modules/legal/`; signed-doc proxy downloads; email links to templates and upload path.
  - **Console UI**: `/super-admin/system-status`, `/security`, `/audit`, `/integrations`, `/billing`. See [SUPER_ADMIN_SYSTEM_CONSOLE.md](./SUPER_ADMIN_SYSTEM_CONSOLE.md).
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.18.0] - 2026-04-06`

### Version 4.17.0
- **Release Type**: Minor — Super Admin **UMA Obuasi** personalized pitch deck (`/super-admin/pitch-uma-obuasi`, `pitchDeckUmaObuasiData.ts`) and narrative source `docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md`; nav link and cross-links with AGA Obuasi source doc.
- **Status**: Superseded by 4.18.0
- **Key Features**:
  - **Pitch: UMA Obuasi** — Underground Mining Alliance / First Aider contractor narrative; `SuperAdminPitchDeckUmaObuasi.tsx`.
  - **Docs**: `UMA_OBUASI_MINEAID_PITCH_SOURCE.md`; `AGA_OBUASI_MINEAID_PITCH_SOURCE.md` updated with related UMA link.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.17.0] - 2026-04-05`

### Version 4.16.0
- **Release Type**: Minor — Super Admin **commercial collateral**: in-app **pitch decks** (features, Start With Why, AGA Obuasi mine) and **print-ready** enterprise concept note + business proposal pages; shared print styling and Source Sans 3 loading; supporting stakeholder markdown under `docs/`.
- **Status**: Superseded by 4.18.0
- **Key Features**:
  - **Pitch**: `/super-admin/pitch`, `/super-admin/pitch-why`, `/super-admin/pitch-aga-obuasi` — `PitchDeckShell`, `pitchDeckData.ts`, `pitchDeckV2Data.ts`, `pitchDeckAgaObuasiData.ts`.
  - **Print documents**: `/super-admin/concept-note`, `/super-admin/business-proposal` — `superAdminPrintDocument`, `SuperAdminPrintDocumentStyles`, `.super-admin-print-document` print CSS.
  - **Docs**: `MINEAID_ENTERPRISE_CONCEPT_NOTE.md`, `MINEAID_BUSINESS_PROPOSAL.md`, `MINEAID_PITCH_DECK_V2_START_WITH_WHY.md`, `AGA_OBUASI_MINEAID_PITCH_SOURCE.md`.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.16.0] - 2026-04-04`

### Version 4.15.0
- **Release Type**: Minor — Tenant **SOP** module (library + admin), **patient portal** foundation (health profile, portal users, Settings UI, `/portal/*`), **in-app Changelog** (`/changelog` + `GET /api/changelog`), super-admin page consolidation, ticket category migration.
- **Status**: Superseded by 4.16.0
- **Key Features**:
  - **SOP**: `/sop`, `/admin/sops`, migrations `20260403_*`; TinyMCE; HTML sanitization; attachments.
  - **Portal**: Migrations `20260402_*`; staff Settings; patient login and portal API (`server/modules/portal`).
  - **Changelog page**: Parses `docs/CHANGELOG.md` for authenticated and public navigation.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.15.0] - 2026-04-03`

### Version 4.14.0
- **Release Type**: Minor – Staff ticket hardening (requester vs admin PATCH, Blob public uploads, `storageBackend` + UI feedback), global heading/table polish, Operations page intros, Ambulance sidebar + hash routing
- **Status**: Superseded by 4.15.0
- **Key Features**:
  - **Staff tickets**: Requester-only content edits; admin triage split; `ticket-documents` on Vercel Blob with public `put`; attachment API exposes `storageBackend`; local fallback surfaced to users.
  - **UI**: Heading and CardTitle accent scale; table link accent; Reports / Assignment History / Operational Duties intros; Ambulance & EMS dropdown with hash deep links.
  - **Docs**: E-ticketing plan, file upload summary, RBAC, and changelog updated.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.14.0] - 2026-04-01`

### Version 4.13.0
- **Release Type**: Minor – Staff e-ticketing (operations queue, categories, TinyMCE + server HTML sanitization, attachments, audit activity, RBAC)
- **Status**: Superseded by 4.14.0
- **Key Features**:
  - **Ambulance & EMS module**: added `#inventory` tab for ambulance-only on-board inventory management.
  - **Ambulance unit detail**: Transfers tab now supports **Receive** action for inbound in-transit transfers.
  - **Inventory scoping**: ambulance-mode filtering and location rendering refinements for ambulance stock context.
  - **Fleet register UX**: short code auto-generation from ambulance name (create mode), larger register modal heading.
  - **RBAC/docs**: expanded ambulance role guidance and updated ambulance module documentation.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.12.0] - 2026-04-01`

### Version 4.11.0
- **Release Type**: Minor – RBAC/clinical API enforcement, incident safety redaction, super admin console layout and hash navigation, auth and routing updates, SOP page, offline/sync doc refresh
- **Status**: Superseded by 4.12.0
- **Key Features**:
  - **`requireClinicalAccess`** on patient/clinical/appointments and related APIs; **`RequireClinicalAccess`** and route helpers on the client; post-login home rules for non-clinical and super-admin users.
  - **Incidents**: server redaction and client display alignment for safety officers; tests in `server/__tests__/incident-safety-redaction.test.ts`.
  - **Super admin**: `SuperAdminLayout`, `/super-admin/dashboard`, hash tabs on `/super-admin`, navigation fixes from other super-admin routes.
  - **Docs**: `docs/RBAC.md` as the consolidated RBAC reference.
  - **Schema**: optional `dispositionDateTime` on medical visit insert schema.
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.11.0] - 2026-04-01`

### Version 4.10.0
- **Release Type**: Minor – Public layout decoupling, public marketing/legal pages, navigation/typography polish, route scroll fixes, sync scaffolding
- **Status**: Superseded by 4.11.0
- **Key Features**:
  - Public routes render via `PublicLayout` (no app sidebar); dedicated public pages (about, contact, features, privacy, terms, security) and shared footer.
  - Public mobile overlay menu and typography updates (Odibee Sans).
  - Hardened scroll-to-top behavior for public and protected routes.
  - Baseline offline/sync API scaffold and related client wiring (in progress).
  - Legal docs added under `docs/` (Privacy, Terms, Commercial Agreement, BAA).
- **See**: [CHANGELOG.md](./CHANGELOG.md) `## [4.10.0] - 2026-03-24`

### Version 4.8.0
- **Release Type**: Minor – Employee wellbeing module (employee wellbeing hub) and follow-up due/overdue reminders
- **Status**: Production Ready
- **Key Features**:
  - **Employee wellbeing module**: Employee wellbeing hub covering follow-ups (onsite + external care), employee Work fitness & medications, and feedback/surveys for treatment services, with an overview dashboard. Backend routes under `/api/wellbeing/*`; frontend pages under the Employee wellbeing sidebar section, plus public feedback form `/feedback` and QR poster `/wellbeing/feedback-poster`.
  - **Module-level RBAC**: Employee wellbeing routes use read/write middleware; safety officers have read-only access (with additional work-impact-only restrictions for Work fitness & medications). UI enforces read-only experience for `safety_officer` for follow-ups, medications, feedback, feedback poster sharing, and dashboard shortcuts.
  - **Follow-up reminders**: New `follow_up_due` notification type and daily 7:00 AM cron that sends a digest email per tenant for follow-ups that are due or overdue and have not yet had a reminder sent, then stamps `reminder_sent_at` on those follow-ups.
  - **Migrations**: `20260310_WELLBEING_followups_and_feedback.sql`, `20260311_medical_visit_follow_up_required.sql`, and `add_follow_up_due_notification_type.sql`.
- **Breaking Changes**: None (run new migrations; features are additive).
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) and `docs/WELLBEING_IMPLEMENTATION_STATUS.md` for complete details

### Version 4.7.0
- **Release Type**: Minor – Medical visit disposition options and tenant referral/transfer facilities
- **Status**: Production Ready
- **Key Features**:
  - **Disposition**: Options are Return to Work, Transferred to Hospital, Transferred to Hospital (Other). When "Transferred to Hospital", a tenant-specific facility dropdown is shown; when "Other", a free-text facility name field is shown.
  - **Referral facilities**: New tenant-scoped table and API (`/api/referral-facilities`); Admin → Locations has full CRUD (Add facility, Edit/Delete per row). Medical visits store `transfer_facility_id` or `transfer_facility_other`.
  - **Migrations**: `20260301_referral_facilities_and_transfer.sql`, `20260302_referral_facilities_contact_email.sql`.
- **Breaking Changes**: None (run new migrations; existing disposition values remain in DB; new options used on forms).
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.6.0
- **Release Type**: Minor – Medical visits: procedures master table, medications given via items, detained/ambulance, Impression/Diagnosis, Treatment 3-col grid
- **Status**: Production Ready
- **Key Features**:
  - **Procedures**: Master table and API; Settings → Procedures tab (add/edit/toggle/delete); seed migration; Medical Visit and Records use fetched procedures for dropdown.
  - **Medical visits**: Medications given via items used/dispensed (in Treatment section); Detained at FAP/Clinic and Ambulance Used (when Emergency Transfer) with new DB columns and migrations.
  - **UI**: Assessment & Diagnosis → Impression / Diagnosis; Treatment section 3-col grid on large screens; Details modal order and new fields.
- **Breaking Changes**: None (run new migrations for procedures table and medical_visits columns).
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.5.0
- **Release Type**: Minor – Shift reporting (Operations), migration year prefix fix
- **Status**: Production Ready
- **Key Features**:
  - **Reports**: New `/reports` page under Operations with filters (date range, location, shift), CRUD for shift reports, modal form (summary select + single Report details field), view modal, 3-dot row actions (View, Edit, Delete), AlertDialog for delete. Completed operational duties for the shift are auto-appended to report details on submit.
  - **Migrations**: All recent migration SQL files renamed from 2025 to 2026 prefix; old 2025-prefixed files removed; docs updated to reference 2026 filenames.
- **Breaking Changes**: None (migration filenames changed for consistency only; migration content unchanged).
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.4.0
- **Release Type**: Minor – Tenant settings, branding, currency integration, duty spawner refinements
- **Status**: Production Ready
- **Key Features**:
  - Tenant-scoped `/settings` (currency, app name, logo, primary color, favicon); confirm dialogs for Save/Restore; TenantBranding at app root; tenant-branding file storage (Vercel Blob or local). Duty spawner shift naming (evening→night, morning→day) and tenant-settings migrations.
- **Breaking Changes**: None
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.3.0
- **Release Type**: Minor – Page layout and styling consistency, Dashboard table/card view, Inventory All Locations fix and pagination
- **Status**: Production Ready
- **Key Features**:
  - **Layout**: Full-width main content and consistent padding (`p-4 sm:p-6 pb-20 md:pb-8`) and background (`bg-mineaid-light-gray`) across all app pages; consistent tab styling (Records-style) on all tabbed pages; SuperAdmin aligned with same layout and styling.
  - **Dashboard**: Table/card view toggle for Today's Assignments and Today's Appointments; list (table) view is default for both.
  - **Inventory**: "All Locations" filter now returns inventory from all locations (client sends `allLocations=true`; server skips location resolution). Pagination added: 20 items per page with Previous/Next and page indicator.
- **Breaking Changes**: None
- **Platform**: Railway + Neon PostgreSQL
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.2.0
- **Release Type**: Minor – Operational duties filters, overdue filter, responsive modals
- **Status**: Production Ready
- **Key Features**:
  - **Operational Duties – full filters**: Filters card with Date, Status, User, Location, Search (same as Assignment History). Backend supports status and userId on list/today/range; client-side search.
  - **Overdue filter**: Overdue status filter works on both Operational Duties and Assignment History; backend derives overdue as pending + assignmentDate before today; UI shows Overdue badge and Complete/Cancel.
  - **Responsive modals**: Create duty and Assign duty modals use max-h 90vh, scrollable body, fixed footer.
- **Breaking Changes**: None
- **Platform**: Railway + Neon PostgreSQL (architecture is long-running server, not serverless)
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.1.0
- **Release Type**: Minor – Operational duties module restructure (breaking: DB migrations required)
- **Status**: Production Ready
- **Key Features**:
  - **Operational duties**: Master list of duty definitions (table view); assign duty to a post (location required); single duty name (no type dropdown); default MineAid duty catalog for new tenants; table as default for Today's Assignments and duty definitions; success/error toasts.
  - **Schema**: Tables renamed to operational_duty_assignments, operational_duty_completions; duty_type column removed from operational_duties. Assignments/completions remain per-post (location-scoped).
  - **Assignment History**: Post (location) column and display; location filter unchanged.
- **Breaking Changes**: Database migrations required: run 20260220_rename_duty_tables_to_operational.sql and 20260220_remove_operational_duties_duty_type.sql on existing DBs. New installs use updated schema.sql.
- **Platform**: Railway + Neon PostgreSQL (architecture is long-running server, not serverless)
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 4.0.0
- **Release Type**: Major – Improvement review and implementation (Phases 0–5)
- **Status**: Production Ready
- **Key Features**:
  - Backend route splitting by domain (`server/modules/`), thin controllers, validation and errors; Vitest and API integration tests; frontend route metadata and role-based guard; documentation updates.
- **Breaking Changes**: See CHANGELOG 4.0.0.
- **Platform**: Railway + Neon PostgreSQL (architecture is long-running server, not serverless)
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.6.0
- **Release Type**: Minor – Triage & vitals history on Patient Details and Records
- **Status**: Production Ready
- **Key Features**:
  - **Patient details**: Triage history and Vitals history sections in tabular view (date/time, acuity, TEWS, presenting complaint, vitals fields); data from existing triage and vital-signs APIs.
  - **Records**: New "Triage & Vitals" tab with tenant-wide triage and vitals tables; patient column links to patient profile; URL hash `#triage-vitals` and sidebar entry for direct access.
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.5.0
- **Release Type**: Minor – Medical visits & incidents ↔ inventory integration
- **Status**: Production Ready
- **Key Features**:
  - **Medical visits – Items used / dispensed**: Section on visit form and in Records 3-dots menu; search-as-you-type item picker; modal for later entry; transactions scoped to visit and patient.
  - **Incidents – Items used / dispensed**: Section on new/edit incident forms; 3-dots row action opens items modal; same picker; transactions scoped to incident and patient (`medical_visit_id` null).
  - **Backend**: POST `/api/inventory-transactions` validates visit/incident and patient; GET filters keep visit vs incident data separate; GET `/api/inventory` defaults to session active location (user’s store).
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.4.7
- **Release Type**: Multi-location defaults, inventory enhancements & bulk admin tools
- **Status**: Production Ready
- **Key Features**:
  - Automatic default care location on tenant creation and safety net when enabling multi-location.
  - Inventory items now consistently tagged with care locations (single & multi-location), plus bulk CSV import/export and category enum mapping.
  - Admin panel supports multi-select user invitations and a new bulk invite endpoint; Care Locations tab creation is gated behind multi-location.
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.4.6
- **Release Type**: Registration Flow, Tenant Activation Gates & Employee Number
- **Status**: Production Ready
- **Key Features**:
  - Registration creates employee first then user (fixes FK employee_id); first user default role is tenant admin
  - Employee number from registration form (no default EMP0001 when user provides one)
  - Tenant activation gates: login and account activation blocked until tenant is active; session invalidated when tenant inactive
  - Super-admin cannot activate users until tenant is active; API returns specific errors
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.3.1
- **Release Type**: Bug Fixes & Profile Page Enhancements
- **Status**: Production Ready
- **Key Features**:
  - Fixed duplicate property names in user API endpoint logging
  - Redesigned profile page with professional, responsive layout
  - Enhanced profile edit form with all editable user fields
  - Added last active time/date display throughout profile page
  - Improved visual hierarchy and organization of profile sections
  - Added employee and account information cards for admin view
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.3.0
- **Release Type**: Schema, Backend & Frontend Alignment
- **Status**: Production Ready
- **Key Features**:
  - Gender enum and gender column added to employees table; gender surfaced throughout the UI
  - Foreign key between users and employees with data sync for core identity fields
  - Patient ID generation function with friendly IDs (`ma0001-26`) and yearly reset
  - LMP (Last Menstrual Period) field added to medical visits and incident reports (schema, backend, frontend)
  - Renamed incident modal to `IncidentModal` and hardened `/incidents` page against runtime errors
- **Breaking Changes**: None (migrations are additive and backwards compatible)
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.2.2
- **Release Type**: Bug Fixes & UI Improvements
- **Status**: Production Ready
- **Key Features**: 
  - Fixed incident edit modal blank page issue
  - Resolved responsive layout issues at 1080px breakpoint
  - Enhanced patient information auto-population in forms
  - Improved MainLayout with proper overflow handling
  - Removed unnecessary workarounds and debug code
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.2.1
- **Release Type**: Bug Fixes - TypeScript Type Safety Improvements
- **Status**: Production Ready
- **Key Features**: 
  - Resolved 107 TypeScript type errors across the codebase
  - Improved type safety for all form components and data queries
  - Better type inference for React Hook Form controls
- **Breaking Changes**: None
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.2.0
- **Release Type**: MAJOR UPDATE - Admin Panel Table View Enhancements & UI Improvements
- **Status**: Production Ready
- **Key Features**: 
  - Table view with toggle functionality for all admin tabs
  - Sequential ID column (1, 2, 3...) instead of truncated UUIDs
  - Alternating row backgrounds for improved readability
  - Company filter for employee management
  - Employee-based user invitation system
  - Enhanced responsive design with improved breakpoints
  - Sidebar version display hidden when collapsed
- **Breaking Changes**: None - All changes are UI/frontend enhancements
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.1.0
- **Release Type**: MAJOR UPDATE - Authentication System Overhaul & UX Improvements
- **Status**: Production Ready
- **Key Features**: 
  - Production-ready authentication system with database-driven authorization
  - Removed default tenant/company creation - explicit tenant selection required
  - Enhanced error pages (401, 403, 404) with helpful navigation
  - Complete super-admin functionality restoration
- **Breaking Changes**: 
  - **Tenant creation now precedes user creation** - users must explicitly select or create tenant during registration
  - Removed automatic default tenant/company creation
  - `tenantId` is now required for tenant-bound users during registration
  - Error handling now shows proper error pages instead of blind redirects
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete details

### Version 3.0.0
- **Release Type**: MAJOR BREAKING CHANGE - Platform Migration
- **Status**: Production Ready
- **Key Features**: Complete migration from Replit to Vercel + Neon PostgreSQL
- **Breaking Changes**: 
  - Removed Replit OAuth authentication (staff auth only; deprecated name: “custom auth”)
  - Migrated to Vercel deployment platform
  - Migrated to Neon PostgreSQL database
  - Migrated to Vercel Blob storage
  - Removed all Replit-specific dependencies and configurations
- **Platform**: Vercel (Serverless Functions) + Neon PostgreSQL + Vercel Blob
- **See**: [CHANGELOG.md](./CHANGELOG.md) for complete migration details

### Version 2.7.0
- **Release Type**: Incident Management Enhancements
- **Status**: Complete
- **Key Features**: Redesigned incident details modal, emergency medical management field
- **Breaking Changes**: Enhanced incident reports schema

### Version 2.6.0
- **Release Type**: Multi-Location Care Sites System
- **Status**: Complete
- **Key Features**: Location-based operations, session-based location binding
- **Breaking Changes**: New care_locations table, location fields added to operational tables

### Version 2.5.0
- **Release Type**: Drug, Alcohol & Hydration Testing Module Release
- **Status**: Complete
- **Key Features**: Complete testing module with CRUD, audit logging, reports & analytics
- **Breaking Changes**: New testing schema, enum additions (non-negative result)

### Version 2.4.0
- **Release Type**: Super Admin & Tenant Plan Management Release
- **Status**: Production Ready
- **Key Features**: Complete Super Admin system, tenant plan management, enhanced email integration
- **Breaking Changes**: Super Admin authentication, tenant plan schema updates

### Version 2.3.0
- **Release Type**: CRUD Operations & Audit Logging Release
- **Status**: Complete
- **Key Features**: Comprehensive 3-dots CRUD functionality, system-wide audit logging, UI enhancements
- **Breaking Changes**: Enhanced database schema with audit_logs table, appointment status management

### Version 2.2.0
- **Release Type**: Major Multi-Tenant Release
- **Status**: Complete
- **Key Features**: Complete multi-tenant architecture, admin panel, cost-effective file storage
- **Breaking Changes**: Full tenant hierarchy implementation, local file storage migration

### Version 2.1.0
- **Release Type**: Tenant Foundation Release  
- **Status**: Complete
- **Key Features**: Tenant hierarchy foundation, admin panel basics, Gmail SMTP integration
- **Breaking Changes**: Database schema redesign for tenant isolation

### Version 2.0.0
- **Release Type**: Authentication Release
- **Status**: Complete
- **Key Features**: Dual Authentication System *(deprecated — Replit removed)*, Staff Auth Implementation *(was “Custom Auth”)*
- **Breaking Changes**: Enhanced database schema, new authentication options

### Version 1.0.0
- **Release Type**: Initial Release
- **Status**: Complete
- **Key Features**: Core HMS functionality, Replit auth, Patient management

## Feature Completeness

### Core System: 100% Complete ✅
- Patient Management
- Appointment Scheduling  
- Medical Records
- Incident Reporting
- Dashboard Analytics

### Drug, Alcohol & Hydration Testing: 100% Complete ✅
- Drug Testing (6-panel screening with DrugCheck 3000)
- Alcohol Testing (Breathalyzer and BAC monitoring)
- Hydration Testing (Specific gravity and dehydration assessment)
- Testing Programs (Random, Pre-employment, Post-incident, etc.)
- Complete CRUD Operations (Create, Read, Update, Delete)
- Audit Logging (All edits tracked with original data snapshots)
- Reports & Analytics (Comprehensive insights with smart recommendations)
- Compliance Tracking (Scheduled vs completed, missed tests)
- Status Management (Scheduled → Collected → In Lab → Completed)

### Authentication: 100% Complete ✅
- Custom Email/Phone Auth (Replit OAuth removed in v3.0.0)
- Session Management
- Password Security
- Email Verification
- Password Reset

### Multi-Tenant Architecture: 100% Complete ✅
- **Database Schema**: ✅ Complete with full tenant hierarchy
- **Tenant Isolation**: ✅ Complete with bulletproof data separation  
- **Admin Panel**: ✅ Complete with user management and approvals
- **Employee Integration**: ✅ Complete with automatic employee creation
- **Email System**: ✅ Complete with professional branded templates using Gmail SMTP
- **File Storage**: ✅ Complete with cost-effective local storage
- **Super Admin System**: ✅ Complete with tenant plan management and full CRUD operations
- **Tenant Plan Management**: ✅ Complete with Basic/Premium/Enterprise options
- **Tenant Onboarding**: ⏳ Pending automated tenant registration
- **Subdomain Routing**: ⏳ Pending tenant.mineaid.com architecture

### Production Readiness: 99% Complete ⚡
- **Core Functionality**: ✅ Complete with multi-tenant architecture
- **Security Implementation**: ✅ Complete with admin and Super Admin authentication  
- **Email System**: ✅ Complete with Gmail SMTP (cost-effective)
- **File Storage**: ✅ Complete with local storage (cost-effective)
- **Admin Panel**: ✅ Complete with comprehensive user management
- **Super Admin System**: ✅ Complete with tenant plan management
- **Multi-Tenant Operations**: ✅ Complete with bulletproof isolation
- **Audit Logging**: ✅ Complete with comprehensive tracking
- **Testing Module**: ✅ Complete with drug, alcohol & hydration testing
- **Reports & Analytics**: ✅ Complete with compliance tracking
- **Load Testing**: ⏳ Pending performance validation
- **Documentation**: ✅ Complete and updated

## Deployment Status

### Development Environment
- ✅ Fully functional
- ✅ All features working
- ✅ Mock email/SMS services
- ✅ Database migrations complete

### Production Environment
- ✅ **Ready for immediate deployment on Vercel**
- ✅ **Neon PostgreSQL configured** (serverless database with branching)
- ✅ **Vercel Blob storage configured** (cloud file storage)
- ✅ **Gmail SMTP configured** (cost-effective email solution)
- ✅ **Environment variables documented**
- ✅ **Admin authentication configured**
- ✅ **Vercel deployment configuration** (`vercel.json`)
- ⏳ Monitoring and alerting setup pending

## Next Version Roadmap

### Version 3.2.0 (Planned)
- **Neon Auth integration** (replace staff auth with Neon Auth)
- **Enhanced Vercel Blob** features and optimization
- **Performance monitoring** and analytics
- **Advanced caching** strategies

### Version 3.3.0 (Planned)  
- **Automated tenant onboarding** with self-service registration
- **Subdomain routing** for tenant.mineaid.com architecture
- **Advanced incident reporting** with body part mapping
- **Medical inventory tracking** with barcode scanning

### Version 3.4.0 (Planned)  
- **Environmental monitoring** and compliance tracking
- **Advanced predictive analytics** with ML insights
- **HSE training management** with certification tracking
- **Mobile application** for field operations

### Version 4.0.0 (Future)
- **Environmental monitoring** and compliance tracking
- **HSE training management** with certification tracking
- Mobile application
- Advanced ML analytics
- Enterprise features
- Multi-language support

## Technical Debt

### Low Priority
- Update to latest dependency versions
- Optimize bundle size
- Add more comprehensive testing

### Medium Priority
- Implement caching strategies
- Add rate limiting
- Enhance error tracking

### High Priority
- **Automated tenant onboarding** workflow implementation
- **Advanced reporting system** with regulatory compliance
- **Performance optimization** for large-scale deployments
- **Comprehensive monitoring** and alerting system

---

**Maintained by**: MineAid Development Team  
**Architecture**: Multi-tenant with complete tenant isolation; long-running server (not serverless)  
**Platform**: Railway + Neon PostgreSQL  
**Current Status**: Production-ready on Railway  
**Last Updated**: February 20, 2025 (v4.2.0)  
**Next Review**: March 2025