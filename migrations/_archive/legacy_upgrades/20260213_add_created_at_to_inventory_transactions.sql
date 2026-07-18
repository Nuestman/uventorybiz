-- Ensure inventory_transactions has created_at column to match Drizzle schema
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

