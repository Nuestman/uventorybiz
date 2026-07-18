-- Dev-only: enable multi-location flag on all tenants.
-- Run via: npm run db:seed:optional

UPDATE tenants
SET has_multiple_locations = true
WHERE has_multiple_locations IS DISTINCT FROM true;
