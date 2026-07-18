-- Rebuild medication feature as employee work fitness cases (experimental data dropped)
DROP TABLE IF EXISTS employee_medication_declarations CASCADE;

CREATE TABLE employee_work_fitness_cases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR REFERENCES care_locations(id),
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  case_type VARCHAR NOT NULL DEFAULT 'return_to_work',
  context_notes TEXT,
  employee_feeling_notes TEXT,
  related_medical_visit_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL,

  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_by_employee BOOLEAN DEFAULT true,
  submitted_by_user_id VARCHAR REFERENCES users(id),

  status VARCHAR NOT NULL DEFAULT 'submitted',
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR REFERENCES users(id),

  fitness_outcome VARCHAR,
  fitness_impact VARCHAR,
  work_restrictions TEXT,
  restriction_start_date DATE,
  restriction_end_date DATE,
  cleared_underground BOOLEAN,
  cleared_heavy_machinery BOOLEAN,

  may_affect_drug_test BOOLEAN DEFAULT false,
  drug_test_disclosure_notes TEXT,

  assessment_notes TEXT,
  action_taken VARCHAR,
  action_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id VARCHAR REFERENCES users(id)
);

CREATE TABLE employee_work_fitness_medications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id VARCHAR NOT NULL REFERENCES employee_work_fitness_cases(id) ON DELETE CASCADE,

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
  is_ongoing BOOLEAN DEFAULT true,

  employee_side_effects TEXT,
  employee_no_side_effects BOOLEAN DEFAULT false,
  clinician_medication_notes TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wf_cases_tenant ON employee_work_fitness_cases(tenant_id);
CREATE INDEX idx_wf_cases_employee ON employee_work_fitness_cases(tenant_id, employee_id);
CREATE INDEX idx_wf_cases_status ON employee_work_fitness_cases(tenant_id, status);
CREATE INDEX idx_wf_cases_submitted ON employee_work_fitness_cases(tenant_id, submitted_at);
CREATE INDEX idx_wf_cases_outcome ON employee_work_fitness_cases(tenant_id, fitness_outcome);
CREATE INDEX idx_wf_meds_case ON employee_work_fitness_medications(case_id);
CREATE INDEX idx_wf_meds_tenant ON employee_work_fitness_medications(tenant_id);
