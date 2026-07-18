-- uventorybiz M2: rename user roles and business departments (clean break; existing role data remapped).
-- care_location_kind keeps 'ambulance' as the DB value for mobile fleet vehicles.

ALTER TYPE "user_role" RENAME TO "user_role_old";
--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('staff', 'operations', 'fleet_operator', 'admin', 'super_admin');
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING (
  CASE "role"::text
    WHEN 'medical_staff' THEN 'staff'::"user_role"
    WHEN 'safety_officer' THEN 'operations'::"user_role"
    WHEN 'emt' THEN 'fleet_operator'::"user_role"
    WHEN 'admin' THEN 'admin'::"user_role"
    WHEN 'super_admin' THEN 'super_admin'::"user_role"
    ELSE 'staff'::"user_role"
  END
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff'::"user_role";
--> statement-breakpoint
DROP TYPE "user_role_old";
--> statement-breakpoint
ALTER TYPE "department" RENAME TO "department_old";
--> statement-breakpoint
CREATE TYPE "department" AS ENUM('sales', 'warehouse', 'operations', 'maintenance', 'administration');
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "department" TYPE "department" USING (
  CASE "department"::text
    WHEN 'extraction' THEN 'warehouse'::"department"
    WHEN 'processing' THEN 'operations'::"department"
    WHEN 'maintenance' THEN 'maintenance'::"department"
    WHEN 'safety' THEN 'operations'::"department"
    WHEN 'administration' THEN 'administration'::"department"
    ELSE 'administration'::"department"
  END
);
--> statement-breakpoint
ALTER TABLE "random_testing_pools" ALTER COLUMN "department" TYPE "department" USING (
  CASE "department"::text
    WHEN 'extraction' THEN 'warehouse'::"department"
    WHEN 'processing' THEN 'operations'::"department"
    WHEN 'maintenance' THEN 'maintenance'::"department"
    WHEN 'safety' THEN 'operations'::"department"
    WHEN 'administration' THEN 'administration'::"department"
    ELSE NULL
  END
);
--> statement-breakpoint
DROP TYPE "department_old";
