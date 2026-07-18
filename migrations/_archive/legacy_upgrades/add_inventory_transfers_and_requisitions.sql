-- Additive migration: new tables and columns for stock requisitions, transfers,
-- and extended inventory_transactions. Safe to run on existing DB (no drops).
-- For a full rebuild with no data, use rebuild_inventory_schema.sql first, then
-- ensure medical_inventory and inventory_transactions exist (via Drizzle or schema).

-- 1) Extend transaction_type enum with new values (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM (
      'receipt_external', 'receipt_transfer', 'issue_to_client', 'issue_internal',
      'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in',
      'return_from_client', 'return_to_supplier', 'disposal',
      'requisition', 'receipt', 'issue', 'adjustment', 'transfer', 'return'
    );
  ELSE
    -- Add new enum values (ignore if already exist)
    BEGIN ALTER TYPE transaction_type ADD VALUE 'receipt_external'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'receipt_transfer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'issue_to_client'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'issue_internal'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'adjustment_increase'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'adjustment_decrease'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'transfer_out'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'transfer_in'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'return_from_client'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'return_to_supplier'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE transaction_type ADD VALUE 'disposal'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- 2) New columns on inventory_transactions (ignore if already exist)
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS location_id VARCHAR REFERENCES care_locations(id);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS counterparty_location_id VARCHAR REFERENCES care_locations(id);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS patient_id VARCHAR REFERENCES patients(id);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS medical_visit_id VARCHAR REFERENCES medical_visits(id);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS document_type VARCHAR;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS document_id VARCHAR;

-- 3) New tables for requisitions and transfers
CREATE TABLE IF NOT EXISTS stock_requisitions (
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

CREATE TABLE IF NOT EXISTS stock_requisition_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requisition_id VARCHAR NOT NULL REFERENCES stock_requisitions(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL,
  approved_quantity INTEGER,
  unit_of_measure VARCHAR,
  unit_cost VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
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

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_id VARCHAR NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
  quantity_planned INTEGER NOT NULL,
  quantity_dispatched INTEGER,
  quantity_received INTEGER,
  unit_of_measure VARCHAR,
  unit_cost VARCHAR,
  batch_number VARCHAR,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_requisitions_tenant ON stock_requisitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_requisitions_fulfilling ON stock_requisitions(fulfilling_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_location_id);
