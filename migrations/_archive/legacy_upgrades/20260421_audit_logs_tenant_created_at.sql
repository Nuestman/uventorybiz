-- Compliance / tenant audit reporting: speed up time-range aggregates scoped by tenant.
-- See GET /api/reports/compliance and tenant audit log queries.

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at
  ON audit_logs (tenant_id, created_at);
