-- Portal sales link, PO shipped lifecycle, fulfillment exceptions

-- 1) pos_sales.portal_order_id (one active completed sale per portal order)
ALTER TABLE "pos_sales" ADD COLUMN IF NOT EXISTS "portal_order_id" varchar;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pos_sales"
    ADD CONSTRAINT "pos_sales_portal_order_id_portal_orders_id_fk"
    FOREIGN KEY ("portal_order_id") REFERENCES "portal_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pos_sales_portal_order_completed"
  ON "pos_sales" ("portal_order_id")
  WHERE "portal_order_id" IS NOT NULL AND "status" = 'completed';--> statement-breakpoint

-- 2) purchase_order_status: add shipped
ALTER TYPE "purchase_order_status" ADD VALUE IF NOT EXISTS 'shipped';--> statement-breakpoint

ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_confirmed_by_portal_user_id" varchar;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_shipped_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_shipped_by_portal_user_id" varchar;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_confirmed_by_portal_user_id_fk"
    FOREIGN KEY ("supplier_confirmed_by_portal_user_id") REFERENCES "portal_users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_shipped_by_portal_user_id_fk"
    FOREIGN KEY ("supplier_shipped_by_portal_user_id") REFERENCES "portal_users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Backfill: treat existing ordered POs as supplier-confirmed
UPDATE "purchase_orders"
SET "supplier_confirmed_at" = COALESCE("approved_at", "updated_at", NOW())
WHERE "status" = 'ordered' AND "supplier_confirmed_at" IS NULL;--> statement-breakpoint

-- At most one non-rejected invoice per PO
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_invoices_one_active_per_po"
  ON "supplier_invoices" ("tenant_id", "purchase_order_id")
  WHERE "purchase_order_id" IS NOT NULL AND "status" <> 'rejected';--> statement-breakpoint

-- 3) Fulfillment exceptions
DO $$ BEGIN
  CREATE TYPE "fulfillment_exception_kind" AS ENUM (
    'order_not_received',
    'order_return',
    'invoice_dispute'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "fulfillment_exception_status" AS ENUM ('open', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "fulfillment_exception_resolution" AS ENUM (
    'restock_reverse_sale',
    'keep_sale_complete',
    'approve_return',
    'decline_return',
    'accept_invoice',
    'reject_invoice'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fulfillment_exceptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" varchar NOT NULL,
  "kind" "fulfillment_exception_kind" NOT NULL,
  "status" "fulfillment_exception_status" NOT NULL DEFAULT 'open',
  "portal_order_id" varchar,
  "supplier_invoice_id" varchar,
  "notes" text,
  "resolution" "fulfillment_exception_resolution",
  "resolved_by_user_id" varchar,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT NOW(),
  "updated_at" timestamp DEFAULT NOW()
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fulfillment_exceptions"
    ADD CONSTRAINT "fulfillment_exceptions_tenant_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fulfillment_exceptions"
    ADD CONSTRAINT "fulfillment_exceptions_portal_order_id_fk"
    FOREIGN KEY ("portal_order_id") REFERENCES "portal_orders"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fulfillment_exceptions"
    ADD CONSTRAINT "fulfillment_exceptions_supplier_invoice_id_fk"
    FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fulfillment_exceptions"
    ADD CONSTRAINT "fulfillment_exceptions_resolved_by_user_id_fk"
    FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fulfillment_exceptions_tenant_status"
  ON "fulfillment_exceptions" ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fulfillment_exceptions_portal_order"
  ON "fulfillment_exceptions" ("portal_order_id");
