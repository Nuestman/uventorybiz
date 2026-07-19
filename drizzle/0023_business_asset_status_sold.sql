-- Add sold to business_assets.status (idempotent)
DO $$ BEGIN
  ALTER TYPE "business_asset_status" ADD VALUE 'sold';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
