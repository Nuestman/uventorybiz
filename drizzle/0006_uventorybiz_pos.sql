-- uventorybiz M4: Point of Sale (registers, shifts, sales, payments, returns)

CREATE TYPE "public"."pos_shift_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."pos_sale_status" AS ENUM('draft', 'completed', 'voided', 'returned');--> statement-breakpoint
CREATE TYPE "public"."pos_payment_method" AS ENUM('cash', 'card', 'other');--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "default_tax_rate" real DEFAULT 0;--> statement-breakpoint
CREATE TABLE "pos_registers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE "pos_shifts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"register_id" varchar NOT NULL,
	"opened_by_user_id" varchar NOT NULL,
	"closed_by_user_id" varchar,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"opening_float" varchar DEFAULT '0' NOT NULL,
	"closing_float" varchar,
	"status" "pos_shift_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE "pos_sales" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"register_id" varchar NOT NULL,
	"shift_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"customer_id" varchar,
	"cashier_user_id" varchar NOT NULL,
	"status" "pos_sale_status" DEFAULT 'draft' NOT NULL,
	"subtotal" varchar DEFAULT '0' NOT NULL,
	"tax_total" varchar DEFAULT '0' NOT NULL,
	"total" varchar DEFAULT '0' NOT NULL,
	"currency_code" varchar DEFAULT 'GHS' NOT NULL,
	"completed_at" timestamp,
	"voided_at" timestamp,
	"receipt_number" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE "pos_sale_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"inventory_item_id" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" varchar NOT NULL,
	"tax_rate" real DEFAULT 0 NOT NULL,
	"tax_amount" varchar DEFAULT '0' NOT NULL,
	"line_total" varchar NOT NULL,
	"barcode_snapshot" varchar
);--> statement-breakpoint
CREATE TABLE "pos_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"method" "pos_payment_method" NOT NULL,
	"amount" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE TABLE "pos_returns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"original_sale_id" varchar NOT NULL,
	"sale_id" varchar NOT NULL,
	"reason" text,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_register_id_pos_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."pos_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_register_id_pos_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."pos_registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_shift_id_pos_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."pos_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_cashier_user_id_users_id_fk" FOREIGN KEY ("cashier_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_sale_id_pos_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_sale_id_pos_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_original_sale_id_pos_sales_id_fk" FOREIGN KEY ("original_sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_sale_id_pos_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_registers_tenant_location" ON "pos_registers" ("tenant_id", "location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_shifts_register_status" ON "pos_shifts" ("register_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_tenant_shift" ON "pos_sales" ("tenant_id", "shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pos_sales_receipt" ON "pos_sales" ("tenant_id", "receipt_number");
