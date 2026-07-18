-- Migration: 20260401_02_emt_and_ambulance_prestart.sql
-- Date: 2026-04-01 (sequence 02 — requires 20260401_01_ambulance_care_locations.sql applied first)
-- EMT role + ambulance shift pre-start safety checks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'emt'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'emt';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE ambulance_prestart_status AS ENUM ('draft', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ambulance_prestart_checks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ambulance_location_id VARCHAR NOT NULL REFERENCES care_locations(id) ON DELETE CASCADE,
  completed_by_user_id VARCHAR NOT NULL REFERENCES users(id),
  shift_date DATE NOT NULL,
  checked_at TIMESTAMP DEFAULT NOW(),
  status ambulance_prestart_status NOT NULL DEFAULT 'draft',
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  deficiencies_notes TEXT,
  mileage_reading VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ambulance_prestart_tenant_ambulance_idx
  ON ambulance_prestart_checks (tenant_id, ambulance_location_id);
CREATE INDEX IF NOT EXISTS ambulance_prestart_tenant_shift_idx
  ON ambulance_prestart_checks (tenant_id, shift_date);

COMMENT ON TABLE ambulance_prestart_checks IS 'Shift pre-start safety checklist per ambulance (care_locations row with location_kind = ambulance).';
