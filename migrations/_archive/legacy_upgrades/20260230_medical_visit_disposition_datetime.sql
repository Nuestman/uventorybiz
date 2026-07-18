-- Add disposition date/time to medical visits.
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS disposition_date_time TIMESTAMPTZ;
COMMENT ON COLUMN medical_visits.disposition_date_time IS 'Date/time when disposition was decided';
