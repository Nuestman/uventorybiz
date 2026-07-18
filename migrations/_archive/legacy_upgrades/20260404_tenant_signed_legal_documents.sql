-- 2026-04-04 — Tenant-uploaded signed legal documents (manual signing; stored in blob/local via FileStorageService).

CREATE TABLE IF NOT EXISTS tenant_signed_legal_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  storage_url TEXT NOT NULL,
  original_filename VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128),
  file_size_bytes INTEGER,
  uploaded_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_signed_legal_tenant ON tenant_signed_legal_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_signed_legal_tenant_created ON tenant_signed_legal_documents(tenant_id, created_at DESC);
