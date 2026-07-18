-- Patient portal passwordless sign-in tokens (single-use, short-lived).
-- Date: 2026-05-31

CREATE TABLE IF NOT EXISTS portal_magic_login_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id VARCHAR NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_magic_tokens_user ON portal_magic_login_tokens(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_magic_tokens_expires ON portal_magic_login_tokens(expires);
