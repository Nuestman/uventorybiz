-- Add Detained at FAP/Clinic and Ambulance Used to medical visits.
-- Safe to run: adds nullable boolean columns.

ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS detained_at_facility BOOLEAN;
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS ambulance_used BOOLEAN;

COMMENT ON COLUMN medical_visits.detained_at_facility IS 'Was the patient kept at the medical facility (FAP/Clinic)?';
COMMENT ON COLUMN medical_visits.ambulance_used IS 'Was emergency transport used? (especially when disposition is emergency transfer)';
