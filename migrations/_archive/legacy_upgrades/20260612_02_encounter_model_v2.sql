-- Encounter model v2: types, triageRequired flag, lifecycle timestamps, clean statuses.
-- Experimental data — normalise in place (no legacy preservation required).
-- See docs/ENCOUNTER_FIRST_MODEL_V2_ADDENDUM.md

-- Lifecycle timestamps
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS triage_required BOOLEAN NOT NULL DEFAULT false;

-- Backfill timestamps from existing columns
UPDATE encounters SET arrived_at = COALESCE(arrived_at, visit_date, created_at) WHERE arrived_at IS NULL;
UPDATE encounters SET finished_at = COALESCE(finished_at, disposition_date_time)
  WHERE finished_at IS NULL AND status = 'finished';
UPDATE encounters SET cancelled_at = COALESCE(cancelled_at, updated_at)
  WHERE cancelled_at IS NULL AND status = 'cancelled';

-- Normalise legacy statuses → canonical enum
UPDATE encounters SET status = 'finished' WHERE status IN ('completed', 'closed');
UPDATE encounters SET status = 'in_progress' WHERE status = 'open';
UPDATE encounters SET status = 'cancelled' WHERE status NOT IN (
  'planned', 'arrived', 'triaged', 'in_progress', 'finished', 'cancelled', 'entered_in_error'
);

-- Normalise legacy visit types → canonical encounter types
UPDATE encounters SET visit_type = 'clinical' WHERE visit_type IN ('routine', 'illness', 'emergency', 'clinical');
UPDATE encounters SET visit_type = 'screening' WHERE visit_type IN ('pre_employment', 'annual', 'annual_screening');
UPDATE encounters SET visit_type = 'monitoring' WHERE visit_type IN ('vitals_only', 'vitals_monitoring');
UPDATE encounters SET visit_type = 'clinical' WHERE visit_type NOT IN (
  'monitoring', 'procedure', 'clinical', 'injury', 'screening', 'follow_up'
);

-- Default triage_required for in-person clinical/injury
UPDATE encounters SET triage_required = true
  WHERE triage_required = false
    AND visit_type IN ('clinical', 'injury')
    AND modality = 'in_person'
    AND status IN ('arrived', 'triaged', 'in_progress', 'finished');

-- Align pathway column to type slug (internal / FHIR)
UPDATE encounters SET pathway = visit_type
  WHERE pathway NOT IN ('monitoring', 'procedure', 'clinical', 'injury', 'screening', 'follow_up',
    'telehealth_scheduled', 'telehealth_follow_up', 'phone_follow_up');

CREATE INDEX IF NOT EXISTS idx_encounters_arrived_at ON encounters(tenant_id, arrived_at);
CREATE INDEX IF NOT EXISTS idx_encounters_finished_at ON encounters(tenant_id, finished_at);
