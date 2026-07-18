-- Master procedures table (tenant-scoped) for "Procedures Performed" in medical visits.
-- Safe to run: creates table if not present, then seeds common procedures for tenants that have none.

CREATE TABLE IF NOT EXISTS procedures (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procedures_tenant_id ON procedures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procedures_tenant_active ON procedures(tenant_id, is_active);

COMMENT ON TABLE procedures IS 'Master list of procedures for medical visits (procedures performed dropdown)';
COMMENT ON COLUMN procedures.tenant_id IS 'Tenant (site) this procedure belongs to';
COMMENT ON COLUMN procedures.name IS 'Display name e.g. C-Spine Immobilization, Minor suturing';
COMMENT ON COLUMN procedures.sort_order IS 'Order in dropdown (lower first)';

-- Seed common procedures for all tenants that have none (idempotent).
INSERT INTO procedures (tenant_id, name, sort_order, is_active)
SELECT t.id, d.name, d.sort_order, true
FROM tenants t
CROSS JOIN (VALUES
  (1, 'C-Spine Immobilization'),
  (2, 'Immobilization (splint/sling)'),
  (3, 'Wound cleaning and dressing'),
  (4, 'Minor suturing'),
  (5, 'Nebulization'),
  (6, 'Splint application'),
  (7, 'Sling application'),
  (8, 'IV access / IV fluids'),
  (9, 'ECG'),
  (10, 'Urine dipstick / urinalysis'),
  (11, 'Blood glucose check'),
  (12, 'Bandaging'),
  (13, 'Foreign body removal'),
  (14, 'Incision and drainage'),
  (15, 'Ear irrigation'),
  (16, 'Eye irrigation'),
  (17, 'Oxygen administration'),
  (18, 'Medication administration (injection)'),
  (19, 'Peak flow / spirometry'),
  (20, 'Rapid test (e.g. Malaria, Pregnancy, Typhoid)'),
  (21, 'CPR / Basic life support')
) AS d(sort_order, name)
WHERE NOT EXISTS (SELECT 1 FROM procedures p WHERE p.tenant_id = t.id);
