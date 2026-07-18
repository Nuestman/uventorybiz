-- =====================================================
-- MineAid HMS Database Schema - LEGACY (31 Tables)
-- =====================================================
-- DEPRECATED — do not use for new installs.
--
-- Current schema bootstrap:
--   npm run db:drizzle-migrate          (drizzle/0000 → latest journal)
--   npm run db:sql-migrate -- migrations/add_notification_system.sql  (seeds)
--
-- See: docs/DRIZZLE_MIGRATIONS.md
-- Source of truth: shared/schema.ts + drizzle/meta/_journal.json
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Drop existing enum types if they exist (from previous migrations)
DROP TYPE IF EXISTS instant_test_result CASCADE;
DROP TYPE IF EXISTS instant_test_type CASCADE;
DROP TYPE IF EXISTS final_test_result CASCADE;
DROP TYPE IF EXISTS urine_color CASCADE;
DROP TYPE IF EXISTS work_intensity CASCADE;
DROP TYPE IF EXISTS hydration_action CASCADE;
DROP TYPE IF EXISTS hydration_level CASCADE;
DROP TYPE IF EXISTS dehydration_level CASCADE;
DROP TYPE IF EXISTS testing_device CASCADE;
DROP TYPE IF EXISTS test_status CASCADE;
DROP TYPE IF EXISTS test_result CASCADE;
DROP TYPE IF EXISTS specimen_type CASCADE;
DROP TYPE IF EXISTS hydration_test_reason CASCADE;
DROP TYPE IF EXISTS test_reason CASCADE;
DROP TYPE IF EXISTS test_mode CASCADE;
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS testing_program_type CASCADE;
DROP TYPE IF EXISTS purchase_order_status CASCADE;
DROP TYPE IF EXISTS maintenance_status CASCADE;
DROP TYPE IF EXISTS maintenance_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS inventory_status CASCADE;
DROP TYPE IF EXISTS inventory_category CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS gender CASCADE;
DROP TYPE IF EXISTS department CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS patient_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM ('medical_staff', 'safety_officer', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'decommissioned');
CREATE TYPE patient_status AS ENUM ('active', 'cleared', 'follow_up', 'incident', 'inactive');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE department AS ENUM ('extraction', 'processing', 'maintenance', 'safety', 'administration');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE notification_type AS ENUM ('registration_request', 'status_change', 'password_reset', 'incident_alert', 'appointment_reminder', 'low_stock_alert', 'expiry_alert', 'equipment_maintenance_alert', 'equipment_failure_alert');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
CREATE TYPE inventory_category AS ENUM ('medication', 'supplies', 'equipment', 'consumables');
CREATE TYPE inventory_status AS ENUM ('active', 'discontinued', 'recalled', 'faulty', 'maintenance');
CREATE TYPE transaction_type AS ENUM ('requisition', 'receipt', 'issue', 'adjustment', 'transfer', 'disposal', 'return');
CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective', 'calibration', 'inspection', 'daily_check');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled');
CREATE TYPE testing_program_type AS ENUM ('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up');
CREATE TYPE test_type AS ENUM ('drug', 'alcohol', 'hydration', 'combined');
CREATE TYPE test_mode AS ENUM ('simple', 'comprehensive');
CREATE TYPE test_reason AS ENUM ('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up', 'routine_screening');
CREATE TYPE hydration_test_reason AS ENUM ('random', 'post_incident', 'on_demand', 'heat_illness_suspected', 'routine_check');
CREATE TYPE specimen_type AS ENUM ('urine', 'saliva', 'hair', 'breath', 'blood');
CREATE TYPE test_result AS ENUM ('negative', 'positive', 'non-negative', 'dilute', 'invalid', 'pending', 'inconclusive');
CREATE TYPE test_status AS ENUM ('scheduled', 'collected', 'in_lab', 'results_pending', 'completed', 'cancelled', 'no_show');
CREATE TYPE testing_device AS ENUM ('drugcheck_3000', 'breathalyzer', 'comprehensive_lab', 'field_test', 'instant_test');
CREATE TYPE dehydration_level AS ENUM ('normal', 'mild', 'moderate', 'severe');
CREATE TYPE hydration_level AS ENUM ('adequate', 'mild_dehydration', 'moderate_dehydration', 'severe_dehydration');
CREATE TYPE hydration_action AS ENUM ('continue_work', 'rest_hydrate', 'medical_evaluation', 'immediate_treatment');
CREATE TYPE work_intensity AS ENUM ('light', 'moderate', 'heavy', 'extreme');
CREATE TYPE urine_color AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8');
CREATE TYPE final_test_result AS ENUM ('negative', 'positive', 'test_not_conducted', 'awaiting_confirmation');
CREATE TYPE instant_test_type AS ENUM ('hb', 'pregnancy', 'malaria', 'typhoid');
CREATE TYPE instant_test_result AS ENUM ('positive', 'negative', 'invalid');

-- =====================================================
-- SESSION STORAGE (for express-session)
-- =====================================================

DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Tenants (Mining Sites)
DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  organization_type VARCHAR NOT NULL DEFAULT 'mining_site',
  contact_email VARCHAR NOT NULL,
  contact_phone VARCHAR,
  address TEXT,
  plan_type VARCHAR NOT NULL DEFAULT 'basic',
  status VARCHAR NOT NULL DEFAULT 'pending',
  max_users INTEGER DEFAULT 50,
  max_companies INTEGER DEFAULT 10,
  has_multiple_locations BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON COLUMN tenants.has_multiple_locations IS 'Feature flag: enables multi-location system for this tenant';

-- Users
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  phone_number VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  bio TEXT,
  password VARCHAR,
  auth_provider VARCHAR NOT NULL DEFAULT 'custom',
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE SET NULL,
  employee_id VARCHAR REFERENCES employees(id) ON DELETE SET NULL,
  role user_role DEFAULT 'medical_staff',
  status user_status DEFAULT 'pending',
  last_login_at TIMESTAMP,
  password_reset_token VARCHAR,
  password_reset_expires TIMESTAMP,
  email_verification_token VARCHAR,
  phone_verification_code VARCHAR,
  phone_verification_expires TIMESTAMP,
  approved_by VARCHAR,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Verifications
DROP TABLE IF EXISTS email_verifications CASCADE;

CREATE TABLE IF NOT EXISTS email_verifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  expires TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Companies
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  company_type VARCHAR NOT NULL DEFAULT 'contractor',
  contact_email VARCHAR NOT NULL,
  contact_phone VARCHAR,
  address TEXT,
  license_number VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_number VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR,
  phone_number VARCHAR,
  date_of_birth DATE,
  gender gender,
  department department NOT NULL,
  position VARCHAR NOT NULL,
  job_title VARCHAR NOT NULL,
  hire_date DATE NOT NULL,
  emergency_contact_name VARCHAR,
  emergency_contact_phone VARCHAR,
  profile_image_url TEXT,
  medical_clearance BOOLEAN DEFAULT TRUE,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, employee_number)
);

-- Care Locations
DROP TABLE IF EXISTS care_locations CASCADE;

CREATE TABLE IF NOT EXISTS care_locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_name VARCHAR NOT NULL,
  location_code VARCHAR NOT NULL,
  description TEXT,
  address TEXT,
  contact_phone VARCHAR,
  contact_email VARCHAR,
  latitude VARCHAR,
  longitude VARCHAR,
  is_primary BOOLEAN DEFAULT FALSE,
  status VARCHAR NOT NULL DEFAULT 'active',
  capacity INTEGER,
  operating_hours TEXT,
  staff_count INTEGER DEFAULT 0,
  capabilities TEXT,
  equipment_list TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, location_code),
  UNIQUE(tenant_id, location_name)
);

CREATE INDEX IF NOT EXISTS idx_care_locations_tenant ON care_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_care_locations_status ON care_locations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_tenant ON care_locations(tenant_id) WHERE is_primary = true;

COMMENT ON TABLE care_locations IS 'Emergency care locations and mini-clinics within a mining site';
COMMENT ON COLUMN care_locations.is_primary IS 'One primary location per tenant - used for single-location mode';

-- User Sessions (staff auth) - Must be after care_locations
DROP TABLE IF EXISTS user_sessions CASCADE;

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  active_location_id VARCHAR REFERENCES care_locations(id),
  active_location_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_location ON user_sessions(active_location_id);

COMMENT ON COLUMN user_sessions.active_location_id IS 'Current working location for this session (shift)';
COMMENT ON COLUMN user_sessions.active_location_name IS 'Location name cached for display';

-- Patient ID Generation Function
-- Creates patient IDs in format: ma####-YY (ma prefix + 4-digit number + year suffix)
CREATE OR REPLACE FUNCTION generate_patient_id() RETURNS VARCHAR AS $$
DECLARE
  year_suffix VARCHAR(2);
  sequence_name TEXT;
  next_number INTEGER;
  max_existing INTEGER;
  seq_last BIGINT;
  new_id VARCHAR;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  sequence_name := 'patient_id_seq_' || year_suffix;

  SELECT COALESCE(MAX((substring(id FROM 3 FOR 4))::INTEGER), 0)
  INTO max_existing
  FROM patients
  WHERE id ~ ('^ma[0-9]{4}-' || year_suffix || '$');

  IF NOT EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename = sequence_name
  ) THEN
    IF max_existing = 0 THEN
      EXECUTE format('CREATE SEQUENCE %I START 1', sequence_name);
    ELSE
      EXECUTE format('CREATE SEQUENCE %I START %s', sequence_name, max_existing + 1);
    END IF;
  ELSE
    SELECT last_value
    INTO seq_last
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename = sequence_name;

    IF max_existing > 0 AND max_existing >= seq_last THEN
      EXECUTE format('SELECT setval(%L, %s, false)', sequence_name, max_existing + 1);
    END IF;
  END IF;

  LOOP
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
    new_id := 'ma' || LPAD(next_number::TEXT, 4, '0') || '-' || year_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM patients WHERE id = new_id);
  END LOOP;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Patients
DROP TABLE IF EXISTS patients CASCADE;

CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR PRIMARY KEY DEFAULT generate_patient_id(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status patient_status DEFAULT 'active',
  medical_clearance BOOLEAN DEFAULT TRUE,
  notes TEXT,
  allergies TEXT,
  medical_history TEXT,
  medications TEXT,
  disability TEXT,
  first_visit TIMESTAMP DEFAULT NOW(),
  last_visit TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Appointments
DROP TABLE IF EXISTS appointments CASCADE;

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medical_staff_id VARCHAR NOT NULL REFERENCES users(id),
  location_id VARCHAR REFERENCES care_locations(id),
  appointment_date TIMESTAMP NOT NULL,
  appointment_type VARCHAR NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);

COMMENT ON COLUMN appointments.location_id IS 'Care location for the appointment';

-- Medical Visits
DROP TABLE IF EXISTS medical_visits CASCADE;

CREATE TABLE IF NOT EXISTS medical_visits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medical_staff_id VARCHAR NOT NULL REFERENCES users(id),
  location_id VARCHAR REFERENCES care_locations(id),
  visit_date TIMESTAMP NOT NULL,
  visit_type VARCHAR NOT NULL DEFAULT 'routine',
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  temperature VARCHAR,
  respiratory_rate INTEGER,
  oxygen_saturation INTEGER,
  glucose_level INTEGER,
  pain_score INTEGER,
  weight VARCHAR,
  height VARCHAR,
  physical_examination TEXT,
  assessment TEXT,
  treatment TEXT,
  medications TEXT,
  procedures TEXT,
  disposition VARCHAR NOT NULL,
  work_restrictions TEXT,
  follow_up_date TIMESTAMP,
  follow_up_instructions TEXT,
  notes TEXT,
  last_menstrual_period DATE,
  status VARCHAR DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_visits_location ON medical_visits(location_id);

COMMENT ON COLUMN medical_visits.location_id IS 'Care location where medical visit occurred';

-- Incident Reports
DROP TABLE IF EXISTS incident_reports CASCADE;

CREATE TABLE IF NOT EXISTS incident_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reported_by_id VARCHAR NOT NULL REFERENCES users(id),
  location_id VARCHAR REFERENCES care_locations(id),
  incident_date TIMESTAMP NOT NULL,
  reported_to_fap_date TIMESTAMP,
  incident_location VARCHAR NOT NULL,
  job_title VARCHAR NOT NULL,
  incident_type VARCHAR NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR NOT NULL,
  treated_on_site BOOLEAN DEFAULT FALSE,
  detained_at_fap BOOLEAN DEFAULT FALSE,
  ambulance_used BOOLEAN DEFAULT FALSE,
  emergency_medical_mgt TEXT,
  disposition_date_time TIMESTAMP,
  general_condition_at_disposition VARCHAR,
  last_menstrual_period DATE,
  reported_to TEXT,
  incident_uploads TEXT,
  status VARCHAR DEFAULT 'open',
  actions_taken TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_location ON incident_reports(location_id);

COMMENT ON COLUMN incident_reports.incident_location IS 'Work site where incident occurred';
COMMENT ON COLUMN incident_reports.location_id IS 'Care location where patient was treated (not where incident occurred)';
COMMENT ON COLUMN incident_reports.emergency_medical_mgt IS 'Emergency medical management details and procedures performed during the incident';

-- Notifications
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  metadata JSONB,
  read_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id VARCHAR,
  original_data JSONB,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- OPERATIONAL DUTIES
-- =====================================================

-- Operational Duties
DROP TABLE IF EXISTS operational_duties CASCADE;

CREATE TABLE IF NOT EXISTS operational_duties (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  frequency VARCHAR NOT NULL,
  scheduled_time VARCHAR,
  scheduled_days TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority VARCHAR DEFAULT 'normal',
  estimated_duration INTEGER,
  category VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Duty Assignments (operational_ prefix for consistency with operational_duties)
DROP TABLE IF EXISTS operational_duty_assignments CASCADE;

CREATE TABLE IF NOT EXISTS operational_duty_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  duty_id VARCHAR NOT NULL REFERENCES operational_duties(id) ON DELETE CASCADE,
  assigned_to_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  location_id VARCHAR REFERENCES care_locations(id),
  assignment_date TIMESTAMP NOT NULL,
  shift VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  completed_at TIMESTAMP,
  completed_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP,
  notes TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_duty_assignments_location ON operational_duty_assignments(location_id);

COMMENT ON COLUMN operational_duty_assignments.location_id IS 'Care location for duty assignment';

-- Duty Completions (operational_ prefix)
DROP TABLE IF EXISTS operational_duty_completions CASCADE;

CREATE TABLE IF NOT EXISTS operational_duty_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id VARCHAR NOT NULL REFERENCES operational_duty_assignments(id) ON DELETE CASCADE,
  duty_id VARCHAR NOT NULL REFERENCES operational_duties(id) ON DELETE CASCADE,
  completed_by_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completion_notes TEXT,
  issues_found BOOLEAN DEFAULT FALSE,
  issue_description TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  attachments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MEDICAL INVENTORY & EQUIPMENT
-- =====================================================

-- Medical Inventory
DROP TABLE IF EXISTS medical_inventory CASCADE;

CREATE TABLE IF NOT EXISTS medical_inventory (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT 100,
  reorder_point INTEGER DEFAULT 10,
  unit_cost VARCHAR,
  total_value VARCHAR,
  supplier VARCHAR,
  supplier_contact VARCHAR,
  expiry_date DATE,
  batch_number VARCHAR,
  lot_number VARCHAR,
  location VARCHAR,
  location_id VARCHAR REFERENCES care_locations(id),
  barcode VARCHAR,
  image_url VARCHAR,
  status inventory_status DEFAULT 'active',
  equipment_status VARCHAR,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  warranty_expiry DATE,
  serial_number VARCHAR,
  low_stock_alert BOOLEAN DEFAULT TRUE,
  expiry_alert BOOLEAN DEFAULT TRUE,
  expiry_alert_days INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_medical_inventory_location_id ON medical_inventory(location_id);

COMMENT ON COLUMN medical_inventory.image_url IS 'URL/path to item image stored in public/inventory-images/';
COMMENT ON COLUMN medical_inventory.location_id IS 'Foreign key to care_locations table - indicates where inventory item is stored';

-- Inventory Transactions
DROP TABLE IF EXISTS inventory_transactions CASCADE;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost VARCHAR,
  total_cost VARCHAR,
  reference VARCHAR,
  reason VARCHAR,
  transaction_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Maintenance
DROP TABLE IF EXISTS equipment_maintenance CASCADE;

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
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
  issues_found BOOLEAN DEFAULT FALSE,
  issue_description TEXT,
  equipment_status inventory_status DEFAULT 'active',
  attachments TEXT,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders
DROP TABLE IF EXISTS purchase_orders CASCADE;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Purchase Order Items
DROP TABLE IF EXISTS purchase_order_items CASCADE;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_id VARCHAR NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost VARCHAR NOT NULL,
  total_cost VARCHAR NOT NULL,
  item_description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Alerts
DROP TABLE IF EXISTS inventory_alerts CASCADE;

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR NOT NULL REFERENCES medical_inventory(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  severity VARCHAR DEFAULT 'medium',
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  acknowledged_by VARCHAR REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  current_stock INTEGER,
  minimum_stock INTEGER,
  expiry_date DATE,
  days_to_expiry INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DRUGS, ALCOHOL & HYDRATION TESTING
-- =====================================================

-- Testing Programs
DROP TABLE IF EXISTS testing_programs CASCADE;

CREATE TABLE IF NOT EXISTS testing_programs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  program_name VARCHAR NOT NULL,
  program_type testing_program_type NOT NULL,
  testing_frequency VARCHAR,
  pool_size INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  required_tests TEXT,
  departments TEXT,
  job_classifications TEXT,
  ug_personnel_focused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, program_name)
);

-- Drug Tests
DROP TABLE IF EXISTS drug_tests CASCADE;

CREATE TABLE IF NOT EXISTS drug_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_number VARCHAR NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  patient_id VARCHAR REFERENCES patients(id),
  program_id VARCHAR REFERENCES testing_programs(id),
  location_id VARCHAR REFERENCES care_locations(id),
  test_reason test_reason NOT NULL,
  test_mode test_mode DEFAULT 'simple',
  specimen_type specimen_type DEFAULT 'urine',
  testing_device testing_device DEFAULT 'drugcheck_3000',
  scheduled_date DATE,
  scheduled_time VARCHAR,
  collection_date DATE,
  collection_time VARCHAR,
  collector_name VARCHAR,
  collection_site VARCHAR,
  chain_of_custody VARCHAR,
  testing_lab VARCHAR,
  result_date DATE,
  drug_result test_result,
  substances_detected TEXT,
  coc_result test_result,
  opi_result test_result,
  thc_result test_result,
  amp_result test_result,
  met_result test_result,
  bzo_result test_result,
  mro_review BOOLEAN DEFAULT FALSE,
  mro_name VARCHAR,
  mro_notes TEXT,
  final_result final_test_result,
  disciplinary_action TEXT,
  return_to_duty_required BOOLEAN DEFAULT FALSE,
  follow_up_testing_required BOOLEAN DEFAULT FALSE,
  status test_status DEFAULT 'scheduled',
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  reviewed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, test_number)
);

CREATE INDEX IF NOT EXISTS idx_drug_tests_location ON drug_tests(location_id);

COMMENT ON COLUMN drug_tests.location_id IS 'Care location where test was conducted';

-- Alcohol Tests
DROP TABLE IF EXISTS alcohol_tests CASCADE;

CREATE TABLE IF NOT EXISTS alcohol_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_number VARCHAR NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  patient_id VARCHAR REFERENCES patients(id),
  program_id VARCHAR REFERENCES testing_programs(id),
  location_id VARCHAR REFERENCES care_locations(id),
  test_reason test_reason NOT NULL,
  test_mode test_mode DEFAULT 'simple',
  testing_device VARCHAR DEFAULT 'breathalyzer',
  scheduled_date DATE,
  scheduled_time VARCHAR,
  test_date DATE,
  test_time VARCHAR,
  tester_name VARCHAR,
  test_location VARCHAR,
  alcohol_result test_result,
  alcohol_level VARCHAR,
  breathalyzer_reading VARCHAR,
  device_serial_number VARCHAR,
  lab_result test_result,
  lab_alcohol_level VARCHAR,
  final_result final_test_result,
  disciplinary_action TEXT,
  return_to_duty_required BOOLEAN DEFAULT FALSE,
  follow_up_testing_required BOOLEAN DEFAULT FALSE,
  status test_status DEFAULT 'scheduled',
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  reviewed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, test_number)
);

CREATE INDEX IF NOT EXISTS idx_alcohol_tests_location ON alcohol_tests(location_id);

COMMENT ON COLUMN alcohol_tests.location_id IS 'Care location where test was conducted';

-- Hydration Tests
DROP TABLE IF EXISTS hydration_tests CASCADE;

CREATE TABLE IF NOT EXISTS hydration_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_number VARCHAR NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  patient_id VARCHAR REFERENCES patients(id),
  program_id VARCHAR REFERENCES testing_programs(id),
  location_id VARCHAR REFERENCES care_locations(id),
  test_reason hydration_test_reason NOT NULL,
  test_location VARCHAR,
  ug_personnel BOOLEAN DEFAULT FALSE,
  scheduled_date DATE,
  scheduled_time VARCHAR,
  test_date DATE,
  test_time VARCHAR,
  ambient_temperature VARCHAR,
  humidity VARCHAR,
  work_intensity work_intensity,
  urine_color urine_color,
  urine_specific_gravity VARCHAR,
  body_weight_before VARCHAR,
  body_weight_after VARCHAR,
  weight_loss_percentage VARCHAR,
  skin_turgor hydration_level,
  mucous_membranes hydration_level,
  mental_status VARCHAR,
  vital_signs TEXT,
  hydration_level hydration_level NOT NULL,
  hydration_score INTEGER,
  recommended_action hydration_action,
  treatment_provided BOOLEAN DEFAULT FALSE,
  treatment_notes TEXT,
  return_to_work_cleared BOOLEAN DEFAULT FALSE,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  status test_status DEFAULT 'scheduled',
  notes TEXT,
  tested_by VARCHAR NOT NULL REFERENCES users(id),
  reviewed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, test_number)
);

CREATE INDEX IF NOT EXISTS idx_hydration_tests_location ON hydration_tests(location_id);

COMMENT ON COLUMN hydration_tests.location_id IS 'Care location where test was conducted';

-- Instant Tests (POC: HB, Pregnancy, Malaria, Typhoid)
DROP TABLE IF EXISTS instant_tests CASCADE;

CREATE TABLE IF NOT EXISTS instant_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  test_number VARCHAR NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  patient_id VARCHAR REFERENCES patients(id),
  location_id VARCHAR REFERENCES care_locations(id),
  test_type instant_test_type NOT NULL,
  test_date DATE NOT NULL,
  test_time VARCHAR,
  test_location VARCHAR,
  tested_by VARCHAR NOT NULL REFERENCES users(id),
  test_result instant_test_result,
  hb_level VARCHAR,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, test_number)
);

CREATE INDEX IF NOT EXISTS idx_instant_tests_tenant_id ON instant_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_instant_tests_employee_id ON instant_tests(employee_id);
CREATE INDEX IF NOT EXISTS idx_instant_tests_location_id ON instant_tests(location_id);
CREATE INDEX IF NOT EXISTS idx_instant_tests_test_date ON instant_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_instant_tests_test_type ON instant_tests(test_type);

COMMENT ON TABLE instant_tests IS 'POC Instant Tests: HB, Pregnancy, Malaria, Typhoid tests for mining personnel';
COMMENT ON COLUMN instant_tests.test_type IS 'Type of instant test: hb, pregnancy, malaria, typhoid';
COMMENT ON COLUMN instant_tests.test_result IS 'Test result: positive, negative, invalid (not applicable for HB tests)';
COMMENT ON COLUMN instant_tests.hb_level IS 'Hemoglobin level in g/dL (only for HB tests)';

-- Random Testing Pools
DROP TABLE IF EXISTS random_testing_pools CASCADE;

CREATE TABLE IF NOT EXISTS random_testing_pools (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pool_name VARCHAR NOT NULL,
  department department,
  job_classification VARCHAR,
  employee_count INTEGER DEFAULT 0,
  testing_rate VARCHAR,
  last_selection_date DATE,
  next_selection_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, pool_name)
);

-- Random Selections
DROP TABLE IF EXISTS random_selections CASCADE;

CREATE TABLE IF NOT EXISTS random_selections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pool_id VARCHAR NOT NULL REFERENCES random_testing_pools(id) ON DELETE CASCADE,
  selection_date DATE NOT NULL,
  employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  selected_for_testing BOOLEAN DEFAULT TRUE,
  test_completed BOOLEAN DEFAULT FALSE,
  drug_test_id VARCHAR REFERENCES drug_tests(id),
  alcohol_test_id VARCHAR REFERENCES alcohol_tests(id),
  hydration_test_id VARCHAR REFERENCES hydration_tests(id),
  selection_method VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Testing Equipment
DROP TABLE IF EXISTS testing_equipment CASCADE;

CREATE TABLE IF NOT EXISTS testing_equipment (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_name VARCHAR NOT NULL,
  device_type testing_device NOT NULL,
  model VARCHAR,
  serial_number VARCHAR,
  manufacturer VARCHAR,
  last_calibration_date DATE,
  next_calibration_date DATE,
  calibration_certificate VARCHAR,
  status inventory_status DEFAULT 'active',
  location VARCHAR,
  supported_tests TEXT,
  test_accuracy VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This schema includes all 31 tables:
-- 1. sessions
-- 2. tenants
-- 3. users
-- 4. user_sessions
-- 5. email_verifications
-- 6. companies
-- 7. employees
-- 8. care_locations
-- 9. patients
-- 10. appointments
-- 11. medical_visits
-- 12. incident_reports
-- 13. notifications
-- 14. audit_logs
-- 15. operational_duties
-- 16. operational_duty_assignments
-- 17. operational_duty_completions
-- 18. medical_inventory
-- 19. inventory_transactions
-- 20. equipment_maintenance
-- 21. purchase_orders
-- 22. purchase_order_items
-- 23. inventory_alerts
-- 24. testing_programs
-- 25. drug_tests
-- 26. alcohol_tests
-- 27. hydration_tests
-- 28. instant_tests
-- 29. random_testing_pools
-- 30. random_selections
-- 31. testing_equipment
--
-- After running this file, verify:
-- 1. All tables are created successfully
-- 2. All foreign key constraints are properly set
-- 3. All indexes are created
-- 4. All unique constraints are in place
-- =====================================================
