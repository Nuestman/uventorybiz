# Appointment notifications and alerts

**Last updated:** June 15, 2026  
**Code:** `server/modules/appointments/appointment-notifications.service.ts`, `server/modules/telecare/telecare-appointment-sync.service.ts`  
**Related:** [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md), [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md), [ENCOUNTER_PATIENT_FLOWS.md](./ENCOUNTER_PATIENT_FLOWS.md), migration `migrations/20260608_02_appointment_notification_types.sql`

---

## Overview

Appointment lifecycle events trigger **two separate notification paths**:

| Audience | Channel (current) | Purpose |
|----------|-------------------|---------|
| **Patient** | Email | Confirm visits, receive telehealth join links, stay informed outside the app |
| **Staff** | In-app only | Operational awareness without email fatigue |

Staff **do not** receive appointment alert emails in the current release. Email templates for staff (`server/appointmentEmailTemplates.ts`) remain in the codebase for a possible future reinstatement.

---

## Confirmation model (who confirms what)

Appointments use status **`scheduled`** (awaiting patient confirmation) or **`confirmed`**. Only one party needs to “close the loop” on the initial booking; a **second confirmation** is required when the **schedule changes** after that.

| Flow | Who initiates | Resulting status | Patient portal action |
|------|---------------|------------------|------------------------|
| **Portal request** | Patient | `confirmed` when staff approves | None — request is the patient’s intent |
| **Staff schedule** | Staff | `scheduled` | Patient confirms or declines |
| **Schedule change** | Staff edits date, time, provider, location, or modality | Back to `scheduled` if was `confirmed` | Patient confirms updated details |

```
Patient request ──► staff approve ──► confirmed (done)

Staff schedule  ──► scheduled ──► patient confirm ──► confirmed

Either side     ──► material schedule change ──► scheduled ──► patient re-confirm
```

**In-person location:** Patients may select a preferred care location on portal requests; staff must set (or confirm) `locationId` when approving in-person requests. Staff scheduling UI also selects location for in-person visits.

---

## Alert events

| Event | Notification type key | Trigger | Patient email | Staff in-app |
|-------|----------------------|---------|---------------|--------------|
| Staff schedules visit | `appointment_scheduled` | Staff creates appointment (`scheduled`) | Yes — please confirm | Yes |
| Portal request approved | `appointment_scheduled` | Staff confirms portal request (`confirmed`) | Yes — visit confirmed (not “please confirm”) | Yes |
| Patient confirmed | `appointment_patient_confirmed` | Portal confirm on staff-scheduled visit | Yes — portal video link when telehealth | Yes |
| Schedule updated | `appointment_scheduled` | Staff changes material schedule fields | Yes — please confirm again | Yes |
| Patient declined | `appointment_patient_declined` | Portal decline before confirm | No | Yes |
| Patient cancelled | `appointment_patient_cancelled` | Portal cancel after confirm | No | Yes |
| No-show | `appointment_no_show` | Cron after grace period | No | Yes |

Patient emails use branded HTML via `sendEmail` / Resend (or Gmail in dev). Staff alerts appear in the notification bell and `/notifications`.

### Portal appointment request status (4.28.0)

`portal_appointment_requests.status` is kept aligned with the linked appointment via `telecare-appointment-sync.service.ts`:

| Linked appointment outcome | Request status shown in portal |
|----------------------------|------------------------------|
| Staff approved (visit pending) | `confirmed` (Approved) |
| Visit completed | `completed` |
| Auto or manual no-show | `no_show` |
| Cancelled | `cancelled` |

Sync runs on write (complete, no-show, cancel, discharge) and heal-on-read on `GET /api/portal/appointment-requests`. See [TELEHEALTH_APPOINTMENT_SYNC.md](./TELEHEALTH_APPOINTMENT_SYNC.md).

---

## Staff in-app recipient resolution

Implemented in `resolveAppointmentInAppRecipientIds()`:

1. **Assigned provider** — `appointments.medical_staff_id` always receives an in-app alert when set.
2. **Preference subscribers** — If any tenant users have enabled notification preferences for the appointment type, those with **in-app** enabled (or no in-app row yet — opt-out only when explicitly disabled) are included.
3. **Role fallbacks** — If **no users** are subscribed via preferences for that notification type, active users with roles **`medical_staff`**, **`emt`**, or **`admin`** receive the in-app alert (deduplicated with the assigned provider).

No staff email is sent at any step.

```
Appointment event
      │
      ├─► Patient (portal email on file) ──► branded email
      │
      └─► Staff in-app
              ├─ assigned medical_staff_id (always)
              ├─ OR preference subscribers (in_app)
              └─ OR fallback: medical_staff · emt · admin (when no preference subscribers)
```

---

## Patient emails

| Event | Subject (pattern) | Notes |
|-------|-------------------|-------|
| Staff scheduled | `{tenant}: New appointment — please confirm` | Staff-initiated; links to portal |
| Request approved | `{tenant}: Your visit request is confirmed` | Patient-initiated; no second confirm |
| Schedule updated | `{tenant}: Appointment updated — please confirm` | After staff reschedule |
| Telehealth confirmed | `{tenant}: Join your confirmed video visit` | After patient confirms staff-scheduled telehealth |

Other patient-facing appointment comms (reminders, magic-link portal access) are documented in the patient portal plan.

---

## Configuration

- **Notification types** — Seeded by `20260608_02_appointment_notification_types.sql` under category `appointments`.
- **User preferences** — Staff can tune in-app delivery per type under notification settings. Explicit **disabled** in-app rows opt out; missing rows default to in-app for preference subscribers.
- **No-show cron** — `server/cronJobs.ts` marks overdue unconfirmed/unattended visits and calls `notifyAppointmentNoShow`.

---

## Future: clinic scheduling coordinator

Today, unassigned appointments or tenants without preference rows rely on **role fallbacks** (`medical_staff`, `emt`, `admin`). That works for small sites but can be broad as clinics grow.

**Planned enhancement (not implemented):**

- Introduce a dedicated staff role or assignment (e.g. **clinic coordinator**, **scheduling admin**) responsible for portal request triage, schedule changes, and no-show follow-up.
- Route appointment-category in-app alerts to that user (or small group) instead of—or in addition to—role fallbacks.
- Optionally re-enable **staff email** for that role only, while keeping providers on in-app-only to limit fatigue.

Until that role exists, fallbacks ensure someone on the clinical/admin team still sees portal actions and no-shows in the app.

---

## Related API and UI

| Area | Location |
|------|----------|
| Staff appointments | `/appointments`, `AppointmentsTable`, calendar |
| Portal requests | `PortalAppointmentRequestsPanel`, `POST /api/portal/appointment-requests` |
| Notifications UI | `NotificationBell`, `/notifications` |
| Email templates (patient + dormant staff) | `server/appointmentEmailTemplates.ts` |

---

## See also

- [ENCOUNTER_PATIENT_FLOWS.md](./ENCOUNTER_PATIENT_FLOWS.md) — scheduling and portal request flows  
- [ENCOUNTER_LIFECYCLE_FRAMEWORK.md](./ENCOUNTER_LIFECYCLE_FRAMEWORK.md) §6–§8 — telehealth and staff scheduling  
- [TELEHEALTH_PLAN.md](./TELEHEALTH_PLAN.md) — WebRTC telehealth and preferred practitioner (future)
