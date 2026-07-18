-- 0015: Tenant-scoped inventory categories + migrate item.category off enum
-- Defaults: pharmaceuticals, medical-supplies, ppe, emergency-supplies, equipment, consumables
-- Legacy enum values medication/supplies remap to pharmaceuticals/medical-supplies (no duplicates).

CREATE TABLE IF NOT EXISTS "inventory_categories" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" varchar NOT NULL,
  "name" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "item_code_prefix" varchar(8) NOT NULL,
  "field_template" varchar DEFAULT 'supplies' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_categories_tenant_id_tenants_id_fk'
  ) THEN
    ALTER TABLE "inventory_categories"
      ADD CONSTRAINT "inventory_categories_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_inventory_categories_tenant" ON "inventory_categories" ("tenant_id");
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_categories_tenant_slug_unique'
  ) THEN
    ALTER TABLE "inventory_categories"
      ADD CONSTRAINT "inventory_categories_tenant_slug_unique" UNIQUE ("tenant_id", "slug");
  END IF;
END $$;
--> statement-breakpoint

-- Seed defaults for every existing tenant
INSERT INTO "inventory_categories" (
  "tenant_id", "name", "slug", "item_code_prefix", "field_template", "sort_order", "is_system", "is_active"
)
SELECT t.id, v.name, v.slug, v.prefix, v.template, v.sort_order, true, true
FROM "tenants" t
CROSS JOIN (
  VALUES
    ('Pharmaceuticals', 'pharmaceuticals', 'MED', 'medication', 10),
    ('General Supplies', 'medical-supplies', 'SUP', 'supplies', 20),
    ('Personal Protective Equipment', 'ppe', 'PPE', 'supplies', 30),
    ('Emergency Supplies', 'emergency-supplies', 'EMG', 'supplies', 40),
    ('Equipment', 'equipment', 'EQP', 'equipment', 50),
    ('Consumables', 'consumables', 'CON', 'consumables', 60)
) AS v(name, slug, prefix, template, sort_order)
ON CONFLICT ("tenant_id", "slug") DO NOTHING;
--> statement-breakpoint

-- Convert category column from enum to varchar (preserve existing text values first)
ALTER TABLE "inventory_items"
  ALTER COLUMN "category" TYPE varchar USING "category"::text;
--> statement-breakpoint

-- Remap legacy enum values onto the restored UI slugs (no duplicate categories)
UPDATE "inventory_items" SET "category" = 'pharmaceuticals' WHERE "category" = 'medication';
--> statement-breakpoint

UPDATE "inventory_items" SET "category" = 'medical-supplies' WHERE "category" = 'supplies';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_inventory_items_category" ON "inventory_items" ("tenant_id", "category");
--> statement-breakpoint

-- Drop unused enum type if nothing else depends on it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_category') THEN
    DROP TYPE "inventory_category";
  END IF;
END $$;
