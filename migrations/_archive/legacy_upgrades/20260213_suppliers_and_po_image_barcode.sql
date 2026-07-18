-- Suppliers table + purchase_orders.supplier_id (normalized)
-- inventory_items: image_url, barcode (moved from inventory_stock)
-- Run after master_item_and_inventory_stock.sql (and 20260213_add_created_at_to_inventory_transactions.sql if used).

BEGIN;

-- 1) Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  contact_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- 2) Add supplier_id to purchase_orders; backfill from existing supplier text; then drop old columns
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_id VARCHAR REFERENCES suppliers(id);

-- Backfill: insert one supplier per distinct (tenant_id, supplier), then set supplier_id
INSERT INTO suppliers (id, tenant_id, name)
SELECT gen_random_uuid(), tenant_id, NULLIF(TRIM(supplier), '')
FROM (
  SELECT DISTINCT tenant_id, supplier FROM purchase_orders
  WHERE supplier IS NOT NULL AND TRIM(supplier) != ''
) d;

-- PostgreSQL has no ON CONFLICT on (tenant_id, name) unless we add unique. So use a safe update.
UPDATE purchase_orders po
SET supplier_id = (
  SELECT s.id FROM suppliers s
  WHERE s.tenant_id = po.tenant_id AND s.name = NULLIF(TRIM(po.supplier), '')
  LIMIT 1
)
WHERE po.supplier_id IS NULL AND po.supplier IS NOT NULL AND TRIM(po.supplier) != '';

-- Any POs still without supplier_id: create a placeholder supplier per tenant and assign
INSERT INTO suppliers (id, tenant_id, name)
SELECT gen_random_uuid(), tenant_id, 'Unknown Supplier'
FROM (SELECT DISTINCT tenant_id FROM purchase_orders WHERE supplier_id IS NULL) t;

UPDATE purchase_orders po
SET supplier_id = (SELECT s.id FROM suppliers s WHERE s.tenant_id = po.tenant_id AND s.name = 'Unknown Supplier' LIMIT 1)
WHERE po.supplier_id IS NULL;

ALTER TABLE purchase_orders ALTER COLUMN supplier_id SET NOT NULL;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS supplier;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS supplier_contact;

-- 3) inventory_items: add supplier_id (optional), image_url, barcode
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id VARCHAR REFERENCES suppliers(id);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS image_url VARCHAR;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode VARCHAR;

-- Backfill image_url and barcode from first inventory_stock row per item
UPDATE inventory_items i
SET
  image_url = sub.image_url,
  barcode = sub.barcode
FROM (
  SELECT DISTINCT ON (item_id) item_id, image_url, barcode
  FROM inventory_stock
  WHERE image_url IS NOT NULL OR barcode IS NOT NULL
) sub
WHERE i.id = sub.item_id AND (i.image_url IS NULL AND i.barcode IS NULL);

-- 4) Remove image_url and barcode from inventory_stock
ALTER TABLE inventory_stock DROP COLUMN IF EXISTS image_url;
ALTER TABLE inventory_stock DROP COLUMN IF EXISTS barcode;

COMMIT;
