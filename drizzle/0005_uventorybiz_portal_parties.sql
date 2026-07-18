-- uventorybiz M3: portal users link to customers/suppliers (not patients only).

ALTER TABLE "portal_users" ADD COLUMN "party_type" varchar(32) DEFAULT 'customer' NOT NULL;
--> statement-breakpoint
ALTER TABLE "portal_users" ADD COLUMN "customer_id" varchar;
--> statement-breakpoint
ALTER TABLE "portal_users" ADD COLUMN "supplier_id" varchar;
--> statement-breakpoint
ALTER TABLE "portal_users" ALTER COLUMN "patient_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "portal_users" DROP CONSTRAINT IF EXISTS "portal_users_tenant_id_patient_id_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_users_tenant_patient_unique"
  ON "portal_users" ("tenant_id", "patient_id")
  WHERE "patient_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_users_tenant_customer_unique"
  ON "portal_users" ("tenant_id", "customer_id")
  WHERE "customer_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_users_tenant_supplier_unique"
  ON "portal_users" ("tenant_id", "supplier_id")
  WHERE "supplier_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_customer_id_customers_id_fk"
  FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_supplier_id_suppliers_id_fk"
  FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_users_customer" ON "portal_users" ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_users_supplier" ON "portal_users" ("supplier_id");
