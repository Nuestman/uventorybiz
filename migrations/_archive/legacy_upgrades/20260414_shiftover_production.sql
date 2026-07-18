-- ShiftOver production: structured handover, acknowledgments, links, attachments, revision history
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS columns)

ALTER TABLE shift_reports ADD COLUMN IF NOT EXISTS handover_structured JSONB;

COMMENT ON COLUMN shift_reports.handover_structured IS 'Optional structured handover sections (JSON): completed, inProgress, blocked, risksWatch, forNextShift';

CREATE TABLE IF NOT EXISTS shift_report_acknowledgments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_report_id VARCHAR NOT NULL REFERENCES shift_reports(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  acknowledged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT shift_report_ack_report_user_unique UNIQUE (shift_report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_report_ack_tenant ON shift_report_acknowledgments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_report_ack_report ON shift_report_acknowledgments(shift_report_id);

CREATE TABLE IF NOT EXISTS shift_report_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_report_id VARCHAR NOT NULL REFERENCES shift_reports(id) ON DELETE CASCADE,
  linked_type VARCHAR NOT NULL CHECK (linked_type IN ('ticket', 'incident', 'duty')),
  linked_id VARCHAR NOT NULL,
  note TEXT,
  created_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT shift_report_links_report_target_unique UNIQUE (shift_report_id, linked_type, linked_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_report_links_tenant ON shift_report_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_report_links_report ON shift_report_links(shift_report_id);
CREATE INDEX IF NOT EXISTS idx_shift_report_links_target ON shift_report_links(linked_type, linked_id);

CREATE TABLE IF NOT EXISTS shift_report_attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_report_id VARCHAR NOT NULL REFERENCES shift_reports(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  mime_type VARCHAR,
  size_bytes INTEGER,
  uploaded_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_report_attachments_report ON shift_report_attachments(shift_report_id);

CREATE TABLE IF NOT EXISTS shift_report_revision_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_report_id VARCHAR NOT NULL REFERENCES shift_reports(id) ON DELETE CASCADE,
  edited_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_snapshot JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_report_revision_report ON shift_report_revision_history(shift_report_id, created_at DESC);

-- Notification types (preferences / routing)
INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('shift_report_published', 'operations', 'Shift handover published', 'When a colleague submits or updates a shift report for your organization', FALSE),
  ('shift_report_acknowledged', 'operations', 'Shift handover acknowledged', 'When someone acknowledges a shift report you authored', FALSE)
ON CONFLICT (key) DO NOTHING;
