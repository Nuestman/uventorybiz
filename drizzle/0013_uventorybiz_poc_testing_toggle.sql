-- 0013: Per-business POC lab testing toggle.
-- Pharmacies are asked at signup whether they offer point-of-care lab testing
-- (instant tests); the toggle is also editable later in Settings.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "poc_testing_enabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Grandfather existing businesses that already use the testing module or are pharmacies,
-- so the module does not disappear from under them.
UPDATE "tenants" SET "poc_testing_enabled" = TRUE
WHERE "business_category" = 'pharmacy'
   OR "id" IN (SELECT DISTINCT "tenant_id" FROM "instant_tests" WHERE "tenant_id" IS NOT NULL);
