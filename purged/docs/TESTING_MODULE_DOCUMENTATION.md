# Drug, Alcohol & Hydration Testing Module - Comprehensive Documentation

**Version:** 2.5.0  
**Last Updated:** October 2025  
**Module Status:** Production Ready ✅

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features Implemented](#features-implemented)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [User Flows](#user-flows)
7. [UI Components](#ui-components)
8. [Testing Programs](#testing-programs)
9. [Reports & Analytics](#reports--analytics)
10. [Compliance & Audit](#compliance--audit)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
The Drug, Alcohol & Hydration Testing Module is a comprehensive solution for managing substance testing and hydration monitoring in mining operations. It ensures regulatory compliance, personnel safety, and operational efficiency through systematic testing protocols.

### Key Capabilities
- **Drug Testing** - Multi-panel screening with DrugCheck 3000 integration
- **Alcohol Testing** - Breathalyzer and BAC level monitoring
- **Hydration Testing** - Specific gravity and hydration level assessment
- **Testing Programs** - Scheduled random and targeted testing
- **Reports & Analytics** - Comprehensive insights and compliance tracking
- **Audit Logging** - Complete accountability and regulatory compliance

### Regulatory Compliance
- Mining Safety Regulations (MSR)
- Occupational Safety and Health (OSH) Standards
- Company-specific D&A policies
- Underground personnel safety requirements

---

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- React Query for data fetching & caching
- Wouter for routing
- Shadcn UI components
- Tailwind CSS for styling
- Zod for schema validation

**Backend:**
- Express.js server
- PostgreSQL database with Drizzle ORM
- RESTful API architecture
- Staff auth session middleware (`authMiddleware`)
- Audit logging system

### Module Structure

```
client/src/pages/
├── DrugAlcoholTesting.tsx    # Main dashboard & test management
├── TestResultForm.tsx          # Quick test result entry
├── NewTestingForm.tsx          # Detailed test scheduling
├── TestScheduling.tsx          # Test scheduling interface
└── TestingReports.tsx          # Analytics & reports

server/
├── routes.ts                   # API endpoints
├── storage.ts                  # Database operations
└── schema.ts                   # Database schema definitions
```

---

## Features Implemented

### 1. Test Management

#### Drug Tests
- ✅ Multiple specimen types (urine, saliva, blood, hair)
- ✅ 6-panel drug screening (COC, OPI, THC, AMP, MET, BZO)
- ✅ Individual panel result tracking
- ✅ Overall test result (negative/positive/non-negative/dilute/invalid)
- ✅ DrugCheck 3000 device integration
- ✅ Chain of custody tracking
- ✅ MRO (Medical Review Officer) review workflow

#### Alcohol Tests
- ✅ Breathalyzer testing
- ✅ BAC level recording
- ✅ Observation period tracking
- ✅ Confirmation test capability
- ✅ Multiple testing devices support
- ✅ Field and laboratory testing

#### Hydration Tests
- ✅ Urine specific gravity measurement
- ✅ Urine color assessment
- ✅ Skin pinch test
- ✅ Comprehensive hydration assessment
- ✅ Underground personnel focus
- ✅ Heat stress monitoring
- ✅ Recommended action tracking

### 2. Testing Programs
- ✅ Random testing programs
- ✅ Pre-employment screening
- ✅ Post-incident testing
- ✅ Reasonable suspicion testing
- ✅ Return-to-duty testing
- ✅ Follow-up testing
- ✅ Routine screening schedules
- ✅ Program activation/deactivation
- ✅ Department-specific targeting
- ✅ Underground personnel focus

### 3. Test Lifecycle Management

#### Scheduled Tests
- ✅ Create scheduled tests
- ✅ View upcoming tests
- ✅ Edit scheduled test details
- ✅ Delete scheduled tests
- ✅ Auto-generate test numbers

#### Active Tests
- ✅ Mark tests as collected
- ✅ Send to lab status
- ✅ Results pending tracking
- ✅ Complete tests with results

#### Completed Tests
- ✅ View all completed tests
- ✅ Filter by status
- ✅ Edit test results
- ✅ View detailed test information
- ✅ Export test data

### 4. CRUD Operations
- ✅ Create: Schedule new tests
- ✅ Read: View test details and lists
- ✅ Update: Edit test information and results
- ✅ Delete: Remove tests with confirmation

### 5. Reports & Analytics

#### Dashboard Metrics
- ✅ Total tests conducted
- ✅ Positive rate tracking
- ✅ Compliance rate monitoring
- ✅ Active programs count

#### Test Distribution
- ✅ By test type (drug/alcohol/hydration)
- ✅ By specimen type
- ✅ By testing device
- ✅ By test reason
- ✅ By location

#### Compliance Tracking
- ✅ Scheduled vs completed
- ✅ Missed tests tracking
- ✅ Program adherence
- ✅ Compliance rate calculation

#### Smart Insights
- ✅ Elevated positive rate alerts
- ✅ Excellent compliance recognition
- ✅ Low testing volume warnings
- ✅ Hydration concerns flagging

#### Export Capabilities
- ✅ CSV export
- ✅ Print-friendly reports
- ✅ Date range filtering
- ✅ Test type filtering

### 6. Audit & Accountability
- ✅ Complete edit history
- ✅ User tracking for all actions
- ✅ Original data snapshots
- ✅ Timestamp all changes
- ✅ Immutable audit trail

---

## Database Schema

### Main Tables

#### `drug_tests`
```sql
CREATE TABLE drug_tests (
  id UUID PRIMARY KEY,
  test_number VARCHAR UNIQUE,
  employee_id UUID REFERENCES employees(id),
  test_reason test_reason ENUM,
  status test_status ENUM,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time VARCHAR,
  
  -- Collection
  collection_date DATE,
  collection_time VARCHAR,
  collection_site VARCHAR,
  collector_name VARCHAR,
  
  -- Specimen
  specimen_type specimen_type ENUM,
  testing_device testing_device ENUM,
  chain_of_custody BOOLEAN,
  
  -- Results (Individual Panels)
  coc_result test_result ENUM,  -- Cocaine
  opi_result test_result ENUM,  -- Opioids
  thc_result test_result ENUM,  -- Cannabis
  amp_result test_result ENUM,  -- Amphetamines
  met_result test_result ENUM,  -- Methamphetamines
  bzo_result test_result ENUM,  -- Benzodiazepines
  
  -- Overall Result
  drug_result test_result ENUM,
  substances_detected TEXT,      -- JSON array
  
  -- MRO Review
  mro_review BOOLEAN,
  mro_name VARCHAR,
  mro_notes TEXT,
  
  -- Lab Details
  testing_lab VARCHAR,
  lab_results JSONB,
  result_date DATE,
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `alcohol_tests`
```sql
CREATE TABLE alcohol_tests (
  id UUID PRIMARY KEY,
  test_number VARCHAR UNIQUE,
  employee_id UUID REFERENCES employees(id),
  test_reason test_reason ENUM,
  status test_status ENUM,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time VARCHAR,
  
  -- Testing
  test_date DATE,
  test_time VARCHAR,
  test_location VARCHAR,
  tester_name VARCHAR,
  
  -- Device & Method
  testing_device testing_device ENUM,
  device_serial_number VARCHAR,
  
  -- Results
  alcohol_result test_result ENUM,
  alcohol_level VARCHAR,           -- BAC as decimal
  breathalyzer_reading VARCHAR,
  
  -- Observation
  observation_period INTEGER,
  confirmation_test BOOLEAN,
  
  -- Lab Results (if escalated)
  lab_result test_result ENUM,
  lab_alcohol_level VARCHAR,
  
  -- Actions
  disciplinary_action TEXT,
  follow_up_required BOOLEAN,
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `hydration_tests`
```sql
CREATE TABLE hydration_tests (
  id UUID PRIMARY KEY,
  test_number VARCHAR UNIQUE,
  employee_id UUID REFERENCES employees(id),
  test_reason hydration_test_reason ENUM,
  status test_status ENUM,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time VARCHAR,
  
  -- Testing
  test_date DATE,
  test_time VARCHAR,
  test_location VARCHAR,  -- underground/surface/medical_station
  tested_by UUID,
  
  -- Test Type & Method
  test_type VARCHAR,  -- urine_specific_gravity, urine_color, etc.
  testing_device VARCHAR,
  
  -- Results
  hydration_level hydration_level ENUM,
  urine_specific_gravity DECIMAL(4,3),
  urine_color urine_color ENUM,
  skin_turgor VARCHAR,
  
  -- Vital Signs
  vital_signs JSONB,
  
  -- Personnel Context
  ug_personnel BOOLEAN,
  shift_type VARCHAR,
  work_intensity work_intensity ENUM,
  ambient_temperature INTEGER,
  
  -- Environmental Factors
  environmental_conditions JSONB,
  
  -- Recommendations
  recommendations TEXT,
  recommended_action hydration_action ENUM,
  hydration_plan TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN,
  follow_up_date DATE,
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `testing_programs`
```sql
CREATE TABLE testing_programs (
  id UUID PRIMARY KEY,
  program_name VARCHAR NOT NULL,
  program_type VARCHAR,  -- random, pre_employment, etc.
  testing_frequency VARCHAR,
  pool_size INTEGER,
  
  -- Configuration
  required_tests TEXT[],  -- ['drug', 'alcohol', 'hydration']
  departments TEXT[],
  ug_personnel_focused BOOLEAN,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR,            -- 'update', 'delete', 'status_change'
  resource_type VARCHAR,      -- 'drug_test', 'alcohol_test', etc.
  resource_id UUID,
  original_data JSONB,        -- Snapshot before change
  new_data JSONB,             -- Data after change
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP
);
```

### Enums

```sql
-- Test Results
CREATE TYPE test_result AS ENUM (
  'negative',
  'positive',
  'non-negative',
  'dilute',
  'invalid',
  'pending',
  'inconclusive'
);

-- Test Status
CREATE TYPE test_status AS ENUM (
  'scheduled',
  'collected',
  'in_lab',
  'results_pending',
  'completed',
  'cancelled',
  'no_show'
);

-- Test Reasons
CREATE TYPE test_reason AS ENUM (
  'pre_employment',
  'random',
  'post_incident',
  'reasonable_suspicion',
  'return_to_duty',
  'follow_up',
  'routine_screening'
);

-- Hydration Specific
CREATE TYPE hydration_test_reason AS ENUM (
  'random',
  'post_incident',
  'on_demand',
  'heat_illness_suspected',
  'routine_check'
);

CREATE TYPE hydration_level AS ENUM (
  'adequate',
  'mild_dehydration',
  'moderate_dehydration',
  'severe_dehydration'
);

CREATE TYPE hydration_action AS ENUM (
  'continue_work',
  'rest_hydrate',
  'medical_evaluation',
  'immediate_treatment'
);

-- Specimen Types
CREATE TYPE specimen_type AS ENUM (
  'urine',
  'saliva',
  'blood',
  'hair'
);

-- Testing Devices
CREATE TYPE testing_device AS ENUM (
  'drugcheck_3000',
  'breathalyzer',
  'comprehensive_lab',
  'field_test',
  'instant_test'
);
```

---

## API Documentation

### Base URL
```
http://localhost:17009/api
```

### Authentication
All endpoints require authentication via session cookies.

---

### Drug Tests

#### `GET /api/drug-tests`
Get all drug tests for the authenticated user's tenant.

**Response:**
```json
[
  {
    "id": "uuid",
    "testNumber": "DT-2025-123456",
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "employeeNumber": "EMP001",
    "testReason": "random",
    "status": "completed",
    "scheduledDate": "2025-01-15",
    "scheduledTime": "09:00",
    "collectionDate": "2025-01-15",
    "collectionTime": "09:15",
    "specimenType": "urine",
    "testingDevice": "drugcheck_3000",
    "drugResult": "negative",
    "cocResult": "negative",
    "opiResult": "negative",
    "thcResult": "negative",
    "ampResult": "negative",
    "metResult": "negative",
    "bzoResult": "negative",
    "chainOfCustody": true,
    "notes": "Routine random test",
    "createdAt": "2025-01-10T08:00:00Z"
  }
]
```

#### `GET /api/drug-tests/:id`
Get a single drug test by ID.

**Response:**
```json
{
  "id": "uuid",
  "testNumber": "DT-2025-123456",
  // ... full test details
}
```

#### `POST /api/drug-tests`
Create a new drug test (schedule or record result).

**Request Body:**
```json
{
  "employeeId": "uuid",
  "testReason": "random",
  "status": "scheduled",
  "scheduledDate": "2025-01-20",
  "scheduledTime": "10:00",
  "specimenType": "urine",
  "testingDevice": "drugcheck_3000",
  "collectionSite": "Main Medical Center",
  "collectorName": "Jane Smith",
  "chainOfCustody": true,
  "notes": "Random selection - Q1 2025"
}
```

**Response:**
```json
{
  "id": "uuid",
  "testNumber": "DT-2025-789012",
  // ... created test details
}
```

#### `PATCH /api/drug-tests/:id`
Update an existing drug test.

**Request Body:**
```json
{
  "status": "completed",
  "collectionDate": "2025-01-20",
  "collectionTime": "10:15",
  "drugResult": "negative",
  "cocResult": "negative",
  "opiResult": "negative",
  "thcResult": "negative",
  "ampResult": "negative",
  "metResult": "negative",
  "bzoResult": "negative"
}
```

**Response:**
```json
{
  "id": "uuid",
  // ... updated test details
}
```

**Audit Logging:**
All updates are automatically logged to the audit_logs table with:
- User ID
- Original data snapshot
- Updated fields
- Timestamp

#### `DELETE /api/drug-tests/:id`
Delete a drug test.

**Response:**
```json
{
  "message": "Drug test deleted successfully"
}
```

---

### Alcohol Tests

#### `GET /api/alcohol-tests`
Get all alcohol tests.

**Response:**
```json
[
  {
    "id": "uuid",
    "testNumber": "AT-2025-123456",
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "testReason": "random",
    "status": "completed",
    "testDate": "2025-01-15",
    "testTime": "14:00",
    "testingDevice": "breathalyzer",
    "alcoholLevel": "0.00",
    "breathalyzerReading": "0.000",
    "testResult": "negative",
    "observationPeriod": 15,
    "confirmationTest": false,
    "notes": "Pre-shift screening",
    "createdAt": "2025-01-15T14:00:00Z"
  }
]
```

#### `POST /api/alcohol-tests`
Create a new alcohol test.

#### `PATCH /api/alcohol-tests/:id`
Update an alcohol test (with audit logging).

#### `DELETE /api/alcohol-tests/:id`
Delete an alcohol test.

---

### Hydration Tests

#### `GET /api/hydration-tests`
Get all hydration tests.

**Response:**
```json
[
  {
    "id": "uuid",
    "testNumber": "HT-2025-123456",
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "testReason": "routine_check",
    "status": "completed",
    "testDate": "2025-01-15",
    "testTime": "11:00",
    "testLocation": "underground",
    "testType": "urine_specific_gravity",
    "urineSpecificGravity": 1.020,
    "hydrationLevel": "adequate",
    "recommendedAction": "continue_work",
    "ugPersonnel": true,
    "ambientTemperature": 32,
    "notes": "Underground shift - regular monitoring",
    "createdAt": "2025-01-15T11:00:00Z"
  }
]
```

#### `POST /api/hydration-tests`
Create a new hydration test.

#### `PATCH /api/hydration-tests/:id`
Update a hydration test (with audit logging).

#### `DELETE /api/hydration-tests/:id`
Delete a hydration test.

---

### Testing Programs

#### `GET /api/testing-programs`
Get all testing programs.

**Response:**
```json
[
  {
    "id": "uuid",
    "programName": "Monthly Random D&A Testing",
    "programType": "random",
    "testingFrequency": "monthly",
    "poolSize": 50,
    "requiredTests": ["drug", "alcohol"],
    "departments": ["extraction", "processing"],
    "ugPersonnelFocused": true,
    "active": true,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

#### `POST /api/testing-programs`
Create a new testing program.

**Request Body:**
```json
{
  "programName": "Pre-Employment Screening",
  "programType": "pre_employment",
  "testingFrequency": "once",
  "poolSize": 0,
  "requiredTests": ["drug", "alcohol", "hydration"],
  "departments": [],
  "ugPersonnelFocused": false,
  "active": true
}
```

#### `PUT /api/testing-programs/:id`
Update a testing program.

#### `DELETE /api/testing-programs/:id`
Delete a testing program.

---

### Analytics

#### `GET /api/testing/analytics`
Get comprehensive testing analytics.

**Response:**
```json
{
  "drugTests": {
    "total": 245,
    "positive": 3,
    "negative": 235,
    "pending": 7,
    "byType": {
      "urine": 230,
      "saliva": 15
    },
    "byReason": {
      "random": 200,
      "post_incident": 15,
      "pre_employment": 30
    }
  },
  "alcoholTests": {
    "total": 180,
    "positive": 1,
    "negative": 175,
    "pending": 4,
    "byType": {
      "breathalyzer": 178,
      "blood": 2
    },
    "byReason": {
      "random": 150,
      "reasonable_suspicion": 5,
      "routine_screening": 25
    }
  },
  "hydrationTests": {
    "total": 420,
    "adequate": 380,
    "dehydrated": 40,
    "pending": 0
  },
  "compliance": {
    "scheduledTests": 500,
    "completedTests": 485,
    "missedTests": 15,
    "complianceRate": 97.0
  },
  "trends": {
    "monthlyTests": [
      {"month": "Jan", "drug": 50, "alcohol": 40, "hydration": 100},
      {"month": "Feb", "drug": 55, "alcohol": 38, "hydration": 95}
    ],
    "positiveRateTrend": [
      {"month": "Jan", "rate": 1.2},
      {"month": "Feb", "rate": 0.8}
    ]
  }
}
```

---

## User Flows

### Flow 1: Schedule a Drug Test

```
1. Navigate to Testing Dashboard (/testing)
2. Click "Schedule Tests" button
3. Select "Schedule Drug Test" tab
4. Fill in form:
   - Select Employee
   - Select Testing Program
   - Choose Test Reason
   - Set Scheduled Date & Time
   - Enter Collection Site
   - Enter Collector Name
   - Select Specimen Type (default: urine)
   - Select Testing Device (default: drugcheck_3000)
   - Add Notes (optional)
5. Click "Schedule Drug Test"
6. Test appears in "Scheduled Tests" tab
7. System generates unique Test Number (e.g., DT-2025-123456)
```

### Flow 2: Record Quick Test Result

```
1. Navigate to Testing Dashboard (/testing)
2. Click "Record Test Results" button
3. Select test type (Drug/Alcohol/Hydration)
4. Fill in form:
   - Select Employee
   - Enter Test Date & Time
   - Enter Test Location
   - Enter Witness/Tester Name
   - Select Testing Device
5. Enter Test Results:
   - For Drug: Individual panel results + Overall result
   - For Alcohol: BAC level + Overall result
   - For Hydration: Specific gravity + Hydration level
6. Add Conclusion & Notes
7. Click "Submit Test Result"
8. Test appears in "Completed Tests" tab
```

### Flow 3: Edit Scheduled Test

```
1. Navigate to Testing Dashboard (/testing)
2. Go to "Scheduled Tests" tab
3. Find test in table
4. Click Edit button (pencil icon)
5. Modal opens with prepopulated data
6. Modify fields:
   - Scheduled Date/Time
   - Collection Site
   - Specimen Type
   - Notes
7. Click "Save Changes"
8. Audit log records:
   - User who made edit
   - Original values
   - New values
   - Timestamp
```

### Flow 4: Complete a Scheduled Test

```
1. Navigate to "Scheduled Tests" tab
2. Find scheduled test
3. Click Edit button
4. Change Status to "Collected" or "Completed"
5. If "Completed":
   - Date field changes to "Collection Date"
   - Result fields appear
   - Enter individual panel results
   - Enter overall result
6. Click "Save Changes"
7. Test moves to "Completed Tests" tab
```

### Flow 5: Generate Compliance Report

```
1. Navigate to Testing Reports (/testing/reports)
2. Set Date Range:
   - Last 7 days
   - Last 30 days
   - Last 3 months
   - Custom range
3. Select Test Type Filter:
   - All Tests
   - Drug Tests Only
   - Alcohol Tests Only
   - Hydration Tests Only
4. Select Report Type:
   - Summary Report
   - Detailed Report
   - Compliance Report
5. View Dashboard Metrics:
   - Total Tests
   - Positive Rate
   - Compliance Rate
   - Active Programs
6. Navigate through tabs:
   - Overview
   - Drug Tests
   - Alcohol Tests
   - Hydration Tests
   - Compliance
7. Review Smart Insights:
   - Elevated Positive Rate warnings
   - Excellent Compliance recognition
   - Low Testing Volume alerts
   - Hydration Concerns
8. Export Data:
   - Click "Export CSV" for data
   - Click "Print Report" for PDF
```

### Flow 6: Manage Testing Programs

```
1. Navigate to Testing Dashboard (/testing)
2. Go to "Programs" tab
3. View Active Programs list
4. To Create New Program:
   - Click "New Program" button
   - Enter Program Name
   - Select Program Type (random/pre-employment/etc.)
   - Set Testing Frequency
   - Configure Pool Size
   - Select Required Tests
   - Choose Target Departments
   - Toggle Underground Personnel Focus
   - Click "Create Program"
5. To Edit Program:
   - Click Edit button on program card
   - Modify details
   - Click "Save Changes"
6. To Activate/Deactivate:
   - Toggle Active switch
   - Confirmation dialog
   - Status updates immediately
7. To Delete Program:
   - Click Delete button
   - Confirm deletion
   - Program removed from list
```

---

## UI Components

### Main Dashboard (`DrugAlcoholTesting.tsx`)

**Tabs:**
1. **Overview** - Key metrics and statistics
2. **Performed Tests** - Completed tests with results
3. **Scheduled Tests** - Upcoming tests
4. **Programs** - Testing program management
5. **Equipment** - Device tracking (future)

**Features:**
- Responsive design (mobile-friendly)
- Tab navigation
- Data tables with sorting
- Edit/Delete actions
- Status badges
- Real-time updates via React Query

### Test Result Form (`TestResultForm.tsx`)

**Features:**
- Quick result entry
- Auto-save functionality
- Field validation
- Employee search/select
- Date/time pickers
- Individual panel results
- Overall result calculation
- Notes section

### Test Scheduling (`TestScheduling.tsx`)

**Features:**
- Multi-test type support
- Calendar date picker
- Time selection
- Program association
- Specimen type selection
- Device selection
- Notes field
- Validation & error handling

### Reports Page (`TestingReports.tsx`)

**Features:**
- Date range filters
- Test type filters
- Report type selector
- Key metrics cards
- Interactive charts
- Tabbed analytics
- Smart insights
- Export functionality
- Print-friendly layout

---

## Testing Programs

### Types of Programs

1. **Random Testing**
   - Monthly/Quarterly schedules
   - Pool-based selection
   - Department targeting
   - Underground focus option

2. **Pre-Employment**
   - New hire screening
   - Comprehensive testing
   - Baseline establishment

3. **Post-Incident**
   - Triggered by safety events
   - Immediate testing
   - All involved personnel

4. **Reasonable Suspicion**
   - Manager-initiated
   - Documentation required
   - Priority processing

5. **Return-to-Duty**
   - Post-leave testing
   - Recovery verification
   - Clearance requirement

6. **Follow-Up**
   - Previous positive result
   - Rehabilitation monitoring
   - Scheduled intervals

### Program Configuration

**Parameters:**
- Program Name
- Type (random/pre-employment/etc.)
- Testing Frequency
- Pool Size
- Required Tests (drug/alcohol/hydration)
- Target Departments
- Underground Personnel Focus
- Active Status

---

## Reports & Analytics

### Available Reports

1. **Summary Report**
   - High-level overview
   - Key metrics
   - Trend indicators
   - Executive summary

2. **Detailed Report**
   - Individual test results
   - Panel-level details
   - Complete history
   - Full audit trail

3. **Compliance Report**
   - Scheduled vs completed
   - Program adherence
   - Missed tests
   - Regulatory compliance

### Key Metrics

**Test Volume:**
- Total tests conducted
- By type (drug/alcohol/hydration)
- By period (daily/weekly/monthly)

**Test Results:**
- Positive rate percentage
- Negative count
- Pending results
- Invalid/inconclusive tests

**Compliance:**
- Completion rate
- Missed appointments
- No-show rate
- Program adherence

**Distribution:**
- By test reason
- By department
- By specimen type
- By testing device
- By location

### Smart Insights

**Elevated Positive Rate:**
- Triggers when >5%
- Red alert banner
- Recommendations provided
- Action items suggested

**Excellent Compliance:**
- Triggers when ≥90%
- Green success banner
- Recognition message
- Maintenance tips

**Low Testing Volume:**
- Triggers when <10 tests
- Yellow warning banner
- Increase recommendations
- Compliance risk alert

**Hydration Concerns:**
- Triggers when >30% dehydrated
- Orange concern banner
- Environmental review
- Policy recommendations

---

## Compliance & Audit

### Audit Logging

**What is Logged:**
- All test edits
- Status changes
- Result updates
- Program modifications
- Deletions

**Audit Record Contains:**
- User ID & name
- Action type
- Resource type & ID
- Original data (full snapshot)
- New data (changed values)
- Timestamp
- IP address (optional)
- User agent (optional)

**Retention:**
- Permanent storage
- Regulatory compliance
- Investigation support
- Performance reviews

### Data Integrity

**Immutable Records:**
- Test numbers
- Creation timestamps
- Original results (audit log)

**Versioning:**
- Complete edit history
- Previous values preserved
- Chain of custody maintained

**Access Control:**
- Role-based permissions
- Audit log review restrictions
- Sensitive data protection

---

## Security Considerations

### Authentication
- Session-based auth
- Secure cookies
- CSRF protection
- Session timeout

### Authorization
- Role-based access
- Tenant isolation
- Resource ownership
- Admin privileges

### Data Protection
- Encrypted at rest
- SSL/TLS in transit
- Sanitized inputs
- SQL injection prevention
- XSS protection

### Privacy
- Employee data protection
- Medical information security
- Access logging
- Right to access/correction
- Data retention policies

---

## Troubleshooting

### Common Issues

**Issue: Tests not appearing**
```
Solution:
1. Check authentication status
2. Verify tenant ID matches
3. Confirm database connection
4. Check browser console for errors
5. Clear React Query cache
```

**Issue: Edit modal not prepopulating**
```
Solution:
1. Verify test ID is correct
2. Check API response format
3. Ensure all fields exist in database
4. Review date format compatibility
5. Check for null/undefined values
```

**Issue: Enum validation errors**
```
Solution:
1. Verify enum values match database
2. Check Zod schema definitions
3. Review frontend dropdown options
4. Confirm database migrations ran
5. Check for typos in enum values
```

**Issue: Date display shows "N/A"**
```
Solution:
1. Confirm date is formatted as 'YYYY-MM-DD'
2. Check SQL query uses to_char()
3. Verify timezone handling
4. Review date parsing in frontend
5. Check for null date values
```

**Issue: Reports page crashes**
```
Solution:
1. Add null safety checks (analytics?.compliance?.property)
2. Verify all analytics endpoints return data
3. Check date range validation
4. Review filter logic
5. Add fallback values for undefined data
```

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'testing:*');
```

### Support Contacts

**Technical Support:**
- Email: support@mineaid.com
- Phone: 1-800-MINEAID
- Hours: 24/7

**Regulatory Compliance:**
- Email: compliance@mineaid.com
- Documentation: /docs/compliance

---

## Version History

**v2.5.0** (October 2025) - Current
- ✨ Added Reports & Analytics module
- ✨ Implemented comprehensive audit logging
- ✨ Added "non-negative" test result option
- ✨ Completed alcohol & hydration test scheduling
- ✅ Fixed enum validation issues
- ✅ Added status filters to completed tests
- ✅ Improved date handling and display
- ✅ Enhanced null safety across all components
- ✅ Complete CRUD operations with edit modals
- ✅ CSV export and print functionality

**v2.4.0** (January 2025)
- 🚀 Super Admin system with tenant plan management
- 🔐 Enhanced authentication and security
- 📧 Professional email integration
- 🎨 UI/UX improvements across all modules

---

## Future Enhancements

### Planned Features

**Phase 2:**
- [ ] Equipment calibration tracking
- [ ] Automated test scheduling
- [ ] SMS/Email notifications
- [ ] Mobile app for field testing
- [ ] Barcode scanning integration
- [ ] Advanced analytics dashboards

**Phase 3:**
- [ ] AI-powered risk prediction
- [ ] Trend analysis & forecasting
- [ ] Integration with payroll systems
- [ ] Multi-language support
- [ ] Offline mode capability

**Phase 4:**
- [ ] Lab integration APIs
- [ ] Third-party device connectivity
- [ ] Automated regulatory reporting
- [ ] Advanced workflow automation

---

## Conclusion

The Drug, Alcohol & Hydration Testing Module is a comprehensive, production-ready solution for managing substance testing in mining operations. With full CRUD capabilities, robust audit logging, detailed analytics, and compliance tracking, it provides everything needed for safe, efficient, and compliant testing operations.

For questions, support, or feature requests, please contact the development team or refer to the API documentation.

**Stay Safe. Stay Compliant. Stay Productive.**

---

*Document maintained by: MineAid Development Team*  
*Last Review: October 2025*  
*Next Review: January 2026*
