-- Notification type for severe patient-reported symptoms (staff in-app + email)

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  (
    'symptom_alert',
    'clinical',
    'Patient Symptom Alert',
    'A patient logged a severe or high-risk symptom in the portal',
    TRUE
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key = 'symptom_alert'
  AND u.tenant_id IS NOT NULL
  AND u.role IN ('medical_staff', 'admin')
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;
