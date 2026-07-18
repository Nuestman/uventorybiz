-- Persistent health profile on patient record (allergies, history, home medications, disability).
-- Distinct from per-visit SAMPLE/medications on medical_visits.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS medications TEXT,
  ADD COLUMN IF NOT EXISTS disability TEXT;
