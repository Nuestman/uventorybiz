-- Encounter-first model: child records link to encounter; open encounters may omit complaint/disposition.
-- See docs/ENCOUNTER_FIRST_MODEL.md and docs/ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md

-- ---------------------------------------------------------------------------
-- 1. Link triage and vital_signs to encounters
-- ---------------------------------------------------------------------------
ALTER TABLE triage ADD COLUMN IF NOT EXISTS encounter_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS encounter_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_triage_encounter ON triage(tenant_id, encounter_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_encounter ON vital_signs(tenant_id, encounter_id);

-- Backfill from legacy medical_visit_id (encounters table was medical_visits)
UPDATE triage SET encounter_id = medical_visit_id
WHERE encounter_id IS NULL AND medical_visit_id IS NOT NULL;

UPDATE vital_signs SET encounter_id = medical_visit_id
WHERE encounter_id IS NULL AND medical_visit_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Allow open encounters without complaint/disposition (filled at discharge)
-- ---------------------------------------------------------------------------
ALTER TABLE encounters ALTER COLUMN chief_complaint DROP NOT NULL;
ALTER TABLE encounters ALTER COLUMN disposition DROP NOT NULL;

-- Placeholder for legacy rows that might have empty strings
UPDATE encounters SET chief_complaint = NULL WHERE chief_complaint = '';
UPDATE encounters SET disposition = NULL WHERE disposition = '';
