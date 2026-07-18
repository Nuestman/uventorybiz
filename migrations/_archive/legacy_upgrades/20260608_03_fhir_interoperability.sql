-- FHIR interoperability: partner facilities and care transfer audit log

CREATE TABLE IF NOT EXISTS interop_partners (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referral_facility_id VARCHAR REFERENCES referral_facilities(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  fhir_base_url TEXT,
  delivery_url TEXT,
  delivery_bearer_token TEXT,
  inbound_api_key_hash VARCHAR NOT NULL,
  inbound_api_key_prefix VARCHAR(16) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  allow_inbound_read BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interop_partners_tenant ON interop_partners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interop_partners_prefix ON interop_partners(inbound_api_key_prefix);

CREATE TABLE IF NOT EXISTS interop_transfers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  partner_id VARCHAR REFERENCES interop_partners(id) ON DELETE SET NULL,
  referring_encounter_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL,
  encounter_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  bundle_id VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'prepared',
  delivery_method VARCHAR(32) NOT NULL DEFAULT 'download',
  error_message TEXT,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interop_transfers_tenant_patient ON interop_transfers(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_interop_transfers_status ON interop_transfers(tenant_id, status);
