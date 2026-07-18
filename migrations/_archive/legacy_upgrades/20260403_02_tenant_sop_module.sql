-- 2026-04-03 — Tenant standard operating procedures: documents + versioned workflow (draft → approval → published).

DO $$ BEGIN
  CREATE TYPE tenant_sop_version_status AS ENUM (
    'draft',
    'pending_approval',
    'published',
    'archived',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenant_sop_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  code VARCHAR(64),
  department VARCHAR(128),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_sop_documents_tenant ON tenant_sop_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sop_documents_tenant_archived ON tenant_sop_documents(tenant_id, is_archived);

CREATE TABLE IF NOT EXISTS tenant_sop_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id VARCHAR NOT NULL REFERENCES tenant_sop_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status tenant_sop_version_status NOT NULL DEFAULT 'draft',
  content_html TEXT NOT NULL DEFAULT '',
  attachment_url VARCHAR(2048),
  attachment_filename VARCHAR(512),
  attachment_mime VARCHAR(128),
  change_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  rejected_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  CONSTRAINT uq_tenant_sop_versions_doc_ver UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sop_versions_document ON tenant_sop_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sop_versions_status ON tenant_sop_versions(status);
