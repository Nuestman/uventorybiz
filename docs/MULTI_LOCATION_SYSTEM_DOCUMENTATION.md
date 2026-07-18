# Multi-Location Care Sites System - Comprehensive Documentation

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Module Status:** Design Complete - Implementation Pending 🔄

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Design Rationale](#design-rationale)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [User Flows](#user-flows)
7. [UI Components](#ui-components)
8. [Admin Guide](#admin-guide)
9. [User Guide](#user-guide)
10. [Session Management](#session-management)
11. [Security Considerations](#security-considerations)
12. [Implementation Guide](#implementation-guide)
13. [Edge Cases & Troubleshooting](#edge-cases--troubleshooting)

---

## Overview

### Purpose
The Multi-Location Care Sites System enables mining sites with multiple emergency care locations or mini-clinics to efficiently manage medical operations across distributed facilities. This system provides session-based location binding, ensuring accurate tracking of where medical services are provided while maintaining flexibility for mobile medical personnel.

### Key Capabilities
- **Location Management** - CRUD operations for emergency care locations
- **Session-Based Binding** - Location selection at login for accurate tracking
- **Automatic Location Tagging** - All medical actions inherit session location
- **Single-Location Mode** - Seamless operation for sites with one location
- **Admin Controls** - Centralized location management and reporting
- **Cross-Location Reporting** - Admin ability to view data across all locations
- **Location-Specific Analytics** - Performance metrics per care site

### Business Problem Solved
Large mining sites often have multiple care facilities located near different working areas (main clinic, shaft-3 clinic, processing plant medical station, etc.). Medical personnel move between these locations on different shifts, but need to accurately document WHERE each medical service was provided for:
- **Regulatory compliance** - Audit trails showing service location
- **Resource allocation** - Understanding usage patterns per location
- **Operational planning** - Staffing and supply distribution
- **Emergency response** - Knowing which facilities handled incidents

### Key Innovation
Unlike traditional systems that:
- ❌ Require selecting location on every form (user error prone)
- ❌ Bind users to fixed locations (inflexible)
- ❌ Don't support location tracking at all

This system:
- ✅ Uses session-based location binding (select once per shift)
- ✅ Automatically tags all actions with session location
- ✅ Eliminates repetitive location selection
- ✅ Maintains accountability and audit trails
- ✅ Invisible to single-location tenants

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
- Session-based authentication
- Middleware for automatic location injection

### Module Structure

```
client/src/
├── components/
│   ├── LocationSelectionModal.tsx    # Post-login location selector
│   ├── LocationBadge.tsx              # Header location indicator
│   ├── LocationSwitcher.tsx           # Quick location change
│   └── admin/
│       └── CareLocationsManager.tsx   # Admin location management
├── pages/
│   └── admin/
│       └── CareLocations.tsx          # Location CRUD interface
├── hooks/
│   ├── useActiveLocation.ts           # Location context hook
│   └── useLocationRequired.ts         # Validation hook

server/
├── routes.ts                          # API endpoints for locations
├── middleware/
│   ├── requireLocation.ts             # Location enforcement
│   └── injectLocation.ts              # Auto-add location to writes
├── storage.ts                         # Location database operations
└── schema.ts                          # care_locations table definition
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Login                            │
│                           ↓                                  │
│                  Authentication Success                       │
│                           ↓                                  │
│           ┌───────────────────────────────┐                 │
│           │ tenant.hasMultipleLocations?  │                 │
│           └───────────┬───────────────────┘                 │
│                       │                                      │
│           ┌───────────┴────────────┐                        │
│           │                        │                        │
│         YES                       NO                        │
│           │                        │                        │
│           ↓                        ↓                        │
│  ┌──────────────────┐    ┌──────────────────┐             │
│  │ Show Location    │    │ Auto-select      │             │
│  │ Selection Modal  │    │ Primary Location │             │
│  └────────┬─────────┘    └────────┬─────────┘             │
│           │                        │                        │
│           └────────────┬───────────┘                        │
│                        ↓                                    │
│            Store location in session                        │
│            {activeLocationId, locationName}                 │
│                        ↓                                    │
│                  Dashboard/App                              │
│                        ↓                                    │
│    ┌──────────────────────────────────────┐               │
│    │  Header: "📍 Working at: Clinic X"   │               │
│    └──────────────────────────────────────┘               │
│                        ↓                                    │
│         All medical actions auto-tagged                     │
│         with req.activeLocation                            │
│                        ↓                                    │
│              Medical Visits, Incidents,                     │
│         Appointments, Tests → locationId                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Rationale

### Approach Comparison

We evaluated three approaches before selecting the session-based model:

#### ❌ Approach 1: Form-Level Location Selection
```typescript
// Every form has location dropdown
<Select name="locationId">
  <SelectItem value="loc1">Main Clinic</SelectItem>
  <SelectItem value="loc2">Shaft-3 Clinic</SelectItem>
</Select>
```

**Rejected Because:**
- Repetitive (select on every single form)
- Error-prone (easy to select wrong location)
- Poor UX (cognitive load on busy staff)
- Doesn't match physical reality (staff IS at one location during shift)

#### ❌ Approach 2: User-Account Location Binding
```typescript
// User table has fixed locationId
user.primaryLocationId = "loc-123"
```

**Rejected Because:**
- Inflexible (same user can't work different locations different days)
- Complex auth changes required
- Difficult to handle temporary assignments
- Requires location switching mechanism in user profile

#### ✅ Approach 3: Session-Based Location Binding (SELECTED)
```typescript
// Session stores current working location
session.activeLocationId = "loc-123"
// All actions automatically inherit this
```

**Selected Because:**
- ✅ Matches reality: Staff physically works at ONE location per shift
- ✅ Simple UX: Select once at login, automatic thereafter
- ✅ Flexible: Same user works different locations different days
- ✅ No auth changes: Pure session management
- ✅ Better accuracy: Eliminates user error
- ✅ Clear accountability: "Where were you working when X happened?"
- ✅ Natural workflow: Location selection = "checking in" for shift

### Physical Reality Modeling

**Mining Site Operations:**
```
Morning Briefing → Assign personnel to locations
↓
Medical Staff A → Shaft-3 Clinic (8am-4pm)
Medical Staff B → Main Hospital (8am-4pm)
Medical Staff C → Processing Plant Station (8am-4pm)
↓
Staff logs into system at their assigned location
↓
All work during shift tied to that location
↓
End of shift → Logout → Location cleared
```

**System Design Mirrors This:**
```
Login → Select Location → Work → Logout
         ↓                 ↓
    "Checking In"    All actions tagged
    at Location      with location
```

---

## Database Schema

### New Table: care_locations

```sql
CREATE TABLE care_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location identification
  location_name VARCHAR NOT NULL,              -- "Main Medical Center"
  location_code VARCHAR NOT NULL,               -- "MAIN" or "SH3" (short code)
  description TEXT,                             -- Additional details
  
  -- Contact information
  address TEXT,                                 -- Physical address
  contact_phone VARCHAR,                        -- Direct line
  contact_email VARCHAR,                        -- Location email
  
  -- Geographic coordinates (optional)
  latitude VARCHAR,                             -- For mapping
  longitude VARCHAR,                            -- For mapping
  
  -- Location status
  is_primary BOOLEAN DEFAULT false,             -- One primary per tenant
  status VARCHAR NOT NULL DEFAULT 'active',     -- active, inactive, maintenance
  
  -- Capacity and operations
  capacity INTEGER,                             -- Beds/treatment stations
  operating_hours TEXT,                         -- JSON: {"monday": "08:00-17:00"}
  staff_count INTEGER DEFAULT 0,               -- Assigned personnel
  
  -- Equipment and capabilities
  capabilities TEXT,                            -- JSON: ["emergency", "testing", "surgery"]
  equipment_list TEXT,                          -- JSON: Available equipment
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_location_code_per_tenant UNIQUE (tenant_id, location_code),
  CONSTRAINT unique_location_name_per_tenant UNIQUE (tenant_id, location_name),
  CONSTRAINT one_primary_per_tenant CHECK (
    -- Only one is_primary=true per tenant (enforced via partial index)
  )
);

-- Indexes
CREATE INDEX idx_care_locations_tenant ON care_locations(tenant_id);
CREATE INDEX idx_care_locations_status ON care_locations(status);
CREATE UNIQUE INDEX idx_one_primary_per_tenant 
  ON care_locations(tenant_id) 
  WHERE is_primary = true;
```

### Modified Table: tenants

```sql
ALTER TABLE tenants 
ADD COLUMN has_multiple_locations BOOLEAN DEFAULT false;

-- Description: Feature flag to enable/disable location system per tenant
-- true = Show location selection modal and features
-- false = Hidden, auto-select primary location silently
```

### Modified Table: user_sessions

```sql
ALTER TABLE user_sessions 
ADD COLUMN active_location_id UUID REFERENCES care_locations(id),
ADD COLUMN active_location_name VARCHAR;

-- Description: Current working location for this session
-- Set during post-login location selection
-- Used by middleware to auto-inject location into operations
```

### Modified Operational Tables

```sql
-- Add location_id to all operational tables

ALTER TABLE medical_visits 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

ALTER TABLE incident_reports 
ADD COLUMN location_id UUID REFERENCES care_locations(id);
-- Note: incident_location = WHERE incident occurred
--       location_id = WHERE patient was treated

ALTER TABLE appointments 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

ALTER TABLE drug_tests 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

ALTER TABLE alcohol_tests 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

ALTER TABLE hydration_tests 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

ALTER TABLE duty_assignments 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

-- Optional: Location-specific inventory
ALTER TABLE medical_inventory 
ADD COLUMN location_id UUID REFERENCES care_locations(id);

-- All location_id columns are NULLABLE for:
-- 1. Backward compatibility with existing data
-- 2. Support for single-location tenants
-- 3. Admin actions not tied to specific location
```

### TypeScript Schema (Drizzle ORM)

```typescript
// shared/schema.ts

export const careLocations = pgTable("care_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Location details
  locationName: varchar("location_name").notNull(),
  locationCode: varchar("location_code").notNull(),
  description: text("description"),
  
  // Contact
  address: text("address"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  
  // Coordinates
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  
  // Status
  isPrimary: boolean("is_primary").default(false),
  status: varchar("status").notNull().default("active"),
  
  // Operations
  capacity: integer("capacity"),
  operatingHours: text("operating_hours"),
  staffCount: integer("staff_count").default(0),
  
  // Capabilities
  capabilities: text("capabilities"),
  equipmentList: text("equipment_list"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueLocationCodePerTenant: unique().on(table.tenantId, table.locationCode),
  uniqueLocationNamePerTenant: unique().on(table.tenantId, table.locationName),
}));

// Relations
export const careLocationsRelations = relations(careLocations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [careLocations.tenantId],
    references: [tenants.id],
  }),
  medicalVisits: many(medicalVisits),
  incidents: many(incidentReports),
  appointments: many(appointments),
  drugTests: many(drugTests),
  alcoholTests: many(alcoholTests),
  hydrationTests: many(hydrationTests),
}));

// Insert schema
export const insertCareLocationSchema = createInsertSchema(careLocations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type CareLocation = typeof careLocations.$inferSelect;
export type InsertCareLocation = z.infer<typeof insertCareLocationSchema>;
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

### Care Locations Management

#### `GET /api/care-locations`
Get all care locations for the authenticated user's tenant.

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `inactive`, `maintenance`
- `includeInactive` (optional) - Include inactive locations (default: false)

**Response:**
```json
[
  {
    "id": "loc-uuid-123",
    "tenantId": "tenant-uuid-456",
    "locationName": "Main Medical Center",
    "locationCode": "MAIN",
    "description": "Primary emergency care facility",
    "address": "Mining Site - Central Area, Block A",
    "contactPhone": "+1-555-0100",
    "contactEmail": "main-clinic@minesite.com",
    "latitude": "-26.1234",
    "longitude": "28.5678",
    "isPrimary": true,
    "status": "active",
    "capacity": 10,
    "operatingHours": "{\"monday\":\"24/7\",\"tuesday\":\"24/7\"}",
    "staffCount": 5,
    "capabilities": "[\"emergency\",\"surgery\",\"testing\",\"pharmacy\"]",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": "loc-uuid-789",
    "locationName": "Shaft-3 Emergency Station",
    "locationCode": "SH3",
    "description": "Underground emergency response point",
    "isPrimary": false,
    "status": "active",
    "capacity": 3,
    "operatingHours": "{\"monday\":\"06:00-18:00\"}",
    "staffCount": 2
  }
]
```

#### `GET /api/care-locations/:id`
Get a specific care location by ID.

**Response:**
```json
{
  "id": "loc-uuid-123",
  "locationName": "Main Medical Center",
  // ... full location details
}
```

#### `GET /api/care-locations/primary`
Get the primary location for the tenant.

**Response:**
```json
{
  "id": "loc-uuid-123",
  "locationName": "Main Medical Center",
  "isPrimary": true,
  // ... location details
}
```

#### `POST /api/care-locations`
Create a new care location. **(Admin only)**

**Request Body:**
```json
{
  "locationName": "Processing Plant Medical Station",
  "locationCode": "PROC",
  "description": "Medical station at processing facility",
  "address": "Processing Plant - Building 5",
  "contactPhone": "+1-555-0200",
  "contactEmail": "processing-clinic@minesite.com",
  "latitude": "-26.1345",
  "longitude": "28.5789",
  "isPrimary": false,
  "status": "active",
  "capacity": 5,
  "operatingHours": "{\"monday\":\"08:00-17:00\",\"tuesday\":\"08:00-17:00\"}",
  "capabilities": "[\"first_aid\",\"testing\",\"emergency\"]"
}
```

**Response:**
```json
{
  "id": "loc-uuid-new",
  "locationName": "Processing Plant Medical Station",
  "locationCode": "PROC",
  // ... created location details
}
```

**Validation Rules:**
- `locationName` - Required, unique per tenant
- `locationCode` - Required, unique per tenant, 2-10 characters
- `isPrimary` - If true, unset previous primary location
- `status` - Must be one of: `active`, `inactive`, `maintenance`

#### `PUT /api/care-locations/:id`
Update a care location. **(Admin only)**

**Request Body:**
```json
{
  "locationName": "Main Medical Center (Renovated)",
  "capacity": 15,
  "operatingHours": "{\"monday\":\"24/7\"}",
  "status": "active"
}
```

**Response:**
```json
{
  "id": "loc-uuid-123",
  // ... updated location details
}
```

**Special Handling:**
- If `isPrimary` set to `true`, automatically unsets previous primary
- Changing `status` to `inactive` triggers validation:
  - Cannot deactivate if it's the only active location
  - Cannot deactivate primary location without designating new primary
  - Warns if personnel currently have active sessions at this location

#### `DELETE /api/care-locations/:id`
Delete a care location. **(Admin only)**

**Response:**
```json
{
  "message": "Location deleted successfully",
  "relocated_records": {
    "medical_visits": 45,
    "incidents": 12,
    "appointments": 8
  }
}
```

**Protection Rules:**
- Cannot delete primary location (must designate new primary first)
- Cannot delete if it's the only location
- Prompts to reassign existing records to another location
- Option: Hard delete (remove records) or Soft delete (mark inactive)

---

### Session Location Management

#### `POST /api/auth/select-location`
Set the active working location for current session.

**Request Body:**
```json
{
  "locationId": "loc-uuid-123",
  "reason": "Starting morning shift" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "activeLocation": {
    "id": "loc-uuid-123",
    "name": "Main Medical Center",
    "code": "MAIN"
  },
  "message": "Working location set to: Main Medical Center"
}
```

**Validation:**
- Location must belong to user's tenant
- Location must be `active` status
- User must be authenticated
- Creates audit log entry

#### `POST /api/auth/switch-location`
Change active location mid-session (emergency coverage).

**Request Body:**
```json
{
  "newLocationId": "loc-uuid-789",
  "reason": "Emergency coverage needed at Shaft-3"
}
```

**Response:**
```json
{
  "success": true,
  "previousLocation": {
    "id": "loc-uuid-123",
    "name": "Main Medical Center"
  },
  "newLocation": {
    "id": "loc-uuid-789",
    "name": "Shaft-3 Emergency Station"
  },
  "switchedAt": "2025-10-09T14:30:00Z"
}
```

**Audit Entry Created:**
```
User [Jane Smith] switched location from [Main Medical Center] 
to [Shaft-3 Emergency Station] at 14:30
Reason: Emergency coverage needed at Shaft-3
```

#### `GET /api/auth/current-session`
Get current session details including active location.

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "jane.smith@minesite.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "medical_staff"
  },
  "tenant": {
    "id": "tenant-uuid",
    "name": "Diamond Mine Site",
    "hasMultipleLocations": true
  },
  "activeLocation": {
    "id": "loc-uuid-123",
    "name": "Main Medical Center",
    "code": "MAIN"
  },
  "sessionStart": "2025-10-09T08:00:00Z"
}
```

---

### Location-Filtered Endpoints

All operational endpoints now support optional `locationId` filter:

#### `GET /api/medical-visits?locationId=loc-uuid-123`
Get medical visits filtered by location.

#### `GET /api/incidents?locationId=loc-uuid-123`
Get incident reports filtered by location.

#### `GET /api/appointments?locationId=loc-uuid-123`
Get appointments filtered by location.

**Special Parameter:**
```
?locationId=all  // Admin only - view across all locations
```

---

### Location Analytics

#### `GET /api/analytics/locations`
Get comprehensive location-based analytics. **(Admin only)**

**Query Parameters:**
- `startDate` - Start of date range
- `endDate` - End of date range
- `locationId` - Specific location or "all"

**Response:**
```json
{
  "summary": {
    "totalLocations": 4,
    "activeLocations": 3,
    "totalCapacity": 28,
    "averageUtilization": 65.5
  },
  "byLocation": [
    {
      "location": {
        "id": "loc-uuid-123",
        "name": "Main Medical Center",
        "code": "MAIN"
      },
      "metrics": {
        "medicalVisits": 234,
        "incidents": 45,
        "appointments": 189,
        "tests": {
          "drug": 67,
          "alcohol": 45,
          "hydration": 123
        },
        "utilizationRate": 85.3,
        "averageWaitTime": "15 minutes",
        "peakHours": ["09:00-11:00", "14:00-16:00"]
      }
    }
  ],
  "comparison": {
    "busiestLocation": "Main Medical Center",
    "leastBusyLocation": "Shaft-7 Station",
    "utilizationSpread": 45.2
  },
  "recommendations": [
    {
      "type": "staffing",
      "location": "Main Medical Center",
      "message": "Consider additional staffing during peak hours (09:00-11:00)",
      "priority": "medium"
    }
  ]
}
```

#### `GET /api/analytics/location-comparison`
Compare performance across locations.

**Response:**
```json
{
  "comparison": [
    {
      "metric": "Average Wait Time",
      "locations": {
        "Main Medical Center": "15 min",
        "Shaft-3 Station": "8 min",
        "Processing Plant": "12 min"
      },
      "best": "Shaft-3 Station",
      "worst": "Main Medical Center"
    },
    {
      "metric": "Patient Volume",
      "locations": {
        "Main Medical Center": 234,
        "Shaft-3 Station": 89,
        "Processing Plant": 156
      }
    }
  ]
}
```

---

## User Flows

### Flow 1: First-Time Login (Multi-Location Tenant)

```
1. User opens MineAid HMS
2. Navigates to login page
3. Enters credentials (email + password)
4. Clicks "Login"
   ↓
5. Server validates credentials
6. Authentication successful
7. Session created
   ↓
8. Check: tenant.hasMultipleLocations === true
   ↓
9. Redirect to Location Selection Modal (blocking)
   ↓
10. Modal displays:
    - Header: "Select Your Working Location"
    - Subtitle: "Where are you working today?"
    - List of active locations:
      □ 📍 Main Medical Center (MAIN) - Primary
      □ 📍 Shaft-3 Emergency Station (SH3)
      □ 📍 Processing Plant Medical (PROC)
    - "Last used: Main Medical Center" (if available)
   ↓
11. User clicks on "Shaft-3 Emergency Station"
   ↓
12. Confirmation: "Working at Shaft-3 Emergency Station?"
13. User clicks "Confirm"
   ↓
14. POST /api/auth/select-location
    {locationId: "loc-sh3", reason: "Morning shift"}
   ↓
15. Session updated:
    session.activeLocationId = "loc-sh3"
    session.activeLocationName = "Shaft-3 Emergency Station"
   ↓
16. Location stored in localStorage for next time
    localStorage.setItem('lastWorkingLocation', 'loc-sh3')
   ↓
17. Modal closes
18. Redirect to Dashboard
   ↓
19. Header shows: "📍 Shaft-3 Emergency Station"
20. All subsequent actions auto-tagged with this location
```

### Flow 2: First-Time Login (Single-Location Tenant)

```
1. User opens MineAid HMS
2. Login with credentials
3. Authentication successful
   ↓
4. Check: tenant.hasMultipleLocations === false
   ↓
5. GET /api/care-locations/primary
   ↓
6. Silently set session location to primary:
   session.activeLocationId = primary.id
   session.activeLocationName = primary.name
   ↓
7. NO modal shown
8. Direct redirect to Dashboard
   ↓
9. Header: Location badge hidden or minimal
10. User unaware of location system (seamless)
11. All actions auto-tagged with primary location
```

### Flow 3: Regular Login (Returning User)

```
1. User logs in successfully
2. System checks: tenant.hasMultipleLocations?
   ↓
3. YES → Show Location Selection Modal
   ↓
4. Modal pre-selects last used location:
   "Last time you worked at: Shaft-3 Emergency Station"
   - Quick Confirm button
   - Or select different location
   ↓
5. User clicks "Quick Confirm"
   ↓
6. Session location set
7. Proceed to Dashboard
```

### Flow 4: Recording a Medical Visit (With Location)

```
1. User at Dashboard (already has session location: "Shaft-3")
2. Clicks "New Medical Visit"
3. Medical Visit form opens
   ↓
4. Form displays:
   - Patient selection
   - Visit type
   - Chief complaint
   - Vitals
   - Assessment
   - Treatment
   - ** NO location selector field **
   ↓
5. User fills out form normally
6. Clicks "Save Medical Visit"
   ↓
7. POST /api/medical-visits
   {
     patientId: "...",
     visitType: "emergency",
     chiefComplaint: "...",
     // NO locationId in request body
   }
   ↓
8. Server middleware intercepts:
   middleware.injectLocation(req, res, next) {
     req.body.locationId = req.session.activeLocationId; // "loc-sh3"
     next();
   }
   ↓
9. Database INSERT:
   INSERT INTO medical_visits (
     ...,
     location_id,  // ← Automatically added
     ...
   ) VALUES (
     ...,
     'loc-sh3',    // ← From session
     ...
   )
   ↓
10. Success response
11. Medical visit saved with location: "Shaft-3 Emergency Station"
12. Audit log: User [Jane] created medical visit at [Shaft-3] at [10:30]
```

### Flow 5: Switching Location Mid-Shift (Emergency Coverage)

```
1. User currently at: "Main Medical Center"
2. Emergency call: "Need coverage at Shaft-3"
   ↓
3. User clicks location badge in header
4. Dropdown appears:
   Current: 📍 Main Medical Center
   ────────────────────────
   Quick Switch:
   □ Shaft-3 Emergency Station
   □ Processing Plant Medical
   ────────────────────────
   🔄 Change Location
   📊 View All Locations (admin)
   🚪 Logout
   ↓
5. User clicks "Shaft-3 Emergency Station"
   ↓
6. Warning modal:
   ⚠️ Switch Working Location?
   
   You are about to switch from:
   Main Medical Center
   
   To:
   Shaft-3 Emergency Station
   
   All future actions will be associated with the new location.
   
   Reason (optional): [Emergency coverage needed    ]
   
   [Cancel]  [Switch Location]
   ↓
7. User enters reason and clicks "Switch Location"
   ↓
8. POST /api/auth/switch-location
   {
     newLocationId: "loc-sh3",
     reason: "Emergency coverage needed"
   }
   ↓
9. Session updated:
   session.previousLocationId = "loc-main"
   session.activeLocationId = "loc-sh3"
   ↓
10. Audit log created:
    User [Jane Smith] switched location
    From: Main Medical Center
    To: Shaft-3 Emergency Station
    At: 14:30
    Reason: Emergency coverage needed
   ↓
11. Header updates: "📍 Shaft-3 Emergency Station"
12. Toast notification: "Working location changed to Shaft-3"
13. Continue working with new location
```

### Flow 6: Admin Managing Locations

```
1. Admin logs in
2. Navigates to Settings → Care Locations
   ↓
3. Care Locations Management page displays:
   
   ┌────────────────────────────────────────────┐
   │ Care Locations                [+ New Location] │
   ├────────────────────────────────────────────┤
   │                                            │
   │ 📍 Main Medical Center (MAIN)             │
   │    Primary • Active • Capacity: 10        │
   │    234 visits this month                   │
   │    [Edit] [View Analytics] [⋮]            │
   │                                            │
   │ 📍 Shaft-3 Emergency Station (SH3)        │
   │    Active • Capacity: 3                    │
   │    89 visits this month                    │
   │    [Edit] [View Analytics] [⋮]            │
   │                                            │
   │ 📍 Processing Plant Medical (PROC)        │
   │    Active • Capacity: 5                    │
   │    156 visits this month                   │
   │    [Edit] [View Analytics] [⋮]            │
   │                                            │
   │ 📍 Shaft-7 Station (SH7)                  │
   │    Inactive • Capacity: 2                  │
   │    0 visits this month                     │
   │    [Edit] [Reactivate] [⋮]                │
   │                                            │
   └────────────────────────────────────────────┘
   ↓
4. Admin clicks [+ New Location]
   ↓
5. Modal opens: "Create Care Location"
   
   Location Name: [Processing Plant - Emergency   ]
   Location Code: [PROC-EM                       ]
   Description:  [Emergency station at processing]
   
   Contact Information:
   Address:      [Processing Plant - Block C     ]
   Phone:        [+1-555-0300                    ]
   Email:        [proc-em@minesite.com          ]
   
   Operations:
   Capacity:     [3                              ]
   Status:       [Active ▼]
   Primary Location: □
   
   Operating Hours:
   Monday:    [08:00] - [17:00]  □ 24/7
   Tuesday:   [08:00] - [17:00]  □ 24/7
   ...
   
   [Cancel]  [Create Location]
   ↓
6. Admin fills form and clicks "Create Location"
   ↓
7. POST /api/care-locations
   ↓
8. Validation:
   - Location code unique? ✓
   - Location name unique? ✓
   - Valid contact info? ✓
   ↓
9. Location created
10. Success message: "Location created successfully"
11. New location appears in list
12. Audit log: Admin [John] created location [PROC-EM] at [15:45]
```

### Flow 7: Admin Viewing Cross-Location Report

```
1. Admin navigates to Reports → Location Analytics
   ↓
2. Page displays:
   
   ┌────────────────────────────────────────────┐
   │ Location Analytics                         │
   ├────────────────────────────────────────────┤
   │ Date Range: [Last 30 Days ▼]              │
   │ Location:   [All Locations ▼]             │
   │             └─ Main Medical Center         │
   │             └─ Shaft-3 Station             │
   │             └─ Processing Plant            │
   │             └─ Shaft-7 Station             │
   └────────────────────────────────────────────┘
   
   📊 Summary Metrics
   ┌─────────────┬─────────────┬─────────────┬─────────────┐
   │ Total       │ Medical     │ Incidents   │ Utilization │
   │ Locations   │ Visits      │ Reported    │ Rate        │
   ├─────────────┼─────────────┼─────────────┼─────────────┤
   │ 4           │ 479         │ 23          │ 68.5%       │
   │ Active: 3   │ +12% ↑      │ -5% ↓       │ +3.2% ↑     │
   └─────────────┴─────────────┴─────────────┴─────────────┘
   
   📈 By Location
   ┌──────────────────────────────────────────────┐
   │ Main Medical Center                     234  │
   │ ████████████████████████████████ 48.9%       │
   │ Utilization: 85% • Capacity: 10 • Staff: 5   │
   │                                               │
   │ Processing Plant Medical                156  │
   │ ████████████████████ 32.6%                   │
   │ Utilization: 62% • Capacity: 5 • Staff: 3    │
   │                                               │
   │ Shaft-3 Emergency Station               89   │
   │ ███████████ 18.6%                            │
   │ Utilization: 59% • Capacity: 3 • Staff: 2    │
   └──────────────────────────────────────────────┘
   
   💡 Insights
   • Main Medical Center is at 85% utilization - consider 
     additional staffing during peak hours (09:00-11:00)
   • Shaft-7 Station has been inactive for 30 days
   • Processing Plant showing increased demand (+23% vs last month)
   ↓
3. Admin clicks on "Main Medical Center" bar
   ↓
4. Detailed location view opens:
   
   📍 Main Medical Center - Detailed Analytics
   
   [Export CSV] [Print Report]
   
   Patient Volume Trend (30 days)
   [Line chart showing daily visits]
   
   Service Distribution
   - Routine Visits: 145 (62%)
   - Emergency: 45 (19%)
   - Follow-up: 32 (14%)
   - Testing: 12 (5%)
   
   Peak Hours Analysis
   Busiest: 09:00-11:00 (avg 8 patients/hour)
   Slowest: 13:00-14:00 (avg 2 patients/hour)
   
   Staff Performance
   - Avg wait time: 15 minutes
   - Avg visit duration: 25 minutes
   - Patient satisfaction: 4.2/5
   ↓
5. Admin can export or print detailed report
```

### Flow 8: User Logging Out

```
1. User clicks profile menu
2. Selects "Logout"
   ↓
3. Confirmation modal:
   "End your shift at Shaft-3 Emergency Station?"
   
   [Cancel] [Logout]
   ↓
4. User clicks "Logout"
   ↓
5. POST /api/auth/logout
   ↓
6. Server clears session:
   session.activeLocationId = null
   session.activeLocationName = null
   ↓
7. Audit log:
   User [Jane Smith] logged out
   From location: Shaft-3 Emergency Station
   Session duration: 8 hours 30 minutes
   At: 16:30
   ↓
8. Redirect to login page
9. Session cleared
10. Next login will require location selection again
```

---

## UI Components

### LocationSelectionModal.tsx

**Purpose:** Post-login location selector for multi-location tenants

**Features:**
- Blocking modal (cannot be dismissed)
- Shows all active locations
- Displays last used location at top
- "Quick Confirm" for last used location
- Location cards with details:
  - Name and code
  - Address
  - Operating hours
  - Current capacity status
- Confirmation dialog before setting
- Loading state during API call

**Component Structure:**
```tsx
<Dialog open={true} onOpenChange={false}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Select Your Working Location</DialogTitle>
      <DialogDescription>
        Where are you working today?
      </DialogDescription>
    </DialogHeader>
    
    {lastUsedLocation && (
      <Card className="border-primary">
        <CardHeader>
          <Badge>Last Used</Badge>
          <CardTitle>{lastUsedLocation.name}</CardTitle>
        </CardHeader>
        <CardFooter>
          <Button onClick={quickConfirm}>
            Quick Confirm
          </Button>
        </CardFooter>
      </Card>
    )}
    
    <div className="grid gap-4">
      {activeLocations.map(location => (
        <LocationCard
          key={location.id}
          location={location}
          onSelect={handleSelect}
        />
      ))}
    </div>
  </DialogContent>
</Dialog>
```

**Usage:**
```tsx
// In MainLayout.tsx or App.tsx
const { user, tenant } = useAuth();
const { activeLocation } = useActiveLocation();

if (user && tenant?.hasMultipleLocations && !activeLocation) {
  return <LocationSelectionModal />;
}
```

### LocationBadge.tsx

**Purpose:** Header indicator showing current working location

**Features:**
- Always visible in header (when multi-location enabled)
- Shows location code and name
- Clickable for quick actions
- Color-coded by location type
- Dropdown menu:
  - View location details
  - Switch location
  - View all locations (admin)

**Component Structure:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="flex items-center gap-2">
      <MapPin className="h-4 w-4" />
      <span className="font-medium">{locationCode}</span>
      <span className="text-muted-foreground">{locationName}</span>
      <ChevronDown className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  
  <DropdownMenuContent align="end" className="w-64">
    <DropdownMenuLabel>
      Current Location
    </DropdownMenuLabel>
    
    <DropdownMenuItem disabled>
      <MapPin className="mr-2 h-4 w-4" />
      {fullLocationName}
    </DropdownMenuItem>
    
    <DropdownMenuSeparator />
    
    <DropdownMenuLabel>Quick Switch</DropdownMenuLabel>
    {otherLocations.map(loc => (
      <DropdownMenuItem onClick={() => switchTo(loc)}>
        <Building className="mr-2 h-4 w-4" />
        {loc.name}
      </DropdownMenuItem>
    ))}
    
    <DropdownMenuSeparator />
    
    <DropdownMenuItem onClick={openSwitchModal}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Change Location...
    </DropdownMenuItem>
    
    {isAdmin && (
      <DropdownMenuItem onClick={goToLocations}>
        <Settings className="mr-2 h-4 w-4" />
        Manage Locations
      </DropdownMenuItem>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

**Placement:**
```tsx
// In Header.tsx
<header className="border-b">
  <div className="flex items-center justify-between px-6 py-4">
    <Logo />
    
    <div className="flex items-center gap-4">
      {isMultiLocation && <LocationBadge />}
      <NotificationBell />
      <UserMenu />
    </div>
  </div>
</header>
```

### LocationSwitcher.tsx

**Purpose:** Modal for changing location mid-session

**Features:**
- Shows current location
- Lists available locations
- Reason input field (optional but recommended)
- Warning about session change
- Confirmation required
- Audit trail created

**Component Structure:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Switch Working Location</DialogTitle>
      <DialogDescription>
        Change your active location for the current session
      </DialogDescription>
    </DialogHeader>
    
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Current Location</AlertTitle>
      <AlertDescription>
        You are currently working at: {currentLocation.name}
      </AlertDescription>
    </Alert>
    
    <div className="space-y-4">
      <div>
        <Label>Select New Location</Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          {locations.map(loc => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name} ({loc.code})
            </SelectItem>
          ))}
        </Select>
      </div>
      
      <div>
        <Label>Reason for Switch (Optional)</Label>
        <Textarea
          placeholder="e.g., Emergency coverage needed"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleSwitch} disabled={!selectedLocation}>
        Switch Location
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### CareLocationsManager.tsx (Admin)

**Purpose:** Admin interface for CRUD operations on care locations

**Features:**
- List view with cards/table
- Create new location
- Edit existing location
- Deactivate/activate locations
- Set primary location
- View location statistics
- Delete location (with protection)
- Search and filter

**Component Structure:**
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold">Care Locations</h1>
      <p className="text-muted-foreground">
        Manage emergency care sites and mini-clinics
      </p>
    </div>
    <Button onClick={openCreateModal}>
      <Plus className="mr-2 h-4 w-4" />
      New Location
    </Button>
  </div>
  
  <div className="flex items-center gap-4">
    <Input
      placeholder="Search locations..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectItem value="all">All Statuses</SelectItem>
      <SelectItem value="active">Active Only</SelectItem>
      <SelectItem value="inactive">Inactive Only</SelectItem>
    </Select>
  </div>
  
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {locations.map(location => (
      <Card key={location.id}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{location.name}</CardTitle>
              <CardDescription>{location.code}</CardDescription>
            </div>
            <div className="flex gap-2">
              {location.isPrimary && (
                <Badge variant="default">Primary</Badge>
              )}
              <Badge 
                variant={location.status === 'active' ? 'success' : 'secondary'}
              >
                {location.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{location.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{location.contactPhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Capacity: {location.capacity}</span>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="text-sm text-muted-foreground">
            <p>234 visits this month</p>
            <p>Utilization: 85%</p>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => editLocation(location)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => viewAnalytics(location)}
          >
            <BarChart className="h-4 w-4 mr-1" />
            Analytics
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!location.isPrimary && (
                <DropdownMenuItem onClick={() => setPrimary(location)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Primary
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => toggleStatus(location)}
              >
                <Power className="mr-2 h-4 w-4" />
                {location.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => deleteLocation(location)}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    ))}
  </div>
</div>
```

### useActiveLocation() Hook

**Purpose:** Access current session location from anywhere

**Returns:**
```typescript
{
  activeLocation: CareLocation | null;
  locationName: string | null;
  locationCode: string | null;
  isMultiLocation: boolean;
  isLoading: boolean;
  switchLocation: (locationId: string, reason?: string) => Promise<void>;
  refreshLocation: () => void;
}
```

**Usage:**
```tsx
function MedicalVisitForm() {
  const { locationName, locationCode } = useActiveLocation();
  
  return (
    <form>
      {locationName && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Recording visit at: {locationName} ({locationCode})
          </AlertDescription>
        </Alert>
      )}
      
      {/* Rest of form - no location selector needed */}
    </form>
  );
}
```

---

## Admin Guide

### Setting Up Multi-Location System

#### Step 1: Enable Feature Flag

```sql
-- For specific tenant
UPDATE tenants 
SET has_multiple_locations = true 
WHERE id = 'tenant-uuid';
```

Or via Admin UI:
```
1. Navigate to: Settings → Tenant Management
2. Find tenant
3. Click "Edit"
4. Toggle: "Has Multiple Locations" → ON
5. Save changes
```

#### Step 2: Create Locations

```
1. Navigate to: Settings → Care Locations
2. Click "+ New Location"
3. Fill in details:
   - Location Name: "Main Medical Center"
   - Location Code: "MAIN"
   - Mark as Primary: ✓
   - Status: Active
   - Address, phone, email
   - Capacity: 10
   - Operating Hours
4. Click "Create Location"
5. Repeat for other locations
```

#### Step 3: Verify Setup

```
1. Logout
2. Login as regular user
3. Should see location selection modal
4. Select a location
5. Verify location badge appears in header
6. Create a medical visit
7. Check database: location_id should be populated
```

### Managing Locations

#### Setting Primary Location

Only one location can be primary per tenant. Primary location:
- Auto-selected for single-location mode
- Default for new users
- Fallback if preferred location unavailable

```
To Set Primary:
1. Care Locations page
2. Find location
3. Click "⋮" menu
4. Select "Set as Primary"
5. Confirm change
→ Previous primary automatically unset
```

#### Deactivating a Location

```
Before Deactivating:
✓ Verify it's not the only active location
✓ Check for current active sessions
✓ Consider reassigning scheduled appointments

To Deactivate:
1. Location card → "⋮" menu
2. Select "Deactivate"
3. Warning dialog appears:
   "2 users currently have active sessions at this location"
   "5 appointments scheduled here"
4. Choose action:
   □ Force deactivate (notify users)
   □ Schedule deactivation (after current sessions)
   □ Cancel
5. Confirm
```

#### Deleting a Location

```
Protection Rules:
- Cannot delete primary location
- Cannot delete if it's the only location
- Warning if historical records exist

To Delete:
1. Deactivate location first (if active)
2. Location card → "⋮" menu → "Delete"
3. Confirmation dialog:
   ⚠️ Delete Location?
   
   This location has:
   - 234 medical visits
   - 45 incidents
   - 89 appointments
   
   Choose action:
   ○ Keep records (mark location as deleted)
   ○ Reassign to: [Select Location ▼]
   ○ Delete all (DESTRUCTIVE - cannot undo)
   
   Type location code to confirm: [____]
   
4. Enter code and confirm
```

### Location Analytics

#### Accessing Analytics

```
1. Navigate to: Reports → Location Analytics
2. Or: Care Locations page → Location card → "Analytics"
```

#### Key Metrics to Monitor

**Utilization Rate:**
```
(Actual Visits / Capacity × Operating Hours) × 100

Good: 60-80%
High: >80% (consider more resources)
Low: <40% (underutilized, consider closure)
```

**Average Wait Time:**
```
Time from patient arrival to staff attention

Good: <15 minutes
Concerning: >30 minutes (staffing issue)
```

**Patient Volume Trends:**
```
Daily/weekly/monthly visit counts

Monitor for:
- Seasonal variations
- Unexpected drops (facility issues?)
- Unexpected spikes (outbreak? incident cluster?)
```

**Peak Hours Analysis:**
```
Hour-by-hour utilization

Use for:
- Staff scheduling optimization
- Break time planning
- Appointment slot availability
```

### Troubleshooting Common Issues

#### Issue: Users Not Seeing Location Modal

```
Checklist:
□ tenant.has_multiple_locations = true?
□ At least 1 active location exists?
□ User browser cache cleared?
□ Check browser console for errors

Solution:
1. Verify tenant setting
2. Ensure primary location set
3. Clear localStorage
4. Hard refresh (Ctrl+F5)
```

#### Issue: Location Not Auto-Populating in Records

```
Checklist:
□ User has selected location in session?
□ Middleware configured correctly?
□ Database column location_id exists?

Debug:
1. GET /api/auth/current-session
   → Should show activeLocation
2. Check server logs for middleware execution
3. Verify database schema migration ran
```

#### Issue: Cannot Switch Locations

```
Possible Causes:
- New location is inactive
- User doesn't have permission
- API endpoint error

Solution:
1. Verify target location is active
2. Check user role permissions
3. Check browser console for API errors
4. Review audit logs for failed attempts
```

---

## User Guide

### For Medical Staff

#### Starting Your Shift

```
1. Open MineAid HMS
2. Login with your credentials
3. Location Selection screen appears
4. Select where you're working today:
   □ Main Medical Center
   □ Shaft-3 Emergency Station
   □ Processing Plant Medical
5. Click "Confirm"
6. You're now checked in at that location
7. All your work today will be associated with this location
```

#### During Your Shift

**Location Indicator:**
- Always visible in header: "📍 Shaft-3 Emergency Station"
- Shows where you're currently working
- All records automatically tagged

**Creating Records:**
- No need to select location on forms
- System automatically uses your session location
- Focus on patient care, not paperwork

#### Switching Locations (Emergency Coverage)

```
1. Click location badge in header
2. Select new location from dropdown
3. Enter reason: "Emergency coverage needed"
4. Confirm switch
5. Header updates with new location
6. Continue working
```

#### Ending Your Shift

```
1. Complete any pending records
2. Click profile menu
3. Select "Logout"
4. Confirm: "End shift at [Location]?"
5. Click "Logout"
6. Session ends
7. Next login will require location selection again
```

### For Administrators

#### Managing Your Locations

```
Navigate to: Settings → Care Locations

You can:
- View all care locations
- Add new locations
- Edit location details
- Activate/deactivate locations
- View location analytics
- Set primary location
```

#### Viewing Cross-Location Data

```
As Admin, you can:
1. Select "All Locations" in location dropdown
2. View data from all locations simultaneously
3. Filter by specific location in reports
4. Compare performance across locations
```

#### Location-Based Reports

```
Navigate to: Reports → Location Analytics

Available Reports:
- Utilization by location
- Patient volume comparison
- Wait time analysis
- Staff distribution
- Resource allocation
- Cost per location
```

---

## Session Management

### Session Structure

```typescript
interface UserSession {
  // Standard auth fields
  id: string;
  userId: string;
  sessionToken: string;
  expires: Date;
  createdAt: Date;
  
  // Location fields (NEW)
  activeLocationId: string | null;
  activeLocationName: string | null;
  locationSetAt: Date | null;
  previousLocationId: string | null; // For audit trail
}
```

### Location Selection Logic

```typescript
// Pseudo-code for location selection flow

async function handlePostLoginLocationSelection(user, tenant) {
  // Check if multi-location tenant
  if (!tenant.hasMultipleLocations) {
    // Single location - auto-select primary
    const primaryLocation = await getPrimaryLocation(tenant.id);
    await setSessionLocation(user.sessionToken, primaryLocation.id);
    return redirectToDashboard();
  }
  
  // Multi-location - show selector
  const activeLocations = await getActiveLocations(tenant.id);
  
  if (activeLocations.length === 0) {
    throw new Error("No active locations available");
  }
  
  if (activeLocations.length === 1) {
    // Only one location - auto-select
    await setSessionLocation(user.sessionToken, activeLocations[0].id);
    return redirectToDashboard();
  }
  
  // Multiple locations - show modal
  const lastUsed = localStorage.getItem('lastWorkingLocation');
  return showLocationSelectionModal(activeLocations, lastUsed);
}

async function setSessionLocation(sessionToken, locationId) {
  const location = await getLocation(locationId);
  
  await db.update(userSessions)
    .set({
      activeLocationId: locationId,
      activeLocationName: location.locationName,
      locationSetAt: new Date()
    })
    .where(eq(userSessions.sessionToken, sessionToken));
  
  // Store for next login
  localStorage.setItem('lastWorkingLocation', locationId);
  
  // Create audit log
  await createAuditLog({
    action: 'location_selected',
    resourceType: 'session',
    details: {
      locationId,
      locationName: location.locationName
    }
  });
}
```

### Middleware: Inject Location

```typescript
// server/middleware/injectLocation.ts

export function injectLocationMiddleware(req, res, next) {
  // Skip for read-only operations
  if (req.method === 'GET') {
    return next();
  }
  
  // Get session location
  const session = req.session;
  const activeLocationId = session?.activeLocationId;
  
  // Check if location required
  const requiresLocation = [
    '/api/medical-visits',
    '/api/incidents',
    '/api/appointments',
    '/api/drug-tests',
    '/api/alcohol-tests',
    '/api/hydration-tests'
  ].some(path => req.path.startsWith(path));
  
  if (requiresLocation && !activeLocationId) {
    // Check if user's tenant requires locations
    if (req.user?.tenant?.hasMultipleLocations) {
      return res.status(400).json({
        error: 'LOCATION_REQUIRED',
        message: 'Please select your working location before proceeding'
      });
    }
    // Single-location tenant - get primary
    const primaryLocation = await getPrimaryLocation(req.user.tenantId);
    req.body.locationId = primaryLocation.id;
  } else {
    // Multi-location - use session location
    req.body.locationId = activeLocationId;
  }
  
  // Store in request for reference
  req.activeLocation = activeLocationId;
  
  next();
}

// Apply to all routes
app.use(injectLocationMiddleware);
```

### Middleware: Require Location

```typescript
// server/middleware/requireLocation.ts

export function requireLocation(req, res, next) {
  const session = req.session;
  const activeLocationId = session?.activeLocationId;
  
  if (!activeLocationId) {
    return res.status(400).json({
      error: 'NO_ACTIVE_LOCATION',
      message: 'No active location selected. Please select your working location.',
      action: 'SELECT_LOCATION'
    });
  }
  
  // Verify location is still active
  const location = await getLocation(activeLocationId);
  
  if (!location || location.status !== 'active') {
    // Location was deactivated
    await clearSessionLocation(req.sessionToken);
    return res.status(400).json({
      error: 'LOCATION_INACTIVE',
      message: 'Your selected location is no longer active. Please select a new location.',
      action: 'SELECT_LOCATION'
    });
  }
  
  // Add location to request
  req.activeLocation = location;
  next();
}

// Apply to specific routes that absolutely need location
app.post('/api/medical-visits', requireLocation, createMedicalVisit);
```

---

## Security Considerations

### Authentication & Authorization

**Session Security:**
- Secure cookies (httpOnly, secure, sameSite)
- Session expiration (configurable, default 8 hours)
- Auto-logout on session expiry
- Location cleared on logout

**Role-Based Access:**
```
medical_staff:
  - Can select location
  - Can view own location data
  - Cannot manage locations

admin:
  - Can select "All Locations"
  - Can manage all locations
  - Can view cross-location reports
  - Can create/edit/delete locations

safety_officer:
  - Can view all locations
  - Cannot manage locations
  - Can generate reports
```

### Data Protection

**Tenant Isolation:**
- All location queries filtered by tenantId
- Cannot access other tenant's locations
- Session location must belong to user's tenant

**Location Validation:**
```typescript
// Before setting session location
async function validateLocationAccess(userId, locationId) {
  const user = await getUser(userId);
  const location = await getLocation(locationId);
  
  // Check tenant match
  if (location.tenantId !== user.tenantId) {
    throw new Error('Unauthorized: Location does not belong to your organization');
  }
  
  // Check location is active
  if (location.status !== 'active') {
    throw new Error('Location is not active');
  }
  
  return true;
}
```

### Audit Trail

**All location-related actions logged:**
- Location selection at login
- Location switches mid-session
- Location changes by admin
- Location deactivation/deletion
- Failed location access attempts

**Audit Log Entry Example:**
```json
{
  "id": "audit-uuid",
  "userId": "user-123",
  "action": "location_switch",
  "resourceType": "session",
  "resourceId": "session-456",
  "originalData": {
    "previousLocationId": "loc-main",
    "previousLocationName": "Main Medical Center"
  },
  "newData": {
    "newLocationId": "loc-sh3",
    "newLocationName": "Shaft-3 Emergency Station",
    "reason": "Emergency coverage needed"
  },
  "ipAddress": "192.168.1.100",
  "timestamp": "2025-10-09T14:30:00Z"
}
```

### Privacy Considerations

**Location Data:**
- Medical records remain confidential
- Location is operational metadata, not medical data
- Staff location tracked for accountability, not surveillance
- Location analytics aggregated, not individual tracking

**Data Retention:**
- Active sessions: Duration of shift
- Historical location data: Retained per compliance requirements
- Audit logs: Permanent retention
- Can be anonymized for analytics after retention period

---

## Implementation Guide

### Phase 1: Database Schema (Day 1)

```sql
-- Step 1: Create care_locations table
-- See Database Schema section for full SQL

-- Step 2: Add tenant flag
ALTER TABLE tenants 
ADD COLUMN has_multiple_locations BOOLEAN DEFAULT false;

-- Step 3: Add session location fields
ALTER TABLE user_sessions 
ADD COLUMN active_location_id UUID REFERENCES care_locations(id),
ADD COLUMN active_location_name VARCHAR;

-- Step 4: Add location_id to operational tables
ALTER TABLE medical_visits ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE incident_reports ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE appointments ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE drug_tests ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE alcohol_tests ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE hydration_tests ADD COLUMN location_id UUID REFERENCES care_locations(id);
ALTER TABLE duty_assignments ADD COLUMN location_id UUID REFERENCES care_locations(id);

-- Step 5: Create indexes
CREATE INDEX idx_care_locations_tenant ON care_locations(tenant_id);
CREATE INDEX idx_care_locations_status ON care_locations(status);
CREATE INDEX idx_medical_visits_location ON medical_visits(location_id);
-- ... more indexes as needed

-- Step 6: Seed default location for existing tenants
INSERT INTO care_locations (tenant_id, location_name, location_code, is_primary, status)
SELECT 
  id, 
  CONCAT(name, ' - Main Clinic'), 
  'MAIN',
  true,
  'active'
FROM tenants;
```

### Phase 2: Backend API (Day 2-3)

**File Structure:**
```
server/
├── routes/
│   └── careLocations.ts          # Location CRUD endpoints
├── middleware/
│   ├── injectLocation.ts          # Auto-inject location
│   └── requireLocation.ts         # Validate location exists
├── storage/
│   └── careLocations.ts           # Database operations
└── validators/
    └── careLocation.ts            # Zod schemas
```

**Implementation Checklist:**
- [ ] Create care locations CRUD endpoints
- [ ] Implement location selection endpoint
- [ ] Implement location switch endpoint
- [ ] Add location filter to existing queries
- [ ] Create middleware for location injection
- [ ] Add validation middleware
- [ ] Update audit logging for location actions
- [ ] Add location analytics endpoint
- [ ] Test all endpoints with Postman/Insomnia

### Phase 3: Frontend Components (Day 4-5)

**File Structure:**
```
client/src/
├── components/
│   ├── LocationSelectionModal.tsx
│   ├── LocationBadge.tsx
│   ├── LocationSwitcher.tsx
│   └── admin/
│       └── CareLocationsManager.tsx
├── hooks/
│   ├── useActiveLocation.ts
│   └── useLocationRequired.ts
├── pages/
│   └── admin/
│       └── CareLocations.tsx
└── lib/
    └── locationUtils.ts
```

**Implementation Checklist:**
- [ ] Create LocationSelectionModal component
- [ ] Create LocationBadge component
- [ ] Create LocationSwitcher component
- [ ] Create useActiveLocation hook
- [ ] Add location indicator to Header
- [ ] Create admin CareLocationsManager
- [ ] Update MainLayout for post-login flow
- [ ] Add localStorage for last used location
- [ ] Update all forms (remove manual location selectors if any)
- [ ] Test on desktop and mobile

### Phase 4: Integration & Testing (Day 6-7)

**Test Scenarios:**

1. **Single-Location Tenant**
   - [ ] Login → No modal shown
   - [ ] Primary location auto-selected
   - [ ] Location badge hidden or minimal
   - [ ] All operations work normally

2. **Multi-Location Tenant - First Login**
   - [ ] Login → Location selection modal appears
   - [ ] Cannot dismiss modal
   - [ ] All active locations listed
   - [ ] Select location → Success
   - [ ] Dashboard shows location badge
   - [ ] Create medical visit → location auto-populated

3. **Multi-Location Tenant - Regular Login**
   - [ ] Login → Modal shows last used location
   - [ ] Quick Confirm works
   - [ ] Can select different location
   - [ ] Location persists through session

4. **Location Switching**
   - [ ] Click badge → Dropdown appears
   - [ ] Other locations listed
   - [ ] Switch location → Warning modal
   - [ ] Enter reason → Success
   - [ ] Header updates
   - [ ] Audit log created

5. **Admin Operations**
   - [ ] Can create new location
   - [ ] Can edit location
   - [ ] Can set primary location
   - [ ] Can deactivate location
   - [ ] Cannot delete primary/only location
   - [ ] Can view analytics

6. **Edge Cases**
   - [ ] Location deactivated mid-session
   - [ ] No active locations
   - [ ] Session expires → Re-select location
   - [ ] Concurrent location edits
   - [ ] Network errors during selection

### Phase 5: Documentation & Training (Day 8)

**Documentation:**
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Create admin guide
- [ ] Record video tutorials
- [ ] Update changelog

**Training:**
- [ ] Train admin staff on location management
- [ ] Train medical staff on location selection
- [ ] Provide FAQ document
- [ ] Set up support channels

### Phase 6: Deployment (Day 9-10)

**Pre-Deployment:**
- [ ] Run database migrations on staging
- [ ] Test on staging environment
- [ ] Get stakeholder approval
- [ ] Prepare rollback plan

**Deployment:**
- [ ] Schedule maintenance window
- [ ] Backup database
- [ ] Run migrations on production
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify deployment
- [ ] Monitor for errors

**Post-Deployment:**
- [ ] Verify single-location tenants unaffected
- [ ] Enable multi-location for pilot tenants
- [ ] Monitor audit logs
- [ ] Collect user feedback
- [ ] Address any issues

---

## Edge Cases & Troubleshooting

### Edge Case 1: Location Deactivated Mid-Session

**Scenario:**
```
1. User logs in at Location A
2. User is working (creating records)
3. Admin deactivates Location A
4. User tries to create new record
```

**Solution:**
```typescript
// Middleware checks location status
if (location.status !== 'active') {
  // Clear session location
  await clearSessionLocation(req.sessionToken);
  
  // Return error with action
  return res.status(400).json({
    error: 'LOCATION_DEACTIVATED',
    message: 'Your working location has been deactivated. Please select a new location.',
    action: 'SELECT_LOCATION'
  });
}

// Frontend handles error
if (error.error === 'LOCATION_DEACTIVATED') {
  // Clear local state
  clearActiveLocation();
  
  // Show location selection modal
  showLocationSelectionModal();
  
  // Show notification
  toast.warning('Your location was deactivated. Please select a new location.');
}
```

### Edge Case 2: No Active Locations

**Scenario:**
```
1. Admin deactivates all locations (accidentally)
2. Users try to login
3. No locations available for selection
```

**Solution:**
```typescript
// During location selection
const activeLocations = await getActiveLocations(tenantId);

if (activeLocations.length === 0) {
  // Show error to user
  return showError({
    title: 'No Active Locations',
    message: 'There are currently no active care locations. Please contact your administrator.',
    action: 'CONTACT_ADMIN'
  });
  
  // Notify admins
  await notifyAdmins({
    type: 'CRITICAL',
    title: 'No Active Locations',
    message: `Tenant ${tenant.name} has no active care locations. Users cannot login.`,
    action: 'Activate or create a location immediately'
  });
}

// Prevention: Validation before deactivating
async function deactivateLocation(locationId) {
  const activeLocations = await getActiveLocations(tenantId);
  
  if (activeLocations.length === 1 && activeLocations[0].id === locationId) {
    throw new Error('Cannot deactivate the only active location');
  }
  
  // Proceed with deactivation
}
```

### Edge Case 3: Concurrent Location Edits

**Scenario:**
```
1. Admin A edits Location X
2. Admin B edits same Location X simultaneously
3. Both save
4. Last write wins? Data lost?
```

**Solution:**
```typescript
// Optimistic locking with version field
ALTER TABLE care_locations ADD COLUMN version INTEGER DEFAULT 1;

// On update
UPDATE care_locations
SET 
  location_name = $1,
  version = version + 1,
  updated_at = NOW()
WHERE 
  id = $2
  AND version = $3  -- Must match current version
RETURNING *;

// If rowCount = 0, version mismatch
if (result.rowCount === 0) {
  throw new Error({
    code: 'CONFLICT',
    message: 'Location was modified by another user. Please refresh and try again.'
  });
}

// Frontend handles conflict
catch (error) {
  if (error.code === 'CONFLICT') {
    // Refresh data
    const latest = await refetch();
    
    // Show warning
    toast.warning('Location was updated by another admin. Please review changes.');
    
    // Pre-fill with latest data
    setFormData(latest);
  }
}
```

### Edge Case 4: Session Expires During Work

**Scenario:**
```
1. User logs in, selects location
2. Works for several hours
3. Session expires (but tab still open)
4. User submits form
5. 401 Unauthorized error
```

**Solution:**
```typescript
// Frontend: Auto-refresh session
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      // Ping session endpoint
      await apiRequest('GET', '/api/auth/ping');
    } catch (error) {
      // Session expired
      clearAuth();
      showSessionExpiredModal();
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  return () => clearInterval(interval);
}, []);

// On session expired
function showSessionExpiredModal() {
  Modal.show({
    title: 'Session Expired',
    message: 'Your session has expired. Please login again.',
    closable: false,
    actions: [
      {
        label: 'Login',
        onClick: () => redirectToLogin()
      }
    ]
  });
}

// After re-login, restore location
const lastLocation = localStorage.getItem('lastWorkingLocation');
if (lastLocation) {
  // Pre-select in modal
  setSelectedLocation(lastLocation);
}
```

### Edge Case 5: Network Error During Location Selection

**Scenario:**
```
1. User selects location
2. Network request fails
3. User stuck on modal
```

**Solution:**
```typescript
// Retry logic with exponential backoff
async function selectLocation(locationId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await apiRequest('POST', '/api/auth/select-location', {
        locationId
      });
      return { success: true };
    } catch (error) {
      if (i === retries - 1) {
        // Last retry failed
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await sleep(1000 * Math.pow(2, i));
    }
  }
}

// UI feedback
function LocationSelectionModal() {
  const [error, setError] = useState(null);
  
  async function handleSelect(locationId) {
    setLoading(true);
    setError(null);
    
    try {
      await selectLocation(locationId);
      onSuccess();
    } catch (err) {
      setError('Failed to set location. Please check your connection and try again.');
      
      // Show retry button
      setShowRetry(true);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Dialog>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {showRetry && (
            <Button onClick={handleRetry}>
              Retry
            </Button>
          )}
        </Alert>
      )}
      {/* ... rest of modal */}
    </Dialog>
  );
}
```

### Troubleshooting: Location Not Auto-Populating

**Symptoms:**
```
- Medical visits created without location_id
- location_id is NULL in database
- Records don't show location in UI
```

**Debugging Steps:**
```
1. Check user session:
   GET /api/auth/current-session
   → Should return activeLocation

2. If activeLocation is null:
   - User didn't select location (check modal appeared)
   - Session was cleared (check for logout/expiry)
   - Database issue (check user_sessions table)

3. Check middleware execution:
   - Add logging in injectLocationMiddleware
   - console.log('Active Location:', req.session.activeLocationId);
   - Verify middleware runs before route handler

4. Check database schema:
   - Verify location_id column exists
   - Check foreign key constraint
   - Verify no conflicting triggers

5. Check API request:
   - Open Network tab
   - POST /api/medical-visits
   - Check request payload for locationId
   - Should be present even if not in form
```

**Solutions:**
```
Issue: Middleware not executing
Solution: Verify middleware order
  app.use(authMiddleware);
  app.use(injectLocationMiddleware);  // Must be after auth
  app.use('/api', routes);

Issue: Location cleared from session
Solution: Check session timeout settings
  session({
    cookie: { maxAge: 8 * 60 * 60 * 1000 }  // 8 hours
  })

Issue: Database constraint error
Solution: Allow NULL temporarily
  ALTER TABLE medical_visits 
  ALTER COLUMN location_id DROP NOT NULL;
```

### Troubleshooting: Modal Appears Every Time

**Symptoms:**
```
- User selects location
- Modal closes
- User refreshes page
- Modal appears again
```

**Cause:**
```
localStorage not being set/read correctly
```

**Solution:**
```typescript
// Ensure localStorage is set after selection
async function handleLocationSelect(locationId) {
  await setSessionLocation(locationId);
  
  // Store in localStorage
  localStorage.setItem('lastWorkingLocation', locationId);
  localStorage.setItem('lastWorkingLocationTime', Date.now().toString());
  
  closeModal();
}

// On mount, check if already set
useEffect(() => {
  async function checkLocation() {
    const session = await getCurrentSession();
    
    if (session.activeLocation) {
      // Location already set, skip modal
      setShowModal(false);
    } else {
      setShowModal(true);
    }
  }
  
  checkLocation();
}, []);
```

---

## Future Enhancements

### Phase 2 Features (Planned)

**Location-Based Staffing:**
- [ ] Assign staff to specific locations
- [ ] View who's working at each location in real-time
- [ ] Staff schedule by location
- [ ] Automatic location assignment based on schedule

**Location-Specific Inventory:**
- [ ] Track inventory per location
- [ ] Transfer inventory between locations
- [ ] Low stock alerts per location
- [ ] Equipment tracking per location

**Advanced Analytics:**
- [ ] Predictive capacity planning
- [ ] Optimal location placement recommendations
- [ ] Staff utilization heatmaps
- [ ] Cost analysis per location

**Mobile App Integration:**
- [ ] Location check-in via GPS
- [ ] QR code scanning at location entrance
- [ ] Push notifications for location-specific events
- [ ] Offline mode with location caching

**Workflow Automation:**
- [ ] Auto-assign appointments to optimal location
- [ ] Load balancing across locations
- [ ] Intelligent routing of patients
- [ ] Emergency overflow protocols

### Phase 3 Features (Future)

**IoT Integration:**
- [ ] Real-time capacity sensors
- [ ] Automated patient flow tracking
- [ ] Equipment status monitoring
- [ ] Environmental condition sensors

**Advanced Mapping:**
- [ ] Interactive site map
- [ ] GPS navigation to locations
- [ ] Emergency route optimization
- [ ] Visual heat maps of activity

**Compliance Reporting:**
- [ ] Regulatory compliance by location
- [ ] Certification tracking per location
- [ ] Inspection scheduling
- [ ] Automated compliance reports

---

## Conclusion

The Multi-Location Care Sites System provides a robust, flexible solution for managing medical operations across distributed facilities in mining environments. By using session-based location binding, the system:

✅ Matches physical reality of shift-based work
✅ Eliminates user error in location tracking
✅ Provides clear accountability and audit trails
✅ Seamlessly supports both single and multi-location tenants
✅ Enables data-driven decisions through location analytics

The architecture is designed for scalability, security, and ease of use, ensuring that medical personnel can focus on patient care while the system handles accurate location tracking automatically.

---

**Next Steps:**
1. Review this documentation with stakeholders
2. Approve design and implementation plan
3. Begin Phase 1: Database schema implementation
4. Set up development environment
5. Start building according to implementation guide

**Questions or Feedback:**
- Technical Lead: [Your Name]
- Project Manager: [PM Name]
- Stakeholders: [Stakeholder Names]

---

*Document maintained by: MineAid Development Team*  
*Last Review: October 2025*  
*Next Review: After Phase 1 Implementation*  
*Status: Ready for Implementation ✅*

