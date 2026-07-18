-- Master Item + Per-Location Stock migration
-- Replaces medical_inventory with inventory_items (master catalog) + inventory_stock (item+location+stock).
-- Existing inventory data is dropped (no migration) to avoid ID mapping issues.
-- Run after add_inventory_transfers_and_requisitions.sql (or ensure transaction_type enum exists).

BEGIN;

-- 1) Drop dependent tables (order matters)
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS stock_transfer_items CASCADE;
DROP TABLE IF EXISTS stock_transfers CASCADE;
DROP TABLE IF EXISTS stock_requisition_items CASCADE;
DROP TABLE IF EXISTS stock_requisitions CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS equipment_maintenance CASCADE;
DROP TABLE IF EXISTS medical_inventory CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_stock CASCADE;

-- 2) Master catalog: one row per logical item (no stock, no location)
CREATE TABLE inventory_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id VARCHAR REFERENCES companies(id),

  item_name VARCHAR NOT NULL,
  item_code VARCHAR NOT NULL,
  category inventory_category NOT NULL,
  brand VARCHAR,
  model VARCHAR,
  description TEXT,
  unit_of_measure VARCHAR NOT NULL,
  dosage_form VARCHAR,

  supplier VARCHAR,
  supplier_contact VARCHAR,

  status inventory_status DEFAULT 'active',
  equipment_status VARCHAR,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  warranty_expiry DATE,
  serial_number VARCHAR,

  low_stock_alert BOOLEAN DEFAULT true,
  expiry_alert BOOLEAN DEFAULT true,
  expiry_alert_days INTEGER DEFAULT 30,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, item_code)
);

-- 3) Per-location stock: one row per (item, location)
CREATE TABLE inventory_stock (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id VARCHAR NOT NULL REFERENCES care_locations(id) ON DELETE CASCADE,

  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT 100,
  reorder_point INTEGER DEFAULT 10,

  unit_cost VARCHAR,
  total_value VARCHAR,

  expiry_date DATE,
  batch_number VARCHAR,
  lot_number VARCHAR,
  barcode VARCHAR,
  image_url VARCHAR,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, item_id, location_id)
);

CREATE INDEX idx_inventory_stock_tenant_location ON inventory_stock(tenant_id, location_id);
CREATE INDEX idx_inventory_stock_item ON inventory_stock(item_id);

-- 4) Transactions reference the stock row that was updated
CREATE TABLE inventory_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_stock(id) ON DELETE CASCADE,

  location_id VARCHAR REFERENCES care_locations(id),
  counterparty_location_id VARCHAR REFERENCES care_locations(id),

  transaction_type transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost VARCHAR,
  total_cost VARCHAR,

  reference VARCHAR,
  reason VARCHAR,
  transaction_date TIMESTAMP DEFAULT NOW(),

  patient_id VARCHAR REFERENCES patients(id),
  medical_visit_id VARCHAR REFERENCES medical_visits(id),
  document_type VARCHAR,
  document_id VARCHAR,

  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id)
);

-- 5) Requisitions and items (item_id = master item)
CREATE TABLE stock_requisitions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requesting_location_id VARCHAR NOT NULL REFERENCES care_locations(id),
  fulfilling_location_id VARCHAR NOT NULL REFERENCES care_locations(id),
  status VARCHAR NOT NULL DEFAULT 'submitted',
  requested_by_id VARCHAR NOT NULL REFERENCES users(id),
  approved_by_id VARCHAR REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_requisition_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requisition_id VARCHAR NOT NULL REFERENCES stock_requisitions(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL,
  approved_quantity INTEGER,
  unit_of_measure VARCHAR,
  unit_cost VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6) Transfers and items (item_id = master item)
CREATE TABLE stock_transfers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_location_id VARCHAR NOT NULL REFERENCES care_locations(id),
  to_location_id VARCHAR NOT NULL REFERENCES care_locations(id),
  type VARCHAR NOT NULL DEFAULT 'normal',
  status VARCHAR NOT NULL DEFAULT 'pending_dispatch',
  requisition_id VARCHAR REFERENCES stock_requisitions(id),
  dispatched_by_id VARCHAR REFERENCES users(id),
  dispatched_at TIMESTAMP,
  received_by_id VARCHAR REFERENCES users(id),
  received_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_transfer_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_id VARCHAR NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_planned INTEGER NOT NULL,
  quantity_dispatched INTEGER,
  quantity_received INTEGER,
  unit_of_measure VARCHAR,
  unit_cost VARCHAR,
  batch_number VARCHAR,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7) Equipment maintenance references stock row (equipment at a location)
CREATE TABLE equipment_maintenance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id VARCHAR NOT NULL REFERENCES inventory_stock(id) ON DELETE CASCADE,
  maintenance_type maintenance_type NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  maintenance_description TEXT NOT NULL,
  technician_name VARCHAR,
  service_company VARCHAR,
  cost VARCHAR,
  next_maintenance_date DATE,
  certification_expires DATE,
  status maintenance_status DEFAULT 'scheduled',
  completed_by VARCHAR REFERENCES users(id),
  issues_found BOOLEAN DEFAULT false,
  issue_description TEXT,
  equipment_status inventory_status DEFAULT 'active',
  attachments TEXT,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8) Purchase orders; items reference master item
CREATE TABLE purchase_orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_number VARCHAR NOT NULL,
  supplier VARCHAR NOT NULL,
  supplier_contact VARCHAR,
  order_date DATE NOT NULL,
  expected_delivery DATE,
  actual_delivery DATE,
  total_amount VARCHAR NOT NULL,
  status purchase_order_status DEFAULT 'draft',
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, po_number)
);

CREATE TABLE purchase_order_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_id VARCHAR NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost VARCHAR NOT NULL,
  total_cost VARCHAR NOT NULL,
  item_description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9) Alerts reference stock row
CREATE TABLE inventory_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES inventory_stock(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  severity VARCHAR DEFAULT 'medium',
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  acknowledged_by VARCHAR REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  current_stock INTEGER,
  minimum_stock INTEGER,
  expiry_date DATE,
  days_to_expiry INTEGER,
  notification_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_requisitions_tenant ON stock_requisitions(tenant_id);
CREATE INDEX idx_stock_requisitions_fulfilling ON stock_requisitions(fulfilling_location_id);
CREATE INDEX idx_stock_transfers_tenant ON stock_transfers(tenant_id);
CREATE INDEX idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX idx_stock_transfers_to ON stock_transfers(to_location_id);

COMMIT;
