-- Raise default staff absolute session lifetime from 12h to 24h.
ALTER TABLE "tenant_security_settings"
  ALTER COLUMN "staff_session_absolute_hours" SET DEFAULT 24;--> statement-breakpoint

-- Apply to tenants still on the previous default (leave custom values alone).
UPDATE "tenant_security_settings"
SET "staff_session_absolute_hours" = 24,
    "updated_at" = NOW()
WHERE "staff_session_absolute_hours" = 12;
