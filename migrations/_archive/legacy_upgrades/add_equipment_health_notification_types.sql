-- Add new notification types for equipment health checks and maintenance reminders
-- This migration adds notification types for automated equipment monitoring

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('equipment_health_report', 'equipment', 'Equipment Health Report', 'Weekly equipment health check report sent to system admins', FALSE),
  ('maintenance_reminder_30days', 'equipment', 'Maintenance Reminder (30 Days)', 'Reminder sent 30 days before scheduled equipment maintenance', FALSE),
  ('maintenance_reminder_7days', 'equipment', 'Maintenance Reminder (7 Days)', 'Reminder sent 7 days before scheduled equipment maintenance', FALSE)
ON CONFLICT (key) DO NOTHING;
