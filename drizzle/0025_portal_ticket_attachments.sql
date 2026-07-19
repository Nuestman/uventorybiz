-- 0025: Portal ticket attachments — allow portal_users as uploaders

ALTER TABLE "ticket_attachments" ADD COLUMN IF NOT EXISTS "uploaded_by_portal_user_id" varchar;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_attachments' AND column_name = 'uploaded_by_user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "ticket_attachments" ALTER COLUMN "uploaded_by_user_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_attachments_uploaded_by_portal_user_id_portal_users_id_fk'
  ) THEN
    ALTER TABLE "ticket_attachments"
      ADD CONSTRAINT "ticket_attachments_uploaded_by_portal_user_id_portal_users_id_fk"
      FOREIGN KEY ("uploaded_by_portal_user_id") REFERENCES "portal_users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_attachments_uploader_xor_check'
  ) THEN
    ALTER TABLE "ticket_attachments"
      ADD CONSTRAINT "ticket_attachments_uploader_xor_check" CHECK (
        ("uploaded_by_user_id" IS NOT NULL AND "uploaded_by_portal_user_id" IS NULL)
        OR ("uploaded_by_user_id" IS NULL AND "uploaded_by_portal_user_id" IS NOT NULL)
      );
  END IF;
END $$;
