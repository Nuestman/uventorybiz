-- =====================================================
-- Notification System Migration
-- =====================================================
-- This migration adds the new data-driven notification system
-- with notification_types, user_notification_preferences,
-- updated notifications table, and notification_delivery_logs
--
-- Usage:
--   psql <connection_string> < migrations/add_notification_system.sql
-- =====================================================

-- =====================================================
-- 1. Notification Types Table
-- =====================================================

DROP TABLE IF EXISTS notification_types CASCADE;

CREATE TABLE notification_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stable machine key used in code & events (lowercase, snake_case)
  key VARCHAR NOT NULL UNIQUE,
  -- Examples: 'incident_created', 'inventory_low_stock', 'equipment_failure'
  
  category VARCHAR NOT NULL,
  -- 'incident' | 'inventory' | 'equipment' | 'system'
  
  display_name VARCHAR NOT NULL,
  -- Human-readable: 'Incident Created', 'Low Stock Alert'
  
  description TEXT,
  
  -- Optional flags
  severity_supported BOOLEAN DEFAULT FALSE,
  -- TRUE if alert type has severity (incidents, inventory alerts)
  
  system_defined BOOLEAN DEFAULT TRUE,
  -- TRUE = core system types, FALSE = custom tenant types
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_types_key ON notification_types(key);
CREATE INDEX idx_notification_types_category ON notification_types(category);

-- Seed initial notification types
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
  ('password_reset', 'system', 'Password Reset', 'Password reset requests', FALSE)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. User Notification Preferences Table
-- =====================================================

DROP TABLE IF EXISTS user_notification_preferences CASCADE;

CREATE TABLE user_notification_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type_id VARCHAR NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
  
  -- Delivery channel (data, not boolean column)
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'in_app', 'sms', 'whatsapp')),
  
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Optional severity filtering (NULL = no filter, applies to all severities)
  -- Only used if notification_type.severity_supported = TRUE
  min_severity VARCHAR NULL CHECK (min_severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Admin override: if TRUE, user cannot change this preference
  admin_managed BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (tenant_id, user_id, notification_type_id, channel)
);

CREATE INDEX idx_unp_tenant ON user_notification_preferences(tenant_id);
CREATE INDEX idx_unp_user ON user_notification_preferences(user_id);
CREATE INDEX idx_unp_notification_type ON user_notification_preferences(notification_type_id);
CREATE INDEX idx_unp_channel ON user_notification_preferences(channel);
CREATE INDEX idx_unp_enabled ON user_notification_preferences(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_unp_tenant_type_enabled ON user_notification_preferences(tenant_id, notification_type_id, enabled);

-- =====================================================
-- 3. Drop and Recreate Notifications Table
-- =====================================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  
  notification_type_id VARCHAR NOT NULL REFERENCES notification_types(id),
  
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'in_app', 'sms', 'whatsapp')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  
  metadata JSONB,
  -- Stores: incidentId, inventoryItemId, severity, viewLink, etc.
  
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, status) WHERE status != 'read';

-- =====================================================
-- 4. Notification Delivery Logs Table (Optional but Recommended)
-- =====================================================

DROP TABLE IF EXISTS notification_delivery_logs CASCADE;

CREATE TABLE notification_delivery_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id VARCHAR NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'in_app', 'sms', 'whatsapp')),
  
  provider VARCHAR NOT NULL,
  -- 'gmail_smtp' | 'sendgrid' | 'twilio' | 'meta_whatsapp' | 'system'
  
  status VARCHAR NOT NULL CHECK (status IN ('sent', 'failed', 'retried', 'queued')),
  
  error_message TEXT,
  provider_response JSONB,
  -- Raw response from email/SMS/WhatsApp API
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ndl_notification ON notification_delivery_logs(notification_id);
CREATE INDEX idx_ndl_status ON notification_delivery_logs(status);
CREATE INDEX idx_ndl_channel ON notification_delivery_logs(channel);
CREATE INDEX idx_ndl_tenant ON notification_delivery_logs(tenant_id);

-- =====================================================
-- 5. Initialize Default Preferences for Existing Users
-- =====================================================

-- Admins: All alerts, all channels
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'email',
  TRUE,
  TRUE,
  NULL
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'admin' 
  AND u.tenant_id IS NOT NULL
  AND nt.system_defined = TRUE
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Add in_app channel for admins
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'in_app',
  TRUE,
  TRUE,
  NULL
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'admin' 
  AND u.tenant_id IS NOT NULL
  AND nt.system_defined = TRUE
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Safety Officers: Incident alerts only, medium+ severity
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'email',
  TRUE,
  TRUE,
  'medium'
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'safety_officer'
  AND u.tenant_id IS NOT NULL
  AND nt.key IN ('incident_created', 'incident_updated')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Add in_app for safety officers
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'in_app',
  TRUE,
  TRUE,
  'medium'
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'safety_officer'
  AND u.tenant_id IS NOT NULL
  AND nt.key IN ('incident_created', 'incident_updated')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Medical Staff: Inventory and incident alerts, medium+ severity
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'email',
  TRUE,
  TRUE,
  'medium'
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'medical_staff'
  AND u.tenant_id IS NOT NULL
  AND nt.category IN ('incident', 'inventory')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- Add in_app for medical staff
INSERT INTO user_notification_preferences 
  (tenant_id, user_id, notification_type_id, channel, enabled, admin_managed, min_severity)
SELECT 
  u.tenant_id,
  u.id,
  nt.id,
  'in_app',
  TRUE,
  TRUE,
  'medium'
FROM users u
CROSS JOIN notification_types nt
WHERE u.role = 'medical_staff'
  AND u.tenant_id IS NOT NULL
  AND nt.category IN ('incident', 'inventory')
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Verify tables created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('notification_types', 'user_notification_preferences', 'notifications', 'notification_delivery_logs')
-- ORDER BY table_name;
-- =====================================================
