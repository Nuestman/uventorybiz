-- Add SAMPLE history (structured patient history) to medical visits.
-- Safe to run: adds nullable text column.

ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS sample_history TEXT;

COMMENT ON COLUMN medical_visits.sample_history IS 'SAMPLE history – JSON e.g. {"S":"...","A":"...","M":"...","P":"...","L":"...","E":"..."} (Signs, Allergies, Medications, Past history, Last oral intake, Events)';
