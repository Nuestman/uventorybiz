# Vitals, Triage (SATS) & Medical Visit Redesign – Plan

**Status:** Plan approved; implementation pending  
**Scope:** New `vital_signs` and `triage` tables; multiple vitals per visit; vitals-only (monitoring) flow; South African Triage Scale (SATS) with required acuity, TEWS, and clinical discriminators; tabbed `/medical-visit` UI (Triage | Vitals only | Full visit).  
**Context:** Current medical visits store a single set of vitals in-column; editing overwrites them. No triage or vitals-only path exists.

---

## 1. Objectives & Constraints

- **Multiple vital sign sets:** Record several readings per encounter; editing or re-recording adds new rows instead of replacing.
- **Vitals-only encounters:** Support patients who present for monitoring only (no full medical visit).
- **Triage (SATS) as first point of contact:** Emergency/first-contact flow uses South African Triage Scale: physiology + symptoms → acuity. Triage records **must** include:
  - **Acuity** (red / orange / yellow / green).
  - **TEWS score** (Triage Early Warning Score).
  - **Clinical discriminators** (structured or free-text criteria used to assign acuity).
- **Single entry point for clinical forms:** `/medical-visit` becomes a **tabbed page**:
  - **Default tab:** Triage form (first point of call).
  - **Tab 2:** Vitals only (monitoring).
  - **Tab 3:** Full medical visit (existing flow, enhanced with multiple vitals).
- **Backward compatibility:** Existing `medical_visits` rows keep current vitals columns for display until backfilled; new logic uses `vital_signs` as source of truth. No drop of `medical_visits` vitals columns in phase 1 (optional cleanup later).

---

## 2. Data Model Overview

| Entity          | Purpose |
|-----------------|--------|
| `vital_signs`   | One row per vital-sign reading; can link to triage and/or medical visit, or stand alone (vitals-only). |
| `triage`        | One row per triage event; **requires** acuity, tews_score, clinical_discriminators; references optional `vital_signs_id` and optional `medical_visit_id` when patient is later seen. |
| `medical_visits` | Full clinical encounter; optional `triage_id`; vitals shown from `vital_signs` where `medical_visit_id = visit.id` (and optionally keep in-column snapshot for legacy). |

**Relations:**

- **vital_signs**
  - Standalone (vitals-only): `medical_visit_id` and `triage_id` null.
  - At triage: `triage_id` set when created from triage form; `medical_visit_id` null.
  - During/after full visit: `medical_visit_id` set; `triage_id` optional (e.g. if same reading used for triage).
- **triage**
  - References one optional `vital_signs_id` (vitals at triage).
  - Optional `medical_visit_id` when a full visit is created later for that patient/episode.
- **medical_visits**
  - Optional `triage_id` (FK to `triage.id`) when visit follows a triage episode.
  - Multiple vitals: query `vital_signs` where `medical_visit_id = visit.id` ordered by `recorded_at`.

---

## 3. Schema Changes (Database Level)

### 3.1 New table: `vital_signs`

**Goals:** Store every vital-sign reading as a separate row; support triage, full visit, and vitals-only.

**Columns:**

| Column                    | Type         | Nullable | Description |
|---------------------------|--------------|----------|-------------|
| `id`                      | varchar (PK)| No       | UUID. |
| `tenant_id`               | varchar (FK)| No       | Tenant. |
| `patient_id`              | varchar (FK)| No       | Patient. |
| `location_id`             | varchar (FK)| Yes      | Care location where taken. |
| `recorded_by`             | varchar (FK)| No       | User who recorded. |
| `recorded_at`             | timestamp   | No       | When vitals were taken. |
| `medical_visit_id`        | varchar (FK)| Yes      | Set when part of a full visit. |
| `triage_id`               | varchar (FK)| Yes      | Set when recorded at triage. |
| `blood_pressure_systolic` | integer     | Yes      | mmHg. |
| `blood_pressure_diastolic`| integer     | Yes      | mmHg. |
| `heart_rate`              | integer     | Yes      | bpm. |
| `temperature`             | varchar     | Yes      | e.g. Celsius. |
| `respiratory_rate`        | integer     | Yes      | /min. |
| `oxygen_saturation`       | integer     | Yes      | %. |
| `glucose_level`           | integer     | Yes      | mg/dL or mmol/L (configurable unit). |
| `pain_score`              | integer     | Yes      | 0–10. |
| `weight`                  | varchar     | Yes      | kg. |
| `height`                  | varchar     | Yes      | cm. |
| `notes`                   | text        | Yes      | Optional note for this reading. |
| `created_at`              | timestamp   | No       | Default now. |

**Constraints / indexes:**

- FK: `tenant_id` → `tenants`, `patient_id` → `patients`, `location_id` → `care_locations`, `recorded_by` → `users`, `medical_visit_id` → `medical_visits`, `triage_id` → `triage`.
- Indexes: `(tenant_id, patient_id, recorded_at)`, `(tenant_id, medical_visit_id)`, `(tenant_id, triage_id)` for list/detail queries.

**Business rules:**

- At least one of `medical_visit_id`, `triage_id` may be null (vitals-only = both null).
- If both are set, the reading was used at triage and also attached to a visit.

---

### 3.2 New table: `triage`

**Goals:** One triage event per patient encounter; SATS acuity, TEWS, and clinical discriminators **required**.

**Columns:**

| Column                    | Type         | Nullable | Description |
|---------------------------|--------------|----------|-------------|
| `id`                      | varchar (PK)| No       | UUID. |
| `tenant_id`               | varchar (FK)| No       | Tenant. |
| `patient_id`              | varchar (FK)| No       | Patient. |
| `location_id`             | varchar (FK)| Yes      | Care location (e.g. ED). |
| `recorded_by`             | varchar (FK)| No       | User who triaged. |
| `triage_at`               | timestamp   | No       | When triage was done. |
| `vital_signs_id`          | varchar (FK)| Yes      | Vitals at triage (optional but recommended). |
| `medical_visit_id`        | varchar (FK)| Yes      | Set when a full visit is created for this episode. |
| **`acuity`**              | **varchar**  | **No**   | **SATS acuity: `red`, `orange`, `yellow`, `green`.** |
| **`tews_score`**          | **integer**  | **No**   | **Triage Early Warning Score (numeric).** |
| **`clinical_discriminators`** | **text**  | **No**   | **Criteria used (e.g. list or JSON); required, may be empty string if no discriminators applied.** |
| `presenting_complaint`    | text        | Yes      | Chief complaint at triage. |
| `notes`                   | text        | Yes      | Free text. |
| `created_at`              | timestamp   | No       | Default now. |
| `updated_at`              | timestamp   | No       | Default now. |

**Constraints / indexes:**

- FK: `tenant_id` → `tenants`, `patient_id` → `patients`, `location_id` → `care_locations`, `recorded_by` → `users`, `vital_signs_id` → `vital_signs`, `medical_visit_id` → `medical_visits`.
- Unique: not required (multiple triage events per patient over time).
- Indexes: `(tenant_id, patient_id, triage_at)`, `(tenant_id, acuity)`, `(tenant_id, medical_visit_id)`.

**Business rules:**

- `acuity`, `tews_score`, and `clinical_discriminators` are **required** (NOT NULL). For `clinical_discriminators`, use empty string `''` only when no discriminators apply; UI should always collect/save this.
- Acuity enum in app: `red` | `orange` | `yellow` | `green`.

---

### 3.3 Changes to `medical_visits`

- **Add column:** `triage_id` varchar (nullable) FK → `triage.id`. Set when the visit is created from or linked to a prior triage episode.
- **Keep existing vitals columns** for now (no schema drop). Application behaviour:
  - **Read:** Prefer showing vitals from `vital_signs` where `medical_visit_id = visit.id` (timeline). For backward compatibility, if no `vital_signs` rows exist, fall back to in-column vitals on `medical_visits`.
  - **Write (new/update):** When user records vitals on a visit, **always** insert into `vital_signs` with `medical_visit_id` set. Optionally mirror “first reading” into `medical_visits` columns for legacy/display (or leave null and rely on `vital_signs` only).

---

## 4. SATS Implementation Details (Required Fields)

### 4.1 Acuity (required)

- **Values:** `red` | `orange` | `yellow` | `green`.
- **Storage:** `triage.acuity` varchar NOT NULL (or pgEnum).
- **UI:** Single select (e.g. radio or dropdown) with colour coding:
  - Red: Immediate care.
  - Orange: Very sick, short wait.
  - Yellow: Can wait longer (e.g. 2–4 hours).
  - Green: Minor problems.

### 4.2 TEWS score (required)

- **Definition:** Triage Early Warning Score – numeric score derived from vital signs and possibly other observations at triage (per SATS manual).
- **Storage:** `triage.tews_score` integer NOT NULL.
- **UI:** Numeric input; optionally **calculate** from vitals (e.g. HR, BP, RR, SpO2, consciousness) using SATS TEWS chart, with option to override. Validation: allow only valid range per SATS (e.g. 0–15 or as per manual).

### 4.3 Clinical discriminators (required)

- **Definition:** The clinical criteria (symptoms/signs) used to assign acuity (e.g. “chest pain”, “GCS &lt; 15”, “severe bleeding”). SATS uses a mix of physiological and symptom-based discriminators.
- **Storage:** `triage.clinical_discriminators` text NOT NULL. Format options:
  - **Option A:** JSON array of strings, e.g. `["chest_pain", "gcs_under_15"]` plus optional labels for display.
  - **Option B:** Plain text list (one per line or comma-separated).
  - **Recommendation:** JSON for structure and future reporting; UI can present multi-select or tag input, and save as JSON string. If none apply, store `"[]"` or a single value like `"none"` so the field is never null.
- **UI:** Multi-select or tag input from a predefined list (SATS discriminators) plus optional free text; always send a value (never leave null).

---

## 5. API Design

### 5.1 Vital signs

- **POST `/api/vital-signs`**  
  Body: patientId, locationId, recordedAt, medicalVisitId?, triageId?, plus all vital fields.  
  Auth + tenant + location injection as per existing patterns.  
  Returns created `vital_signs` row.

- **GET `/api/vital-signs`**  
  Query: `patientId`, `medicalVisitId`, `triageId`, `from`, `to` (optional filters).  
  Returns list of vital_signs (tenant-scoped).

- **GET `/api/vital-signs/:id`**  
  Returns one vital_signs row (tenant-scoped).

- **PATCH `/api/vital-signs/:id`** (optional)  
  Only for correcting mistaken entries; prefer add-new over edit for audit.

### 5.2 Triage

- **POST `/api/triage`**  
  Body: patientId, locationId, triageAt, vitalSignsId?, presentingComplaint?, acuity, tews_score, clinical_discriminators, notes.  
  `acuity`, `tews_score`, `clinical_discriminators` required.  
  Returns created `triage` row.

- **GET `/api/triage`**  
  Query: `patientId`, `locationId`, `acuity`, `from`, `to`.  
  Returns list (tenant-scoped).

- **GET `/api/triage/:id`**  
  Returns one triage row (tenant-scoped).

- **PATCH `/api/triage/:id`**  
  Update (e.g. add `medical_visit_id` when visit is created, or correct acuity/discriminators).

### 5.3 Medical visits (changes)

- **POST `/api/medical-visits`**  
  Allow optional `triageId` in body; when creating a visit after triage, set `medical_visits.triage_id`.  
  Vitals: accept vitals in body for “first reading”; server creates a `vital_signs` row with `medical_visit_id` and optionally mirrors to `medical_visits` columns.

- **GET `/api/medical-visits/:id`**  
  Include in response: `vitalSigns` array (from `vital_signs` where `medical_visit_id = id` ordered by `recorded_at`) and optional `triage` (if `triage_id` set).

- **PUT `/api/medical-visits/:id`**  
  For “add vitals” flow: accept new vitals in body and insert as new `vital_signs` row(s); do not overwrite existing vitals. Other visit fields update as today.

---

## 6. UI: Tabbed `/medical-visit` Page

### 6.1 Layout

- **Single route:** `/medical-visit` (or `/medical-visit?tab=triage|vitals|visit`).
- **Tabs (horizontal, clearly labeled):**
  1. **Triage** (default when opening the page).
  2. **Vitals only** (monitoring).
  3. **Full medical visit** (current form, enhanced).

- **Shared above tabs:** Patient selector (search/select) and, if applicable, care location (from session/location injection). Selected patient and location apply to the active tab’s form.

### 6.2 Tab 1: Triage (default)

- **Purpose:** First point of contact; record SATS triage.
- **Fields:**
  - Patient (required), location (from session/default).
  - Triage date/time (default now).
  - **Vitals at triage:** Either embed a vitals sub-form (same fields as vital_signs) or “Record vitals” button that opens inline/same-page form; on save, create `vital_signs` row with `triage_id` set when triage is saved (or create vitals first then triage with `vital_signs_id`).
  - **Presenting complaint** (optional).
  - **Acuity** (required): Red / Orange / Yellow / Green (colour-coded).
  - **TEWS score** (required): Number input; optionally calculated from vitals with override.
  - **Clinical discriminators** (required): Multi-select or tags from SATS list + optional free text; store as JSON or structured text; never submit empty (use `[]` or `"none"`).
  - **Notes** (optional).
- **Submit:** POST triage (and POST vital_signs if vitals captured). Success: toast and optionally “Open full visit” to switch to Full visit tab with triage/patient pre-filled.

### 6.3 Tab 2: Vitals only (monitoring)

- **Purpose:** Record one or more vital sign sets without triage or full visit.
- **Fields:**
  - Patient (required), location (from session).
  - Recorded at (default now).
  - All vital sign fields (BP, HR, temp, RR, SpO2, glucose, pain, weight, height, notes).
- **Submit:** POST `/api/vital-signs` with `medical_visit_id` and `triage_id` both null.
- **Optional:** “Add another set” to capture multiple readings in one go (multiple POSTs or one batch endpoint).

### 6.4 Tab 3: Full medical visit

- **Purpose:** Current medical visit flow with full examination, treatment, disposition; **multiple vitals** supported.
- **Behaviour:**
  - **Optional pre-fill from triage:** If user came from “Open full visit” after triage, pass `triageId` (and patientId); load triage and vitals at triage for display; create visit with `triage_id` set.
  - **Vitals:** “Record vitals” adds a new set (POST vital_signs with `medical_visit_id` after visit is created, or on create send vitals and server creates visit then vital_signs). Show **timeline of vitals** for this visit (from `vital_signs` where `medical_visit_id = id`); no “edit vitals” that overwrites – only “Add another set”.
  - Rest of form: chief complaint, HPI, physical exam, assessment, treatment, medications, procedures, disposition (including hospital transfer + facility fields), **ambulance used** when disposition is a hospital transfer, follow-up, etc., as today. Items used/dispensed unchanged. See **`docs/MEDICAL_VISIT_FIXES.md`** (hospital transfer & ambulance) and **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** §4.5 for reporting semantics.
- **Submit:** POST `/api/medical-visits` (with optional triageId and optional initial vitals); subsequent “Add vitals” → POST `/api/vital-signs` with `medical_visit_id`.

### 6.5 Navigation and state

- **URL:** Use query param `tab=triage|vitals|visit` so default is `triage`; deep link and refresh keep tab.
- **Patient:** Selecting patient in one tab keeps selection when switching tabs (shared state or URL param).
- **After submit:** Success message; stay on same tab or redirect as designed (e.g. Triage → “Open full visit” switches to Full visit tab with triage id passed).

---

## 7. Migration & Backfill

### 7.1 Migrations (order)

1. **Create `triage` table** (without `vital_signs_id` column initially to avoid circular dependency).
2. **Create `vital_signs` table** (with nullable `triage_id` FK to `triage`).
3. **Add `triage.vital_signs_id`** (nullable FK to `vital_signs`) via ALTER.
4. **Add `medical_visits.triage_id`** (nullable FK to `triage`).
5. **Backfill (optional):** For each existing `medical_visits` row that has at least one non-null vital field, insert one `vital_signs` row with same values and `medical_visit_id` set; leave `medical_visits` columns as-is for now.

### 7.2 Backfill script (optional)

- Select from `medical_visits` where any of (blood_pressure_systolic, heart_rate, temperature, …) is not null.
- For each: INSERT INTO `vital_signs` (tenant_id, patient_id, location_id, recorded_by, recorded_at, medical_visit_id, …) using visit’s vitals and visit_date, medical_staff_id.
- No updates to `medical_visits` vitals columns in phase 1 (keep for fallback display).

---

## 8. Implementation Order

1. **Schema & migrations**
   - Add `triage` table (acuity, tews_score, clinical_discriminators NOT NULL); then `vital_signs` table with `triage_id` FK; then `triage.vital_signs_id` FK; then `medical_visits.triage_id`.
   - Optional backfill script for existing visits (vital_signs from current medical_visits vitals).

2. **Shared schema (Drizzle)**
   - Define `vital_signs`, `triage` in `shared/schema.ts`; relations; insert/update schemas (Zod) with validation for required triage fields.

3. **Storage & routes**
   - CRUD for `vital_signs` and `triage` (tenant-scoped, auth).
   - Extend medical-visit create/update to accept `triageId` and to create/read `vital_signs` for a visit.
   - GET medical visit by id: include `vitalSigns` (and `triage` if `triage_id` set).

4. **SATS reference data (optional but recommended)**
   - Predefined list of clinical discriminators (and optionally TEWS calculation rules) in config or DB for UI dropdown/tags.

5. **UI – Tabbed page**
   - Refactor `/medical-visit` into tabbed layout (Triage | Vitals only | Full visit); default tab = Triage; URL `?tab=...`.
   - Shared patient (and location) selector.

6. **UI – Triage tab**
   - Triage form: patient, date/time, vitals at triage (inline or linked), presenting complaint, **acuity**, **tews_score**, **clinical_discriminators**, notes.
   - Submit → POST triage (+ vitals if applicable). Option “Open full visit” with triage id.

7. **UI – Vitals-only tab**
   - Form: patient, recorded at, all vital fields.
   - Submit → POST `/api/vital-signs` (no visit, no triage).

8. **UI – Full visit tab**
   - Current visit form; add optional triage pre-fill (triageId param); “Record vitals” adds `vital_signs` rows and show timeline; no overwrite of previous vitals.

9. **Records / Patient detail**
   - Where medical visits are listed or shown, optionally show triage info (e.g. acuity badge) and link to triage record; show vitals timeline from `vital_signs` for each visit.

10. **Testing & docs**
    - Update IMPLEMENTATION_STATUS and CHANGELOG; manual test of all three tabs and triage → visit flow.

---

## 9. Success Criteria

- Multiple vital sign sets per visit stored in `vital_signs`; no overwrite on “edit” (add only).
- Vitals-only encounters possible via Vitals-only tab (no triage, no visit).
- Triage form always collects and saves acuity, tews_score, and clinical_discriminators (all required).
- `/medical-visit` is tabbed with Triage as default; Vitals only and Full visit tabs work with shared patient/location.
- Full visit can be linked to a prior triage (`triage_id` on visit); vitals at triage and during visit both visible where appropriate.
- Existing visits continue to display (vitals from columns or from backfilled `vital_signs`).

---

## 10. References

- SATS: South African Triage Scale (EMSSA); four acuity levels (red/orange/yellow/green); TEWS as component.
- Triage Early Warning Score (TEWS): Used at triage to support acuity assignment.
- Clinical discriminators: Symptom/sign criteria that drive SATS acuity (to be stored as required field).
