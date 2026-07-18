-- uventorybiz domain remap (fresh DB oriented)
-- Remaps appointments/incident_reports from patient_id to employee_id (+ optional customer_id on appointments).
-- NOTE: patient_id columns are dropped without backfill; existing appointment/incident rows are discarded
-- (deleted below — required so the new NOT NULL employee_id columns can be added).

DELETE FROM "appointments";
--> statement-breakpoint
DELETE FROM "incident_reports";
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "business_category" varchar DEFAULT 'other' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "organization_type" SET DEFAULT 'business';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"company_id" varchar,
	"customer_number" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"status" varchar DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_tenant" ON "customers" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_email" ON "customers" USING btree ("tenant_id","email");
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_telecare_session_id_telecare_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "patient_id";
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "employee_id" varchar NOT NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_id" varchar;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "incident_reports" DROP CONSTRAINT IF EXISTS "incident_reports_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_reports" DROP COLUMN IF EXISTS "patient_id";
--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "employee_id" varchar NOT NULL;
--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
