# MineAid HMS - Employee Wellbeing Module Comprehensive Plan
## Employee Wellbeing, Follow-Up, Medication Declaration & Feedback

**Version:** 1.0.0  
**Status:** In progress – Phase 1–3 partially implemented (see `WELLBEING_IMPLEMENTATION_STATUS.md`)  
**Last Updated:** February 25, 2026  
**Target Implementation:** Q2–Q3 2026

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Features & Functionality](#features--functionality)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [User Workflows](#user-workflows)
8. [Integration Points](#integration-points)
9. [Security & Compliance](#security--compliance)
10. [Reporting & Analytics](#reporting--analytics)
11. [Implementation Phases](#implementation-phases)
12. [Dependencies & Prerequisites](#dependencies--prerequisites)
13. [Success Metrics](#success-metrics)
14. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
15. [Future Enhancements](#future-enhancements)

---

## Executive Overview

### Purpose
The Employee wellbeing module supports employee wellbeing and continuity of care by (1) making employees feel valued and cared for by the on-site health team, (2) enabling follow-up and tracking of patients who have visited the facility and of external/referred patients, (3) documenting and assessing employee medications for work-impacting side effects, and (4) capturing employee feedback to improve on-site treatment services.

### Key Objectives
- **Employee wellbeing** – Central place for “Employee wellbeing” so staff feel at home and that the health team cares.
- **Follow-up & tracking** – Check on patients who visited the facility; track external patients (e.g. seen elsewhere and referred to a higher facility) to ensure they are doing well.
- **Medication declaration** – Employees declare prescribed medications; health personnel document, assess side effects (SE) that may impact work, and advise (e.g. med replacement, additional sick leave).
- **Employee feedback** – Client-satisfaction-style surveys and feedback to improve services at locations where employees receive treatment.

### Business Value
- Improve employee satisfaction and sense of being valued.
- Reduce lost follow-ups and improve outcomes for referred/external patients.
- Safer workplace through documented medication side-effect assessment and work restrictions.
- Data-driven improvement of on-site care via structured feedback.

### Target Users
- **Medical staff / health personnel** – Document meds, assess SE, schedule and record follow-ups, view feedback.
- **Nurses / clinic coordinators** – Schedule follow-up calls/visits, add external patients, send surveys.
- **Safety officers** – View work-impact assessments from Work fitness & medications (where relevant).
- **Administrators** – Reports on follow-up completion, Work fitness & medications, feedback trends.
- **Employees (as patients)** – Declare medications, complete feedback surveys (optional self-service).

---

## System Architecture

### Multi-Tenant & Multi-Location Design

```
MineAid Admin (Super Admin)
    ↓
Tenants (Mining Sites)
    ↓
Care Locations (Clinics / Aid Stations)
    ↓
Employee wellbeing Module
    ├── Follow-ups (in-system patients + external patients)
    ├── Employee Work fitness & medications (tenant & location)
    ├── Feedback / surveys (per location)
    └── Dashboards & reports (tenant isolated)
```

### Data Isolation Strategy

**Tenant isolation**
- All Employee wellbeing data includes `tenant_id`.
- Queries filtered by current user’s tenant.
- No cross-tenant access at DB or API level.

**Location awareness**
- Follow-ups and feedback can be scoped by care location.
- Work fitness & medications are tenant-scoped; assessment may reference location (e.g. where declared or where restrictions apply).

### Technology Stack

**Extends existing stack**
- PostgreSQL (Drizzle ORM)
- Express.js REST API
- React + TypeScript frontend
- React Query, Shadcn UI, Zod

**Optional / future**
- Lightweight survey UI (forms); no mandatory new runtime dependencies for Phase 1.

---

## Database Schema

### Core Employee wellbeing Tables

#### 1. Patient Follow-Ups (onsite and external care)

Tracks planned and completed follow-ups for employees/patients who are **“Employee wellbeing”**—both for onsite MineAid visits and for care that occurred externally (e.g. referred hospital). Even if an employee has not yet been registered as a patient, follow-up creation will **auto-register them as a patient** and tie the follow-up to that record.

```sql
CREATE TABLE patient_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id),

  -- Subject: always an in-system patient (auto-created if needed)
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),  -- When patient is an employee
  medical_visit_id UUID REFERENCES medical_visits(id) ON DELETE SET NULL,

  -- Care context: where the relevant care happened
  care_context VARCHAR NOT NULL DEFAULT 'onsite',  -- onsite, external

  -- External care details (when care_context = 'external')
  external_referral_facility_id UUID REFERENCES referral_facilities(id), -- Referred-to facility
  external_referral_facility_other TEXT,                                  -- Free text when needed
  external_diagnosis TEXT,                                                -- Diagnosis at external facility
  external_referral_reason TEXT,                                          -- Why referred / seen externally
  external_referral_date DATE,                                            -- Date seen / referred externally
  external_referral_identifier VARCHAR,                                   -- e.g. hospital ID, referral number

  -- Follow-up plan
  follow_up_type VARCHAR NOT NULL,  -- phone_call, in_person, telehealth
  reason TEXT NOT NULL,             -- e.g. post-discharge, post-referral, wound check
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  due_by_date DATE,
  priority VARCHAR DEFAULT 'normal',  -- low, normal, high, urgent

  -- Outcome
  status VARCHAR NOT NULL DEFAULT 'scheduled',  -- scheduled, completed, cancelled, no_answer, rescheduled
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  outcome_notes TEXT,
  outcome_code VARCHAR,   -- e.g. improved, stable, needs_revisit, admitted, deceased
  next_follow_up_date DATE,

  -- Reminders
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),

  CONSTRAINT follow_up_patient_required CHECK (patient_id IS NOT NULL),
  CONSTRAINT follow_up_care_context_valid CHECK (care_context IN ('onsite', 'external'))
);

CREATE INDEX idx_follow_ups_tenant ON patient_follow_ups(tenant_id);
CREATE INDEX idx_follow_ups_location ON patient_follow_ups(location_id);
CREATE INDEX idx_follow_ups_patient ON patient_follow_ups(patient_id);
CREATE INDEX idx_follow_ups_scheduled ON patient_follow_ups(scheduled_date);
CREATE INDEX idx_follow_ups_status ON patient_follow_ups(status);
CREATE INDEX idx_follow_ups_care_context ON patient_follow_ups(care_context);
```

#### 2. Employee Work fitness & medications

Employees declare prescribed medications; health personnel document and assess work impact.

```sql
CREATE TABLE employee_work_fitness_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id),  -- Where declared / assessed

  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  declared_at TIMESTAMP NOT NULL DEFAULT NOW(),
  declared_by_employee BOOLEAN DEFAULT true,  -- vs entered by staff on behalf

  -- Medication (free text or link to formulary if pharmacy module exists)
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR,
  strength VARCHAR,
  dosage_form VARCHAR,
  route VARCHAR,
  frequency VARCHAR,           -- e.g. twice daily
  prescribed_for TEXT,         -- indication
  prescriber_name VARCHAR,
  prescriber_facility VARCHAR,
  start_date DATE,
  expected_end_date DATE,
  is_ongoing BOOLEAN DEFAULT true,

  -- Side effects & work impact (filled by health personnel)
  side_effects_noted TEXT,
  side_effects_impact_work BOOLEAN,
  work_impact_description TEXT,  -- e.g. drowsiness, dizziness
  fitness_impact VARCHAR,       -- none, temporary_restriction, light_duty, unfit_specific_task, unfit_duty
  work_restrictions TEXT,
  restriction_start_date DATE,
  restriction_end_date DATE,
  cleared_underground BOOLEAN,
  cleared_heavy_machinery BOOLEAN,

  -- Clinical action
  assessed_at TIMESTAMP,
  assessed_by UUID REFERENCES users(id),
  assessment_notes TEXT,
  action_taken VARCHAR,  -- documented_only, med_replacement_suggested, sick_leave_recommended, referral, other
  action_notes TEXT,

  -- Status
  status VARCHAR DEFAULT 'declared',  -- declared, under_review, assessed, superseded
  superseded_by UUID REFERENCES employee_work_fitness_cases(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id)
);

CREATE INDEX idx_emp_med_tenant ON employee_work_fitness_cases(tenant_id);
CREATE INDEX idx_emp_med_employee ON employee_work_fitness_cases(employee_id);
CREATE INDEX idx_emp_med_location ON employee_work_fitness_cases(location_id);
CREATE INDEX idx_emp_med_status ON employee_work_fitness_cases(status);
CREATE INDEX idx_emp_med_work_impact ON employee_work_fitness_cases(side_effects_impact_work);
```

#### 3. Employee Feedback Surveys (Definition) and Feedback (Responses)

Survey definitions (tenant-level); then feedback records linking to survey and/or free text.

```sql
CREATE TABLE employee_feedback_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  questions JSONB NOT NULL,  -- [{ id, type, text, options, required }]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employee_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id),

  -- Who gave feedback (optional for anonymity)
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  medical_visit_id UUID REFERENCES medical_visits(id) ON DELETE SET NULL,
  anonymous BOOLEAN DEFAULT false,

  -- When and where
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feedback_type VARCHAR NOT NULL DEFAULT 'survey',  -- survey, free_text, complaint, compliment

  -- Structured survey (optional)
  survey_id UUID REFERENCES employee_feedback_surveys(id),
  responses JSONB,  -- { "question_id": "rating" or "choice_id" or "text" }

  -- Overall and dimension ratings (simple 1–5 scales)
  overall_experience_rating INTEGER,      -- 1–5 overall experience
  staff_courtesy_rating INTEGER,          -- 1–5 how staff treated them
  wait_time_rating INTEGER,               -- 1–5 perception of wait time
  environment_cleanliness_rating INTEGER, -- 1–5 cleanliness / environment
  explanation_clarity_rating INTEGER,     -- 1–5 how clearly things were explained
  perceived_safety_rating INTEGER,        -- 1–5 feeling of safety during visit
  would_recommend BOOLEAN,
  would_return BOOLEAN,

  -- Free-text feedback
  free_text_feedback TEXT,

  -- Categorization for reporting (easily filterable)
  primary_category VARCHAR,    -- e.g. wait_time, staff_courtesy, cleanliness, treatment_quality, environment, communication, access
  secondary_category VARCHAR,  -- optional sub-area
  sentiment VARCHAR,           -- positive, neutral, negative (optional, can be auto-derived)
  tags TEXT[],

  -- Follow-up
  status VARCHAR DEFAULT 'new',  -- new, in_review, acknowledged, resolved, closed
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  response_to_feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_tenant ON employee_feedback(tenant_id);
CREATE INDEX idx_feedback_location ON employee_feedback(location_id);
CREATE INDEX idx_feedback_date ON employee_feedback(feedback_date);
CREATE INDEX idx_feedback_type ON employee_feedback(feedback_type);
CREATE INDEX idx_feedback_rating ON employee_feedback(overall_rating);
CREATE INDEX idx_feedback_status ON employee_feedback(status);
```

#### 4. Employee wellbeing Audit / Activity (Optional)

Optional lightweight log for key actions (follow-up completed, medication assessed, feedback submitted) for dashboards and accountability.

```sql
CREATE TABLE WELLBEING_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id),

  action_type VARCHAR NOT NULL,  -- follow_up_scheduled, follow_up_completed, medication_declared, medication_assessed, feedback_submitted
  entity_type VARCHAR NOT NULL,  -- patient_follow_up, employee_medication_declaration, employee_feedback
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_WELLBEING_activity_tenant ON WELLBEING_activity_log(tenant_id);
CREATE INDEX idx_WELLBEING_activity_entity ON WELLBEING_activity_log(entity_type, entity_id);
CREATE INDEX idx_WELLBEING_activity_created ON WELLBEING_activity_log(created_at);
```

---

## Features & Functionality

### Pillar 1: Employee wellbeing Hub & Wellbeing

- **Employee wellbeing dashboard** – Entry point: follow-ups due, recent medication assessments, feedback summary, quick actions.
- **Employee-centric view** – For health staff: see employee’s visits, follow-ups, declared meds, and feedback in one place (where permitted).
- **Wellbeing messaging** – Optional short messages or links (e.g. “We care about your health”) on the hub; no complex content management in Phase 1.

### Pillar 2: Employee Follow-Up & Tracking

#### 2.1 In-System Patient Follow-Up
- Create follow-up from a medical visit (auto-link patient and visit).
- Schedule by type: phone call, in-person, telehealth.
- Set priority, due date, and reason.
- List: overdue, due today, upcoming; filter by patient, location, status.
- Complete follow-up with outcome (improved, stable, needs revisit, etc.) and next follow-up date.
- Optional reminder (e.g. task or notification) for due follow-ups.

#### 2.2 External Patient Tracking
- Add follow-up for **external care**: select the person from dropdowns (patient or employee number / ID), then choose referral facility, diagnosis, and referral date.
- If the selected employee does **not** yet have a patient record, automatically create a `patient` linked to that employee, then create the follow-up.
- Same scheduling and outcome workflow as in-system follow-ups.
- List and filter external-care follow-ups separately or combined with onsite.
- Link to `referral_facilities` master where applicable.

### Pillar 3: Employee Work Fitness & Medications

> **v2.0 (June 2026):** Rebuilt as case-based **work fitness** reviews. See [EMPLOYEE_WORK_FITNESS_MEDICATIONS.md](./EMPLOYEE_WORK_FITNESS_MEDICATIONS.md).

- **Purpose** – Ensure employees are **fit for work** after illness; medications and side effects drive return-to-work decisions; support **drug-test exoneration** when meds contain detectable substances.
- **Employee submission** – Case with context, wellbeing notes, and one or more medications each with **employee-reported side effects** (or none).
- **Clinical review** – Holistic assessment: fitness outcome, restrictions, underground/machinery clearance, drug-test disclosure, actions.
- **Safety view** – Read-only access to cases with work impact or drug-test relevance.
- **History** – Cases per employee; statuses from submitted through assessed/closed.

### Pillar 4: Employee Feedback

- **Surveys** – Configurable survey (tenant-level): questions (rating, choice, free text); one active version per survey.
- **Submission** – After visit, from Employee wellbeing hub, or from a **public feedback page**: submit survey responses and optional free text; optional anonymous.
- **Free-text feedback** – Standalone feedback (compliment/complaint) with category/tags and optional link to visit.
- **Review workflow** – Status: new → in_review → acknowledged → resolved/closed; response to feedback; optional assignment to reviewer.
- **Public, QR-friendly access** – Public feedback form route (no auth) for QR codes on posters/cards and shareable links; visits can generate invite links that prefill location/visit context.

---

## API Endpoints

### Follow-Ups

```typescript
GET    /api/wellbeing/follow-ups                    // List (tenant + location filter)
GET    /api/wellbeing/follow-ups/:id                // Get one
POST   /api/wellbeing/follow-ups                    // Create (in-system or external)
PUT    /api/wellbeing/follow-ups/:id                // Update
PUT    /api/wellbeing/follow-ups/:id/complete      // Mark completed + outcome
PUT    /api/wellbeing/follow-ups/:id/cancel        // Cancel
GET    /api/wellbeing/follow-ups/patient/:patientId // By patient
GET    /api/wellbeing/follow-ups/due                // Overdue / due today
GET    /api/wellbeing/follow-ups/external           // External only
```

### Employee Work Fitness (replaces Work fitness & medications)

```typescript
GET    /api/wellbeing/work-fitness
GET    /api/wellbeing/work-fitness/:id
GET    /api/wellbeing/work-fitness/employee/:employeeId
POST   /api/wellbeing/work-fitness
PUT    /api/wellbeing/work-fitness/:id
PUT    /api/wellbeing/work-fitness/:id/assess   // Complete or update clinical review
DELETE /api/wellbeing/work-fitness/:id
```

### Employee Feedback

```typescript
// Feedback (internal, authenticated)
GET    /api/wellbeing/feedback                 // List (tenant, location, date, type, status)
GET    /api/wellbeing/feedback/:id             // Get one
POST   /api/wellbeing/feedback                 // Submit (survey or free text)
PUT    /api/wellbeing/feedback/:id             // Update (e.g. status, response)
PUT    /api/wellbeing/feedback/:id/review      // Set reviewed + response
GET    /api/wellbeing/feedback/summary         // Aggregates by location/period (for dashboard)
GET    /api/wellbeing/surveys                  // List surveys (tenant)
GET    /api/wellbeing/surveys/:id              // Get survey definition
POST   /api/wellbeing/surveys                  // Create survey (admin)
PUT    /api/wellbeing/surveys/:id              // Update survey

// Public feedback (no auth, token-aware where applicable)
POST   /api/wellbeing/feedback/public          // Submit feedback from public page (optionally with invite token)
GET    /api/wellbeing/feedback/invite/:token   // Resolve invite token → visit/location context (optional)
```

### Employee wellbeing Dashboard / Activity

```typescript
GET    /api/wellbeing/dashboard                // Counts: follow-ups due, declarations pending review, feedback new
GET    /api/wellbeing/activity                 // Recent activity (optional)
```

---

## Frontend Components

### Page Components

| Component | Description |
|----------|-------------|
| **wellbeingDashboard.tsx** | Hub: follow-ups due, Work fitness & medications pending review, feedback summary, quick links. |
| **FollowUpList.tsx** | List follow-ups with filters (patient/employee, care context, status, date); actions: complete, cancel, reschedule. |
| **FollowUpForm.tsx** | Create/edit follow-up; always select patient/employee from dropdowns, then capture onsite vs external care details (facility, diagnosis, referral date). |
| **FollowUpCompleteForm.tsx** | Record outcome, notes, next follow-up date. |
| **MedicationDeclarationList.tsx** | List declarations by employee or all; filter by status, work impact. |
| **MedicationDeclarationForm.tsx** | Enter or edit declaration (medication, indication, prescriber, dates). |
| **MedicationAssessmentForm.tsx** | Side effects, work impact, restrictions, action taken. |
| **EmployeeFeedbackList.tsx** | List feedback with filters (location, type, status, date); review/respond. |
| **EmployeeFeedbackForm.tsx** | Submit survey or free-text feedback; optional anonymous; used in both authenticated and public views. |
| **PublicFeedbackPage.tsx** | Public, QR-friendly feedback page (no auth); can read invite token to link feedback to visit/location. |
| **FeedbackSurveyBuilder.tsx** | Admin: create/edit survey questions (type, options, required). |
| **wellbeingReports.tsx** | Simple reports: follow-up completion, declarations with work impact, feedback by location/period. |

### Reusable Components

- **FollowUpCard** – Summary of one follow-up (patient/external, date, status, quick complete).
- **MedicationDeclarationCard** – One declaration with assess button and restriction badges.
- **FeedbackRatingDisplay** – Show overall rating and would-recommend.
- **SurveyRenderer** – Render survey from definition and collect responses.

---

## User Workflows

### Workflow 1: Schedule and Complete Follow-Up (In-System Patient)

```
1. From Medical Visit or Employee wellbeing:
   → Create follow-up, select patient (and optional visit), type, date, reason.

2. List view:
   → See due/overdue follow-ups; open one.

3. Complete follow-up:
   → Set outcome (e.g. improved, needs revisit), notes, next follow-up if needed.
   → Status → completed.
```

### Workflow 2: Add and Track External Patient (Referred Out)

```
1. Employee wellbeing → Follow-ups → Add external care:
   → Select employee/patient from searchable dropdown (by patient ID / employee number / name).
   → Choose referral facility (or \"Other\"), diagnosis, referral date, and referral reason.
   → Set follow-up type, scheduled date, reason.

2. If selected employee has no patient record:
   → System auto-creates a `patient` linked to that employee, then creates the follow-up.

3. On due date:
   → Complete with outcome and next steps (e.g. call again in 1 week).
```

### Workflow 3: Employee Declares Medication & Health Personnel Assess

```
1. Employee (or staff on behalf):
   → Submit declaration: medication name, indication, prescriber, start/end, frequency.

2. Health personnel:
   → Open declaration → Assess: side effects, impact on work, fitness level, restrictions, clearance (e.g. underground, machinery).
   → Choose action: documented only, replacement suggested, sick leave, referral.
   → Save; status → assessed.
```

### Workflow 4: Employee Submits Feedback and Staff Responds

```
1. Employee (after visit, from hub, or via public QR/link):
   → Open feedback form; complete survey (if any) and/or free text; optional anonymous.

2. Staff:
   → Feedback list → Filter by new/in_review.
   → Open → Add response, set status (acknowledged, resolved, closed).
```

### Workflow 5: Public Feedback via QR / Auto-Link

```
1. Clinic staff:
   → Display QR codes or short links to the public feedback page in waiting/treatment areas.

2. After a medical visit:
   → System generates an optional feedback invite token tied to that visit/location.
   → Notification system (SMS/email/other) sends the invite link to the employee, where enabled.

3. Employee:
   → Opens link (no login required); token pre-fills location/visit context when present.
   → Submits rating and comments; feedback is stored and visible in internal feedback list.
```

---

## Integration Points

### 1. Medical Visits
- When a visit is documented with `follow_up_required = true`, automatically create a follow-up linked to `medical_visit_id` and `patient_id` (type, reason, ideal timeframe).
- UI: “Follow-up required” toggle and basic fields on visit disposition/closure; auto-create and surface in Employee wellbeing follow-ups list.
- Visits can also trigger **feedback invites** (public feedback link) after completion, using the notification system where enabled.

### 2. Patients & Employees
- Follow-ups: always store `patient_id` (auto-created where needed); optional `employee_id` when the patient is an employee.
- Work fitness & medications: `employee_id`; link to employee/patient profile for combined view.
- Feedback: optional `patient_id`, `employee_id`, `medical_visit_id`.

### 3. Referral Facilities
- External-care follow-ups: `external_referral_facility_id` from `referral_facilities`.
- Use for dropdown selection, diagnosis/referral documentation, and reporting.

### 4. Care Locations
- Follow-ups and feedback scoped by `location_id`; use active session location where appropriate.

### 5. Notifications (Optional)
- Remind assignee when follow-up is due; optional digest of declarations pending assessment.
- Send feedback invite links (public feedback URL + optional token) to employees after visits, where policy allows.

### 6. Pharmacy Module (Future)
- If formulary exists: optional link from medication declaration to formulary for drug name/SE info; not required for Phase 1.

### 7. Safety / Incidents
- Safety officers: read-only view of declarations with work impact and restrictions (if permitted by RBAC).
- All incidents automatically create at least one Employee wellbeing follow-up (e.g. post-incident recovery / RTW check) for the involved employee/patient.

---

## Security & Compliance

### Tenant Isolation
- All queries filtered by `tenant_id` from current user.
- No cross-tenant reads or writes.

### Role-Based Access (RBAC)

| Role | Follow-ups | Work fitness & medications | Feedback |
|------|------------|---------------------------|----------|
| medical_staff | CRUD, complete | CRUD, assess | Read, review, respond |
| safety_officer | Read (optional) | Read work-impact only (optional) | Read (optional) |
| admin | Full | Full | Full, survey management |

**Implementation details** (middleware, safety-officer work-impact filtering, and UI behaviour) are documented in **`WELLBEING_IMPLEMENTATION_STATUS.md` – Section 2. Employee wellbeing RBAC**.

### Data Privacy
- Work fitness & medications: sensitive; only authorized health and safety roles.
- Feedback: anonymous option; avoid exposing identity in exports unless required.
- Audit: log who created/assessed declarations and who reviewed feedback (optional `WELLBEING_activity_log`).

### Compliance
- Align with local occupational health and data protection (e.g. consent for storing medication data).
- Retention: define retention for follow-ups, declarations, and feedback (e.g. 7 years for clinical-related).

---

## Reporting & Analytics

### Dashboard Metrics
- Follow-ups: overdue count, due today, completed this week.
- Work fitness & medications: pending assessment, count with work impact (current).
- Feedback: new count, average rating (e.g. last 30 days), would-recommend %.

### Reports
- **Follow-up completion** – By location, period; overdue list.
- **External follow-ups** – By referral facility, outcome.
- **Work fitness & medications** – By employee, by work-impact status; list with restrictions.
- **Feedback** – By location, period; rating distribution; free-text themes (manual or tagged).

---

## Implementation Phases

### Phase 1: Foundation & Follow-Ups (Weeks 1–6)
- [ ] DB migrations: `patient_follow_ups`, `employee_work_fitness_cases`, `employee_feedback`, `employee_feedback_surveys`, optional `WELLBEING_activity_log`.
- [ ] APIs: follow-ups CRUD + complete/cancel; list by patient, due, external.
- [ ] Employee wellbeing dashboard (basic): follow-ups due, quick add.
- [ ] Follow-up list and form (in-system + external); complete outcome form.
- [ ] Integration: create follow-up from medical visit (optional).
- [ ] RBAC for follow-ups.

### Phase 2: Work fitness & medications (Weeks 7–10)
- [ ] APIs: Work fitness & medications CRUD + assess + supersede; by employee, with-work-impact.
- [ ] Declaration form (employee or staff); assessment form (SE, work impact, action).
- [ ] List declarations by employee; show on employee/patient profile where appropriate.
- [ ] Dashboard: declarations pending assessment.
- [ ] RBAC and privacy for declarations.

### Phase 3: Employee Feedback (Weeks 11–14)
- [ ] Survey table and API; survey CRUD.
- [ ] Feedback API: submit, list, review, respond.
- [ ] Feedback form (survey + free text, anonymous option).
- [ ] Survey builder (admin).
- [ ] Feedback list and review workflow; dashboard summary.
- [ ] RBAC for feedback and surveys.

### Phase 4: Polish & Reports (Weeks 15–18)
- [ ] Reports: follow-up completion, external follow-ups, declarations with work impact, feedback by location/period.
- [ ] Notifications: optional follow-up reminders.
- [ ] UX polish, help text, and basic documentation.
- [ ] Pilot with one location; iterate.

---

## Dependencies & Prerequisites

### Existing Modules
- Multi-tenant and care locations.
- Patients, employees, medical visits.
- Referral facilities (for external follow-up).
- User auth and RBAC.
- Optional: notification system for reminders.

### New Dependencies
- None mandatory; optional: chart library for feedback trends if desired.

---

## Success Metrics

### Operational
- % of post-visit follow-ups scheduled (where policy requires).
- % of scheduled follow-ups completed on time.
- % of external follow-ups with at least one completed contact.

### Medication Safety
- % of declarations assessed within X days.
- Number of work restrictions documented; reduction in incidents linked to unreported meds (qualitative).

### Satisfaction
- Employee feedback response rate (if surveys are offered).
- Average rating and would-recommend % by location; trend over time.

### Engagement
- Employee wellbeing dashboard usage (e.g. weekly active users in module).

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption of medication declaration | Medium | High | Communicate purpose (safety, support); allow staff to enter on behalf; keep form short. |
| Follow-ups not completed on time | Medium | Medium | Reminders, dashboard prominence, simple list of overdue. |
| Feedback perceived as not anonymous | Low | High | Clear “anonymous” option; restrict who can see identity. |
| Work-impact data used punitively | Low | High | Policy: purpose is safety and support; limit safety officer access to what’s needed. |

---

## Future Enhancements

- SMS/email reminders for follow-ups; optional employee self-service to confirm outcome.
- Employee self-service: declare medications, view own follow-ups, submit feedback from portal.
- Integration with pharmacy formulary for drug lookup and common SE.
- Anonymous feedback dashboards by location (no individual identifiers).
- Scheduled reports (e.g. weekly follow-up and feedback summary to location managers).
- Mobile-friendly forms for follow-up completion and feedback in the field.
- Simple care/follow-up plans for selected employees (2–3 key goals, next review date, responsible clinician).
- Risk and priority flags (e.g. frequent visits, serious incidents, chronic conditions) to highlight employees needing closer monitoring.
- Testing integration: auto-create Employee wellbeing follow-ups for abnormal/positive drug, alcohol, or hydration tests to support counselling and RTW checks.
- Unified “story view” per employee: timeline of visits, incidents, follow-ups, Work fitness & medications, and feedback.
- Manager-facing work fitness summary that aggregates active restrictions from visits, incidents, and Work fitness & medications.

---

## Conclusion

The Employee wellbeing module supports employee wellbeing and continuity of care through:

- **Follow-ups** – No one falls through the cracks: in-system and external patients are tracked and contacted.
- **Work fitness & medications** – Side effects that may impact work are documented and acted on (advice, restrictions, referrals).
- **Feedback** – Structured surveys and free text improve on-site care and show employees their voice matters.

Implementation in four phases (follow-ups → Work fitness & medications → feedback → reports and polish) keeps scope manageable and delivers value incrementally.

---

**Next Steps**
1. Review and approve this plan.
2. Confirm RBAC and privacy rules (especially safety officer and anonymous feedback).
3. Implement Phase 1 (DB, APIs, follow-up UI and dashboard).
4. Pilot with one care location and iterate.

**Estimated Timeline:** 18 weeks from kickoff to pilot-ready.  
**Team:** 1–2 full-stack developers; input from clinical/safety for workflows and compliance.

---

*This plan is a living document and will be updated as requirements and implementation evolve.*

**Document Version:** 1.0.0  
**Last Updated:** February 25, 2026  
**Status:** Planning Phase – Awaiting Approval
