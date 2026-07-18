-- Rebuild inventory-related schema for MineAid HMS
-- NOTE: This migration assumes there is no production-critical data
-- in the inventory tables yet, as discussed in the design documents.

BEGIN;

-- Drop dependent tables first (if they exist)
DROP TABLE IF EXISTS stock_transfer_items CASCADE;
DROP TABLE IF EXISTS stock_transfers CASCADE;
DROP TABLE IF EXISTS stock_requisition_items CASCADE;
DROP TABLE IF EXISTS stock_requisitions CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS equipment_maintenance CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS medical_inventory CASCADE;

-- Drop and recreate transaction_type enum with new values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    DROP TYPE transaction_type;
  END IF;
END$$;

CREATE TYPE transaction_type AS ENUM (
  'receipt_external',
  'receipt_transfer',
  'issue_to_client',
  'issue_internal',
  'adjustment_increase',
  'adjustment_decrease',
  'transfer_out',
  'transfer_in',
  'return_from_client',
  'return_to_supplier',
  'disposal',
  -- Legacy values for compatibility with existing UI
  'requisition',
  'receipt',
  'issue',
  'adjustment',
  'transfer',
  'return'
);

-- The table definitions themselves are managed by Drizzle in shared/schema.ts.
-- This migration only ensures that old tables are dropped and the enum is reset.

COMMIT;

