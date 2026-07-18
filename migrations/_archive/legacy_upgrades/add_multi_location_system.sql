-- Multi-Location Care Sites System Migration
-- Version: 2.6.0
-- Created: 2025-10-09
-- Description: Adds support for multiple emergency care locations/mini-clinics

-- ========================================
-- STEP 1: Add feature flag to tenants table
-- ========================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS has_multiple_locations BOOLEAN DEFAULT false;

COMMENT ON COLUMN tenants.has_multiple_locations IS 'Feature flag: enables multi-location system for this tenant';

-- ========================================
-- STEP 2: Create care_locations table
-- ========================================
CREATE TABLE IF NOT EXISTS care_locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location identification
  location_name VARCHAR NOT NULL,
  location_code VARCHAR NOT NULL,
  description TEXT,
  
  -- Contact information
  address TEXT,
  contact_phone VARCHAR,
  contact_email VARCHAR,
  
  -- Geographic coordinates
  latitude VARCHAR,
  longitude VARCHAR,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
  status VARCHAR NOT NULL DEFAULT 'active',
  
  -- Operations
  capacity INTEGER,
  operating_hours TEXT,
  staff_count INTEGER DEFAULT 0,
  
  -- Capabilities
  capabilities TEXT,
  equipment_list TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_location_code_per_tenant UNIQUE (tenant_id, location_code),
  CONSTRAINT unique_location_name_per_tenant UNIQUE (tenant_id, location_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_care_locations_tenant ON care_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_care_locations_status ON care_locations(status);

-- Partial index: Only one primary location per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_tenant 
  ON care_locations(tenant_id) 
  WHERE is_primary = true;

COMMENT ON TABLE care_locations IS 'Emergency care locations and mini-clinics within a mining site';
COMMENT ON COLUMN care_locations.is_primary IS 'One primary location per tenant - used for single-location mode';

-- ========================================
-- STEP 3: Add session location fields
-- ========================================
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS active_location_id VARCHAR REFERENCES care_locations(id),
ADD COLUMN IF NOT EXISTS active_location_name VARCHAR;

CREATE INDEX IF NOT EXISTS idx_user_sessions_location ON user_sessions(active_location_id);

COMMENT ON COLUMN user_sessions.active_location_id IS 'Current working location for this session (shift)';
COMMENT ON COLUMN user_sessions.active_location_name IS 'Location name cached for display';

-- ========================================
-- STEP 4: Add location_id to operational tables
-- ========================================

-- Medical Visits
ALTER TABLE medical_visits 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_medical_visits_location ON medical_visits(location_id);

COMMENT ON COLUMN medical_visits.location_id IS 'Care location where medical visit occurred';

-- Incident Reports
ALTER TABLE incident_reports 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_incident_reports_location ON incident_reports(location_id);

COMMENT ON COLUMN incident_reports.location_id IS 'Care location where patient was treated (not where incident occurred)';
COMMENT ON COLUMN incident_reports.incident_location IS 'Work site where incident occurred';

-- Appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);

COMMENT ON COLUMN appointments.location_id IS 'Care location for the appointment';

-- Drug Tests
ALTER TABLE drug_tests 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_drug_tests_location ON drug_tests(location_id);

COMMENT ON COLUMN drug_tests.location_id IS 'Care location where test was conducted';

-- Alcohol Tests
ALTER TABLE alcohol_tests 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_alcohol_tests_location ON alcohol_tests(location_id);

COMMENT ON COLUMN alcohol_tests.location_id IS 'Care location where test was conducted';

-- Hydration Tests
ALTER TABLE hydration_tests 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_hydration_tests_location ON hydration_tests(location_id);

COMMENT ON COLUMN hydration_tests.location_id IS 'Care location where test was conducted';

-- Duty Assignments
ALTER TABLE duty_assignments 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

CREATE INDEX IF NOT EXISTS idx_duty_assignments_location ON duty_assignments(location_id);

COMMENT ON COLUMN duty_assignments.location_id IS 'Care location for duty assignment';

-- ========================================
-- STEP 5: Seed default locations for existing tenants
-- ========================================

-- Create a primary location for each existing tenant
-- This ensures backward compatibility
INSERT INTO care_locations (tenant_id, location_name, location_code, is_primary, status, description)
SELECT 
  id, 
  CONCAT(name, ' - Main Clinic'),
  'MAIN',
  true,
  'active',
  'Primary emergency care facility'
FROM tenants
WHERE id NOT IN (SELECT DISTINCT tenant_id FROM care_locations)
ON CONFLICT (tenant_id, location_code) DO NOTHING;

-- ========================================
-- STEP 6: Verification Queries (Optional - for testing)
-- ========================================

-- Verify all tenants have at least one location
-- Uncomment to run verification
-- SELECT 
--   t.id as tenant_id,
--   t.name as tenant_name,
--   COUNT(cl.id) as location_count,
--   COUNT(CASE WHEN cl.is_primary THEN 1 END) as primary_count
-- FROM tenants t
-- LEFT JOIN care_locations cl ON t.id = cl.tenant_id
-- GROUP BY t.id, t.name
-- ORDER BY location_count;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Summary:
-- ✅ Added has_multiple_locations flag to tenants
-- ✅ Created care_locations table with tenant isolation
-- ✅ Added session location tracking fields
-- ✅ Added location_id to all operational tables
-- ✅ Created necessary indexes
-- ✅ Seeded default locations for existing tenants
--
-- Next Steps:
-- 1. Restart the application server
-- 2. Test location selection modal appears for multi-location tenants
-- 3. Test location auto-injection in forms
-- 4. Verify audit logging for location actions

