-- Align business_assets.status with equipment-check vocabulary + lost.
-- active→functional, in_repair→maintenance, retired→decommissioned, lost→lost; add faulty.

CREATE TYPE "business_asset_status_new" AS ENUM (
  'functional',
  'faulty',
  'maintenance',
  'decommissioned',
  'lost'
);--> statement-breakpoint

ALTER TABLE "business_assets" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "business_assets"
  ALTER COLUMN "status" TYPE "business_asset_status_new"
  USING (
    CASE "status"::text
      WHEN 'active' THEN 'functional'
      WHEN 'in_repair' THEN 'maintenance'
      WHEN 'retired' THEN 'decommissioned'
      WHEN 'lost' THEN 'lost'
      ELSE 'functional'
    END
  )::"business_asset_status_new";--> statement-breakpoint

DROP TYPE "business_asset_status";--> statement-breakpoint

ALTER TYPE "business_asset_status_new" RENAME TO "business_asset_status";--> statement-breakpoint

ALTER TABLE "business_assets" ALTER COLUMN "status" SET DEFAULT 'functional'::"business_asset_status";
