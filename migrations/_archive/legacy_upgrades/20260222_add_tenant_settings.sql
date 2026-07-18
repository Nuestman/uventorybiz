-- Tenant-scoped system settings: currency preference and white labeling
-- Safe to run: adds nullable/new columns with defaults where applicable

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_code VARCHAR DEFAULT 'GHS';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_name VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;

COMMENT ON COLUMN tenants.currency_code IS 'ISO 4217 currency code for UI and inventory (e.g. GHS, USD)';
COMMENT ON COLUMN tenants.app_name IS 'White label: custom application name';
COMMENT ON COLUMN tenants.logo_url IS 'White label: custom logo URL';
COMMENT ON COLUMN tenants.primary_color IS 'White label: primary theme color hex e.g. #142F5C';
COMMENT ON COLUMN tenants.favicon_url IS 'White label: custom favicon URL';
