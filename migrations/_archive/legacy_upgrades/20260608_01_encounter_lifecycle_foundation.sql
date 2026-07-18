-- Encounter lifecycle foundation (staging)
-- Renames medical_visits → encounters; adds telecare, identifiers, modality columns.
-- File: migrations/20260608_01_encounter_lifecycle_foundation.sql
-- See docs/ENCOUNTER_LIFECYCLE_FRAMEWORK.md and docs/ENCOUNTER_SCHEMA_MIGRATION.md

-- ---------------------------------------------------------------------------
-- 1. Enum for encounter modality
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE encounter_modality AS ENUM ('in_person', 'telehealth', 'phone');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Rename medical_visits → encounters (FKs follow automatically in PostgreSQL)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS medical_visits RENAME TO encounters;

-- ---------------------------------------------------------------------------
-- 3. Extend encounters
-- ---------------------------------------------------------------------------
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS modality encounter_modality NOT NULL DEFAULT 'in_person';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS pathway VARCHAR(64) NOT NULL DEFAULT 'routine_clinic';
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS appointment_id VARCHAR REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS patient_location_note TEXT;

CREATE INDEX IF NOT EXISTS idx_encounters_tenant_patient ON encounters(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_tenant_visit_date ON encounters(tenant_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_encounters_pathway ON encounters(tenant_id, pathway);
CREATE INDEX IF NOT EXISTS idx_encounters_modality ON encounters(tenant_id, modality);

-- Map legacy status values toward lifecycle model (non-destructive)
UPDATE encounters SET status = 'in_progress' WHERE status IS NULL OR status = 'open';
UPDATE encounters SET status = 'finished' WHERE status = 'closed';

-- ---------------------------------------------------------------------------
-- 4. Telecare sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telecare_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id VARCHAR NOT NULL REFERENCES users(id),
  appointment_id VARCHAR REFERENCES appointments(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  video_provider VARCHAR(32) DEFAULT 'manual',
  room_id VARCHAR(256),
  join_url_patient TEXT,
  join_url_provider TEXT,
  recording_consent BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telecare_sessions_tenant_patient ON telecare_sessions(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_telecare_sessions_tenant_status ON telecare_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_telecare_sessions_appointment ON telecare_sessions(appointment_id);

-- Link encounters to telecare sessions (after table exists)
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS telecare_session_id VARCHAR REFERENCES telecare_sessions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 5. Resource identifiers (FHIR-ready)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_identifiers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR NOT NULL,
  system VARCHAR(512) NOT NULL,
  value VARCHAR(256) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, system, value)
);

CREATE INDEX IF NOT EXISTS idx_resource_identifiers_tenant_resource
  ON resource_identifiers(tenant_id, resource_type, resource_id);

-- ---------------------------------------------------------------------------
-- 6. Extend appointments
-- ---------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS modality encounter_modality NOT NULL DEFAULT 'in_person';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS encounter_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telecare_session_id VARCHAR REFERENCES telecare_sessions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 7. Portal appointment requests — patient chooses in-person or telehealth
-- ---------------------------------------------------------------------------
ALTER TABLE portal_appointment_requests
  ADD COLUMN IF NOT EXISTS preferred_modality encounter_modality NOT NULL DEFAULT 'in_person';

-- ---------------------------------------------------------------------------
-- 8. Backfill pathway hints from visit_type (staging)
-- ---------------------------------------------------------------------------
UPDATE encounters SET pathway = 'emergency' WHERE visit_type = 'emergency' AND pathway = 'routine_clinic';
UPDATE encounters SET pathway = 'pre_employment' WHERE visit_type = 'pre_employment' AND pathway = 'routine_clinic';
UPDATE encounters SET pathway = 'annual_screening' WHERE visit_type = 'annual' AND pathway = 'routine_clinic';
UPDATE encounters SET pathway = 'acute_onsite' WHERE visit_type IN ('injury', 'illness') AND pathway = 'routine_clinic';

COMMENT ON TABLE encounters IS 'Clinical episode (formerly medical_visits). See docs/ENCOUNTER_LIFECYCLE_FRAMEWORK.md';
COMMENT ON TABLE telecare_sessions IS 'Video/remote session lifecycle for telecare appointments';
