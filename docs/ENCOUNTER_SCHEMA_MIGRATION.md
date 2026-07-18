# Encounter Schema Migration (Staging)

**Version:** 1.0.0  
**Date:** June 8, 2026  
**Migration file:** `migrations/20260608_01_encounter_lifecycle_foundation.sql`  
**Parent doc:** [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md), [ENCOUNTER_FIRST_MODEL.md](./ENCOUNTER_FIRST_MODEL.md)

---

## Encounter-first model (June 12, 2026)

**Migration files:**

1. `migrations/20260612_01_encounter_first_model.sql` (formerly `20260609_*`)
2. `migrations/20260612_02_encounter_model_v2.sql` (formerly `20260610_*`)

See [ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md](./ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md) for v2 enum and UI changes.

Apply after the lifecycle foundation migration:

```powershell
npm run db:sql-migrate -- migrations/20260612_01_encounter_first_model.sql
npm run db:sql-migrate -- migrations/20260612_02_encounter_model_v2.sql
```

Changes:

- `triage.encounter_id` and `vital_signs.encounter_id` FK → `encounters.id`
- Backfill from legacy `medical_visit_id`
- `encounters.chief_complaint` and `encounters.disposition` nullable until documentation / discharge

---

## Purpose

Introduce the encounter-centric model for in-person and telecare workflows without preserving legacy staging data constraints.

## Changes

### 1. Rename `medical_visits` → `encounters`

PostgreSQL automatically updates FK constraints that reference the old table name.

### 2. New columns on `encounters`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `modality` | VARCHAR | `in_person` | in_person, telehealth, phone |
| `pathway` | VARCHAR | `routine_clinic` | See `shared/encounterPathways.ts` |
| `appointment_id` | VARCHAR FK | NULL | → appointments |
| `telecare_session_id` | VARCHAR FK | NULL | → telecare_sessions |
| `patient_location_note` | TEXT | NULL | Remote site / camp for telehealth |

Existing columns (`visit_type`, vitals, disposition, triage_id, etc.) are retained for backward-compatible UI during Phase 3 refactor.

### 3. New table `telecare_sessions`

Session lifecycle for video (and future phone bridge) visits.

### 4. New table `resource_identifiers`

FHIR-ready identifier registry per tenant/resource.

### 5. Extend `appointments`

| Column | Notes |
|--------|-------|
| `modality` | in_person \| telehealth \| phone |
| `encounter_id` | Set when encounter opened |
| `telecare_session_id` | Set for telehealth appointments |

### 6. Extend `portal_appointment_requests`

| Column | Notes |
|--------|-------|
| `preferred_modality` | Patient choice: in_person or telehealth |

### 7. Backfill rules (staging)

```sql
UPDATE encounters SET modality = 'in_person', pathway = 'routine_clinic' WHERE modality IS NULL;
UPDATE appointments SET modality = 'in_person' WHERE modality IS NULL;
UPDATE portal_appointment_requests SET preferred_modality = 'in_person' WHERE preferred_modality IS NULL;
```

Map existing `visit_type = 'follow_up'` rows to `pathway = 'telehealth_follow_up'` only when modality is telehealth (future); default in-person follow-ups stay `routine_clinic`.

## Application compatibility

- Drizzle: `encounters` table; `medicalVisits` and `medicalRecords` are TS aliases.
- API: `/api/medical-visits` unchanged; `/api/encounters` and `/api/telecare/sessions` added.
- Reports: SQL references `medical_visits` must be updated to `encounters` when migration is applied.

## Rollback (staging only)

Rename `encounters` back to `medical_visits` and drop new tables if needed. Do not run rollback in production after go-live.

## Apply

**Option A — Neon SQL Editor (recommended if `psql` is not installed):** paste and run `migrations/20260608_01_encounter_lifecycle_foundation.sql` in the Neon console.

**Option B — Node script (legacy upgrade path; fresh DBs use `db:drizzle-migrate`):**

```powershell
npm run db:sql-migrate -- migrations/20260608_01_encounter_lifecycle_foundation.sql
```

**Option C — Drizzle journal (preferred for new structure changes):**

```powershell
# edit shared/schema.ts → npm run db:generate → npm run db:drizzle-migrate
```

> **Do not use `db:push`** on legacy or partial databases — interactive rename prompts and no migration history. See **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)**.

Note: This repo uses `npm run db:drizzle-migrate` (`drizzle-kit migrate`) for tracked schema. `db:push` is for quick local experiments only.
