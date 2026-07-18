-- Seed default operational duties (MineAid catalog) for all tenants that have none.
-- Idempotent: safe to run multiple times. New tenants also get defaults via app (ensureDefaultOperationalDuties).
-- Columns: tenant_id, title, description, frequency, priority, estimated_duration, category (is_active, created_at, updated_at have defaults)

INSERT INTO operational_duties (tenant_id, title, description, frequency, priority, estimated_duration, category)
SELECT t.id, d.title, d.description, d.frequency, d.priority, d.estimated_duration, d.category
FROM tenants t
CROSS JOIN (VALUES
  ('Equipment Check', 'Routine equipment inspection and verification.', 'daily', 'normal', 30, 'equipment'),
  ('Ambulance Inspection', 'Ambulance readiness and medical kit check.', 'daily', 'high', 45, 'equipment'),
  ('Drug/Alcohol Test', 'Conduct drug and alcohol testing as per schedule.', 'scheduled', 'high', 60, 'safety'),
  ('Airport Ambulance Stand-by', 'Stand-by medical cover at airport as scheduled.', 'scheduled', 'normal', 120, 'medical'),
  ('FAP/Clinic Case Review', 'Recording and reviewing of cases at the First Aid Post / clinic.', 'weekly', 'normal', 60, 'medical'),
  ('FAP/Clinic Inspection', 'Inspection of FAP/clinic facilities.', 'weekly', 'normal', 45, 'inspection'),
  ('UG Refuge Chamber Inspection', 'Underground refuge chamber inspection.', 'weekly', 'high', 60, 'safety'),
  ('Emergency Response Training', 'Emergency response training.', 'monthly', 'normal', 120, 'training')
) AS d(title, description, frequency, priority, estimated_duration, category)
WHERE NOT EXISTS (SELECT 1 FROM operational_duties o WHERE o.tenant_id = t.id);
