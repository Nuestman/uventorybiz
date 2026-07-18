-- Our People module core tables: patient follow-ups, employee medication declarations,
-- employee feedback surveys, and employee feedback.

-- 1. Patient follow-ups (onsite + external care)
CREATE TABLE IF NOT EXISTS patient_follow_ups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR REFERENCES care_locations(id),

  -- Subject: always an in-system patient (auto-created if needed)
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  employee_id VARCHAR REFERENCES employees(id),
  medical_visit_id VARCHAR REFERENCES medical_visits(id) ON DELETE SET NULL,

  -- Care context: where the relevant care happened
  care_context VARCHAR NOT NULL DEFAULT 'onsite', -- onsite, external

  -- External care details (when care_context = 'external')
  external_referral_facility_id VARCHAR REFERENCES referral_facilities(id),
  external_referral_facility_other TEXT,
  external_diagnosis TEXT,
  external_referral_reason TEXT,
  external_referral_date DATE,
  external_referral_identifier VARCHAR,

  -- Follow-up plan
  follow_up_type VARCHAR NOT NULL, -- phone_call, in_person, telehealth
  reason TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR,
  due_by_date DATE,
  priority VARCHAR DEFAULT 'normal', -- low, normal, high, urgent

  -- Outcome
  status VARCHAR NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_answer, rescheduled
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR REFERENCES users(id),
  outcome_notes TEXT,
  outcome_code VARCHAR,
  next_follow_up_date DATE,

  -- Reminders & metadata
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON patient_follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_location ON patient_follow_ups(location_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON patient_follow_ups(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON patient_follow_ups(tenant_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON patient_follow_ups(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_care_context ON patient_follow_ups(tenant_id, care_context);

-- 2. Employee medication declarations
CREATE TABLE IF NOT EXISTS employee_medication_declarations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR REFERENCES care_locations(id),

  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  declared_by_employee BOOLEAN DEFAULT TRUE,

  -- Medication details
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR,
  strength VARCHAR,
  dosage_form VARCHAR,
  route VARCHAR,
  frequency VARCHAR,
  prescribed_for TEXT,
  prescriber_name VARCHAR,
  prescriber_facility VARCHAR,
  start_date DATE,
  expected_end_date DATE,
  is_ongoing BOOLEAN DEFAULT TRUE,

  -- Side effects & work impact
  side_effects_noted TEXT,
  side_effects_impact_work BOOLEAN,
  work_impact_description TEXT,
  fitness_impact VARCHAR,
  work_restrictions TEXT,
  restriction_start_date DATE,
  restriction_end_date DATE,
  cleared_underground BOOLEAN,
  cleared_heavy_machinery BOOLEAN,

  -- Clinical action
  assessed_at TIMESTAMPTZ,
  assessed_by VARCHAR REFERENCES users(id),
  assessment_notes TEXT,
  action_taken VARCHAR,
  action_notes TEXT,

  -- Status
  status VARCHAR DEFAULT 'declared',
  superseded_by VARCHAR REFERENCES employee_medication_declarations(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id VARCHAR REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_emp_med_tenant ON employee_medication_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_med_employee ON employee_medication_declarations(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_med_location ON employee_medication_declarations(tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_emp_med_status ON employee_medication_declarations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_med_work_impact ON employee_medication_declarations(tenant_id, side_effects_impact_work);

-- 3. Employee feedback surveys
CREATE TABLE IF NOT EXISTS employee_feedback_surveys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_feedback_surveys_tenant ON employee_feedback_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_feedback_surveys_active ON employee_feedback_surveys(tenant_id, is_active);

-- 4. Employee feedback (Our People)
CREATE TABLE IF NOT EXISTS employee_feedback (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR NOT NULL REFERENCES care_locations(id),

  -- Who gave feedback (optional for anonymity)
  patient_id VARCHAR REFERENCES patients(id) ON DELETE SET NULL,
  employee_id VARCHAR REFERENCES employees(id) ON DELETE SET NULL,
  medical_visit_id VARCHAR REFERENCES medical_visits(id) ON DELETE SET NULL,
  anonymous BOOLEAN DEFAULT FALSE,

  -- When and where
  feedback_date DATE DEFAULT CURRENT_DATE,
  feedback_type VARCHAR NOT NULL DEFAULT 'survey',

  -- Structured survey (optional)
  survey_id VARCHAR REFERENCES employee_feedback_surveys(id),
  responses JSONB,

  -- Overall and dimension ratings (simple 1–5 scales)
  overall_experience_rating INTEGER,
  staff_courtesy_rating INTEGER,
  wait_time_rating INTEGER,
  environment_cleanliness_rating INTEGER,
  explanation_clarity_rating INTEGER,
  perceived_safety_rating INTEGER,
  would_recommend BOOLEAN,
  would_return BOOLEAN,

  -- Free-text feedback
  free_text_feedback TEXT,

  -- Categorization for reporting
  primary_category VARCHAR,
  secondary_category VARCHAR,
  sentiment VARCHAR,
  tags TEXT[],

  -- Follow-up workflow
  status VARCHAR DEFAULT 'new',
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  response_to_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_feedback_tenant ON employee_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_feedback_location ON employee_feedback(location_id);
CREATE INDEX IF NOT EXISTS idx_emp_feedback_date ON employee_feedback(tenant_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_emp_feedback_type ON employee_feedback(tenant_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_emp_feedback_status ON employee_feedback(tenant_id, status);

