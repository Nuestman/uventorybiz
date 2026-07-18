-- Remove redundant duty_type column; title is the single duty identifier.
ALTER TABLE operational_duties DROP COLUMN IF EXISTS duty_type;
