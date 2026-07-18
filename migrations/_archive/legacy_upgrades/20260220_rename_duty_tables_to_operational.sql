-- Rename duty tables to use operational_ prefix for consistency with operational_duties
-- Run this on existing databases that have duty_assignments and duty_completions.

-- Rename duty_assignments -> operational_duty_assignments
ALTER TABLE IF EXISTS duty_assignments RENAME TO operational_duty_assignments;

-- Rename indexes that reference the old table name (Postgres renames them with the table)
-- Index idx_duty_assignments_location will become part of operational_duty_assignments.
-- Create the new index name for clarity (optional; rename keeps the old index name).
-- If you need the index name to match, drop and recreate:
-- DROP INDEX IF EXISTS idx_duty_assignments_location;
-- CREATE INDEX IF NOT EXISTS idx_operational_duty_assignments_location ON operational_duty_assignments(location_id);

-- Rename duty_completions -> operational_duty_completions
ALTER TABLE IF EXISTS duty_completions RENAME TO operational_duty_completions;

-- Note: Foreign key constraints keep their original names but still reference the renamed tables.
-- No need to alter FKs; they follow the table rename.
