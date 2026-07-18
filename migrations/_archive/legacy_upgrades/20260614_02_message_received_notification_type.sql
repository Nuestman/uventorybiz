-- Notification type for secure messaging alerts (staff in-app + email; no PHI in body)

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  (
    'message_received',
    'messaging',
    'New Secure Message',
    'A patient or colleague sent a message in the secure messaging inbox',
    FALSE
  )
ON CONFLICT (key) DO NOTHING;

-- Default preferences for existing staff: in-app + email for medical_staff and admin
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key = 'message_received'
  AND u.tenant_id IS NOT NULL
  AND u.role IN ('medical_staff', 'admin')
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;
