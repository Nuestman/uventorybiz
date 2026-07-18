-- Patient portal self-reported vital signs (no staff user / encounter required)

ALTER TABLE vital_signs
  ALTER COLUMN recorded_by DROP NOT NULL;

ALTER TABLE vital_signs
  ADD COLUMN IF NOT EXISTS portal_user_id varchar REFERENCES portal_users(id) ON DELETE SET NULL;

ALTER TABLE vital_signs
  ADD COLUMN IF NOT EXISTS source varchar NOT NULL DEFAULT 'clinic';

CREATE INDEX IF NOT EXISTS idx_vital_signs_source
  ON vital_signs (tenant_id, source);

CREATE INDEX IF NOT EXISTS idx_vital_signs_portal_user
  ON vital_signs (tenant_id, portal_user_id)
  WHERE portal_user_id IS NOT NULL;
