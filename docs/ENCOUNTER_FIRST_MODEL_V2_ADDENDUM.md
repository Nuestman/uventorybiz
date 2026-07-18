# Encounter-First Clinical Model — V2 Addendum

**Version:** 2.0.0  
**Status:** Implemented  
**Last updated:** June 12, 2026  
**Supersedes (UI & enums):** portions of [ENCOUNTER_FIRST_MODEL.md](./ENCOUNTER_FIRST_MODEL.md) (v1) and pathway matrix in [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md)  
**Related:** [ENCOUNTER_FIRST_MODEL.md](./ENCOUNTER_FIRST_MODEL.md), [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md)

> This addendum documents **v2 changes** on top of the v1 encounter-first model. Keep v1 for historical comparison; implement against this addendum for current behaviour.

---

## What changed from v1

| Area | v1 | v2 |
|------|----|----|
| **Pathway UI** | Staff saw pathway derived from visit type | Pathway is internal DB slug only; UI uses **encounter type** + **`triageRequired`** |
| **Triage gating** | Pathway matrix decided SATS vs vitals-only | Per-encounter **`triage_required`** boolean (staff override) |
| **Visit / encounter types** | Many legacy types (`routine`, `illness`, `emergency`, …) | Six canonical types: `monitoring`, `procedure`, `clinical`, `injury`, `screening`, `follow_up` |
| **Statuses** | Mixed (`open`, `completed`, `closed`) | FHIR-aligned: `planned`, `arrived`, `triaged`, `in_progress`, `finished`, `cancelled`, `entered_in_error` |
| **Monitoring discharge** | `observation_complete` disposition | Same disposition list as clinical (RTW, transfer, etc.) |
| **Timestamps** | `visit_date`, `disposition_date_time` only | `arrived_at`, `finished_at`, `cancelled_at` for analytics |
| **Edit encounter** | N/A | `PATCH /api/encounters/:id/header` — type, modality, `triageRequired` |
| **Legacy data** | Migration preserved old values | Experimental DB — normalise/drop legacy enums in place |

---

## 1. Principle (unchanged)

**One encounter = one case.** Open shell → attach triage/vitals/clinical data → discharge closes episode.

---

## 2. Layers (v2 API)

```
ARRIVAL
  └─ POST /api/encounters/open     → encounters row (status: arrived, arrived_at)
       ├─ POST /api/triage         → triage (+ vitals at triage) [encounterId required]
       ├─ POST /api/vital-signs    → vital_signs [encounterId required]
       ├─ PUT  /api/encounters/:id → clinical documentation (HPI, exam, plan, …)
       ├─ PATCH /api/encounters/:id/header → edit type / modality / triageRequired
       └─ POST /api/encounters/:id/discharge → status: finished + disposition + finished_at
```

---

## 3. Encounter types

| Type | Typical use | Default triage (in person) | Clinical tab |
|------|-------------|------------------------------|--------------|
| `monitoring` | Vitals / observations | No | No |
| `procedure` | Procedural care | No | Yes |
| `clinical` | Illness or general presentation | Yes | Yes |
| `injury` | Work-related / acute injury | Yes | Yes |
| `screening` | Pre-employment, annual OH | No | Yes |
| `follow_up` | Remote or in-person follow-up | No | Yes |

Definitions: `shared/encounterPathways.ts` → `ENCOUNTER_TYPE_DEFINITIONS`.

**Modality:** `in_person` | `telehealth` | `phone`

---

## 4. Triage — optional per encounter

- `triage_required` on the encounter (default from type + modality; staff override at open/edit).
- Same-day triage gate **removed** — triage/vitals are independent after encounter exists.
- In-person clinical/injury typically default to triage required; telehealth may not.

---

## 5. Dispositions

All types (including **monitoring**) use `dispositionOptionsFor(modality)`. No `observation_complete`.

---

## 6. Lifecycle states

| Status | Meaning |
|--------|---------|
| `planned` | Scheduled |
| `arrived` | Opened at post |
| `triaged` | At least one triage recorded |
| `in_progress` | Documentation in progress |
| `finished` | Discharged — read-only |
| `cancelled` | Aborted |
| `entered_in_error` | Data entry error |

**Records filters:** `open`, `discharged` (finished), `cancelled`.

---

## 7. Edit encounter

**Header** (`PATCH …/header`): type, modality, `triageRequired` while writable.

**Documentation** (`PUT …/:id`): clinical fields only — not vitals (separate rows) and not the legacy full “medical visit” mega-form in Records.

---

## 8. API reference

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/encounters/open` | Open encounter |
| `PATCH` | `/api/encounters/:id/header` | Edit type / modality / triageRequired |
| `GET` | `/api/encounters/active?patientId=` | Active encounter |
| `GET` | `/api/encounters/:id` | Detail + triage + vitals |
| `PUT` | `/api/encounters/:id` | Clinical fields |
| `POST` | `/api/encounters/:id/discharge` | Discharge |
| `POST` | `/api/encounters/:id/cancel` | Cancel |

Staff UI: `/encounter` (primary), `/medical-visit` (legacy alias).

---

## 9. Migrations (June 12, 2026)

1. `migrations/20260612_01_encounter_first_model.sql` — `encounter_id` on triage/vitals  
2. `migrations/20260612_02_encounter_model_v2.sql` — types, statuses, `triage_required`, timestamps

If you previously applied files named `20260609_*` or `20260610_*`, they are the same content renamed — do not re-apply.

---

## 10. Reporting

Finished encounters by `visit_type`, `modality`, duration (`finished_at - arrived_at`). Child triage/vitals rows are not separate cases.
