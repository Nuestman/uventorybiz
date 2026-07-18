-- Customer ordering + supplier invoicing through the portal.

CREATE TYPE "portal_order_status" AS ENUM ('pending', 'confirmed', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled', 'rejected');
--> statement-breakpoint
CREATE TYPE "portal_order_fulfillment" AS ENUM ('pickup', 'delivery');
--> statement-breakpoint
CREATE TYPE "supplier_invoice_status" AS ENUM ('submitted', 'accepted', 'rejected', 'paid');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_orders" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" varchar NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "portal_user_id" varchar REFERENCES "portal_users"("id") ON DELETE SET NULL,
  "order_number" varchar(32) NOT NULL,
  "status" "portal_order_status" NOT NULL DEFAULT 'pending',
  "fulfillment_type" "portal_order_fulfillment" NOT NULL,
  "location_id" varchar REFERENCES "care_locations"("id") ON DELETE SET NULL,
  "delivery_address" text,
  "customer_notes" text,
  "staff_notes" text,
  "subtotal" varchar NOT NULL DEFAULT '0',
  "total" varchar NOT NULL DEFAULT '0',
  "currency_code" varchar NOT NULL DEFAULT 'GHS',
  "reviewed_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "confirmed_at" timestamp,
  "completed_at" timestamp,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "portal_orders_tenant_id_order_number_unique" UNIQUE ("tenant_id", "order_number")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_orders_tenant_status" ON "portal_orders" ("tenant_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_orders_customer" ON "portal_orders" ("tenant_id", "customer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_order_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "order_id" varchar NOT NULL REFERENCES "portal_orders"("id") ON DELETE CASCADE,
  "item_id" varchar REFERENCES "inventory_items"("id") ON DELETE SET NULL,
  "item_name_snapshot" varchar NOT NULL,
  "item_code_snapshot" varchar,
  "quantity" integer NOT NULL,
  "unit_price" varchar NOT NULL,
  "line_total" varchar NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_order_items_order" ON "portal_order_items" ("order_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_invoices" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "supplier_id" varchar NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "purchase_order_id" varchar REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
  "portal_user_id" varchar REFERENCES "portal_users"("id") ON DELETE SET NULL,
  "invoice_number" varchar(64) NOT NULL,
  "amount" varchar NOT NULL,
  "invoice_date" date,
  "status" "supplier_invoice_status" NOT NULL DEFAULT 'submitted',
  "notes" text,
  "reviewed_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "supplier_invoices_tenant_id_supplier_id_invoice_number_unique" UNIQUE ("tenant_id", "supplier_id", "invoice_number")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_invoices_tenant_status" ON "supplier_invoices" ("tenant_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_invoices_po" ON "supplier_invoices" ("purchase_order_id");
--> statement-breakpoint
-- Staff notification types for portal orders and supplier invoices
INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('portal_order_placed', 'portal', 'Portal Order Placed', 'A customer placed a new order through the portal', FALSE),
  ('supplier_invoice_submitted', 'portal', 'Supplier Invoice Submitted', 'A supplier submitted an invoice through the portal', FALSE)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;
--> statement-breakpoint
-- Default admin preferences for the new notification types
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key IN ('portal_order_placed', 'supplier_invoice_submitted')
  AND u.tenant_id IS NOT NULL
  AND u.role = 'admin'
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;
