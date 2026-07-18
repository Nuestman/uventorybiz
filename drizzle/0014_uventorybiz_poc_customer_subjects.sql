-- 0014: POC instant tests — customer-first subjects + laboratory category
-- Instant tests are primarily for walk-in customers; employee remains optional.

-- Laboratory business category (pharmacies + labs are POC-eligible)
INSERT INTO business_categories (key, label, description, sort_order, is_active)
VALUES ('laboratory', 'Laboratory', 'Clinical / diagnostic labs offering POC and related testing', 25, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
--> statement-breakpoint

-- Allow customer subjects; make employee optional
ALTER TABLE "instant_tests" ADD COLUMN IF NOT EXISTS "customer_id" varchar;
--> statement-breakpoint

ALTER TABLE "instant_tests" ALTER COLUMN "employee_id" DROP NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instant_tests_customer_id_customers_id_fk'
  ) THEN
    ALTER TABLE "instant_tests"
      ADD CONSTRAINT "instant_tests_customer_id_customers_id_fk"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Drop cascade-on-delete from employee FK if present; re-add as SET NULL for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instant_tests_employee_id_employees_id_fk'
  ) THEN
    ALTER TABLE "instant_tests" DROP CONSTRAINT "instant_tests_employee_id_employees_id_fk";
  END IF;
  ALTER TABLE "instant_tests"
    ADD CONSTRAINT "instant_tests_employee_id_employees_id_fk"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_instant_tests_customer" ON "instant_tests" ("customer_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_instant_tests_employee" ON "instant_tests" ("employee_id");
--> statement-breakpoint

-- At least one subject must be set (existing rows already have employee_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instant_tests_subject_check'
  ) THEN
    ALTER TABLE "instant_tests"
      ADD CONSTRAINT "instant_tests_subject_check"
      CHECK (customer_id IS NOT NULL OR employee_id IS NOT NULL);
  END IF;
END $$;
--> statement-breakpoint

-- Grandfather laboratories that opt into POC later; pharmacies already handled in 0013
UPDATE "tenants" SET "poc_testing_enabled" = TRUE
WHERE "business_category" = 'laboratory' AND "poc_testing_enabled" = FALSE;
