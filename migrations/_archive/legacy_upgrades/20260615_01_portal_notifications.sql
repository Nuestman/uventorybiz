-- Portal in-app notification rows (message alerts without PHI in body)

CREATE TABLE portal_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portal_user_id VARCHAR NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_notifications_user_unread
  ON portal_notifications(portal_user_id, read_at, created_at DESC);

CREATE INDEX idx_portal_notifications_tenant
  ON portal_notifications(tenant_id, created_at DESC);
