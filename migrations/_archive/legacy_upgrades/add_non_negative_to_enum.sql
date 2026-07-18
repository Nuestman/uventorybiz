-- Migration: Add "non-negative" to test_result enum
-- This allows drug test results to use "non-negative" in addition to "positive"

-- Add "non-negative" value to the test_result enum
ALTER TYPE test_result ADD VALUE IF NOT EXISTS 'non-negative' AFTER 'positive';

-- Note: This migration is safe and backward compatible
-- Existing data with "negative", "positive", "dilute", "invalid", "pending", or "inconclusive" will remain valid
