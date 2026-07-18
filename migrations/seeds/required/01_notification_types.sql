-- Reference rows for notification_types (structure is in drizzle/).
-- Idempotent: ON CONFLICT (key) DO UPDATE keeps display copy in sync with this file.
-- Keys are stable identifiers referenced by code — never rename them
-- (e.g. appointment_patient_* keys are kept even though copy says customer).
-- Run via: npm run db:seed

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('incident_created', 'incident', 'Incident Created', 'Notification when a new incident is reported', TRUE),
  ('incident_updated', 'incident', 'Incident Updated', 'Notification when an incident is updated', TRUE),
  ('inventory_low_stock', 'inventory', 'Low Stock Alert', 'Notification when inventory falls below minimum', TRUE),
  ('inventory_expiry', 'inventory', 'Expiry Alert', 'Notification when inventory is approaching expiry', TRUE),
  ('equipment_maintenance', 'equipment', 'Equipment Maintenance', 'Notification for scheduled equipment maintenance', FALSE),
  ('equipment_failure', 'equipment', 'Equipment Failure', 'Notification when equipment fails', TRUE),
  ('appointment_reminder', 'system', 'Appointment Reminder', 'Reminder for upcoming appointments', FALSE),
  ('registration_request', 'system', 'Registration Request', 'Admin notification for new user registrations', FALSE),
  ('status_change', 'system', 'Status Change', 'User account status changes', FALSE),
  ('password_reset', 'system', 'Password Reset', 'Password reset requests', FALSE),
  ('follow_up_due', 'our_people', 'Follow-up Due / Overdue', 'Daily digest of employee follow-ups that are due or overdue for completion', FALSE),
  ('equipment_health_report', 'equipment', 'Equipment Health Report', 'Weekly equipment health check report sent to system admins', FALSE),
  ('maintenance_reminder_30days', 'equipment', 'Maintenance Reminder (30 Days)', 'Reminder sent 30 days before scheduled equipment maintenance', FALSE),
  ('maintenance_reminder_7days', 'equipment', 'Maintenance Reminder (7 Days)', 'Reminder sent 7 days before scheduled equipment maintenance', FALSE),
  ('appointment_scheduled', 'appointments', 'Appointment Scheduled', 'A new appointment was scheduled and is awaiting confirmation', FALSE),
  ('appointment_patient_confirmed', 'appointments', 'Customer Confirmed Appointment', 'A customer confirmed their scheduled appointment in the portal', FALSE),
  ('appointment_patient_declined', 'appointments', 'Customer Declined Appointment', 'A customer declined a scheduled appointment in the portal', FALSE),
  ('appointment_patient_cancelled', 'appointments', 'Customer Cancelled Appointment', 'A customer cancelled a previously confirmed appointment', FALSE),
  ('appointment_no_show', 'appointments', 'Appointment No-Show', 'An appointment was automatically marked as no-show after the grace period', FALSE),
  ('message_received', 'messaging', 'New Secure Message', 'A customer, supplier, or colleague sent a message in the secure messaging inbox', FALSE),
  ('portal_access_request', 'portal', 'Portal Access Request', 'A customer or supplier requested portal access or sign-in help from the public portal', FALSE),
  ('portal_order_placed', 'portal', 'Portal Order Placed', 'A customer placed a new order through the portal', FALSE),
  ('portal_order_issue', 'portal', 'Portal Order Issue', 'A customer reported an order issue (not received or return request)', FALSE),
  ('supplier_invoice_submitted', 'portal', 'Supplier Invoice Submitted', 'A supplier submitted an invoice through the portal', FALSE),
  ('shift_report_published', 'operations', 'Shift handover published', 'When a colleague submits or updates a shift report for your organization', FALSE),
  ('shift_report_acknowledged', 'operations', 'Shift handover acknowledged', 'When someone acknowledges a shift report you authored', FALSE)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  severity_supported = EXCLUDED.severity_supported;
