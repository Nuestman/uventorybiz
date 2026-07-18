-- Super admin impersonation: session flags + append-only platform audit of start/end.

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS impersonator_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS impersonation_started_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_sessions_impersonator ON user_sessions(impersonator_user_id)
  WHERE impersonator_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS impersonation_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  impersonator_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_tenant_id VARCHAR REFERENCES tenants(id) ON DELETE SET NULL,
  action VARCHAR(32) NOT NULL,
  reason VARCHAR(64),
  session_token_prefix VARCHAR(16),
  ip_address VARCHAR(128),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_events_impersonator ON impersonation_events(impersonator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_events_target_tenant ON impersonation_events(target_tenant_id, created_at DESC);
