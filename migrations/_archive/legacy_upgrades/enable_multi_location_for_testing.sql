-- Enable Multi-Location Feature for Testing
-- Run this to test the multi-location system

-- Enable multi-location for all tenants (or specify specific tenant ID)
UPDATE tenants 
SET has_multiple_locations = true;

-- Verify
SELECT 
  id,
  name,
  has_multiple_locations
FROM tenants;

-- View all care locations
SELECT 
  id,
  tenant_id,
  location_name,
  location_code,
  is_primary,
  status
FROM care_locations
ORDER BY tenant_id, is_primary DESC, location_name;

-- Instructions:
-- 1. Run this SQL in your PostgreSQL database
-- 2. Logout and login to MineAid HMS
-- 3. You should now see the Location Selection Modal!
-- 4. Go to Admin → Locations tab to create more locations

