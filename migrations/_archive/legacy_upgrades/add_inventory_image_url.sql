-- Add imageUrl column to medical_inventory table
-- This migration adds support for inventory item images

-- Add imageUrl column
ALTER TABLE medical_inventory 
ADD COLUMN IF NOT EXISTS image_url VARCHAR;

-- Add comment to explain the column
COMMENT ON COLUMN medical_inventory.image_url IS 'URL/path to item image stored in public/inventory-images/';

-- No need for default value as it's optional
-- Existing items will have NULL which is acceptable

