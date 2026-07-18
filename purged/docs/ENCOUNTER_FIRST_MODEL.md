# Encounter-First Clinical Model

**Version:** 1.0.0  
**Status:** Superseded for implementation by [ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md](./ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md)  
**Last updated:** June 12, 2026 (v1 preserved for comparison)  
**Related:** [ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md](./ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md), [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md), [VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md](./VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md)

---

## 1. Principle

**One encounter = one case.** Every patient presentation opens an encounter shell first. Triage, vitals, clinical documentation, procedures, and inventory issues attach to that encounter. **Discharge** (`status = finished`) closes the episode; the next presentation requires a **new encounter**.

This replaces the previous pattern where triage, vitals-only, and full visit could be saved as independent records without a shared episode container — causing ambiguous case counts and orphan data.

---

## 2. Layers

```
ARRIVAL
  └─ POST /api/encounters/open     → encounters row (status: arrived)
       ├─ POST /api/triage         → triage (+ vitals at triage) [encounterId required]
       ├─ POST /api/vital-signs    → vital_signs [encounterId required]
       ├─ PUT  /api/encounters/:id → clinical documentation (HPI, exam, plan, …)
       └─ POST /api/encounters/:id/discharge → status: finished + disposition
```

| Layer | Table / API | Role |
|-------|-------------|------|
| Episode shell | `encounters` | Pathway, modality, visit type, lifecycle status |
| Triage | `triage` | SATS events (re-triage allowed while waiting) |
| Observations | `vital_signs` | All measured vitals |
| Documentation | `encounters` columns + future note modules | Subjective, exam, assessment, plan |
| Outcome | `encounters.disposition` | Set only at discharge |

---

## 3. Visit types and pathways (v1)

Staff selected **visit type** at open; the system resolved a **pathway** (workflow template).

| Visit type | Default pathway | Typical use |
|------------|-----------------|-------------|
| `monitoring` | `vitals_monitoring` | Observations only — no SATS |
| `procedure` | `procedure` | Procedural care |
| `clinical` | `routine_clinic` | Full visit |
| `injury` / `illness` | `acute_onsite` | Acute presentation |
| `emergency` | `emergency` | High acuity |
| `pre_employment` / `annual` | Screening pathways | OH assessments |
| `follow_up` | `telehealth_follow_up` (if telehealth) | Remote follow-up |

Pathway definitions lived in `shared/encounterPathways.ts` (pathway matrix drove which tabs/steps appeared).

> **v2 note:** Pathway is no longer shown in UI. See [V2 addendum](./ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md).

---

## 4. Triage and re-triage

The **same-day triage gate was removed** in v1. Patients could be triaged and **re-triaged** while waiting. Each triage event links to the **active encounter** via `triage.encounter_id`.

> **v2 note:** Triage is gated by per-encounter `triage_required` instead of pathway.

---

## 5. Lifecycle states (v1)

| Status | Meaning |
|--------|---------|
| `planned` | Scheduled (e.g. from appointment) |
| `arrived` | Opened at post |
| `triaged` | At least one triage recorded |
| `in_progress` | Vitals and/or documentation in progress |
| `finished` | Discharged — read-only |
| `cancelled` | Aborted episode |

---

## 6. API reference (v1 phase)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/encounters/open` | Open encounter at arrival |
| `GET` | `/api/encounters/active?patientId=` | Current open encounter |
| `GET` | `/api/encounters/:id` | Encounter + triage + vitals |
| `PUT` | `/api/encounters/:id` | Update clinical fields (while open) |
| `POST` | `/api/encounters/:id/discharge` | Close encounter with disposition |
| `POST` | `/api/encounters/:id/cancel` | Cancel open encounter |
| `POST` | `/api/triage` | New triage (requires `encounterId`) |
| `POST` | `/api/vital-signs` | New vitals row (requires `encounterId`) |

---

## 7. Schema (v1)

Migration: `migrations/20260612_01_encounter_first_model.sql` (formerly dated 20260609)

- `triage.encounter_id` → `encounters.id`
- `vital_signs.encounter_id` → `encounters.id`
- Nullable `chief_complaint` and `disposition` until documentation / discharge

---

## 8. Staff UI (v1)

Route: `/medical-visit`

1. Select patient  
2. **Start encounter** — visit type + modality  
3. Pathway-driven steps (triage / vitals / clinical / discharge)  
4. **Discharge** ends the encounter  

> **v2 note:** Primary route is `/encounter`; see addendum.

---

## 9. Reporting (v1)

Case counts: `SELECT visit_type, pathway, modality, COUNT(*) FROM encounters WHERE status = 'finished' …`

No double-counting: triage and vitals are child rows, not separate cases.
