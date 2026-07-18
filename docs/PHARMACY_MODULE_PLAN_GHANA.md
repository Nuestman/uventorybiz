# MineAid HMS - Pharmacy Module Comprehensive Plan (Ghana)
## Tenant- and Care Location-Isolated Pharmaceutical Management System

**Version:** 1.0.0 (Ghana Edition)  
**Status:** Planning Phase 📋  
**Last Updated:** October 11, 2025  
**Target Implementation:** Q1 2026  
**Regulatory Context:** Ghana

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
The Pharmacy Module provides comprehensive pharmaceutical management for mining healthcare facilities in Ghana, ensuring proper medication dispensing, inventory control, prescription management, and regulatory compliance with Ghana Pharmacy Council and FDA Ghana requirements—all with strict tenant and care location isolation.

### Key Objectives
- **Safe Medication Dispensing** - Prevent medication errors through systematic workflows
- **Controlled Medicines Tracking** - Complete audit trail for narcotics and scheduled medicines per Narcotics Control Board of Ghana
- **Prescription Management** - Digital prescription creation, verification, and fulfillment
- **Inventory Control** - Real-time stock levels with automated reordering
- **Regulatory Compliance** - Ghana Pharmacy Council, FDA Ghana, Mining regulations, and Data Protection Act compliance
- **Location Isolation** - Each care location has independent pharmacy operations
- **Tenant Isolation** - Complete data separation between mining sites

### Business Value
- Reduce medication errors by 95%+
- Improve inventory turnover and reduce waste
- Ensure 100% controlled medicines accountability per Ghana regulations
- Enable evidence-based prescribing analytics
- Support telemedicine and remote mining site care
- Maintain regulatory compliance with Ghana Health Service standards

### Target Users
- **Pharmacists** (Licensed by Pharmacy Council of Ghana) - Medication dispensing and verification
- **Medical Officers** - Prescription creation and patient counseling
- **Pharmacy Technicians** - Inventory management and order fulfillment
- **Safety Officers** - Controlled medicines oversight per Mining regulations
- **Administrators** - Reports, analytics, and compliance monitoring

### Regulatory Bodies (Ghana Context)
- **Pharmacy Council of Ghana** - Pharmacy practice regulation
- **Food and Drugs Authority (FDA Ghana)** - Drug registration and safety
- **Narcotics Control Board (NACOB)** - Controlled substances regulation
- **Ghana Health Service** - Healthcare delivery standards
- **Minerals Commission** - Mining industry regulations
- **Data Protection Commission** - Data privacy compliance

---

## System Architecture

### Multi-Tenant & Multi-Location Design

```
MineAid Admin (Super Admin)
    ↓
Tenants (Mining Sites - Obuasi, Tarkwa, etc.)
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
- Tenant-specific formularies based on Ghana EML

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

#### 1. Pharmacy Formulary (Tenant Isolated) - Based on Ghana EML
```sql
CREATE TABLE pharmacy_formulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Medication Identification (Ghana Context)
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR NOT NULL,
  brand_name VARCHAR,
  drug_class VARCHAR NOT NULL,
  
  -- Ghana FDA Registration
  fda_registration_number VARCHAR, -- FDA Ghana registration number
  fda_approval_date DATE,
  registered_manufacturer VARCHAR,
  
  -- Regulatory Classification (Ghana)
  is_controlled_medicine BOOLEAN DEFAULT false,
  nacob_schedule VARCHAR(10), -- NACOB classification (Schedule 1, 2, 3, etc.)
  prescription_only BOOLEAN DEFAULT true,
  over_the_counter BOOLEAN DEFAULT false,
  
  -- Ghana Essential Medicines List
  in_ghana_eml BOOLEAN DEFAULT false,
  eml_category VARCHAR, -- Category in Ghana EML
  
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
  
  -- Mining-Specific (Ghana Mining Context)
  approved_for_underground_work BOOLEAN DEFAULT true,
  approved_for_heavy_machinery BOOLEAN DEFAULT true,
  fitness_impact VARCHAR, -- "none", "temporary_restriction", "light_duty"
  heat_stress_consideration TEXT, -- Important for Ghana's climate
  
  -- Status
  formulary_status VARCHAR DEFAULT 'active', -- active, discontinued, restricted
  therapeutic_equivalents TEXT[], -- List of equivalent medications
  preferred_alternative UUID REFERENCES pharmacy_formulary(id),
  
  -- Pricing (Ghana Cedis)
  unit_cost_ghs DECIMAL(10,2),
  nhis_reimbursable BOOLEAN DEFAULT false, -- National Health Insurance Scheme
  nhis_price_ghs DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Ensure unique medication names per tenant
  CONSTRAINT formulary_tenant_name_unique UNIQUE (tenant_id, medication_name, generic_name)
);

CREATE INDEX idx_formulary_tenant ON pharmacy_formulary(tenant_id);
CREATE INDEX idx_formulary_controlled ON pharmacy_formulary(tenant_id, is_controlled_medicine);
CREATE INDEX idx_formulary_name ON pharmacy_formulary(medication_name, generic_name);
CREATE INDEX idx_formulary_fda ON pharmacy_formulary(fda_registration_number);
CREATE INDEX idx_formulary_eml ON pharmacy_formulary(in_ghana_eml);
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
  fda_batch_number VARCHAR, -- FDA Ghana batch approval
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
  
  -- Controlled Medicines Tracking (NACOB Requirements)
  is_controlled_medicine BOOLEAN DEFAULT false,
  nacob_register_page INTEGER, -- Physical register page number
  requires_dual_verification BOOLEAN DEFAULT false,
  
  -- Storage Requirements (Ghana Climate Considerations)
  storage_location VARCHAR NOT NULL, -- "Shelf A-3", "Cold Room", "Locked Cabinet"
  storage_temperature VARCHAR, -- "Room temp", "2-8°C", "Below 25°C"
  requires_refrigeration BOOLEAN DEFAULT false,
  requires_air_conditioning BOOLEAN DEFAULT false, -- Important for Ghana's climate
  requires_secure_storage BOOLEAN DEFAULT false,
  humidity_sensitive BOOLEAN DEFAULT false,
  
  -- Financial (Ghana Cedis)
  unit_cost_ghs DECIMAL(10,2),
  wholesale_cost_ghs DECIMAL(10,2),
  dispensing_fee_ghs DECIMAL(10,2),
  total_value_ghs DECIMAL(12,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost_ghs) STORED,
  
  -- Supplier Information (Ghana)
  supplier_name VARCHAR,
  supplier_contact VARCHAR,
  supplier_license VARCHAR, -- Pharmacy Council/FDA license
  import_permit_number VARCHAR, -- For imported medicines
  
  -- Item metadata
  received_date DATE,
  received_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR DEFAULT 'active', -- active, expired, recalled, quarantined, disposed
  quarantine_reason TEXT,
  quarantine_date TIMESTAMP,
  fda_recall_alert BOOLEAN DEFAULT false,
  
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
CREATE INDEX idx_pharmacy_inventory_controlled ON pharmacy_inventory(is_controlled_medicine);
CREATE INDEX idx_pharmacy_inventory_expiry ON pharmacy_inventory(expiry_date);
CREATE INDEX idx_pharmacy_inventory_barcode ON pharmacy_inventory(barcode);
```

#### 3. Prescriptions (Tenant & Location Isolated) - Ghana Format
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES care_locations(id), -- Where prescribed
  dispensing_location_id UUID REFERENCES care_locations(id), -- Where dispensed
  
  -- Prescription Identification (Ghana Format)
  prescription_number VARCHAR NOT NULL,
  pharmacy_council_number VARCHAR, -- Prescriber's Pharmacy Council registration
  
  -- Patient & Prescriber
  patient_id UUID NOT NULL REFERENCES patients(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  prescriber_id UUID NOT NULL REFERENCES users(id),
  prescriber_name VARCHAR NOT NULL,
  prescriber_license VARCHAR, -- Ghana Medical & Dental Council license
  prescriber_qualification VARCHAR, -- MB ChB, MD, etc.
  
  -- Medical Context
  medical_visit_id UUID REFERENCES medical_visits(id),
  incident_id UUID REFERENCES incident_reports(id),
  icd10_code VARCHAR, -- ICD-10 diagnosis code
  diagnosis_description TEXT,
  clinical_indication TEXT,
  
  -- Medication Details (Ghana Formulary)
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  medication_name VARCHAR NOT NULL,
  generic_name VARCHAR NOT NULL,
  strength VARCHAR NOT NULL,
  dosage_form VARCHAR NOT NULL,
  route VARCHAR NOT NULL,
  
  -- Directions (Ghana Format)
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
  effective_until DATE, -- Prescription validity (6 months for most, 1 month for controlled)
  
  -- Controlled Medicines Tracking (NACOB Requirements)
  is_controlled_medicine BOOLEAN DEFAULT false,
  nacob_schedule VARCHAR(10),
  nacob_permit_number VARCHAR, -- For Schedule 1 medicines
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
  
  -- Work Fitness Impact (Ghana Mining Context)
  affects_fitness_for_duty BOOLEAN DEFAULT false,
  work_restrictions TEXT,
  restriction_start_date DATE,
  restriction_end_date DATE,
  cleared_for_underground BOOLEAN DEFAULT true,
  cleared_for_machinery BOOLEAN DEFAULT true,
  heat_exposure_warning BOOLEAN DEFAULT false, -- Ghana climate consideration
  
  -- NHIS (National Health Insurance Scheme)
  nhis_covered BOOLEAN DEFAULT false,
  nhis_patient_number VARCHAR,
  nhis_claim_number VARCHAR,
  nhis_authorization VARCHAR,
  
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
  
  -- Patient Instructions (Ghana Context)
  patient_instructions TEXT,
  counseling_provided BOOLEAN DEFAULT false,
  counseled_by UUID REFERENCES users(id),
  counseling_notes TEXT,
  language_counseled VARCHAR, -- Twi, Ga, Ewe, English, etc.
  
  -- Special Handling (Ghana Climate)
  requires_refrigeration BOOLEAN DEFAULT false,
  requires_air_conditioning BOOLEAN DEFAULT false,
  special_storage_instructions TEXT,
  special_dispensing_instructions TEXT,
  
  -- Pricing (Ghana Cedis)
  total_cost_ghs DECIMAL(10,2),
  nhis_contribution_ghs DECIMAL(10,2),
  patient_copay_ghs DECIMAL(10,2),
  
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
CREATE INDEX idx_prescriptions_controlled ON prescriptions(is_controlled_medicine);
CREATE INDEX idx_prescriptions_location ON prescriptions(location_id);
CREATE INDEX idx_prescriptions_nhis ON prescriptions(nhis_covered, nhis_patient_number);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescribed_date);
```

#### 4. Controlled Medicines Register (NACOB Compliance)
```sql
CREATE TABLE controlled_medicines_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES care_locations(id),
  
  -- Transaction Identification
  register_number SERIAL, -- Sequential per location
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  transaction_type VARCHAR NOT NULL, 
    -- received, dispensed, returned, wasted, transferred, destroyed, stock_check
  
  -- Medication Details (Ghana NACOB Classification)
  formulary_id UUID NOT NULL REFERENCES pharmacy_formulary(id),
  medication_name VARCHAR NOT NULL,
  nacob_schedule VARCHAR(10) NOT NULL, -- Schedule 1, 2, 3, etc.
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
  fda_import_permit VARCHAR,
  nacob_permit_number VARCHAR, -- For Schedule 1
  
  -- Transfer Details
  transferred_from_location_id UUID REFERENCES care_locations(id),
  transferred_to_location_id UUID REFERENCES care_locations(id),
  transfer_authorization_number VARCHAR,
  
  -- Waste/Destruction (Ghana Protocols)
  witness_id UUID REFERENCES users(id),
  destruction_method VARCHAR,
  destruction_date TIMESTAMP,
  destruction_certificate VARCHAR,
  nacob_notification_sent BOOLEAN DEFAULT false,
  environmental_disposal_certificate VARCHAR, -- EPA Ghana requirements
  
  -- Personnel (Pharmacy Council Licensed)
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_by_license VARCHAR, -- Pharmacy Council license number
  verified_by UUID REFERENCES users(id),
  verified_by_license VARCHAR,
  
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

CREATE INDEX idx_cs_register_location ON controlled_medicines_register(location_id);
CREATE INDEX idx_cs_register_medication ON controlled_medicines_register(formulary_id);
CREATE INDEX idx_cs_register_date ON controlled_medicines_register(transaction_date);
CREATE INDEX idx_cs_register_type ON controlled_medicines_register(transaction_type);
CREATE INDEX idx_cs_register_nacob ON controlled_medicines_register(nacob_schedule);
```

#### 5. Prescription Refills (Audit Trail)
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
  
  -- Personnel (Ghana Licensed)
  dispensed_by UUID NOT NULL REFERENCES users(id),
  dispensed_by_license VARCHAR, -- Pharmacy Council license
  verified_by UUID REFERENCES users(id),
  counseled_by UUID REFERENCES users(id),
  
  -- Patient
  patient_signature TEXT,
  pickup_date TIMESTAMP,
  picked_up_by VARCHAR, -- Name if proxy pickup
  proxy_relationship VARCHAR,
  proxy_id_verified BOOLEAN,
  proxy_id_type VARCHAR, -- Ghana Card, Voter ID, Passport, etc.
  
  -- Cost (Ghana Cedis)
  dispensing_cost_ghs DECIMAL(10,2),
  patient_cost_ghs DECIMAL(10,2),
  nhis_covered_ghs DECIMAL(10,2),
  
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

*[Additional tables continue with Ghana-specific adaptations...]*

---

## Regulatory Compliance (Ghana)

### Ghana Pharmacy Council Requirements
- ✓ Licensed pharmacist supervision for dispensing
- ✓ Proper medication labeling per Ghana standards
- ✓ Patient counseling documentation
- ✓ Medication error reporting to Pharmacy Council
- ✓ Adverse drug reaction reporting to FDA Ghana
- ✓ Continuing professional development records
- ✓ Pharmacy premises licensing
- ✓ Good Pharmacy Practice (GPP) guidelines

### FDA Ghana (Food and Drugs Authority) Requirements
- ✓ Only FDA-registered medications in formulary
- ✓ FDA registration number tracking
- ✓ Post-market surveillance participation
- ✓ Adverse event reporting (pharmacovigilance)
- ✓ Product recall compliance
- ✓ Import permit management
- ✓ Batch/lot number tracking
- ✓ Counterfeit drug reporting

### NACOB (Narcotics Control Board) Requirements
- ✓ Controlled medicines classification (Schedule 1-3)
- ✓ NACOB permit for Schedule 1 substances
- ✓ Physical register maintenance (backup)
- ✓ Dual verification for controlled medicines
- ✓ Monthly stock reconciliation
- ✓ Quarterly reporting to NACOB
- ✓ Secure storage requirements
- ✓ Loss/theft reporting within 24 hours
- ✓ Destruction witnessing and certificates

### Ghana Data Protection Act (2012) Compliance
- ✓ Encrypted data storage and transmission
- ✓ Patient consent for data processing
- ✓ Access logging and monitoring
- ✓ Data breach notification (within 72 hours)
- ✓ Right to access, rectification, erasure
- ✓ Data retention policies (minimum 5 years for prescriptions)
- ✓ Cross-border data transfer safeguards
- ✓ Privacy impact assessments

### Ghana Mining Regulations
- ✓ Occupational health standards compliance
- ✓ Fitness for underground work assessments
- ✓ Heat stress medication considerations
- ✓ Heavy machinery operation clearances
- ✓ Work restriction documentation
- ✓ Incident-related medication tracking
- ✓ Emergency medication availability
- ✓ Minerals Commission reporting

### National Health Insurance Scheme (NHIS) Integration
- ✓ NHIS medicines list compliance
- ✓ Patient eligibility verification
- ✓ Claims submission
- ✓ Authorization management
- ✓ Pricing per NHIS rates
- ✓ Documentation for audits

---

## Ghana-Specific Features

### 1. Ghana Essential Medicines List (EML) Integration
- Formulary prioritizes Ghana EML medicines
- EML category tagging
- Automatic substitution with EML equivalents
- Stock level alerts for essential medicines
- Reporting on EML availability

### 2. NHIS (National Health Insurance Scheme) Support
- NHIS patient registration verification
- NHIS medicines list filtering
- Automatic pricing per NHIS rates
- Claims generation and submission
- Co-payment calculation
- Prior authorization workflow

### 3. Climate-Appropriate Storage Management
- Temperature monitoring for Ghana's tropical climate
- Humidity-sensitive medication flagging
- Air-conditioning requirements
- Refrigeration alerts
- Heat-stressed stability tracking
- Rainy season storage considerations

### 4. Language Support for Patient Counseling
- Multi-language prescr documentation (English, Twi, Ga, Ewe, etc.)
- Visual aids for low-literacy patients
- Audio counseling recordings
- Cultural considerations in medication use

### 5. Local Supply Chain Integration
- Ghana-based supplier management
- Import permit tracking
- Port clearance documentation
- Local manufacturer partnerships
- Generic substitution with locally-produced alternatives

### 6. Mobile Money Integration (Optional Future)
- MTN Mobile Money
- Vodafone Cash
- AirtelTigo Money
- Payment verification
- Receipt generation

---

## Implementation Timeline (Ghana Context)

### Phase 1: Foundation (Weeks 1-4)
- Database schema with Ghana-specific fields
- FDA Ghana registration number integration
- NACOB schedule classification
- Ghana EML formulary seeding
- Basic API endpoints

### Phase 2: Prescription Workflows (Weeks 5-8)
- E-prescribing with Ghana format
- Pharmacy Council license verification
- NHIS integration (basic)
- Safety checks adapted for Ghana formulary
- Digital signatures compliant with Ghana e-signature Act

### Phase 3: Inventory & Transfers (Weeks 9-12)
- FDA batch tracking
- Climate-appropriate storage alerts
- Import permit management
- Inter-location transfers
- Supplier licensing verification

### Phase 4: Controlled Medicines (Weeks 13-16)
- NACOB register (digital + physical backup)
- Dual verification workflows
- Monthly reconciliation with NACOB reporting
- Secure storage access logging
- Loss/theft 24-hour notification

### Phase 5: Clinical Decision Support (Weeks 17-20)
- Drug interactions (Ghana formulary)
- Mining-specific safety (Ghana context)
- Heat stress medication considerations
- Fitness for duty (Minerals Commission standards)
- Alternative suggestions (Ghana EML)

### Phase 6: Reporting & Analytics (Weeks 21-24)
- Ghana Pharmacy Council reports
- FDA Ghana pharmacovigilance
- NACOB quarterly reports
- NHIS claims reports
- Mining safety compliance reports
- Ghana EML availability tracking

### Phase 7: Polish & Launch (Weeks 25-28)
- Performance optimization
- User training (Ghana healthcare context)
- Documentation in English (+ Twi translations for common terms)
- Regulatory compliance verification
- Pilot deployment at selected mining site
- Ghana Pharmacy Council inspection readiness

---

## Success Metrics (Ghana Context)

### Operational Targets
- Prescription turnaround: < 45 minutes (accounting for verification)
- Medication error rate: < 0.1%
- Inventory accuracy: > 99%
- Controlled medicines accuracy: 100% (NACOB requirement)
- FDA-registered medicines only: 100%
- Ghana EML availability: > 95%

### Clinical Targets
- Drug interaction screening: 100%
- Allergy checking: 100%
- Zero serious harm events
- Patient counseling: 100% (Pharmacy Council requirement)
- Adherence tracking: > 75%

### Compliance Targets
- NACOB quarterly reports: 100% on-time
- FDA pharmacovigilance: 100% compliance
- Pharmacy Council audits: Zero violations
- Data Protection Act compliance: 100%
- Mining regulations compliance: 100%

### NHIS Performance
- NHIS patient identification: > 95% accuracy
- Claims submission: Within 7 days
- Authorization turnaround: < 24 hours
- NHIS pricing accuracy: 100%

---

## Ghana-Specific Considerations

### Challenges & Solutions

**Challenge 1: Intermittent Power Supply**
- Solution: Offline mode capability
- Battery backup for critical systems
- Data synchronization when power restored
- Physical backup registers

**Challenge 2: Internet Connectivity Issues**
- Solution: Local data caching
- Offline prescription creation
- Batch synchronization
- SMS-based alerts as backup

**Challenge 3: Counterfeit Medicines**
- Solution: FDA registration verification
- Supplier licensing checks
- Batch authenticity verification
- Suspicious product reporting

**Challenge 4: Multiple Languages**
- Solution: Multi-language support
- Visual prescription labels
- Audio counseling in local languages
- Pictorial medication schedules

**Challenge 5: NHIS Claim Delays**
- Solution: Automated claim tracking
- Follow-up reminders
- Alternative payment options
- Claim status visibility

### Best Practices for Ghana

1. **Always verify FDA registration** before adding to formulary
2. **Maintain physical backup** of controlled medicines register (NACOB requirement)
3. **Document in English** for official records, provide local language aids for patients
4. **Climate monitoring** - Critical for medication stability in tropical conditions
5. **Stock buffer** - Account for supply chain delays (ports, customs)
6. **Community engagement** - Work with traditional medicine practitioners for referrals
7. **NHIS partnership** - Strong relationship with district NHIS office
8. **Pharmacy Council updates** - Regular CPD and guideline compliance

---

## Next Steps

1. ✅ Review comprehensive plan (Ghana context)
2. ⏳ Obtain necessary licenses (Pharmacy Council, FDA, NACOB permits)
3. ⏳ Engage regulatory consultants (Pharmacy Council liaison)
4. ⏳ Seed Ghana EML formulary
5. ⏳ Establish NHIS partnership
6. ⏳ Begin Phase 1 implementation
7. ⏳ Pilot at one mining site for regulatory approval

---

*This plan is specifically adapted for the Ghanaian regulatory environment, healthcare system, and mining industry context.*

**Document Version:** 1.0.0 (Ghana Edition)  
**Regulatory Framework:** Ghana  
**Last Updated:** October 11, 2025  
**Status:** Planning Phase - Awaiting Regulatory Review

