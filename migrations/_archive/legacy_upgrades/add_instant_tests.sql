-- Add POC Instant Tests (HB, Pregnancy, Malaria, Typhoid)
-- Created: October 2025

-- Create enums for instant tests
CREATE TYPE instant_test_type AS ENUM ('hb', 'pregnancy', 'malaria', 'typhoid');
CREATE TYPE instant_test_result AS ENUM ('positive', 'negative', 'invalid');

-- Create instant_tests table
CREATE TABLE IF NOT EXISTS instant_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Test identification
  test_number VARCHAR NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  patient_id VARCHAR REFERENCES patients(id),
  location_id VARCHAR REFERENCES care_locations(id),
  
  -- Test configuration
  test_type instant_test_type NOT NULL,
  test_date DATE NOT NULL,
  test_time VARCHAR,
  tested_by VARCHAR NOT NULL REFERENCES users(id),
  
  -- Results
  test_result instant_test_result,
  hb_level VARCHAR, -- For HB tests only - e.g., "12.5" (g/dL)
  
  -- Metadata
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_instant_test_number_per_tenant UNIQUE (tenant_id, test_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instant_tests_tenant_id ON instant_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_instant_tests_employee_id ON instant_tests(employee_id);
CREATE INDEX IF NOT EXISTS idx_instant_tests_test_date ON instant_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_instant_tests_test_type ON instant_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_instant_tests_location_id ON instant_tests(location_id);

-- Add comment to table
COMMENT ON TABLE instant_tests IS 'POC Instant Tests: HB, Pregnancy, Malaria, Typhoid tests for mining personnel - conducted at care locations';
COMMENT ON COLUMN instant_tests.test_type IS 'Type of instant test: hb, pregnancy, malaria, typhoid';
COMMENT ON COLUMN instant_tests.test_result IS 'Test result: positive, negative, invalid (not applicable for HB tests)';
COMMENT ON COLUMN instant_tests.hb_level IS 'Hemoglobin level in g/dL (only for HB tests)';
COMMENT ON COLUMN instant_tests.location_id IS 'Care location where test was conducted - auto-injected from session';

