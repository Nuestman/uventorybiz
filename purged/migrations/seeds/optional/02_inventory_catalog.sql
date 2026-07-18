-- Run via: npm run db:seed:optional
--
-- Seed default inventory items (MineAid catalog: consumables, emergency meds, equipment) for all tenants.
-- Run directly in Neon (or any SQL editor): it only INSERTs the values below; nothing in this file updates or
-- overwrites item_code. What you see in the VALUES is what gets stored.
--
-- Idempotent: only inserts where (tenant_id, item_code) does not exist. If you already have rows with OLD codes
-- (e.g. CREPE-BANDAGE from a previous app seed), this will ADD new rows with the codes below (CON-CRE4521 etc.),
-- so you can end up with duplicates (same item name, old + new code). To get exactly these seeded values with no
-- duplicates, run the optional cleanup below once (per tenant if needed), then run this full script.
--
-- Optional one-time cleanup (run once before re-seeding if you want to replace old-format codes):
--   DELETE FROM inventory_stock WHERE tenant_id = 'YOUR_TENANT_ID';
--   DELETE FROM inventory_items WHERE tenant_id = 'YOUR_TENANT_ID';
-- Then run this entire script.
--
-- New tenants also get this catalog via app (ensureDefaultInventoryItems) when they first list inventory.
-- Run after master_item_and_inventory_stock.sql (inventory_items + inventory_stock exist).

BEGIN;

-- 1) Insert into inventory_items for each tenant × catalog item (no duplicates)
-- Item codes use format PREFIX-XXX#### (CON/MED/SUP/EQP + first 3 alphanumeric of name + 4 digits), aligned with UI generateUniqueItemCode.
INSERT INTO inventory_items (tenant_id, item_name, item_code, category, unit_of_measure, dosage_form)
SELECT t.id, v.item_name, v.item_code, v.category::inventory_category, v.unit_of_measure, v.dosage_form
FROM tenants t
CROSS JOIN (VALUES
  -- Bandages & dressings (consumables)
  ('Crepe Bandage', 'CON-CRE4521', 'consumables', 'Each', NULL),
  ('Gauze Bandage', 'CON-GAU7821', 'consumables', 'Roll', NULL),
  ('Sterile Gauze', 'CON-STE1045', 'consumables', 'Pack', NULL),
  ('Triangular Bandage', 'CON-TRI3089', 'consumables', 'Each', NULL),
  ('Adhesive Plaster', 'CON-ADH5621', 'consumables', 'Roll', NULL),
  ('Elastic Bandage', 'CON-ELA8845', 'consumables', 'Each', NULL),
  ('Cotton Wool', 'CON-COT2109', 'consumables', 'Pack', NULL),
  ('Micropore Tape', 'CON-MIC6732', 'consumables', 'Roll', NULL),
  -- Splints & immobilisation (supplies / equipment)
  ('Plastic Splints', 'SUP-PLA4012', 'supplies', 'Set', NULL),
  ('Spider Straps', 'SUP-SPI7198', 'supplies', 'Set', NULL),
  ('Cervical Collar (C-Collar)', 'SUP-CER3356', 'supplies', 'Each', NULL),
  ('Scoop Stretcher', 'EQP-SCO2287', 'equipment', 'Each', NULL),
  ('Spine Board', 'EQP-SPI8002', 'equipment', 'Each', NULL),
  -- PPE & gloves (consumables)
  ('Surgical Gloves', 'CON-SUR9143', 'consumables', 'Box', NULL),
  ('Examination Gloves', 'CON-EXA5577', 'consumables', 'Box', NULL),
  ('Face Masks', 'CON-FAC6623', 'consumables', 'Box', NULL),
  ('N95 Masks', 'CON-N954891', 'consumables', 'Box', NULL),
  -- Instruments & disposables
  ('Scissors', 'SUP-SCI4401', 'supplies', 'Each', NULL),
  ('Trauma Shears', 'SUP-TRA1198', 'supplies', 'Each', NULL),
  ('Disposable Needles', 'CON-DIS7734', 'consumables', 'Box', NULL),
  ('Syringe 2cc', 'CON-SYR2001', 'consumables', 'Each', NULL),
  ('Syringe 5cc', 'CON-SYR5002', 'consumables', 'Each', NULL),
  ('Syringe 10cc', 'CON-SYR1003', 'consumables', 'Each', NULL),
  ('Cannula Size 18', 'CON-CAN4018', 'consumables', 'Each', NULL),
  ('Cannula Size 20', 'CON-CAN4020', 'consumables', 'Each', NULL),
  ('Cannula Size 22', 'CON-CAN4022', 'consumables', 'Each', NULL),
  ('IV Giving Set', 'CON-IVG8821', 'consumables', 'Each', NULL),
  ('Sharp Box', 'CON-SHA3345', 'consumables', 'Each', NULL),
  ('Tongue Depressors', 'CON-TON6690', 'consumables', 'Box', NULL),
  ('Swabs', 'CON-SWA2217', 'consumables', 'Pack', NULL),
  ('Nasal Prongs', 'CON-NAS5543', 'consumables', 'Each', NULL),
  ('Oxygen Mask', 'CON-OXY9012', 'consumables', 'Each', NULL),
  ('Nebulizer Mask', 'CON-NEB1478', 'consumables', 'Each', NULL),
  ('Urine Bag', 'CON-URI6632', 'consumables', 'Each', NULL),
  ('Specimen Container', 'CON-SPE2789', 'consumables', 'Each', NULL),
  ('Hand Sanitizer', 'CON-HAN4456', 'consumables', 'Bottle', NULL),
  ('Antiseptic Solution (Povidone-Iodine)', 'CON-ANT8123', 'consumables', 'Bottle', NULL),
  ('Tourniquet', 'SUP-TOU9954', 'supplies', 'Each', NULL),
  ('Glucose Test Strips', 'CON-GLU3698', 'consumables', 'Box', NULL),
  -- Equipment
  ('Sphygmomanometer', 'EQP-SPH5021', 'equipment', 'Each', NULL),
  ('Thermometer', 'EQP-THE7145', 'equipment', 'Each', NULL),
  ('Pulse Oximeter', 'EQP-PUL2389', 'equipment', 'Each', NULL),
  ('Stethoscope', 'EQP-STE5678', 'equipment', 'Each', NULL),
  ('Glucometer', 'EQP-GLU9012', 'equipment', 'Each', NULL),
  ('Pen Torch', 'EQP-PEN3456', 'equipment', 'Each', NULL),
  ('Automated External Defibrillator (AED)', 'EQP-AED1234', 'equipment', 'Each', NULL),
  ('Bag-Valve-Mask (Ambubag)', 'EQP-BAG6789', 'equipment', 'Each', NULL),
  ('Port Oxygen Bottle', 'EQP-POR4321', 'equipment', 'Each', NULL),
  ('Suction Device', 'EQP-SUC8765', 'equipment', 'Each', NULL),
  ('Nebulizer Machine', 'EQP-NEB3456', 'equipment', 'Each', NULL),
  -- Emergency medications
  ('Adrenaline Injection', 'MED-ADR4521', 'medication', 'Ampoule', 'Injection'),
  ('Epipen', 'MED-EPI7821', 'medication', 'Each', 'Auto-injector'),
  ('Diclofenac Injection', 'MED-DIC1045', 'medication', 'Ampoule', 'Injection'),
  ('Hydrocortisone', 'MED-HYD3089', 'medication', 'Ampoule', 'Injection'),
  ('Dextrose 50%', 'MED-DEX5621', 'medication', 'Ampoule', 'Injection'),
  ('Hyoscine Butyl Bromide', 'MED-HYO8845', 'medication', 'Ampoule', 'Injection'),
  ('Lidocaine', 'MED-LID2109', 'medication', 'Ampoule', 'Injection'),
  ('Metoclopramide', 'MED-MET6732', 'medication', 'Ampoule', 'Injection'),
  ('Morphine', 'MED-MOR4012', 'medication', 'Ampoule', 'Injection'),
  ('Salbutamol 5mg/2.5ml', 'MED-SAL7198', 'medication', 'Nebule', 'Nebuliser solution'),
  ('Paracetamol IV', 'MED-PAR3356', 'medication', 'Vial', 'Injection'),
  ('Normal Saline', 'MED-NOR2287', 'medication', 'Bag', 'IV solution'),
  ('Ringer''s Lactate', 'MED-RIN9143', 'medication', 'Bag', 'IV solution'),
  ('Sterile Water for Injection', 'MED-STE5577', 'medication', 'Ampoule', 'Injection'),
  -- Oral / other medications
  ('Aspirin', 'MED-ASP6623', 'medication', 'Tablet', 'Tablet'),
  ('Paracetamol Tab', 'MED-PAR4891', 'medication', 'Tablet', 'Tablet'),
  ('Ibuprofen', 'MED-IBU4401', 'medication', 'Tablet', 'Tablet'),
  ('Ondansetron', 'MED-OND1198', 'medication', 'Tablet', 'Tablet'),
  ('Chlorpheniramine', 'MED-CHL7734', 'medication', 'Tablet', 'Tablet'),
  ('Cetirizine', 'MED-CET2001', 'medication', 'Tablet', 'Tablet'),
  ('Diazepam', 'MED-DIA5002', 'medication', 'Tablet', 'Tablet'),
  ('Naloxone', 'MED-NAL1003', 'medication', 'Ampoule', 'Injection'),
  ('Tramadol', 'MED-TRA4018', 'medication', 'Capsule', 'Capsule'),
  ('Amoxicillin', 'MED-AMO4020', 'medication', 'Capsule', 'Capsule'),
  ('Metronidazole', 'MED-MTR4022', 'medication', 'Tablet', 'Tablet'),
  ('Prednisolone', 'MED-PRE8821', 'medication', 'Tablet', 'Tablet'),
  ('Ceftriaxone', 'MED-CEF3345', 'medication', 'Vial', 'Injection'),
  ('Gentamicin', 'MED-GEN6690', 'medication', 'Ampoule', 'Injection')
) AS v(item_name, item_code, category, unit_of_measure, dosage_form)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.tenant_id = t.id AND i.item_code = v.item_code);

-- 2) For tenants that have at least one care_location, create one inventory_stock row per catalog item
--    at the first (by created_at) care location, so items appear in the list with 0 stock.
INSERT INTO inventory_stock (tenant_id, item_id, location_id, current_stock, minimum_stock, maximum_stock, reorder_point)
SELECT i.tenant_id, i.id, cl.id, 0, 0, 100, 10
FROM inventory_items i
JOIN LATERAL (
  SELECT id FROM care_locations WHERE tenant_id = i.tenant_id ORDER BY created_at LIMIT 1
) cl ON true
WHERE NOT EXISTS (SELECT 1 FROM inventory_stock s WHERE s.item_id = i.id AND s.tenant_id = i.tenant_id);

COMMIT;
