# Patient flows — encounter lifecycle (quick reference)

**Full framework:** [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md)  
**Schema migration:** [ENCOUNTER_SCHEMA_MIGRATION.md](./ENCOUNTER_SCHEMA_MIGRATION.md)  
**Alerts & notifications:** [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md)  
**Pathway matrix (code):** `shared/encounterPathways.ts`

---

## Flow index

| # | Flow | Start | End | Doc section |
|---|------|-------|-----|-------------|
| 1 | In-person walk-in | Arrival at post | Disposition ± follow-up | Framework §5 |
| 2 | In-person scheduled | Staff appointment | Disposition ± follow-up | Framework §8 |
| 3 | Telehealth scheduled | Portal or staff books video visit | Disposition ± follow-up | Framework §6 |
| 4 | Portal appointment request | Patient chooses modality | Staff confirms → appt | Framework §7 |
| 5 | Phone follow-up | Employee wellbeing due task | Disposition | Framework §3 + Employee wellbeing |
| 6 | Telehealth follow-up | Prior visit follow-up flag | Remote check-in | Framework §6 |

---

## 1. In-person walk-in (acute / routine)

```
Arrive → Register patient → Encounter (in_person, acute_onsite | routine_clinic)
      → SATS triage (same day) → Vitals → Documentation → Disposition → [Follow-up]
```

**Gate:** Same-day triage required for `acute_onsite`, `routine_clinic`, `emergency`.

---

## 2. In-person scheduled

```
Staff creates appointment (modality: in_person)
      → Patient arrives → Check-in → Encounter linked to appointment
      → [Triage if pathway requires] → Documentation → Disposition → [Follow-up]
```

---

## 3. Telehealth scheduled (NOT follow-up only)

```
Staff OR portal request (preferred_modality: telehealth)
      → Staff confirms → Appointment (telehealth) + telecare_session
      → Reminders → Patient joins (portal) / Provider joins (staff)
      → Encounter (telehealth_scheduled) → Remote documentation → Disposition
      → [refer_in_person | continue_telehealth | follow-up]
```

**No SATS triage gate.** Vitals optional.

---

## 4. Portal appointment request (in-person OR telehealth)

```
Portal login → Appointments → Request visit
           → Select: In person | Telehealth (video)
           → [In person] Preferred care location
           → Date / time preference + reason
           → pending request → Staff review
           → Approved: appointment status confirmed (no second patient confirm)
           → [telehealth] telecare_session + Teams link email
           → [in-person] location set on appointment
```

API: `POST /api/portal/appointment-requests` with `preferredModality` and optional `preferredLocationId`.

**Staff-initiated** appointments remain `scheduled` until the patient confirms in the portal. **Schedule changes** from staff reset a confirmed visit to `scheduled` and email the patient to confirm again.

---

## 5. Disposition → follow-up loop

```
Encounter finished with follow_up_required
      → patient_follow_ups row (in_person | phone_call | telehealth)
      → Due date → Staff completes or schedules next encounter
      → New encounter with matching pathway/modality
```

---

## Status progression (both modalities)

| Stage | In-person | Telecare |
|-------|-----------|----------|
| Pre-visit | planned | scheduled (session) |
| Check-in | arrived | waiting_room |
| Triage | triaged (if required) | — |
| Active care | in_progress | in_progress |
| Done | finished | completed (session) + finished (encounter) |

---

## API endpoints (foundation)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/encounters/pathways` | Pathway matrix for UI |
| GET/POST | `/api/encounters` | Encounter CRUD |
| GET/POST | `/api/telecare/sessions` | Session management |
| POST | `/api/portal/appointment-requests` | Patient request (incl. telehealth) |
| GET | `/api/portal/telecare/sessions` | Patient upcoming video visits |

Legacy `/api/medical-visits` remains until UI migrates.

---

## Appointment alerts (staff & patient)

Schedule and portal actions emit **patient emails** (confirm, telehealth join link) and **staff in-app alerts** only — no staff email in the current release. Assigned providers always get in-app notifications; when no one has notification preferences for an appointment type, alerts fall back to active `medical_staff`, `emt`, and `admin` users.

Full detail, event matrix, and future **clinic scheduling coordinator** plans: [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md).
