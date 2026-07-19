-- Repair asset tag counters: store last issued AST number (not next available).
-- Aligns with nextAssetTag() which increments then uses the returned value.
UPDATE tenant_asset_tag_counters c
SET
  next_value = COALESCE(
    (
      SELECT MAX(SUBSTRING(ba.asset_tag FROM 5)::int)
      FROM business_assets ba
      WHERE ba.tenant_id = c.tenant_id
        AND ba.asset_tag ~ '^AST-[0-9]+$'
    ),
    0
  ),
  updated_at = now();
