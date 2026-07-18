-- Per-patient portal notification preferences (email / in-app), opt-out by default

CREATE TABLE IF NOT EXISTS portal_user_notification_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portal_user_id VARCHAR NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  preference_key VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (portal_user_id, preference_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_portal_unp_user
  ON portal_user_notification_preferences(portal_user_id);

CREATE INDEX IF NOT EXISTS idx_portal_unp_tenant
  ON portal_user_notification_preferences(tenant_id);
