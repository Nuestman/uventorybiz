-- =====================================================
-- Add notification_sent_at column to inventory_alerts
-- =====================================================
-- This migration adds tracking for when notifications were sent
-- for inventory alerts, allowing us to process existing alerts
-- and prevent duplicate notifications

ALTER TABLE inventory_alerts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_notification_sent 
ON inventory_alerts(notification_sent_at) 
WHERE notification_sent_at IS NULL;

COMMENT ON COLUMN inventory_alerts.notification_sent_at IS 'Timestamp when notifications were last sent for this alert. NULL means notifications have not been sent yet.';
