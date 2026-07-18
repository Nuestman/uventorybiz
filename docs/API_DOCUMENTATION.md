# MineAid HMS - API Documentation
**Document revision**: 2.8.0 | **Aligned with app release**: 4.25.1 | **Last Updated**: May 28, 2026

## Overview
This document covers the complete API for MineAid HMS, including the newly implemented comprehensive CRUD operations with 3-dots menu functionality and system-wide audit logging.

## Authentication Endpoints

### Staff authentication

#### POST /api/auth/register
Register a new user with email or phone number.

**Request Body:**
```json
{
  "email": "user@example.com",        // Optional - email address
  "phoneNumber": "+1234567890",       // Optional - phone number
  "firstName": "John",                // Required - first name
  "lastName": "Doe",                  // Required - last name
  "password": "securePassword123",   // Required - min 8 characters
  "acceptTermsAndPrivacy": true       // Required (4.18.0+) — must be true
}
```

**Requirements:**
- Either email OR phoneNumber is required (can provide both)
- Password must be at least 8 characters
- First and last names are required
- **`acceptTermsAndPrivacy`** must be **`true`** (user has accepted Terms of Service and Privacy Policy)

**Success Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "pending_verification",
    "authProvider": "custom"
  },
  "message": "Registration successful. Please verify your email/phone."
}
```

#### POST /api/auth/login
Authenticate user with email/phone and password.

**Request Body:**
```json
{
  "identifier": "user@example.com",   // Email or phone number
  "password": "securePassword123"     // User password
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active"
  },
  "sessionToken": "jwt-like-token",
  "message": "Login successful"
}
```

#### OIDC — Google (4.19.0+)

Requires `GOOGLE_OIDC_CLIENT_ID` and `GOOGLE_OIDC_CLIENT_SECRET`. Invite-only: existing MineAid user matched by `(iss, sub)` or linked by email on first SSO.

- **GET /api/auth/oidc/google/start** — Redirects browser to Google; stores PKCE/state/nonce in session.
- **GET /api/auth/oidc/google/callback** — Completes code exchange; sets `sessionToken` cookie; redirects to app (or `/auth?error=oidc_*` on failure).

#### OIDC — Microsoft (4.19.0+)

Requires `MICROSOFT_OIDC_CLIENT_ID`, `MICROSOFT_OIDC_CLIENT_SECRET`, and `MICROSOFT_OIDC_TENANT` (e.g. `organizations`, tenant GUID, or `common`). Same invite-only rules as Google. Entra redirect URI must be exactly `{FRONTEND_URL}/api/auth/oidc/microsoft/callback`.

- **GET /api/auth/oidc/microsoft/start** — Redirects to Microsoft; stores PKCE/state/nonce in session. Returns **503** if not configured.
- **GET /api/auth/oidc/microsoft/callback** — Completes token exchange; sets `sessionToken`; redirects (or `/auth?error=...`).

#### POST /api/auth/verify-email
Verify user email address with verification code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "verification-token"
}
```

#### POST /api/auth/forgot-password
Request password reset for user account.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newSecurePassword123"
}
```

#### POST /api/auth/logout
Universal logout (clears `sessionToken` and session cookie).

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Hybrid Authentication

#### GET /api/auth/user
Get current authenticated user (session token / cookie).

**Headers:**
```
Authorization: Bearer session-token
// OR
Cookie: sessionToken=session-token
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "status": "active",
  "authProvider": "custom",
  "createdAt": "2025-01-02T21:00:00Z",
  "lastLoginAt": "2025-01-02T21:30:00Z"
}
```

### Replit Authentication

#### GET /api/login
Redirect to Replit OpenID Connect login.

#### GET /api/logout
Logout from Replit authentication.

#### GET /api/callback
OAuth callback handler (internal use).

## Core Application Endpoints

All core endpoints require authentication via the hybrid middleware.

### Patients

#### POST /api/patients
Create a new patient record.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "EMP001",
  "department": "extraction",
  "status": "active",
  "contactInfo": {
    "email": "jane.smith@company.com",
    "phone": "+1234567890"
  },
  "medicalInfo": {
    "bloodType": "O+",
    "allergies": ["penicillin"],
    "chronicConditions": ["hypertension"]
  }
}
```

#### GET /api/patients
Retrieve patients list with optional search.

**Query Parameters:**
- `search` - Search by name or employee ID
- `limit` - Maximum number of results (default: 50)

#### GET /api/patients/:id
Get specific patient details.

### Appointments

#### POST /api/appointments
Schedule a new appointment.

**Request Body:**
```json
{
  "patientId": "patient-uuid",
  "type": "routine_checkup",
  "scheduledDate": "2025-01-10T10:00:00Z",
  "duration": 30,
  "status": "scheduled",
  "notes": "Annual health check"
}
```

#### GET /api/appointments
Get appointments list with optional patient filter.

#### PUT /api/appointments/:id
Update appointment details.

### Medical Records

#### POST /api/medical-records
Create medical visit record.

**Request Body:**
```json
{
  "patientId": "patient-uuid",
  "visitDate": "2025-01-02T14:00:00Z",
  "chiefComplaint": "Routine checkup",
  "vitalSigns": {
    "bloodPressureSystolic": 120,
    "bloodPressureDiastolic": 80,
    "heartRate": 72,
    "respiratoryRate": 16,
    "oxygenSaturation": 98
  },
  "assessment": "Normal examination",
  "treatment": "None required",
  "disposition": "cleared_for_duty"
}
```

#### GET /api/medical-records
Get medical records with patient filter.

### Referral Facilities (Transfer Hospitals)

Tenant-scoped list of referral/transfer facilities used when medical visit disposition is "Transferred to Hospital". Admin can manage via Admin → Locations → Referral / transfer facilities.

#### GET /api/referral-facilities
List referral facilities for the current tenant.

**Query Parameters:**
- `includeInactive` (optional): `true` to include inactive facilities; default is active only.
- `status` (optional): `active` or `inactive` to filter by status.

**Response (200):** Array of `{ id, name, address, contactPhone, contactEmail, status, createdAt, updatedAt }`.

#### GET /api/referral-facilities/:id
Get a single referral facility by ID (tenant-scoped).

#### POST /api/referral-facilities
Create a referral facility (admin only).

**Request Body:**
```json
{
  "name": "Regional Hospital",
  "address": "123 Main St",
  "contactPhone": "+1-555-0100",
  "contactEmail": "referrals@hospital.example.com",
  "status": "active"
}
```
`name` is required; other fields optional.

#### PUT /api/referral-facilities/:id
Update a referral facility (admin only). Same body shape as POST; all fields optional (partial update).

#### DELETE /api/referral-facilities/:id
Delete a referral facility (admin only). Existing medical visits that referenced this facility keep `transfer_facility_id` (FK is set null on delete).

### Incident Reports

#### POST /api/incident-reports
Create new incident report.

**Request Body:**
```json
{
  "patientId": "patient-uuid",
  "incidentDate": "2025-01-02T10:30:00Z",
  "location": "Mining Site A",
  "department": "extraction",
  "severity": "minor",
  "description": "Worker slipped on wet surface",
  "witness": "John Manager",
  "actionsTaken": "First aid provided, area cleaned",
  "status": "under_investigation"
}
```

#### GET /api/incident-reports
Retrieve incident reports list.

### Clinical aggregate reports (4.21.0+; ambulance KPIs & **`tables.ambulanceByClinic`** in **4.22.0**; **4.22.1** is UI-only — collapsible §4.0 guide on **`/reports/clinical`**, no API change)

**Auth:** Clinical access (same guard as other PHI/clinical routes). **UI:** `/reports/clinical`.

#### GET /api/reports/clinical
Tenant-scoped **aggregate** clinical analytics for a date window. Query: `from`, `to` (YYYY-MM-DD, required), `groupBy` (`day` | `week` | `month`), optional `locationIds`, `companyIds`, `companyTypes` (comma-separated), `visitTypes`, `dispositions`, `visitStatus`, `triageAcuities`, `includeIncidents` (when **false**, incident-backed matrix/widgets and **incident ambulance** metrics are empty/zero), **`comparePriorPeriod`**, **`includeDetail`** (+ **`detailPage`**, **`detailPageSize`** when detail is on).

**Response (200):** JSON with `meta` (includes optional `priorPeriod` when comparing), `kpis` (includes **`ambulanceVisits`** = ambulance on **hospital-transfer** visits only, **`ambulanceTransferRate`**, and when incidents are included **`totalIncidents`**, **`incidentsWithAmbulance`**, **`incidentAmbulanceRate`**), optional **`kpisPriorPeriod`**, `series`, `tables` (including **`byCompany`**, **`companyByLocation`**, **`ambulanceByClinic`**, **`casesByDayByPost`**, …), **`detail`** (`null` unless **`includeDetail=true`** — paginated visit rows without patient identifiers). Full field definitions: **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** §4.5 and §5.

### Incident aggregate reports (4.23.0+)

**Auth:** Incident-reports access (see **`docs/RBAC.md`** and `requireIncidentReportsAccess`). **UI:** `/reports/incidents`.

#### GET /api/reports/incidents

Tenant-scoped **occupational incident** analytics. Query: `from`, `to` (YYYY-MM-DD, required), `groupBy` (`day` | `week` | `month`), optional `locationIds`, `companyIds`, `companyTypes`, `severities`, `incidentTypes`, `statuses`, **`comparePriorPeriod`**, **`includeDetail`** (+ pagination params when detail is on). Response: `meta`, `kpis`, optional `kpisPriorPeriod`, `series`, `tables`, optional `detail` — **no casualty identifiers** in default aggregates. Full shape: **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`**.

### Operations aggregate reports (4.24.0+)

**Auth:** Tenant **`admin`** or **`super_admin`** (with impersonation). **UI:** `/reports/operations`.

#### GET /api/reports/operations

Tenant-scoped **tickets**, **operational duty assignments**, and **shift report** analytics for a date window. Query: `from`, `to` (required), `groupBy` (`day` | `week` | `month`), optional `locationIds`, ticket filters (`ticketCategoryIds`, `ticketStatuses`, `ticketPriorities`, `assigneeUserIds`, `requesterUserIds`), duty filters (`dutyIds`, `dutyAssignmentStatuses`, `shifts`), shift-report filters (`shiftReportShifts`, `onlyWithIssues`), optional **`comparePriorPeriod`** (prior window KPI replay). Response: `meta` (includes `filters` echo; optional **`priorPeriod`** when compare is on), `kpis`, optional **`kpisPriorPeriod`**, `series`, `tables` (ticket breakdowns, aging buckets, **`ticketsByAssignee`**, duties by location / **`dutiesByDuty`** / **`dutiesByCategory`**, shift link counts). Details: **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`**.

### Compliance aggregate reports (4.25.0+)

**Auth:** Tenant **`admin`** or **`super_admin`** (with impersonation). **UI:** `/reports/compliance`.

#### GET /api/reports/compliance

Tenant-scoped **governance** analytics across audit activity and documentation posture. Query: `from`, `to` (required), `groupBy` (`day` | `week` | `month`), optional `auditActions`, `auditResourceTypes`, `locationIds` (applies to shift handover acknowledgment scope). Response: `meta`, `kpis`, `series.auditEventsOverTime`, `tables` (`auditByResourceType`, `auditByAction`, `auditHighRiskByAction`, `sopVersionStatusMix`, `topAuditActors`), `shiftHandoverAckSummary`, and `exceptions`.

**Notes:**
- Aggregate endpoint intentionally omits `audit_logs.original_data`.
- Includes SOP version status counts from `tenant_sop_documents` / `tenant_sop_versions`.
- Includes signed legal upload count in window from `tenant_signed_legal_documents`.
- Performance baseline uses index migration **`migrations/20260421_audit_logs_tenant_created_at.sql`**.

### Dashboard

#### GET /api/dashboard/metrics
Get dashboard statistics.

**Response:**
```json
{
  "activePatients": 245,
  "todayAppointments": 12,
  "pendingIncidents": 3,
  "completedAppointments": 8
}
```

### Notifications

#### GET /api/notifications
List notifications for the authenticated user.

**Query Parameters (optional):**
- `channel` - Filter by channel/category key.
- `status` - Filter by persisted status.
- `limit` - Max rows returned (positive integer, capped server-side).
- `unreadOnly` - `true` / `1` to return unread rows only.

#### GET /api/notifications/unread-count
Return unread notification count for the authenticated user.

**Query Parameters (optional):**
- `channel` - Channel-specific unread count.

**Response (200):**
```json
{
  "count": 12
}
```

#### PUT /api/notifications/read-all
Mark all unread notifications as read for the authenticated user.

**Query Parameters (optional):**
- `channel` - Restrict bulk read to a single channel.

**Response (200):**
```json
{
  "success": true
}
```

## Error Responses

### Authentication Errors

**401 Unauthorized:**
```json
{
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "message": "Insufficient permissions"
}
```

### Validation Errors

**400 Bad Request:**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Server Errors

**500 Internal Server Error:**
```json
{
  "message": "Internal server error"
}
```

## Authentication Flow

### Staff authentication Flow

1. **Registration**: POST /api/auth/register
2. **Email/Phone Verification**: POST /api/auth/verify-email
3. **Login**: POST /api/auth/login
4. **Session Cookie Set**: Automatic (httpOnly, secure)
5. **API Access**: Use session cookie for subsequent requests

### Replit Authentication Flow

1. **Redirect**: GET /api/login
2. **OAuth Flow**: Handled by Replit
3. **Callback**: GET /api/callback
4. **Session Established**: Automatic
5. **API Access**: Use session for subsequent requests

## Security Features

### Password Security
- Minimum 8 characters required
- bcrypt hashing with 12 salt rounds
- Secure password reset with tokens

### Session Security
- HTTP-only cookies in production
- Secure flag for HTTPS
- Session expiration (30 days default)
- Server-side session validation

### API Security
- Request validation with Zod schemas
- SQL injection protection via Drizzle ORM
- Proper error handling without data leakage
- Rate limiting ready for implementation

## Development vs Production

### Development
- Mock email/SMS services (console logging)
- Relaxed cookie security for localhost
- Detailed error messages for debugging

### Production Requirements
- Real email service (SendGrid/AWS SES)
- Real SMS service (Twilio/AWS SNS)
- HTTPS-only cookies
- Environment-specific configuration
- Monitoring and logging setup

## Environment Variables

### Required for Production
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV=production` - Production mode
- `REPLIT_DOMAINS` - Allowed domains for Replit auth

### Optional Service Integration
- `SENDGRID_API_KEY` - Email service
- `TWILIO_ACCOUNT_SID` - SMS service
- `TWILIO_AUTH_TOKEN` - SMS service
- `REDIS_URL` - Session storage (alternative)

---

## 🔄 Comprehensive CRUD Operations & Audit Logging (Version 2.3.0)

### System-Wide 3-Dots Menu CRUD Functionality

All modules in MineAid HMS feature standardized CRUD operations accessible through a consistent 3-dots dropdown menu interface. Each operation includes automatic audit logging for complete traceability.

### Appointment CRUD Operations

#### PATCH /api/appointments/:id
Update appointment details or status with comprehensive audit logging.

**Request Body (Status Update):**
```json
{
  "status": "completed"  // scheduled | in_progress | completed | cancelled | no_show
}
```

**Success Response (200):**
```json
{
  "appointment": {
    "id": "uuid",
    "status": "completed",
    "updatedAt": "2025-01-15T14:35:00Z"
  },
  "message": "Appointment updated successfully"
}
```

#### DELETE /api/appointments/:id
Delete appointment with audit trail preservation.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Appointment deleted successfully",
  "auditId": "uuid"
}
```

### Medical Visit CRUD Operations

#### PATCH /api/medical-visits/:id
Update medical visit record with full audit logging.

#### DELETE /api/medical-visits/:id
Delete medical visit record with audit preservation.

### Incident Report CRUD Operations

#### PATCH /api/incident-reports/:id
Update incident report details with status tracking.

#### DELETE /api/incident-reports/:id
Delete incident report with complete audit trail.

### Operational Duty CRUD Operations

#### PATCH /api/operational-duties/:id
Update duty status or assignment details.

#### DELETE /api/operational-duties/:id
Delete operational duty with audit preservation.

## 📊 Comprehensive Audit Logging System

### GET /api/audit-logs
Retrieve system-wide audit trail with filtering capabilities.

**Query Parameters:**
- `table_name`: Filter by specific table (optional)
- `action`: Filter by action type (INSERT|UPDATE|DELETE) (optional)
- `user_id`: Filter by user ID (optional)
- `start_date`: Filter from date (optional)
- `end_date`: Filter to date (optional)
- `limit`: Number of records (default: 100)
- `offset`: Pagination offset (default: 0)

### GET /api/admin/audit-logs
Admin-only access to audit logs with enhanced filtering and admin operation tracking.

**Authentication:** Required (Hybrid + Admin Access)
**Query Parameters:** Same as above
**Admin Operations Tracked:**
- `admin_approve`: User account approvals
- `admin_update_role`: Role change operations  
- `admin_invite`: User invitation actions
- `admin_initialize`: Employee bulk initialization
- `admin_approve_admin`: Tenant admin approvals

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": "uuid", 
    "tableName": "appointments",
    "recordId": "uuid",
    "action": "UPDATE",
    "oldData": {
      "status": "scheduled",
      "appointmentDate": "2025-01-15T14:30:00Z"
    },
    "newData": {
      "status": "completed",
      "appointmentDate": "2025-01-15T14:30:00Z"
    },
    "timestamp": "2025-01-15T14:35:00Z",
    "user": {
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "medical_staff"
    }
  }
]
```

### Audit Log Database Schema

**Table: `audit_logs`**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  table_name VARCHAR(255) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB, 
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Automatic Audit Integration

All CRUD operations and admin actions automatically trigger audit logging:

1. **INSERT Operations**: Log new_data with full record details
2. **UPDATE Operations**: Log both old_data and new_data for change tracking
3. **DELETE Operations**: Log old_data to preserve deleted record information
4. **Admin Operations**: Special admin_ prefixed actions with enhanced details
5. **Tenant Isolation**: All audit logs include tenant_id for data separation
6. **User Tracking**: Every action linked to the authenticated user
7. **Timestamp Precision**: All operations timestamped with timezone support
8. **Compliance Ready**: Full administrative audit trail for regulatory requirements

### Status Management Workflows

#### Appointment Status Transitions
- **scheduled** → **in_progress** → **completed**
- **scheduled** → **cancelled**
- **scheduled** → **no_show**
- **completed** → **no_show** (reassignment feature for corrections)

#### Incident Report Status Transitions
- **open** → **investigating** → **closed**
- **open** → **closed** (direct resolution)

#### Operational Duty Status Transitions
- **pending** → **in_progress** → **completed**
- **pending** → **cancelled**

### Public legal documents (unauthenticated)

Markdown under `docs/` is rendered to sanitized HTML for procurement and compliance pages.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/legal/documents` | Index: `id`, `title`, `description` for each public legal doc. |
| GET | `/api/legal/document/:id` | Single document: `title`, `description`, `html` (sanitized). |
| GET | `/api/legal/document/:id/raw` | Raw markdown attachment (`text/markdown`). |

### Tenant admin — signed legal documents

Requires authenticated **tenant administrator** (`admin` with `tenantId`). Multipart field **`file`**, body fields **`documentType`** (e.g. `commercial_agreement`, `data_processing_addendum`, `baa`, `subprocessors_ack`, `other`), optional **`notes`**. Allowed MIME types match incident uploads (PDF, Word, images per server `multer` config).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/legal-signed-documents` | List uploads for the current tenant (no raw storage URLs in JSON). |
| POST | `/api/admin/legal-signed-documents` | Upload signed file; returns metadata without exposing storage URL. |
| GET | `/api/admin/legal-signed-documents/:id/download` | Stream file for the row if it belongs to the tenant. |

### Platform super-admin (global operator)

Requires an authenticated session with role `super_admin` and no `tenantId` (same guard as other `/api/super-admin/*` routes).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/super-admin/impersonation/start` | Begin support impersonation of a tenant user (`targetUserId`); updates session; writes `impersonation_events`. Cannot target `super_admin`. |
| POST | `/api/super-admin/impersonation/end` | End active impersonation; restore super-admin session subject. Requires impersonation session. |
| GET | `/api/super-admin/impersonation-events` | List impersonation events (who, target tenant/user, timestamps). |
| GET | `/api/super-admin/impersonation-events/:eventId/audit-logs` | Audit log rows tied to a specific impersonation event. |
| GET | `/api/super-admin/impersonation-audit-logs` | Tenant CRUD audit rows performed while impersonating (impersonator attribution). |
| GET | `/api/super-admin/legal-signed-documents` | List all tenant signed legal uploads (tenant name; no raw blob URLs in JSON). |
| GET | `/api/super-admin/legal-signed-documents/:id/download` | Stream any signed legal file (super admin). |
| GET | `/api/super-admin/system-status` | Database connectivity probe, Node version / `NODE_ENV` / uptime, aggregate tenant and user counts, impersonation events in the last 24 hours. |
| GET | `/api/super-admin/global-audit-logs` | Up to 500 most recent `audit_logs` rows across all tenants (joined with tenant name and actor user). |
| GET | `/api/super-admin/integrations-status` | Boolean flags only: whether Resend, Gmail SMTP, Twilio SMS, and Vercel Blob env vars are present (no secrets returned). |

See also: [SUPER_ADMIN_SYSTEM_CONSOLE.md](SUPER_ADMIN_SYSTEM_CONSOLE.md), [IMPERSONATION.md](IMPERSONATION.md).

---

**Last Updated**: April 21, 2026  
**Document revision**: 2.7.0  
**Maintained by**: MineAid Development Team