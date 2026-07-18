CREATE TYPE "feedback_status" AS ENUM ('new', 'in_review', 'resolved', 'dismissed');

CREATE TABLE "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "tenant_id" varchar REFERENCES "tenants"("id") ON DELETE SET NULL,
  "path" varchar NOT NULL,
  "context" varchar,
  "kind" varchar NOT NULL DEFAULT 'global',
  "ux_rating" integer,
  "ui_rating" integer,
  "navigation_rating" integer,
  "speed_rating" integer,
  "reliability_rating" integer,
  "nps_score" integer,
  "areas_used" jsonb,
  "comment" text,
  "contact_email" varchar,
  "status" "feedback_status" NOT NULL DEFAULT 'new',
  "admin_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_feedback_status" ON "feedback" ("status");
CREATE INDEX "idx_feedback_path" ON "feedback" ("path");
CREATE INDEX "idx_feedback_created_at" ON "feedback" ("created_at");

