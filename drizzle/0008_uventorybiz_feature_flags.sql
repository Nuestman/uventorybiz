-- uventorybiz: platform feature flags (super-admin managed)
-- One row per feature key; missing rows fall back to code-defined defaults.

CREATE TABLE IF NOT EXISTS "platform_feature_flags" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "flag_key" varchar(64) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "updated_by" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "platform_feature_flags_flag_key_unique" UNIQUE ("flag_key")
);
--> statement-breakpoint

-- Appointments are turned off platform-wide by default per product decision.
INSERT INTO "platform_feature_flags" ("flag_key", "enabled", "updated_by")
VALUES ('appointments', false, 'migration:0008')
ON CONFLICT ("flag_key") DO NOTHING;
