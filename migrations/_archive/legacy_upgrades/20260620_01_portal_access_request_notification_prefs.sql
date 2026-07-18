-- Default admin notification preferences for portal access requests (idempotent; safe if already seeded in 20260619_01)

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
