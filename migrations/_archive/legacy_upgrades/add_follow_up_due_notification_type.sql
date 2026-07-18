-- Add notification type for Our People follow-up due/overdue reminders
-- Recipients (medical_staff, admin) get a daily digest when follow-ups are due or overdue

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('follow_up_due', 'our_people', 'Follow-up Due / Overdue', 'Daily digest of patient follow-ups that are due or overdue for completion', FALSE)
ON CONFLICT (key) DO NOTHING;
