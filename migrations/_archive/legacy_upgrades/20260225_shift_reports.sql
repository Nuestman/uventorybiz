-- Shift reports: end-of-shift narrative reports per location (tenant isolated)
-- Safe to run: creates new table with FKs

CREATE TABLE IF NOT EXISTS shift_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR NOT NULL REFERENCES care_locations(id) ON DELETE CASCADE,
  reported_by_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  shift VARCHAR NOT NULL,
  summary VARCHAR NOT NULL,
  notes TEXT,
  activities_notes TEXT,
  handover_notes TEXT,
  has_issues BOOLEAN DEFAULT false,
  issues_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_reports_tenant_date ON shift_reports(tenant_id, report_date);
CREATE INDEX IF NOT EXISTS idx_shift_reports_location_date ON shift_reports(location_id, report_date);

COMMENT ON TABLE shift_reports IS 'End-of-shift narrative reports per care location';
COMMENT ON COLUMN shift_reports.summary IS 'Short sentence from preset select (e.g. Shift was routine with no major events.)';
COMMENT ON COLUMN shift_reports.notes IS 'Free-text details complementing summary';
