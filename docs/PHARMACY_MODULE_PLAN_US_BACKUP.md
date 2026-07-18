# MineAid HMS - Pharmacy Module Comprehensive Plan
## Tenant- and Care Location-Isolated Pharmaceutical Management System

**Version:** 1.0.0  
**Status:** Planning Phase 📋  
**Last Updated:** October 11, 2025  
**Target Implementation:** Q1 2026

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Features & Functionality](#features--functionality)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [User Workflows](#user-workflows)
8. [Integration Points](#integration-points)
9. [Security & Compliance](#security--compliance)
10. [Reporting & Analytics](#reporting--analytics)
11. [Implementation Phases](#implementation-phases)
12. [Dependencies & Prerequisites](#dependencies--prerequisites)

---

## Executive Overview

### Purpose
The Pharmacy Module provides comprehensive pharmaceutical management for mining healthcare facilities, ensuring proper medication dispensing, inventory control, prescription management, and regulatory compliance—all with strict tenant and care location isolation.

### Key Objectives
- **Safe Medication Dispensing** - Prevent medication errors through systematic workflows
- **Controlled Substances Tracking** - Complete audit trail for narcotics and controlled drugs
- **Prescription Management** - Digital prescription creation, verification, and fulfillment
- **Inventory Control** - Real-time stock levels with automated reordering
- **Regulatory Compliance** - Mining regulations, DEA, and pharmacy board requirements
- **Location Isolation** - Each care location has independent pharmacy operations
- **Tenant Isolation** - Complete data separation between mining sites

### Business Value
- Reduce medication errors by 95%+
- Improve inventory turnover and reduce waste
- Ensure 100% controlled substances accountability
- Enable evidence-based prescribing analytics
- Support telemedicine and remote care locations
- Maintain regulatory compliance with automated audits

### Target Users
- **Pharmacists** - Medication dispensing and verification
- **Medical Staff** - Prescription creation and patient counseling
- **Pharmacy Technicians** - Inventory management and order fulfillment
- **Safety Officers** - Controlled substances oversight
- **Administrators** - Reports, analytics, and compliance monitoring

---

## System Architecture

### Multi-Tenant & Multi-Location Design

```
MineAid Admin (Super Admin)
    ↓
Tenants (Mining Sites)
    ↓
Care Locations (Clinics/Aid Stations)
    ↓
Pharmacy Inventory (Location-specific)
    ↓
Prescriptions (Tenant & Location Isolated)
    ↓
Dispensing Records (Complete Audit Trail)
```

### Data Isolation Strategy

**Tenant Isolation:**
- Every pharmacy record includes `tenant_id` foreign key
- All queries automatically filtered by user's tenant
- Cross-tenant access prevented at database and API level
- Tenant-specific formularies and protocols

**Location Isolation:**
- Each care location has independent pharmacy inventory
- Prescriptions tied to dispensing location
- Stock transfers tracked between locations
- Location-specific dispensing permissions

### Technology Stack

**Extends Existing Stack:**
- PostgreSQL database (Drizzle ORM)
- Express.js REST API
- React + TypeScript frontend
- React Query for state management
- Shadcn UI components
- Zod validation schemas

**New Dependencies:**
```json
{
  "barcode-scanner": "^2.0.0",        // Medication barcode scanning
  "react-signature-canvas": "^1.0.6",  // Digital signatures
  "pdfmake": "^0.2.7",                 // Prescription printing
  "react-big-calendar": "^1.8.5"       // Dispensing schedule
}
```

---

## Database Schema

### Core Pharmacy Tables

#### 1. Pharmacy Formulary (Tenant Isolated)
```sql
CREATE TABLE pharmacy_formulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Medication Identification
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR NOT NULL,
  brand_name VARCHAR,
  drug_class VARCHAR NOT NULL,
  
  -- Regulatory Classification
  controlled_substance BOOLEAN DEFAULT false,
  dea_schedule VARCHAR(2), -- C1, C2, C3, C4, C5
  requires_authorization BOOLEAN DEFAULT false,
  
  -- Clinical Information
  dosage_forms TEXT[], -- ["tablet", "capsule", "injection", "syrup"]
  strengths TEXT[], -- ["500mg", "1000mg"]
  route_of_administration TEXT[], -- ["oral", "IV", "IM", "topical"]
  
  -- Prescribing Guidelines
  standard_dosage VARCHAR,
  max_daily_dose VARCHAR,
  contraindications TEXT,
  side_effects TEXT,
  drug_interactions TEXT,
  special_precautions TEXT,
  
  -- Mining-Specific
  approved_for_underground_work BOOLEAN DEFAULT true,
  approved_for_heavy_machinery BOOLEAN DEFAULT true,
  fitness_impact VARCHAR, -- "none", "temporary_restriction", "light_duty"
  
  -- Status
  formulary_status VARCHAR DEFAULT 'active', -- active, discontinued, restricted
  therapeutic_equivalents TEXT[], -- List of equivalent medications
  preferred_alternative UUID REFERENCES pharmacy_formulary(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure unique medication names per tenant
  CONSTRAINT formulary_tenant_name_unique UNIQUE (tenant_id, medication_name, generic_name)
);

CREATE INDEX idx_formulary_tenant ON pharmacy_formulary(tenant_id);
CREATE INDEX idx_formulary_controlled ON pharmacy_formulary(tenant_id, controlled_substance);
CREATE INDEX idx_formulary_name ON pharmacy_formulary(medication_name, generic_name);
```

#### 2. Pharmacy Inventory (Location Isolated)
```sql
CREATE TABLE pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id) ON DELETE CASCADE,
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  
  -- Stock Tracking
  lot_number VARCHAR NOT NULL,
  ndc_code VARCHAR, -- National Drug Code
  barcode VARCHAR,
  expiry_date DATE NOT NULL,
  
  -- Quantities
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_allocated INTEGER DEFAULT 0, -- Reserved for pending prescriptions
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
  
  -- Stock Levels
  minimum_quantity INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  maximum_quantity INTEGER DEFAULT 200,
  
  -- Controlled Substance Tracking
  is_controlled_substance BOOLEAN DEFAULT false,
  controlled_substance_register_page INTEGER, -- Physical register page number
  requires_dual_verification BOOLEAN DEFAULT false,
  
  -- Storage Requirements
  storage_location VARCHAR NOT NULL, -- "Shelf A-3", "Refrigerator", "Locked Cabinet"
  storage_temperature VARCHAR, -- "Room temp", "2-8°C", "Frozen"
  requires_refrigeration BOOLEAN DEFAULT false,
  requires_secure_storage BOOLEAN DEFAULT false,
  
  -- Financial
  unit_cost DECIMAL(10,2),
  wholesale_cost DECIMAL(10,2),
  dispensing_fee DECIMAL(10,2),
  
  -- Supplier Information
  supplier_name VARCHAR,
  supplier_batch_number VARCHAR,
  received_date DATE,
  received_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR DEFAULT 'active', -- active, expired, recalled, quarantined, disposed
  quarantine_reason TEXT,
  quarantine_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT inventory_positive_quantity CHECK (quantity_on_hand >= 0),
  CONSTRAINT inventory_allocated_valid CHECK (quantity_allocated >= 0 AND quantity_allocated <= quantity_on_hand),
  CONSTRAINT pharmacy_inventory_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id),
  CONSTRAINT pharmacy_inventory_formulary_fk 
    FOREIGN KEY (tenant_id, formulary_id) REFERENCES pharmacy_formulary(tenant_id, id)
);

CREATE INDEX idx_pharmacy_inventory_tenant_location ON pharmacy_inventory(tenant_id, location_id);
CREATE INDEX idx_pharmacy_inventory_formulary ON pharmacy_inventory(formulary_id);
CREATE INDEX idx_pharmacy_inventory_controlled ON pharmacy_inventory(is_controlled_substance);
CREATE INDEX idx_pharmacy_inventory_expiry ON pharmacy_inventory(expiry_date);
CREATE INDEX idx_pharmacy_inventory_barcode ON pharmacy_inventory(barcode);
```

#### 3. Prescriptions (Tenant & Location Isolated)
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id), -- Where prescribed
  dispensing_location_id UUID REFERENCES care_locations(id), -- Where dispensed
  
  -- Prescription Identification
  prescription_number VARCHAR NOT NULL,
  external_rx_number VARCHAR, -- From external prescriber
  
  -- Patient & Prescriber
  patient_id UUID NOT NULL REFERENCES patients(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  prescriber_id UUID NOT NULL REFERENCES users(id),
  prescriber_name VARCHAR NOT NULL,
  prescriber_license VARCHAR,
  prescriber_dea VARCHAR, -- For controlled substances
  
  -- Medical Context
  medical_visit_id UUID REFERENCES medical_visits(id),
  incident_id UUID REFERENCES incident_reports(id),
  diagnosis_code VARCHAR, -- ICD-10 code
  diagnosis_description TEXT,
  clinical_indication TEXT,
  
  -- Medication Details
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR NOT NULL,
  strength VARCHAR NOT NULL,
  dosage_form VARCHAR NOT NULL,
  route VARCHAR NOT NULL,
  
  -- Directions
  sig TEXT NOT NULL, -- Signatura (directions for use)
  quantity_prescribed INTEGER NOT NULL,
  quantity_dispensed INTEGER,
  days_supply INTEGER,
  refills_authorized INTEGER DEFAULT 0,
  refills_remaining INTEGER,
  
  -- Schedule & Timing
  prescribed_date TIMESTAMP NOT NULL DEFAULT NOW(),
  start_date DATE,
  end_date DATE,
  effective_until DATE, -- Prescription expiry
  
  -- Controlled Substance Tracking
  is_controlled_substance BOOLEAN DEFAULT false,
  dea_schedule VARCHAR(2),
  prescriber_signature TEXT, -- Digital signature
  pharmacist_signature TEXT,
  witness_signature TEXT, -- For high-risk medications
  witness_id UUID REFERENCES users(id),
  
  -- Safety Checks
  allergy_check_performed BOOLEAN DEFAULT false,
  interaction_check_performed BOOLEAN DEFAULT false,
  duplicate_therapy_check BOOLEAN DEFAULT false,
  max_dose_check BOOLEAN DEFAULT false,
  safety_alerts TEXT[], -- JSON array of alerts
  
  -- Work Fitness Impact
  affects_fitness_for_duty BOOLEAN DEFAULT false,
  work_restrictions TEXT,
  restriction_start_date DATE,
  restriction_end_date DATE,
  cleared_for_underground BOOLEAN DEFAULT true,
  cleared_for_machinery BOOLEAN DEFAULT true,
  
  -- Authorization & Approval
  requires_authorization BOOLEAN DEFAULT false,
  authorization_number VARCHAR,
  authorization_granted BOOLEAN,
  authorized_by UUID REFERENCES users(id),
  authorization_date TIMESTAMP,
  authorization_notes TEXT,
  
  -- Dispensing Status
  status VARCHAR NOT NULL DEFAULT 'pending', 
    -- pending, verified, ready, partially_dispensed, dispensed, cancelled, expired
  dispensed_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  dispensed_date TIMESTAMP,
  
  -- Patient Instructions
  patient_instructions TEXT,
  counseling_provided BOOLEAN DEFAULT false,
  counseled_by UUID REFERENCES users(id),
  counseling_notes TEXT,
  
  -- Special Handling
  requires_refrigeration BOOLEAN DEFAULT false,
  special_storage_instructions TEXT,
  special_dispensing_instructions TEXT,
  
  -- Cancellation
  cancelled_by UUID REFERENCES users(id),
  cancellation_date TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT prescriptions_quantity_valid CHECK (quantity_prescribed > 0),
  CONSTRAINT prescriptions_refills_valid CHECK (refills_authorized >= 0),
  CONSTRAINT prescription_tenant_patient_fk 
    FOREIGN KEY (tenant_id, patient_id) REFERENCES patients(tenant_id, id),
  CONSTRAINT prescription_tenant_formulary_fk 
    FOREIGN KEY (tenant_id, formulary_id) REFERENCES pharmacy_formulary(tenant_id, id),
  CONSTRAINT prescription_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id),
  CONSTRAINT prescription_number_unique UNIQUE (tenant_id, prescription_number)
);

CREATE INDEX idx_prescriptions_tenant ON prescriptions(tenant_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_prescriber ON prescriptions(prescriber_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_controlled ON prescriptions(is_controlled_substance);
CREATE INDEX idx_prescriptions_location ON prescriptions(location_id);
CREATE INDEX idx_prescriptions_dispensing_location ON prescriptions(dispensing_location_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescribed_date);
```

#### 4. Prescription Refills (Audit Trail)
```sql
CREATE TABLE prescription_refills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id),
  
  -- Refill Details
  refill_number INTEGER NOT NULL,
  refill_date TIMESTAMP NOT NULL DEFAULT NOW(),
  quantity_dispensed INTEGER NOT NULL,
  days_supply INTEGER,
  
  -- Inventory Source
  inventory_id UUID NOT NULL REFERENCES pharmacy_inventory(id),
  lot_number VARCHAR NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Personnel
  dispensed_by UUID NOT NULL REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  counseled_by UUID REFERENCES users(id),
  
  -- Patient
  patient_signature TEXT,
  pickup_date TIMESTAMP,
  picked_up_by VARCHAR, -- Name if proxy pickup
  proxy_relationship VARCHAR,
  proxy_id_verified BOOLEAN,
  
  -- Cost
  dispensing_cost DECIMAL(10,2),
  patient_cost DECIMAL(10,2),
  insurance_covered DECIMAL(10,2),
  
  -- Status
  status VARCHAR DEFAULT 'dispensed', -- dispensed, returned, destroyed
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT refills_tenant_prescription_fk 
    FOREIGN KEY (tenant_id, prescription_id) REFERENCES prescriptions(tenant_id, id),
  CONSTRAINT refills_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id)
);

CREATE INDEX idx_refills_prescription ON prescription_refills(prescription_id);
CREATE INDEX idx_refills_date ON prescription_refills(refill_date);
```

#### 5. Medication Administration Records (MAR)
```sql
CREATE TABLE medication_administration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id),
  
  -- Patient & Prescription
  patient_id UUID NOT NULL REFERENCES patients(id),
  prescription_id UUID REFERENCES prescriptions(id),
  
  -- Medication Details (snapshot at time of administration)
  medication_name VARCHAR NOT NULL,
  strength VARCHAR NOT NULL,
  route VARCHAR NOT NULL,
  dose_given VARCHAR NOT NULL,
  
  -- Schedule
  scheduled_time TIMESTAMP NOT NULL,
  actual_time TIMESTAMP,
  
  -- Administration
  administered_by UUID NOT NULL REFERENCES users(id),
  administration_status VARCHAR NOT NULL, 
    -- given, refused, held, omitted, unavailable
  
  -- Reason for Non-Administration
  reason_not_given TEXT,
  patient_refused_reason TEXT,
  
  -- Vitals at Administration (for certain medications)
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  
  -- Site (for injections)
  injection_site VARCHAR,
  
  -- Witness (for controlled substances)
  witnessed_by UUID REFERENCES users(id),
  witness_signature TEXT,
  
  -- Patient Response
  adverse_reaction BOOLEAN DEFAULT false,
  adverse_reaction_description TEXT,
  effectiveness_rating INTEGER, -- 1-10 scale
  patient_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT mar_tenant_patient_fk 
    FOREIGN KEY (tenant_id, patient_id) REFERENCES patients(tenant_id, id),
  CONSTRAINT mar_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id)
);

CREATE INDEX idx_mar_patient ON medication_administration_records(patient_id);
CREATE INDEX idx_mar_scheduled_time ON medication_administration_records(scheduled_time);
CREATE INDEX idx_mar_location ON medication_administration_records(location_id);
```

#### 6. Controlled Substances Register (DEA Compliance)
```sql
CREATE TABLE controlled_substances_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id),
  
  -- Transaction Identification
  register_number SERIAL, -- Sequential per location
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  transaction_type VARCHAR NOT NULL, 
    -- received, dispensed, returned, wasted, transferred, destroyed, inventory_adjustment
  
  -- Medication Details
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  medication_name VARCHAR NOT NULL,
  dea_schedule VARCHAR(2) NOT NULL,
  strength VARCHAR NOT NULL,
  dosage_form VARCHAR NOT NULL,
  
  -- Quantity Tracking
  quantity INTEGER NOT NULL,
  unit_of_measure VARCHAR NOT NULL,
  running_balance INTEGER NOT NULL,
  
  -- Source/Destination
  inventory_id UUID REFERENCES pharmacy_inventory(id),
  prescription_id UUID REFERENCES prescriptions(id),
  patient_id UUID REFERENCES patients(id),
  supplier_name VARCHAR,
  invoice_number VARCHAR,
  
  -- Transfer Details
  transferred_from_location_id UUID REFERENCES care_locations(id),
  transferred_to_location_id UUID REFERENCES care_locations(id),
  transfer_authorization_number VARCHAR,
  
  -- Waste/Destruction
  witness_id UUID REFERENCES users(id),
  destruction_method VARCHAR,
  destruction_date TIMESTAMP,
  destruction_certificate VARCHAR,
  
  -- Personnel
  performed_by UUID NOT NULL REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  
  -- Physical Register Reference
  physical_register_page INTEGER,
  physical_register_line INTEGER,
  
  -- Documentation
  documentation_path VARCHAR, -- Scanned invoices, disposal certificates
  notes TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT cs_register_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id),
  CONSTRAINT cs_register_quantity_valid CHECK (quantity != 0)
);

CREATE INDEX idx_cs_register_location ON controlled_substances_register(location_id);
CREATE INDEX idx_cs_register_medication ON controlled_substances_register(formulary_id);
CREATE INDEX idx_cs_register_date ON controlled_substances_register(transaction_date);
CREATE INDEX idx_cs_register_type ON controlled_substances_register(transaction_type);
```

#### 7. Drug Interaction Database (Clinical Decision Support)
```sql
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Interacting Medications
  medication1_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  medication2_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  
  -- Interaction Details
  interaction_type VARCHAR NOT NULL, 
    -- contraindicated, major, moderate, minor
  severity_level INTEGER NOT NULL, -- 1-10
  
  -- Clinical Information
  mechanism TEXT NOT NULL,
  clinical_effects TEXT NOT NULL,
  management_recommendations TEXT NOT NULL,
  references TEXT,
  
  -- Timing
  onset VARCHAR, -- immediate, delayed, variable
  documentation VARCHAR, -- established, probable, suspected
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_reviewed_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT drug_interactions_unique UNIQUE (medication1_id, medication2_id)
);

CREATE INDEX idx_drug_interactions_med1 ON drug_interactions(medication1_id);
CREATE INDEX idx_drug_interactions_med2 ON drug_interactions(medication2_id);
CREATE INDEX idx_drug_interactions_severity ON drug_interactions(severity_level);
```

#### 8. Pharmacy Alerts & Notifications
```sql
CREATE TABLE pharmacy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id),
  
  -- Alert Type
  alert_type VARCHAR NOT NULL, 
    -- low_stock, expiring_soon, expired, controlled_substance_discrepancy,
    -- interaction_detected, duplicate_therapy, max_dose_exceeded,
    -- recall, authorization_required
  severity VARCHAR NOT NULL, -- low, medium, high, critical
  
  -- Related Entities
  prescription_id UUID REFERENCES prescriptions(id),
  inventory_id UUID REFERENCES pharmacy_inventory(id),
  formulary_id UUID REFERENCES pharmacy_formulary(id),
  patient_id UUID REFERENCES patients(id),
  
  -- Alert Content
  alert_title VARCHAR NOT NULL,
  alert_message TEXT NOT NULL,
  recommended_action TEXT,
  
  -- Status
  status VARCHAR DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  -- Priority
  requires_immediate_action BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT pharmacy_alerts_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id)
);

CREATE INDEX idx_pharmacy_alerts_tenant ON pharmacy_alerts(tenant_id);
CREATE INDEX idx_pharmacy_alerts_location ON pharmacy_alerts(location_id);
CREATE INDEX idx_pharmacy_alerts_type ON pharmacy_alerts(alert_type);
CREATE INDEX idx_pharmacy_alerts_status ON pharmacy_alerts(status);
CREATE INDEX idx_pharmacy_alerts_severity ON pharmacy_alerts(severity);
```

#### 9. Pharmacy Stock Transfers (Between Locations)
```sql
CREATE TABLE pharmacy_stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Transfer Identification
  transfer_number VARCHAR NOT NULL,
  transfer_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Locations
  from_location_id UUID NOT NULL REFERENCES care_locations(id),
  to_location_id UUID NOT NULL REFERENCES care_locations(id),
  
  -- Medication
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  from_inventory_id UUID NOT NULL REFERENCES pharmacy_inventory(id),
  to_inventory_id UUID REFERENCES pharmacy_inventory(id), -- Created on receipt
  
  -- Quantities
  quantity_transferred INTEGER NOT NULL,
  lot_number VARCHAR NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Controlled Substance Handling
  is_controlled_substance BOOLEAN DEFAULT false,
  dea_form_222_number VARCHAR, -- For Schedule II transfers
  
  -- Personnel
  initiated_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  sent_by UUID REFERENCES users(id),
  received_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR NOT NULL DEFAULT 'pending', 
    -- pending, approved, in_transit, received, cancelled
  
  -- Timestamps
  approved_at TIMESTAMP,
  shipped_at TIMESTAMP,
  received_at TIMESTAMP,
  
  -- Verification
  quantity_received INTEGER,
  discrepancy_noted BOOLEAN DEFAULT false,
  discrepancy_description TEXT,
  
  -- Documentation
  shipping_documentation VARCHAR,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT transfer_locations_different CHECK (from_location_id != to_location_id),
  CONSTRAINT transfer_quantity_positive CHECK (quantity_transferred > 0),
  CONSTRAINT transfer_tenant_from_location_fk 
    FOREIGN KEY (tenant_id, from_location_id) REFERENCES care_locations(tenant_id, id),
  CONSTRAINT transfer_tenant_to_location_fk 
    FOREIGN KEY (tenant_id, to_location_id) REFERENCES care_locations(tenant_id, id)
);

CREATE INDEX idx_transfers_tenant ON pharmacy_stock_transfers(tenant_id);
CREATE INDEX idx_transfers_from_location ON pharmacy_stock_transfers(from_location_id);
CREATE INDEX idx_transfers_to_location ON pharmacy_stock_transfers(to_location_id);
CREATE INDEX idx_transfers_status ON pharmacy_stock_transfers(status);
```

#### 10. Pharmacy Audit Log (Enhanced Audit Trail)
```sql
CREATE TABLE pharmacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id),
  
  -- Action Details
  action_type VARCHAR NOT NULL, 
    -- prescription_created, prescription_dispensed, prescription_cancelled,
    -- inventory_received, inventory_adjusted, inventory_disposed,
    -- controlled_substance_transaction, stock_transfer,
    -- safety_override, interaction_override
  entity_type VARCHAR NOT NULL, -- prescription, inventory, controlled_substance, etc.
  entity_id UUID NOT NULL,
  
  -- User Information
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR NOT NULL,
  user_role VARCHAR NOT NULL,
  
  -- Data Snapshot
  before_data JSONB, -- State before action
  after_data JSONB,  -- State after action
  changes_summary TEXT,
  
  -- Context
  ip_address VARCHAR,
  user_agent TEXT,
  session_id VARCHAR,
  
  -- Override Information (for safety alerts)
  override_performed BOOLEAN DEFAULT false,
  override_reason TEXT,
  override_authorized_by UUID REFERENCES users(id),
  
  -- Metadata
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT pharmacy_audit_tenant_location_fk 
    FOREIGN KEY (tenant_id, location_id) REFERENCES care_locations(tenant_id, id)
);

CREATE INDEX idx_pharmacy_audit_tenant ON pharmacy_audit_log(tenant_id);
CREATE INDEX idx_pharmacy_audit_location ON pharmacy_audit_log(location_id);
CREATE INDEX idx_pharmacy_audit_user ON pharmacy_audit_log(user_id);
CREATE INDEX idx_pharmacy_audit_entity ON pharmacy_audit_log(entity_type, entity_id);
CREATE INDEX idx_pharmacy_audit_timestamp ON pharmacy_audit_log(timestamp);
CREATE INDEX idx_pharmacy_audit_action ON pharmacy_audit_log(action_type);
```

---

## Features & Functionality

### Phase 1: Core Prescription Management (Weeks 1-4)

#### 1.1 Electronic Prescribing (e-Prescribing)
**Features:**
- ✓ Digital prescription creation from medical visit interface
- ✓ Formulary search with autocomplete
- ✓ Dosing calculators (weight-based, BSA-based)
- ✓ Prescription templates for common conditions
- ✓ Duplicate therapy detection
- ✓ Drug-allergy checking
- ✓ Drug-drug interaction alerts
- ✓ Max dose validation
- ✓ Age-appropriate dosing alerts
- ✓ Renal/hepatic dosing adjustments
- ✓ Digital prescriber signature

**User Stories:**
```
As a Medical Officer, I want to:
- Create prescriptions during medical visits
- See drug interaction alerts before prescribing
- Use preset templates for common medications
- Electronically sign prescriptions
- View patient's medication history

Acceptance Criteria:
- Prescription created in < 60 seconds
- All safety checks performed automatically
- Zero manual data entry for common meds (templates)
- Digital signature legally compliant
```

#### 1.2 Prescription Verification & Dispensing
**Features:**
- ✓ Pharmacist verification queue
- ✓ 4-eyes check for high-risk medications
- ✓ Barcode scanning for medication verification
- ✓ Allergy re-check at dispensing
- ✓ Interaction re-check at dispensing
- ✓ Dose double-check
- ✓ Patient counseling documentation
- ✓ Printed medication labels
- ✓ Patient information leaflets
- ✓ Digital pickup signature

**Workflow:**
```
Pending → Pharmacist Review → Safety Checks → 
Prepare Medication → Final Verification → 
Patient Counseling → Dispense → Patient Signature
```

#### 1.3 Refill Management
**Features:**
- ✓ Automated refill requests
- ✓ Refill approval workflow
- ✓ Refill history tracking
- ✓ Auto-refill for chronic medications
- ✓ Refill too soon alerts
- ✓ Early refill authorization
- ✓ Refill reminders to patients

### Phase 2: Inventory & Stock Management (Weeks 5-8)

#### 2.1 Inventory Receiving
**Features:**
- ✓ Purchase order integration
- ✓ Barcode scanning for receiving
- ✓ Lot number tracking
- ✓ Expiry date management
- ✓ Quantity verification
- ✓ Quality inspection workflow
- ✓ Controlled substance receiving (DEA Form 222)
- ✓ Discrepancy reporting

#### 2.2 Stock Level Management
**Features:**
- ✓ Real-time stock levels per location
- ✓ Min/max levels with auto-alerts
- ✓ Reorder point calculations
- ✓ ABC analysis (high/medium/low value)
- ✓ Fast-moving vs slow-moving analysis
- ✓ Seasonal demand forecasting
- ✓ Multi-location stock visibility
- ✓ Stock aging reports

#### 2.3 Expiry Management
**Features:**
- ✓ Expiry tracking by lot
- ✓ FEFO (First Expiry, First Out) alerts
- ✓ 30/60/90-day expiry warnings
- ✓ Expired stock quarantine
- ✓ Disposal documentation
- ✓ Financial loss tracking

### Phase 3: Controlled Substances Management (Weeks 9-12)

#### 3.1 DEA Schedule Tracking
**Features:**
- ✓ Schedule I-V classification
- ✓ Controlled substance register (physical + digital)
- ✓ Dual-count verification
- ✓ Dual-signature requirements
- ✓ Perpetual inventory
- ✓ Daily/weekly/monthly reconciliation
- ✓ Discrepancy investigation workflow
- ✓ DEA Form 222 management
- ✓ DEA Form 106 (theft/loss reporting)

#### 3.2 Narcotic Accountability
**Features:**
- ✓ Complete audit trail
- ✓ Count verification at shift change
- ✓ Secure storage access logging
- ✓ Witness requirements
- ✓ Waste documentation
- ✓ Partial dose waste tracking
- ✓ Video surveillance integration (optional)

### Phase 4: Clinical Decision Support (Weeks 13-16)

#### 4.1 Drug Interaction Checking
**Features:**
- ✓ Drug-drug interactions
- ✓ Drug-food interactions
- ✓ Drug-disease interactions
- ✓ Severity grading (contraindicated/major/moderate/minor)
- ✓ Management recommendations
- ✓ Override with reason documentation
- ✓ Clinical pharmacist consultation flagging

#### 4.2 Mining-Specific Safety Checks
**Features:**
- ✓ Fitness for underground work assessment
- ✓ Heavy machinery operation clearance
- ✓ Altitude/environmental considerations
- ✓ Heat exposure medication interactions
- ✓ Respiratory function impact
- ✓ Cognitive/alertness impact assessment
- ✓ Work restriction recommendations
- ✓ Alternative medication suggestions

### Phase 5: Reporting & Analytics (Weeks 17-20)

#### 5.1 Operational Reports
- ✓ Dispensing volume by location
- ✓ Prescription turnaround time
- ✓ Medication cost analysis
- ✓ Generic vs brand utilization
- ✓ Top prescribed medications
- ✓ Prescriber patterns
- ✓ Patient adherence rates

#### 5.2 Regulatory Reports
- ✓ Controlled substance register (DEA)
- ✓ Inventory valuation reports
- ✓ Expiry and waste reports
- ✓ Adverse drug reactions (ADR)
- ✓ Medication error reports
- ✓ Quality metrics
- ✓ Audit trail reports

#### 5.3 Clinical Analytics
- ✓ Polypharmacy identification
- ✓ High-risk medication monitoring
- ✓ Drug interaction frequency
- ✓ Prescribing appropriateness
- ✓ Therapeutic duplication
- ✓ Adherence patterns
- ✓ Outcome tracking

---

## API Endpoints

### Formulary Management

```typescript
// Formulary CRUD
GET    /api/pharmacy/formulary                    // List all formulary items (tenant filtered)
GET    /api/pharmacy/formulary/:id                // Get formulary item details
POST   /api/pharmacy/formulary                    // Add new medication to formulary
PUT    /api/pharmacy/formulary/:id                // Update formulary item
DELETE /api/pharmacy/formulary/:id                // Remove from formulary
GET    /api/pharmacy/formulary/search?q=keyword   // Search formulary

// Controlled Substances
GET    /api/pharmacy/formulary/controlled         // List controlled substances only
```

### Inventory Management

```typescript
// Inventory Operations
GET    /api/pharmacy/inventory                         // List inventory (location filtered)
GET    /api/pharmacy/inventory/:id                     // Get inventory item details
POST   /api/pharmacy/inventory/receive                 // Receive new stock
POST   /api/pharmacy/inventory/adjust                  // Adjust quantity
POST   /api/pharmacy/inventory/dispose                 // Dispose expired/damaged
GET    /api/pharmacy/inventory/low-stock               // Low stock alerts
GET    /api/pharmacy/inventory/expiring                // Expiring medications
GET    /api/pharmacy/inventory/by-location/:locationId // Inventory for specific location

// Stock Transfers
GET    /api/pharmacy/transfers                    // List transfers
POST   /api/pharmacy/transfers                    // Initiate transfer
PUT    /api/pharmacy/transfers/:id/approve        // Approve transfer
PUT    /api/pharmacy/transfers/:id/ship           // Mark as shipped
PUT    /api/pharmacy/transfers/:id/receive        // Receive transfer
```

### Prescription Management

```typescript
// Prescription CRUD
GET    /api/pharmacy/prescriptions                     // List prescriptions
GET    /api/pharmacy/prescriptions/:id                 // Get prescription details
POST   /api/pharmacy/prescriptions                     // Create new prescription
PUT    /api/pharmacy/prescriptions/:id                 // Update prescription
DELETE /api/pharmacy/prescriptions/:id                 // Cancel prescription

// Prescription Workflow
PUT    /api/pharmacy/prescriptions/:id/verify          // Pharmacist verification
PUT    /api/pharmacy/prescriptions/:id/prepare         // Mark as prepared
PUT    /api/pharmacy/prescriptions/:id/dispense        // Dispense medication
PUT    /api/pharmacy/prescriptions/:id/counsel         // Document counseling
POST   /api/pharmacy/prescriptions/:id/refill          // Process refill

// Patient View
GET    /api/pharmacy/prescriptions/patient/:patientId  // Patient's prescriptions
GET    /api/pharmacy/prescriptions/employee/:employeeId // Employee's prescriptions
GET    /api/pharmacy/prescriptions/active              // Active prescriptions
GET    /api/pharmacy/prescriptions/pending             // Pending prescriptions
```

### Clinical Decision Support

```typescript
// Safety Checks
POST   /api/pharmacy/check-interactions    // Check drug interactions
POST   /api/pharmacy/check-allergies       // Check drug allergies
POST   /api/pharmacy/check-duplicates      // Check duplicate therapy
POST   /api/pharmacy/check-dose            // Validate dose
POST   /api/pharmacy/check-fitness         // Check fitness for duty impact

// Drug Information
GET    /api/pharmacy/drug-info/:formularyId          // Drug information
GET    /api/pharmacy/interactions/:medication1/:medication2  // Interaction details
```

### Controlled Substances

```typescript
// CS Register
GET    /api/pharmacy/controlled-substances/register       // CS register entries
POST   /api/pharmacy/controlled-substances/transaction    // Record CS transaction
GET    /api/pharmacy/controlled-substances/reconcile     // Daily reconciliation
POST   /api/pharmacy/controlled-substances/count         // Physical count
GET    /api/pharmacy/controlled-substances/discrepancies // Discrepancy log

// Regulatory Forms
POST   /api/pharmacy/controlled-substances/form-222  // DEA Form 222
POST   /api/pharmacy/controlled-substances/form-106  // Theft/Loss Form
```

### Medication Administration

```typescript
// MAR (Medication Administration Record)
GET    /api/pharmacy/mar/patient/:patientId           // Patient's MAR
GET    /api/pharmacy/mar/due                          // Due medications
POST   /api/pharmacy/mar/administer                   // Record administration
POST   /api/pharmacy/mar/refuse                       // Record refusal
POST   /api/pharmacy/mar/hold                         // Hold medication
```

### Reports & Analytics

```typescript
// Operational Reports
GET    /api/pharmacy/reports/dispensing         // Dispensing volume
GET    /api/pharmacy/reports/turnaround-time    // Prescription turnaround
GET    /api/pharmacy/reports/cost-analysis      // Cost analysis
GET    /api/pharmacy/reports/top-medications    // Top prescribed

// Regulatory Reports
GET    /api/pharmacy/reports/controlled-substances  // CS register report
GET    /api/pharmacy/reports/inventory-valuation    // Inventory value
GET    /api/pharmacy/reports/expiry                 // Expiry report
GET    /api/pharmacy/reports/waste                  // Waste report

// Clinical Reports
GET    /api/pharmacy/reports/polypharmacy       // Polypharmacy patients
GET    /api/pharmacy/reports/high-risk          // High-risk medications
GET    /api/pharmacy/reports/adherence          // Adherence rates
```

### Alerts & Notifications

```typescript
// Pharmacy Alerts
GET    /api/pharmacy/alerts                      // All active alerts
GET    /api/pharmacy/alerts/critical             // Critical alerts only
PUT    /api/pharmacy/alerts/:id/acknowledge      // Acknowledge alert
PUT    /api/pharmacy/alerts/:id/resolve          // Resolve alert
```

---

## Frontend Components

### Page Components

#### 1. Pharmacy Dashboard (`PharmacyDashboard.tsx`)
```typescript
// Main landing page for pharmacy module
- Quick stats: Pending Rx, Low Stock, Expiring Items
- Active prescriptions queue
- Controlled substances summary
- Today's refills
- Critical alerts
- Recent activity feed
```

#### 2. Formulary Management (`FormularyManagement.tsx`)
```typescript
// Medication formulary administration
- Searchable medication list
- Add/edit/delete medications
- Drug class categorization
- Controlled substance flagging
- Mining-specific restrictions
- Therapeutic equivalents
```

#### 3. Prescription Queue (`PrescriptionQueue.tsx`)
```typescript
// Prescription processing workflow
- Pending prescriptions list
- Verification queue
- Ready for pickup
- Completed today
- Filters: Status, Location, Prescriber, Date
- Bulk actions
```

#### 4. Create Prescription (`NewPrescriptionForm.tsx`)
```typescript
// E-prescribing interface
- Patient selection (with alerts)
- Medication search (formulary)
- Dosing calculator
- Sig builder (directions)
- Quantity & refills
- Real-time safety checks
- Work restriction assessment
- Digital signature
```

#### 5. Dispense Medication (`DispenseMedicationForm.tsx`)
```typescript
// Dispensing workflow
- Prescription details review
- Barcode scanning
- Lot number selection
- Quantity verification
- Patient counseling documentation
- Fitness restriction confirmation
- Pickup signature capture
```

#### 6. Inventory Management (`PharmacyInventory.tsx`)
```typescript
// Stock management interface
- Current inventory by location
- Low stock alerts
- Expiring medications
- Receive new stock
- Adjust quantities
- Transfer between locations
- Dispose expired items
```

#### 7. Controlled Substances Register (`ControlledSubstancesRegister.tsx`)
```typescript
// DEA compliance interface
- CS register entries
- Daily count verification
- Transaction logging
- Discrepancy investigation
- Waste documentation
- Regulatory forms (222, 106)
```

#### 8. Medication Administration Record (`MedicationAdministration.tsx`)
```typescript
// For on-site medication administration
- Scheduled medications
- Due now vs upcoming
- Administration documentation
- Vital signs recording
- Adverse reaction reporting
- Patient signature
```

#### 9. Pharmacy Reports (`PharmacyReports.tsx`)
```typescript
// Analytics and reporting
- Report selector
- Date range filters
- Location filters
- Export options (PDF, Excel, CSV)
- Scheduled reports
- Report history
```

#### 10. Stock Transfer (`StockTransferForm.tsx`)
```typescript
// Inter-location transfers
- Source/destination locations
- Medication selection
- Quantity entry
- Controlled substance handling
- Approval workflow
- Shipping/receiving documentation
```

### Reusable Components

#### Safety Alert Modal (`SafetyAlertModal.tsx`)
```typescript
// Drug interaction/allergy/duplicate therapy alerts
- Alert type indicator
- Severity level (color-coded)
- Clinical details
- Management recommendations
- Override options with reason
- Documentation requirements
```

#### Barcode Scanner (`BarcodeScanner.tsx`)
```typescript
// Medication verification via barcode
- Camera-based scanning
- Manual entry fallback
- Verification feedback
- Multi-scan support
- Error handling
```

#### Signature Pad (`SignaturePad.tsx`)
```typescript
// Digital signature capture
- Touch/mouse drawing
- Clear/redo options
- Timestamp embedding
- Base64 encoding
- Validation
```

#### Medication Search (`MedicationSearchAutocomplete.tsx`)
```typescript
// Formulary search with autocomplete
- Fuzzy search (generic + brand)
- Drug class filtering
- Recent medications
- Favorites
- Keyboard navigation
```

#### Dosing Calculator (`DosingCalculator.tsx`)
```typescript
// Smart dosing assistance
- Weight-based calculations
- BSA-based calculations
- Age-based adjustments
- Renal dosing
- Unit conversions
- Range validation
```

---

## User Workflows

### Workflow 1: Create & Dispense Prescription

```
┌─────────────────────────────────────────────────────────┐
│ 1. Medical Officer - Create Prescription                │
└─────────────────────────────────────────────────────────┘
  ↓
  Medical Visit → Prescribe → Search Medication → 
  Select Drug → Enter Dose/Sig → Safety Checks Run →
  Review Alerts → Approve/Override → Sign → Submit
  
┌─────────────────────────────────────────────────────────┐
│ 2. Pharmacist - Verify Prescription                     │
└─────────────────────────────────────────────────────────┘
  ↓
  View Queue → Select Rx → Review Clinical Info →
  Re-check Interactions → Verify Dose → Verify Patient →
  Approve for Dispensing → Notify Pharmacy Tech
  
┌─────────────────────────────────────────────────────────┐
│ 3. Pharmacy Technician - Prepare Medication            │
└─────────────────────────────────────────────────────────┘
  ↓
  View Ready Queue → Select Rx → Scan Medication Barcode →
  Verify Lot/Expiry → Count Quantity → Print Label →
  Attach Patient Info → Place in Pickup Area → 
  Mark as Ready
  
┌─────────────────────────────────────────────────────────┐
│ 4. Pharmacist - Final Check & Counsel                  │
└─────────────────────────────────────────────────────────┘
  ↓
  Call Patient → Verify Identity → Review Medication →
  Counsel on Use → Discuss Side Effects → 
  Explain Work Restrictions → Answer Questions →
  Document Counseling
  
┌─────────────────────────────────────────────────────────┐
│ 5. Pharmacy Staff - Dispense                           │
└─────────────────────────────────────────────────────────┘
  ↓
  Verify Patient ID → Collect Signature → 
  Hand Over Medication → Provide Written Instructions →
  Schedule Follow-up if needed → Mark as Dispensed →
  Update Inventory
```

### Workflow 2: Controlled Substance Dispensing

```
Additional Steps for Schedule II-V Medications:

┌─────────────────────────────────────────────────────────┐
│ Enhanced Verification                                    │
└─────────────────────────────────────────────────────────┘
  ↓
  Verify DEA License → Check Prescription Validity →
  Confirm Patient Identity (Photo ID) → 
  Dual Count (2 people) → Dual Signature →
  Record in CS Register → Update Running Balance →
  Secure Storage Access Logged
  
┌─────────────────────────────────────────────────────────┐
│ Partial Dose Waste (if applicable)                     │
└─────────────────────────────────────────────────────────┘
  ↓
  Calculate Dose → Measure Dose → 
  Witness Waste → Witness Signs → Document Waste →
  Update CS Register → Dispose Per Protocol
```

### Workflow 3: Stock Receiving

```
┌─────────────────────────────────────────────────────────┐
│ 1. Pharmacy Staff - Receive Shipment                   │
└─────────────────────────────────────────────────────────┘
  ↓
  Check Packing Slip → Verify Sender → 
  Inspect Package Integrity → Open Package →
  Match to Purchase Order
  
┌─────────────────────────────────────────────────────────┐
│ 2. Item Verification                                    │
└─────────────────────────────────────────────────────────┘
  ↓
  For Each Item:
    Scan Barcode → Verify Name/Strength → 
    Check Lot Number → Check Expiry Date →
    Count Quantity → Compare to Invoice →
    Document Discrepancies
  
┌─────────────────────────────────────────────────────────┐
│ 3. Quality Inspection                                   │
└─────────────────────────────────────────────────────────┘
  ↓
  Check Package Integrity → Verify Temperature Indicators →
  Inspect for Damage → Check Product Appearance →
  Quarantine if Concerns → Document Issues
  
┌─────────────────────────────────────────────────────────┐
│ 4. Stock Entry                                          │
└─────────────────────────────────────────────────────────┘
  ↓
  Enter into System → Assign Storage Location →
  Update Inventory Levels → Generate Labels →
  Place in Storage → Update PO Status
  
┌─────────────────────────────────────────────────────────┐
│ 5. Controlled Substance Receiving (if applicable)      │
└─────────────────────────────────────────────────────────┘
  ↓
  Verify DEA Form 222 → Dual Count → Dual Signature →
  Record in CS Register → Secure Storage → 
  Send Receipt to Supplier → File Form 222
```

### Workflow 4: Daily Controlled Substance Reconciliation

```
┌─────────────────────────────────────────────────────────┐
│ Daily Count - Morning Shift                            │
└─────────────────────────────────────────────────────────┘
  ↓
  Access Secure Storage → Count Each CS Item →
  Record Physical Count → Compare to System Balance →
  Investigate Discrepancies → Document Count →
  Two Staff Sign → Lock Storage
  
┌─────────────────────────────────────────────────────────┐
│ If Discrepancy Found                                    │
└─────────────────────────────────────────────────────────┘
  ↓
  Re-count Immediately → Check Recent Transactions →
  Review Video Footage (if available) →
  Interview Staff → Document Investigation →
  Report to Pharmacy Manager →
  File Incident Report if Major Discrepancy →
  Notify DEA if Suspected Theft (Form 106)
```

---

## Integration Points

### 1. Medical Visits Integration

**Prescription Creation from Visit:**
```typescript
// When creating prescription from medical visit
interface PrescriptionFromVisit {
  medicalVisitId: string;
  patientId: string;
  diagnosis: string;
  symptoms: string[];
  vitalSigns: VitalSigns;
  allergies: string[];
  currentMedications: Prescription[];
}

// Auto-populate from visit context
- Patient demographics
- Diagnosis codes
- Clinical indication
- Current symptoms
- Recent vitals
- Medication history
- Allergy list
```

### 2. Incident Reports Integration

**Post-Incident Prescriptions:**
```typescript
// Link prescriptions to incident reports
interface IncidentPrescription {
  incidentId: string;
  injuryType: string;
  painLevel: number;
  treatmentProtocol: string;
}

// Track incident-related medications
- Pain management protocols
- Antibiotic prophylaxis
- Tetanus prophylaxis
- Wound care medications
- Work restriction medications
```

### 3. Inventory Module Integration

**Unified Stock Management:**
```typescript
// Share inventory with general medical inventory
- Medications as category "medication"
- Common stock tracking
- Unified purchase orders
- Shared expiry management
- Cross-module transfers
- Consolidated reports
```

### 4. Employee/Patient Integration

**Unified Patient View:**
```typescript
// Complete medication history in patient record
interface PatientMedicationProfile {
  activeP prescriptions: Prescription[];
  medicationHistory: Prescription[];
  allergies: Allergy[];
  adverseReactions: AdverseReaction[];
  adherenceScore: number;
  workRestrictions: WorkRestriction[];
}

// Display in patient dashboard:
- Current medications
- Recent prescriptions
- Allergy alerts
- Interaction risks
- Adherence patterns
```

### 5. Audit Log Integration

**Enhanced Pharmacy Audit Trail:**
```typescript
// Extend existing audit_logs table
- All prescription actions
- Controlled substance transactions
- Inventory movements
- Safety overrides
- Regulatory events
- System access

// Tie into existing audit infrastructure
- Same audit viewer
- Same filtering
- Same export
- Enhanced pharmacy-specific views
```

### 6. Notification System Integration

**Pharmacy Notifications:**
```typescript
// Use existing notification system
- Low stock alerts → Inventory managers
- Expiring medications → Pharmacy staff
- CS discrepancies → Pharmacy manager + Admin
- Interaction alerts → Prescriber + Pharmacist
- Refill due → Patient (future: SMS/email)
- Authorization required → Prescriber
```

### 7. Duty Roster Integration

**Pharmacy Duty Assignments:**
```typescript
// Add pharmacy-specific duties
- Daily controlled substance count
- Expiry checks
- Inventory reconciliation
- Equipment calibration
- Refrigerator temperature checks
- Prescription queue reviews

// Use existing duty assignment system
```

### 8. Multi-Location System Integration

**Location-Based Pharmacy:**
```typescript
// Leverage existing care locations
- Each location has independent pharmacy
- Location-specific formularies
- Inter-location stock transfers
- Location-based reporting
- Location-specific alerts
- Pharmacist assignment by location

// Use existing location selector
- Session-based active location
- Auto-inject locationId
- Location switching
```

---

## Security & Compliance

### Data Security

#### Tenant Isolation
```sql
-- ALL queries must include tenant filter
SELECT * FROM prescriptions 
WHERE tenant_id = $currentUserTenantId;

-- Prevent cross-tenant access
CREATE POLICY prescriptions_tenant_isolation 
ON prescriptions FOR ALL 
USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Location Isolation
```sql
-- Location-based access control
SELECT * FROM pharmacy_inventory 
WHERE tenant_id = $tenantId 
  AND location_id = $activeLocationId;

-- Transfer between locations requires approval
```

#### Role-Based Access Control (RBAC)
```typescript
const pharmacyPermissions = {
  pharmacist: [
    'prescriptions:read',
    'prescriptions:verify',
    'prescriptions:dispense',
    'inventory:read',
    'inventory:adjust',
    'controlled_substances:all'
  ],
  pharmacy_technician: [
    'prescriptions:read',
    'prescriptions:prepare',
    'inventory:read',
    'inventory:receive',
  ],
  medical_staff: [
    'prescriptions:create',
    'prescriptions:read_own',
    'formulary:read'
  ],
  safety_officer: [
    'controlled_substances:read',
    'audit:read',
    'reports:read'
  ],
  admin: [
    'formulary:manage',
    'reports:all',
    'audit:all',
    'settings:manage'
  ]
};
```

### Regulatory Compliance

#### DEA Controlled Substances Act
- ✓ Schedule I-V tracking
- ✓ DEA Form 222 for Schedule II orders
- ✓ DEA Form 106 for theft/loss
- ✓ 2-year record retention
- ✓ Physical and electronic records
- ✓ Biennial inventory
- ✓ Secure storage requirements

#### HIPAA Compliance
- ✓ Encrypted data at rest and in transit
- ✓ Access logging (who accessed what, when)
- ✓ Audit trails (immutable)
- ✓ User authentication
- ✓ Session timeouts
- ✓ Minimum necessary access
- ✓ Business Associate Agreements (BAAs)

#### Mining Regulations
- ✓ Fitness for duty assessments
- ✓ Medication impact on safety-sensitive tasks
- ✓ Work restriction documentation
- ✓ Underground work clearances
- ✓ Heavy machinery operation restrictions
- ✓ Incident-related medication tracking

#### Pharmacy Board Requirements
- ✓ Licensed pharmacist verification
- ✓ Proper labeling
- ✓ Patient counseling documentation
- ✓ Medication error reporting
- ✓ Adverse event reporting
- ✓ Quality assurance programs

### Audit Requirements

#### Complete Audit Trail
```sql
-- Every action logged
INSERT INTO pharmacy_audit_log (
  tenant_id,
  location_id,
  action_type,
  entity_type,
  entity_id,
  user_id,
  before_data,
  after_data,
  timestamp
);

-- Immutable logs (no updates/deletes)
-- Retention: 7 years minimum
```

#### Critical Actions Requiring Audit
- Prescription creation/modification/cancellation
- Medication dispensing
- Controlled substance transactions
- Safety alert overrides
- Inventory adjustments
- Stock transfers
- Waste/disposal events
- System configuration changes

### Data Privacy

#### Patient Confidentiality
```typescript
// Minimum necessary access
- Pharmacists see only dispensing-relevant info
- Staff see only their prescriptions
- Reports de-identified unless authorized
- Audit logs protect patient privacy
```

#### Consent Management
```typescript
interface PatientConsent {
  patientId: string;
  consentType: 'medication_history' | 'data_sharing' | 'research';
  granted: boolean;
  grantedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}
```

---

## Reporting & Analytics

### Operational Dashboards

#### 1. Pharmacy Operations Dashboard
```typescript
interface PharmacyOperationsMetrics {
  // Prescription Metrics
  totalPrescriptions: number;
  pendingPrescriptions: number;
  averageTurnaroundTime: number; // minutes
  prescriptionsDispensedToday: number;
  
  // Inventory Metrics
  totalInventoryValue: number;
  lowStockItems: number;
  expiringWithin30Days: number;
  expiredItems: number;
  
  // Controlled Substances
  csTransactionsToday: number;
  csDiscrepancies: number;
  csDueForCount: boolean;
  
  // Alerts
  criticalAlerts: number;
  highAlerts: number;
  totalActiveAlerts: number;
  
  // Staff Productivity
  prescriptionsPerPharmacist: number;
  averageDispenseTime: number;
  
  // Location Comparison
  byLocation: LocationMetrics[];
}
```

#### 2. Clinical Dashboard
```typescript
interface ClinicalDashboard {
  // Safety Metrics
  drugInteractions: {
    contraindicated: number;
    major: number;
    moderate: number;
  };
  allergyAlerts: number;
  duplicateTherapy: number;
  
  // High-Risk Monitoring
  polypharmacyPatients: number; // 5+ medications
  highRiskMedications: number;
  anticoagulantPatients: number;
  diabeticPatients: number;
  
  // Prescribing Patterns
  topMedications: MedicationCount[];
  byDrugClass: DrugClassCount[];
  genericUtilization: number; // percentage
  controlledSubstanceRate: number;
  
  // Outcomes
  adverseDrugReactions: number;
  medicationErrors: number;
  interventionsSaved: number;
}
```

### Standard Reports

#### 1. Dispensing Reports
```typescript
// Daily Dispensing Report
- Prescriptions dispensed by location
- Breakdown by drug class
- Controlled substances dispensed
- High-cost medications
- Refills vs new prescriptions

// Prescription Turnaround Time Report
- Average time from prescribe to dispense
- By prescriber
- By medication type
- Bottleneck analysis

// Prescriber Patterns Report
- Top prescribers by volume
- Prescribing appropriateness
- Generic vs brand preference
- Controlled substance prescribing
```

#### 2. Inventory Reports
```typescript
// Stock Status Report
- Current stock levels by location
- Items below reorder point
- Overstocked items
- Stock aging analysis

// Expiry Report
- Expiring in 30/60/90 days
- Expired items not disposed
- Financial loss from expiry
- FEFO compliance

// Inventory Valuation Report
- Total inventory value
- By location
- By drug class
- By controlled status
- Aging buckets (0-30, 31-60, 61-90, 90+ days)

// Stock Movement Report
- Fast-moving items
- Slow-moving items
- No-movement items (candidates for discontinuation)
- Seasonal trends
```

#### 3. Controlled Substances Reports
```typescript
// CS Register Report
- All CS transactions for period
- By medication
- By personnel
- Running balances
- Reconciliation status

// CS Discrepancy Report
- All discrepancies
- Investigation status
- Resolution details
- Patterns/trends

// DEA Regulatory Reports
- DEA Form 222 log
- DEA Form 106 (theft/loss)
- Biennial inventory
- Ordering activity
```

#### 4. Financial Reports
```typescript
// Medication Cost Report
- Total medication expenditure
- By drug class
- By prescriber
- By location
- Budget vs actual

// Generic Savings Report
- Generic substitution rate
- Cost savings from generics
- Therapeutic equivalent utilization

// Waste & Loss Report
- Financial loss from expiry
- Waste documentation
- Disposal costs
- Damage/breakage costs
```

#### 5. Clinical Quality Reports
```typescript
// Polypharmacy Report
- Patients on 5+ medications
- Potential drug interactions
- Opportunity for deprescribing
- Risk stratification

// High-Risk Medication Monitoring
- Anticoagulants
- Diabetes medications
- Opioids
- Benzodiazepines
- Required monitoring labs

// Medication Adherence Report
- Refill compliance rates
- Patients overdue for refills
- Potential non-adherence
- Interventions needed

// Adverse Drug Reaction Report
- All ADRs reported
- By medication
- Severity distribution
- Reporting to regulatory authorities
```

### Analytics & Insights

#### Predictive Analytics
```typescript
// Demand Forecasting
- Predict medication needs
- Seasonal adjustments
- Trend analysis
- Optimize stock levels

// Patient Risk Stratification
- High-risk patients
- Potential medication errors
- Adherence risk
- Polypharmacy concerns
```

#### Benchmarking
```typescript
// Internal Benchmarking
- Compare locations within tenant
- Prescriber comparisons
- Efficiency metrics

// Industry Benchmarking (if data available)
- Cost per prescription
- Generic utilization rate
- Medication error rates
- Turnaround times
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Core infrastructure and basic functionality

**Database:**
- [ ] Create all pharmacy tables
- [ ] Migrate existing inventory data
- [ ] Seed initial formulary
- [ ] Set up indexes and constraints
- [ ] Implement row-level security

**Backend API:**
- [ ] Formulary endpoints (CRUD)
- [ ] Prescription endpoints (CRUD)
- [ ] Basic inventory endpoints
- [ ] Safety check stubs
- [ ] Audit logging integration

**Frontend:**
- [ ] Pharmacy dashboard (skeleton)
- [ ] Formulary management page
- [ ] Basic prescription form
- [ ] Simple inventory view
- [ ] Navigation integration

**Testing:**
- [ ] Unit tests for storage functions
- [ ] API endpoint tests
- [ ] Tenant isolation verification
- [ ] Location isolation verification

### Phase 2: Prescription Workflows (Weeks 5-8)
**Goal:** Complete e-prescribing and dispensing

**Features:**
- [ ] Advanced prescription form with safety checks
- [ ] Drug interaction checking
- [ ] Allergy checking
- [ ] Duplicate therapy detection
- [ ] Prescriber dashboard
- [ ] Pharmacist verification queue
- [ ] Dispensing workflow
- [ ] Patient counseling documentation
- [ ] Refill management

**Integration:**
- [ ] Medical visit → prescription flow
- [ ] Patient medication history view
- [ ] Notification system for prescribers/pharmacists

**Testing:**
- [ ] End-to-end prescription flow
- [ ] Safety check accuracy
- [ ] Override workflows
- [ ] User acceptance testing

### Phase 3: Inventory & Transfers (Weeks 9-12)
**Goal:** Complete stock management

**Features:**
- [ ] Stock receiving workflow
- [ ] Barcode scanning integration
- [ ] Inventory adjustments
- [ ] Expiry management
- [ ] Disposal workflow
- [ ] Stock transfer between locations
- [ ] Low stock alerts
- [ ] Reorder management

**Integration:**
- [ ] Purchase order system integration
- [ ] Alert system for low stock/expiry

**Testing:**
- [ ] Inventory accuracy testing
- [ ] Transfer workflow testing
- [ ] Alert trigger testing

### Phase 4: Controlled Substances (Weeks 13-16)
**Goal:** DEA compliance and narcotic tracking

**Features:**
- [ ] Controlled substance register
- [ ] Dual verification workflows
- [ ] Daily count reconciliation
- [ ] Discrepancy investigation
- [ ] Waste documentation
- [ ] DEA Form 222 management
- [ ] DEA Form 106 (theft/loss)

**Security:**
- [ ] Enhanced audit trails for CS
- [ ] Dual-signature requirements
- [ ] Secure storage access logging

**Testing:**
- [ ] CS workflow testing
- [ ] Compliance verification
- [ ] Audit trail verification
- [ ] Security testing

### Phase 5: Clinical Decision Support (Weeks 17-20)
**Goal:** Advanced safety and mining-specific features

**Features:**
- [ ] Comprehensive drug interaction database
- [ ] Drug-disease interaction checking
- [ ] Mining-specific safety assessments
- [ ] Fitness for duty impact analysis
- [ ] Work restriction recommendations
- [ ] Alternative medication suggestions
- [ ] Clinical pharmacist consultation triggers

**Integration:**
- [ ] Medical visit integration for restrictions
- [ ] Incident report integration

**Testing:**
- [ ] Interaction detection accuracy
- [ ] Safety assessment validation
- [ ] User acceptance testing

### Phase 6: Reporting & Analytics (Weeks 21-24)
**Goal:** Comprehensive reporting and insights

**Features:**
- [ ] Operational reports
- [ ] Regulatory reports
- [ ] Clinical quality reports
- [ ] Financial reports
- [ ] Export functionality (PDF, Excel, CSV)
- [ ] Scheduled reports
- [ ] Custom dashboards

**Analytics:**
- [ ] Prescribing patterns
- [ ] Cost analysis
- [ ] Polypharmacy identification
- [ ] Adherence tracking

**Testing:**
- [ ] Report accuracy
- [ ] Performance testing for large datasets
- [ ] Export functionality

### Phase 7: Polish & Optimization (Weeks 25-28)
**Goal:** Production-ready system

**Tasks:**
- [ ] Performance optimization
- [ ] UX refinements
- [ ] Mobile responsiveness
- [ ] Comprehensive documentation
- [ ] Training materials
- [ ] Video tutorials
- [ ] Final security audit
- [ ] Penetration testing
- [ ] Load testing
- [ ] User training
- [ ] Soft launch with pilot location
- [ ] Feedback incorporation
- [ ] Production deployment

---

## Dependencies & Prerequisites

### System Requirements

#### Database
- PostgreSQL 14+ with UUID support
- Drizzle ORM migration capability
- Adequate storage (estimate 50GB per tenant for 5 years)

#### Existing Modules Required
- ✓ Multi-tenant infrastructure
- ✓ Care locations system
- ✓ Patient management
- ✓ User authentication & RBAC
- ✓ Medical visits module
- ✓ Audit logging system
- ✓ Notification system
- ✓ File storage (for documentation)

### New Dependencies

#### Backend
```json
{
  "barcode": "^2.2.3",           // Barcode generation
  "node-thermal-printer": "^4.4.3" // Label printing
}
```

#### Frontend
```json
{
  "react-barcode-reader": "^0.0.2",     // Barcode scanning
  "react-signature-canvas": "^1.0.6",    // Digital signatures
  "pdfmake": "^0.2.7",                   // PDF generation
  "react-big-calendar": "^1.8.5",        // Scheduling
  "@tanstack/react-virtual": "^3.0.0"    // Large lists virtualization
}
```

### Hardware Requirements (Optional)

- Barcode scanners (USB or wireless)
- Label printers (thermal or laser)
- Signature pads (for patient signatures)
- Tablet devices (for ward rounds/administration)
- Refrigerator temperature monitors (IoT, optional)
- Security cameras (for secure storage, optional)

### Regulatory Requirements

- Pharmacy license (per location)
- DEA registration (for controlled substances)
- Licensed pharmacist on staff
- Secure storage for controlled substances
- Physical controlled substance register (backup)
- Standard operating procedures (SOPs)
- Staff training and competency assessment

### Data Requirements

#### Initial Data Seeding
- Comprehensive formulary (500-1000 medications)
- Drug interaction database (10,000+ interactions)
- Drug-allergy mappings
- Drug-disease interaction database
- Mining-specific medication protocols
- Standard dosing guidelines

#### Master Data
- Medication suppliers
- Storage locations per care location
- Cost data (if tracking)
- Therapeutic equivalents
- Generic-brand mappings

---

## Success Metrics

### Operational KPIs

1. **Prescription Turnaround Time**
   - Target: < 30 minutes (routine)
   - Target: < 15 minutes (urgent)

2. **Medication Error Rate**
   - Target: < 0.1% (1 in 1000)
   - Zero serious harm events

3. **Inventory Accuracy**
   - Target: > 99.5%
   - Controlled substances: 100%

4. **Stock-out Rate**
   - Target: < 2% of prescriptions delayed due to stock

5. **Expiry Waste**
   - Target: < 1% of inventory value per year

### Clinical KPIs

1. **Drug Interaction Detection**
   - All major/contraindicated interactions flagged
   - 100% review before dispensing

2. **Allergy Alert Response**
   - 100% allergy checks performed
   - Zero allergic reactions from prescribed medications

3. **Polypharmacy Management**
   - Identify 100% of patients on 10+ medications
   - Quarterly medication reviews

4. **Adherence Rates**
   - Target: > 80% refill compliance for chronic medications

### Compliance KPIs

1. **Controlled Substance Accountability**
   - 100% transaction recording
   - Zero discrepancies without investigation
   - < 0.01% variance in physical counts

2. **Audit Trail Completeness**
   - 100% of critical actions logged
   - Immutable audit log
   - 7-year retention

3. **Regulatory Reporting**
   - 100% on-time DEA reporting
   - Zero regulatory violations

### User Satisfaction

1. **Pharmacist Satisfaction**
   - Target: > 4.5/5.0
   - Workflow efficiency
   - Safety feature effectiveness

2. **Prescriber Satisfaction**
   - Target: > 4.0/5.0
   - E-prescribing ease of use
   - Clinical decision support value

3. **Patient Satisfaction**
   - Target: > 4.5/5.0
   - Wait times
   - Counseling quality
   - Medication availability

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database performance issues with large datasets | Medium | High | Proper indexing, query optimization, caching |
| Barcode scanner compatibility | Low | Medium | Support manual entry, test multiple devices |
| Third-party API failures (drug interaction DB) | Low | High | Local database backup, graceful degradation |
| Data migration errors | Medium | High | Comprehensive testing, rollback plan |

### Clinical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Medication errors due to system issues | Low | Critical | Multiple safety checks, manual override capability |
| False positive drug interactions causing alert fatigue | Medium | Medium | Severity grading, clinically relevant alerts only |
| Controlled substance diversion | Low | Critical | Dual verification, audit trails, security cameras |
| Incorrect dosing calculations | Low | High | Validation against reference sources, pharmacist review |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Staff resistance to new system | High | Medium | Training, change management, phased rollout |
| Insufficient pharmacist staffing | Medium | High | Pharmacy technician support, workflow optimization |
| Equipment failures (scanners, printers) | Medium | Low | Backup equipment, manual processes |
| Internet outages affecting cloud system | Low | High | Offline mode capability, local caching |

### Compliance Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DEA audit findings | Low | High | Regular self-audits, strict procedures, documentation |
| HIPAA violations | Low | Critical | Security training, access controls, encryption |
| Mining regulation non-compliance | Low | High | Integration with safety systems, work restriction tracking |
| Audit trail gaps | Low | High | Comprehensive logging, immutable logs, monitoring |

---

## Future Enhancements (Post-Launch)

### Version 2.0 Enhancements

1. **Mobile Application**
   - Native iOS/Android apps
   - Barcode scanning via phone camera
   - Medication administration on ward rounds
   - Offline capability for remote locations

2. **Advanced Analytics**
   - Machine learning for demand forecasting
   - Predictive adherence modeling
   - Anomaly detection for controlled substances
   - Cost optimization recommendations

3. **Telemedicine Integration**
   - Electronic prescription transmission to external pharmacies
   - Remote prescription verification
   - Video consultation integration

4. **Patient Portal**
   - View active medications
   - Request refills online
   - Medication reminders
   - Educational materials
   - Medication tracking (taken/missed doses)

5. **Automated Dispensing Cabinets (ADC)**
   - Integration with Pyxis/Omnicell
   - Real-time inventory sync
   - Automated restocking
   - Controlled substance tracking

6. **Smart Packaging**
   - Blister pack automation
   - Medication organizers
   - Compliance packaging
   - Dose-specific packaging

7. **IoT Integration**
   - Refrigerator temperature monitoring
   - Automated inventory tracking (RFID)
   - Environmental monitoring
   - Security system integration

8. **Clinical Intelligence**
   - Pharmacogenomics integration
   - Precision medicine support
   - Outcome tracking and correlation
   - Comparative effectiveness research

9. **External Integrations**
   - Insurance claim processing
   - Drug information databases (Micromedex, Lexicomp)
   - Poison control centers
   - Public health reporting
   - Supply chain optimization

### Version 3.0 Enhancements

1. **AI-Powered Features**
   - Natural language prescription entry
   - Intelligent dose optimization
   - Adverse event prediction
   - Medication therapy management automation

2. **Blockchain for Controlled Substances**
   - Immutable CS transaction ledger
   - Supply chain verification
   - Counterfeit detection
   - Multi-party reconciliation

3. **Augmented Reality**
   - AR for medication verification
   - Visual drug information overlays
   - Training simulations
   - Inventory management

---

## Conclusion

This comprehensive pharmacy module will transform medication management at mining healthcare facilities by providing:

✓ **Safety** - Multiple layers of clinical decision support  
✓ **Compliance** - Complete DEA and regulatory adherence  
✓ **Efficiency** - Streamlined workflows reducing errors  
✓ **Accountability** - Complete audit trails and controlled substance tracking  
✓ **Integration** - Seamless fit with existing MineAid HMS modules  
✓ **Scalability** - Tenant and location isolation supporting growth  

The phased implementation approach ensures manageable complexity while delivering value incrementally. Starting with core prescription and inventory management, then adding controlled substance tracking, clinical decision support, and finally comprehensive reporting creates a solid foundation for a production-ready pharmacy system.

---

**Next Steps:**
1. Review and approve this plan
2. Prioritize features for Phase 1
3. Set up development environment
4. Begin database schema implementation
5. Create API endpoints
6. Build frontend components
7. Iterate based on feedback

**Estimated Timeline:** 28 weeks from kickoff to production  
**Team Required:** 2-3 full-stack developers, 1 QA engineer, 1 pharmacist consultant  
**Budget:** TBD based on team composition and infrastructure costs

---

*This plan is a living document and will be updated as requirements evolve and implementation progresses.*

**Document Version:** 1.0.0  
**Author:** AI Assistant  
**Date:** October 11, 2025  
**Status:** Planning Phase - Awaiting Approval

