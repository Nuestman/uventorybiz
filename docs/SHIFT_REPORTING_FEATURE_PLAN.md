# Shift Reporting Feature – Implementation Plan

**Module:** ShiftOver (hub) → **Shift reports** at `/shiftover/shift-report`  
**Marketing:** The continuity module is branded **ShiftOver**; UI for this feature remains **shift report** wording.  
**Scope:** End-of-shift reporting with single form (location from session), top-level filters, and auto-fetched activities  
**Status:** Plan (pre-implementation)  
**Last Updated:** April 2026  

---

## 1. Overview

### 1.1 Purpose

Allow staff to submit an **end-of-shift report** for the **location they are currently working at** (session location). Reports support handover, audit trail, and operational visibility. The page lives under the **ShiftOver** module at route **`/shiftover/shift-report`**. The **`/reports`** route is reserved for MineAid’s upcoming comprehensive reporting module. **One form** is used; the report location is **auto-derived from the logged-in user’s active location** (e.g. `useActiveLocation()`).

### 1.2 User Story

- **As a** medical/operations staff member working at a care location,  
- **I want to** log a shift report at the end of my shift (summary type, details in notes, handover, with duties auto-filled),  
- **So that** management has a record of what happened and the next shift has context without me retyping completed duties.

### 1.3 Key Behaviors

- **Single form:** One report form per page. Location is **not** chosen in the form; it is **auto-fetched from the user’s active/session location** (e.g. `useActiveLocation()`). If no active location (e.g. multi-location tenant and user hasn’t selected), show a message to select location first.
- **Summary = selectable, Notes = details:** Summary is a **dropdown/select** (preset options). Free-text **details** go in a **Notes** field.
- **Activities auto-fetched:** When the user selects **report date** and **shift**, the app **auto-fetches operational duties completed during that shift** for the active location and pre-fills or displays them in the Activities section so the user doesn’t have to type them.
- **Top-level filters:** The page has **top-level filters** (e.g. date range, location, shift) that apply to the **list of reports** shown on the page (not to the form).
- **Route:** Shift report UI is at **`/shiftover/shift-report`**, under the ShiftOver hub at **`/shiftover`**. The **`/reports`** route is reserved for the future comprehensive reporting module.

---

## 2. UI Design

### 2.1 Page Placement

- **Route:** `/shiftover/shift-report` (shift reports list + form modals).
- **Hub:** `/shiftover` — ShiftOver module landing (marketing copy; links into tools).
- **Sidebar:** Dedicated **ShiftOver** group (separate from Operations):
  - **Overview** → `/shiftover`
  - **Shift reports** → `/shiftover/shift-report`
  - **Icon:** e.g. `ClipboardList` for shift reports; hub uses module icon (e.g. handshake).

### 2.2 Top-Level Filters

- **Placement:** At the top of the page, above the form and the reports list.
- **Purpose:** Filter the **list of existing reports** displayed on the page.
- **Suggested filters:**
  - **Date range:** From date, To date (optional; default e.g. last 7 days or last 30 days).
  - **Location:** Dropdown of care locations (optional; "All" or blank = all locations). Populated from `GET /api/care-locations`.
  - **Shift:** Dropdown – All / Day / Night (optional).
- **Behavior:** When filters change, refetch `GET /api/shift-reports` with the corresponding query params. Filters do **not** change the form’s location (form always uses active/session location).

### 2.3 Single Form (Location from Session)

- **Location source:** Use **logged-in user’s active location** (e.g. `useActiveLocation()` from `@/hooks/useActiveLocation`). Do **not** show a location selector in the form.
- **Display:** Show the current location name/code as read-only (e.g. "Reporting for: **Main Clinic**") so the user knows which location the report will be saved under. If there is no active location, show a message: "Select your working location to submit a shift report" (and rely on existing location selection flow, e.g. header/location badge).
- **One form only:** No tabs; no form-per-location. Single form always targets the active location.

### 2.4 Form Fields

**Fields:**

| Field            | Type     | Required | Notes |
|------------------|----------|----------|--------|
| Report date      | Date     | Yes      | Default: today. Used for report and for fetching completed duties. |
| Shift            | Select   | Yes      | Options: Day, Night. Triggers auto-fetch of completed duties for this date + shift + active location. |
| Summary          | **Select** | Yes   | **Preset options** (e.g. "Routine", "Busy", "Incident(s)", "Quiet", "Equipment issue", "Short-staffed", "Other"). User picks one; **details** go in Notes. |
| Notes            | Textarea | No       | **Details** for the shift (free text). Complements the selected Summary. |
| Activities       | Display + optional edit | No | **Auto-fetched** list of operational duties completed during this shift (see §2.5). Shown as read-only list; optional short notes field if needed. |
| Handover notes   | Textarea | No       | For next shift. |
| Issues / Incidents | Checkbox + Textarea | No | "Any issues?"; if checked, optional description. |
| Reported by      | Display  | —        | Current user (read-only). |
| Location         | Display  | —        | Active location name (read-only). |

- **Actions:** "Submit report" (primary). Optional: "Clear" to reset form.
- **Validation:** Report date, shift, and summary (select) required. Client-side (e.g. Zod) and server-side.

### 2.5 Auto-Fetch Activities (Completed Duties for Shift)

- **Trigger:** When the user selects **Report date** and **Shift** (and active location is set), the client calls an API to get **operational duties completed during that shift** at the **active location**.
- **API options:**
  - **Option A:** Use existing `GET /api/duty-assignments/history` with `date`, `locationId` (active), and filter client-side by `shift` and `status === 'completed'`.
  - **Option B:** New endpoint e.g. `GET /api/duty-assignments/completed-for-shift?date=YYYY-MM-DD&locationId=...&shift=day` that returns only completed assignments for that date/location/shift (and optionally completions with notes). Prefer if history response is heavy or doesn’t expose shift clearly.
- **UX:** Display the list in the **Activities** section (e.g. duty title, completed time, completed by). User does **not** type these; they are read-only. Optionally allow a small "Additional activities" text area for anything not captured by duty completions.
- **Empty state:** If no duties were completed for that date/location/shift, show "No completed duties recorded for this shift" and still allow the user to add optional "Additional activities" text.

**Suggested Summary (select) options** — short sentences (store value in DB; show same sentence in UI):

| Value       | Label (short sentence) |
|------------|-------------------------|
| routine    | Shift was routine with no major events. |
| busy       | Shift was busy with high patient/staff activity. |
| incident   | One or more incidents occurred during the shift. |
| quiet      | Shift was quiet with low activity. |
| equipment_issue | Equipment or facility issues were encountered. |
| short_staffed   | Shift was short-staffed; workload was affected. |
| other      | Other (describe in notes). |

### 2.6 Reports List

- Below (or beside) the form, show a **filtered list** of shift reports using the **top-level filters** (§2.2). Columns: e.g. Date, Shift, Location, Summary (selected value), Reporter, snippet of Notes. Clicking a row can expand or open a simple detail view.

### 2.7 Empty States

- **No active location:** "Select your working location to submit a shift report."
- **No care locations (tenant):** "No locations configured. Contact admin."

---

## 3. Data Model

### 3.1 New Table: `shift_reports`

| Column           | Type      | Nullable | Notes |
|------------------|-----------|----------|--------|
| id               | UUID      | No       | PK, default `gen_random_uuid()`. |
| tenant_id        | UUID      | No       | FK → tenants(id) ON DELETE CASCADE. |
| location_id      | UUID      | No       | FK → care_locations(id). From session/active location. |
| reported_by_id   | UUID      | No       | FK → users(id). User who submitted. |
| report_date      | DATE      | No       | Date of the shift. |
| shift            | VARCHAR   | No       | `'day'` \| `'night'` (match duty assignments). |
| summary          | VARCHAR   | No       | **Select value** (e.g. "routine", "busy", "incident", "quiet", "other"). Required. |
| notes            | TEXT      | Yes      | Free-text **details** (complements summary). |
| activities_notes | TEXT      | Yes      | Optional; additional activities not in completed-duties list. |
| handover_notes   | TEXT      | Yes      | Optional handover. |
| has_issues       | BOOLEAN   | Yes      | Default false. |
| issues_notes     | TEXT      | Yes      | Optional description if has_issues. |
| created_at       | TIMESTAMP | No       | Default NOW(). |
| updated_at       | TIMESTAMP | Yes      | Optional; for future edits if needed. |

**Indexes:**

- `(tenant_id, report_date DESC)` for listing by tenant and date.
- `(location_id, report_date DESC)` for listing by location.
- `(tenant_id, location_id, report_date DESC)` for per-location listing.

**Constraints:**

- Tenant isolation: all queries filter by `tenant_id` from session.
- Location must belong to tenant (enforce in API when creating).

### 3.2 Alignment with Existing Schema

- **Shifts:** Use same values as `operational_duty_assignments.shift`: `'day'`, `'night'`.
- **Locations:** Use `care_locations`; only allow active locations for the tenant.
- **Reporter:** Use `users`; `reported_by_id` = current authenticated user.

No change to `operational_duty_assignments` or `operational_duty_completions`; shift reports are a separate artifact (narrative report vs. duty completion).

---

## 4. API Design

### 4.1 Create Shift Report

- **Endpoint:** `POST /api/shift-reports`
- **Auth:** Required (session).
- **Body:**
  - `locationId` (UUID, required) — **sent from client** using active location from `useActiveLocation()`; server must verify it matches session/active location or user’s tenant.
  - `reportDate` (ISO date string, required)
  - `shift` (`'day'` \| `'night'`, required)
  - `summary` (string, required) — **value from Summary select** (e.g. "routine", "busy", "incident", "quiet", "other").
  - `notes` (string, optional) — details text.
  - `activitiesNotes` (string, optional) — any extra activities not in the auto-fetched list.
  - `handoverNotes` (string, optional)
  - `hasIssues` (boolean, optional, default false)
  - `issuesNotes` (string, optional)
- **Validation:** Ensure `locationId` belongs to tenant and is active; optionally enforce that `locationId` equals session active location. Ensure user is authenticated.
- **Response:** 201 + created shift report object (id, locationId, reportDate, shift, summary, notes, etc., plus `reportedBy` summary if desired).

### 4.2 List Shift Reports

- **Endpoint:** `GET /api/shift-reports`
- **Query params (align with top-level filters):**
  - `locationId` (optional): filter by location.
  - `fromDate`, `toDate` (optional): date range (ISO date).
  - `shift` (optional): `day` \| `night` to filter by shift.
  - `limit` (optional, default 20), `offset` (optional) for pagination.
- **Auth:** Required.
- **Response:** Array of shift report objects (tenant-scoped). Include location name and reporter name for display.

### 4.3 Get Single Shift Report (Optional)

- **Endpoint:** `GET /api/shift-reports/:id`
- **Auth:** Required; tenant-scoped.
- **Response:** Single shift report with location and reporter details. Useful for detail view or edit in a later phase.

### 4.4 Completed Duties for Shift (Activities Auto-Fetch)

- **Endpoint:** Use existing `GET /api/duty-assignments/history?date=...&locationId=...` and filter by `shift` and `status=completed` on client; or add **`GET /api/duty-assignments/completed-for-shift`** with query params `date`, `locationId`, `shift`.
- **Purpose:** Return assignments (and optionally completion details) for the given date, location, and shift so the form can show them in the Activities section without the user typing.
- **Auth:** Required; tenant-scoped.

---

## 5. Implementation Phases

### Phase 1: Backend and Data

1. **Schema (shared):**
   - Add `shift_reports` table in `shared/schema.ts` (Drizzle) with `summary` as varchar (select value), `notes` for details, `activities_notes` optional.
   - Add Zod insert schema and export types.
2. **Migration:**
   - New migration file: e.g. `migrations/YYYYMMDD_shift_reports.sql` with `CREATE TABLE shift_reports ...` and indexes.
3. **Storage:**
   - In `server/storage.ts` (or a dedicated module): `createShiftReport(tenantId, data)`, `getShiftReports(tenantId, filters)` (support locationId, fromDate, toDate, shift).
4. **API:**
   - New module (e.g. `server/modules/shift-reports/`): `POST /api/shift-reports`, `GET /api/shift-reports` with filter query params. Use existing auth and tenant resolution.
5. **Completed duties for shift (optional new endpoint):**
   - Either document use of `GET /api/duty-assignments/history` with client-side shift/status filter, or add `GET /api/duty-assignments/completed-for-shift?date=...&locationId=...&shift=...`.

### Phase 2: Frontend – Page, Route, and Top-Level Filters

1. **Route and sidebar:**
   - Add **`/shiftover`** to protected paths in `client/src/routes.ts` (covers all subpaths).
   - Add **ShiftOver** group in `client/src/config/sidebarConfig.tsx`: Overview → **`/shiftover`**, Shift reports → **`/shiftover/shift-report`**.
   - Register routes in `App.tsx`: **`/shiftover/shift-report`** before **`/shiftover`** (specific match first); hub component at **`/shiftover`**.
2. **Page structure:**
   - Single shift-report page at `/shiftover/shift-report`. No tabs by location.
   - **Top-level filters** at top: date range (from/to), location (dropdown from `GET /api/care-locations`), shift (All / Day / Night). These drive the reports list query.
   - When filters change, refetch `GET /api/shift-reports` with corresponding params.

### Phase 3: Single Form (Location from Session) and Submit

1. **Location from session:**
   - Use `useActiveLocation()`. Display "Reporting for: **{locationName}**". If no active location, show "Select your working location to submit a shift report" and disable or hide submit.
2. **Form state:**
   - react-hook-form + Zod: reportDate, shift, **summary** (select: e.g. routine, busy, incident, quiet, other), **notes** (textarea, details), activitiesNotes (optional), handoverNotes, hasIssues, issuesNotes. locationId and reportedBy set from active location and auth, not form fields.
3. **Submit:**
   - `POST /api/shift-reports` with `locationId: activeLocation.id` and form values. On success: toast, invalidate list query, optionally reset form.
4. **Validation:** Summary (select) required; date and shift required.

### Phase 4: Summary Select and Notes

1. **Summary:** Replace free-text summary with a **Select** component. Options: e.g. "Routine", "Busy", "Incident(s)", "Quiet", "Equipment issue", "Short-staffed", "Other". Store value in `summary`; display label in list/detail.
2. **Notes:** Single **Notes** textarea for free-text details (maps to `notes` in API/schema).

### Phase 5: Auto-Fetch Activities (Completed Duties)

1. When user selects **report date** and **shift** (and active location exists), call API to get completed duties for that date + location + shift (existing history endpoint with filters or new completed-for-shift endpoint).
2. Display results in **Activities** section as read-only list (e.g. duty title, completed time). Optionally "Additional activities" text area for anything not in the list.
3. Empty state: "No completed duties recorded for this shift" when list is empty.

---

## 6. File Checklist

| Area        | File(s) |
|------------|---------|
| Schema      | `shared/schema.ts` – shift_reports table (summary varchar, notes text), insert schema, types |
| Migration   | `migrations/YYYYMMDD_shift_reports.sql` |
| Storage     | `server/storage.ts` – createShiftReport, getShiftReports (filters: locationId, fromDate, toDate, shift) |
| API routes  | New: `server/modules/shift-reports/*`; register in `server/routes/index.ts`. Optional: duty-assignments completed-for-shift endpoint |
| Routes      | `client/src/routes.ts` – add **`/shiftover`** (prefix covers sub-routes) |
| Sidebar     | `client/src/config/sidebarConfig.tsx` – **ShiftOver** group: Overview `/shiftover`, Shift reports `/shiftover/shift-report` |
| App         | `client/src/App.tsx` – `/shiftover/shift-report` → shift report page; `/shiftover` → hub |
| Hub page    | `client/src/pages/shiftover/ShiftoverHome.tsx` (optional; module entry) |
| Page        | `client/src/pages/Reports.tsx` – top-level filters, single form (location from useActiveLocation), summary select, notes, activities auto-fetch, reports list |

---

## 7. Edge Cases and Notes

- **No active location:** Multi-location tenant with no location selected: show message to select location; do not allow submit. Single-location tenant: session may still set a default; treat same way if no location in session.
- **Session location:** Report is always for the **current session/active location**. Top-level filters only filter the **list** of reports; they do not change which location the form submits for.
- **Permissions:** All authenticated users in the tenant can create and list reports. If later you need "only assigned staff for this location," that can be an additional check on top of this.
- **Date/time:** Report date is the shift date (calendar day). "Day" vs "Night" aligns with `operational_duty_assignments.shift` for auto-fetched activities.
- **Summary options:** Define a fixed set of summary options (e.g. routine, busy, incident, quiet, other) in code or config; extend later if needed.
- **Other report types:** Route `/reports` is reserved for comprehensive analytics and reporting. ShiftOver (shift handover continuity) remains under `/shiftover/*`. Expanded ShiftOver roadmap: `docs/SHIFTOVER_IMPLEMENTATION_PLAN.md`.
- **i18n:** Labels and validation messages can be wired to i18n later; start with English.

---

## 8. Success Criteria

- User can open **Shift reports** from the **ShiftOver** sidebar group at **`/shiftover/shift-report`** (and the hub at **`/shiftover`**).
- **Top-level filters** (date range, location, shift) filter the list of reports displayed.
- **Single form** is used; **location is auto from logged-in user’s active location** (no form-per-location, no location tabs).
- User can submit a shift report with **summary** (select) and **notes** (details), plus optional handover/issues.
- **Activities** are **auto-fetched** for the chosen date + shift + active location (completed duties) and shown in the form; user does not type them.
- Reports are stored with correct tenant_id and location_id and are listed via API with filter support.
- Plan is ready for implementation; no code has been written yet.
