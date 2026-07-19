-- Vehicle kind (commute vs mobile store) on business assets.
DO $$ BEGIN
  CREATE TYPE "public"."vehicle_kind" AS ENUM('commute', 'mobile_store');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-->
ALTER TABLE "business_assets"
  ADD COLUMN IF NOT EXISTS "vehicle_kind" "vehicle_kind";
-->
UPDATE "business_assets"
SET "vehicle_kind" = 'commute'
WHERE "asset_type" = 'vehicle' AND "vehicle_kind" IS NULL;
-->
-- Non-vehicles leave vehicle_kind null.
