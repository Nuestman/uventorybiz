-- Portal access requests + admin notification type + enable messaging feature by default for active portals

CREATE TABLE IF NOT EXISTS portal_access_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  patient_id VARCHAR REFERENCES patients(id) ON DELETE SET NULL,
  employee_id VARCHAR REFERENCES employees(id) ON DELETE SET NULL,
  portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  request_kind VARCHAR(32) NOT NULL DEFAULT 'new_access',
  match_kind VARCHAR(32) NOT NULL DEFAULT 'unknown',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_access_requests_tenant_status
  ON portal_access_requests(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_access_requests_email
  ON portal_access_requests(tenant_id, lower(email));

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  (
    'portal_access_request',
    'portal',
    'Portal Access Request',
    'A patient requested portal access or sign-in help from the public portal',
    FALSE
  )
ON CONFLICT (key) DO NOTHING;

-- Default preferences for tenant admins
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key = 'portal_access_request'
  AND u.tenant_id IS NOT NULL
  AND u.role = 'admin'
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Backfill portal messaging feature
UPDATE tenant_portal_settings
SET features_json = COALESCE(features_json, '{}'::jsonb) || '{"messaging": true}'::jsonb,
    updated_at = NOW()
WHERE enabled = TRUE
  AND (features_json IS NULL OR features_json->>'messaging' IS NULL OR features_json->>'messaging' = 'false');
