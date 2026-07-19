-- Rename fleet-related DB identifiers from ambulance_* to fleet_*.
-- Safe on DBs that already applied 0001+ with ambulance_* names.

-- Enums
ALTER TYPE "ambulance_ops_status" RENAME TO "fleet_ops_status";
--> statement-breakpoint
ALTER TYPE "ambulance_prestart_status" RENAME TO "fleet_prestart_status";
--> statement-breakpoint
ALTER TYPE "care_location_kind" RENAME VALUE 'ambulance' TO 'fleet';
--> statement-breakpoint

-- care_locations column
ALTER TABLE "care_locations" RENAME COLUMN "ambulance_ops_status" TO "fleet_ops_status";
--> statement-breakpoint

-- Pre-start table + column
ALTER TABLE "ambulance_prestart_checks" RENAME TO "fleet_prestart_checks";
--> statement-breakpoint
ALTER TABLE "fleet_prestart_checks" RENAME COLUMN "ambulance_location_id" TO "fleet_location_id";
--> statement-breakpoint

-- Indexes
ALTER INDEX IF EXISTS "ambulance_prestart_tenant_ambulance_idx" RENAME TO "fleet_prestart_tenant_fleet_idx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "ambulance_prestart_tenant_shift_idx" RENAME TO "fleet_prestart_tenant_shift_idx";
--> statement-breakpoint

-- Foreign keys (names from 0001_initial_schema)
ALTER TABLE "fleet_prestart_checks" RENAME CONSTRAINT "ambulance_prestart_checks_tenant_id_tenants_id_fk" TO "fleet_prestart_checks_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "fleet_prestart_checks" RENAME CONSTRAINT "ambulance_prestart_checks_ambulance_location_id_care_locations_id_fk" TO "fleet_prestart_checks_fleet_location_id_care_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "fleet_prestart_checks" RENAME CONSTRAINT "ambulance_prestart_checks_completed_by_user_id_users_id_fk" TO "fleet_prestart_checks_completed_by_user_id_users_id_fk";
