# MineAid HMS - Comprehensive Implementation Plan
## Multi-Tenant Healthcare Management System for Mining Operations

### Architecture Overview
MineAid HMS follows a **multi-level tenant hierarchy** designed for mining operations:
- **MineAid Admin** → **Tenants** (Mining Sites) → **Companies** (Contractors) → **Employees** → **Users** (Medical Staff) → **Patients**

All database tables include tenant isolation columns (`tenant_id`) to ensure complete data separation between mining sites.

### Phase 1: Core Medical Management ✅ COMPLETED

#### ✅ **Multi-Tenant Foundation**
- Hierarchical tenant architecture: Admin → Tenants → Companies → Employees → Users → Patients
- Complete tenant isolation with `tenant_id` foreign keys on all tables
- Bulletproof data separation preventing cross-tenant access
- Automatic tenant assignment and admin approval workflow

#### ✅ **Patient Registration & Management**
- Patient database with mining-specific fields (employee ID, department, shift)
- Medical history tracking and allergies with tenant isolation
- Emergency contact information
- **Tenant Schema**: All patient data isolated by `tenant_id`

#### ✅ **Medical Visit Documentation**
- Comprehensive examination forms with vitals tracking
- Chief complaints and physical examination records
- Treatment plans and work disposition decisions
- **Tenant Schema**: Medical visits linked to tenant via patient relationships
- **CRUD Operations**: Full 3-dots menu functionality with create, read, update, delete
- **Audit Logging**: Complete audit trail for all medical visit operations

#### ✅ **Appointment Scheduling System**
- Calendar-based appointment booking
- Staff and patient scheduling coordination
- Appointment status tracking (scheduled, completed, cancelled, in_progress, no_show)
- **Status Management**: Complete appointment lifecycle with reassignment capabilities
- **CRUD Operations**: Full 3-dots menu functionality with status management
- **Audit Logging**: Complete audit trail for all appointment operations
- **Tenant Schema**: Appointments isolated by tenant through patient/staff relationships

#### ✅ **Medical Records Management**
- Centralized patient record storage
- Medical history tracking with timestamps
- Secure access controls for medical staff
- **CRUD Operations**: Full 3-dots menu functionality
- **Audit Logging**: Complete audit trail for all record operations
- **Tenant Schema**: Records inherit tenant isolation from patient associations

#### ✅ **Dashboard & Analytics**
- Real-time metrics and KPIs with tenant filtering
- Patient statistics and system status
- Quick action buttons for common tasks
- **Tenant Schema**: All metrics filtered by user's tenant association

#### ✅ **Comprehensive Audit Logging System (NEW)**
- **Database Schema**: New `audit_logs` table with tenant isolation
- **Automatic Integration**: All CRUD operations automatically logged
- **Action Tracking**: INSERT, UPDATE, DELETE operations with old/new data
- **User Tracking**: All actions linked to authenticated users
- **Audit Trail Page**: Dedicated interface for viewing system-wide audit history
- **Filtering Capabilities**: Filter by table, action, user, date range
- **Regulatory Compliance**: Complete audit trail for mining safety regulations
- **Tenant Isolation**: All audit logs include tenant_id for data separation

#### ✅ **System-Wide CRUD Operations (NEW)**
- **Standardized 3-Dots Menu**: Consistent dropdown interface across all modules
- **Appointment CRUD**: Create, read, update, delete with status management
- **Medical Visit CRUD**: Complete lifecycle management with detailed forms
- **Incident Report CRUD**: Full operations with status tracking
- **Operational Duty CRUD**: Assignment, completion, and history tracking
- **Audit Integration**: Every CRUD operation automatically logged
- **Status Workflows**: Defined status transitions for all entities

### Phase 2: Safety & Compliance (NEXT)

#### 5. Incident Reporting & Injury Management System
**Multi-Tenant Database Schema:**
```sql
-- Incident Reports Table (Tenant Isolated)
incidents (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  company_id: uuid REFERENCES companies(id),
  incident_number: varchar UNIQUE,
  employee_id: uuid REFERENCES employees(id),
  patient_id: uuid REFERENCES patients(id),
  reported_by_id: uuid REFERENCES users(id),
  incident_date: timestamp,
  incident_time: varchar,
  location: varchar,
  department: varchar,
  shift: varchar,
  incident_type: enum('injury', 'near_miss', 'equipment_failure', 'environmental'),
  severity: enum('minor', 'moderate', 'major', 'critical'),
  description: text,
  immediate_action_taken: text,
  witnesses: text[],
  supervisor_notified: boolean,
  supervisor_name: varchar,
  medical_attention_required: boolean,
  lost_time_injury: boolean,
  body_parts_affected: text[],
  injury_classification: varchar,
  root_cause_analysis: text,
  corrective_actions: text,
  preventive_measures: text,
  status: enum('open', 'investigating', 'closed'),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT incidents_tenant_company_fk 
    FOREIGN KEY (tenant_id, company_id) REFERENCES companies(tenant_id, id),
  CONSTRAINT incidents_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id)
);

-- Incident Follow-ups (Tenant Isolated)
incident_followups (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id: uuid REFERENCES incidents(id),
  follow_up_date: timestamp,
  follow_up_type: enum('medical_check', 'investigation_update', 'corrective_action'),
  notes: text,
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT followups_tenant_incident_fk 
    FOREIGN KEY (tenant_id, incident_id) REFERENCES incidents(tenant_id, id)
);

-- Workers' Compensation Claims (Tenant Isolated)
workers_compensation (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id: uuid REFERENCES incidents(id),
  claim_number: varchar UNIQUE,
  claim_date: timestamp,
  claim_status: enum('pending', 'approved', 'denied', 'closed'),
  insurance_carrier: varchar,
  adjuster_name: varchar,
  adjuster_contact: varchar,
  estimated_cost: decimal,
  actual_cost: decimal,
  return_to_work_date: timestamp,
  work_restrictions: text,
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT compensation_tenant_incident_fk 
    FOREIGN KEY (tenant_id, incident_id) REFERENCES incidents(tenant_id, id)
);
```

**Features:**
- Tenant-isolated incident reporting with workflow management
- Automatic incident numbering per tenant
- Body part injury mapping with visual diagrams
- Root cause analysis templates
- Supervisor notifications and approvals
- OSHA compliance reporting per mining site
- Workers' compensation integration with tenant context
- Statistical analysis and trending per tenant

#### 6. Medical Inventory & Equipment Tracking
**Multi-Tenant Database Schema:**
```sql
-- Medical Inventory (Tenant Isolated)
medical_inventory (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  company_id: uuid REFERENCES companies(id), -- Optional: company-specific inventory
  item_name: varchar,
  item_code: varchar,
  category: enum('medication', 'supplies', 'equipment', 'consumables'),
  brand: varchar,
  model: varchar,
  description: text,
  unit_of_measure: varchar,
  current_stock: integer,
  minimum_stock: integer,
  maximum_stock: integer,
  reorder_point: integer,
  unit_cost: decimal,
  total_value: decimal,
  supplier: varchar,
  supplier_contact: varchar,
  expiry_date: date,
  lot_number: varchar,
  location: varchar,
  barcode: varchar,
  status: enum('active', 'discontinued', 'recalled'),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Ensure unique item codes per tenant
  CONSTRAINT inventory_tenant_code_unique UNIQUE (tenant_id, item_code)
);

-- Inventory Transactions (Tenant Isolated)
inventory_transactions (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  item_id: uuid REFERENCES medical_inventory(id),
  transaction_type: enum('requisition', 'receipt', 'issue', 'adjustment', 'transfer', 'disposal'),
  quantity: integer,
  previous_stock: integer,
  new_stock: integer,
  reference_number: varchar,
  patient_id: uuid REFERENCES patients(id),
  medical_visit_id: uuid REFERENCES medical_visits(id),
  notes: text,
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT transactions_tenant_item_fk 
    FOREIGN KEY (tenant_id, item_id) REFERENCES medical_inventory(tenant_id, id)
);

-- Equipment Maintenance (Tenant Isolated)
equipment_maintenance (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id: uuid REFERENCES medical_inventory(id),
  maintenance_type: enum('preventive', 'corrective', 'calibration', 'inspection'),
  scheduled_date: date,
  completed_date: date,
  maintenance_description: text,
  technician_name: varchar,
  service_company: varchar,
  cost: decimal,
  next_maintenance_date: date,
  certification_expires: date,
  status: enum('scheduled', 'in_progress', 'completed', 'overdue'),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT maintenance_tenant_equipment_fk 
    FOREIGN KEY (tenant_id, equipment_id) REFERENCES medical_inventory(tenant_id, id)
);

-- Purchase Orders (Tenant Isolated)
purchase_orders (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  po_number: varchar,
  supplier: varchar,
  order_date: date,
  expected_delivery: date,
  actual_delivery: date,
  total_amount: decimal,
  status: enum('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'completed'),
  approved_by: uuid REFERENCES users(id),
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  
  -- Ensure unique PO numbers per tenant
  CONSTRAINT po_tenant_number_unique UNIQUE (tenant_id, po_number)
);

-- Purchase Order Items (Tenant Isolated)
purchase_order_items (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  po_id: uuid REFERENCES purchase_orders(id),
  item_id: uuid REFERENCES medical_inventory(id),
  quantity_ordered: integer,
  quantity_received: integer,
  unit_cost: decimal,
  total_cost: decimal,
  
  -- Tenant isolation constraints
  CONSTRAINT po_items_tenant_po_fk 
    FOREIGN KEY (tenant_id, po_id) REFERENCES purchase_orders(tenant_id, id),
  CONSTRAINT po_items_tenant_item_fk 
    FOREIGN KEY (tenant_id, item_id) REFERENCES medical_inventory(tenant_id, id)
);
```

**Features:**
- Tenant-isolated inventory tracking with barcode scanning
- Company-specific inventory allocation within tenants
- Automated reorder alerts per tenant configuration
- Equipment maintenance scheduling per mining site
- Expiry date monitoring with tenant-specific alerts
- Cost tracking and budget management per tenant
- Supplier management with tenant context
- Asset tagging and location tracking per site
- Audit trails for all transactions with tenant isolation

#### 7. Drug & Alcohol Testing Module
**Multi-Tenant Database Schema:**
```sql
-- D&A Testing Programs (Tenant Isolated)
testing_programs (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  program_name: varchar,
  program_type: enum('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up'),
  testing_frequency: varchar,
  pool_size: integer,
  active: boolean,
  created_at: timestamp,
  
  -- Ensure unique program names per tenant
  CONSTRAINT programs_tenant_name_unique UNIQUE (tenant_id, program_name)
);

-- D&A Tests (Tenant Isolated)
drug_alcohol_tests (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  test_number: varchar,
  employee_id: uuid REFERENCES employees(id),
  patient_id: uuid REFERENCES patients(id),
  program_id: uuid REFERENCES testing_programs(id),
  test_type: enum('drug', 'alcohol', 'both'),
  test_reason: enum('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up'),
  scheduled_date: date,
  collection_date: date,
  collection_time: time,
  collector_name: varchar,
  collection_site: varchar,
  specimen_type: enum('urine', 'saliva', 'hair', 'breath'),
  chain_of_custody: varchar,
  testing_lab: varchar,
  result_date: date,
  drug_result: enum('negative', 'positive', 'dilute', 'invalid', 'pending'),
  alcohol_result: enum('negative', 'positive', 'pending'),
  alcohol_level: decimal,
  substances_detected: text[],
  confirmation_required: boolean,
  mro_review: boolean,
  mro_name: varchar,
  final_result: enum('negative', 'positive', 'test_not_conducted'),
  disciplinary_action: text,
  return_to_duty_required: boolean,
  follow_up_testing_required: boolean,
  status: enum('scheduled', 'collected', 'in_lab', 'results_pending', 'completed', 'cancelled'),
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Ensure unique test numbers per tenant
  CONSTRAINT tests_tenant_number_unique UNIQUE (tenant_id, test_number),
  -- Tenant isolation constraints
  CONSTRAINT tests_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id),
  CONSTRAINT tests_tenant_program_fk 
    FOREIGN KEY (tenant_id, program_id) REFERENCES testing_programs(tenant_id, id)
);

-- Random Testing Pools (Tenant Isolated)
random_testing_pools (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  pool_name: varchar,
  department: varchar,
  job_classification: varchar,
  employee_count: integer,
  testing_rate: decimal,
  last_selection_date: date,
  next_selection_date: date,
  active: boolean,
  
  -- Ensure unique pool names per tenant
  CONSTRAINT pools_tenant_name_unique UNIQUE (tenant_id, pool_name)
);

-- Random Selection History (Tenant Isolated)
random_selections (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  pool_id: uuid REFERENCES random_testing_pools(id),
  selection_date: date,
  employee_id: uuid REFERENCES employees(id),
  selected_for_testing: boolean,
  test_completed: boolean,
  test_id: uuid REFERENCES drug_alcohol_tests(id),
  
  -- Tenant isolation constraints
  CONSTRAINT selections_tenant_pool_fk 
    FOREIGN KEY (tenant_id, pool_id) REFERENCES random_testing_pools(tenant_id, id),
  CONSTRAINT selections_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id)
);
```

**Features:**
- Tenant-specific testing program management
- Random selection algorithms per mining site
- Chain of custody documentation with tenant context
- Integration with MRO workflow per tenant
- DOT compliance for transportation roles per site
- Result notifications and disciplinary tracking
- Statistical reporting and trend analysis per tenant
- Return-to-duty and follow-up protocols

#### 8. HSE (Health, Safety & Environment) Information Management
**Multi-Tenant Database Schema:**
```sql
-- HSE Training Records (Tenant Isolated)
hse_training (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id: uuid REFERENCES employees(id),
  training_name: varchar,
  training_type: enum('safety_orientation', 'hazcom', 'ppe', 'confined_space', 'lockout_tagout', 'respiratory', 'first_aid', 'cpr'),
  training_provider: varchar,
  completion_date: date,
  expiry_date: date,
  certification_number: varchar,
  score: decimal,
  status: enum('current', 'expired', 'pending_renewal'),
  instructor_name: varchar,
  training_hours: decimal,
  refresher_required: boolean,
  created_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT training_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id)
);

-- Safety Data Sheets (Tenant Isolated)
safety_data_sheets (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  product_name: varchar,
  manufacturer: varchar,
  sds_number: varchar,
  revision_date: date,
  hazard_classification: text[],
  precautionary_statements: text[],
  first_aid_measures: text,
  fire_fighting_measures: text,
  accidental_release_measures: text,
  handling_storage: text,
  exposure_controls: text,
  physical_chemical_properties: text,
  stability_reactivity: text,
  toxicological_information: text,
  ecological_information: text,
  disposal_considerations: text,
  transport_information: text,
  regulatory_information: text,
  file_path: varchar,
  status: enum('current', 'outdated', 'under_review'),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Ensure unique SDS numbers per tenant
  CONSTRAINT sds_tenant_number_unique UNIQUE (tenant_id, sds_number)
);

-- Environmental Monitoring (Tenant Isolated)
environmental_monitoring (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  monitoring_type: enum('air_quality', 'noise_level', 'vibration', 'radiation', 'chemical_exposure'),
  location: varchar,
  department: varchar,
  measurement_date: date,
  measurement_time: time,
  parameter_measured: varchar,
  measurement_value: decimal,
  unit_of_measure: varchar,
  regulatory_limit: decimal,
  action_level: decimal,
  compliance_status: enum('compliant', 'approaching_limit', 'exceeds_limit'),
  sampling_method: varchar,
  equipment_used: varchar,
  technician_name: varchar,
  weather_conditions: varchar,
  notes: text,
  corrective_actions: text,
  created_at: timestamp
);

-- Safety Inspections (Tenant Isolated)
safety_inspections (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  inspection_type: enum('routine', 'regulatory', 'accident_investigation', 'special'),
  inspection_date: date,
  inspector_name: varchar,
  inspector_organization: varchar,
  area_inspected: varchar,
  checklist_used: varchar,
  overall_score: decimal,
  findings_count: integer,
  critical_findings: integer,
  major_findings: integer,
  minor_findings: integer,
  corrective_actions_required: integer,
  status: enum('in_progress', 'completed', 'follow_up_required'),
  report_path: varchar,
  created_at: timestamp
);

-- Safety Inspection Findings (Tenant Isolated)
inspection_findings (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  inspection_id: uuid REFERENCES safety_inspections(id),
  finding_number: varchar,
  finding_type: enum('critical', 'major', 'minor', 'observation'),
  category: varchar,
  description: text,
  regulation_reference: varchar,
  corrective_action: text,
  responsible_person: varchar,
  due_date: date,
  completion_date: date,
  status: enum('open', 'in_progress', 'completed', 'overdue'),
  verification_required: boolean,
  verified_by: varchar,
  verification_date: date,
  
  -- Tenant isolation constraints
  CONSTRAINT findings_tenant_inspection_fk 
    FOREIGN KEY (tenant_id, inspection_id) REFERENCES safety_inspections(tenant_id, id)
);
```

**Features:**
- Tenant-specific training matrix and certification tracking
- Automated renewal notifications per mining site
- Safety Data Sheet management per tenant
- Environmental monitoring and compliance tracking
- Safety inspection workflows per site
- Regulatory compliance dashboards
- Risk assessment and hazard identification
- Emergency response plan management per tenant

### Phase 3: Advanced Analytics & Reporting

#### 9. Advanced Reporting & Analytics Dashboard
**Multi-Tenant Database Schema:**
```sql
-- Report Templates (Tenant Isolated)
report_templates (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  template_name: varchar,
  template_type: enum('injury_statistics', 'osha_logs', 'workers_comp', 'medical_surveillance', 'drug_testing', 'environmental', 'custom'),
  description: text,
  template_config: jsonb,
  frequency: enum('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'on_demand'),
  recipients: text[],
  active: boolean,
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  
  -- Ensure unique template names per tenant
  CONSTRAINT templates_tenant_name_unique UNIQUE (tenant_id, template_name)
);

-- Scheduled Reports (Tenant Isolated)
scheduled_reports (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  template_id: uuid REFERENCES report_templates(id),
  schedule_name: varchar,
  cron_expression: varchar,
  next_run_date: timestamp,
  last_run_date: timestamp,
  parameters: jsonb,
  output_format: enum('pdf', 'excel', 'csv', 'json'),
  delivery_method: enum('email', 'download', 'api'),
  active: boolean,
  
  -- Tenant isolation constraints
  CONSTRAINT scheduled_tenant_template_fk 
    FOREIGN KEY (tenant_id, template_id) REFERENCES report_templates(tenant_id, id)
);

-- Report Execution History (Tenant Isolated)
report_executions (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  template_id: uuid REFERENCES report_templates(id),
  scheduled_report_id: uuid REFERENCES scheduled_reports(id),
  execution_date: timestamp,
  parameters_used: jsonb,
  status: enum('running', 'completed', 'failed'),
  file_path: varchar,
  file_size: bigint,
  execution_time_ms: integer,
  error_message: text,
  created_by: uuid REFERENCES users(id),
  
  -- Tenant isolation constraints
  CONSTRAINT executions_tenant_template_fk 
    FOREIGN KEY (tenant_id, template_id) REFERENCES report_templates(tenant_id, id)
);

-- Custom Dashboards (Tenant Isolated)
custom_dashboards (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dashboard_name: varchar,
  dashboard_config: jsonb,
  permissions: jsonb,
  shared: boolean,
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Ensure unique dashboard names per tenant
  CONSTRAINT dashboards_tenant_name_unique UNIQUE (tenant_id, dashboard_name)
);

-- KPI Definitions (Tenant Configurable)
kpi_definitions (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id), -- NULL for global KPIs, specific for tenant-custom KPIs
  kpi_name: varchar,
  kpi_description: text,
  kpi_formula: text,
  data_source: varchar,
  calculation_method: enum('sum', 'average', 'count', 'percentage', 'rate', 'custom'),
  target_value: decimal,
  threshold_green: decimal,
  threshold_yellow: decimal,
  threshold_red: decimal,
  unit_of_measure: varchar,
  calculation_frequency: enum('real_time', 'hourly', 'daily', 'weekly', 'monthly'),
  active: boolean
);

-- KPI Values (Tenant Isolated)
kpi_values (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  kpi_id: uuid REFERENCES kpi_definitions(id),
  calculation_date: date,
  calculation_period: varchar,
  actual_value: decimal,
  target_value: decimal,
  variance: decimal,
  variance_percentage: decimal,
  status: enum('above_target', 'on_target', 'below_target', 'critical'),
  created_at: timestamp
);
```

**Features:**
- Tenant-specific dashboard builder with drag-and-drop widgets
- Real-time KPI monitoring per mining site
- Automated report generation per tenant
- Regulatory reporting (OSHA 300, MSHA, DOT) per site
- Trend analysis and predictive analytics
- Benchmarking against industry standards
- Executive summary dashboards per tenant
- Mobile-responsive reporting interface

#### 10. Medical Surveillance & Fitness for Duty
**Multi-Tenant Database Schema:**
```sql
-- Medical Surveillance Programs (Tenant Isolated)
medical_surveillance_programs (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  program_name: varchar,
  program_type: enum('respiratory', 'hearing_conservation', 'hazmat_exposure', 'ergonomic', 'general_health'),
  target_population: varchar,
  exposure_criteria: text,
  medical_protocol: text,
  examination_frequency: varchar,
  regulatory_basis: varchar,
  active: boolean,
  created_at: timestamp,
  
  -- Ensure unique program names per tenant
  CONSTRAINT surveillance_tenant_name_unique UNIQUE (tenant_id, program_name)
);

-- Medical Examinations (Tenant Isolated)
medical_examinations (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  exam_number: varchar,
  employee_id: uuid REFERENCES employees(id),
  patient_id: uuid REFERENCES patients(id),
  program_id: uuid REFERENCES medical_surveillance_programs(id),
  exam_type: enum('baseline', 'periodic', 'termination', 'return_to_work', 'fitness_for_duty'),
  exam_date: date,
  examining_physician: varchar,
  exam_location: varchar,
  medical_findings: text,
  recommendations: text,
  work_restrictions: text,
  fitness_determination: enum('fit_for_duty', 'fit_with_restrictions', 'temporarily_unfit', 'permanently_unfit'),
  next_exam_date: date,
  follow_up_required: boolean,
  referral_required: boolean,
  referral_specialist: varchar,
  created_at: timestamp,
  updated_at: timestamp,
  
  -- Ensure unique exam numbers per tenant
  CONSTRAINT exams_tenant_number_unique UNIQUE (tenant_id, exam_number),
  -- Tenant isolation constraints
  CONSTRAINT exams_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id),
  CONSTRAINT exams_tenant_program_fk 
    FOREIGN KEY (tenant_id, program_id) REFERENCES medical_surveillance_programs(tenant_id, id)
);

-- Exposure Records (Tenant Isolated)
exposure_records (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id: uuid REFERENCES employees(id),
  exposure_type: enum('chemical', 'noise', 'radiation', 'biological', 'physical'),
  substance_name: varchar,
  exposure_level: decimal,
  unit_of_measure: varchar,
  exposure_duration: decimal,
  exposure_date: date,
  monitoring_method: varchar,
  protective_equipment: text,
  work_area: varchar,
  job_task: varchar,
  weather_conditions: varchar,
  created_by: uuid REFERENCES users(id),
  created_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT exposure_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id)
);

-- Fitness for Duty Assessments (Tenant Isolated)
fitness_assessments (
  id: uuid PRIMARY KEY,
  tenant_id: uuid REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id: uuid REFERENCES employees(id),
  assessment_date: date,
  assessment_type: enum('pre_placement', 'periodic', 'post_incident', 'return_to_work', 'random'),
  requesting_supervisor: varchar,
  assessment_reason: text,
  physical_demands: text,
  cognitive_demands: text,
  medical_history_review: text,
  physical_examination: text,
  functional_testing: text,
  psychological_evaluation: text,
  fitness_determination: enum('fit', 'fit_with_restrictions', 'unfit', 'requires_follow_up'),
  work_restrictions: text,
  accommodation_needed: boolean,
  accommodation_description: text,
  reassessment_required: boolean,
  reassessment_date: date,
  examining_physician: varchar,
  created_at: timestamp,
  
  -- Tenant isolation constraints
  CONSTRAINT fitness_tenant_employee_fk 
    FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id)
);
```

**Features:**
- Tenant-specific medical surveillance programs
- Comprehensive examination tracking per mining site
- Exposure monitoring and record keeping
- Fitness for duty assessments with tenant context
- Regulatory compliance tracking per site
- Integration with occupational health protocols
- Automated scheduling and notifications
- Report generation for regulatory agencies

## Current Implementation Status

### ✅ COMPLETED - Version 2.2.0
- **Multi-Tenant Foundation**: Complete tenant hierarchy with bulletproof isolation
- **Dual Authentication**: Replit OpenID Connect + Custom email/phone auth
- **Core HMS Features**: Patient management, appointments, medical records, incidents
- **Admin Panel**: Comprehensive user management with approval workflow
- **Email System**: Professional branded notifications using Gmail SMTP
- **Employee Integration**: Automatic employee record creation for seamless operations
- **Profile Management**: Local file storage for profile pictures (cost-effective)
- **Admin Navigation**: Fixed cross-tab functionality with proper React state management

### 🚧 IN PROGRESS - Version 2.3.0
- Enhanced incident reporting with body part mapping
- Medical inventory tracking system
- Advanced analytics dashboard
- HSE training module

### 📋 PLANNED - Version 3.0.0
- Drug & alcohol testing module
- Environmental monitoring
- Mobile application
- Advanced ML analytics

---

**Architecture**: Multi-tenant with complete data isolation  
**Authentication**: Dual system (Replit + Custom)  
**Database**: PostgreSQL with tenant-isolated tables  
**Security**: Production-grade with admin approval workflow  
**Status**: Production-ready core system with advanced features in development