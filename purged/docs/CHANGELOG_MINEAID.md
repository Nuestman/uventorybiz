# MineAid HMS - Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [4.35.2] - 2026-07-14

### Neon compute savers (follow-up to 4.35.1)

- **Visibility-aware session polling** — `useSessionTimeoutWarning` no longer polls `session-timing` every 30s unconditionally: hidden tabs pause polling entirely (fresh check on tab return), and visible tabs count down locally, resuming network polls only near the expiry warning window. Before declaring local expiry from stale timing, the hook confirms with the server (protects multi-tab sessions).
- **Hourly cron kill switch** — New env `HOURLY_CRON_JOBS_ENABLED` (default `true`); set `false` to pause the appointment auto no-show (`:30`) and telecare expiry backup (`:15`) crons so Neon Free can scale to zero. Telecare expiry still runs via in-memory timers and hub reads; staff mark appointment no-shows manually while paused. Daily/weekly crons unaffected. Documented in `.env.example`.

## [4.35.1] - 2026-07-14

### Telecare / Neon compute

- **In-memory session expiry** — Active telecare sessions are reconciled via process timers (`telecare-session-expiry.scheduler.ts`) armed on create, join, extend, status change, and cancel; timers re-hydrate on server boot.
- **Cron backup** — Telecare expiry cron moved from every **5 minutes** to **hourly at :15** so Neon Free can scale to zero (sub-5-minute DB jobs kept the compute awake ~24/7).
- **Docs** — [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md) and Railway Neon notes updated.

## [4.35.0] - 2026-07-06

### Portal — symptoms tracker (OPQRST)

- **Feature** — Patient-portal symptom diary at `/portal/symptoms` (`features.symptoms`, default on). Data-driven catalog (`symptom_types`), log entries (`symptom_log_entries`), per-symptom trend page, dashboard card, 24h patient edit/delete window.
- **OPQRST form** — Structured capture: **O**nset (`recorded_at`), **P**rovocation / **P**alliation, **Q**uality (presets + free text), **R**egion (`body_location`) + radiation, **S**everity (1–5), **T**ime (`duration_minutes`). Info section on the symptoms page explains OPQRST and emergency disclaimer.
- **Multi-select** — Patients can log multiple catalog symptoms in one submission (one row per symptom, shared OPQRST payload). **Other** requires a custom symptom name (stored in `notes`, displayed as label via `shared/symptomCatalog.ts`).
- **Offline** — IndexedDB cache + portal outbox (`offlineSymptoms.ts`, `offlineStore` v4); `syncPortalSymptomOutbox` on reconnect; pending-sync badges on log cards.
- **Staff** — Read-only **Patient-reported symptoms** on `PatientDetails` with OPQRST summary columns; admin symptom-type management in Settings.
- **Notifications** — `symptom_alert` type; `notifySymptomLogged` when severity ≥ 4 or chest pain / shortness of breath.

### UX & platform

- **Connectivity banner** — Offline banner offsets staff/portal sticky headers and app shells (full-width above sidebars).
- **Docs** — [PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md](./PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md) updated for OPQRST, offline, and multi-select.

### Migrations (legacy SQL — run on existing DBs)

```bash
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_01_portal_symptom_logs.sql
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_02_symptom_alert_notification_type.sql
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_03_symptom_log_opqrst.sql
```

## [4.34.0] - 2026-07-01

### Database tooling

- **Drizzle journal** — Tracked migrations in `drizzle/` (`0000` patient ID function, `0001` baseline schema, incremental `0002+`). Commands: `db:drizzle-migrate`, `db:generate`, `db:drizzle-baseline`.
- **Seeds** — `migrations/seeds/required/` and `optional/` with `npm run db:seed` / `db:seed:optional`; shared SQL runner (`scripts/lib/run-sql-file.ts`).
- **SQL cleanup** — 79 legacy `migrations/*.sql` files archived to `migrations/_archive/legacy_upgrades/`; `add_notification_system.sql` DDL superseded by Drizzle, notification rows consolidated in seeds.
- **Docs** — New `docs/DRIZZLE_MIGRATIONS.md` (fresh DB policy, journal chain, squash policy); deployment and setup guides updated.

### Environment

- **`.env` only** — Server, drizzle-kit, and migration scripts load from `.env` via `scripts/load-env.ts` (not `.env.local`).

### Portal & public UX

- **Portal marketing** — Signed-in patients stay on `/portal` marketing page with “Go to dashboard” CTAs; `?signin=1` no longer auto-redirects authenticated users.
- **Portal typography** — Marketing `h1` / display headings use portal accent color.
- **Public navigation** — Footer, header, landing, and staff auth link to `/portal` instead of `/portal?signin=1`.
- **Staff UI** — Tab trigger font-size override commented out in global CSS (records-style tabs).

## [4.33.0] - 2026-06-20

### What's New — in-app release announcements

- **Staff + portal** — Curated “What’s New” dialog on sign-in when a release has not been acknowledged; server-tracked per user (`last_acknowledged_release_version`).
- **API** — `GET/POST /api/release-notes/status|acknowledge` (staff) and `/api/portal/release-notes/*` (portal).
- **Curated copy** — `shared/curatedReleaseNotes.ts` (separate staff vs portal highlights per version).

### Portal UX

- **Mobile sidebar** — Hamburger menu opens full nav in a left sheet (Profile, all sections, Sign out).
- **Typography** — Headings use **Outfit** (display); body stays **Plus Jakarta Sans**; page titles enlarged (`PortalPageHeader`, profile, vitals).
- **What's New modal** — Mobile horizontal inset and portal modal radius on dialog.

### Migration

- `migrations/20260620_02_portal_notification_preferences.sql` (renamed from `20260621_01`)
- `migrations/20260620_03_release_notes_ack.sql`

## [4.32.0] - 2026-06-20

### Patient portal — notification preferences & UX polish

- **Notification preferences** — Patients can opt in/out per channel for appointment emails, secure message email alerts, and in-app message alerts (`portal_user_notification_preferences`); wired into appointment, messaging, and portal notification services.
- **Portal UI** — Teal primary actions (replacing staff navy on portal surfaces); multi-color quick-access cards; sidebar nav spacing; fixed Appointments active state (no longer highlights on `/portal/visits`).
- **Care contact card** — “Questions about your care?” footer on portal home using tenant contact with support email/phone fallbacks.
- **Shared greeting** — `DashboardGreeting` on portal home and staff `/dashboard` (date line + time-of-day salutation).

### Public site header

- **Features nav** — “All modules” renamed to **Features** (`/features`); removed Security and Changelog from public header; removed duplicate Patient portal sign-in button.

### Feedback widget

- **Vertical tab** — Fixed to the right edge of the screen, vertically centered, always visible.

### Dependencies & security

- **`@vercel/blob`** upgraded to `^2.4.1`; **`undici`** override bumped to `>=6.27.0` (resolves npm audit advisories).

### Migration

- `migrations/20260620_02_portal_notification_preferences.sql`

## [4.31.1] - 2026-06-19

### Portal access requests & email lookup

- **Email lookup** — Magic link and access request check **portal account email** and **employee record email** (not portal account alone). Employee email also resolves an existing portal account linked to the same patient (even when portal login email differs).
- **Access request queue** — Persisted in `portal_access_requests`; admin **Settings → Patient portal → Access requests** with approve/reject; in-app + email notification (`portal_access_request`) with default admin preferences.
- **Real sign-in feedback** — Magic link returns explicit messages (account found / not found / no portal account yet / suspended / locked) instead of generic copy.
- **Portal account actions** — Admin suspend/reactivate, resend magic link; suspended accounts blocked at login and magic-link verify.
- **Approve flow** — New accounts get welcome email + password; existing accounts get magic link only (no bogus password). Email updated on approve when it matches the request.

### Portal messaging visibility (staging fix)

- **Default messaging on** — Portal messaging feature defaults **enabled** (opt-out like appointments/vitals).
- **Migration backfill** — `20260619_01` sets `messaging: true` on active portal tenants missing the flag.

### Bug fixes (review pass)

- Notification deep link uses `/settings#portal` (Settings reads hash + `?tab=` query).
- Access request list joins employee via patient for name display.
- Rate-limited access requests return HTTP 429.
- Magic-link verify rejects suspended accounts with `error=suspended`.

### Migration

- `migrations/20260619_01_portal_access_requests.sql`
- `migrations/20260620_01_portal_access_request_notification_prefs.sql` (idempotent admin notification prefs)

## [4.31.0] - 2026-06-19

### Patient portal — isolated style system & UX polish

- **Self-contained portal CSS** — `client/src/portal/bootstrap.ts` loads modular styles (`shell`, `base`, `components`, `shadcn`, `tables`, `tabs`, `telecare`, `fonts`) under `.portal-root`; no longer overrides main HMS globals (Odibee Sans, coral, navy).
- **Design tokens** — Plus Jakarta Sans / Outfit; teal primary (`--portal-teal`); larger radius on cards, buttons, inputs; subtle table row hover matching header (`#f9fafb`).
- **Marketing landing** — Public `/portal` page with hero, feature cards, and links from main site header/footer and staff `/auth`.
- **Desktop sidebar** — Authenticated portal layout with persistent nav; `body.portal-route` for portaled dialog tokens.
- **Appointment request modal** — Multi-step flow with teal progress segments and selected time-slot styling; wired from Home and Appointments.
- **Portal vitals** — Patient vitals entry and trends (`PortalVitalsPage`, migration `20260616_04_portal_patient_vitals.sql`).
- **Work fitness & medications** — Portal declaration flow with image upload support (migrations `20260616_02_*`, `20260616_03_*`).
- **Access request** — Email-only magic-link request on portal login (no password on first contact).
- **Doc:** [PORTAL_STYLES.md](./PORTAL_STYLES.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md).

### Telecare in-call — fullscreen light UI & interaction fixes

- **Fullscreen routes** — Staff `/telecare/:sessionId` and portal join render outside `MainLayout` (`useTelecareFullscreen`).
- **Light shell** — Soft grey background, white cards; removed single-side border splits and dark provider band under video/doc tabs.
- **Visit metadata** — Connection, time remaining, and participant chips moved to context panel **Appt** tab (`TelecareVisitMeta`); room header removed.
- **Session time warnings** — Inline banners at 5 min / 1 min / time-up (fixes Radix `AlertDialog` z-index blocking in-call UI); end-visit dialog overlay raised to `z-[110]`.
- **Messaging tab** — Scrollable thread with pinned composer and consent (`fillHeight`); horizontal tab overflow fixed via shared `TelecareSessionTabs`.
- **Portal telecare** — `telecare-session--portal` applies portal tokens; staff uses `telecare-session--staff`.
- **Doc:** [TELEHEALTH_UI.md](./TELEHEALTH_UI.md).

### Appointments — confirmation party & reschedule

- **Confirmation party** — Track who confirmed appointments (`appointment_confirmation_party`, shared types).
- **Reschedule** — Staff and portal reschedule flows with notifications (`RescheduleAppointmentModal`, `appointmentReschedule.ts`).
- **Migration:** `migrations/20260616_01_appointment_confirmation_party.sql`.

### Wellbeing module (rename from Our People)

- **Routes & nav** — `/wellbeing` hub replaces legacy Our People pages; server module `server/modules/wellbeing/`.
- **Docs:** [WELLBEING_MODULE_PLAN.md](./WELLBEING_MODULE_PLAN.md), [WELLBEING_IMPLEMENTATION_STATUS.md](./WELLBEING_IMPLEMENTATION_STATUS.md).

### Patient ID generation fix

- **Bug:** `duplicate key patients_pkey` when sequence lagged behind seeded IDs (e.g. `ma0001-26`).
- **Fix:** `generate_patient_id()` syncs sequence with max existing ID + collision retry loop; `createPatient` retries on `23505`.
- **Migration:** `migrations/20260617_01_fix_generate_patient_id.sql`.

### Dependencies & security

- **nodemailer** `^9.0.1` (aligned dependency + override; resolves `npm audit` EOVERRIDE conflict).

### Database migrations (apply after 4.30.0)

1. `migrations/20260616_01_appointment_confirmation_party.sql`
2. `migrations/20260616_02_work_fitness_medications.sql`
3. `migrations/20260616_03_work_fitness_medication_images.sql`
4. `migrations/20260616_04_portal_patient_vitals.sql`
5. `migrations/20260617_01_fix_generate_patient_id.sql`

Run via **`npm run db:migrate`**.

### Documentation

- New [PORTAL_STYLES.md](./PORTAL_STYLES.md); updated [CHANGELOG.md](./CHANGELOG.md), [VERSION.md](./VERSION.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md), [README.md](../README.md), [docs/README.md](./README.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md).

## [4.30.0] - 2026-06-17

### Secure messaging — rich text, SMS alerts, offline

- **Rich text (optional)** — Composer format select: **Plain text** (default) or **Rich text** (TinyMCE). Server sanitization: `server/shared/messagingHtml.ts` (`sanitizeMessagingHtml`); stores `body_html` + plain `body_text`. Supports lists, links, tables, underline (styled spans normalized to semantic tags). No inline images in HTML — use attachments.
- **SMS alerts** — Staff `message_received` notifications can use the **sms** preference channel. Twilio delivery when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are set. Alert text is PHI-safe (no message body). Logged via `notification_delivery_logs`.
- **Offline messaging** — IndexedDB (`offlineStore` v3): inbox/thread cache, outbox queue, local conversations. Read cached threads offline; send/create queued with optimistic UI and **Pending sync** badges; flush on reconnect (`syncMessagingOutbox`). Attachments, delete, and thread admin actions require online.
- **Doc:** [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md) v1.3.0, [OFFLINE_MODE_AND_SYNC.md](./OFFLINE_MODE_AND_SYNC.md) §11.

## [4.29.0] - 2026-06-16

### Appointments page (staff `/appointments`)

- **Redesigned schedule UI** — Summary stat cards, portal requests panel, **List | Calendar** toggle (cards view removed).
- **Side-by-side cards** — **Today's appointments** and **All appointments** in separate cards on wide screens; compact scrollable tables.
- **Server-side pagination** — `GET /api/appointments?page=&pageSize=&search=&status=&appointmentType=` returns `{ rows, page, pageSize, totalCount }`; legacy un-paginated list unchanged for other consumers (e.g. Records).
- **Storage:** `listAppointmentsPaginated` with telecare session join for join-window fields.
- **Client:** `client/src/lib/appointments/appointmentsList.ts`; filters live in the All appointments card.

### Telehealth no-show fix (staff-scheduled visits)

- **Bug:** Staff-created telehealth appointments were auto-marked **completed** when the slot ended even if nobody joined — caused by `reconcileExpiredTelecareSession` (cron every 5 min + Telehealth hub queue reads) completing sessions before the hourly no-show job ran.
- **Fix:** Unstarted sessions (`actualStart` unset, not `in_progress`) → **no_show** after slot end + `APPOINTMENT_NO_SHOW_GRACE_MINUTES` (default **15**). Clinically started sessions → **completed** after short server reconcile grace only.
- **Doc:** [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md) — session expiry reconcile section.

### Appointment & telecare timing

- **No-show grace** — Default **15 minutes after appointment end** (not start + duration); env `APPOINTMENT_NO_SHOW_GRACE_MINUTES` documented in `.env.example`.
- **Session extend** — `POST /api/telecare/sessions/:id/extend` (+15 / +30 min); staff 1-minute and time-up modals with extend options; client auto-end grace before strict end (`shared/telecare.ts`).

### Telehealth hub & queue

- **Spotlight** — “Up next / Live & up next” row between summary cards and main queue tabs on `/telecare`.
- **Sort order** — Appointments list and telecare queue sorted by **most recently created** (`created_at` desc).

### In-call telecare messaging

- **Auto-assign** — In-call messaging thread assigned to the meeting clinician; clinician picker hidden in telecare context.
- **Consent UX** — Explicit **Accept and continue** after ticking telehealth messaging consent before composer appears.

### Dev tooling & dependencies

- **esbuild** `^0.28.1` override (Dependabot CVE); Vite `optimizeDeps.esbuildOptions` for dev destructuring support; `server/vite.ts` loads `vite.config.ts` via `configFile`.

### Documentation

- Updated [CHANGELOG.md](./CHANGELOG.md), [VERSION.md](./VERSION.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [README.md](../README.md), [docs/README.md](./README.md), [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md).

## [4.28.0] - 2026-06-15

### Telehealth room UX (in-call experience)

- **3-column in-call shell** — Video, embedded Medical Visit documentation (`embed=1`), and context/health tabs without leaving the call (`TelecareInCallShell`, `TelecareMainWorkspace`, `TelecareContextPanel`).
- **Patient consent** — Modal before portal join; persisted to `telecare_sessions.patient_telehealth_consent_at` via `POST .../consent`.
- **Join window** — Shared eligibility in `shared/telecare.ts`; join allowed from 15 minutes before start until `scheduled_end` (from `appointments.duration_minutes`).
- **Scheduled-end warnings** — Staff/patient UI warns at 5 min and 1 min; optional auto-end when time is up.
- **Staff encounter flow** — `TelecareOpenEncounterModal` opens clinical encounter before visit; **auto-joins video room** after encounter creation (no second click).
- **Session ended** — Staff “Open workflow” links to `/encounter?patientId=…`; messaging shortcut when enabled.
- **Medical Visit embed** — Chromeless layout for iframe documentation tab; `MainLayout` supports embed mode.

### Telehealth hub (staff `/telecare`)

- Replaced “today only” queue with **Telehealth hub**: summary cards, tabs (Today / Upcoming / Live now / Past 7 days / History), search, appointment + session status filters.
- **API:** `GET /api/telecare/queue`, `GET /api/telecare/queue/summary` (legacy `GET /api/telecare/queue/today` retained).
- **Schedule video visit** — `NewTelehealthAppointmentModal` (telehealth-only fields; no modality/location picker).

### Appointment ↔ portal ↔ telecare sync

- **Central sync service:** `server/modules/telecare/telecare-appointment-sync.service.ts`.
- Portal **My Requests** status now tracks linked appointment outcomes (`completed`, `no_show`, `cancelled`) — not stuck on **Approved** after visit ends or auto no-show.
- Write-time sync on staff status changes, patient cancel/decline, appointment delete, encounter cancel/discharge, telecare complete, and cron no-show.
- Bidirectional appointment ↔ session FK repair; heal-on-read on portal appointment and request APIs.
- **Doc:** [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md).

### Secure messaging (Phase 1–3)

- **Schema:** `conversations`, `conversation_participants`, `messages`, `message_attachments`, `messaging_audit_log`.
- **Staff:** `/messages`, Settings → Patient portal → Secure messaging toggle, SSE stream, appointment/encounter/telecare context threads.
- **Portal:** `/portal/messages`, composer consent (Terms §3a), unread badge, notifications menu.
- **Telecare:** In-call `TelecareMessagingPanel` when messaging feature enabled.
- **Notifications:** `message_received` type (migration `20260614_02_*`).
- **Doc:** [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md).

### Portal notifications

- In-app portal notification feed (`portal_notifications`); header menu with unread count.
- Migration: `migrations/20260615_01_portal_notifications.sql`.

### Database migrations (apply after 4.27.0)

1. `migrations/20260613_01_telecare_consent_and_duration.sql`
2. `migrations/20260614_01_messaging_foundation.sql`
3. `migrations/20260614_02_message_received_notification_type.sql`
4. `migrations/20260615_01_portal_notifications.sql`

Run via **`npm run db:migrate`**.

### Documentation

- Updated [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md), [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## [4.27.0] - 2026-06-13

### Encounter-first clinical model (breaking)

**Versioning:** Shipped as **4.27.0** (minor) — encounter lifecycle, telehealth, portal expansion, FHIR interop, and schema migrations. Requires running SQL migrations before deploy.

- **Schema:** `medical_visits` renamed to **`encounters`** with modality, pathway, lifecycle timestamps, and canonical FHIR-aligned statuses (`planned`, `arrived`, `triaged`, `in_progress`, `finished`, `cancelled`, `entered_in_error`). Chief complaint and disposition nullable until discharge.
- **API:** New **`/api/encounters/*`** — open, discharge, cancel, edit header, paginated list, active encounter lookup. Shared pathway metadata in `shared/encounterPathways.ts`.
- **Clinical guards:** Triage and vital-signs POST may return **`ENCOUNTER_REQUIRED`** / **`CLOSED`** when no active encounter.
- **UI:** Major **Medical Visit** refactor; **DischargeEncounterModal**, **EditEncounterModal**; Records and Patient Details slimmed with shared list helpers.
- **Docs:** [ENCOUNTER_FIRST_MODEL.md](./ENCOUNTER_FIRST_MODEL.md), [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md), [ENCOUNTER_SCHEMA_MIGRATION.md](./ENCOUNTER_SCHEMA_MIGRATION.md), [ENCOUNTER_PATIENT_FLOWS.md](./ENCOUNTER_PATIENT_FLOWS.md).

### Telehealth — LiveKit WebRTC + Teams (dual provider)

- **Providers:** `TELEHEALTH_PROVIDER=livekit` (default, in-app WebRTC) or `teams` (Microsoft Teams link-out). UI labels and join flow match active provider.
- **Backend:** `server/modules/telecare/` — join window validation, LiveKit room + JWT tokens, Teams Graph provisioning, staff queue API.
- **Staff UI:** **`/telecare`** queue, **`/telecare/:sessionId`** in-call room; sidebar Telehealth entry.
- **Portal UI:** **`/portal/visits/:sessionId/join`** — pre-join device check, waiting room, in-call controls, session end. **TelecareJoinButton** provider-aware.
- **Fix:** Patient mic/camera device lock on join (release pre-join preview before LiveKit connect; enable media after room connected).
- **Deps:** `livekit-client`, `livekit-server-sdk`, `@livekit/components-react`.
- **Docs:** [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md).

### Patient portal — Phase 2+ expansion

- **Appointments:** Confirm, decline, cancel; browse/filter; telehealth join CTAs on Home and Appointments.
- **Appointment requests:** Patient submit + staff review (`portal_appointment_requests`, preferred location).
- **Vitals:** Trend charts, metric detail pages (`/portal/vitals/:metric`), shared **`portalUi`** components.
- **Telecare:** Portal config/sessions/join/complete APIs.
- **Doc:** [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md) v1.0.5+.

### Appointments (staff) — calendar, notifications, no-show

- **UI:** **AppointmentsCalendar**, **AppointmentsTable**, **AppointmentsRowActions**; date-range listing.
- **API:** PATCH `/appointments/:id`; conflict detection (`409`); telehealth auto-provisions telecare session on confirm.
- **Notifications:** Event-driven appointment types (`appointment_scheduled`, patient confirmed/declined/cancelled, no-show). See [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md).
- **Cron:** Hourly auto **no-show** after `APPOINTMENT_NO_SHOW_GRACE_MINUTES` (default 60).

### FHIR interoperability

- **Staff read:** `GET /fhir/metadata`, Patient, Encounter, `$everything`.
- **Interop admin:** Partners, API keys, care-transfer prepare/deliver; inbound Bundle ingest (`/interop`).
- **UI:** **`/interop`** — Interoperability page.
- **Doc:** [FHIR_INTEROPERABILITY_FLOWS.md](./FHIR_INTEROPERABILITY_FLOWS.md).

### Vitals, glucose, triage

- **Glucose:** Stored as **mmol/L** with **`glucose_context`** (`fbs` | `rbs`); legacy mg/dL auto-converted on migration.
- **Triage:** Optional **`vitalsAtTriage`** bundle on POST; `encounterId` filters on triage/vitals GET.
- **UI:** GlucoseInputFields, VitalsTrendsChart, VitalMetricDetail, staff/portal vital detail routes.

### Incidents

- **Close flow:** **CloseIncidentDialog**, **IncidentStatusMenuItems**.
- **Drills:** `is_drill_or_simulation` flag; operational incident/compliance reports exclude drills from primary counts.
- **Doc:** [INCIDENT_STATUS_LIFECYCLE.md](./INCIDENT_STATUS_LIFECYCLE.md).

### Reports, dashboard, records

- Records and Patient Details refactored for encounter model.
- Duty assignment history pagination (`GET /duty-assignments/history` with `page`/`pageSize`).
- Compliance/incident reports include drill/simulation metrics.

### Database migrations (apply in order)

1. `migrations/20260602_04_portal_appt_request_location.sql`
2. `migrations/20260602_05_glucose_mmol_context.sql`
3. `migrations/20260608_01_encounter_lifecycle_foundation.sql`
4. `migrations/20260608_02_appointment_notification_types.sql`
5. `migrations/20260608_03_fhir_interoperability.sql`
6. `migrations/20260612_01_encounter_first_model.sql`
7. `migrations/20260612_02_encounter_model_v2.sql`
8. `migrations/20260612_03_incident_drill_simulation.sql`

Run via **`npm run db:migrate`**.

### Env / tooling

- **`.env.example`:** LiveKit, Teams, telehealth provider, appointment no-show grace, optional `DATABASE_DRIVER=websocket`.
- **Scripts:** `npm run db:migrate`, `npm run db:studio`, `npm run tunnel` (localtunnel for dev).
- **Neon:** Optional WebSocket driver for local dev when TCP pool is flaky.

### Documentation

- Updated **IMPLEMENTATION_STATUS**, **VERSION**, **README**, **MIGRATION_GUIDE**, module plans.
- **New:** [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md) — staging checklist and resume guide.

## [4.26.1] - 2026-05-31

### Auth module rename and staff-auth terminology

**Versioning:** Shipped as **4.26.1** (patch) — backend refactor, MFA login fix, docs cleanup, and minor UX polish on top of 4.26.0.

- **Auth refactor:** Removed legacy `server/shared/middleware/customAuth.ts`; split into `server/modules/auth/auth.service.ts` (`AuthService`), `auth.middleware.ts` (`createAuthMiddleware`), `auth.schemas.ts`, and `auth.constants.ts` (`LEGACY_STAFF_AUTH_PROVIDER`). All routes now use `authService` / `authMiddleware` deps.
- **Terminology:** Docs and comments updated from “Custom auth” to **staff auth**; deprecated names documented in **`docs/AUTH_SYSTEM.md`**. DB value `auth_provider = 'custom'` retained via `LEGACY_STAFF_AUTH_PROVIDER`.
- **Repo hygiene:** Removed tracked Replit agent cache (`.local/`); added to `.gitignore`.

### MFA login gate fix

- **Bug fix:** Login no longer prompts for MFA when tenant **`require_mfa`** is **false**, even if the user previously enrolled TOTP on Profile. MFA at sign-in now follows **tenant policy only** (`staffMfaGate` in `staffAuth.service.ts`).

### UX polish

- **Working location modal:** location cards use **`hover:bg-mineaid-light`** for clearer hover feedback.
- **Auth cross-links:** staff ↔ portal login links use MineAid accent (`text-mineaid-coral`); **`tailwind.config.ts`** registers `mineaid-*` color utilities so brand classes resolve correctly.
- **Notifications bell:** notification message text uses sans-serif for readability.

### Documentation

- Updated **`docs/AUTH_SYSTEM.md`**, **`docs/SESSION_SECURITY_AND_MFA.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/VERSION.md`**, architecture/RBAC/OIDC guides, and related README files for staff-auth naming and MFA behavior.

## [4.26.0] - 2026-05-31

### Session security, tenant MFA, and expiry warnings

**Versioning:** Shipped as **4.26.0** (minor) — new tenant security policy, staff TOTP MFA, session timing APIs, and client session-expiry UX across staff and portal shells.

- **Tenant session policies** (`tenant_security_settings`): configurable staff absolute/idle timeouts, portal absolute/idle/sliding renewal, optional **`require_mfa`**, and **expiry warning lead** (`session_warning_lead_minutes`, default 3). Admin UI: **Settings → Security**. Migrations: `migrations/20260531_02_session_security_and_mfa.sql`, `migrations/20260531_session_warning_lead.sql`.
- **Staff MFA (TOTP):** optional per tenant via `otplib`; enrollment on **Profile** or forced after login/OIDC when required; backup codes at setup. APIs under `/api/auth/mfa/*` and `/api/admin/security-settings`. See **`docs/SESSION_SECURITY_AND_MFA.md`**.
- **Session expiry UX:** `SessionTimeoutWarning` on staff (`MainLayout`, `SuperAdminLayout`) and portal (`PortalLayout`) — circular countdown ring, **Stay signed in** (keepalive), blocking **Session ended** modal with **Sign in again** (no silent redirect). Read-only timing: `GET /api/auth/session-timing`, `GET /api/portal/auth/session-timing`; keepalive: `POST /api/auth/session-keepalive`, `POST /api/portal/auth/session-keepalive`.
- **MFA login UX:** code field auto-focuses; **auto-submits on 6th digit** (`MfaAuthPanel`, `MfaProfileCard`).

### Patient portal — magic link sign-in and welcome email

- **Magic link login:** email-only primary flow on `/portal/login`; `POST /api/portal/auth/magic-link`, `GET /api/portal/auth/magic-verify`; 15-minute single-use tokens (`portal_magic_login_tokens`, migration `migrations/20260531_01_portal_magic_login_tokens.sql`).
- **Welcome email:** portal account creation sends branded welcome with magic link + password backup (`server/emailTemplates.ts`, admin portal-user create).
- **Email delivery fix:** `sendEmail` uses **Resend OR Gmail** independently (no longer requires all four env vars before attempting either provider).
- **Public navigation:** patient portal links on marketing header/footer, landing hero, and staff **Auth** page.

### Overview reports (`/reports/overview`)

- **New route / UI:** **`/reports/overview`** — executive snapshot composing clinical, incident, operations, and compliance headline KPIs with role-aware section visibility (`OverviewReportsPage.tsx`, reports hub card).
- **New API:** **`GET /api/reports/overview`** — `overview-reports.service.ts`, `overview-reports.routes.ts`; tenant-scoped aggregates with shared filter parsing.

### UX polish

- **Working location modal:** simplified **Select your working location** dialog — compact cards (name + code/badges only), last-used quick confirm, icons, hover shadow states; removed verbose address/capacity/staff details.

### Documentation

- **`docs/SESSION_SECURITY_AND_MFA.md`** (new), **`docs/AUTH_SYSTEM.md`**, **`docs/PATIENT_PORTAL_PLAN.md`**, **`docs/REPORTS_OVERVIEW_MODULE_PLAN.md`**, **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/VERSION.md`**, **`README.md`**, **`docs/README.md`**.

### Database migrations (apply in order)

1. `migrations/20260531_01_portal_magic_login_tokens.sql`
2. `migrations/20260531_02_session_security_and_mfa.sql`
3. `migrations/20260531_session_warning_lead.sql`

## [4.25.1] - 2026-05-28

### Notifications center, delivery controls, and incident edit hardening

- **New in-app notifications center:** added **`/notifications`** (`client/src/pages/NotificationsPage.tsx`) with segmented channels, unread-only toggle, mark-read actions, mark-all-read per channel/all, and direct links from notification payloads.
- **Header/sidebar UX:** replaced placeholder bell with **`NotificationBell`** in both desktop header and shell header; unread badge now appears in sidebar for the Notifications item.
- **Notifications API expansion:**
  - `GET /api/notifications` now supports optional `limit` and `unreadOnly` query params (alongside existing `channel`/`status`).
  - `GET /api/notifications/unread-count` now supports optional `channel` filter.
  - New `PUT /api/notifications/read-all` endpoint supports optional `channel` and marks all unread notifications as read for current user.
- **Storage/service consistency:** `markNotificationRead` and bulk mark-all now set both `readAt` and `status = 'read'`; unread counting now treats either `readAt` present or `status='read'` as read.
- **Incident alert recipient policy:** incident-category alerts now include active **`safety_officer`** users by default (fallback to active `admin` when no candidates); if no preference rows exist for the type, defaults to `email` + `in_app`; explicit disabled rows remain opt-out. Added storage helper `getActiveTenantUsersByRoles` and updated tests in `server/__tests__/notification-preferences.test.ts`.
- **Incident modal edit reliability:** editing incidents now resolves patient context from embedded incident payload or fallback `GET /api/patients/:id` fetch, preventing missing-patient/edit regressions while keeping patient immutable in edit mode.
- **Minor UX copy/content updates:** testing nav labels changed to **Point-of-Care Laboratory** naming; AGA Obuasi deck expanded with operational readiness slide content; removed `select-none` from pitch shell container.

## [4.25.0] - 2026-04-21

### Compliance reports (`/reports/compliance`)

**Versioning:** Shipped as **4.25.0** (minor) because this introduces a **new reports submodule** (`/reports/compliance` + `GET /api/reports/compliance`) and a performance migration for tenant-scoped audit reporting.

- **New route / UI:** **`/reports/compliance`** — tenant **admin** and **super_admin** (with impersonation context) can view compliance-oriented aggregates: audit event KPIs, audit volume trend, by-action and by-resource breakdowns, high-signal action subset, SOP version-status posture, signed legal uploads in range, top actors, and shift handover acknowledgment coverage. Includes filters (`from`/`to`/`groupBy`, optional `auditActions[]`, `auditResourceTypes[]`, location scoping for shift acknowledgment), CSV exports, print output, and in-page exception alerts.
- **New API:** **`GET /api/reports/compliance`** — `server/modules/reports/compliance-reports.service.ts`, `compliance-reports.routes.ts`; tenant-scoped aggregates over `audit_logs`, `tenant_sop_documents`/`tenant_sop_versions`, `tenant_signed_legal_documents`, plus shared shift-ack summary. Response includes `meta`, `kpis`, `series.auditEventsOverTime`, breakdown tables, `shiftHandoverAckSummary`, and `exceptions`.
- **Auth / route guards:** `server/shared/middleware/complianceReportsAuth.ts`, `client/src/components/RequireComplianceReportsAccess.tsx`, and `client/src/routes.ts` (`hasComplianceReportsAccess`), wired into `server/routes.ts`, `server/routes/index.ts`, `client/src/App.tsx`, sidebar config, and reports hub carding.
- **Shared reporting helper:** Added `server/modules/reports/shift-handover-ack-summary.ts` and reused it from operations reports to avoid KPI logic drift across report modules.

### Database / performance

- Added migration **`migrations/20260421_audit_logs_tenant_created_at.sql`** with:
  - `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs (tenant_id, created_at);`
- Mirrored index definition in Drizzle schema (`shared/schema.ts`) for model/database alignment.

## [4.24.0] - 2026-04-21

### Operations reports (`/reports/operations`)

**Versioning:** Shipped as **4.24.0** (minor) because this introduces a **new reports submodule** (`/reports/operations` + `GET /api/reports/operations`), not a patch on existing behavior.

- **New route / UI:** **`/reports/operations`** — tenant **admin** and **super_admin** (with impersonation) can open ticket pipeline analytics (KPIs, aging buckets, status / priority / category mixes, trends), operational **duty** assignments (completion, overdue, by care location, by **catalog duty** and **catalog category**, over time), and **ShiftOver-adjacent** metrics (shift report volume, issues rate, acknowledgment counts/rate, linked-record counts by type). Filters include **assignees** and **requesters**, optional **prior-period KPI compare**, **saved filter presets** (browser local storage, same pattern as incident reports), CSV exports, and print styling aligned with existing reports patterns.
- **New API:** **`GET /api/reports/operations`** — `server/modules/reports/operations-reports.service.ts`, `operations-reports.routes.ts`; tenant-scoped aggregates with `from` / `to` / `groupBy`, optional **`comparePriorPeriod`** (returns **`kpisPriorPeriod`** and **`meta.priorPeriod`**), and optional filters (locations, ticket categories/statuses/priorities, **`assigneeUserIds`**, **`requesterUserIds`**, duty ids/statuses/shifts, shift-report shifts, `onlyWithIssues`). Response **`tables`** include **`ticketsByAssignee`** (open load + resolved-in-window among tickets created in range), **`dutiesByDuty`**, and **`dutiesByCategory`** (join **`operational_duties`**).
- **PostgreSQL hardening (same release):** Open-ticket predicate uses native **`ticket_status`** comparisons (no `coalesce(..., '')`, which broke enum parsing). Duties-by-location uses **`GROUP BY operational_duty_assignments.location_id`** with aggregates for labels, avoiding a Drizzle **`coalesce`**/`GROUP BY` mismatch that triggered `42803`.

### Reports hub

- **`/reports`** hub refinements: role-aware **Operations** entry for authorized users; **available-module** cards use in-card CTAs so body text keeps standard typography (full-card links removed).

### Documentation

- **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`** — **§8.0** implementation snapshot (done vs left); **§8.2** pickup focused on **`ticket_activity`**, performance, median/SLA, and roles.
- **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/API_DOCUMENTATION.md`**, **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`** — version **4.24.0** and operations route/API notes.

### Next implementation (pick up after production testing)

- **R-OPS-4 (remainder):** optional **`ticket_activity`** transition analytics; index/performance pass on hot aggregate queries.
- **Product/analytics:** confirm **shift acknowledgment** KPI when multiple acknowledgments per report exist; median open age / SLA-style fields if policy and schema support them.
- **Roles:** expand operations reports access beyond **admin** / **super_admin** if governance approves.

## [4.23.1] - 2026-04-20

### Incident reports — visualization polish (`/reports/incidents`)

- **Severity mix** switched from bar to **pie** visualization for clearer composition reading.
- **Top care locations** switched from bar to **donut** visualization with shared color palette.
- Added a dedicated **Detained incidents at care locations** section:
  - chart compares **total incidents vs detained incidents** per location,
  - companion right-column table shows location, total, detained, and detained rate.
- Extended incident reports location aggregates with `detainedCount` / `detainedRate` for location-level detained analysis.

### Documentation

- Release/version metadata aligned to **4.23.1**:
  - **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/IMPLEMENTATION_STATUS.md`**

## [4.23.0] - 2026-04-20

### Incident reports — production release (`/reports/incidents`)

- **New route/UI:** **`/reports/incidents`** with production-focused occupational safety analytics: KPI cards, severity/type/status mixes, incident trends over time (including stacked company view), top care locations, top work-site text buckets, company metrics, company×location matrix, day×post matrix, type×severity table, and paginated incident detail (identifier-safe).
- **New API:** **`GET /api/reports/incidents`** with tenant/date/location/company/severity/type/status filtering, prior-period KPI comparison (`comparePriorPeriod`), optional detail (`includeDetail`), and aggregate-first response shape aligned with reports patterns.
- **Access model:** dedicated incident reports auth middleware and UI route guards so incident analytics can be opened by incident-capable roles (including safety-focused roles) without expanding clinical PHI access.
- **Reports navigation:** `/reports` hub and sidebar now surface incidents alongside clinical, with role-aware visibility.
- **UX polish:** incidents matrix table styling and behavior aligned with clinical matrix (bounded scroll container, sticky high-contrast header, tinted totals footer); top incident sites chart updated to multi-color bars.

### Documentation

- Updated reports module docs for incidents delivery and route status:
  - **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`**
  - **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**
  - **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** (incident-routing reference)
- Version and release metadata aligned to **4.23.0**:
  - **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/IMPLEMENTATION_STATUS.md`**

## [4.22.1] - 2026-04-20

### Clinical reports — operator guide UX

- **`/reports/clinical`** — The in-page **How to use this page** card (steps aligned with **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** §4.0) is a **collapsible** section, **closed by default**; expand to read the guide. Omitted from **Print / Save as PDF** output.

### Documentation

- **`docs/VERSION.md`**, **`README.md`**, **`docs/README.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** (§4.0) — version **4.22.1** alignment and operator-guide behavior note.

## [4.22.0] - 2026-04-17

### Medical visits — hospital transfer & ambulance

- **`medical_visits.ambulance_used`** — Capture on **hospital-transfer** dispositions in **new / edit** flows and the **visit details** modal.

### Clinical analytics — ambulance reporting (R-CLIN-4)

- **`GET /api/reports/clinical`** — Ambulance-related KPIs, incident ambulance fields where applicable, and **`tables.ambulanceByClinic`** (per-post rollups).
- **UI (`/reports/clinical`)** — **Ambulance usage** block: summary metrics, **Total ambulance by clinic** bar + table, **By source** breakdown (visit transfer vs incident).

### Documentation

- **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`**, **`docs/MEDICAL_VISIT_FIXES.md`**, **`docs/API_DOCUMENTATION.md`**, **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**, **`docs/VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md`**.

## [4.21.1] - 2026-04-19

### Security — dependency resolutions (npm audit / Dependabot)

- **drizzle-orm** ≥ **0.45.2** — GHSA identifier escaping / SQL injection advisory.
- **vite** ≥ **6.4.2** — dev-server WebSocket arbitrary file read; optimized-deps `.map` path traversal (dev/build tooling only; production bundles do not expose the Vite server).
- **vitest** **4.x** — aligns with patched Vite peer chain.
- **axios** (incl. transitive via `@sendgrid/mail`), **follow-redirects**, **nodemailer** ≥ **8.0.5**, **sanitize-html** ≥ **2.17.3** — moderate-severity fixes from `npm audit fix` / lockfile refresh.

`npm audit` reports **0** vulnerabilities after update. Run `npm run check` and `npm run test:run` after upgrading.

## [4.21.0] - 2026-04-18

### Clinical analytics — `/reports/clinical` (R-CLIN-2 scope)

- **`GET /api/reports/clinical`** — Extended aggregates: triage acuity mix and over time, visit type mix, visit type × disposition, top locations, detention disposition mix, operational continuity KPIs, visits-with-incident overlap, stacked visits over time by company, **cases per post by day** matrix (visits + incidents), **incidents per post** (counts by care location). Company filters applied consistently via patient → employee → company joins where applicable.
- **UI (`/reports/clinical`)** — KPI cards, line/bar/pie/stacked charts, sortable **metrics by company** table, **CSV exports** (by company, breakdown bundle, cases matrix), **Print / Save as PDF** with A4 styling and filter summary (`ClinicalReportsPrintStyles`, print chrome stripping via `clinical-reports-print` body class).
- **Cases per post by day** — Bounded scroll, sticky header/first/last columns, MineAid navy header band; totals row styling and contrast fixes; **Export matrix** CSV.
- **Incidents per post** — Two-column table + donut chart (occupational incident counts only; full `/reports/incidents` hub deferred).
- **UX polish** — Top care locations horizontal bars use multi-series colors; shared **`Table`** supports **`containerClassName`** on scroll wrapper.

### Documentation

- **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** — Implemented sections, exports (CSV + print), API shape notes (`incidentsPerPost`, `casesByDayByPost`), §4.4 build snapshot.
- **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** — Clinical slice progress note.
- **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/IMPLEMENTATION_STATUS.md`** — Version alignment for staging/production testing.

## [4.20.0] - 2026-04-17

### ShiftOver production readiness

- **Shift reports upgraded under ShiftOver (`/shiftover/shift-report`)** with structured handover payload, acknowledgments, linked records, attachments, revision history, and detail-enriched responses for continuity workflows.
- **Open items register (`/shiftover/open-items`)** and **hub summary (`/shiftover`)** wired for location-scoped operational visibility.
- **Linked-record UX hardening:** replaced manual UUID-only linking with searchable picker data from tickets/incidents/duty assignments, plus **multi-select** add flow.
- **Routing/navigation:** ShiftOver docs and route governance updated; `/reports` remains reserved for comprehensive reporting module.

### Documentation and release tracking

- **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`** updated for 4.20.0 release and testing rollout context.
- Added comprehensive reports planning doc: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**.
- Updated ShiftOver planning/governance docs:
  - **`docs/SHIFTOVER_IMPLEMENTATION_PLAN.md`**
  - **`docs/SHIFTOVER_SYSTEM_ADDENDUM.md`**

## [4.19.1] - 2026-04-11

### Documentation — OIDC / Microsoft Entra

- **`.env.example`**, **`docs/OIDC_LOGIN_PLAN.md`**: Clarify that **Microsoft Entra** must register **`{FRONTEND_URL}/api/auth/oidc/microsoft/callback`** (not the Google-only path); local vs production origins; `common` vs `organizations` for MSA vs work-only.
- **`docs/IMPLEMENTATION_STATUS.md`**, **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/API_DOCUMENTATION.md`**: Microsoft OIDC **validated locally** with a personal Microsoft account; production still requires per-host redirect URIs and may require enterprise admin consent.

## [4.19.0] - 2026-04-10

### OIDC sign-in (Google & Microsoft)

- **Backend:** OpenID Connect via **`openid-client`** (authorization code + PKCE, state, nonce). Routes: **`GET /api/auth/oidc/google/start`**, **`GET /api/auth/oidc/google/callback`**, **`GET /api/auth/oidc/microsoft/start`**, **`GET /api/auth/oidc/microsoft/callback`** (mounted under **`/api`**). Session storage for PKCE in **`express-session`** (`server/types/express-session.d.ts`).
- **User model:** **`users.oauth_issuer`**, **`users.oauth_sub`** (partial unique index when both set). Migration: **`migrations/20260405_users_oauth_oidc.sql`**. Drizzle: **`shared/schema.ts`**.
- **Auth logic:** **`CustomAuthService.completeOidcLogin`** — invite-only: match by `(iss, sub)` or link existing user by normalized email (`custom` or same provider); no JIT provisioning. Optional **`OIDC_ALLOWED_EMAIL_DOMAINS`**. Errors redirect to **`/auth?error=oidc_*`**.
- **Config:** **`server/config/env.ts`** — `GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET`, `MICROSOFT_OIDC_CLIENT_ID`, `MICROSOFT_OIDC_CLIENT_SECRET`, `MICROSOFT_OIDC_TENANT` (default `organizations`). **`.env.example`** updated.
- **Storage:** **`getUserByEmailNormalized`**, **`getUserByOidcSubject`**; admin user listing select includes OAuth columns.
- **UI:** **`AuthPage`** — Continue with Google / Microsoft; toast mapping for OIDC query errors.
- **Docs:** **`docs/OIDC_LOGIN_PLAN.md`** (architecture + checklist).

### Microsoft sign-in — operational note

- Code and routes ship in **4.19.0**. **Entra** setup (manifest `requestedAccessTokenVersion`, `signInAudience`, exact **redirect URIs** including **`/api/auth/oidc/microsoft/callback`**, `common` vs `organizations`, tenant admin consent) is **environment-specific** and may still be incomplete until fully validated.

### Documentation

- **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/API_DOCUMENTATION.md`** updated for **4.19.0**.

## [4.18.0] - 2026-04-06

### Super Admin — support impersonation

- **Session swap:** Global super admins can **start** and **end** impersonation of a **tenant** user for support (`POST /api/super-admin/impersonation/start`, `POST /api/super-admin/impersonation/end`). Target must not be `super_admin`. Session columns on `user_sessions`; event log `impersonation_events`. Migration: **`migrations/20260404_super_admin_impersonation.sql`**.
- **Audit:** Tenant CRUD under impersonation records `impersonatorUserId` in audit payload; **`GET /api/super-admin/impersonation-events`**, **`GET /api/super-admin/impersonation-audit-logs`**, **`GET /api/super-admin/impersonation-events/:eventId/audit-logs`**. UI: **`/super-admin/impersonation-log`**; banner **`ImpersonationBanner`** in **`MainLayout`** while active.
- **Spec:** **[IMPERSONATION.md](./IMPERSONATION.md)**.

### Public legal hub & manual signed documents

- **Public (no auth):** **`/legal`**, **`/legal/:docId`** — HTML from markdown under **`docs/`** via **`GET /api/legal/documents`**, **`GET /api/legal/document/:id`**, **`GET /api/legal/document/:id/raw`**. Server: **`server/modules/legal/`**. Supporting copy: **`COMMERCIAL_AGREEMENT.md`**, **`DATA_PROCESSING_ADDENDUM.md`**, **`BUSINESS_ASSOCIATE_AGREEMENT_TEMPLATE.md`**, **`SUBPROCESSORS.md`**.
- **Tenant admins:** Upload executed PDF/Word after manual signing — **`/admin/legal-agreements`** ( **`MainLayout`** ). API: **`GET`/`POST /api/admin/legal-signed-documents`**, **`GET .../:id/download`**. Storage category **`signed-legal-documents`** (private path / blob).
- **Super Admin:** Cross-tenant list and download — **`/super-admin/signed-legal-documents`**. API: **`GET /api/super-admin/legal-signed-documents`**, **`GET .../:id/download`**. Table **`tenant_signed_legal_documents`**. Migration: **`migrations/20260404_tenant_signed_legal_documents.sql`**.
- **Email:** Invitation and verification templates link **`/legal`** and admin upload path; removed optional paid e-sign env (`LEGAL_ESIGN_URL`).

### Super Admin — system console routes (UI)

- Dedicated pages (replacing placeholders where wired): **`/super-admin/system-status`**, **`/super-admin/security`**, **`/super-admin/audit`**, **`/super-admin/integrations`**, **`/super-admin/billing`** — see **[SUPER_ADMIN_SYSTEM_CONSOLE.md](./SUPER_ADMIN_SYSTEM_CONSOLE.md)** and existing **`GET /api/super-admin/system-status`**, **`global-audit-logs`**, **`integrations-status`**.

### Registration & policy acceptance

- **Custom auth registration** requires acceptance of Terms and Privacy (`acceptTermsAndPrivacy`); **Auth**, **Privacy**, and **Terms** pages updated accordingly. Types: **`client/src/types/auth.ts`**.

### Documentation

- **`README.md`**, **`docs/README.md`**, **`docs/VERSION.md`**, **`docs/IMPLEMENTATION_STATUS.md`**, **`docs/API_DOCUMENTATION.md`** updated for **4.18.0**.

## [4.17.0] - 2026-04-05

### Super Admin — UMA Obuasi pitch deck

- **Fullscreen deck (super admin):** **`/super-admin/pitch-uma-obuasi`** — stakeholder pitch for **UMA (Underground Mining Alliance)** at Obuasi (underground contractor / First Aider narrative). Data: `pitchDeckUmaObuasiData.ts`; shell: `SuperAdminPitchDeckUmaObuasi.tsx`. **Commercial** nav: **Pitch: UMA Obuasi** (`HardHat` icon).
- **Narrative source:** `docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md` (full appendix speaker notes). Cross-link from `docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md`.

### Documentation

- `README.md`, `docs/README.md`, `docs/VERSION.md`, `docs/IMPLEMENTATION_STATUS.md` updated for **4.17.0**.

## [4.16.0] - 2026-04-04

### Super Admin — commercial pitch decks & print documents

- **Fullscreen pitch decks (super admin only):** **`/super-admin/pitch`** (feature-centered enterprise deck), **`/super-admin/pitch-why`** (Start With Why narrative, `pitchDeckV2Data.ts`), **`/super-admin/pitch-aga-obuasi`** (AngloGold Ashanti Obuasi–personalized deck, `pitchDeckAgaObuasiData.ts`). Shared UI: `PitchDeckShell.tsx`, `PitchSlideBody.tsx`, `pitchDeckTypes.ts`. Keyboard navigation and fullscreen as on other decks.
- **Print / PDF–friendly enterprise pages:** **`/super-admin/concept-note`** (renders `docs/MINEAID_ENTERPRISE_CONCEPT_NOTE.md`), **`/super-admin/business-proposal`** (renders `docs/MINEAID_BUSINESS_PROPOSAL.md`). Shared utilities: `client/src/lib/superAdminPrintDocument.ts`, `SuperAdminPrintDocumentStyles.tsx`, `ensureSourceSans3.ts`; print surface class **`super-admin-print-document`** in `client/src/index.css`.
- **Navigation:** `superAdminNav.tsx` **Commercial** section links for all of the above; `SuperAdminLayout.tsx` treats pitch and print-document routes like existing fullscreen super-admin experiences (minimal chrome where applicable).
- **Supporting markdown (canonical copy):** `docs/MINEAID_ENTERPRISE_CONCEPT_NOTE.md`, `docs/MINEAID_BUSINESS_PROPOSAL.md`, `docs/MINEAID_PITCH_DECK_V2_START_WITH_WHY.md` (narrative maintenance for the Why deck), `docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md` (stakeholder narrative source for the Obuasi deck).

### Documentation

- `README.md`, `docs/README.md`, `docs/VERSION.md`, `docs/IMPLEMENTATION_STATUS.md` updated for **4.16.0**.

## [4.15.0] - 2026-04-03

### Tenant Standard Operating Procedures (SOP)

- **Library (read-only):** `GET /api/sops/library`, `GET /api/sops/library/:documentId` — tenant users browse **published** procedures. UI: **`/sop`** (`SOPLibrary.tsx`, `MainLayout`). HTML is sanitized on read.
- **Admin (tenant administrators):** Full CRUD and lifecycle — draft → pending approval → published (prior published version archived) or rejected; optional **attachment** upload per version (`multipart` → private file storage / blob path). UI: **`/admin/sops`** (`SopAdministration.tsx` + `SopAdminWorkspace.tsx`), standalone layout (outside main app chrome) with catalogue sidebar, tabbed filters, and document editor.
- **Data:** Tables `tenant_sop_documents`, `tenant_sop_versions`; enum `tenant_sop_version_status`. Migrations: `20260403_02_tenant_sop_module.sql`, `20260403_03_seed_tenant_sops.sql` (idempotent seed per tenant).
- **Editor:** `SopRichTextEditor` (TinyMCE); `VITE_TINYMCE_API_KEY` in `.env` for the client.
- **Sanitization:** `server/shared/ticketHtmlSanitize.ts` on write and library GET — **no `data:` URLs** in stored HTML; `img` allowed for `http`/`https` only. Prefer attachments for files.
- **Server limits:** JSON body default **1mb** (`JSON_BODY_LIMIT` optional) for rich HTML without inline base64 images.

### Patient record & tenant patient portal (foundation)

- **Health profile on `patients`:** allergies, medical history, medications, disability, notes (migration `20260402_01_patient_health_profile.sql`). Staff flows: `PatientHealthProfileFields`, registration/detail updates.
- **Portal identity & settings:** `portal_users`, portal sessions, `tenant_portal_settings`; migrations `20260402_02_patient_portal_foundation.sql`, `20260402_03_employee_profile_image.sql` (profile photo on `employees.profile_image_url`).
- **Staff:** **Settings → Patient portal** — enable portal, organization code, support links, create/delete portal accounts (patient + email + password).
- **Patient UX:** **`/portal/login`** (optional `?org=` slug), **`/portal/*`** behind portal session (`PortalLayout` / `PortalProtected`). **Server:** `server/modules/portal` — public tenant branding by slug, login/logout/session, profile & health-profile updates, read-only vitals/visits/appointments where implemented. See **[PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)**.

### In-app Changelog page

- **API:** `GET /api/changelog` — reads `docs/CHANGELOG.md`, parses version sections (`server/modules/changelog/changelogHtml.ts`), returns `{ introHtml, sections[] }` with sanitized HTML; short `Cache-Control` cache.
- **UI:** **`/changelog`** — `Changelog.tsx` (staff `MainLayout` + sidebar); also linked from **PublicLayout** / **PublicFooter** for marketing. Collapsible sections with version badges.

### Super Admin file layout

- Super-admin screens under **`client/src/pages/super-admin/`** (dashboard, system console, registration, etc.). Routes unchanged (`/super-admin`, `/super-admin/dashboard`, …).

### Tickets & migrations

- **Categories:** `20260403_01_remove_platform_support_ticket_categories.sql` removes legacy platform-support categories in favour of tenant-scoped behaviour.

### Documentation

- `README.md`, `docs/README.md`, `VERSION.md`, `SOP_MODULE_IMPLEMENTATION.md`, `MIGRATION_GUIDE.md`, `IMPLEMENTATION_STATUS.md` updated for this release.

## [4.14.0] - 2026-04-01

### Staff tickets — UX, RBAC, and file storage

- **Requester vs admin edits:** Only the **requester** may update ticket **content** fields (title, description HTML, location, incident/asset links) when the ticket is not closed or cancelled; **admins** retain **triage** updates (assignee, category, status workflow, priority). Server rejects mixed content + triage in a single `PATCH`.
- **Attachments:** Multiple files on **new ticket** flow after create; detail page uploads unchanged. Upload category **`ticket-documents`** stores under the tenant path on **Vercel Blob** (`mineaidhms-blob/tenants/<tenantId>/ticket-documents/…`). Blob `put` uses **`access: "public"`** (required by the current token/SDK).
- **API:** `POST /api/tickets/:id/attachments` response includes **`storageBackend`**: `"vercel-blob"` or `"local"`; client shows a toast when storage falls back to local so uploads are not silent failures.
- **File storage:** `server/fileStorage.ts` and `server/vercelBlobStorage.ts` aligned with public blob objects; clearer logging when Blob fails before local fallback; local public path for `ticket-documents` category.

### Global UI and Operations

- **Typography:** MineAid accent on headings `h1`–`h6`; refined scale (`h2` / `h3`); **CardTitle** default accent at `text-lg`.
- **Tables:** Body/footer links use accent color (destructive actions excepted).
- **Copy:** Intro paragraphs aligned with Records/Tickets pattern on **Reports**, **Assignment History**, and **Operational Duties**.
- **Sidebar / Ambulance:** **Ambulance & EMS** is a collapsible group with **Fleet**, **Pre-start checks**, and **On-board inventory** (`/ambulance#…`). **MainLayout** treats hash URLs as active; **AmbulanceModule** syncs the active tab with `location.hash` and navigation.

### Documentation

- Updated `docs/E_TICKETING_STAFF_PLAN.md`, `docs/FILE_UPLOAD_SYSTEM_SUMMARY.md`, and `docs/RBAC.md` for the above.

## [4.13.0] - 2026-04-01

### Staff e-ticketing (operations)

- Added **tenant-scoped staff e-ticketing**: categories, numbered tickets (`TKT-YYYY-#####`), rich descriptions and comments (**TinyMCE** on the client, **sanitize-html** allowlist on the server), attachments (reuse incident-style upload limits), and an immutable **activity** trail.
- **RBAC:** staff see tickets they raised or that are assigned to them; **admins** see the full queue, assign/triage, and manage categories; assignees may set **in progress / resolved** and priority; internal comments for assignees and admins only.
- **UI:** Operations → **Staff tickets** (`/tickets`, `/tickets/new`, `/tickets/:id`).
- **Data:** migration `20260401_03_staff_e_ticketing.sql`; Drizzle models in `shared/schema.ts`.

### Documentation

- Updated `docs/RBAC.md` and `docs/E_TICKETING_STAFF_PLAN.md` to reflect implementation.

## [4.12.0] - 2026-04-01

### Ambulance & EMS module expansion
- Added a dedicated **On-board inventory** tab to `Ambulance & EMS` (`/ambulance#inventory`) that reuses the core inventory UI in ambulance mode.
- Added unit-level transfer actions in ambulance detail (`/ambulance/units/:id`): inbound `in_transit` rows can now be **received** directly from the Transfers tab.
- Extended ambulance unit detail with stronger transfer/stock visibility and live refresh after receive.

### Ambulance-scoped inventory behavior
- Added ambulance-only inventory query mode (`ambulanceOnly=true`) for list retrieval and UI filtering by ambulance locations.
- Updated inventory filtering/display so on-board inventory is scoped to ambulance locations and location labels are clearer in ambulance context.
- Added create/edit ergonomics for ambulance inventory flows, including ambulance-target selection for new stock lines.

### Fleet register quality-of-life updates
- In ambulance register dialog, **short code auto-generates from ambulance name** in create mode (with manual override support).
- Increased register dialog heading typography for better readability.

### Backend and data model support
- Added/updated ambulance care-location support and pre-start checklist migration sequence:
  - `20260401_01_ambulance_care_locations.sql`
  - `20260401_02_emt_and_ambulance_prestart.sql`
- Added ambulance module middleware/routes and inventory list filtering support by care-location kind.

### Documentation updates
- Updated `AMBULANCE_MANAGEMENT_AND_INVENTORY_PLAN.md` to reflect implemented Phase 1 scope (fleet, pre-start, on-board inventory, transfer receive).
- Expanded `RBAC.md` with recommended ambulance-focused roles and intended usage (`fleet_manager`, `ems_shift_lead`, `ambulance_storekeeper`, `dispatch_coordinator`, `ems_observer`).

## [4.11.0] - 2026-04-01

### Role-based access and clinical APIs
- Added server `requireClinicalAccess` middleware (`medical_staff`, `admin`, `super_admin`) and applied it across patient, clinical, appointments, procedures, referral-facilities, and related routes so `safety_officer` cannot access PHI/clinical endpoints by URL.
- Extended `customAuth` session handling as needed for consistent authorization.
- Added client `RequireClinicalAccess` guard and `CLINICAL_ACCESS_ROLES` / `getPostLoginHome` in `routes.ts`: non-clinical roles default to operational duties after login; global super admins land on `/super-admin/dashboard`.
- Updated `RequireRole`, sidebar types/config, and protected routing in `App.tsx` for clinical vs operational access.

### Incidents and safety-officer visibility
- Server-side incident payload redaction for safety officers (`incidentSafetyRedaction.ts`) with Vitest coverage; aligned client display helpers (`incidentSafetyDisplay.ts`) in incident list and modals.
- Refined incidents UI for role-appropriate fields and safer dispensed-items presentation.

### Super admin console and navigation
- Introduced `SuperAdminLayout` (sidebar aligned with tenant app shell), `superAdminNav` config, dashboard at `/super-admin/dashboard`, and hash-tabbed console at `/super-admin` (`#tenants`, `#admins`, etc.).
- Fixed hash tab navigation when entering the console from `/super-admin/dashboard` or other routes (full navigation with hash when not on console; pathname-driven hash sync on the console page).
- Added placeholder/system dashboard pages for future metrics; `SuperAdmin.tsx` metrics retained above tabs.

### Auth, profile, and medical workflows
- Auth flow and `useAuth` updates for role-aware behavior and super-admin paths.
- Profile and medical visit flows updated for clinical access rules and disposition handling; `insertMedicalVisitSchema` accepts optional `dispositionDateTime`.
- New internal **SOP** page (`/sop`) and routing.

### Offline and sync
- Client offline store and sync client refinements; documentation updates in `OFFLINE_MODE_AND_SYNC.md`.

### Documentation
- Added consolidated **[RBAC.md](RBAC.md)** (roles, access matrix, enforcement locations).
- Updated **[README.md](README.md)** (docs index) to reference RBAC and current version.

## [4.10.0] - 2026-03-24

### Public experience and layout decoupling
- Decoupled public pages from authenticated app shell: public routes now render via `PublicLayout` instead of `MainLayout`.
- Added dedicated public pages for `about`, `contact`, `features`, `privacy`, `terms`, and `security`.
- Added reusable public footer and normalized route/anchor links for public navigation.
- Ensured logged-in users can still access user actions from the public header without app sidebar/context bleed.

### Navigation and mobile UX
- Added public navbar links for logged-out users.
- Implemented mobile overlay menu with right-slide behavior, outside-click close, constrained width, and staggered link animation.
- Refined overlay to slide under header rather than cover it.

### Typography and UI polish
- Imported and applied Google Font **Odibee Sans** across headings and display actions (links/buttons).
- Added consistent letter spacing for headings, buttons, links, and table headers.
- Increased tab trigger typography and adjusted protected-page heading scale (`h2`/`h3`) for stronger visual hierarchy.

### Scroll behavior fixes
- Hardened route-level scroll reset so new pages open from top across both protected and public flows.
- Added manual scroll restoration control and explicit app/public scroll region targeting to prevent stale position retention.

### Offline/sync foundation (in progress)
- Added initial sync module routing on server and baseline sync endpoint scaffold.
- Expanded client sync types/helpers and wired initial offline-related updates in affected client modules.

### Documentation and legal
- Added public layout decoupling architecture doc.
- Added legal docs: Privacy Policy, Terms of Service, Commercial Agreement, and Business Associate Agreement.

## [4.9.0] - 2025-03-07

### Resend API Integration & Professional Email Refactor

#### Hybrid Email Strategy
- **Production (Railway)**: Integrated **Resend SDK** to bypass SMTP port blocks on Railway's infrastructure. Uses HTTPS (Port 443) for reliable delivery, resolving previous `Connection Timeout` and `SIGTERM` container crashes.
- **Local Development**: Implemented a **Safe Initialization** pattern that automatically falls back to **Gmail SMTP** when Resend keys are absent, ensuring zero-config local testing.
- **Provider Logging**: Updated `NotificationDeliveryLog` to dynamically track the delivery method as either `resend_api` or `gmail_smtp` based on the active environment.

#### Bug Fixes & Technical Debt
- **Stability**: Fixed a fatal error where the application would crash on startup if `RESEND_API_KEY` was undefined in the environment.
- **Audit Trail**: Ensured all automated system emails now record correct provider metadata in the database for better delivery troubleshooting.

#### Docs
**Refer to docs**: `docs/RESEND_IMPLEMENTATION.md`


## [4.8.3] - 2026-03-07

### SMTP and Port 

- Changed smtp settings using the explicit host/port settings instead of the service shortcut to try and fix mail sending timeout and failure issue in preview/production environment. 
- Changed Port: 5000 to :17009.

## [4.8.2] - 2026-03-07

### UI color modifications
- Minor CSS color changes on buttons 
- Changed landing page accent color to **new orange #F6621E**. 
- Testing out the new color in UI. Intention to permanently replace the accent/mineaid-coral with this system-wide.

## [4.8.1] - 2026-03-07

### Triage and Dependabot Alert fixes. MineAid HMS – Offline Mode & Sync Design

#### Triage form and Dependabot fixes 
- Fixed to use correct SATS parameters. 
- All discriminators added.
- Dependency audit fixes to resolve Dependabot alerts through **npm audit fix --force**.

#### MineAid HMS – Offline Mode & Sync Design

**Status**: Draft – Design Approved, Implementation Pending  
**Target Version**: 4.9.0 (proposed)  
- Doc for offline system functionality added and baseline implementation started. 
- Offline banner working correctly and auto-displays when offline.
##### Docs
**Refer to docs**: `docs/OFFLINE_MODE_AND_SYNC.md`


## [4.8.0] - 2026-03-04

### Employee wellbeing module (employee wellbeing) and follow-up reminders

#### Employee wellbeing: follow-ups, medications, feedback, dashboard
- **Module scope**: Employee wellbeing hub (“Employee wellbeing”) covering follow-ups (onsite + external care), employee Work fitness & medications, and feedback/surveys for treatment services, with an overview dashboard.
- **Backend**: New Employee wellbeing routes under `/api/wellbeing/*` for follow-ups, employee Work fitness & medications, and feedback (including public feedback submit + public-context, and staff list/get/update). Uses tenant-isolated tables `patient_follow_ups`, `employee_work_fitness_cases`, and feedback tables added via `20260310_WELLBEING_followups_and_feedback.sql`.
- **Frontend**: Employee wellbeing entry in sidebar with pages for **Follow-ups**, **Medications**, **Feedback**, and an overview **dashboard**, plus a public feedback form at `/feedback` and a tenant-branded QR **feedback poster** at `/wellbeing/feedback-poster`.
- **RBAC (module-level)**: Read/write split for Employee wellbeing using `requirewellbeingRead` / `requirewellbeingWrite`; safety officers have read-only access to Employee wellbeing data with additional work-impact restrictions for Work fitness & medications. UI hides create/edit/assess/share actions for `safety_officer` where appropriate. See `docs/WELLBEING_IMPLEMENTATION_STATUS.md` and `docs/WELLBEING_MODULE_PLAN.md` for full details.

#### Follow-up due/overdue notifications
- **Notification type**: New `follow_up_due` notification type (category `WELLBEING`) added via `migrations/add_follow_up_due_notification_type.sql`. Treated as a system-level type for recipient resolution (falls back to tenant admins when no preferences exist).
- **Cron job**: Daily cron at **7:00 AM** server time runs `processAllTenantsFollowUpDueReminders(storage)` from `server/notificationTriggers.ts`, invoked from `initializeCronJobs` in `server/cronJobs.ts`.
- **Logic**: For each tenant, lists follow-ups that are due or overdue (`dueOnly: true`) and have `reminder_sent_at` null; sends one digest email per tenant (HTML email from `getFollowUpDueReminderEmail`) summarizing patients, scheduled dates, reasons, and context (onsite/external); then sets `reminder_sent_at` so each follow-up is only reminded once until updated.
- **Email template**: New `getFollowUpDueReminderEmail` in `server/emailTemplates.ts` uses the shared branded email shell and renders a compact table of follow-ups with a “View follow-ups” button linking to `/wellbeing/follow-ups`.

#### Documentation
- **Module docs**: `docs/WELLBEING_MODULE_PLAN.md` (design/spec) and `docs/WELLBEING_IMPLEMENTATION_STATUS.md` (implementation status, including RBAC and notification behaviour).
- **Migration guide**: `docs/MIGRATION_GUIDE.md` updated to include `20260310_WELLBEING_followups_and_feedback.sql`, `20260311_medical_visit_follow_up_required.sql`, and `add_follow_up_due_notification_type.sql` in the upgrade order.
- **Top-level docs**: `docs/README.md`, `docs/VERSION.md`, and `docs/IMPLEMENTATION_STATUS.md` updated to reflect 4.8.0 and link to the Employee wellbeing module docs.

---

## [4.7.0] - 2026-02-26

### Medical visits: disposition options and tenant referral/transfer facilities

#### Disposition options
- **Disposition values**: Replaced with **Return to Work**, **Transferred to Hospital**, **Transferred to Hospital (Other)**. Removed Light Duty, Off Duty, Refer to Specialist, and Emergency Transfer from the primary options on create/edit forms.
- **Medical visit form**: When "Transferred to Hospital" is selected, a **Transfer facility** dropdown appears (tenant-specific list from `/api/referral-facilities`). When "Transferred to Hospital (Other)" is selected, an **Other facility name** text field appears.
- **Records & PatientDetails**: Edit forms use the same three disposition options and conditional facility dropdown / other field.
- **Details modal & formatters**: New disposition labels and colours; when disposition is transferred to hospital, the modal shows **Facility:** (selected facility name or free text).

#### Referral / transfer facilities (tenant-scoped)
- **Schema**: New table `referral_facilities` (id, tenant_id, name, address, contact_phone, contact_email, status). Columns on `medical_visits`: `transfer_facility_id` (FK to referral_facilities), `transfer_facility_other` (text for "other").
- **Migrations**: **`20260301_referral_facilities_and_transfer.sql`** (table + medical_visits columns), **`20260302_referral_facilities_contact_email.sql`** (contact_email column).
- **API**: `GET /api/referral-facilities` (list for current tenant; optional `?includeInactive=true`), `GET /api/referral-facilities/:id`, `POST /api/referral-facilities` (admin), `PUT /api/referral-facilities/:id` (admin), `DELETE /api/referral-facilities/:id` (admin).
- **Storage**: getReferralFacilities, getReferralFacility, createReferralFacility, updateReferralFacility, deleteReferralFacility. Medical visit list/get join facility so responses include `transferFacility: { id, name }` when set.
- **Admin → Locations**: New **Referral / transfer facilities** card with table (Name, Address, Contact, Email, Status), **Add facility** button, and per-row **Actions** dropdown (Edit, Delete). Create/Edit dialogs include name, address, contact phone, email, and (on edit) status.

#### Create fix and CRUD
- **Referral facility create**: Insert now uses explicit values and throws if no row is returned, avoiding false 200 success when nothing was inserted.
- **Contact email**: Added `contact_email` to referral_facilities and Admin UI.

#### Files changed (this release)
- **Modified**: `shared/schema.ts`, `server/storage.ts`, `server/routes/index.ts`, `client/src/pages/MedicalVisit.tsx`, `client/src/pages/Records.tsx`, `client/src/pages/PatientDetails.tsx`, `client/src/pages/Admin.tsx`, `client/src/components/modals/MedicalVisitDetailsModal.tsx`, `client/src/lib/formatters.ts`.
- **Added**: `server/modules/referral-facilities/` (controller, routes), `migrations/20260301_referral_facilities_and_transfer.sql`, `migrations/20260302_referral_facilities_contact_email.sql`.

---

## [4.6.0] - 2026-02-23

### Medical visits: procedures master table, medications given, detained/ambulance, UI refinements

#### Procedures master table and Settings
- **Master procedures table**: New tenant-scoped `procedures` table (id, tenant_id, name, sort_order, is_active). Replaces hardcoded procedure list for "Procedures Performed" on medical visits.
- **API**: `GET /api/procedures` (any auth, optional `?activeOnly=false`), `POST/PUT/DELETE /api/procedures/:id` (admin only). Storage methods: getProcedures, createProcedure, updateProcedure, deleteProcedure.
- **Settings → Procedures tab**: New config tab to add, edit, toggle active, and delete procedures. Table with name, order, active, actions; add form (name + order).
- **Seed**: Migration **`20260226_procedures_master_and_seed.sql`** creates table and seeds 20 common procedures for tenants that have none.
- **Medical Visit & Records**: Procedures dropdown and edit form now fetch options from `/api/procedures` instead of a hardcoded list.

#### Medical visits – medications given and new fields
- **Medications prescribed → Medications given**: Free-text "Medications Prescribed" removed; "Medications given" is recorded via the existing **items used / dispensed** picker (inventory transactions). Picker moved into the Treatment section. Details modal shows "Medications given" from dispensed items (and legacy medications text if present).
- **Detained at FAP/Clinic**: New boolean `detained_at_facility` on medical_visits. Treatment section: "Was the patient kept at the medical facility?" (Switch on create, Checkbox on edit). Shown in details modal.
- **Ambulance Used**: New boolean `ambulance_used`. Shown in Disposition section when disposition is "Emergency Transfer"; "Was emergency transport required?" (Switch/Checkbox). Details modal shows "Ambulance used: Yes/No" when disposition is emergency.
- **Migration**: **`20260227_medical_visit_detained_ambulance.sql`** adds `detained_at_facility` and `ambulance_used` columns.

#### Physical Examination & Assessment
- **Assessment & Diagnosis → Impression / Diagnosis**: Label and section titles updated in create form, edit forms (Records, PatientDetails), and Medical Visit Details modal.

#### Treatment section layout
- **Treatment card**: Responsive **3-column grid** on large screens (`lg:grid-cols-3`). Four children each use one column: Treatment Provided, Detained at FAP/Clinic, Medications given, Procedures Performed. Single column on small screens.

#### Medical Visit Details modal
- Section order: Medications given (from dispensed items + legacy text), then Procedures Performed, then Disposition & Follow-up.
- Disposition card shows "Ambulance used: Yes/No" when disposition is emergency.
- Treatment card shows "Detained at FAP/Clinic" when set.

#### Version
- **package.json**: Bumped to **4.6.0**.
- **docs/VERSION.md**: Marked **4.6.0** as Current Version.

#### Files changed (this release)
- **Modified**: `client/src/components/modals/MedicalVisitDetailsModal.tsx`, `client/src/pages/MedicalVisit.tsx`, `client/src/pages/PatientDetails.tsx`, `client/src/pages/Records.tsx`, `client/src/pages/Settings.tsx`, `server/routes/index.ts`, `server/storage.ts`, `shared/schema.ts`, `package.json`, `docs/CHANGELOG.md`, `docs/VERSION.md`.
- **Added**: `server/modules/procedures/` (controller, routes), `migrations/20260226_procedures_master_and_seed.sql`, `migrations/20260227_medical_visit_detained_ambulance.sql`.

---

## [4.5.0] - 2026-02-23

### Shift reporting and migration year fix

#### Shift reporting (Operations)
- Added **Reports** under Operations: route **`/reports`**, sidebar entry (ClipboardList icon), full CRUD for shift reports.
- **List page**: Top-level filters (date range, location, shift); table with 3-dot dropdown per row (View, Edit, Delete). Delete uses **AlertDialog** confirmation.
- **Form**: Single modal for "New shift report" and Edit; report date, shift, **summary** (select of short sentences), single **Report details** textarea (condensed account). Location from logged-in user's active location.
- **Auto-activities**: On submit, completed operational duties for the selected date/location/shift are fetched and **appended** to the user's report details, then stored as `notes`.
- **View modal**: Read-only report details (combined notes/activities/handover for backward compatibility).
- **Backend**: New `server/modules/shift-reports/` (controller, routes); storage methods in `server/storage.ts`; `shift_reports` table and types in `shared/schema.ts`. Migrations: **`20260225_shift_reports.sql`**.

#### Migration year prefix fix
- Renamed recent migration SQL files from **2025** to **2026** prefix so filenames match the actual year.
- Removed old 2025-prefixed migration files; only 2026-prefixed versions remain (e.g. `20260220_*`, `20260221_*`, `20260222_*`, `20260223_*`, `20260224_*`, `20260225_shift_reports.sql`, `20261119_*`).
- Updated **docs/CHANGELOG.md** and **docs/VERSION.md** references to use the new migration filenames.

#### Version
- **package.json**: Bumped to **4.5.0**.
- **docs/VERSION.md**: Marked **4.5.0** as Current Version.

#### Files changed (this release)
- **Modified**: `client/src/App.tsx`, `client/src/config/sidebarConfig.tsx`, `client/src/routes.ts`, `server/routes/index.ts`, `server/storage.ts`, `shared/schema.ts`, `docs/CHANGELOG.md`, `docs/VERSION.md`.
- **Added**: `client/src/pages/Reports.tsx`, `docs/SHIFT_REPORTING_FEATURE_PLAN.md`, `server/modules/shift-reports/` (controller + routes), migrations `20260220_*` through `20260225_shift_reports.sql`, `20261119_add_test_location_to_instant_tests.sql`.
- **Removed**: All `migrations/2025*.sql` files (replaced by 2026-prefixed equivalents).

---

## [4.4.0] - 2025-02-23

### Tenant settings, branding, currency integration, and duty spawner refinements

#### Tenant settings & branding
- Added **tenant-scoped `/settings` page** for admins to configure high-level tenant settings:
  - Currency preference for UI and inventory.
  - Application name (used in document title).
  - Tenant logo (sidebar and header).
  - Primary theme color.
  - Favicon.
- Implemented confirm dialogs for **Save settings** and **Restore to defaults**, so tenant-wide changes are explicit and auditable.
- New documentation: `docs/TENANT_SETTINGS_AND_BRANDING.md` describes the settings surface, API contract, and branding propagation.

#### Currency integration
- Introduced `useTenantSettings` hook and `lib/currency.ts` helper to centralize tenant currency and formatting.
- Updated monetary displays to use tenant currency (symbol + locale formatting) instead of hardcoded `$`:
  - `Inventory` – total inventory value.
  - `PurchaseOrders` – PO totals, item unit and total costs.
  - `InventoryTransactions` – unit and total cost columns + detail views.
  - `TransactionHistory` – unit and total cost columns + detail views.

#### Branding application
- New `TenantBranding` component mounted at app root:
  - Applies tenant favicon via `<link rel=\"icon\">` / `<link rel=\"shortcut icon\">`.
  - Updates CSS variables (`--mineaid-navy`, `--primary`) so buttons, nav, and accents follow the tenant primary color.
  - Updates `document.title` to `\"{appName} | MineAid HMS\"` when a custom app name is set.
- `MainLayout` sidebar/header now use `settings.logoUrl` when available, falling back to MineAid default logos.

#### File storage for tenant branding
- Added `tenant-branding` upload category for logos and favicons:
  - When **Vercel Blob** is configured, uploads are stored as **public** blobs and URLs are directly usable in `<img>` / favicon tags.
  - When Blob is unavailable or fails, uploads fall back to **local** storage under `public/tenants/<tenantId>/tenant-branding/...`, served by Express at `/public/tenants/...`.
- Extended content type handling to support **SVG** and **ICO** favicons and tightened upload validation so we no longer report success without a persisted file or valid URL.

#### Duty spawner & shift naming
- Added and wired migrations:
  - `20260222_add_tenant_settings.sql` – tenant settings columns for currency and branding.
  - `20260223_shift_evening_to_night.sql` and `20260224_shift_morning_to_day.sql` – align duty shift naming with operational usage (e.g. evening→night, morning→day) for spawned duty assignments.
  - Added `docs/20250220_DUTY_SPAWNER_DESIGN.md` capturing the spawner pattern (schedule rule vs task instance) and daily cron behavior.

#### Miscellaneous UI improvements
- Improved duty completion flow with confirmatory modals and a congrats/feedback experience (see `DutyCompletionModal` and `CongratsModal`).
- Minor adjustments to Appointments and Operational Duties pages to harmonize with the new duty spawner and shift naming.

#### Version
- **package.json**: Bumped to **4.4.0**.
- **docs/VERSION.md**: Marked **4.4.0** as Current Version.

---

## [4.3.0] - 2025-02-21

### Page layout, styling consistency, Dashboard table/card view, Inventory filters & pagination

#### Page layout and full-width content
- **Main content area**: Removed `max-w-7xl` / `max-w-6xl` from all MainLayout pages so content fills the available width on wider screens (matching `/inventory-transactions`). Applied to Admin, Appointments, Patients, Records, MedicalVisit, then to all other app pages.
- **Consistent padding**: Every MainLayout page now uses the same main content wrapper: `p-4 sm:p-6 pb-20 md:pb-8` (and `space-y-6` where used). Pages updated: Dashboard, Incidents, OperationalDuties, AssignmentHistory, AuditTrail, PatientDetails, Profile, StockTransfers, InventoryTransactions, TransactionHistory, Admin, DrugAlcoholTesting, EquipmentTracking, Inventory, PurchaseOrders, Suppliers, TestResultForm, TestScheduling, TestingReports, SuperAdmin. Removed redundant `<main>` wrappers where present (AuditTrail, PatientDetails, Profile).

#### Background and tab styling
- **Main content background**: Applied `.bg-mineaid-light-gray` to the main content wrapper on all app pages (same as Profile) for consistent background across the system.
- **Tab list consistency**: All tabbed interfaces now use Records-style styling: wrapper `tabs-list-custom` (white background, border, padding), `TabsList` with `bg-transparent h-auto p-1 gap-1 lg:gap-2`, and `tab-trigger-custom` on triggers (navy active state from `index.css`). Applied to: SuperAdmin, TestingReports, TestScheduling, TestResultForm, DrugAlcoholTesting, StockTransfers, AssignmentHistory, Admin (main tabs and Notifications/Config sub-tabs), AuthPage, Landing; MedicalVisit and Records already matched.

#### SuperAdmin page
- **Layout**: Removed gradient outer wrapper; single content div with `space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray` so SuperAdmin matches other pages (background, padding, tab list styling). Loading state uses same background and `border-mineaid-navy` spinner.

#### Dashboard – Assignments and Appointments
- **Table/card view**: Today's Assignments and Today's Appointments sections each have a view toggle (LayoutGrid = cards, List = table). **List (table) view is the default** for both.
- **Assignments**: Table columns – Duty, Priority, Shift, Assigned To, Status. Card view shows same assignment rows (all items; "View All" link when more than 3).
- **Appointments**: Table columns – Time, Patient/Employee, Type, Status. Card view uses existing `AppointmentCard` components.

#### Inventory page
- **All Locations filter fix**: Selecting "All Locations" previously showed no items because the server always resolved a single location (session or primary) when no `locationId` was sent. Client now sends `allLocations=true` when "All Locations" is selected; server skips location resolution when `allLocations=true`, so inventory from all locations is returned.
- **Pagination**: Inventory table paginated at 20 items per page. Shows "Showing X–Y of Z", "Page N of M", and Previous/Next buttons. Page resets to 1 when category, status, location, low-stock filter, or search term changes.

#### Backend
- **server/modules/inventory/inventory.routes.ts**: GET `/api/inventory` accepts `allLocations=true`. When set, `resolvedLocationId` is left undefined (no session/primary fallback) so storage returns all tenant inventory across locations.

#### Version
- **package.json**: Bumped to **4.3.0**.

#### Files changed (this release)
- **Modified**: `client/src/pages/Admin.tsx`, `client/src/pages/Appointments.tsx`, `client/src/pages/Patients.tsx`, `client/src/pages/Records.tsx`, `client/src/pages/MedicalVisit.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Incidents.tsx`, `client/src/pages/OperationalDuties.tsx`, `client/src/pages/AssignmentHistory.tsx`, `client/src/pages/AuditTrail.tsx`, `client/src/pages/PatientDetails.tsx`, `client/src/pages/Profile.tsx`, `client/src/pages/StockTransfers.tsx`, `client/src/pages/InventoryTransactions.tsx`, `client/src/pages/TransactionHistory.tsx`, `client/src/pages/DrugAlcoholTesting.tsx`, `client/src/pages/EquipmentTracking.tsx`, `client/src/pages/Inventory.tsx`, `client/src/pages/PurchaseOrders.tsx`, `client/src/pages/Suppliers.tsx`, `client/src/pages/TestResultForm.tsx`, `client/src/pages/TestScheduling.tsx`, `client/src/pages/TestingReports.tsx`, `client/src/pages/SuperAdmin.tsx`, `client/src/pages/AuthPage.tsx`, `client/src/pages/Landing.tsx`, `server/modules/inventory/inventory.routes.ts`, `package.json`, `docs/CHANGELOG.md`, `docs/VERSION.md`.

---

## [4.2.0] - 2025-02-20

### Operational duties: full filters, overdue filter fix, responsive modals

#### Added
- **Operational Duties – full filter set**: Filters card on Operational Duties now matches Assignment History: **Date**, **Status**, **User**, **Location**, **Search**. All assignment fetches (by date, today, calendar range) support `status` and `userId` query params; search is applied client-side (duty title, category, assignee name).
- **Overdue filter**: Status filter "Overdue" now works on both **Operational Duties** and **Assignment History**. Backend treats "overdue" as pending assignments with `assignmentDate` before today (no stored `overdue` status). API returns display status `overdue` for those rows; UI shows orange Overdue badge and allows Complete/Cancel.
- **Responsive duty modals**: Create duty definition and Assign duty to post modals are responsive: `max-h-[90vh]`, scrollable form body, fixed footer (Cancel / Submit). Prevents modal from spanning viewport and hiding content.

#### Backend
- **server/storage.ts**: `getDutyAssignments`, `getDutyAssignmentsByDateRange`, `getTodayDutyAssignments` accept optional `status` and `userId`; when `status === 'overdue'` filter by pending + `assignmentDate < startOfToday`. `getDutyAssignmentHistory` same overdue logic. All list methods map response `status` to `overdue` when pending and past due. Added `lt` from drizzle-orm.
- **server/modules/duties/duty-assignments**: Controller and routes pass `status` and `userId` for list, listByDateRange, getToday; GET `/api/duty-assignments` and `/api/duty-assignments/today` accept `status` and `userId` query params.

#### Frontend
- **OperationalDuties.tsx**: State for `dateFilter`, `statusFilter`, `userFilter`, `searchFilter`; Filters card (Date, Status, User, Location dropdown, Search); all assignment queries use filters; client-side search; Overdue badge and (pending || overdue) for Complete/Cancel; Create duty and Assign duty modals use scrollable body + fixed footer.
- **Assignment History**: No code changes; overdue filter works via backend and existing status/display handling.

#### Fixed
- Overdue duty filter returning no results (status was never stored as `overdue`; now derived from pending + past due).

#### Version
- **package.json**: Bumped to **4.2.0**.

#### Files changed (this release)
- **Modified**: `server/storage.ts`, `server/modules/duties/duty-assignments/duty-assignments.controller.ts`, `server/modules/duties/duty-assignments/duty-assignments.routes.ts`, `client/src/pages/OperationalDuties.tsx`.
- **Unchanged**: `client/src/pages/AssignmentHistory.tsx` (overdue works via API).

---

## [4.1.0] - 2025-02-20

### Operational duties module restructure (breaking: DB migrations required)

This release restructures the operational duties feature to match the inventory-style model: a **master list** of duty definitions (location-agnostic) and **per-post** assignments/completions (location-scoped). Completion at one post does not affect another.

#### Conceptual model
- **operational_duties**: Master list of duty definitions (one row per duty type). Reusable across locations; seeded defaults for new tenants; tenants can add and edit.
- **operational_duty_assignments** / **operational_duty_completions**: Per post (location). Same duty can be assigned and completed at many locations; each post has its own assignment and completion state. History and analytics support filtering by location.

#### Schema & database
- **Table renames** (consistent `operational_` prefix):
  - `duty_assignments` → `operational_duty_assignments`
  - `duty_completions` → `operational_duty_completions`
- **operational_duties**: Removed redundant `duty_type` column. **Title** is the single duty identifier (no separate type dropdown).
- **Migrations**:
  - `migrations/20260220_rename_duty_tables_to_operational.sql` — renames existing tables (run on DBs that have the old names).
  - `migrations/20260220_remove_operational_duties_duty_type.sql` — drops `duty_type` from `operational_duties`.
  - `migrations/schema.sql` — updated for new installs (new table names, no `duty_type`).

#### Backend
- **shared/schema.ts**: Tables `operationalDutyAssignments`, `operationalDutyCompletions`; relations; insert schemas and types; `dutyType` removed from `operationalDuties`.
- **server/storage.ts**: All duty assignment/completion logic uses new table names; join result keys (`row.operational_duty_assignments`). **Default duty catalog**: `DEFAULT_OPERATIONAL_DUTIES` (Equipment Check, Ambulance Inspection, Drug/Alcohol Test, Airport Stand-by, FAP/Clinic Review, FAP/Clinic Inspection, UG Refuge Chamber Inspection). **ensureDefaultOperationalDuties(tenantId)** runs when listing duties so new tenants (and tenants with no duties) get the catalog on first load. **getDutyAssignmentHistory** now returns `locationId` for each assignment.
- **server/modules/duties**: Routes and controllers unchanged in contract; storage layer is the only change. API paths remain `/api/operational-duties` and `/api/duty-assignments`.

#### Frontend
- **Operational duties page** (`client/src/pages/OperationalDuties.tsx`):
  - **Duty definitions (master list)**: Table view by default (Duty name, Category, Priority, Frequency, Duration, Scheduled time, Description, Actions). Edit and Delete per row.
  - **Create duty definition**: Single “Duty name” field (no type dropdown); Category, Frequency, Priority, Duration, Description. Success/error toasts.
  - **Assign duty to a post**: Duty chosen from master list; **Post (location)** required; Assign To, Date, Shift, Notes. Success/error toasts. Defaults to active location when set.
  - **Today’s Assignments**: Table view by default (Duty, Category, Post, Assigned to, Shift, Status, Actions); optional card view toggle.
- **Assignment History** (`client/src/pages/AssignmentHistory.tsx`): **Post (location)** column and location in card view; filters and analytics already support location.
- **Dashboard** (`client/src/pages/Dashboard.tsx`), **Records** (`client/src/pages/Records.tsx`): Duty display uses **title** instead of removed `dutyType`.
- **Sidebar** (`client/src/config/sidebarConfig.tsx`): Operational Duties and Assignment History under Operations (no structural change).

#### Documentation
- **docs/CHANGELOG.md**: This entry (4.0.1).
- **docs/DEPLOYMENT_GUIDE.md**, **docs/MIGRATION_GUIDE.md**: Table list updated to `operational_duty_assignments`, `operational_duty_completions`.
- **docs/LOCAL_DEVELOPMENT_SETUP.md**: Table names updated.
- **docs/MULTI_LOCATION_FINAL_SUMMARY.md**: Reference to `operational_duty_assignments`.

#### Fixed
- **TypeScript**: Create-assignment payload ensures `locationId` is a string before calling the mutation. Duty definitions table uses `(Array.isArray(duties) ? duties : []).map` for correct typing.

#### Version
- **package.json**: Bumped to **4.1.0** (minor: breaking schema changes require migrations).

#### Files changed (reference)
- **Modified**: `shared/schema.ts`, `server/storage.ts`, `server/modules/duties/duties.routes.ts`, `server/modules/duties/duty-assignments/duty-assignments.controller.ts`, `server/modules/duties/duty-assignments/duty-assignments.routes.ts`, `server/routes/index.ts`, `client/src/pages/OperationalDuties.tsx`, `client/src/pages/AssignmentHistory.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Records.tsx`, `client/src/config/sidebarConfig.tsx`, `client/src/components/ui/select.tsx`, `migrations/schema.sql`, `docs/CHANGELOG.md`, `docs/VERSION.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/LOCAL_DEVELOPMENT_SETUP.md`, `docs/MIGRATION_GUIDE.md`, `docs/MULTI_LOCATION_FINAL_SUMMARY.md`, `docs/SIDEBAR_CATEGORIZATION.md`, `package.json`.
- **Added**: `migrations/20260220_rename_duty_tables_to_operational.sql`, `migrations/20260220_remove_operational_duties_duty_type.sql`.

---

## [4.0.0] - 2025-02-20

### Improvement review and implementation (Phases 0–5)

This release implements the recommendations from the professional assessment (see `docs/IMPROVEMENTS_OPINIONS_2025-02-20.md` and `docs/IMPROVEMENTS_IMPLEMENTATION_PLAN.md`).

#### Backend architecture
- **Route splitting by domain**: All API routes moved from a single file into per-domain modules under `server/modules/` (e.g. `auth`, `patients`, `incidents`, `inventory`, `testing`). Routes registered via `server/routes/index.ts`.
- **Thin controller layer**: Each domain has a controller (and optional service) that handles business flow; routes only handle HTTP (auth, validation, call controller, map result to response). Pattern documented in `docs/BACKEND_ARCHITECTURE.md`.
- **Validation and errors**: Central `validateBody(schema)` middleware and `sendError(res, status, message)`; all mutation routes use Zod validation and consistent error shapes. `.env.example` added; trigger-based notifications documented in `.cursorrules` and `docs/SYSTEM_ASSESSMENT_2025-02-20.md`.

#### Testing
- **Vitest**: Test runner added (`npm run test`, `npm run test:run`); config in `vitest.config.ts`; path alias `@shared/*` for tests. See `docs/TESTING.md`.
- **Unit tests**: Smoke test; notification preference resolution tests for `getRecipientsForAlert()` with mocked storage.
- **API integration tests**: `server/__tests__/api.integration.test.ts` and `server/test-app.ts`; run when `DATABASE_URL` is set; cover 401/400/404 for auth and protected routes.
- **CI**: GitHub Action `.github/workflows/test.yml` runs on push/PR to `main` and `development` (checkout, Node 20, `npm ci`, `npm run check`, `npm run test:run`).

#### Frontend
- **Route metadata**: `client/src/routes.ts` as single source of truth for protected paths, public paths, and role requirements; `ProtectedRouteGuard` uses `getProtectedPaths()` and `getPublicPaths()`.
- **Role-based guard**: `RequireRole` component and `useRequireRole` hook; `/admin` and `/super-admin` wrapped with role checks; redirect to `/access-denied` when role is insufficient.

#### Documentation
- **New/updated docs**: `docs/BACKEND_ARCHITECTURE.md`, `docs/TESTING.md`, `docs/IMPROVEMENTS_IMPLEMENTATION_PLAN.md`, `docs/IMPROVEMENTS_OPINIONS_2025-02-20.md`, `docs/SYSTEM_ASSESSMENT_2025-02-20.md`, `docs/DOMAIN_FEATURE_CONSOLIDATION.md` (if present).

#### Technical
- **New files**: `server/validation.ts`, `server/errors.ts`, `server/test-app.ts`, `server/__tests__/` (smoke, notification-preferences, api.integration), `client/src/routes.ts`, `client/src/components/RequireRole.tsx`, `client/src/hooks/useRequireRole.ts`, `.github/workflows/test.yml`, `.env.example`, `vitest.config.ts`.
- **validateBody** applied to all remaining mutation routes: purchase orders, stock requisitions, stock transfers, inventory transactions, drug/alcohol/hydration/instant tests, random testing pools and generate-selections.

---

## [3.6.0] - 2026-02-14

### Triage & Vitals History – Patient Details & Records

#### Added
- **Patient details page**
  - **Triage history**: New section with tabular view (Date/Time, Acuity, TEWS score, Presenting complaint, Notes); data from `GET /api/triage?patientId=...`; loading and empty states.
  - **Vitals history**: New section with tabular view (Recorded at, HR, Temp, RR, BP, SpO2, Glucose, Pain, Weight, Height); data from `GET /api/vital-signs?patientId=...`; loading and empty states.
  - Both sections appear in a two-column layout below the patient info and medical visits grid.
- **Records page**
  - **Triage & Vitals tab**: New dedicated tab (with Medical Visits, Patients, Appointments, Assignment History); tab list expanded to 5 columns on large screens.
  - **Triage table**: Tenant-wide triage list (Date/Time, Patient link, Acuity, TEWS, Presenting complaint); data from `GET /api/triage`.
  - **Vitals table**: Tenant-wide vitals list (Recorded, Patient link, HR, BP, Temp, SpO2, Glucose); data from `GET /api/vital-signs`.
  - URL hash support: `/records#triage-vitals` opens the Triage & Vitals tab.
- **Sidebar**
  - Records sub-navigation now includes **Triage & Vitals** with hash `#triage-vitals` for direct access from the sidebar.

#### Technical Details
- **Key files**: `client/src/pages/PatientDetails.tsx` (triage/vitals queries and table cards), `client/src/pages/Records.tsx` (triage-vitals tab, queries, patient name lookup, tables), `client/src/config/sidebarConfig.tsx` (recordsTabs entry for triage-vitals).

---

## [3.5.0] - 2026-02-14

### Medical Visits & Incidents – Items Used / Dispensed

#### Added
- **Medical visits**
  - **Items used / dispensed** on the visit form (new/edit) with search-as-you-type item picker; inventory is limited to the user’s store (session active location).
  - **Records**: 3-dots menu per visit includes “Items used / dispensed”; opens modal to view/edit quantities; “Add more” for existing lines; no duplicate lines per item.
- **Incidents**
  - **Items used / dispensed** on new and edit incident forms with the same search-as-you-type picker.
  - **Incidents list**: 3-dots menu per incident includes “Items used / dispensed” opening a dedicated modal.
- **Backend**
  - **POST `/api/inventory-transactions`** (issue_to_client): Visit-scoped (medicalVisitId) or incident-scoped (documentType/documentId); validates visit/incident and patient; for incidents, forces `medical_visit_id = null`.
  - **GET `/api/inventory-transactions`**: Strict filters by visit (medicalVisitId + document_type) and by incident (documentType/documentId + medical_visit_id IS NULL) so visit and incident items never mix.
  - **GET `/api/inventory`**: When `locationId` is omitted, uses session active location (or tenant primary) so the list reflects the user’s store only.

#### Documentation
- **INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md**: Added §9 Backend Enforcement & Scoping (visit/incident validation, GET filters, location default).
- **IMPLEMENTATION_STATUS.md**: Medical Visit and Incident Reporting bullets for items used/dispensed; new “Inventory & Dispensing Integration” subsection; date updated.

---

## [3.4.7] - 2026-02-12

### Multi-Location & Tenant Defaults

#### Added
- **Default care location on tenant creation**: Every new tenant now automatically gets a primary/default care location (`MAIN - Default Location`) created immediately after the tenant record, ensuring there is always at least one location available for tagging records.
- **Safety net when enabling multi-location**: When a tenant toggles `hasMultipleLocations` to `true` and has no care locations, the system automatically creates the default location so users are never stuck on the location selection flow with zero options.

#### Changed
- **Admin Care Locations tab**:
  - **Single-location tenants** now hide the **New Location** button; only the default location is managed.
  - **Multi-location tenants** see the **New Location** button and can create additional care sites only after multi-location is enabled.

### Admin Panel – Bulk User Invitations

#### Added
- **Multi-select invite in User Management**:
  - Invite modal now supports selecting **multiple employees** at once instead of a single employee radio-style selection.
  - Selected employees are summarized in the UI (count, names, and emails) before sending invitations.
- **Bulk invite endpoint**:
  - New `POST /api/admin/invite-users-bulk` endpoint accepts an `invitations` array with `{ email, role, employeeId? }` entries.
  - Validates each invitation (email format, uniqueness, employee/tenant match, no existing user) and sends individual activation emails, returning a structured per-email result.

### Inventory – Locations, Categories & Manufacturer

#### Added
- **Dynamic care location on inventory modal**:
  - **Item Code + Care Location** now appear together at the top of the create/edit modal.
  - **Multi-location + edit**: users can change location via a dropdown populated from `/api/care-locations`.
  - **Multi-location + create**: shows the current working location (from the session) as read-only; items are tagged to that location automatically.
  - **Single-location (add & edit)**: shows the tenant’s primary/default location as read-only; items are always tagged to this default.
- **Location persistence and logging**:
  - On create/update, `location_id` is always attached (from active session or primary location), and the legacy `location` text column is kept in sync using `"CODE - Name"` format.
  - Added detailed logs in `createMedicalInventory` and `updateMedicalInventory` to surface `locationId` and `location` used in each operation.

#### Changed
- **Category mapping to DB enums**:
  - UI categories (`pharmaceuticals`, `medical-supplies`, `ppe`, `emergency-supplies`, `equipment`, `consumables`) are now mapped to the `inventory_category` enum values (`medication`, `supplies`, `equipment`, `consumables`) on submit and filter, eliminating `22P02` enum errors.
  - Responses from `/api/inventory` map DB enum values back to UI categories so existing frontend logic and labels remain unchanged.
- **Equipment manufacturer vs brand**:
  - Equipment “Manufacturer” field (labeled in the form, stored in `supplier`) now populates the `brand` column for `medical_inventory` items.
  - On both create and update, if `category === 'equipment'` and `brand` is empty but `supplier` is set, `brand` is automatically set from `supplier` for consistent reporting.

#### Added
- **Bulk CSV import/export for inventory**:
  - `GET /api/inventory/export?category=...` returns a CSV snapshot of all inventory or a single mapped category, including location and equipment metadata.
  - `POST /api/inventory/import` accepts a JSON array of parsed CSV rows (`items`), validates core fields (`itemName`, `category`), and creates items in bulk with a summary (`created`, `total`, `errors`).
  - Inventory page now includes **Export** (all or per category) and **Import CSV** actions in the header; import results are displayed in a dialog with row-level error info.

#### Technical Details
- **Key files**:
  - `server/storage.ts` – Default care location helper, inventory location + brand mapping, logging.
  - `server/routes.ts` – Bulk invite endpoint, inventory import/export routes, multi-location safety on tenant update, default location creation wiring.
  - `client/src/pages/Admin.tsx` – User invite multi-select UI and bulk invite mutation, Care Locations tab “New Location” button visibility based on `hasMultipleLocations`.
  - `client/src/pages/Inventory.tsx` – Dynamic care location field, category enum mapping, bulk import/export UI and CSV parsing.
  - `docs/MULTI_LOCATION_SYSTEM_DOCUMENTATION.md`, `docs/INVENTORY_LOCATION_INTEGRATION_COMPLETE.md`, `docs/ADMIN_PANEL_TABLE_VIEW_ENHANCEMENTS.md`, `docs/LOCATION_FIELD_EDITABLE.md` – Updated to describe the new default location behavior, multi-location gating, inventory location tagging, and bulk user invitation capabilities.

---

## [3.4.6] - 2026-02-11

### Registration, Tenant Activation & Employee Number

#### Added
- **Employee number from form**: Registration form now has an "Employee number" field. When creating a new organization and registering the first user, the value entered is used as the employee record's `employee_number` instead of an auto-generated `EMP0001`-style value. Optional; server falls back to generated number if blank.
- **Tenant activation gates**: Users cannot activate their account or log in until their organization (tenant) is active. Super admins must activate the tenant first; then users can complete activation and log in.
- **Session invalidation for inactive tenants**: `validateSessionForRequest` in auth middleware checks tenant status on every request; if the tenant is not active, the session is deleted and the user receives 401 (logged out).

#### Changed
- **First user default role**: When registering as the first user for a tenant (e.g. after creating a new organization), the default role is now **tenant admin** (`admin`) instead of `medical_staff`.
- **Registration flow (employee before user)**: For tenant-bound users, the system now creates an **employee** record first (using `getOrCreateDefaultCompany` and `createEmployee`), then creates the **user** with `employee_id` set to that employee's id, satisfying the `users.employee_id` FK to `employees.id`. This fixes the previous 400 `fk_users_employee_id` error.
- **Super-admin create tenant**: After creating a tenant, the system ensures a default company exists (`getOrCreateDefaultCompany`) before creating the admin user. Super-admin cannot set a user to **active** via PATCH if that user's tenant is not active. API returns the actual error message on failure instead of a generic "Failed to create tenant."
- **Activation**: `POST /api/auth/complete-activation` returns 403 if the user's tenant is not active. `GET /api/auth/activation-details` includes `tenantActive`. ActivateAccount page shows a warning and disables the form when the organization is not activated.
- **Login**: Login is blocked with a clear message when the user's tenant is not active.
- **Tenant admin approve-user**: Tenant admins cannot approve a user (set to active) if the organization is not active (403).

#### Technical Details
- **Key files**: `server/customAuth.ts` (registerSchema + employeeNumber, default role admin, validateSessionForRequest, login tenant check), `server/storage.ts` (createCustomUser uses form employeeNumber, getOrCreateDefaultCompany), `server/routes.ts` (super-admin create-tenant default company, PATCH/approve tenant check, complete-activation tenant check, activation-details tenantActive), `client/src/pages/AuthPage.tsx` (employeeNumber field), `client/src/pages/ActivateAccount.tsx` (tenantActive UI).

---

## [3.4.4] - 2026-01-20

### ✨ Enhanced Sidebar Navigation with Dropdown Groups & Animations

#### Added
- **Sidebar Dropdown Groups**: Reorganized sidebar into collapsible dropdown groups
  - Healthcare Management (Dashboard, Patients, Medical Visits, Records, Incidents)
  - Operations (Appointments, Duty Assignments, Duty Roster)
  - Testing (Drug/Alcohol Testing, Testing Reports)
  - Inventory Management (existing functionality preserved)
  - Administration (User Management, Settings)
  - Resources (various resource pages)
- **Staggered Animations**: Smooth fade-in/out animations for dropdown menu items
  - Items fade in sequentially on expand (top to bottom)
  - Items fade out sequentially on collapse (bottom to top)
  - 500ms duration with 50ms stagger delay per item
- **RBAC Sidebar Filtering**: Type-safe role-based access control for sidebar items
  - Centralized sidebar configuration in `client/src/config/sidebarConfig.tsx`
  - Type definitions in `client/src/types/sidebar.ts`
  - Automatic filtering based on user role and tenant association
- **Error Handling**: Comprehensive error handling to prevent blank pages
  - Added error handling to Records page (patients, medical visits, appointments, assignments)
  - Added error handling to AssignmentHistory page (assignments, users, analytics)
  - Toast notifications for API errors
  - Error cards displayed on pages showing failed data loads
  - Graceful fallbacks to empty arrays instead of crashes

#### Changed
- **Sidebar Styling Improvements**:
  - Removed left border on dropdown sub-menus
  - Subtle active state backgrounds (rgba(20, 47, 92, 0.15) instead of solid navy)
  - Increased spacing between links (gap-1 instead of gap-0.5)
  - Added horizontal padding to sidebar content container
  - Improved letter spacing and font family for better readability
  - Font weight 700 for active links and their parent dropdown buttons
- **Collapse/Expand Behavior**: 
  - Active groups can now be collapsed/expanded (previously locked open)
  - Auto-open only happens on first activation
  - Smooth 500ms transitions for both expand and collapse
- **Dropdown Button Styling**: Matching subtle background for dropdown buttons and their child links

#### Fixed
- **React Query Error Handling**: Removed deprecated `onError` callbacks (React Query v5 doesn't support them)
  - Replaced with `useEffect` hooks and `error` properties from query results
  - Added proper error object destructuring for all queries
- **Blank Pages**: Fixed blank pages caused by API errors (400 Bad Request for super admins without tenants)
  - All queries now return empty arrays on error
  - Array.isArray() checks before mapping
  - User-friendly error messages displayed via toast and error cards

#### Technical Details
- **Key Files Modified**:
  - `client/src/components/MainLayout.tsx` - Complete sidebar refactor with dropdown groups
  - `client/src/index.css` - Sidebar animation styles and transitions
  - `client/src/pages/Records.tsx` - Error handling improvements
  - `client/src/pages/AssignmentHistory.tsx` - Error handling improvements
  - `client/src/pages/DrugAlcoholTesting.tsx` - Fixed activeTestType typo
  - `client/src/pages/Admin.tsx` - Updated for new sidebar structure
  - `client/src/pages/SuperAdmin.tsx` - Updated for new sidebar structure
  - `client/src/pages/TestingReports.tsx` - Updated for new sidebar structure
- **New Files**:
  - `client/src/config/sidebarConfig.tsx` - Centralized sidebar configuration
  - `client/src/types/sidebar.ts` - Type definitions for sidebar components
  - `docs/SIDEBAR_CATEGORIZATION.md` - Documentation for sidebar structure

---

## [3.4.5] - 2026-01-21

### ✨ System-wide Feedback Collection & Super Admin Management

#### Added
- **Global Feedback Widget**:
  - Floating feedback button visible across all pages (public + authenticated)
  - Responsive dialog with scrollable UX/UI questionnaire:
    - Ratings for UX, UI, navigation, speed, stability
    - NPS-style recommendation score
    - Checkboxes for areas used (Dashboard, Patients, Testing, etc.)
    - Open-ended comments and optional contact email
  - Submits feedback to a new `/api/feedback` endpoint (no auth required, optional user/tenant context)
- **Feedback Persistence**:
  - New `feedback` table in the shared schema and database:
    - Links (optionally) to `users` and `tenants`
    - Stores path/context, ratings, areas used, free-text comment, contact email
    - Includes `status` (`new`, `in_review`, `resolved`, `dismissed`) and `adminNote` for follow-up
  - Drizzle migration `20260121_add_feedback_table.sql` to create `feedback` and `feedback_status` enum
- **Super Admin Feedback Management UI**:
  - New **Feedback** tab in the Super Admin panel
  - Tab shows:
    - Aggregate counts by status
    - Filterable table of feedback (path/context, scores, user/tenant, contact email, status)
    - Detail pane to read full comments and update status/admin notes
  - Backed by `/api/super-admin/feedback` (list) and `/api/super-admin/feedback/:id` (PATCH) endpoints

#### Changed
- **App Shell**:
  - Mounted `FeedbackWidget` at the root `App` level so it is available from registration through logout.

#### Technical Details
- **Key Files Modified**:
  - `shared/schema.ts` – Added `feedback_status` enum, `feedback` table, insert schemas and types
  - `migrations/20260121_add_feedback_table.sql` – New migration for feedback schema
  - `server/storage.ts` – Added feedback CRUD methods for system-wide feedback
  - `server/routes.ts` – New public `/api/feedback` and super admin feedback routes
  - `client/src/components/FeedbackWidget.tsx` – Full feedback UI and API wiring
  - `client/src/pages/SuperAdmin.tsx` – Feedback management tab and UI


---

## [3.4.3] - 2026-01-17

### 🐛 Fixed Email Logo Display & Code Cleanup

#### Fixed
- **Email Logo Display**: Fixed logo not displaying in Gmail and other email clients
  - Switched from base64 data URI (blocked by Gmail) to CID (Content-ID) inline attachments
  - Logo now displays correctly in all email clients including Gmail
  - Logo is embedded as inline attachment with `cid:logo@mineaid` reference
  - Simplified logo loading to use buffer only (removed base64 encoding)

#### Removed
- **Failed Workarounds**: Removed all base64 data URI code that didn't work
  - Removed `cachedLogoDataUri` and `getLogoDataUri()` function
  - Removed base64 encoding logic and SVG fallback data URIs
  - Removed all data URI generation code
  - Kept only buffer-based CID attachment approach

#### Cleaned Up
- **Excessive Logging**: Removed verbose debug logs throughout notification system
  - Removed detailed recipient resolution logging
  - Removed per-user preference logging
  - Removed verbose email sending logs
  - Removed template generation debug logs
  - Kept only essential error logging and development-only success logs
  - Cleaner console output for production environments

#### Technical Details
- **Key Files Modified**:
  - `server/emailTemplates.ts` - Simplified to buffer-only, removed base64/data URI code
  - `server/notificationService.ts` - Added CID attachment support, cleaned up logging
  - Removed ~200 lines of unnecessary code and logging

---

## [3.4.2] - 2026-01-17

### 🔧 Simplified Maintenance Reminder System

#### Changed
- **Simplified Maintenance Reminder Logic**: Removed 30-day reminder checks and notifications
  - Changed from dual 30-day/7-day reminders to single 7-day check only
  - Single function `checkAndSendMaintenanceReminders()` now checks for equipment due within 7 days (including overdue)
  - Removed `equipment30Days` array and all 30-day related logic
  - Uses only `maintenance_reminder_7days` notification type
  - Simplified email template: `getBulkMaintenanceReminderEmail()` replaces `getBulkUpcomingMaintenanceReminderEmail()`
  - Email template now shows actual days until (can be negative for overdue) in Status column

#### Optimized
- **Performance Improvements**: Replaced O(n) array.find() with O(1) Map lookups
  - Created `equipmentMap` for fast equipment lookups in both reminder functions
  - Reduces time complexity from O(n*m) to O(n+m) for large datasets
  - Applied optimization to both `checkAndSendMaintenanceReminders()` and `checkAndSendOverdueMaintenanceReminders()`

#### Removed
- **30-Day Reminder Logic**: All 30-day maintenance reminder checks and notifications removed
  - `maintenance_reminder_30days` removed from `systemLevelTypes` arrays
  - 30-day equipment collection and email sending logic removed
  - Simplified function documentation and comments

#### Technical Details
- **Key Files Modified**:
  - `server/equipmentHealthService.ts` - Simplified to 7-day only, added Map optimization
  - `server/emailTemplates.ts` - Replaced bulk template with simplified version
  - `server/notificationService.ts` - Removed 30-day from system types
  - `server/storage.ts` - Removed 30-day from system types

---

## [3.4.1] - 2026-01-16

### 🔧 Enhanced Maintenance Reminder System

#### Added
- **Bulk Email Templates**: Maintenance reminder emails now sent as single bulk emails with table formatting
  - `getBulkUpcomingMaintenanceReminderEmail()`: Sends one email with all equipment requiring maintenance (30-day or 7-day reminders)
  - `getBulkOverdueMaintenanceReminderEmail()`: Sends one email with all overdue equipment
  - Table view with numbered rows, horizontal scroll, and organized columns
  - Prevents email spam by consolidating multiple equipment into single notifications
- **Separate Overdue Reminder Endpoint**: New endpoint for testing/triggering overdue maintenance reminders
  - `GET/POST /api/admin/equipment/trigger-overdue-maintenance-reminders`
  - Separate UI button in Super Admin panel for overdue reminders
  - `checkAndSendOverdueMaintenanceReminders()` function for overdue-only processing

#### Changed
- **Range-Based Maintenance Reminder Checks**: Changed from exact day matching to range-based checks
  - 30-day reminders: Equipment due within 30 days but more than 7 days away (range: 8-30 days)
  - 7-day reminders: Equipment due within 7 days (range: 1-7 days)
  - Allows manual triggers and cron jobs to find equipment at any time within the ranges
  - Matches the health check report logic for consistency
- **Maintenance Reminder Email Format**: Upgraded to professional table view
  - Numbered rows for easy reference
  - Horizontal scroll container for long lists
  - Columns: #, Equipment Name, Equipment Code, Maintenance Type, Scheduled Date, Days Until/Overdue, Action link
  - Striped rows for better readability
  - Color-coded urgency (red for overdue, orange for 7-day, yellow for 30-day)

#### Fixed
- **Upcoming Reminder Trigger**: Fixed issue where upcoming maintenance reminders only checked but didn't send emails
  - Changed from exact equality check (`daysUntil === 30`) to range check (`daysUntil <= 30 && daysUntil > 7`)
  - Manual triggers now successfully find and send emails for equipment in range
  - Added debug logging to show counts of equipment found

#### Technical Details
- **Key Files Modified**:
  - `server/emailTemplates.ts` - Added bulk email template functions with table formatting
  - `server/equipmentHealthService.ts` - Refactored to use range-based checks and bulk email sending
  - `server/cronJobs.ts` - Added separate function for overdue reminder triggers
  - `server/routes.ts` - Added overdue reminder endpoint
  - `client/src/pages/SuperAdmin.tsx` - Added separate UI button for overdue reminders

---

## [3.4.0] - 2026-01-16

### ⚠️ BREAKING CHANGE: Notification System Schema Migration

**IMPORTANT**: This version includes a database schema change that will **delete all existing notification data**. The `notifications` table is dropped and recreated with a new schema. If you have existing notification data, back it up before running the migration.

**Migration Impact**:
- `DROP TABLE IF EXISTS notifications CASCADE;` - All existing notifications will be deleted
- Schema changes: `type` enum → `notification_type_id` foreign key, added `channel` column
- New tables: `notification_types`, `user_notification_preferences`, `notification_delivery_logs`
- **API Compatibility**: The `/api/notifications` endpoint remains compatible, but existing notification records will be lost

**Migration Steps**:
1. Backup existing notification data if needed: `pg_dump -t notifications $DATABASE_URL > notifications_backup.sql`
2. Run migration: `psql $DATABASE_URL < migrations/add_notification_system.sql`
3. Run alert tracking migration: `psql $DATABASE_URL < migrations/add_notification_sent_at_to_alerts.sql`

### 🚀 Comprehensive Notification System Implementation

#### Added
- **Data-Driven Notification System**: Complete production-ready notification infrastructure
  - `notification_types` table: Defines all notification types (incident, inventory, equipment, system)
  - `user_notification_preferences` table: Row-based preferences (one row per tenant/user/type/channel)
  - `notifications` table: Delivery/audit records for all notifications
  - `notification_delivery_logs` table: Low-level delivery tracking for email/SMS/WhatsApp
- **Multi-Channel Support**: Email, in-app, SMS, WhatsApp (extensible without schema changes)
- **Admin Notification Configuration UI**: Full admin interface for managing notification preferences
  - Role-based default preferences configuration
  - Individual user preference management
  - Bulk preference updates
  - Channel enable/disable per notification type
- **Automated Incident Notifications**: 
  - Incident created notifications with full details
  - Incident updated notifications
  - Severity-based filtering (removed per user request)
  - Professional HTML email templates
- **Automated Inventory Alerts**:
  - Low stock alerts
  - Expiry alerts
  - Equipment maintenance alerts
  - Equipment failure alerts (status change to faulty/maintenance)
  - Warranty expiry alerts
- **Notification Triggers**: Event-driven notification system
  - Integrated into incident creation/updates
  - Integrated into inventory operations (stock updates, equipment status changes)
  - Non-blocking async notification sending
- **Email Templates**: Professional, on-brand HTML email templates
  - Incident alert emails with full details
  - Inventory alert emails with item information
  - Responsive design for all email clients
  - Base64 embedded logo (for email client compatibility)
- **API Endpoints**: Complete REST API for notification management
  - `GET /api/notifications` - Get user notifications (with filtering)
  - `PUT /api/notifications/:id/read` - Mark notification as read
  - `GET /api/notifications/unread-count` - Get unread count
  - `GET /api/notification-types` - Get all notification types
  - `GET /api/notification-preferences` - Get user preferences
  - `PUT /api/notification-preferences` - Update user preferences
  - `GET /api/admin/notification-preferences/:userId` - Admin view user preferences
  - `PUT /api/admin/notification-preferences/:userId` - Admin update user preferences
  - `POST /api/admin/notification-preferences/bulk` - Bulk update preferences
  - `GET /api/admin/notification-preferences/role-defaults/:role` - Get role defaults
  - `POST /api/admin/notification-preferences/apply-role-defaults` - Apply role defaults
  - `POST /api/inventory-alerts/process-pending` - Process pending alerts

#### Changed
- **Notification Preferences Model**: Migrated from boolean flags to row-based model
  - No schema changes required for new alert types or channels
  - Data-driven notification types
  - Scalable architecture for future expansion
- **Email Service**: Enhanced with detailed logging and error handling
  - Console reporting on email sending status
  - Message ID tracking
  - Provider response logging
- **Inventory Alert System**: Enhanced with notification tracking
  - Added `notification_sent_at` column to `inventory_alerts` table
  - Prevents duplicate notifications for same alert
  - Automatic notification triggering on alert creation
  - Manual processing endpoint for pending alerts

#### Fixed
- **Equipment Status Detection**: Fixed equipment status change detection
  - Changed from `itemType` to `category` field check
  - Equipment maintenance and failure alerts now trigger correctly
- **Notification Creation**: Fixed notification records not being created
  - Enhanced logging throughout notification flow
  - Fixed recipient resolution logic
  - Fixed notification delivery tracking
- **Email Sending**: Fixed emails not being sent/received
  - Enhanced email service logging
  - Fixed notification result tracking
  - Added proper error handling

#### Technical Details
- **Key Files Created**:
  - `migrations/add_notification_system.sql` - Complete notification system schema
  - `migrations/add_notification_sent_at_to_alerts.sql` - Alert notification tracking
  - `server/notificationService.ts` - Core notification service
  - `server/notificationTriggers.ts` - Event-driven notification triggers
  - `client/src/components/admin/NotificationPreferencesManager.tsx` - Admin UI
- **Key Files Modified**:
  - `shared/schema.ts` - Added notification-related table definitions
  - `server/storage.ts` - Added notification methods and integrated triggers
  - `server/routes.ts` - Added notification API endpoints
  - `server/emailTemplates.ts` - Enhanced email templates with embedded logo
  - `client/src/pages/Admin.tsx` - Integrated notification preferences UI
- **Database Schema**:
  - All notification tables use VARCHAR for IDs (UUIDs as strings)
  - Proper foreign keys with CASCADE deletes
  - Comprehensive indexes for performance
  - Notification types seeded with 10 initial types

#### Production Readiness
- **Security**: All console logs that expose sensitive data (emails, user IDs, tenant IDs) are now conditional on `NODE_ENV === 'development'`
- **Logging**: Created `server/logger.ts` utility for production-safe logging
- **Error Handling**: Error logs sanitized in production to prevent information leakage
- **Debug Logs**: All debug/informational logs only appear in development mode

#### Migration Notes
- Run `migrations/add_notification_system.sql` to create notification tables
- Run `migrations/add_notification_sent_at_to_alerts.sql` to add notification tracking to alerts
- Notification preferences are created automatically for existing users based on role defaults
- Existing notifications table is dropped and recreated with new schema

---

## [3.3.1] - 2026-01-14

### 🐛 Bug Fixes & 🎨 Profile Page Redesign

#### Fixed
- **TypeScript Errors**: Fixed duplicate property names (`hasCompany`, `companyName`) in `/api/users/:id` endpoint logging that caused compilation errors
- **Profile Data Display**: Fixed department field to correctly fetch from employee record instead of non-existent user field

#### Added
- **Profile Page Redesign**: Complete professional redesign with responsive layout
  - Left sidebar with profile picture, name, role, status badge, and quick information card
  - Right content area with organized sections for personal, employee, and account information
  - Responsive grid layout (12-column system: 4 columns sidebar, 8 columns main content)
  - Mobile-first design with proper breakpoints for all screen sizes
- **Last Active Time/Date**: Added comprehensive last active tracking
  - Header shows "Last active X ago" with relative time
  - Quick info sidebar displays formatted date and time
  - Account information (admin view) shows full date/time with relative time
- **Enhanced Profile Edit Form**: All editable user fields now available
  - First Name, Last Name, Email, Phone Number, Bio
  - Proper form validation with error messages
  - Responsive form layout with improved button styling
- **Employee Information Card**: New section displaying employee details (if employee exists)
  - Employee Number, Position, Job Title, Hire Date
  - Emergency Contact Name and Phone
- **Account Information Card**: New admin-only section with comprehensive account details
  - Account Created date/time
  - Last Login with relative time
  - Approved By/At (if applicable)
  - Auth Provider
  - User ID and Employee ID (monospace, styled)

#### Changed
- **Profile Page Layout**: Reorganized into clear, professional sections
  - Profile picture moved to dedicated sidebar card
  - Personal information in main content area
  - Employee and account information in separate cards
  - Better visual hierarchy with improved spacing and typography
- **Visual Improvements**: Enhanced UI elements throughout profile page
  - Color-coded status badges (green for active, yellow for pending, red for blocked)
  - Verification badges for email/phone (green for verified, yellow for unverified)
  - Separators for visual grouping
  - Monospace styling for IDs with background
  - Responsive text sizes and improved card shadows

#### Technical Details
- **Key Files Modified**
  - `server/routes.ts` – Fixed duplicate properties in console.log statement
  - `client/src/pages/Profile.tsx` – Complete redesign with new layout, sections, and enhanced edit form
  - Added `date-fns` imports for date formatting (`format`, `formatDistanceToNow`)
  - Updated form schema to use `phoneNumber` instead of `phone` for consistency
  - Enhanced query invalidation to refresh both auth user and fetched user queries

---

## [3.3.0] - 2026-01-14

### 🚀 Schema, Backend & Frontend Alignment for Employees, Patients, Incidents & Medical Visits

#### Added
- **Gender Support for Employees & Patients**
  - Introduced `gender` enum (`male`, `female`, `other`) at the database level.
  - Added `gender` column to `employees` table and wired it through Drizzle schema.
  - Surfaced gender on the frontend: employee add/edit forms, patient list, patient details, and related UIs.
- **Patient ID Format & Function**
  - Implemented `generate_patient_id()` database function to create IDs like `ma0001-26` (MineAid prefix, 4‑digit sequence, 2‑digit year).
  - Updated `patients.id` default to use `generate_patient_id()` and reset sequence per year.
- **LMP (Last Menstrual Period) Support**
  - Added `last_menstrual_period` columns to `medical_visits` and `incident_reports` tables.
  - Extended `insertMedicalVisitSchema` and `insertIncidentReportSchema` to accept optional LMP.
  - Frontend forms now show an LMP date field (medical visit + incident forms) **only** when the selected patient’s gender is `female`.

#### Changed
- **Users ↔ Employees Relationship**
  - Added proper foreign key from `users.employeeId` to `employees.id` with `ON DELETE SET NULL`.
  - Implemented backend sync so updates to an employee’s core data (name, phone) propagate to the linked user record.
  - Kept user auth data in `users` while treating `employees` as the base entity.
- **Incidents Module**
  - Renamed `NewIncidentModal` to `IncidentModal` for clearer semantics (single source of truth for incident create/edit).
  - Refined incident edit/create forms to support LMP and cleaned up patient selection/job title auto‑population.
  - Hardened `/incidents` page against runtime errors (e.g., invalid dates, missing patient data) so it no longer goes blank.
- **Medical Visits**
  - Wired LMP through medical visit creation and update flows.
  - Normalized date handling between frontend forms, Zod schemas, and Drizzle inserts/updates to avoid “Expected string, received date” issues.
- **Backend Storage Layer**
  - Updated `createMedicalVisit` / `updateMedicalVisit` and `createIncidentReport` / `updateIncidentReport` to normalize `lastMenstrualPeriod` to database‑friendly values.
  - Ensured TypeScript types for insert/update payloads align with the underlying column definitions.

#### Fixed
- **TypeScript Type Errors**
  - Resolved new type errors introduced by LMP fields and gender support in `server/storage.ts` and `MedicalVisit.tsx`.
  - Fixed mismatches between Zod insert schemas and Drizzle column types for `lastMenstrualPeriod`.
- **/incidents Blank Page**
  - Fixed `selectedPatientData` reference bug in the incident modal that was causing React to throw and blank the page.
  - Added defensive date formatting for `incident.incidentDate` to prevent crashes when data is missing or malformed.

#### Technical Details
- **Key Files Modified**
  - `shared/schema.ts` – gender enum, employee gender column, patient ID default, LMP columns & insert schemas.
  - `migrations/schema.sql` / `migrations/add_schema_improvements.sql` – enum, columns, function, defaults.
  - `server/storage.ts` – user/employee sync helper, medical visit & incident report create/update LMP handling.
  - `client/src/pages/Admin.tsx` – employee gender field in add/edit forms.
  - `client/src/pages/Patients.tsx`, `client/src/pages/PatientDetails.tsx` – gender display in patient UIs.
  - `client/src/pages/MedicalVisit.tsx` – conditional LMP field for female patients, schema alignment, type fixes.
  - `client/src/components/modals/IncidentModal.tsx` – incident create/edit with conditional LMP and safe patient typing.
  - `client/src/pages/Incidents.tsx` – uses `IncidentModal`, improved error‑safe rendering and date formatting.

---

## [3.2.2] - 2025-01-13

### 🐛 Bug Fixes & UI Improvements

#### Fixed
- **Incident Edit Modal**: Resolved blank page issue when clicking "Edit" on incidents
  - Fixed Radix UI Select.Item error with empty string values by using sentinel value ("none")
  - Improved form reset logic with proper date parsing and optional chaining
  - Added conditional rendering to ensure modal only renders when editing incident is available
  - Removed all debug console.log statements and unnecessary workarounds
- **Responsive Layout**: Fixed horizontal scrolling and content hiding behind sidebar at 1080px breakpoint
  - Added `min-w-0` to MainLayout's SidebarInset and main content area to prevent overflow
  - Made all filter selects responsive with proper breakpoints (sm:w-[140px] md:w-[160px])
  - Enhanced cards view with proper width constraints and text truncation
  - Fixed table view to respect container width with overflow-x-auto
  - Added `overflow-x-hidden` to main container to prevent horizontal scrolling
- **Patient Information Auto-Population**: Enhanced medical visit and incident forms
  - Job title/position now automatically populates from employee data when patient is selected
  - Removed redundant manual job title input field from incident form (now hidden field)
  - Improved user experience by eliminating duplicate data entry

#### Changed
- **Incident Form**: Job title field is now auto-populated from selected patient's employee data
  - Field remains in schema but is hidden from UI
  - Automatically updates when patient selection changes
- **MainLayout**: Enhanced responsive behavior with `min-w-0` constraints
  - Prevents flex items from overflowing their containers
  - Ensures proper width calculations with sidebar open
- **Filter Layouts**: Improved responsive breakpoints for all filter selects
  - Better mobile experience with full-width selects
  - Optimized desktop layout with appropriate fixed widths

#### Removed
- All debug console.log statements from incident pages and modals
- Unnecessary workarounds and trial-and-error code from incident edit modal
- Redundant job title input field from incident form UI

## [3.2.1] - 2025-01-27

### 🐛 Bug Fixes - TypeScript Type Safety Improvements

#### Fixed
- **TypeScript Type Errors**: Resolved 107 type errors across the codebase
  - Fixed `TestResultForm.tsx`: Added missing schema fields (`witnessedBy`, `conclusion`, `specimenType`, etc.) and resolved Date/string type mismatches
  - Fixed `TestScheduling.tsx`: Added proper `AuthUser` type for user queries
  - Fixed `Records.tsx`: Typed all useQuery calls and fixed `groupedAssignments` type issues
  - Fixed `AssignmentHistory.tsx`: Resolved `groupedAssignments` type with proper type assertions
  - Fixed `AuditTrail.tsx`: Created extended `AuditLogWithUser` type and fixed all type issues
  - Fixed `Dashboard.tsx`: Typed `recentPatients` and `todayAppointments` useQuery calls
  - Fixed `Incidents.tsx`: Typed `incidents` useQuery call
  - Fixed `Inventory.tsx`: Fixed location type issues and property name mismatches
  - Fixed `Patients.tsx`: Typed `patients` useQuery call
  - Fixed `Profile.tsx`: Fixed user type casting and form control type issues
  - Fixed `customAuth.ts`: Fixed role and status type casting with proper union types
  - Fixed `storage.ts`: Fixed `whereCondition` undefined type issue with proper SQL type
- **Removed Redundant Code**: Deleted unused `redundant-dont use/NewTestingForm.tsx` directory

#### Changed
- All TypeScript compilation errors resolved (0 errors)
- Improved type safety across all form components and data queries
- Better type inference for React Hook Form controls

## [3.2.0] - 2025-01-27

### 🚀 MAJOR UPDATE - Admin Panel Table View Enhancements & UI Improvements

#### Added
- **Table View with Toggle**: All admin tabs now support both table and card views with toggle button
  - Users, Employees, Companies, Locations, Notifications, and Audit Trail tabs
  - Icon-based toggle (List/Grid) for instant switching between views
  - Default view set to table for better data density
  - Persistent view state per tab during session
- **Sequential ID Column**: ID column now displays sequential numbers (1, 2, 3...) instead of truncated UUIDs
  - Easier reference in conversations ("user #5")
  - Better sorting and filtering perception
  - Improved user experience for non-technical users
- **Alternating Row Backgrounds**: All table views feature alternating row backgrounds
  - Even rows: White background
  - Odd rows: Light gray background (`bg-gray-50/50`)
  - Improved readability and visual separation
- **Company Filter for Employees**: Added company filter dropdown to employee management
  - Syncs with parent admin component's company filter state
  - Filters employees by selected company or "All Companies"
  - Integrated alongside existing department and status filters
- **Employee-Based User Invitation**: Enhanced invite user modal to fetch employees from database
  - New `/api/employees/without-users` endpoint for employees not linked to users
  - Dropdown/list for selecting employee to invite
  - Auto-population of employee name and email from selection
  - Ensures users are employees first before system access
  - Creates proper employee-user relationship on user creation
- **Responsive Header Breakpoints**: Improved header responsiveness
  - Navigation links hidden below 1280px (xl breakpoint)
  - Location selector hidden below 768px (md breakpoint)
  - Full logo visible until 1280px, then switches to logo mark
  - User profile shows full details on xl screens, icon-only below 1280px

#### Changed
- **Statistics Cards Layout**: Updated responsive breakpoints for statistics cards
  - Large screens (≥1024px): 4-column grid (`lg:grid-cols-4`)
  - Default: 2-column grid for better balance
  - Small screens (≤480px): 1-column layout (`max-[480px]:grid-cols-1`)
  - Previous: Changed from 1-column at 768px to maintain 2-column until mobile
- **Admin Tabs Inner Headers**: Button groups now wrap below header text on smaller screens
  - Layout changed to `flex-col sm:flex-row` for proper stacking
  - Responsive text with `hidden sm:inline` for button labels
  - Better mobile experience with stacked buttons
- **Sidebar Version Display**: Version section hidden when sidebar is collapsed
  - Prevents overflow issues in collapsed state
  - Conditional rendering based on sidebar state
  - Cleaner collapsed sidebar UI

#### Enhanced
- **Table Column Structures**: Comprehensive table views for all admin tabs
  - **Users Table**: ID, Name, Email, Role, Status, Registered, Actions
  - **Employees Table**: ID, Employee #, Name, Email, Department, Position, Company, Status, Actions
  - **Companies Table**: ID, Company Name, Type, Contact Email, Contact Phone, License Number, Status, Created, Actions
  - **Locations Table**: ID, Location Name, Code, Address, Contact, Capacity, Status, Primary, Actions
  - **Notifications Table**: ID, Title, Message, Status, Created
  - **Audit Trail Table**: ID, Action, Resource Type, Resource ID, User ID, Details, Created
- **TypeScript Interfaces**: Enhanced interfaces with optional properties
  - Added `contactPhone` and `licenseNumber` to Company interface
  - Added `jobTitle`, `phoneNumber`, `dateOfBirth`, `hireDate`, `emergencyContactName`, `emergencyContactPhone`, `medicalClearance` to Employee interface

#### Fixed
- **Z-index Issues**: Fixed statistics cards overlapping main dashboard header on scroll
  - Changed cards from `z-10` to `z-0`
  - Added proper z-index management to header
- **Header Horizontal Overflow**: Fixed header overflow on medium-sized screens
  - Updated header layout to `flex flex-col sm:flex-row`
  - Added proper gap spacing and text truncation
  - Improved responsive breakpoints
- **Company Edit False-Positive Success**: Fixed success messages showing when no update occurred
  - Updated `updateCompany` to throw error if no rows affected
  - Frontend mutation now verifies returned company object has `id`
- **Employee Delete False-Positive Success**: Fixed success messages showing when employee not deleted
  - Updated `deleteEmployee` to throw error if no rows affected
  - Frontend mutation now verifies `success: true` in response
- **JSON Parsing Errors**: Fixed "doctype not valid json" errors for company edit and employee delete
  - All mutations now read response as text first, then parse JSON
  - Added try-catch blocks for graceful error handling
  - Backend endpoints ensure JSON responses with proper status codes

#### Technical Details
- **Files Modified**:
  - `client/src/pages/Admin.tsx` - Complete table view implementation for all tabs, toggle buttons, sequential IDs, alternating rows
  - `client/src/components/MainLayout.tsx` - Header responsiveness, breakpoint adjustments
  - `client/src/components/LocationBadge.tsx` - Location selector visibility controls
  - `server/routes.ts` - New `/api/employees/without-users` endpoint, updated invite endpoint
  - `server/storage.ts` - New `getEmployeesWithoutUsers` method, updated `createCustomUser`
- **Files Created**:
  - `docs/ADMIN_PANEL_TABLE_VIEW_ENHANCEMENTS.md` - Comprehensive documentation of all changes

#### Documentation
- Created comprehensive documentation for admin panel table view enhancements
- Documented all table column structures and formats
- Documented responsive design improvements and breakpoints
- Added technical implementation details and code examples
- Included migration notes (no database migration required)

#### Benefits
- ✅ **Faster Data Scanning**: Table view allows quick scanning of large datasets
- ✅ **Better Data Density**: More information visible at once
- ✅ **Easier Reference**: Sequential IDs make conversations easier
- ✅ **Improved Filtering**: Company filter for employees improves management
- ✅ **Proper User Creation**: Employee-based invitation ensures data integrity
- ✅ **Better Performance**: Table view renders faster than many cards
- ✅ **Responsive Design**: Works well on all screen sizes
- ✅ **Consistent Experience**: Same patterns across all admin tabs
- ✅ **Clear Visual Hierarchy**: Alternating rows improve readability

#### Migration Notes
- **No Database Migration Required**: All changes are UI/frontend enhancements
- **Backward Compatible**: Existing data structures remain unchanged
- **Sequential IDs**: Calculated on-the-fly (no data migration needed)

---

## [3.1.0] - 2025-11-23

### 🚀 MAJOR UPDATE - Authentication System Overhaul & UX Improvements

#### Added
- **Enhanced Error Pages**: Created dedicated error pages for better user experience
  - `401 Unauthorized` page with sign-in navigation
  - `403 Access Denied` page with role information and helpful links
  - Enhanced `404 Not Found` page with context-aware navigation
- **Error Page Routes**: Added `/unauthorized` and `/access-denied` routes in application router
- **User-Friendly Error Messages**: Error pages now display:
  - Clear explanations of what went wrong
  - User's current role and account information
  - Helpful navigation links (Dashboard, Login, Home)
  - Context-aware suggestions based on authentication status

#### Changed
- **Authentication Flow**: Replaced blind redirects with proper error page components
  - `Admin.tsx` now shows `Unauthorized` for unauthenticated users
  - `Admin.tsx` shows `AccessDenied` for non-admin users with role information
  - `SuperAdmin.tsx` now shows `Unauthorized` for unauthenticated users
  - `SuperAdmin.tsx` shows `AccessDenied` for non-super-admin users
- **Tenant Creation Workflow**: 
  - **BREAKING**: Tenant creation now precedes user creation
  - Users must explicitly select or create a tenant during registration
  - Removed automatic default tenant/company creation logic
- **Registration Validation**: 
  - `tenantId` is now required for tenant-bound users during registration
  - Clear error messages if `tenantId` is missing
  - Super admins can still register without `tenantId` (as intended)

#### Removed
- **Default Company Creation**: Removed automatic "Default Company" creation when creating tenants
  - `/api/tenants` endpoint no longer creates default company
  - `/api/super-admin/create-tenant` endpoint no longer creates default company
- **Default Tenant Creation**: Removed automatic default tenant creation logic from `customAuth.ts`
  - System no longer creates "Default Mining Site" tenant
  - System no longer uses first existing tenant if none provided
- **Blind Redirects**: Removed automatic redirects to dashboard/home
  - Replaced with informative error pages that explain the issue

#### Fixed
- **Version Numbers**: Updated all documentation to reflect version 3.0.0
- **Documentation Dates**: Updated to November 2025 (was incorrectly showing January 2025)
- **Super Admin Response**: Fixed missing `company` reference in super-admin tenant creation response

#### Documentation
- Updated `docs/AUTH_SYSTEM.md` to version 3.0.0 with November 2025 date
- Updated `docs/AUTH_COMPLETE_FLOWS.md` to version 3.0.0 with November 2025 date
- Updated `docs/VERSION.md` with 3.0.0 release information
- Updated `docs/README.md` to version 3.0.0
- Added notes about tenant creation workflow changes in authentication documentation

#### Migration Notes
- **For Existing Users**: No migration required - existing tenants and users remain unchanged
- **For New Registrations**: Users must now provide `tenantId` or create a tenant first
- **For Developers**: Update registration flows to ensure tenant selection/creation happens before user registration

#### Technical Details
- **Files Modified**:
  - `server/customAuth.ts` - Removed default tenant creation, added tenantId validation
  - `server/routes.ts` - Removed default company creation from tenant endpoints
  - `client/src/pages/Admin.tsx` - Replaced redirects with error page components
  - `client/src/pages/SuperAdmin.tsx` - Replaced redirects with error page components
  - `client/src/App.tsx` - Added error page routes
- **Files Created**:
  - `client/src/pages/access-denied.tsx` - 403 error page component
  - `client/src/pages/unauthorized.tsx` - 401 error page component
- **Files Updated**:
  - `client/src/pages/not-found.tsx` - Enhanced 404 error page

---

## [Future] - Pharmacy Module Planning (Ghana Edition)

### 💊 Comprehensive Pharmacy Module Plan Created - Ghana Context

#### Overview
- **PLANNING PHASE**: Complete architecture and implementation plan for tenant- and care location-isolated pharmacy module
- **REGULATORY CONTEXT**: Ghana (Pharmacy Council, FDA Ghana, NACOB, Data Protection Act)
- **TIMELINE**: 28 weeks (7 months) estimated implementation
- **SCOPE**: Full pharmaceutical management system for mining healthcare facilities in Ghana
- **STATUS**: Planning complete, awaiting regulatory review and approval

#### Key Features Planned (Ghana-Specific)
- **Electronic Prescribing (Ghana Format)**:
  - Digital prescription creation compliant with Pharmacy Council standards
  - Real-time drug interaction alerts (Ghana formulary)
  - Allergy verification
  - FDA Ghana registration validation
  - NHIS integration
  - Pharmacy Council license verification
  - Digital signatures (Ghana e-Signature Act compliant)

- **Medication Dispensing (Ghana)**:
  - Pharmacist verification (Pharmacy Council licensed)
  - Barcode scanning verification
  - Patient counseling documentation (multi-language: English, Twi, Ga, Ewe)
  - Refill management
  - Complete audit trail for regulators

- **Inventory Management (Ghana Context)**:
  - Multi-location stock tracking
  - Climate-appropriate storage alerts (tropical conditions)
  - FDA batch number tracking
  - Import permit management
  - Stock transfers between locations
  - Ghana EML availability monitoring

- **Controlled Medicines Tracking (NACOB)**:
  - NACOB-compliant controlled medicines register
  - Dual verification requirements
  - Monthly reconciliation workflows
  - Quarterly NACOB reporting
  - 24-hour loss/theft notification
  - Witnessed destruction per environmental protocols

- **Clinical Decision Support (Ghana Mining)**:
  - Drug-drug interaction checking (Ghana formulary)
  - Drug-allergy checking
  - Mining-specific safety assessments (Minerals Commission standards)
  - Fitness for duty evaluations
  - Heat stress medication considerations
  - Work restriction recommendations
  - Heavy machinery operation clearance

- **NHIS Integration**:
  - Patient eligibility verification
  - NHIS medicines list filtering
  - Automatic pricing per NHIS rates
  - Claims generation and submission
  - Prior authorization workflow
  - Co-payment calculation

- **Reporting & Analytics (Ghana Regulators)**:
  - Pharmacy Council compliance reports
  - FDA Ghana pharmacovigilance reporting
  - NACOB quarterly submissions
  - NHIS claims management
  - Mining safety compliance (Minerals Commission)
  - Ghana EML availability tracking
  - Cost analysis (Ghana Cedis)

#### Database Architecture (Ghana-Adapted)
- **10 Core Tables** with complete tenant and location isolation plus Ghana-specific fields:
  - `pharmacy_formulary` - Ghana EML and FDA-registered medications catalog
  - `pharmacy_inventory` - Location-based stock with climate monitoring
  - `prescriptions` - Ghana format with NHIS and Pharmacy Council fields
  - `prescription_refills` - Complete refill audit trail
  - `medication_administration_records` - On-site administration tracking
  - `controlled_medicines_register` - NACOB-compliant tracking
  - `drug_interactions` - Ghana formulary interaction database
  - `pharmacy_alerts` - System-generated alerts
  - `pharmacy_stock_transfers` - Inter-location transfers
  - `pharmacy_audit_log` - Enhanced audit trail for Ghana regulators

- **Ghana-Specific Fields Added**:
  - FDA Ghana registration numbers
  - NACOB schedule classifications
  - Pharmacy Council license tracking
  - NHIS patient and claims data
  - Ghana EML categorization
  - Climate monitoring (temperature, humidity)
  - Multi-language counseling records

#### Integration Points
- ✓ Medical Visits - Prescriptions created during visits
- ✓ Patient Records - Medication history integration
- ✓ Incident Reports - Post-incident prescriptions
- ✓ Inventory System - Shared stock management
- ✓ Audit Logs - Unified audit trail
- ✓ Notifications - Low stock and expiry alerts
- ✓ Care Locations - Location-based operations
- ✓ User Sessions - Active location tracking

#### Implementation Phases
1. **Phase 1 (Weeks 1-4)**: Foundation - Database schema, basic API, formulary
2. **Phase 2 (Weeks 5-8)**: Prescription workflows - E-prescribing with safety checks
3. **Phase 3 (Weeks 9-12)**: Inventory & transfers - Stock management
4. **Phase 4 (Weeks 13-16)**: Controlled substances - DEA compliance
5. **Phase 5 (Weeks 17-20)**: Clinical decision support - Interaction checking
6. **Phase 6 (Weeks 21-24)**: Reporting & analytics - Comprehensive insights
7. **Phase 7 (Weeks 25-28)**: Polish & launch - Production deployment

#### Compliance Features (Ghana)
- **Pharmacy Council of Ghana**: Licensed pharmacist supervision, GPP compliance, CPD tracking
- **FDA Ghana**: Registration validation, pharmacovigilance, batch tracking, import permits
- **NACOB Requirements**: Schedule 1-3 tracking, permits, monthly reconciliation, quarterly reporting
- **Ghana Data Protection Act (2012)**: Encryption, consent, access logging, 5-year retention
- **Minerals Commission**: Fitness for duty, heat stress protocols, mining safety
- **NHIS**: Patient verification, claims submission, authorization, NHIS pricing

#### Success Metrics Defined (Ghana)
- **Operational**: < 45 min turnaround, < 0.1% error rate, > 99% inventory accuracy, 100% FDA-registered, > 95% Ghana EML availability
- **Clinical**: 100% interaction screening, 100% patient counseling (Pharmacy Council), zero serious harm events, > 75% adherence
- **Compliance**: 100% NACOB reporting, 100% FDA pharmacovigilance, zero regulatory violations, complete audit trails
- **NHIS**: > 95% patient ID accuracy, claims within 7 days, < 24hr authorization, 100% pricing accuracy

#### Documentation Created (Ghana Edition)
- **`PHARMACY_MODULE_PLAN.md`** - Comprehensive technical plan adapted for Ghana
- **`PHARMACY_MODULE_SUMMARY.md`** - Executive summary with Ghana context
- **`PHARMACY_MODULE_DIAGRAMS.md`** - Visual workflows with NACOB/FDA references
- **`PHARMACY_MODULE_INDEX.md`** - Central documentation hub for Ghana edition

#### Ghana-Specific Adaptations
- ✅ Pharmacy Council of Ghana regulations
- ✅ FDA Ghana registration requirements
- ✅ NACOB controlled medicines framework
- ✅ Ghana Data Protection Act compliance
- ✅ NHIS integration specifications
- ✅ Ghana EML prioritization
- ✅ Tropical climate storage protocols
- ✅ Multi-language support (Ghanaian languages)
- ✅ Minerals Commission mining regulations
- ✅ Local supply chain considerations

#### Next Steps (Ghana Implementation)
1. Review comprehensive plan (Ghana edition)
2. Engage regulatory consultants (Pharmacy Council, FDA, NACOB)
3. Obtain necessary licenses and permits
4. Seed Ghana EML formulary (598 medicines)
5. Establish NHIS partnership
6. Install climate monitoring equipment
7. Prioritize Phase 1 features
8. Allocate development resources
9. Begin Phase 1 implementation
10. Prepare for regulatory inspections

---

## [3.0.0] - 2025-11-22

### ⚠️ MAJOR BREAKING CHANGES - Platform Migration

#### 🚀 Complete Migration to Vercel & Neon PostgreSQL

**BREAKING:** This version removes all Replit dependencies and migrates to Vercel for hosting and Neon PostgreSQL for database.

#### Platform Changes

- **🚫 REMOVED**: Replit OAuth authentication system
- **🚫 REMOVED**: Replit Object Storage (Google Cloud)
- **🚫 REMOVED**: Replit-specific Vite plugins and configuration
- **✅ ADDED**: Vercel deployment configuration (`vercel.json`)
- **✅ ADDED**: Vercel Blob storage integration (`@vercel/blob`)
- **✅ ADDED**: Neon PostgreSQL database connection (development and production branches)
- **✅ ADDED**: Complete SQL schema migration file (`migrations/schema.sql`)

#### Authentication System Changes

- **BREAKING**: Replit OAuth completely removed - only custom authentication available
- **BREAKING**: All routes now use `customAuthMiddleware` instead of `hybridAuthMiddleware`
- Removed `server/replitAuth.ts` entirely
- Extracted session management to `server/session.ts` for better organization
- Default `authProvider` changed from `'replit'` to `'custom'` in schema
- Updated email verification and password reset URLs to use `FRONTEND_URL` instead of `REPLIT_DOMAINS`

#### File Storage Migration

- **BREAKING**: Replit Object Storage (`server/objectStorage.ts`) completely removed
- **NEW**: Vercel Blob storage integration (`server/vercelBlobStorage.ts`)
- **NEW**: Unified file storage service (`server/fileStorage.ts`) that automatically uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- Files stored in Vercel Blob when configured, fallback to local filesystem for development
- All file upload endpoints updated to use new storage abstraction

#### Database Migration

- **BREAKING**: Database connection now uses Neon PostgreSQL directly via `DATABASE_URL`
- **REMOVED**: Conditional logic for `LOCAL_DATABASE_URL` vs `NEON_DATABASE_URL` - now uses single `DATABASE_URL`
- **NEW**: Complete SQL schema dump (`migrations/schema.sql`) with all 31 tables and DROP statements
- Schema includes all enum types, tables, constraints, indexes, and foreign keys
- Database connection detection based on connection string (Neon vs local)

#### Environment Variables Changes

**REMOVED:**
- `REPLIT_DOMAINS` - No longer needed
- `REPL_ID` - No longer needed
- `ISSUER_URL` - No longer needed
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Replaced with Vercel Blob
- `LOCAL_DATABASE_URL` / `NEON_DATABASE_URL` - Consolidated to single `DATABASE_URL`

**ADDED:**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (optional for production)
- `FRONTEND_URL` - Frontend URL for email links (auto-detected from `VERCEL_URL` in production)

**MODIFIED:**
- `DATABASE_URL` - Now expected to be Neon connection string for both dev and production
- `NODE_ENV` - Still used for environment detection

#### Dependencies Changes

**REMOVED:**
- `@replit/vite-plugin-cartographer` (dev dependency)
- `@replit/vite-plugin-runtime-error-modal` (dev dependency)

**ADDED:**
- `@vercel/blob` - Vercel Blob storage SDK

#### Code Removal

- **DELETED**: `server/replitAuth.ts` - Replit authentication implementation
- **DELETED**: `server/objectStorage.ts` - Replit Object Storage service
- **REMOVED**: All `hybridAuthMiddleware` usages (182 instances replaced with `customAuthMiddleware`)
- **REMOVED**: Replit login button from `client/src/pages/AuthPage.tsx`
- **REMOVED**: Replit dev banner script from `client/index.html`
- **REMOVED**: Replit Vite plugins from `vite.config.ts`

#### New Files Created

- `migrations/schema.sql` - Complete SQL schema with all 31 tables (manual migration option)
- `server/vercelBlobStorage.ts` - Vercel Blob storage service
- `server/session.ts` - Session configuration extracted from replitAuth
- `vercel.json` - Vercel deployment configuration

#### Modified Files

- `server/env.ts` - Simplified to use single `DATABASE_URL`, added Vercel Blob token support
- `server/db.ts` - Simplified database connection, removed conditional logic
- `server/customAuth.ts` - Removed hybrid auth, updated email URLs to use `FRONTEND_URL`
- `server/routes.ts` - Removed all Replit auth imports and usages, updated file storage
- `server/fileStorage.ts` - Added Vercel Blob integration with automatic fallback
- `drizzle.config.ts` - Simplified to use single `DATABASE_URL`
- `shared/schema.ts` - Changed default `authProvider` to `'custom'`, removed `sessions` table
- `package.json` - Updated dependencies, removed Replit plugins
- `vite.config.ts` - Removed Replit-specific plugins
- `client/index.html` - Removed Replit dev banner script

#### Migration Guide

Users migrating from Replit deployment need to:

1. **Database Migration:**
   - Export data from Replit database (if needed)
   - Set up Neon PostgreSQL database (development and production branches)
   - Run `migrations/schema.sql` to create schema
   - Import data (if applicable)

2. **Environment Variables:**
   - Remove all `REPLIT_*` environment variables
   - Set `DATABASE_URL` to Neon connection string
   - Set `BLOB_READ_WRITE_TOKEN` for Vercel Blob (optional)
   - Update `FRONTEND_URL` or let it auto-detect from `VERCEL_URL`

3. **Deployment:**
   - Deploy to Vercel using `vercel.json` configuration
   - Configure environment variables in Vercel dashboard
   - Connect Neon database branches

4. **Authentication:**
   - All users now use custom authentication (email/password)
   - Existing Replit-authenticated users need to reset passwords or re-register
   - No migration path for Replit OAuth sessions

#### Documentation Updates

- **NEW**: `docs/MIGRATION_GUIDE.md` - Complete migration guide from Replit to Vercel
- **UPDATED**: `docs/DEPLOYMENT_GUIDE.md` - Vercel deployment instructions
- **UPDATED**: `docs/LOCAL_DEVELOPMENT_SETUP.md` - Removed Replit references, added Vercel Blob info
- **UPDATED**: `README.md` - Version badge and deployment info

#### Benefits

✅ **Simplified Architecture**: Single authentication system, cleaner codebase  
✅ **Modern Platform**: Vercel edge functions and serverless architecture  
✅ **Better Database**: Neon PostgreSQL with branching for dev/prod  
✅ **Cloud Storage**: Vercel Blob for scalable file storage  
✅ **Reduced Dependencies**: Removed platform-specific plugins and services  
✅ **Better DX**: Cleaner environment variable management  

#### Backward Compatibility

⚠️ **NONE** - This is a complete breaking change. Existing Replit deployments will not work with this version.

---

## [2.7.0] - 2025-11-15

### 🚨 Incident Management Enhancements

#### Redesigned Incident Details Modal
- **MODERN HERO SECTION**: Gradient background with key incident info at a glance
- **TWO-COLUMN LAYOUT**: Main content area + sidebar for better information organization
- **CARD-BASED SECTIONS**: Color-coded cards for different information types
- **VISUAL TIMELINE**: Timeline visualization showing incident progression
- **IMPROVED HIERARCHY**: Better information flow and readability

#### New Emergency Medical Management Field
- **DATABASE SCHEMA**: Added `emergency_medical_mgt` TEXT column to incident_reports
- **FORM INTEGRATION**: New textarea field in create/edit incident forms
- **DETAILS DISPLAY**: Red-themed section in details modal with ambulance icon
- **COMPREHENSIVE DOCS**: Document emergency procedures, interventions, medications, and vital signs
- **POSITIONED LOGICALLY**: Shows before "Actions Taken" in chronological order

#### Enhanced Disposition Display
- **VISUAL DESIGN**: Blue-themed boxes with icons for disposition information
- **DATE & TIME**: Formatted display of disposition date/time
- **CONDITION STATUS**: Clear display of general condition at disposition
- **CONDITIONAL RENDERING**: Only shows when disposition data exists

#### UI/UX Improvements
- **Color Coding**:
  - 🔴 Red gradient hero section for alerts
  - 🔵 Blue for patient information and disposition
  - 🟢 Green/Orange/Red for treatment indicators
  - 🔴 Red for emergency medical management
  - ⚪ Gray for administrative sections
  - 🟣 Purple for documents
  - 🟡 Amber for reporting information
- **Responsive Design**: Optimized for all screen sizes
- **Visual Indicators**: Icons and colors improve scannability
- **Better Information Flow**: Logical section ordering

#### Documentation
- **COMPREHENSIVE GUIDE**: Full documentation in INCIDENT_MANAGEMENT_ENHANCEMENTS.md
- **USAGE GUIDELINES**: Best practices for documenting emergency medical management
- **TRAINING RECOMMENDATIONS**: Guidance for medical staff and administrators
- **TECHNICAL SPECS**: Complete implementation details

#### Files Modified
- `migrations/add_emergency_medical_mgt.sql` - Database migration
- `shared/schema.ts` - Schema update
- `client/src/components/modals/IncidentModal.tsx` - Form field addition
- `client/src/pages/Incidents.tsx` - Modal redesign and new sections
- `docs/INCIDENT_MANAGEMENT_ENHANCEMENTS.md` - Complete documentation

#### Benefits
- ✅ Faster incident review with improved modal layout
- ✅ Comprehensive medical documentation capabilities
- ✅ Better legal protection with detailed emergency response records
- ✅ Enhanced compliance with regulatory requirements
- ✅ Improved data for quality improvement and training
- ✅ Better continuity of care documentation

---

## [2.6.0] - 2025-11-10

### 📍 Multi-Location Care Sites System - Documentation Complete

#### Comprehensive Design Documentation
- **FULL TECHNICAL DOCS**: Complete system architecture and implementation guide
- **QUICK START GUIDE**: 5-minute getting started for admins and staff
- **EXECUTIVE SUMMARY**: Business case and ROI analysis
- **USER FLOWS**: Detailed workflows for all user roles
- **API DOCUMENTATION**: Complete endpoint specifications
- **EDGE CASE HANDLING**: Comprehensive troubleshooting guide

#### System Architecture Design
- **SESSION-BASED BINDING**: Location selected once at login, auto-tagged to all operations
- **SINGLE-LOCATION MODE**: Seamless operation for sites with one facility (invisible feature)
- **MULTI-LOCATION MODE**: Location selection modal for distributed facilities
- **FLEXIBLE SWITCHING**: Mid-shift location change for emergency coverage
- **ADMIN MANAGEMENT**: Complete CRUD interface for location management
- **LOCATION ANALYTICS**: Cross-location performance reporting and insights

#### Database Schema Design
- **NEW TABLE**: `care_locations` with tenant isolation
- **TENANT FLAG**: `has_multiple_locations` boolean for feature toggle
- **SESSION FIELDS**: `active_location_id` and `active_location_name` in user_sessions
- **OPERATIONAL TABLES**: `location_id` foreign key added to all relevant tables
  - medical_visits, incident_reports, appointments
  - drug_tests, alcohol_tests, hydration_tests
  - operational_duty_assignments, operational_duty_completions, medical_inventory

#### API Endpoints Designed
- **LOCATION MANAGEMENT**:
  - `GET /api/care-locations` - List all locations
  - `POST /api/care-locations` - Create location (admin only)
  - `PUT /api/care-locations/:id` - Update location (admin only)
  - `DELETE /api/care-locations/:id` - Delete location with protection
  - `GET /api/care-locations/primary` - Get primary location
- **SESSION MANAGEMENT**:
  - `POST /api/auth/select-location` - Set working location at login
  - `POST /api/auth/switch-location` - Change location mid-session
  - `GET /api/auth/current-session` - Get session with active location
- **ANALYTICS**:
  - `GET /api/analytics/locations` - Comprehensive location analytics
  - `GET /api/analytics/location-comparison` - Compare performance across locations

#### Frontend Components Designed
- **LocationSelectionModal**: Post-login blocking modal for location selection
- **LocationBadge**: Header indicator showing current working location
- **LocationSwitcher**: Mid-shift location change with reason tracking
- **CareLocationsManager**: Admin CRUD interface for location management
- **useActiveLocation() Hook**: Access session location from anywhere

#### Implementation Strategy
- **PHASE 1**: Database schema (1 day)
- **PHASE 2**: Backend API (2-3 days)
- **PHASE 3**: Frontend components (2-3 days)
- **PHASE 4**: Testing (2 days)
- **PHASE 5**: Documentation & training (1 day)
- **PHASE 6**: Deployment (1-2 days)
- **TOTAL TIMELINE**: 10 days

#### Key Features Documented
- ✅ Automatic location tagging via middleware
- ✅ Zero manual location selection on forms
- ✅ Complete audit trail for location actions
- ✅ Protection rules for primary/only location
- ✅ Graceful handling of location deactivation
- ✅ Cross-location reporting for admins
- ✅ Location-based analytics and insights
- ✅ Role-based location access control

#### Documentation Files Created
1. **MULTI_LOCATION_SYSTEM_DOCUMENTATION.md** (350+ lines)
   - Complete technical specification
   - Architecture diagrams
   - User flows and workflows
   - Implementation guide
   - Edge case handling
   - Troubleshooting section

2. **MULTI_LOCATION_QUICK_START.md** (200+ lines)
   - 5-minute overview
   - Quick setup guide
   - Common workflows
   - Troubleshooting tips
   - Quick reference tables

3. **MULTI_LOCATION_SUMMARY.md** (250+ lines)
   - Executive summary
   - Business case and ROI
   - Stakeholder value propositions
   - Risk mitigation strategies
   - Success metrics
   - Implementation timeline

#### Design Decisions Documented
- **WHY SESSION-BASED**: Matches physical reality of shift-based work
- **WHY NOT FORM-LEVEL**: Repetitive and error-prone
- **WHY NOT USER-BINDING**: Inflexible for rotating staff
- **BACKWARD COMPATIBILITY**: No changes for single-location tenants
- **SECURITY CONSIDERATIONS**: Tenant isolation and role-based access
- **AUDIT REQUIREMENTS**: Complete location action history

#### Next Steps
- [ ] Stakeholder review and approval
- [ ] Phase 1 implementation: Database schema
- [ ] Phase 2 implementation: Backend API
- [ ] Phase 3 implementation: Frontend components
- [ ] Phase 4: Comprehensive testing
- [ ] Phase 5: User training materials
- [ ] Phase 6: Production deployment

---

## [2.5.0] - 2025-10-25

### 🚀 Drug, Alcohol & Hydration Testing Module

#### Complete Testing System
- **DRUG TESTING**: 6-panel screening with DrugCheck 3000 integration (COC, OPI, THC, AMP, MET, BZO)
- **ALCOHOL TESTING**: Breathalyzer and BAC monitoring with confirmation test capability
- **HYDRATION TESTING**: Specific gravity measurement and dehydration level assessment
- **TESTING PROGRAMS**: Random, pre-employment, post-incident, reasonable suspicion protocols
- **SPECIMEN TYPES**: Urine, saliva, blood, hair collection support
- **DEVICE INTEGRATION**: DrugCheck 3000, breathalyzer, comprehensive lab analysis

#### Full CRUD Operations with Audit Logging
- **CREATE**: Schedule tests with comprehensive form validation and auto-generated test numbers
- **READ**: View all tests with filtering by status, date, and type
- **UPDATE**: Edit tests with prepopulated modals and field validation
- **DELETE**: Remove tests with confirmation and audit trail
- **AUDIT LOGGING**: Complete edit history with original data snapshots for regulatory compliance

#### Reports & Analytics Module
- **ANALYTICS DASHBOARD**: Comprehensive insights at `/testing/reports`
- **KEY METRICS**: Total tests, positive rate, compliance rate, active programs
- **DATE FILTERING**: Last 7/30/90 days, custom ranges
- **TEST TYPE FILTERING**: All, drug only, alcohol only, hydration only
- **REPORT TYPES**: Summary, detailed, and compliance reports
- **SMART INSIGHTS**: Automated recommendations based on data patterns
  - Elevated positive rate alerts (>5%)
  - Excellent compliance recognition (≥90%)
  - Low testing volume warnings (<10 tests)
  - Hydration concern flagging (>30% dehydrated)
- **EXPORT FUNCTIONALITY**: CSV export and print-friendly reports

#### Advanced Test Result Management
- **INDIVIDUAL PANEL TRACKING**: Separate results for each drug panel
- **OVERALL RESULT**: Negative, Positive, Non-negative, Dilute, Invalid, Pending
- **BAC LEVELS**: Precise alcohol level tracking with breathalyzer integration
- **SPECIFIC GRAVITY**: Numeric hydration measurement with 3-decimal precision
- **CHAIN OF CUSTODY**: Legal compliance tracking for drug tests
- **MRO REVIEW**: Medical Review Officer workflow support

#### Testing Program Management
- **PROGRAM TYPES**: Random, pre-employment, post-incident, return-to-duty, follow-up
- **SCHEDULING**: Automated test scheduling based on frequency and pool size
- **DEPARTMENT TARGETING**: Focus on specific departments or underground personnel
- **ACTIVATION CONTROL**: Enable/disable programs with toggle switches
- **POOL MANAGEMENT**: Configure testing pool sizes for random selection

#### Enhanced UI/UX
- **STATUS FILTERS**: Filter completed tests by status (All, Completed, Collected, In Lab, Results Pending)
- **EDIT MODALS**: Prepopulated forms for quick updates
- **DYNAMIC FIELDS**: Show/hide fields based on test status (scheduled vs completed)
- **RESULT FIELDS**: Dynamic result entry when changing status to completed
- **MOBILE RESPONSIVE**: Full mobile optimization with touch-friendly controls
- **REAL-TIME UPDATES**: React Query caching and automatic invalidation

#### Test Scheduling Improvements
- **DRUG SCHEDULING**: Complete form with specimen type, device, chain of custody
- **ALCOHOL SCHEDULING**: Full form with observation period and confirmation test options
- **HYDRATION SCHEDULING**: Comprehensive form with test type, location, UG personnel flag
- **CALENDAR PICKER**: Date selection with validation (no past dates)
- **TIME INPUT**: Standard time picker for precise scheduling

### 🔧 Technical Enhancements

#### Database Schema
- **NEW TABLES**: drug_tests, alcohol_tests, hydration_tests, testing_programs
- **ENUMS ADDED**: test_result (with "non-negative"), test_status, test_reason, hydration_level
- **AUDIT INTEGRATION**: All test edits logged to audit_logs table
- **FOREIGN KEYS**: Proper relationships with employees and users
- **INDEXES**: Optimized for fast queries on test numbers, dates, and statuses

#### Backend API
- **15+ NEW ENDPOINTS**: Complete REST API for all testing operations
- **CRUD ROUTES**: Drug tests, alcohol tests, hydration tests, programs
- **ANALYTICS ENDPOINT**: `/api/testing/analytics` with comprehensive statistics
- **VALIDATION**: Zod schema validation for all requests
- **ERROR HANDLING**: Detailed error messages for debugging

#### Frontend Architecture
- **5 NEW PAGES**: DrugAlcoholTesting (2,383 lines), TestResultForm, NewTestingForm, TestScheduling, TestingReports
- **REACT QUERY**: Optimistic updates and cache management
- **FORM VALIDATION**: React Hook Form with Zod resolvers
- **MUTATIONS**: Create, update, delete with success/error toasts
- **RESPONSIVE DESIGN**: Mobile-first approach with breakpoints

### 🐛 Bug Fixes
- **ENUM VALIDATION**: Fixed "non-negative" enum addition across all forms
- **DATE HANDLING**: Proper date formatting with to_char() and ISO conversion
- **NULL SAFETY**: Added comprehensive null checks in analytics
- **SPECIFIC GRAVITY**: Fixed numeric display with 3 decimal places
- **INDIVIDUAL RESULTS**: Fixed drug panel results not saving to database
- **CHECKBOX IMPORT**: Added missing Checkbox component import
- **HYDRATION ENUM**: Fixed test reason enum mismatch

### 📚 Documentation
- **COMPREHENSIVE DOCS**: TESTING_MODULE_DOCUMENTATION.md (1,350+ lines)
- **QUICK START GUIDE**: TESTING_MODULE_QUICK_START.md (400+ lines)
- **SUMMARY DOCUMENT**: TESTING_MODULE_SUMMARY.md (400+ lines)
- **API DOCUMENTATION**: Complete endpoint specifications with examples
- **USER FLOWS**: 6 detailed workflow diagrams
- **TROUBLESHOOTING**: Common issues and solutions

---

## [2.4.0] - 2025-10-15

### 🚀 Super Admin System & Tenant Plan Management

#### Super Admin Authentication & Security
- **SUPER ADMIN ACCESS**: Secure password-based authentication system ("superadmin123")
- **ADMIN MIDDLEWARE**: Dedicated authentication middleware with environment variable fallback
- **SECURITY LOGGING**: Comprehensive debug logging for all Super Admin access attempts
- **GLOBAL ACCESS**: System-wide management capabilities across all tenant organizations

#### Comprehensive Tenant Management
- **TENANT CRUD**: Complete tenant organization lifecycle management (create, read, update, delete)
- **PLAN MANAGEMENT**: Basic/Premium/Enterprise plan assignments with real-time updates
- **STATUS CONTROL**: Tenant status management (active, suspended, inactive) with email notifications
- **TENANT CREATION**: Automated tenant and admin user creation with professional welcome emails
- **PLAN EDITING**: Interactive plan selection dropdowns with BarChart3 icons for visual clarity

#### Advanced Tenant Administrator Management
- **ADMIN CRUD**: Full tenant administrator operations (edit, approve, delete)
- **APPROVAL WORKFLOW**: Tenant admin approval system with automatic email notifications
- **USER MANAGEMENT**: Complete user management across all tenants with filtering and search
- **ROLE ASSIGNMENT**: Real-time role changes with comprehensive audit logging
- **BULK OPERATIONS**: Mass approval and management capabilities for administrative efficiency

#### Professional Email Integration
- **GMAIL SMTP**: Seamless integration with existing Gmail SMTP configuration
- **WELCOME EMAILS**: Professional branded welcome emails for approved tenants and admins
- **NOTIFICATION SYSTEM**: Comprehensive email notifications for all administrative actions
- **EMAIL TEMPLATES**: Consistent MineAid HMS branding across all email communications
- **FALLBACK LOGGING**: Console logging fallback when email credentials unavailable

#### Enhanced Audit Logging for Super Admin
- **SUPER ADMIN AUDIT**: Complete audit trail for all Super Admin operations
- **TENANT TRACKING**: Plan changes, status updates, and creation activities logged
- **ADMIN OPERATIONS**: Tenant admin approvals, updates, and deletions audited
- **COMPLIANCE READY**: Full regulatory compliance with detailed administrative action tracking
- **SECURITY MONITORING**: All Super Admin access and operations comprehensively logged

### 🔧 Technical Enhancements

#### Backend Architecture Improvements
- **DEDICATED ROUTES**: Complete Super Admin API endpoints with proper error handling
- **AUDIT INTEGRATION**: Super Admin operations seamlessly integrated with existing audit system
- **EMAIL SERVICE**: Unified email service supporting both operational and administrative emails
- **VALIDATION LAYERS**: Comprehensive request validation for all Super Admin operations
- **ERROR HANDLING**: Enhanced error management with detailed logging and user feedback

#### Frontend Super Admin Interface
- **TABBED INTERFACE**: Professional tabbed navigation (Tenants, Admins, Users)
- **INTERACTIVE CONTROLS**: Real-time plan editing and status management dropdowns
- **STATISTICS DASHBOARD**: Comprehensive metrics cards showing system-wide statistics
- **RESPONSIVE DESIGN**: Mobile-optimized Super Admin interface with proper accessibility
- **VISUAL INDICATORS**: Clear status badges and action buttons with intuitive iconography

#### Database Schema Updates
- **PLAN MANAGEMENT**: Enhanced tenant schema with plan type tracking
- **STATUS WORKFLOW**: Improved tenant status management with validation
- **ADMIN RELATIONSHIPS**: Optimized relationships between tenants and administrators
- **AUDIT EXPANSION**: Extended audit logging to capture Super Admin operations

### 📚 Documentation Updates
- **SUPER ADMIN GUIDE**: Comprehensive Super Admin system documentation
- **EMAIL INTEGRATION**: Updated email service documentation for Gmail SMTP
- **ARCHITECTURE UPDATES**: Enhanced replit.md with Super Admin system details
- **VERSION TRACKING**: Updated to 2.4.0 with complete feature documentation

## [2.3.0] - 2025-09-20

### 🚀 Comprehensive CRUD Operations & Audit Logging

#### System-Wide 3-Dots Menu CRUD Functionality
- **APPOINTMENTS**: Full CRUD operations with 3-dots menu (create, read, update, delete, status management)
- **MEDICAL VISITS**: Complete CRUD with detailed modal views and inline editing capabilities
- **INCIDENT REPORTS**: Comprehensive CRUD operations with status tracking and follow-up management
- **OPERATIONAL DUTIES**: Full lifecycle management with assignment, completion, and history tracking
- **MENU STANDARDIZATION**: Consistent 3-dots dropdown interface across all modules

#### Comprehensive Audit Logging System
- **AUDIT SCHEMA**: New `audit_logs` table with complete action tracking (INSERT, UPDATE, DELETE)
- **TENANT ISOLATION**: All audit logs include tenant_id for bulletproof data separation
- **ACTION TRACKING**: Records user_id, table_name, record_id, old_data, new_data, and timestamps
- **CRUD INTEGRATION**: Every database operation automatically logged with detailed change tracking
- **ADMIN OPERATIONS AUDIT**: Extended audit logging to all administrative actions
  - User approval/rejection tracking (`admin_approve`)
  - Role change operations logging (`admin_update_role`)
  - User invitation audit trails (`admin_invite`) 
  - Employee initialization tracking (`admin_initialize`)
  - Super admin approval operations (`admin_approve_admin`)
- **AUDIT TRAIL PAGE**: Dedicated interface for viewing system-wide audit history with filtering
- **DATA INTEGRITY**: Complete audit trail for regulatory compliance and debugging

#### Enhanced UI/UX Improvements
- **CARD HOVER EFFECTS**: Coral accent color hover states with smooth animations and lift effects
- **NAVIGATION ENHANCEMENT**: Header links with proper vertical centering and coral accent active states
- **SIDEBAR IMPROVEMENTS**: Enhanced mobile background with blur effects and better logo alignment
- **APPOINTMENT MANAGEMENT**: Status reassignment functionality allowing correction of completed appointments
- **RESPONSIVE DESIGN**: Improved mobile responsiveness across all components

#### Appointment System Enhancements
- **STATUS MANAGEMENT**: Complete appointment lifecycle (scheduled, in_progress, completed, cancelled, no_show)
- **REASSIGNMENT FEATURE**: Ability to correct appointment statuses (e.g., completed → no_show)
- **3-DOTS INTEGRATION**: Standardized dropdown menu for all appointment operations
- **AUDIT INTEGRATION**: All appointment changes tracked in audit system
- **BULK OPERATIONS**: Support for batch status updates and bulk actions

### 🔧 Technical Improvements

#### Database Schema Enhancements
- **AUDIT LOGS TABLE**: New comprehensive audit logging schema with tenant isolation
- **APPOINTMENT STATUS**: Enhanced status tracking with validation and workflow management
- **FOREIGN KEY OPTIMIZATION**: Improved relationships for better audit trail integrity
- **INDEX OPTIMIZATION**: Performance indexes for audit queries and large-scale operations

#### Backend Architecture
- **CRUD MIDDLEWARE**: Systematic audit logging integrated into all database operations
- **STATUS VALIDATION**: Server-side validation for appointment status transitions
- **BULK OPERATIONS**: API endpoints for batch operations with audit trail support
- **ERROR HANDLING**: Enhanced error management with detailed audit logging

#### Frontend Architecture
- **COMPONENT STANDARDIZATION**: Reusable 3-dots menu component across all modules
- **STATE MANAGEMENT**: Improved React state handling for CRUD operations
- **FORM VALIDATION**: Enhanced form validation with real-time feedback
- **LOADING STATES**: Consistent loading indicators for all CRUD operations

### 🐛 Bug Fixes
- **TYPESCRIPT ERRORS**: Fixed all user type casting issues in MainLayout component
- **APPOINTMENT CARDS**: Resolved status display inconsistencies across different views
- **MODAL INTERACTIONS**: Fixed modal z-index and interaction issues
- **AUDIT TRAIL**: Resolved timezone handling in audit log timestamps

### 📚 Documentation Updates
- **API DOCUMENTATION**: Added comprehensive CRUD endpoint documentation
- **AUDIT SYSTEM**: Detailed audit logging schema and usage documentation
- **IMPLEMENTATION PLAN**: Updated with CRUD functionality and audit system architecture
- **VERSION TRACKING**: Updated to 2.3.0 with complete feature documentation

## [2.2.0] - 2025-09-10

### 🚀 Major Multi-Tenant Architecture Implementation

#### Complete Tenant Hierarchy
- **ARCHITECTURE**: Implemented full multi-level tenant hierarchy: MineAid Admin → Tenants → Companies → Employees → Users → Patients
- **DATABASE**: Complete schema redesign with tenant isolation at every level using cascading foreign keys
- **ISOLATION**: Bulletproof tenant data separation - no cross-tenant access possible

#### Comprehensive Admin Panel
- **ADMIN ROUTES**: Full /admin implementation with user approval workflow and company management
- **USER MANAGEMENT**: Enhanced filtering (status, search), user invitation system with email notifications
- **ROLE MANAGEMENT**: Real-time role changes with professional email notifications
- **CROSS-TAB NAVIGATION**: Fixed "View Employees" functionality with proper React state management

#### Professional Email System
- **EMAIL MIGRATION**: Switched from expensive SendGrid to cost-effective Gmail SMTP using Nodemailer
- **BRANDED TEMPLATES**: Professional email templates with actual MineAid HMS PNG logo integration
- **STATIC ASSETS**: Created /public folder structure with Express static serving for logos and profiles
- **NOTIFICATIONS**: Comprehensive approval and role change notification system

#### Employee-User Integration
- **AUTO-CREATION**: All users automatically get employee records with unique employee numbers
- **FOREIGN KEY RESOLUTION**: Fixed patients table constraints by ensuring complete employee-user relationships
- **SEAMLESS OPERATIONS**: Bulletproof integration enabling smooth patient management workflows

#### Cost-Effective File Storage
- **LOCAL STORAGE**: Replaced expensive Google Cloud Storage with local /public/profiles/ directory
- **MULTER INTEGRATION**: Simple file upload system with proper validation (images only, 5MB limit)
- **STATIC SERVING**: Express serves profile images directly from /public directory
- **COST SAVINGS**: Eliminated cloud storage costs while maintaining full functionality

### 🔧 Technical Improvements

#### Enhanced Database Architecture
- **TENANT ISOLATION**: All tables redesigned with tenant_id foreign keys and cascading deletes
- **EMPLOYEE SYSTEM**: Automatic employee creation with unique numbering (EMP0001-EMP0007 format)
- **DATA INTEGRITY**: Fixed all foreign key constraints with proper tenant relationships
- **SCHEMA OPTIMIZATION**: Multi-column indexes for efficient tenant-aware queries

#### Authentication & Security
- **HYBRID MIDDLEWARE**: Fixed authentication middleware ordering for proper admin access
- **ADMIN AUTHENTICATION**: Environment variable-based admin access (ADMIN_SECRET="admin123")
- **SESSION MANAGEMENT**: Enhanced logout functionality for both auth systems
- **SECURITY HARDENING**: Tenant isolation prevents any cross-tenant data access

#### Frontend Enhancements
- **ADMIN PANEL**: Comprehensive user management with robust filtering and search
- **PROFILE SYSTEM**: Local file upload with preview and validation
- **NAVIGATION**: Fixed cross-tab functionality using proper React state props
- **USER EXPERIENCE**: Enhanced forms with real-time validation and feedback

### 🐛 Bug Fixes
- **DOM MANIPULATION**: Replaced unreliable DOM manipulation with proper React state management
- **FILE UPLOADS**: Fixed profile picture uploads to work with local storage
- **FOREIGN KEYS**: Resolved patients table constraint errors with proper employee relationships
- **AUTHENTICATION**: Fixed middleware ordering to ensure proper user population before admin checks

### 📚 Documentation Updates
- **ARCHITECTURE**: Updated all documentation to reflect multi-tenant architecture
- **IMPLEMENTATION**: Enhanced status tracking with current tenant isolation features
- **VERSION**: Updated to 2.2.0 with comprehensive feature documentation

## [2.1.0] - 2025-08-15

### 🚀 Tenant Foundation & Admin System
- **TENANT HIERARCHY**: Initial implementation of tenant → company → employee structure
- **ADMIN PANEL**: Basic admin routes with user approval workflow
- **EMAIL SYSTEM**: Gmail SMTP integration for cost efficiency
- **NOTIFICATIONS**: User invitation and approval email system

## [2.0.0] - 2025-08-01

### 🚀 Major Features Added

#### Dual Authentication System
- **BREAKING**: Implemented comprehensive custom authentication alongside existing Replit auth
- Added email/phone-based user registration with secure password hashing
- Implemented session management with JWT-like tokens
- Added password reset functionality with secure token generation
- Created email verification system (mock implementation)
- Added phone verification support (mock implementation)
- Built hybrid authentication middleware supporting both Replit and custom auth

#### Multitenant Architecture Foundation
- Enhanced users table with tenant isolation fields
- Added dedicated tenants table for multitenant support
- Implemented user sessions table for custom authentication
- Added email verification tracking
- Created password reset token management
- Designed for full tenant data isolation

#### Enhanced Frontend Experience
- Created comprehensive AuthPage with dual login/register forms
- Implemented responsive design with mobile-first approach
- Added form validation with react-hook-form and Zod schemas
- Integrated toast notifications for user feedback
- Updated Landing page with registration options
- Maintained brand consistency with MineAid design system

### 🔧 Technical Improvements

#### Database Schema Enhancements
- Extended users table with custom auth fields
- Added proper tenant relationship structures
- Implemented secure token storage
- Created verification tracking tables
- Optimized for both single and multitenant deployments

#### API Architecture
- Added 6 new authentication endpoints
- Implemented hybrid authentication middleware
- Enhanced error handling and validation
- Added comprehensive request/response logging
- Maintained backward compatibility with existing endpoints

#### Security Enhancements
- Implemented bcrypt password hashing with 12 salt rounds
- Added secure session token generation
- Created token expiration management
- Implemented request validation with Zod schemas
- Added protection against common security vulnerabilities

### 🐛 Bug Fixes
- Fixed nested anchor tag warnings in navigation components
- Resolved console errors from undefined state handling
- Corrected form validation error messaging
- Fixed responsive layout issues on mobile devices

### 📚 Documentation
- Created comprehensive implementation status tracking
- Added detailed API endpoint documentation
- Updated project architecture documentation
- Created changelog for version tracking

### 🔄 Migration Notes
- Database schema changes applied automatically via Drizzle
- No breaking changes for existing Replit auth users
- New custom auth features available immediately
- Hybrid authentication works seamlessly with existing code

## [1.0.0] - 2025-07-15

### Initial Release
- Core patient management system
- Appointment scheduling functionality
- Medical records tracking
- Incident reporting system
- Dashboard with analytics
- Replit authentication integration
- PostgreSQL database with Drizzle ORM
- React frontend with TypeScript

---

### Version Numbering
- **Major**: Breaking changes or significant feature additions
- **Minor**: New features that are backward compatible
- **Patch**: Bug fixes and minor improvements

### Legend
- 🚀 New Features
- 🔧 Improvements
- 🐛 Bug Fixes
- 📚 Documentation
- 🔄 Migration Notes
- ⚠️ Breaking Changes
- 🔒 Security