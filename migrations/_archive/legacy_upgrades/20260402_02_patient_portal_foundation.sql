-- Patient portal: dedicated accounts, sessions, tenant settings, appointment requests, audit trail.
-- Date: 2026-04-02. Staff sessions use sessionToken; portal uses portalSessionToken cookie.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS portal_slug VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_portal_slug_lower
  ON tenants (LOWER(portal_slug))
  WHERE portal_slug IS NOT NULL AND TRIM(portal_slug) <> '';

CREATE TABLE IF NOT EXISTS tenant_portal_settings (
  tenant_id VARCHAR PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  support_email VARCHAR(255),
  privacy_policy_url TEXT,
  features_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  password_reset_token VARCHAR(128),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT portal_users_tenant_email_unique UNIQUE (tenant_id, email),
  CONSTRAINT portal_users_tenant_patient_unique UNIQUE (tenant_id, patient_id)
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id VARCHAR NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON portal_sessions(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions(expires);

CREATE TABLE IF NOT EXISTS portal_appointment_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  preferred_date DATE,
  preferred_time_window VARCHAR(120),
  reason TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  staff_notes TEXT,
  linked_appointment_id VARCHAR REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_appt_req_patient ON portal_appointment_requests(tenant_id, patient_id);

CREATE TABLE IF NOT EXISTS portal_audit_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  patient_id VARCHAR REFERENCES patients(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  details JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_tenant ON portal_audit_events(tenant_id, created_at);
