-- Staff e-ticketing: tenant-scoped tickets, categories, comments, attachments, activity, ticket numbers
-- Safe to run: creates new enums and tables with FKs to existing tenants/users/care_locations/incident_reports

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'open', 'triaged', 'in_progress', 'resolved', 'closed', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ticket_number_sequences (
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, year)
);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT ticket_categories_tenant_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_tenant ON ticket_categories(tenant_id);

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_number VARCHAR NOT NULL,
  category_id VARCHAR NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
  title VARCHAR NOT NULL,
  description_html TEXT NOT NULL DEFAULT '',
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  requester_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  location_id VARCHAR REFERENCES care_locations(id) ON DELETE SET NULL,
  related_incident_id VARCHAR REFERENCES incident_reports(id) ON DELETE SET NULL,
  asset_tag VARCHAR(255),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT tickets_tenant_ticket_number_unique UNIQUE (tenant_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status_updated ON tickets(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_requester ON tickets(tenant_id, requester_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_assignee ON tickets(tenant_id, assignee_user_id);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_html TEXT NOT NULL DEFAULT '',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_url VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  mime_type VARCHAR(255),
  size_bytes INTEGER,
  uploaded_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_activity (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket ON ticket_activity(ticket_id, created_at);

-- Seed default categories for every tenant (idempotent)
INSERT INTO ticket_categories (tenant_id, name, slug, sort_order, is_active)
SELECT t.id, x.name, x.slug, x.ord, true
FROM tenants t
CROSS JOIN (
  VALUES
    ('Repair / maintenance', 'repair-maintenance', 10),
    ('Complaint / concern', 'complaint-concern', 20),
    ('IT / systems', 'it-systems', 30),
    ('Health & safety', 'health-safety', 40)
) AS x(name, slug, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_categories c WHERE c.tenant_id = t.id AND c.slug = x.slug
);

COMMENT ON TABLE tickets IS 'Tenant-scoped staff operations tickets (repairs, complaints, IT, HSE)';
COMMENT ON TABLE ticket_activity IS 'Immutable audit trail for ticket lifecycle changes';
