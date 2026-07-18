-- Default staff notification preferences (requires users + notification_types rows).
-- Idempotent. Re-run after onboarding new tenants/admins if prefs are missing.
-- Run via: npm run db:seed

-- Admins: all system-defined types, email + in_app
INSERT INTO user_notification_preferences
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE, TRUE, NULL
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE u.role = 'admin'
  AND u.tenant_id IS NOT NULL
  AND u.status = 'active'
  AND nt.system_defined = TRUE
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Operations role: incident alerts, medium+ severity
INSERT INTO user_notification_preferences
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE, TRUE, 'medium'
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE u.role = 'operations'
  AND u.tenant_id IS NOT NULL
  AND u.status = 'active'
  AND nt.key IN ('incident_created', 'incident_updated')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Staff: incident + inventory, medium+ severity
INSERT INTO user_notification_preferences
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE, TRUE, 'medium'
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE u.role = 'staff'
  AND u.tenant_id IS NOT NULL
  AND u.status = 'active'
  AND nt.category IN ('incident', 'inventory')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Staff + admins: secure messaging
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key = 'message_received'
  AND u.tenant_id IS NOT NULL
  AND u.role IN ('staff', 'admin')
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Admins: portal access requests, portal orders, supplier invoices
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key IN ('portal_access_request', 'portal_order_placed', 'portal_order_issue', 'supplier_invoice_submitted')
  AND u.tenant_id IS NOT NULL
  AND u.role = 'admin'
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;
