-- Add test_location column to instant_tests for auditing/display
-- Safe to run multiple times thanks to IF NOT EXISTS

ALTER TABLE instant_tests
ADD COLUMN IF NOT EXISTS test_location VARCHAR;

COMMENT ON COLUMN instant_tests.test_location IS 'Human-readable care location captured at test time';
