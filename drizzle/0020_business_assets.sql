-- Business assets register + ticket FK + per-tenant tag counters.
CREATE TYPE "business_asset_type" AS ENUM ('equipment', 'vehicle', 'it', 'tool', 'other');--> statement-breakpoint
CREATE TYPE "business_asset_status" AS ENUM ('active', 'in_repair', 'retired', 'lost');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_asset_tag_counters" (
  "tenant_id" varchar PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "next_value" integer NOT NULL DEFAULT 1,
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "business_assets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "asset_tag" varchar(32) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "asset_type" "business_asset_type" NOT NULL,
  "status" "business_asset_status" NOT NULL DEFAULT 'active',
  "serial_number" varchar(128),
  "brand" varchar(128),
  "model" varchar(128),
  "call_sign" varchar(128),
  "registration_plate" varchar(64),
  "fleet_number" varchar(128),
  "ops_status" "fleet_ops_status",
  "stock_location_id" varchar REFERENCES "care_locations"("id") ON DELETE SET NULL,
  "assigned_location_id" varchar REFERENCES "care_locations"("id") ON DELETE SET NULL,
  "purchase_date" date,
  "warranty_expiry" date,
  "last_maintenance_date" date,
  "next_maintenance_date" date,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "business_assets_tenant_tag_unique" ON "business_assets" ("tenant_id", "asset_tag");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_assets_stock_location_unique" ON "business_assets" ("stock_location_id") WHERE "stock_location_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_assets_tenant_type" ON "business_assets" ("tenant_id", "asset_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_assets_stock_location" ON "business_assets" ("stock_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_assets_assigned_location" ON "business_assets" ("assigned_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_assets_tenant_status" ON "business_assets" ("tenant_id", "status");--> statement-breakpoint

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "asset_id" varchar REFERENCES "business_assets"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_asset" ON "tickets" ("tenant_id", "asset_id");--> statement-breakpoint

-- Backfill fleet vehicles (location_kind = fleet) into business_assets.
WITH fleet_locs AS (
  SELECT
    cl.id,
    cl.tenant_id,
    cl.location_name,
    cl.call_sign,
    cl.registration_plate,
    cl.fleet_number,
    cl.fleet_ops_status,
    cl.description,
    ROW_NUMBER() OVER (PARTITION BY cl.tenant_id ORDER BY cl.created_at NULLS LAST, cl.id) AS rn
  FROM care_locations cl
  WHERE cl.location_kind = 'fleet'
    AND NOT EXISTS (
      SELECT 1 FROM business_assets ba WHERE ba.stock_location_id = cl.id
    )
),
ins AS (
  INSERT INTO business_assets (
    tenant_id, asset_tag, name, description, asset_type, status,
    call_sign, registration_plate, fleet_number, ops_status, stock_location_id
  )
  SELECT
    f.tenant_id,
    'AST-' || lpad(f.rn::text, 6, '0'),
    COALESCE(NULLIF(trim(f.location_name), ''), NULLIF(trim(f.call_sign), ''), 'Fleet vehicle'),
    f.description,
    'vehicle',
    'active',
    f.call_sign,
    f.registration_plate,
    f.fleet_number,
    f.fleet_ops_status,
    f.id
  FROM fleet_locs f
  RETURNING tenant_id, asset_tag
)
INSERT INTO tenant_asset_tag_counters (tenant_id, next_value, updated_at)
SELECT tenant_id, COALESCE(MAX(SUBSTRING(asset_tag FROM 5)::int), 0), now()
FROM (
  SELECT tenant_id, asset_tag FROM business_assets WHERE asset_tag ~ '^AST-[0-9]+$'
) t
GROUP BY tenant_id
ON CONFLICT (tenant_id) DO UPDATE
SET next_value = GREATEST(tenant_asset_tag_counters.next_value, EXCLUDED.next_value),
    updated_at = now();
