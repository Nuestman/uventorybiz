-- Migration: 20260401_01_ambulance_care_locations.sql
-- Date: 2026-04-01 (sequence 01 — run before 20260401_02_* on the same day)
-- Ambulance support: care locations as fixed_site vs ambulance; stationing at a post/clinic; fleet metadata.
-- Safe to run on existing DBs (IF NOT EXISTS / defaults).

DO $$ BEGIN
  CREATE TYPE care_location_kind AS ENUM ('fixed_site', 'ambulance');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ambulance_ops_status AS ENUM ('available', 'deployed', 'standby', 'out_of_service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS location_kind care_location_kind NOT NULL DEFAULT 'fixed_site';

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS stationed_at_location_id VARCHAR REFERENCES care_locations(id) ON DELETE SET NULL;

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS call_sign VARCHAR(128);

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS registration_plate VARCHAR(64);

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS fleet_number VARCHAR(128);

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS coverage_notes TEXT;

ALTER TABLE care_locations
  ADD COLUMN IF NOT EXISTS ambulance_ops_status ambulance_ops_status;

CREATE INDEX IF NOT EXISTS care_locations_tenant_kind_idx ON care_locations (tenant_id, location_kind);

COMMENT ON COLUMN care_locations.stationed_at_location_id IS 'Fixed post/clinic where the ambulance is normally based; NULL when pooled or covering multiple posts (see coverage_notes).';
COMMENT ON COLUMN care_locations.coverage_notes IS 'e.g. surface ambulance covering all underground posts when not stationed at one site.';
