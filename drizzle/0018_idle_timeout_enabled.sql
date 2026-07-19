-- Tenant toggle to enable/disable idle session logout (absolute max still applies).
ALTER TABLE "tenant_security_settings"
  ADD COLUMN IF NOT EXISTS "idle_timeout_enabled" boolean DEFAULT true NOT NULL;
