# Duty Spawner – Schedule Rule vs Task Instance

**Date:** 2025-02-20

## Problem

Duty assignments were acting as both the **schedule rule** and the **task instance**: an admin had to manually create an assignment every time a recurring duty was due (e.g. every Tuesday). The system did not automatically create "today's" tasks from the duty definitions.

## Solution: Spawner Pattern

We separate **intent** (the rule) from **execution** (the daily to-do):

| Concept | Table | Role |
|--------|--------|------|
| **Definition (rule)** | `operational_duties` | Master list: title, category, **schedule** (e.g. Tue 08:00, Thu 14:00), isActive. No assignment date. |
| **Instance (task)** | `operational_duty_assignments` | One row per occurrence: dutyId, locationId, assignmentDate, shift, status. What users see in "Today's Tasks". |

A **spawner** (background job) runs daily and creates assignment **instances** for the current day from active duties whose schedule includes that weekday.

## Implementation

### 1. Storage: `spawnDutyAssignmentsForDate(tenantId, date)`

- **Input:** `tenantId`, `date` (e.g. today).
- **Logic:**
  - Weekday from `date`: e.g. `tuesday`.
  - Load all **active** duties for the tenant (`operational_duties` where `isActive = true`).
  - For each duty, parse `scheduled_days` (JSON):
    - New format: `[{ "day": "tuesday", "time": "08:00" }, ...]`.
    - Legacy: `["monday", "tuesday"]` with `scheduled_time` as default time.
  - Keep only entries where `day === todayWeekday`. Map each time to a **shift**: &lt; 12h → morning, &lt; 18h → evening, else night.
  - Load all **active** care locations for the tenant.
  - Load existing assignments for that date (so we don’t duplicate).
  - For each (duty, location, shift) where no assignment exists: **insert** one row into `operational_duty_assignments` with `assignmentDate = start of date`, `shift`, `status = 'pending'`, `assignedToId = null`.
- **Output:** `{ spawned: number }`.

### 2. Cron job

- **Schedule:** Every day at **00:01** (server timezone).
- **Action:** For each tenant, call `spawnDutyAssignmentsForDate(tenantId, new Date())`.
- **Logging:** Log total assignments spawned per tenant and overall.

### 3. Manual trigger (admin)

- **API:** `GET/POST /api/admin/duties/trigger-duty-spawn` (admin only).
- **Use:** Testing or one-off “spawn today’s duties now” without waiting for midnight.

### 4. UI / “Today’s Tasks”

- **No change.** The app already loads “today’s” list from `operational_duty_assignments` where `assignmentDate` is today (and optional filters: location, status, user). Spawned and manual assignments both appear there.

## Coexistence: Recurring vs Manual

- **Recurring:** Defined once in `operational_duties` with a schedule. The spawner creates rows in `operational_duty_assignments` each day (per location, per shift).
- **One-off:** An admin can still create a single assignment via the existing “Assign duty to a post” flow. Those rows are also in `operational_duty_assignments`, so they show up with spawned ones on the same day.

No conflict: same table, same “today” query; spawner only adds missing (duty, location, date, shift) combinations.

## Files touched

- **server/storage.ts:** `spawnDutyAssignmentsForDate` + IStorage.
- **server/cronJobs.ts:** Daily cron at 00:01, `processAllTenantsDutySpawn`, `triggerDutySpawnManually`.
- **server/modules/admin/admin.controller.ts:** `triggerDutySpawn`.
- **server/modules/admin/admin.routes.ts:** `GET/POST /admin/duties/trigger-duty-spawn`.

## Design credit

Pattern and separation of “schedule rule” vs “task instance” (Spawner) aligned with feedback from a collaborating developer.
