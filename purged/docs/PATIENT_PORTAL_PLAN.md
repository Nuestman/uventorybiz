# Tenant-Scoped Patient Portal — Comprehensive Plan

**Version:** 1.0.9  
**Status:** Phases 1–2 implemented; **telehealth (WebRTC + optional Teams)** implemented — see implementation notes below  
**Last Updated:** July 6, 2026  
**Related docs:** [AUTH_SYSTEM.md](./AUTH_SYSTEM.md), [RBAC.md](./RBAC.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [TENANT_SETTINGS_AND_BRANDING.md](./TENANT_SETTINGS_AND_BRANDING.md), [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md), [PORTAL_STYLES.md](./PORTAL_STYLES.md)

### Implementation notes (as built)

- **Routes:** `/portal/login` (public), `/portal/*` behind `PortalProtected` + `PortalLayout`; staff auth redirect logic skips `/portal`.
- **Session:** HttpOnly cookie `portalSessionToken`; admin APIs under `/api/admin/portal-settings` and `/api/admin/portal-users`.
- **Identity model:** Portal accounts live in **`portal_users`** (credentials only) — **not** in staff **`users`**. One row per patient per tenant; linked to `patients.id`. **Profile photos** are stored on **`employees.profile_image_url`** so staff patient/employee views and the portal show the same image.
- **Granting access (operational):** A tenant **admin** (or super admin) enables the portal in **Settings → Patient portal**, sets an **organization code** (`portal_slug`), then **Add portal account**: pick the **patient** (registered employee), set **portal email** and **initial password**, and save. The employee uses those credentials on the portal sign-in page (with org code or tenant id). Removing the portal account revokes access without deleting the patient record.
- **Sign-in URL:** `{app origin}/portal/login` — optional query **`?org={portal_slug}`** loads tenant branding (e.g. `https://your-hms.example.com/portal/login?org=acme-mine`). Same origin as the web app; staff continue to use `/auth`.
- **Sign-in methods:** Magic link (email only, primary) or password backup. Magic links expire in **15 minutes** (single use).
- **Portal sessions:** **14-day** absolute max (from session creation), **60-minute** idle timeout, **7-day** sliding renewal on activity — all configurable per tenant under **Settings → Security**.
- **Tenant admin UI:** **Settings → Patient portal** — enable portal, organization code, support email, privacy URL, per-feature toggles, copy sign-in link, list/create/delete portal accounts (patient search + email + password). Welcome email includes a magic link.
- **Phase 2 (profile):** Patients can **edit** **profile photo** (`employees.profile_image_url`), **date of birth**, **phone**, **emergency contacts** (`PUT /api/portal/employee-profile`), and **clinical health fields** (`PUT /api/portal/health-profile` — allergies, medications, history, disability, notes; staff may review). **Vital signs** remain **read-only**. Photo: `POST/DELETE /api/portal/profile-photo`.
- **Public discovery:** Links to the patient portal from marketing **header/footer** (`PublicLayout`, `PublicFooter`), landing hero, staff **`/auth`** page (“Go to the patient portal”), and dedicated **`/portal`** marketing landing (`PortalMarketingPage`).
- **Portal styling (4.31.0):** Self-contained CSS under `client/src/portal/styles/` loaded via `bootstrap.ts`. All portal surfaces use `portal-root` (or `portal-page` / `portal-marketing`). See [PORTAL_STYLES.md](./PORTAL_STYLES.md).
- **Appointment requests (4.31.0):** Multi-step modal with preferred date/time blocks; teal progress and slot selection; email-only access request on login.
- **Portal vitals (4.31.0):** Patients can submit vitals from `/portal/vitals` when feature enabled (`20260616_04_portal_patient_vitals.sql`).
- **Portal symptoms tracker (4.35.0):** OPQRST-structured symptom diary at `/portal/symptoms` — multi-select catalog, offline cache/outbox, per-symptom trends, severe-symptom staff alerts. See [PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md](./PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md). Migrations: `migrations/_archive/legacy_upgrades/20260705_01_portal_symptom_logs.sql`, `20260705_02_symptom_alert_notification_type.sql`, `20260705_03_symptom_log_opqrst.sql`.
- **Work fitness & medications (4.31.0):** Portal declaration flow with optional medication images (`20260616_02_*`, `20260616_03_*`).
- **Portal access requests (4.31.1):** Public request queue stored in `portal_access_requests`; lookup matches employee email and portal accounts (including patient-linked accounts when emails differ); admin approve/reject/suspend in Settings → Patient portal; `portal_access_request` notification type. Migrations: `20260619_01_*`, `20260620_01_*`.
- **Portal notification preferences (4.32.0):** Per-channel opt-in/out on portal Profile (`portal_user_notification_preferences`). Migration: `20260620_02_portal_notification_preferences.sql`.
- **What's New (4.33.0):** Curated release dialog for staff + portal; server ack per user. Migration: `20260620_03_release_notes_ack.sql`. Copy: `shared/curatedReleaseNotes.ts`.
- **Portal mobile nav (4.33.0):** Hamburger opens full sidebar sheet on mobile.
- **Session expiry UX:** Same tenant **Settings → Security** expiry warning as staff; portal uses `SessionTimeoutWarning` in `PortalLayout`. See [SESSION_SECURITY_AND_MFA.md](./SESSION_SECURITY_AND_MFA.md).
- **Telehealth (WebRTC):** In-browser video visits via **LiveKit** (default) or **Microsoft Teams** (`TELEHEALTH_PROVIDER`). Dedicated portal room at **`/portal/visits/:sessionId/join`** — pre-join device check, virtual waiting room, in-call controls, session end. Join from **Home**, **Appointments**, or confirmation email. Provider-aware labels (no “Join Teams” when LiveKit is active). Requires appointment **confirmed** and join window (15 min before – 90 min after slot). See [§6.3](#63-phase-3--telehealth-implemented) and [TELEHEALTH_UI.md](./TELEHEALTH_UI.md).
- **Migration:** `migrations/20260402_02_patient_portal_foundation.sql`, `migrations/20260402_03_employee_profile_image.sql`, `migrations/20260402_01_patient_health_profile.sql`, `migrations/20260531_01_portal_magic_login_tokens.sql` where used. If you already applied the same SQL under the former filename `20260403_patient_portal_foundation.sql`, do not run again.

---

## Table of Contents

1. [Executive overview](#1-executive-overview)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Conceptual architecture](#3-conceptual-architecture)
4. [Identity and access](#4-identity-and-access)
5. [Tenant scoping and branding](#5-tenant-scoping-and-branding)
6. [Feature scope (phased)](#6-feature-scope-phased)
7. [Data model (conceptual)](#7-data-model-conceptual)
8. [API surface (conceptual)](#8-api-surface-conceptual)
9. [Security, privacy, and compliance](#9-security-privacy-and-compliance)
10. [UX and channels](#10-ux-and-channels)
11. [Integration with existing HMS modules](#11-integration-with-existing-hms-modules)
12. [Implementation phases](#12-implementation-phases)
13. [Risks and open decisions](#13-risks-and-open-decisions)

*(Section 6.3 documents telehealth — inserted without renumbering later phases.)*

---

## 1. Executive overview

### Purpose

Deliver a **tenant-scoped patient portal** that allows **patients** (or their authorized caregivers, where policy allows) to interact with **their own** health information and **non-clinical** workflows in a **separate** experience from the **staff** HMS application.

The portal is **scoped by tenant** (`tenant_id`): every patient account, session, and API call is tied to **one tenant organization** (e.g. one mining site’s occupational health service), consistent with MineAid’s multi-tenant model ([AUTH_SYSTEM.md](./AUTH_SYSTEM.md)).

### Business value

- **Convenience** for patients: appointments, forms, messages, **limited** record access.
- **Reduced administrative load** on clinic staff for routine requests.
- **Modern expectation** for digital access to scheduling and communication.

### Critical distinction

- **Staff app** — existing web app with roles `medical_staff`, `admin`, `safety_officer`, etc.
- **Patient portal** — **separate** role surface (`patient` or dedicated portal user type) with **strict** data minimization and **no** access to staff directories or other patients’ data.

---

## 2. Goals and non-goals

### Goals

1. **Strong tenant isolation** — patients only see data for **their tenant** and **their own** patient record linkage.
2. **Separate authentication** — portal users must not be confused with staff sessions (see [§4](#4-identity-and-access)).
3. **Phased delivery** — start with **high-value, low-risk** features (appointments, messaging), then expand.
4. **Auditability** — log portal access and sensitive actions.

### Non-goals (initial phases)

- **Full EHR replacement** — full charting, clinical workflows, and inventory remain **staff-only**.
- **Automatic** data sharing with external payers without explicit integration scope.
- **Replacing** in-person visits for acute care.

---

## 3. Conceptual architecture

### High-level

```
┌─────────────────────────────────────────────────────────────┐
│                     Tenant (organization)                    │
│  tenant_id, branding, portal settings, allowed features      │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────┐                     ┌─────────────────────┐
│ Staff HMS     │                     │ Patient portal      │
│ (existing app)│                     │ (new SPA or route   │
│ Session: staff│                     │  subtree / subdomain)│
└───────────────┘                     └─────────────────────┘
```

### Options for implementation shape

| Approach | Description |
|----------|-------------|
| **A. Route prefix** | e.g. `/portal/*` in the same React app with **different layout** and **portal-only** auth guard. |
| **B. Subdomain** | `portal.{tenant}.example.com` — requires DNS + tenant resolution middleware. |
| **C. Separate SPA** | Independent deploy; shared API only. |

**Recommendation for planning:** Start with **A** or **B** based on security and branding needs; **B** improves **tenant UX** but adds **infrastructure** complexity.

---

## 4. Identity and access

### 4.1 Patient linkage

- Each portal user account maps to **one `patients` row** (or a controlled **caregiver** relationship table — future).
- **Verification** at enrollment: match **employee number**, **date of birth**, **OTP to verified phone/email**, or **in-clinic** code — **policy** must be defined per tenant.

### 4.2 Auth model (conceptual)

- **Separate** credential store or **distinct** `user` role with `role = 'patient'` and `tenant_id`.
- **Never** share session cookies between staff and portal without **strict** separation (different cookie names, paths, or domains).
- **Optional:** OAuth/OIDC later for enterprise SSO; **not** required for MVP.

### 4.3 Account lifecycle

- **Registration** → **pending verification** → **active** → **locked** / **deleted** (GDPR-style retention per policy).

---

## 5. Tenant scoping and branding

- Reuse **tenant branding** (logo, colors, name) from [TENANT_SETTINGS_AND_BRANDING.md](./TENANT_SETTINGS_AND_BRANDING.md).
- **Portal settings** (new): enable/disable portal, allowed features, **support contact**, **privacy notice** URL.
- **Tenant resolution** for subdomain or path: `tenant_slug` or `tenant_id` on `tenants` table (add field if missing).

---

## 6. Feature scope (phased)

### Phase 1 — Foundation

| Feature | Description |
|---------|-------------|
| **Login / logout** | Portal-specific auth; change password; **portal_users** + **portal_sessions**. |
| **Tenant branding** | Public tenant card by `portal_slug`; admin portal settings. |
| **Appointments** | List; appointment **requests** (staff workflow). |
| **Visit summaries** | High-level read-only list. |
| **Vital signs** | Read-only list. |
| **Audit** | Portal audit events for login and sensitive actions. |

### Phase 2 — Personal profile & health visibility (current)

| Feature | Description |
|---------|-------------|
| **Personal profile (editable)** | **Profile photo** (`employees.profile_image_url`), **date of birth**, **phone**, **emergency contacts** — non-clinical fields appropriate for self-service. |
| **Clinical health record** | Allergies, medications, medical history, disability, notes — **patient-editable**; portal tooltips guide input; staff HMS may review or amend. |
| **Vital signs** | **Read-only** (no patient edits). |

### Phase 3 — Telehealth (implemented)

Dedicated **in-browser WebRTC** video visits for patients. Staff join the same session from the HMS at `/telecare/:sessionId`; patients never leave the portal chrome.

| Feature | Description |
|---------|-------------|
| **Dedicated portal room** | Route `/portal/visits/:sessionId/join` — full-screen flow inside `PortalLayout` (not an external Teams tab). |
| **Pre-join** | Camera/microphone preview and toggles before connecting. |
| **Virtual waiting room** | Patient connects to LiveKit and waits until clinician (`provider_*` identity) joins. |
| **In-call UX** | Remote video stage, local PiP, mute/camera/leave, connection badge, leave confirmation. |
| **Entry points** | Portal **Home** (upcoming telehealth card), **Appointments** list, email deep link after confirmation. |
| **Join rules** | Appointment must be **confirmed**; join window 15 min before – 90 min after scheduled time (server-enforced). |
| **Session lifecycle** | `telecare_sessions`: `scheduled` → `waiting_room` (patient) → `in_progress` (provider) → `completed` on leave. |
| **Notifications** | Confirmation emails link to portal room URL (`/portal/visits/:sessionId/join`), not vendor URLs. |

#### Portal telehealth UI (as built)

```
/portal/appointments          → "Join video visit" when in window + confirmed
/portal                       → Upcoming telehealth highlight on home
/portal/visits/:sessionId/join → TelecareRoom (shared component, audience=portal)
```

Components: `client/src/components/telecare/*`, wrapper `PortalTelecareJoinPage.tsx`.

#### Portal telehealth API (as built)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/portal/telecare/sessions` | Upcoming telehealth sessions for logged-in patient |
| `GET` | `/api/portal/telecare/sessions/:id` | Session + appointment metadata for room page |
| `POST` | `/api/portal/telecare/sessions/:id/join` | Validate window → return LiveKit `{ room: { token, serverUrl, roomName } }` |
| `POST` | `/api/portal/telecare/sessions/:id/complete` | Mark session completed when patient leaves |

All routes require portal session; `patient_id` bound from session (never from URL alone).

#### Configuration (operations)

LiveKit credentials on the server (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL`, `LIVEKIT_HTTP_URL`). See [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md) and `.env.example`.

#### Staff ↔ portal integration

- Staff schedule or approve telehealth → `telecare_sessions` row + provision on confirm.
- Staff **Telehealth** sidebar (`/telecare`) shows today’s queue; **Appointments** and **Medical Visit** link back to `/telecare/:sessionId`.
- Clinical documentation remains in **Medical Visit** (`/encounter`); video is separate chrome with cross-links.

See [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md) §6 and [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md).

### Phase 4 — Engagement (formerly “Phase 2” in early roadmap)

| Feature | Description |
|---------|-------------|
| **Secure messaging** | Thread with clinic (no PHI in email body; link to portal). |
| **Forms / questionnaires** | Pre-visit forms, consent forms (signed in portal). |
| **Documents** | Download **patient-appropriate** PDFs if **released** by policy. |

### Phase 5 — Advanced (formerly “Phase 3” in early roadmap)

| Feature | Description |
|---------|-------------|
| **Caregiver access** | Controlled linkage to another patient record (policy + audit). |
| **MFA** | Optional TOTP for **staff** (tenant toggle in Settings → Security). Portal remains magic-link based. |
| **Analytics** | Tenant-level portal usage metrics. |

### Explicitly sensitive / later

- **Full clinical notes**, **mental health**, **reproductive** data — **release workflow** + **break-glass** audit if ever exposed.

**Note:** Phase numbers **3** and **6+** are reserved for future planning so the roadmap can insert rows without renumbering shipped phases.

---

## 7. Data model (conceptual)

### New tables (illustrative)

**`portal_users`** (implemented — **separate from** staff **`users`**)

- `id`, `tenant_id`, `patient_id`, `email`, `password_hash`, `status`, lockout fields, `last_login_at`, `created_at`, `updated_at` (no photo column — photos live on **`employees.profile_image_url`**)
- **Unique:** `(tenant_id, patient_id)` and `(tenant_id, email)` for one portal account per patient per tenant.

**`portal_sessions`** (if not using only server sessions)

- Align with existing session strategy (Redis/DB) — **do not** duplicate unless needed.

**`portal_messages`** (Phase 2)

- `id`, `tenant_id`, `patient_id`, `thread_id`, `sender_type` (`patient` | `staff`), `body`, `read_at`, `created_at`

**`portal_appointment_requests`**

- `id`, `tenant_id`, `patient_id`, `preferred_slot`, `status`, `linked_appointment_id` (nullable FK)

**`tenant_portal_settings`**

- `tenant_id` (PK), `enabled`, `features_json`, `privacy_policy_url`, `support_email`

### Linkage to existing tables

- **`patients`**, **`appointments`**, **`medical_visits`** — read/update via **dedicated** APIs with **portal** permission checks.

---

## 8. API surface (conceptual)

| Area | Examples |
|------|----------|
| **Auth** | `POST /api/portal/auth/login`, `logout`, `password/forgot`, `password/reset` |
| **Me** | `GET /api/portal/me` — patient + employee summary, `profileImageUrl`, tenant branding |
| **Personal profile** | `PUT /api/portal/employee-profile` — phone, DOB, emergency contacts; `POST/DELETE /api/portal/profile-photo` |
| **Health profile** | `PUT /api/portal/health-profile` — allergies, medications, history, disability, notes (partial patch) |
| **Work fitness & medications** | `GET/POST /api/portal/work-fitness`, `GET/PUT .../:id` — employee submits case with meds + side effects; staff assess in Employee wellbeing; see [EMPLOYEE_WORK_FITNESS_MEDICATIONS.md](./EMPLOYEE_WORK_FITNESS_MEDICATIONS.md) |
| **Vitals** | `GET/POST /api/portal/vital-signs` — clinic readings plus patient self-reported checks (`source: patient_self`) |
| **Appointments** | `GET /api/portal/appointments`, `POST /api/portal/appointment-requests`, confirm/decline/cancel |
| **Telehealth** | `GET /api/portal/telecare/sessions`, `GET .../sessions/:id`, `POST .../sessions/:id/join`, `POST .../sessions/:id/complete` |
| **Messages** | `GET/POST /api/portal/messages/...` (Phase 4) |
| **Documents** | `GET /api/portal/documents` (list only **released** docs) |

**All** routes:

- Require **portal** session (not staff).
- Filter by **`tenant_id`** and **`patient_id`** from the session.

---

## 9. Security, privacy, and compliance

### Principles

- **Minimum necessary** — only fields required for each feature.
- **Server-side enforcement** — never trust client-side filters; **staff** APIs remain separate from **portal** APIs.
- **Rate limiting** on login and message endpoints.
- **Audit log** — portal login, document downloads, message send.
- **Consent** — capture and store **terms** and **privacy** acceptance for the tenant.

### Threats

- **Account takeover** — MFA optional for Phase 2+; strong password policy.
- **IDOR** — every query must **bind** `patient_id` from session, never from URL alone.
- **Phishing** — branded emails and clear **official** domain guidance.

### Regulatory

- Align with **occupational health** and **local** privacy requirements; **not** a substitute for legal review.

---

## 10. UX and channels

- **Mobile-first** — many patients use phones.
- **Clear labeling** — “Patient portal” vs “Staff login” on marketing/auth pages.
- **Accessibility** — WCAG-oriented components (Shadcn already helps; verify contrast and focus).
- **Offline** — not required for MVP; optional **PWA** later.

---

## 11. Integration with existing HMS modules

| Module | Integration |
|--------|-------------|
| **Appointments** | Portal requests create **pending** records or **workflow** items for staff approval. Telehealth requests set `modality = telehealth`; confirmed visits provision LiveKit room + portal join URL. |
| **Telecare / encounters** | `telecare_sessions` linked to appointments; encounters may reference `telecare_session_id`. Portal join does not replace staff documentation in Medical Visit. |
| **Patients** | Patient id is the anchor; **updates** from portal may go to **non-clinical** fields only unless approved. |
| **Notifications** | Reuse [email/SMS](./20260307_RESEND_EMAIL_INTEGRATION.md) patterns where applicable. |
| **E-ticketing** ([E_TICKETING_STAFF_PLAN.md](./E_TICKETING_STAFF_PLAN.md)) | **Not** patient-facing; **optional** link “contact clinic” to staff queue only if product wants unified intake (usually **separate**). |

---

## 12. Implementation phases

| Phase | Focus |
|-------|--------|
| **Phase 1** | `portal_users` (separate from `users`), auth, sessions, tenant branding, appointments + requests, visit summaries, vitals list, admin provisioning, audit |
| **Phase 2** | Personal profile edits (photo, DOB, phone, emergency contacts); **health profile** edits via portal; vitals **read-only** |
| **Phase 3** | **Telehealth** — WebRTC (LiveKit) portal room, waiting room, staff queue, email deep links |
| **Phase 4** | Messaging, forms, document download with release workflow |
| **Phase 5** | Caregiver access, MFA, analytics |

---

## 13. Risks and open decisions

### Risks

- **Scope creep** into full patient chart — **mitigate** with strict phase gates.
- **Support burden** — password resets and lockouts; plan **admin** tools for staff to **unlink** or **reset** portal accounts.

### Open decisions

1. ~~**Same database `users` table** vs **dedicated `portal_users`**~~ — **Resolved:** dedicated **`portal_users`** table is in use (clearer security boundary vs staff `users`).
2. **Caregiver** access model (parent, guardian) — **legal** and **audit** requirements (Phase 5).
3. **Subdomain vs path** for tenant branding and SEO (path `/portal/*` is implemented; subdomain optional later).
4. **Which jurisdictions** require **explicit consent** for portal access to occupational health data.

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| 1.0.0 | 2026-04-01 | Initial planning document |
| 1.0.1 | 2026-04-02 | Phase 1 delivery notes; Settings tab and routing documented |
| 1.0.2 | 2026-04-02 | Phase 2 profile + read-only clinical + vitals; employee `profile_image_url`; roadmap phases renumbered (4/5) |
| 1.0.3 | 2026-04-02 | Employee `profile_image_url` as canonical photo (portal + staff views); drop `portal_users.avatar_url` |
| 1.0.4 | 2026-05-31 | Magic-link login; session timeouts; staff MFA (tenant toggle). See [SESSION_SECURITY_AND_MFA.md](./SESSION_SECURITY_AND_MFA.md) |
| 1.0.5 | 2026-06-13 | Phase 3 telehealth: WebRTC/LiveKit portal room UI, API, staff queue; see [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md) |
