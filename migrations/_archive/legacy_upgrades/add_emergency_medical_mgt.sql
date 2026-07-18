-- Add emergency medical management column to incident_reports table
ALTER TABLE incident_reports 
ADD COLUMN emergency_medical_mgt TEXT;

-- Add comment to document the column
COMMENT ON COLUMN incident_reports.emergency_medical_mgt IS 'Emergency medical management details and procedures performed during the incident';

