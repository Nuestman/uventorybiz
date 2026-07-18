# Portal Health/Symptoms Tracker — Plan

**Version:** 1.1.0  
**Status:** Implemented (Phases 1–3 + OPQRST, multi-select, offline)  
**Last Updated:** July 6, 2026  
**Related docs:** [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md), [VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md](./VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md), [PORTAL_STYLES.md](./PORTAL_STYLES.md), [NOTIFICATION_SYSTEM_IMPLEMENTATION.md](./NOTIFICATION_SYSTEM_IMPLEMENTATION.md), [OFFLINE_MODE_AND_SYNC.md](./OFFLINE_MODE_AND_SYNC.md)

---

## Table of Contents

1. [Executive overview](#1-executive-overview)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Relationship to vitals and encounters](#3-relationship-to-vitals-and-encounters)
4. [Data model](#4-data-model)
5. [API surface](#5-api-surface)
6. [Feature flag and routing](#6-feature-flag-and-routing)
7. [Portal UX](#7-portal-ux)
8. [Staff UX](#8-staff-ux)
9. [Security and privacy](#9-security-and-privacy)
10. [Notifications (Phase 3)](#10-notifications-phase-3)
11. [Offline support](#11-offline-support)
12. [Implementation phases](#12-implementation-phases)
13. [Risks and open decisions](#13-risks-and-open-decisions)
14. [Related files](#14-related-files)

---

## 1. Executive overview

### Purpose

Deliver a **patient-portal symptom diary** at `/portal/symptoms` so employees can log subjective health complaints over time using the **OPQRST** clinical mnemonic. Clinic staff view entries **read-only** on the patient record. Severe or high-risk symptoms can trigger **staff notifications** (Phase 3).

### Context

MineAid already supports:

- **Portal vitals self-logging** — `vital_signs` with `source = patient_self` ([`PortalVitalsPage.tsx`](../client/src/portal/PortalVitalsPage.tsx))
- **Unstructured symptoms** on encounters/triage — `chiefComplaint`, `presentingComplaint`, `sample_history.S`

This feature adds a **time-series symptom log** separate from vitals and encounter presentation text.

### Architecture

```
Patient portal (/portal/symptoms)
    → POST/GET /api/portal/symptom-logs
    → symptom_log_entries + symptom_types
    → offlineSymptoms.ts (IndexedDB cache + outbox)

Staff HMS (PatientDetails)
    → GET /api/patients/:id/symptom-logs (read-only)

Severe symptom (Phase 3)
    → notifySymptomLogged → notificationService → EmailService
```

---

## 2. Goals and non-goals

### Goals

- Separate **symptom diary** from vitals (objective vs subjective)
- **OPQRST-structured** self-report aligned with clinical handover
- **Multi-select** symptom logging (one DB row per symptom, shared OPQRST context)
- Tenant-scoped, patient-scoped rows with audit timestamps
- Feature-gated nav (`features.symptoms`)
- Staff read-only visibility
- **Offline-first** portal logging with outbox sync on reconnect
- Reuse portal UI primitives (`PortalPageHeader`, modals, empty/loading states)
- Data-driven symptom catalog (`symptom_types` table)
- Optional staff alerts for severe/high-risk logs

### Non-goals

- Replacing triage or encounter symptom capture
- Clinical diagnosis or acuity assignment from portal logs
- Staff editing patient symptom entries
- SMS/push in initial release

---

## 3. Relationship to vitals and encounters

| Concern | Vitals (`/portal/vitals`) | Symptoms (`/portal/symptoms`) |
|---------|----------------------------|-------------------------------|
| Purpose | Objective measurements | Subjective complaints (OPQRST) |
| Table | `vital_signs` | `symptom_log_entries` |
| Pain | `pain_score` 0–10 on vitals row | Catalog items + 1–5 severity + region |
| Staff view | Vitals trends on PatientDetails | Patient-reported symptoms section |
| Offline | Staff sync queue (separate) | Dedicated portal outbox |

Encounter/triage text fields remain the **clinical record of presentation**; portal logs are **longitudinal self-report** shared with the care team.

---

## 4. Data model

### `symptom_types`

Data-driven catalog. `tenant_id = NULL` = system default; tenant rows override by `code`.

| Column | Description |
|--------|-------------|
| `code` | Stable key, e.g. `headache`, `chest_pain`, `other` |
| `label` | Display name |
| `category` | `general`, `respiratory`, `musculoskeletal`, `gi`, etc. |
| `sort_order`, `is_active` | UI ordering and soft disable |

**Seeded system types:** headache, fatigue, nausea_vomiting, dizziness, chest_pain, shortness_of_breath, cough, abdominal_pain, muscle_joint_pain, fever_chills, skin_rash, eye_irritation, hearing_changes, other.

### `symptom_log_entries`

| Column | OPQRST / role |
|--------|----------------|
| `patient_id`, `portal_user_id` | Patient scope; portal user for self-reported |
| `symptom_type_id` | FK to catalog (one row per logged symptom) |
| `recorded_at` | **O** — Onset |
| `provocation`, `palliation` | **P** — What makes it worse / better |
| `symptom_quality` | **Q** — Quality (sharp, dull, burning, etc.) |
| `body_location`, `radiation` | **R** — Region and spread |
| `severity` | **S** — 1–5 (mild → severe) |
| `duration_minutes` | **T** — How long it has lasted |
| `notes` | Optional extra detail; for `other`, stores **custom symptom name** (displayed as label) |
| `source` | `patient_self` |

### Migrations (legacy SQL — existing DBs)

```bash
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_01_portal_symptom_logs.sql
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_02_symptom_alert_notification_type.sql
npm run db:migrate -- migrations/_archive/legacy_upgrades/20260705_03_symptom_log_opqrst.sql
```

| File | Purpose |
|------|---------|
| `20260705_01_portal_symptom_logs.sql` | Tables + system catalog seed |
| `20260705_02_symptom_alert_notification_type.sql` | `symptom_alert` notification type |
| `20260705_03_symptom_log_opqrst.sql` | `symptom_quality`, `provocation`, `palliation`, `radiation` columns |

---

## 5. API surface

### Portal (`requirePortalAuth`, `features.symptoms`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/portal/symptom-types` | Active catalog (system + tenant) |
| GET | `/api/portal/symptom-logs` | List entries (`from`, `to`, `symptomTypeId`, `limit`) |
| POST | `/api/portal/symptom-logs` | Create entry (call once per symptom when multi-select) |
| PATCH | `/api/portal/symptom-logs/:id` | Edit own entry within 24h |
| DELETE | `/api/portal/symptom-logs/:id` | Delete own entry within 24h |

**Create/update body** includes OPQRST fields: `recordedAt`, `severity`, `bodyLocation`, `radiation`, `durationMinutes`, `symptomQuality`, `provocation`, `palliation`, `notes`.

### Staff (`requireClinicalAccess`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/patients/:id/symptom-logs` | Read-only list (OPQRST fields included) |

### Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/symptom-types` | Tenant catalog (system + tenant rows) |
| POST | `/api/admin/symptom-types` | Add tenant-specific type |
| PATCH | `/api/admin/symptom-types/:id` | Update tenant type |

---

## 6. Feature flag and routing

- **Flag:** `features.symptoms` (default **on** via opt-out merge)
- **Routes:** `/portal/symptoms`, detail `/portal/symptoms/:code`
- **Nav:** "Symptoms" with `Stethoscope` icon
- **Settings:** Staff **Settings → Patient portal → Portal features → Symptoms**; **Settings → Symptom types** for catalog admin

---

## 7. Portal UX

### Info section (`PortalSymptomsInfoSection`)

Shown at the top of the symptoms page:

- Explains OPQRST and that logs are shared with the care team
- Emergency disclaimer (not for urgent care)
- Quick reference grid for O/P/Q/R/S/T

### Main page (`PortalSymptomsPage`)

- Header with **Log symptom** action
- OPQRST info section
- Summary strip: counts in last 7 days by severity band
- Time filter: 7d / 30d / all
- Cards: newest first (`PortalSymptomLogCard` with OPQRST detail lines)
- Edit/delete on own entries within 24h
- Offline-first data fetch via `fetchPortalSymptomLogsOfflineFirst`

### Log modal (`PortalLogSymptomModal`)

- **Multi-select** symptom types (`PortalSymptomTypeMultiSelect`) — checkbox grid by category
- **Other** — required custom symptom name field
- **OPQRST sections** (labeled O–T):
  - Onset (datetime-local)
  - Provocation / palliation (text)
  - Quality (presets + free text)
  - Region + radiation (text)
  - Severity 1–5
  - Time / duration presets
- Optional additional notes (catalog symptoms only)
- Create: one API/offline row per selected symptom with shared OPQRST payload
- Edit: single entry; symptom type locked

### Detail page

`/portal/symptoms/:code` — frequency chart and history for one symptom type.

### Dashboard

Quick-access card on portal home when feature enabled.

---

## 8. Staff UX

**PatientDetails** — section below vitals trends:

- Title: **Patient-reported symptoms**
- Badge: **Self-reported**
- Table: date/time, symptom, severity, region, quality, OPQRST/notes summary
- Default filter: last 30 days
- No edit/delete

**Other** entries display the patient-entered name via `resolveSymptomDisplayLabel` in `shared/symptomCatalog.ts`.

---

## 9. Security and privacy

- All queries scoped by `tenant_id` + `patient_id`
- Portal writes limited to session patient
- UUID validation on path params
- Portal audit log action: `symptom_log_recorded`
- No PHI in notification email subject beyond symptom label and severity band

---

## 10. Notifications (Phase 3)

**Type:** `symptom_alert` (seeded in `notification_types`)

**Trigger:** After portal POST when:

- `severity >= 4`, or
- symptom code is `chest_pain` or `shortness_of_breath`

**Flow:** `portal.routes` → `notifySymptomLogged` → `createAndSendNotifications` → EmailService

Recipients resolved from `user_notification_preferences` (not hardcoded). Non-blocking (fire-and-forget).

---

## 11. Offline support

Portal symptoms use a **dedicated portal outbox** (portal cookie auth), not the staff `syncClient` queue.

| Component | Role |
|-----------|------|
| `offlineStore` v4 | `portalSymptomTypes`, `portalSymptomLogs`, `portalSymptomOutbox` |
| `offlineSymptoms.ts` | Offline-first fetch; create/update/delete; `syncPortalSymptomOutbox` |
| `App.tsx` | Calls `syncPortalSymptomOutbox` on reconnect (with messaging sync) |
| UI | `pendingSync` badge on log cards; offline save toast copy |

See [OFFLINE_MODE_AND_SYNC.md](./OFFLINE_MODE_AND_SYNC.md).

---

## 12. Implementation phases

### Phase 1 — MVP

- [x] Tables, migration, Drizzle schema, storage
- [x] Portal + staff read APIs
- [x] Feature flag, nav, routing
- [x] `PortalSymptomsPage`, log modal
- [x] PatientDetails read-only section

### Phase 2 — Enhancements

- [x] Per-symptom detail/trend page
- [x] Dashboard home card
- [x] Admin symptom type management in Settings
- [x] 24h patient edit/delete window

### Phase 3 — Alerts

- [x] `symptom_alert` notification type
- [x] `notifySymptomLogged` trigger on severe logs
- [x] Email template

### Phase 4 — OPQRST, multi-select, offline (4.35.0)

- [x] OPQRST columns + migration `20260705_03`
- [x] Multi-select symptom logging
- [x] Info section + OPQRST-labeled modal
- [x] Custom label for **Other** (`shared/symptomCatalog.ts`)
- [x] Portal offline cache + outbox sync
- [x] Connectivity banner layout for staff/portal headers

**Future (not in scope):**

- Pre-fill triage `presenting_complaint` from recent logs (staff action)
- FHIR Observation mapping
- Batch POST API for multi-symptom create (client loops today)

---

## 13. Risks and open decisions

| Decision | Resolution |
|----------|------------|
| Default feature toggle | **On** (opt-out) |
| Patient edit/delete | **Yes**, within 24h of `created_at` |
| Severity scale | **1–5** for symptoms; vitals pain remains 0–10 |
| Multi-select | **One row per symptom**; shared OPQRST payload per submission |
| Other symptom name | Stored in `notes`; displayed via `resolveSymptomDisplayLabel` |
| Offline sync | **Portal outbox** (`offlineSymptoms.ts`); staff sync queue unchanged |
| Nav item count on mobile | Symptoms appears when feature enabled; bottom nav shows first 5 enabled items |

---

## 14. Related files

| Area | Path |
|------|------|
| Migrations | `migrations/_archive/legacy_upgrades/20260705_01_portal_symptom_logs.sql`, `20260705_02_symptom_alert_notification_type.sql`, `20260705_03_symptom_log_opqrst.sql` |
| Schema | `shared/schema.ts` |
| Display label helper | `shared/symptomCatalog.ts` |
| Portal service | `server/modules/portal/portal-symptom-logs.service.ts` |
| Portal schemas | `server/modules/portal/portal-symptom-logs.schemas.ts` |
| Portal routes | `server/modules/portal/portal.routes.ts` |
| Staff routes | `server/modules/patients/patients.routes.ts` |
| Admin routes | `server/modules/admin/admin.routes.ts` |
| Triggers | `server/notificationTriggers.ts` |
| Offline | `client/src/lib/offlineSymptoms.ts`, `client/src/lib/offlineStore.ts` |
| Portal page | `client/src/portal/PortalSymptomsPage.tsx` |
| Portal detail | `client/src/portal/PortalSymptomDetailPage.tsx` |
| Info section | `client/src/portal/components/PortalSymptomsInfoSection.tsx` |
| Multi-select | `client/src/portal/components/PortalSymptomTypeMultiSelect.tsx` |
| Log modal | `client/src/portal/components/PortalLogSymptomModal.tsx` |
| Log card | `client/src/portal/components/PortalSymptomLogCard.tsx` |
| Helpers | `client/src/lib/symptoms/symptomCatalog.ts` |
| Staff UI | `client/src/pages/PatientDetails.tsx` |
| Admin catalog UI | `client/src/pages/settings/SettingsSymptomTypesSection.tsx` |
