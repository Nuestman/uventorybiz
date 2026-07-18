-- Customer receipt confirmation / not-received flow for portal orders:
-- new not_received status, receipt grace window fields, delivery courier contact,
-- and a staff notification type for reported order issues.

ALTER TYPE "portal_order_status" ADD VALUE IF NOT EXISTS 'not_received' BEFORE 'completed';
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "delivery_contact_name" varchar(200);
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "delivery_contact_phone" varchar(64);
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "ready_at" timestamp;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "receipt_confirmed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "not_received_at" timestamp;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "not_received_reason" text;
--> statement-breakpoint
INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('portal_order_issue', 'portal', 'Portal Order Issue', 'A customer reported a portal order as not received', FALSE)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO user_notification_preferences (tenant_id, user_id, notification_type_id, channel, enabled)
SELECT u.tenant_id, u.id, nt.id, ch.channel, TRUE
FROM users u
CROSS JOIN notification_types nt
CROSS JOIN (VALUES ('email'), ('in_app')) AS ch(channel)
WHERE nt.key = 'portal_order_issue'
  AND u.tenant_id IS NOT NULL
  AND u.role = 'admin'
  AND u.status = 'active'
ON CONFLICT (tenant_id, user_id, notification_type_id, channel) DO NOTHING;
