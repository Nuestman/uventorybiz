-- Add Primary survey (ABCDE assessment) to medical visits.
-- Safe to run: adds nullable text column.

ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS primary_survey TEXT;

COMMENT ON COLUMN medical_visits.primary_survey IS 'Primary survey (ABCDE) findings – JSON e.g. {"A":"clear","B":"normal"} per component';
