-- Incident drill/simulation flag — set when closing an incident.
-- See docs/INCIDENT_STATUS_LIFECYCLE.md

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS is_drill_or_simulation BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_incident_reports_drill
  ON incident_reports(tenant_id, is_drill_or_simulation, incident_date);
