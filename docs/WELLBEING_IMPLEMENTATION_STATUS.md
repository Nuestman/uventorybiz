## MineAid HMS – Employee wellbeing Implementation Status

**Scope**: Employee wellbeing hub covering follow-ups (onsite + external care), employee Work fitness & medications, and feedback/surveys for treatment services.  
**Authoritative plan**: `WELLBEING_MODULE_PLAN.md` (kept as the canonical design/spec).  
**Last updated**: March 4, 2026

---

## 1. High-Level Status

- **Pillar 1 – Employee wellbeing Hub UI shell**
  - [x] Sidebar navigation entries for Employee wellbeing
  - [x] Page shells for Follow-ups, Medications, Feedback
  - [x] Dedicated overview/dashboard (initial aggregated cards, KPIs, recent lists)

- **Pillar 2 – Employee Follow-Up & Tracking**
  - [x] Core follow-up storage (`patient_follow_ups`)
  - [x] Follow-ups API (onsite + external) with filters
  - [x] Employee wellbeing Follow-ups UI (list, filters, CRUD, details)
  - [x] Medical visits → auto-create follow-up when follow-up required
  - [x] Incidents → auto-create post-incident follow-up
  - [x] Follow-up due/overdue reminders (daily digest via notification system; see §3.5)
  - [x] Simple analytics on Follow-ups page (due/overdue/completed summary from current list)
  - [ ] Full analytics/reports (completion rates, overdue counts across date ranges)

- **Pillar 3 – Employee Work fitness & medications**
  - [x] Core storage (`employee_work_fitness_cases`)
  - [x] Work fitness & medications API (list/create/update/assess/supersede/delete)
  - [x] Employee wellbeing Medications UI (list, filters, CRUD, view details, assess, supersede, delete)
  - [x] **RBAC**: Safety officer read-only access to declarations with work impact only (list and get-one restricted)
  - [ ] Incident–declaration linkage
  - [ ] Reporting and trends (per site, per role)

- **Pillar 4 – Feedback & Surveys**
  - [x] Core storage and schema (feedback tables)
  - [x] Feedback API:
    - [x] Public context for feedback form (`GET /wellbeing/feedback/public-context`, optional `tenantId`)
    - [x] Public submit endpoint (`POST /wellbeing/feedback/submit`, anonymous by default with optional contact details and care month/year)
    - [x] Staff list/get/update endpoints for feedback review workflow
    - [x] Share-poster endpoint to email QR/link to multi-selected employees using MineAid email templates
  - [x] Public feedback form at `/feedback` (tenant-scoped via `tenantId` query param; anonymous by default with optional contact information)
  - [x] Employee wellbeing Feedback UI (filterable table, drill-down modal, status/response workflow, analytics tab with charts + insights)
  - [x] Print-ready QR poster page (`/wellbeing/feedback-poster`) with tenant branding
  - [ ] Survey builder (admin), server-side aggregate/NPS endpoints, tokenized visit links

### What’s left (priority)

| Area | Remaining |
|------|-----------|
| **Hub** | Employee wellbeing overview/dashboard (cards, KPIs) |
| **Follow-ups** | Full analytics (completion, overdue across date ranges) |
| **Medications** | Incident linkage; reporting/trends |
| **Feedback** | Survey builder (admin), aggregate/NPS endpoints, tokenized visit links |

---

## 2. Employee wellbeing RBAC (Role-Based Access Control)

Employee wellbeing uses two middleware layers: **read** (view data) and **write** (create, update, delete, assess, share). Safety officers have read-only access; medical staff and admins can read and write.

### 2.1 Roles and access

| Role | Read (Employee wellbeing) | Write (Employee wellbeing) |
|------|-------------------|--------------------|
| **super_admin** | Yes (all tenants) | Yes |
| **admin** | Yes | Yes |
| **medical_staff** | Yes | Yes |
| **safety_officer** | Yes (restricted – see below) | **No** |
| Other roles | No | No |

- **Read** = list and get-one for follow-ups, Work fitness & medications, and feedback. Requires an active user with a tenant (except super_admin).
- **Write** = create, update, delete, record outcome, assess declarations, update feedback status/response, share feedback poster. Only **medical_staff** and **admin** (and super_admin) can write.

### 2.2 Safety officer restrictions

- **Follow-ups**: Can list and view all follow-ups (no extra filter). Cannot add, edit, record outcome, complete, cancel, or delete.
- **Work fitness & medications**: Can only see declarations with **documented work impact** (side effects impact work, work restrictions, or fitness impact). List and list-by-employee APIs return only work-impact rows; get-one returns 403 if the declaration has no work impact. Cannot create, edit, assess, supersede, or delete.
- **Feedback**: Can list and view feedback. Cannot update status or response, and cannot use “Share digitally with employees” (share-poster) on the poster page.

### 2.3 Backend implementation

- **Middleware**: `server/shared/middleware/wellbeingAuth.ts`
  - `requirewellbeingRead(storage)` – allows medical_staff, safety_officer, admin (and super_admin).
  - `requirewellbeingWrite(storage)` – allows medical_staff, admin (and super_admin).
- **Routes**: All Employee wellbeing GET endpoints use `requirewellbeingRead`; POST/PUT/PATCH/DELETE use `requirewellbeingWrite`. Medication list/get-one apply additional work-impact filtering for safety_officer in the route handlers (using `req.user`).

### 2.4 Frontend (UI) behaviour

- **Follow-ups page**: “Add follow-up” and row menu write actions (edit, record outcome, complete, reopen, cancel, delete) are hidden for safety_officer; only “View details” is shown.
- **Medications page**: “New declaration” and row actions (Assess, Edit, Mark superseded, Delete) are hidden; view-detail footer “Assess”/“Edit declaration” are hidden. A banner explains: “You are viewing declarations with documented work impact only.”
- **Feedback page**: Detail modal shows status and response as read-only; “Save changes” is hidden for safety_officer.
- **Feedback poster page**: The “Share digitally with employees” card (employee picker + “Send link & poster”) is hidden for safety_officer.
- **Dashboard**: A read-only banner is shown for safety_officer: “You have read-only access to Employee wellbeing data…”

---

## 3. Patient Follow-Ups (Onsite & External Care)

**Plan reference**: `WELLBEING_MODULE_PLAN.md` – Pillar 2 (Employee Follow-Up & Tracking), sections 2.1 and 2.2; Integration Points 1–3.

### 3.1 Database & Schema

- [x] `patient_follow_ups` table created via `20260310_WELLBEING_followups_and_feedback.sql`
  - Links to `patients`, optional `employees`, optional `medical_visits`
  - Supports onsite and external care contexts, external referral metadata
  - Status, outcome, next-follow-up date and basic reminder metadata
- [x] Drizzle schema in `shared/schema.ts`
  - [x] `patientFollowUps` table definition
  - [x] `insertPatientFollowUpSchema`, `PatientFollowUp`, `InsertPatientFollowUp` types
- [x] Indexes for tenant, location, patient, scheduled date, status, care context

### 3.2 Backend API

- [x] **RBAC**: Employee wellbeing routes use `requirewellbeingRead` (medical_staff, safety_officer, admin) for GET and `requirewellbeingWrite` (medical_staff, admin) for POST/PUT/DELETE. Safety officers have read-only access to follow-ups.
- [x] Employee wellbeing follow-ups routes under `/api/wellbeing/follow-ups`
  - [x] List with filters: `tenantId`, `patientId`, `status`, `careContext`, `locationId`, date range, `dueOnly`
  - [x] Get single follow-up by id (with patient/employee/company/referral facility join)
  - [x] Create follow-up (onsite or external care)
  - [x] Update follow-up plan (type, scheduled date, reason, external fields)
  - [x] Record outcome (status, outcome code, notes, next follow-up date)
  - [x] Cancel and delete operations
- [x] Storage implementation (`storage.ts`)
  - [x] `createPatientFollowUp` (tenant-isolated, date normalization)
  - [x] `listPatientFollowUps` with tenant-scoped filters and joins
  - [x] `updatePatientFollowUp`, `deletePatientFollowUp`
  - [x] `listPatientFollowUps` supports `medicalVisitId` filter for visit-linked follow-ups

### 3.3 Frontend – Employee wellbeing Follow-Ups Page

- [x] **UI RBAC**: Add follow-up button and row write actions (edit, record outcome, complete, reopen, cancel, delete) hidden for safety_officer; only “View details” shown.
- [x] Follow-ups page (`wellbeingFollowUps.tsx`)
  - [x] Summary line: due count, overdue count, completed count (from current filtered list)
  - [x] Table with columns: subject, context, scheduled date, reason, referral facility, diagnosis, status, **next follow-up**, actions
  - [x] Filters: status, care context, “due/overdue only”, location
  - [x] Add follow-up dialog (onsite + external care)
  - [x] Record outcome dialog (status, outcome code, notes, next follow-up date)
  - [x] Edit plan dialog (care context, type, scheduled date, reason, external details)
  - [x] 3-dots menu: view details, edit plan, record outcome, complete, reopen, cancel, delete (with confirmations)
  - [x] “Next follow-up” column logic: shows the **scheduled date by default**, and only changes when a next follow-up date is explicitly set
- [x] Details view modal
  - [x] Branded, production-grade layout (MineAid colors, avatar header, cards, icons)
  - [x] Shows plan, status/outcome, external-care details, outcome notes

### 3.4 Automations & Integrations

- [x] **Medical visit → follow-up**
  - Schema:
    - [x] `medical_visits.follow_up_required` column via `20260311_medical_visit_follow_up_required.sql`
    - [x] Drizzle schema updated (`medicalVisits.followUpRequired`)
  - Storage logic:
    - [x] `createMedicalVisit`: when `followUpRequired = true` and `userId` present, auto-creates one `patient_follow_ups` row:
      - `patient_id` from visit, `medical_visit_id` = visit id, `location_id` from visit
      - `care_context = 'onsite'`
      - `reason` from `follow_up_instructions` or `chief_complaint`
      - `scheduled_date` from `follow_up_date` or default ≈ 7 days after visit date
    - [x] `updateMedicalVisit`: when updated visit has `followUpRequired = true`:
      - Checks for existing follow-up with this `medical_visit_id`
      - If none exists, creates the same follow-up as above (no duplicates)
  - UI:
    - [x] `MedicalVisit.tsx`: “Follow-up required” checkbox in disposition section, wired into visit payload
    - [x] `Records.tsx` and `PatientDetails.tsx`: edit-visit forms include a “Follow-up required” checkbox wired into update payload

- [x] **Incident → follow-up**
  - Schema:
    - [x] `incident_reports` already link to `patients` and `locations`
  - Storage logic:
    - [x] `createIncidentReport`: after incident creation (and notifications), auto-creates one `patient_follow_ups` row:
      - `patient_id` from incident, `location_id` from incident
      - `care_context = 'onsite'`, `follow_up_type = 'in_person'`
      - `reason = 'Post-incident recovery / return-to-work check'`
      - `scheduled_date` ≈ 7 days after `incident_date`
  - UI:
    - [x] No extra UI; follow-up appears in Employee wellbeing follow-ups list for that patient/location

### 3.5 Follow-up due notifications

- [x] **Notification type** `follow_up_due` (category `WELLBEING`) – added via `migrations/add_follow_up_due_notification_type.sql`. Users can enable/disable in notification preferences; if no preferences exist, tenant admins receive the digest (system-level type).
- [x] **Daily cron** (7:00 AM server time): `processAllTenantsFollowUpDueReminders(storage)` runs for all tenants. For each tenant, lists follow-ups that are due or overdue (`dueOnly: true`) and have not yet had a reminder sent (`reminder_sent_at` null). Sends one digest email per tenant with a table of follow-ups (patient, scheduled date, reason, context, due/overdue). After sending, sets `reminder_sent_at` on each follow-up so each is reminded only once until completed or rescheduled.
- [x] **Email template** `getFollowUpDueReminderEmail` in `server/emailTemplates.ts`; **trigger** and **cron** in `server/notificationTriggers.ts` and `server/cronJobs.ts`. Manual trigger: `triggerFollowUpDueRemindersManually(storage)` (e.g. from admin/super-admin if exposed).

---

## 4. Employee Work fitness & medications

**Plan reference**: `WELLBEING_MODULE_PLAN.md` – Medication declaration sections and integration points with safety.

### 4.1 Database & Schema

- [x] `employee_work_fitness_cases` table created via `20260310_WELLBEING_followups_and_feedback.sql`
- [x] Drizzle schema in `shared/schema.ts`
  - [x] Table definition with tenant/location, medication details, side effects, work impact, assessment status, supersession
  - [x] `InsertEmployeeMedicationDeclaration`, `EmployeeMedicationDeclaration` types

### 4.2 Backend API

- [x] **RBAC**: Work fitness & medications use the same read/write middleware. For `safety_officer`, list and list-by-employee return only declarations with `hasWorkImpact: true`; get-one returns 403 if the declaration has no work impact. Write operations (create, update, assess, supersede, delete) are restricted to medical_staff and admin.
- [x] Routes under `/api/wellbeing/medication-declarations`
  - [x] List declarations (by employee, location, status)
  - [x] Create declaration (resolves employee number → `employees.id` to avoid FK errors)
  - [x] Update declaration (corrections)
  - [x] Assess declaration (record work impact, restrictions, recommendations)
  - [x] Supersede or mark with-work-impact as needed

### 4.3 Frontend – Employee wellbeing Medications

- [x] **Employee wellbeing Medications page** (`wellbeingMedications.tsx`)
  - [x] List table wired to `/api/wellbeing/medication-declarations` (employee/company, medication, prescriber/facility, prescribed for, dates, work impact summary, status)
  - [x] Filters: status (all / declared / under_review / assessed / superseded), employee search
  - [x] Create declaration dialog: employee search (PatientSearchInput), medication fields (name, generic, strength, form, route, frequency), prescribed for, prescriber name, **prescriber facility** (dropdown from referral facilities + “Other” with conditional text input only when Other selected), dates, ongoing; “Save & add another” / “Save declaration”
  - [x] **View details** modal (read-only): separate from edit; shows full declaration and work impact/assessment; actions: Close, Assess, Edit declaration
  - [x] Edit declaration dialog: same fields as create, prescriber facility as dropdown + conditional “Other” input; Save changes
  - [x] **Assess** dialog: side effects noted, impact on work, work impact description, fitness impact, work restrictions and dates, cleared underground/heavy machinery, action taken, action notes, assessment notes; submits to assess API
  - [x] Row actions: View details, Assess, Edit declaration, Mark superseded, Delete declaration (with confirmation)
  - [x] Delete: AlertDialog confirmation; delete API wired
- [x] **Safety officer views** – API enforces read-only, work-impact-only for Work fitness & medications (backend RBAC). UI hides create/edit/assess/supersede/delete for safety_officer and shows work-impact-only banner.
- [x] Work-impact summary on Medications page (count “with work impact in list” in card description)
- [ ] **Reporting** – declarations with work impact by role/location, trends

### 4.4 Work fitness & medications – What’s Left

- [ ] Incident–declaration linkage
- [ ] Reporting slices and trends (per site, per role)
- [ ] Optional: bulk export, reminders for unassessed declarations

---

## 5. Employee Feedback & Surveys

**Plan reference**: `WELLBEING_MODULE_PLAN.md` – Feedback pillar and integration with visits and notifications.

### 5.1 Database & Schema

- [x] Feedback-related tables created via `20260310_WELLBEING_followups_and_feedback.sql`
  - [x] Core feedback storage for employee surveys and/or public feedback links
  - [x] Linkage to `patients`, `employees`, `medical_visits`, and locations

### 5.2 Backend API

- [x] **RBAC**: Feedback list and get-one use `requirewellbeingRead`; PATCH (update status/response) and POST share-poster use `requirewellbeingWrite`. Safety officers can view feedback but cannot update status or share the poster.
- [x] Routes under `/api/wellbeing/feedback`
  - [x] **GET /wellbeing/feedback/public-context** (public, no auth) – tenant branding (name, logo, appName) and active care locations, optionally scoped by `tenantId`
  - [x] **POST /wellbeing/feedback/submit** (public, no auth) – submit feedback (anonymous by default; ratings, would recommend/return, free text, care month/year, optional contact details)
  - [x] **GET /wellbeing/feedback** (auth) – list feedback with filters: locationId, status, fromDate, toDate
  - [x] **GET /wellbeing/feedback/:id** (auth) – get single feedback with location
  - [x] **PATCH /wellbeing/feedback/:id** (auth) – update status, responseToFeedback, reviewedBy
  - [x] **POST /wellbeing/feedback/share-poster** (auth) – email the tenant-specific feedback link and QR poster link to multi-selected employees, using MineAid-styled HTML emails with embedded logo
- [ ] Aggregate endpoints for dashboards (e.g. average rating, would-recommend % by location)
- [ ] Tokenized feedback URL sent after visits (optional)

### 5.3 Frontend

- [x] **Public feedback form** (route `/feedback`, no login required)
  - [x] Page at `/feedback` registered as a public route and rendered outside the dashboard layout
  - [x] Tenant-scoped via required `tenantId` query parameter; shows a clear message if the form is opened without a tenant context
  - [x] Branding: header uses tenant logo/name from `GET /api/wellbeing/feedback/public-context` (with MineAid fallback), plus “Powered by MineAid HMS” footer
  - [x] Location dropdown sourced from `public-context` locations when available, with a hardcoded fallback list and “Other” + free-text location when tenant locations are not configured
  - [x] Ratings 1–5 with full-sentence prompts: overall experience, staff courtesy, **timeliness of care**, environment & cleanliness, explanation clarity, perceived safety, and supplies/medications availability
  - [x] Would recommend / would return (yes/no)
  - [x] Optional care access month/year (`<input type="month">`) persisted in `responses.careMonthYear`
  - [x] “Would you like to be contacted?” toggle with optional email/phone; when “No”, submission remains anonymous
  - [x] Clear error messaging based on API response; thank-you state on success
- [x] **Employee wellbeing Feedback page** (staff, under Employee wellbeing)
  - [x] **UI RBAC**: For safety_officer, detail modal shows status and response as read-only; Save button hidden.
  - [x] Filterable table: date, location, anonymous, overall rating, would recommend, comments snippet, status
  - [x] Filters: location, status, from/to date
  - [x] “View” opens drill-down modal with full ratings, comments, status, response to feedback
  - [x] Update status (new, in_review, acknowledged, resolved, closed) and response text; Save
  - [x] Tabs: **Results** (table) and **Analytics** (charts and summary)
  - [x] Analytics tab:
    - [x] Key metrics cards (total submissions, new, in progress, resolved/closed)
    - [x] Average ratings bar chart, submissions-by-location pie chart, submissions-over-time line chart (Recharts)
    - [x] “Key insights & recommendations” section generated from current metrics
  - [x] Header links: open public feedback form in new tab and open print-ready poster page
- [x] **Employee wellbeing Feedback poster page** (`/wellbeing/feedback-poster`)
  - [x] **UI RBAC**: “Share digitally with employees” card (employee picker + Send link & poster) hidden for safety_officer.
  - [x] Tenant-branded, print-ready page with large QR code pointing to the tenant-specific `/feedback?tenantId=…` link
  - [x] Layout tuned for A4/US Letter printing and export to PDF via browser print
- [ ] Survey UI (multi-question survey builder, tokenized link per visit)

---

## 6. UX, Navigation & Dashboards

### 6.1 Navigation & Shell

- [x] Employee wellbeing section visible in main sidebar
- [x] Route shells for:
  - [x] Follow-ups
  - [x] Medications
  - [x] Feedback (list, filters, detail modal; public form at /feedback)

### 6.2 Planned Enhancements

- [x] Employee wellbeing overview dashboard
  - [x] **UI RBAC**: Read-only banner for safety_officer (“You have read-only access to Employee wellbeing data…”).
  - [x] Cards for: due/overdue follow-ups, medications with work impact/under review, recent feedback
  - [x] Quick links into detailed pages for follow-ups, medications, and feedback
  - [x] Recent lists: due follow-ups, medications with work impact, recent feedback comments
  - [ ] (Optional) Card(s) for new incidents with pending follow-ups
- [ ] More prominent surfacing of auto-created follow-ups in:
  - [ ] Medical visit details modal and Records screens
  - [ ] Incident details page

---

## 7. Immediate Next Steps

- **Backend**
  - [x] Employee feedback API (public submit + staff list/get/patch) – done
  - [x] Follow-up due/overdue reminder logic (daily digest, notification type `follow_up_due`, cron 7:00 AM)
  - [ ] (Optional) Work fitness & medications: reporting endpoints (by location, status, work impact)
  - [ ] (Optional) Feedback: aggregate/NPS endpoints, tokenized visit links

- **Frontend**
  - [x] Public feedback form at /feedback and Employee wellbeing Feedback page – done
  - [x] Employee wellbeing dashboard-style overview cards (due follow-ups, open Work fitness & medications, recent feedback) – done
  - [x] UI RBAC for Employee wellbeing: safety_officer sees read-only experience (no add/edit/delete/assess/share) on Follow-ups, Medications, Feedback, Feedback poster, Dashboard – done
  - [ ] (Optional) Work fitness & medications: reporting UI (trends, by location)

- **Documentation**
  - [x] Keep `WELLBEING_MODULE_PLAN.md` as the design source of truth
  - [x] Use this `WELLBEING_IMPLEMENTATION_STATUS.md` file to track implementation progress
  - [x] Implementation status updated to reflect Medications UI completion (Feb 2026)
  - [x] Implementation status updated to reflect Employee Feedback (public + staff) completion, analytics, QR poster, and email sharing (Feb 2026)

