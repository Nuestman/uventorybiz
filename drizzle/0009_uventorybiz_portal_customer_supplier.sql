-- Portal is customer/supplier-first: access requests link to customer/supplier records
-- (patient/employee bridge removed), and every tenant gets a portal settings row.

ALTER TABLE "portal_access_requests" DROP COLUMN IF EXISTS "patient_id";
--> statement-breakpoint
ALTER TABLE "portal_access_requests" DROP COLUMN IF EXISTS "employee_id";
--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD COLUMN IF NOT EXISTS "customer_id" varchar REFERENCES "customers"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD COLUMN IF NOT EXISTS "supplier_id" varchar REFERENCES "suppliers"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_access_requests_customer" ON "portal_access_requests" ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_access_requests_supplier" ON "portal_access_requests" ("supplier_id");
--> statement-breakpoint
-- Backfill: every existing tenant gets a portal settings row (enabled by default for the
-- customer/supplier portal). New tenants get a row from application code at creation time.
INSERT INTO "tenant_portal_settings" ("tenant_id", "enabled", "features_json", "created_at", "updated_at")
SELECT "id", TRUE, '{}'::jsonb, NOW(), NOW()
FROM "tenants"
ON CONFLICT ("tenant_id") DO NOTHING;
