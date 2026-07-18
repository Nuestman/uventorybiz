-- Returns/refunds: per-tenant toggle (gates POS returns + portal return requests),
-- portal order return-request flow (return_requested / returned statuses).

ALTER TYPE "portal_order_status" ADD VALUE IF NOT EXISTS 'return_requested' BEFORE 'cancelled';
--> statement-breakpoint
ALTER TYPE "portal_order_status" ADD VALUE IF NOT EXISTS 'returned' BEFORE 'cancelled';
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "returns_enabled" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "return_requested_at" timestamp;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "return_reason" text;
--> statement-breakpoint
ALTER TABLE "portal_orders" ADD COLUMN IF NOT EXISTS "returned_at" timestamp;
--> statement-breakpoint
UPDATE notification_types
SET description = 'A customer reported an order issue (not received or return request)'
WHERE key = 'portal_order_issue';
