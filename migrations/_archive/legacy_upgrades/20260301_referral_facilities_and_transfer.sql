-- Referral/transfer facilities (tenant-specific hospitals) and medical visit transfer fields.
-- Safe to run: creates table and adds nullable columns.

-- Referral facilities table
CREATE TABLE IF NOT EXISTS referral_facilities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  address TEXT,
  contact_phone VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_facilities_tenant ON referral_facilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_facilities_status ON referral_facilities(status);

COMMENT ON TABLE referral_facilities IS 'Tenant-specific list of referral/transfer hospitals for disposition "transferred to hospital"';

-- Medical visits: transfer facility (when transferred to hospital) and free-text other
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS transfer_facility_id VARCHAR REFERENCES referral_facilities(id) ON DELETE SET NULL;
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS transfer_facility_other TEXT;

COMMENT ON COLUMN medical_visits.transfer_facility_id IS 'Selected facility when disposition is transferred_to_hospital';
COMMENT ON COLUMN medical_visits.transfer_facility_other IS 'Free text facility name when disposition is transferred_to_hospital_other';
