CREATE TABLE "schema_migration_demos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"title" varchar(120) NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schema_migration_demos" ADD CONSTRAINT "schema_migration_demos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_schema_migration_demos_tenant" ON "schema_migration_demos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_schema_migration_demos_tenant_active" ON "schema_migration_demos" USING btree ("tenant_id","is_active");