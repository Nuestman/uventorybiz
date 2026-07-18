-- Vitals, Triage (SATS) & Medical Visit redesign
-- Plan: docs/VITALS_TRIAGE_AND_MEDICAL_VISIT_PLAN.md
-- Order: triage (no vital_signs_id), vital_signs (with triage_id), then add triage.vital_signs_id, medical_visits.triage_id

BEGIN;

-- 1) Triage table (SATS) - without vital_signs_id first to avoid circular FK
CREATE TABLE IF NOT EXISTS triage (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  location_id VARCHAR REFERENCES care_locations(id) ON DELETE SET NULL,
  recorded_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triage_at TIMESTAMP NOT NULL,
  medical_visit_id VARCHAR REFERENCES medical_visits(id) ON DELETE SET NULL,
  acuity VARCHAR NOT NULL,
  tews_score INTEGER NOT NULL,
  clinical_discriminators TEXT NOT NULL,
  presenting_complaint TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_tenant_patient_at ON triage(tenant_id, patient_id, triage_at);
CREATE INDEX IF NOT EXISTS idx_triage_tenant_acuity ON triage(tenant_id, acuity);
CREATE INDEX IF NOT EXISTS idx_triage_tenant_visit ON triage(tenant_id, medical_visit_id);

-- 2) Vital signs table
CREATE TABLE IF NOT EXISTS vital_signs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  location_id VARCHAR REFERENCES care_locations(id) ON DELETE SET NULL,
  recorded_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP NOT NULL,
  medical_visit_id VARCHAR REFERENCES medical_visits(id) ON DELETE SET NULL,
  triage_id VARCHAR REFERENCES triage(id) ON DELETE SET NULL,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  temperature VARCHAR,
  respiratory_rate INTEGER,
  oxygen_saturation INTEGER,
  glucose_level INTEGER,
  pain_score INTEGER,
  weight VARCHAR,
  height VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_tenant_patient_at ON vital_signs(tenant_id, patient_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_vital_signs_tenant_visit ON vital_signs(tenant_id, medical_visit_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_tenant_triage ON vital_signs(tenant_id, triage_id);

-- 3) Add vital_signs_id to triage
ALTER TABLE triage ADD COLUMN IF NOT EXISTS vital_signs_id VARCHAR REFERENCES vital_signs(id) ON DELETE SET NULL;

-- 4) Add triage_id to medical_visits
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS triage_id VARCHAR REFERENCES triage(id) ON DELETE SET NULL;

COMMIT;
