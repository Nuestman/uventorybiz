-- Session security policies + staff TOTP MFA
-- Date: 2026-05-31

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

ALTER TABLE portal_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

UPDATE user_sessions SET last_activity_at = COALESCE(last_activity_at, created_at, NOW()) WHERE last_activity_at IS NULL;
UPDATE portal_sessions SET last_activity_at = COALESCE(last_activity_at, created_at, NOW()) WHERE last_activity_at IS NULL;

CREATE TABLE IF NOT EXISTS tenant_security_settings (
  tenant_id VARCHAR PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  staff_session_absolute_hours INTEGER NOT NULL DEFAULT 12,
  staff_session_idle_minutes INTEGER NOT NULL DEFAULT 30,
  portal_session_absolute_days INTEGER NOT NULL DEFAULT 14,
  portal_session_idle_minutes INTEGER NOT NULL DEFAULT 60,
  portal_session_sliding_days INTEGER NOT NULL DEFAULT 7,
  require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB;

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(128) NOT NULL UNIQUE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON mfa_challenges(expires);
