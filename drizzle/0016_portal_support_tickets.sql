-- 0016: Portal system-issue tickets — allow portal_users as requesters/comment authors
-- Additive: existing staff tickets keep source='staff' and requester_user_id.

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "source" varchar(16) DEFAULT 'staff' NOT NULL;
--> statement-breakpoint

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "requester_portal_user_id" varchar;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'requester_user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "tickets" ALTER COLUMN "requester_user_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'created_by' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "tickets" ALTER COLUMN "created_by" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requester_portal_user_id_portal_users_id_fk'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_requester_portal_user_id_portal_users_id_fk"
      FOREIGN KEY ("requester_portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_tickets_tenant_portal_requester"
  ON "tickets" ("tenant_id", "requester_portal_user_id");
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requester_source_check'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_requester_source_check" CHECK (
        ("source" = 'staff' AND "requester_user_id" IS NOT NULL)
        OR ("source" = 'portal' AND "requester_portal_user_id" IS NOT NULL)
      );
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "ticket_comments" ADD COLUMN IF NOT EXISTS "author_portal_user_id" varchar;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_comments' AND column_name = 'author_user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "ticket_comments" ALTER COLUMN "author_user_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_comments_author_portal_user_id_portal_users_id_fk'
  ) THEN
    ALTER TABLE "ticket_comments"
      ADD CONSTRAINT "ticket_comments_author_portal_user_id_portal_users_id_fk"
      FOREIGN KEY ("author_portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_comments_author_xor_check'
  ) THEN
    ALTER TABLE "ticket_comments"
      ADD CONSTRAINT "ticket_comments_author_xor_check" CHECK (
        ("author_user_id" IS NOT NULL AND "author_portal_user_id" IS NULL)
        OR ("author_user_id" IS NULL AND "author_portal_user_id" IS NOT NULL)
      );
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "ticket_activity" ADD COLUMN IF NOT EXISTS "actor_portal_user_id" varchar;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_activity' AND column_name = 'actor_user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "ticket_activity" ALTER COLUMN "actor_user_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_activity_actor_portal_user_id_portal_users_id_fk'
  ) THEN
    ALTER TABLE "ticket_activity"
      ADD CONSTRAINT "ticket_activity_actor_portal_user_id_portal_users_id_fk"
      FOREIGN KEY ("actor_portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_activity_actor_xor_check'
  ) THEN
    ALTER TABLE "ticket_activity"
      ADD CONSTRAINT "ticket_activity_actor_xor_check" CHECK (
        ("actor_user_id" IS NOT NULL AND "actor_portal_user_id" IS NULL)
        OR ("actor_user_id" IS NULL AND "actor_portal_user_id" IS NOT NULL)
      );
  END IF;
END $$;
