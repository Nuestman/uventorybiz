-- =====================================================
-- Database Schema Improvements Migration
-- =====================================================
-- This migration implements:
-- 1. Gender enum and column for employees
-- 2. Foreign key constraint on users.employee_id
-- 3. Patient ID generation function (ma####-YY format)
-- =====================================================

-- =====================================================
-- 1. Gender Enum and Column
-- =====================================================
-- Drop existing gender type if it exists
DROP TYPE IF EXISTS gender CASCADE;

-- Create gender enum type
CREATE TYPE IF NOT EXISTS gender AS ENUM ('male', 'female', 'other');

-- Add gender column to employees table (nullable for backward compatibility)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender gender;

-- =====================================================
-- 2. Foreign Key Constraint on users.employee_id
-- =====================================================

-- Add foreign key constraint to users.employee_id
-- Note: This will fail if there are existing invalid employee_id values
-- Since we're in development, we can clean up invalid references first
DO $$
BEGIN
  -- Remove invalid employee_id references (non-existent employees)
  UPDATE users 
  SET employee_id = NULL 
  WHERE employee_id IS NOT NULL 
    AND employee_id NOT IN (SELECT id FROM employees);
    
  -- Add foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_users_employee_id'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT fk_users_employee_id 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 3. Patient ID Generation Function
-- =====================================================

-- Create function to generate patient IDs in format: ma####-YY
-- Format: ma (prefix) + 4-digit number (zero-padded) + - + 2-digit year
CREATE OR REPLACE FUNCTION generate_patient_id() RETURNS VARCHAR AS $$
DECLARE
  year_suffix VARCHAR(2);
  sequence_name VARCHAR;
  next_number INTEGER;
  padded_number VARCHAR(4);
BEGIN
  -- Get last 2 digits of current year
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Create sequence name for this year (e.g., patient_id_seq_26)
  sequence_name := 'patient_id_seq_' || year_suffix;
  
  -- Check if sequence exists for this year, create if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'public' 
    AND sequencename = sequence_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I START 1', sequence_name);
  END IF;
  
  -- Get next value from sequence
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
  
  -- Pad to 4 digits with leading zeros
  padded_number := LPAD(next_number::TEXT, 4, '0');
  
  -- Return formatted ID: ma0001-26
  RETURN 'ma' || padded_number || '-' || year_suffix;
END;
$$ LANGUAGE plpgsql;

-- Update patients table to use the function as default
ALTER TABLE patients 
  ALTER COLUMN id SET DEFAULT generate_patient_id();

-- =====================================================
-- 4. Add LMP (Last Menstrual Period) fields
-- =====================================================

-- Add LMP column to medical_visits table
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS last_menstrual_period DATE;

-- Add LMP column to incident_reports table
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS last_menstrual_period DATE;

-- =====================================================
-- Migration Complete
-- =====================================================

COMMENT ON COLUMN employees.gender IS 'Gender of the employee: male, female, or other';
COMMENT ON CONSTRAINT fk_users_employee_id ON users IS 'Foreign key constraint linking users to employees. ON DELETE SET NULL to handle employee deletion gracefully.';
COMMENT ON FUNCTION generate_patient_id() IS 'Generates patient IDs in format ma####-YY where #### is a 4-digit auto-incrementing number and YY is the last 2 digits of the year. Sequence resets each year.';
COMMENT ON COLUMN medical_visits.last_menstrual_period IS 'Last Menstrual Period (LMP) - for female patients only';
COMMENT ON COLUMN incident_reports.last_menstrual_period IS 'Last Menstrual Period (LMP) - for female patients only';
