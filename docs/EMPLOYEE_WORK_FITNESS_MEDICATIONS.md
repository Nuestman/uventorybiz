# Employee Work Fitness & Medications

**Version:** 2.0.0  
**Status:** Implemented (replaces Work fitness & medications)  
**Last Updated:** June 16, 2026  
**Related:** [WELLBEING_MODULE_PLAN.md](./WELLBEING_MODULE_PLAN.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

---

## Why this exists

The previous **medication declaration** feature treated each drug as the primary record. In practice, occupational health at mine sites is about **employee safety and fitness for work**:

- After illness or injury, clinicians must decide whether an employee can return to **normal duties**, **restricted duties**, or **remain off work**.
- **Medications and their side effects** (drowsiness, dizziness, impaired coordination, etc.) directly affect that decision.
- **Random drug and alcohol testing** can flag substances present in legitimate prescriptions; a documented work-fitness case helps **exonerate** employees who are taking prescribed medication—not illicit drugs.

The unit of work is a **work fitness case**: one employee submission (often several medications) reviewed holistically by on-site health staff, with safety officers seeing outcomes that affect work.

---

## Conceptual model

```
Employee (portal or clinic)
    │
    ▼
Work fitness CASE
    ├── Context (return to work, routine update, drug-test disclosure)
    ├── How employee feels overall
    └── Medication(s)
            ├── Drug details (name, dose, prescriber, dates)
            └── Employee-reported side effects (or "none")
    │
    ▼
Clinician assessment (case-level)
    ├── Fitness outcome (cleared / restrictions / not cleared / follow-up)
    ├── Work restrictions & clearance flags (underground, machinery)
    ├── Drug-test disclosure notes
    └── Per-medication clinician notes (optional)
```

---

## Database (experimental rebuild)

Migration: `migrations/20260616_02_work_fitness_medications.sql`

Drops `employee_work_fitness_cases` and creates:

| Table | Purpose |
|-------|---------|
| `employee_work_fitness_cases` | One review episode per employee submission |
| `employee_work_fitness_medications` | Medications + **employee** side-effect reports within a case |

### Case types

| Value | When used |
|-------|-----------|
| `return_to_work` | After illness, sick leave, or injury—need clearance |
| `routine_update` | Ongoing meds changed or new prescription |
| `drug_test_support` | Proactive disclosure before/at random testing |

### Case status

`submitted` → `assessed` → `closed` (or `withdrawn`). Legacy rows may still show `under_review` in the database; staff complete review in one step via **Start review** / **Edit review** (no separate interim status in the UI).

### Fitness outcomes

`cleared` | `cleared_with_restrictions` | `not_cleared` | `pending_follow_up`

---

## API

### Staff (`/api/wellbeing/work-fitness`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/work-fitness` | List cases (filters: employee, location, portalOnly, status) |
| GET | `/work-fitness/:id` | Case with medications |
| GET | `/work-fitness/employee/:employeeId` | By employee |
| POST | `/work-fitness` | Create case (clinic) |
| PUT | `/work-fitness/:id` | Update case/medications before assessment |
| PUT | `/work-fitness/:id/assess` | Complete or update clinical review (sets `assessed`, records `reviewedBy`) |
| DELETE | `/work-fitness/:id` | Delete case |

**Safety officers:** list/detail filtered to cases with work impact or drug-test relevance (`hasWorkImpact` filter); read-only.

### Patient portal (`/api/portal/work-fitness`)

Portal feature flag remains `medications` in tenant settings (no migration needed).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/work-fitness` | Employee's cases |
| POST | `/work-fitness` | Submit case + medications + side effects |
| GET | `/work-fitness/:id` | One case |
| PUT | `/work-fitness/:id` | Edit while `status = submitted` |

---

## User workflows

### Employee (portal)

1. Open **Work fitness & medications**.
2. Choose reason (e.g. return to work after malaria).
3. Describe context and how they feel.
4. Add one or more medications; for each, report side effects or check "no side effects".
5. Submit → status **Awaiting review**.
6. After clinician assesses, view outcome and restrictions (read-only).

### Clinician (Employee wellbeing)

1. Queue shows portal and clinic cases **awaiting review**.
2. Open case → review employee context, each med, and reported side effects.
3. Discuss with employee on site (workflow outside system).
4. **Start review** (or **Edit review** if already assessed): record outcome, restrictions, underground/machinery clearance, drug-test notes, and actions in one step.
5. Optional per-medication clinician notes.

### Safety officer

- Sees assessed cases with restrictions, not cleared, or drug-test disclosure.
- Cannot create or assess cases.

---

## Frontend routes

| Surface | Route |
|---------|-------|
| Staff | `/wellbeing/work-fitness` (legacy `/wellbeing/medications` still works) |
| Portal | `/portal/work-fitness` (legacy `/portal/medications` redirects) |

Shared UI: `WorkFitnessCaseFormFields`, `shared/workFitness.ts` labels.

Staff actions are written to `audit_logs` (`resourceType: work_fitness_case`) for create, update, review complete/update, and delete. Portal submissions use `portal_audit` (`work_fitness_case_submitted` / `work_fitness_case_updated`).

---

## Integration notes

- **Drug & alcohol testing module:** link positive instant tests to employee work-fitness cases with `may_affect_drug_test` (future FK).
- **Medical visits:** optional `related_medical_visit_id` on case (schema ready).
- **Notifications:** not in v2.0; consider `work_fitness_submitted` / `work_fitness_assessed` notification types later.

---

## Migration from v1 declarations

All experimental declaration data is **dropped** by migration. No automatic data migration.

---

## Document history

| Version | Date | Notes |
|---------|------|-------|
| 2.0.0 | 2026-06-16 | Case-based work fitness model; replaces Work fitness & medications |
