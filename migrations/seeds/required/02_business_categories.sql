-- Seed default business categories for uventorybiz
INSERT INTO business_categories (key, label, description, sort_order, is_active)
VALUES
  ('retail', 'Retail', 'Retail stores and shops', 10, true),
  ('pharmacy', 'Pharmacy', 'Pharmacies and dispensing', 20, true),
  ('laboratory', 'Laboratory', 'Clinical / diagnostic labs offering POC and related testing', 25, true),
  ('wholesale', 'Wholesale', 'Wholesale and distribution', 30, true),
  ('services', 'Services', 'Professional and personal services', 40, true),
  ('hospitality', 'Hospitality', 'Hotels, restaurants, and hospitality', 50, true),
  ('other', 'Other', 'Other business types', 100, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
