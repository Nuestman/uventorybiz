-- Seed common procedures for tenants that have none (idempotent).
-- Table structure is in drizzle/0001. App also seeds on first use.
-- Run via: npm run db:seed:optional

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
