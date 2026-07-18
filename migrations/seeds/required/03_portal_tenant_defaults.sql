-- Backfill portal feature flags for existing enabled portal tenants (no-op on empty DB).
-- New tenants get defaults from application code.
-- Run via: npm run db:seed

UPDATE tenant_portal_settings
SET features_json = COALESCE(features_json, '{}'::jsonb) || '{"messaging": true}'::jsonb,
    updated_at = NOW()
WHERE enabled = TRUE
  AND (
    features_json IS NULL
    OR features_json->>'messaging' IS NULL
    OR features_json->>'messaging' = 'false'
  );
