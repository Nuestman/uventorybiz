-- Remove redundant test_location column from instant_tests table
-- The location_id column (which references care_locations) is sufficient
-- Created: 2025-01-XX

-- Drop the test_location column if it exists
ALTER TABLE instant_tests 
DROP COLUMN IF EXISTS test_location;

-- Add comment to clarify location tracking
COMMENT ON COLUMN instant_tests.location_id IS 'Care location where test was conducted - references care_locations table';

