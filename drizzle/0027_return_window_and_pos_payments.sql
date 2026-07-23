-- Return window days + POS payment methods (mobile money, credit)

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "return_window_days" integer NOT NULL DEFAULT 3;--> statement-breakpoint

ALTER TYPE "pos_payment_method" ADD VALUE IF NOT EXISTS 'mobile_money';--> statement-breakpoint
ALTER TYPE "pos_payment_method" ADD VALUE IF NOT EXISTS 'credit';
