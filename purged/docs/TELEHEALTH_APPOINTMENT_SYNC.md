# Telehealth appointment sync

**Last updated:** June 16, 2026  
**Code:** `server/modules/telecare/telecare-appointment-sync.service.ts`  
**Related:** [APPOINTMENT_NOTIFICATIONS.md](./APPOINTMENT_NOTIFICATIONS.md), [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md), [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md)

---

## Problem

Telehealth visits touch **four status-bearing tables**:

| Table | Role |
|-------|------|
| `appointments` | Schedule workflow (`scheduled` → `confirmed` → `in_progress` → terminal) |
| `portal_appointment_requests` | Patient booking intent (`pending` → `confirmed` → terminal outcomes) |
| `telecare_sessions` | Video lifecycle (`scheduled` → `waiting_room` → `in_progress` → terminal) |
| `encounters` | Clinical episode (`finished` drives visit completion for telehealth) |

Without coordinated updates, one layer can show **Approved** in the portal while `appointments.status` is `no_show` or `completed`.

---

## Sync hub

All cross-table reconciliation flows through **`telecare-appointment-sync.service.ts`**.

### Link repair

- `findAppointmentForTelecareSession` / `findTelecareSessionForAppointment` — resolve links in **both directions**
- `repairTelecareAppointmentLinks` — align `appointments.telecare_session_id` ↔ `telecare_sessions.appointment_id`
- `linkAppointmentToTelecareSession` (repository) — sets **both** FKs on create

### Write-time sync (terminal outcomes)

| Trigger | Function |
|---------|----------|
| Telecare session completed | `finalizeTelehealthVisitFromSession` |
| Encounter discharged | `finalizeTelehealthVisitFromEncounter` |
| Telecare PATCH `no_show` / `cancelled` | `syncPortalRequestFromTelecareSessionOutcome` |
| Staff appointment status PATCH | `syncAppointmentAfterStatusChange` |
| Patient cancel / decline | `syncAppointmentAfterStatusChange` |
| Staff delete appointment | `syncBeforeAppointmentDelete` |
| Encounter cancel | `syncTelehealthOutcomeFromEncounterCancel` |
| Cron auto no-show | `syncPortalAppointmentRequestForAppointment` |
| Staff reschedule telehealth | `syncTelecareScheduleFromAppointment` |

### Read-time heal (portal)

| API | Behavior |
|-----|----------|
| `GET /api/portal/appointments` | `reconcileAppointmentVisitStatus` per row |
| `GET /api/portal/appointment-requests` | `reconcilePortalAppointmentRequestStatus` per row |
| `GET /api/portal/telecare/sessions` | session + appointment reconcile |

---

## Portal request status mapping

When the linked appointment reaches a terminal state:

| `appointments.status` | `portal_appointment_requests.status` | Portal label |
|-----------------------|--------------------------------------|--------------|
| (staff approved) | `confirmed` | Approved |
| `completed` | `completed` | Visit completed |
| `no_show` | `no_show` | No show |
| `cancelled` | `cancelled` | Cancelled |

Heal-on-read backfills `linked_appointment_id` when missing (approval-time window or preferred-date match).

---

## Session expiry reconcile (4.29.0; timers + cron in 4.35.1)

`telecare-session-reconcile.service.ts` runs on:

| Trigger | When | Role |
|---------|------|------|
| **In-memory timers** (`telecare-session-expiry.scheduler.ts`) | Deadline per session (armed on create / join / extend / status / cancel; re-hydrated on boot) | **Primary** — no periodic Neon wake |
| **Telehealth hub** queue reads | Staff opens / refreshes hub | Opportunistic reconcile for listed sessions |
| **Hourly cron** (`15 * * * *` in `cronJobs.ts`) | Once per hour | **Backup** after process restart gaps; pausable via `HOURLY_CRON_JOBS_ENABLED=false` (4.35.2) |

**4.35.1:** Cron previously ran every **5 minutes**, which prevented Neon Free **scale-to-zero** (5‑minute idle suspend) while Railway kept the app always on.

| Session state | After deadline | Outcome |
|---------------|----------------|---------|
| Never clinically started (`actualStart` unset, not `in_progress`) | Slot end + `APPOINTMENT_NO_SHOW_GRACE_MINUTES` (default 15) | **no_show** on session, appointment, and linked portal request |
| Started (`actualStart` or `in_progress`) | Slot end + `SCHEDULED_END_SERVER_RECONCILE_GRACE_MINUTES` (5) | **completed** |

**Why this matters:** Before 4.29.0, unstarted sessions were auto-**completed** at slot end + 5 min, which incorrectly marked staff-scheduled telehealth appointments as attended. Portal-request flows often looked correct because they were checked via appointment no-show cron before staff opened the hub.

Hourly `markStaleAppointmentsAsNoShow` remains the backstop for non-telehealth and appointment rows without an active session reconcile.

---

## Migrations (4.28.0)

- `migrations/20260613_01_telecare_consent_and_duration.sql` — `patient_telehealth_consent_at`, `appointments.duration_minutes`, `scheduled_end` backfill

Run with `npm run db:sql-migrate -- migrations/<file>.sql` after 4.27.0 migrations. See `docs/DRIZZLE_MIGRATIONS.md`.
