-- Add locationId to medical_inventory table for care location integration
-- This migration adds support for session-based location tagging of inventory items

-- Add locationId column
ALTER TABLE medical_inventory 
ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_inventory_location_id ON medical_inventory(location_id);

-- Add comment to explain the column
COMMENT ON COLUMN medical_inventory.location_id IS 'Foreign key to care_locations table - indicates where inventory item is stored';

-- Optional: Migrate existing text location data to locationId
-- This will attempt to match existing location text to care location names
-- Run this if you want to migrate old data (uncomment if needed):

/*
UPDATE medical_inventory mi
SET location_id = cl.id
FROM care_locations cl
WHERE mi.location IS NOT NULL 
  AND mi.location_id IS NULL
  AND mi.tenant_id = cl.tenant_id
  AND LOWER(TRIM(mi.location)) = LOWER(TRIM(cl.location_name));
*/

-- Note: The old 'location' VARCHAR field is kept for backward compatibility
-- but should be considered deprecated in favor of location_id

