-- Configurable session expiry warning lead time (minutes before logout)
-- Date: 2026-05-31

ALTER TABLE tenant_security_settings
  ADD COLUMN IF NOT EXISTS session_warning_lead_minutes INTEGER NOT NULL DEFAULT 3;
