# MineAid HMS - Production-Ready Authentication System

**Version**: 3.6.0 | **Last Updated**: May 2026

## Overview

The authentication system has been completely refactored to be production-ready with database-backed authorization, removing all hardcoded secrets and placeholder values. The system now properly separates tenant administrators from super administrators.

## Terminology (4.26+)

| Term | Meaning |
|------|---------|
| **Staff auth** | Email/password (and optional MFA) for HMS users via `AuthService`, `authMiddleware`, and `user_sessions`. |
| **OIDC** | Optional Google / Microsoft sign-in (`authProvider` `google` / `microsoft`). |

**Deprecated names (do not use in new code or docs):** “Custom auth”, `customAuth`, `CustomAuthService`, `customAuthMiddleware`. The DB value `authProvider = 'custom'` is **legacy** — use `LEGACY_STAFF_AUTH_PROVIDER` in code (`server/modules/auth/auth.constants.ts`); retained in the database for existing rows only.

## Architecture

### User Roles

1. **Medical Staff** (`medical_staff`)
   - Regular users within a tenant
   - Can access patient records, appointments, medical visits
   - Tenant-bound (has `tenantId`)

2. **Safety Officer** (`safety_officer`)
   - Safety-focused users within a tenant
   - Can access incident reports, safety data
   - Tenant-bound (has `tenantId`)

3. **Tenant Admin** (`admin`)
   - Administrators for a specific tenant organization
   - Can manage users, locations, settings within their tenant
   - Tenant-bound (has `tenantId`)
   - Can only access resources within their own tenant

4. **Super Admin** (`super_admin`)
   - Platform-wide administrators
   - Can manage all tenants, tenant admins, and system settings
   - **NOT tenant-bound** (`tenantId = null`)
   - Has access to global management dashboard

## Authentication Flow

### Registration

#### Regular Users (Tenant-Bound)
1. User navigates to `/auth` and selects the "Register" tab
2. **Tenant creation precedes user creation** - Users must select or create a tenant during registration
3. User fills registration form and submits
4. Frontend calls `POST /api/auth/register` with `tenantId` (required for tenant-bound users)
5. Role defaults to **`admin`** (tenant admin) for the first user when creating a new organization; otherwise `medical_staff` or can be set to `admin`/`safety_officer`
6. **Employee number**: Registration form includes an optional "Employee number" field; when provided, it is used as the new employee record's number (otherwise the system generates one)
7. Account status: `pending` (requires tenant admin approval; tenant must be **active** before the user can activate or log in)
8. User receives verification email/SMS

**Note:** The system no longer creates default tenants or companies. Users must explicitly select or create a tenant during the registration process.

#### Super Admin Registration
1. Super admin navigates to `/auth/super-admin` (manual URL entry - no links in UI)
2. User fills super admin registration form
3. Frontend calls `POST /api/auth/register` with `role: 'super_admin'`
4. **Important**: `tenantId` must be `null` or omitted
5. Account status: `active` (auto-approved, no tenant admin needed)
6. Super admins are not tied to any tenant

**Example Registration Request for Super Admin:**
```json
POST /api/auth/register
{
  "email": "superadmin@mineaid.com",
  "firstName": "Super",
  "lastName": "Admin",
  "password": "SecurePassword123!",
  "role": "super_admin"
  // Note: tenantId is NOT provided - super admins are platform-wide
}
```

### Login

1. User logs in via `/api/auth/login` with email/phone and password
2. System validates credentials against database
3. **Tenant-bound users**: Login is blocked if the user's tenant is not **active** (message: "Your organization has not been activated yet")
4. Creates session token (**12-hour absolute** max, **30-minute idle** timeout by default — configurable per tenant under **Settings → Security**)
5. **Session validation**: On every request, idle and absolute limits are enforced; expired sessions return 401. Tenant-bound users' sessions are also invalidated if their tenant becomes inactive.
6. **Optional MFA**: When enabled for the tenant (or for individual users), login returns an MFA challenge before a full session is issued. See [SESSION_SECURITY_AND_MFA.md](./SESSION_SECURITY_AND_MFA.md).
7. Returns user data with `redirectTo` hint:
   - Super admins: `/super-admin`
   - All others: `/` (regular dashboard)

**Login Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "super_admin",
    "tenantId": null,
    ...
  },
  "sessionToken": "session-token",
  "redirectTo": "/super-admin"  // For super admins
}
```

## Authorization Middleware

### Database-Backed Checks

All authorization checks query the database to ensure:
- **Fresh data**: Role/status checked on every request
- **Status validation**: Only `active` users can access protected routes
- **No hardcoded secrets**: All checks are database-backed

### Middleware Functions

#### `requireAdminAccess(storage)`
- **Purpose**: Tenant admin access
- **Requirements**: 
  - `role = 'admin'` AND `tenantId IS NOT NULL`
  - `status = 'active'`
- **Access**: Tenant-scoped resources only
- **Usage**: `/api/admin/*` routes

#### `requireSuperAdminAccess(storage)`
- **Purpose**: Super admin access
- **Requirements**:
  - `role = 'super_admin'` AND `tenantId IS NULL`
  - `status = 'active'`
- **Access**: Platform-wide resources
- **Usage**: `/api/super-admin/*` routes

#### `checkAdminStatus(storage)`
- **Purpose**: Non-blocking check for UI features
- **Attaches**: `req.isAdmin` and `req.isSuperAdmin` flags
- **Usage**: Routes that need to know admin status but don't require it

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user (regular or super admin).

**Frontend Routes:**
- Regular users: `/auth` (Register tab)
- Super admins: `/auth/super-admin` (dedicated page, manual entry only - no links in UI)

**Request Body:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "+1234567890",  // Optional
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "tenantId": "uuid",  // Required for tenant-bound users, omit for super admin
  "role": "super_admin"  // Optional - can be: medical_staff, safety_officer, admin, super_admin
}
```

**Super Admin Registration:**
- Navigate to `/auth/super-admin` (manual URL entry - no links in UI)
- Set `role: "super_admin"`
- **Do NOT provide `tenantId`** (or set to `null`)
- Account will be auto-approved (`status: 'active'`)

#### `POST /api/auth/login`
Authenticate user and create session.

**Frontend Route:** `/auth` (Login tab)

**Request Body:**
```json
{
  "identifier": "user@example.com",  // Email or phone
  "password": "SecurePassword123!"
}
```

**Response:**
- Includes `redirectTo` field for frontend routing
- Super admins get `redirectTo: "/super-admin"`
- Regular users get `redirectTo: "/"`

**Important**: The frontend uses a single `/auth` route with a tabbed interface. There are no separate `/auth/login` or `/auth/register` routes. Users switch between login and registration using tabs on the same page.

### Admin Endpoints (Tenant-Scoped)

All `/api/admin/*` routes require:
- `authMiddleware` (session authentication)
- `requireAdmin` (tenant admin check)

**Examples:**
- `GET /api/admin/pending-users` - Get pending users in tenant
- `POST /api/admin/invite-user` - Invite user to tenant
- `POST /api/admin/approve-user/:userId` - Approve user in tenant

### Super Admin Endpoints (Platform-Wide)

All `/api/super-admin/*` routes require:
- `authMiddleware` (session authentication)
- `requireSuperAdmin` (super admin check)

**Examples:**
- `GET /api/super-admin/tenants` - Get all tenants
- `GET /api/super-admin/tenant-admins` - Get all tenant admins
- `GET /api/super-admin/users` - Get all users grouped by tenant
- `POST /api/super-admin/create-tenant` - Create new tenant
- `POST /api/super-admin/approve-admin/:adminId` - Approve tenant admin

## Frontend Implementation

### Super Admin Dashboard Access

1. **Route Protection**: `/super-admin` route checks user role
2. **Auto-Redirect**: Super admins are redirected to `/super-admin` on login
3. **Sidebar Visibility**: Super admin link only shows for users with `role='super_admin'` and `tenantId=null`

### Component Updates

#### `SuperAdmin.tsx`
- **Removed**: Secret-based authentication (`X-Super-Admin-Secret` header)
- **Added**: Session-based authentication using `useAuth()` hook
- **Access Control**: Redirects to login if not authenticated or not super admin
- **API Calls**: Uses standard `apiRequest()` with session cookies

#### `MainLayout.tsx`
- **Separated**: Admin panel (tenant admins) from Super Admin panel
- **Conditional Rendering**:
  - Admin Panel: Shows for `role='admin'` with `tenantId`
  - Super Admin Panel: Shows for `role='super_admin'` with `tenantId=null`

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  role user_role DEFAULT 'medical_staff',  -- Can be: medical_staff, safety_officer, admin, super_admin
  tenant_id VARCHAR REFERENCES tenants(id),  -- NULL for super admins
  status user_status DEFAULT 'pending',  -- Must be 'active' for access
  ...
);
```

### Key Constraints

1. **Super Admins**: `role='super_admin'` AND `tenant_id IS NULL`
2. **Tenant Admins**: `role='admin'` AND `tenant_id IS NOT NULL`
3. **Status**: All admin routes require `status='active'`

## Security Features

### Production-Ready Security

1. **No Hardcoded Secrets**: All authentication is database-backed
2. **Fresh Data Checks**: User role/status verified on every request
3. **Tenant Isolation**: Tenant admins can only access their tenant's data
4. **Super Admin Separation**: Super admins are completely separate from tenant context
5. **Status Validation**: Only active users can access protected routes
6. **Session-Based Auth**: Uses secure HTTP-only cookies

### Removed Security Risks

- ❌ Hardcoded `admin123` secret
- ❌ Hardcoded `superadmin123` secret
- ❌ Environment variable fallbacks for secrets
- ❌ Email-based admin access (removed `ADMIN_EMAILS`)
- ❌ Header-based secret authentication

## Migration Guide

### For Existing Installations

1. **Update Existing Super Admins**:
   ```sql
   -- Ensure super admins have null tenantId
   UPDATE users 
   SET tenant_id = NULL 
   WHERE role = 'super_admin' AND tenant_id IS NOT NULL;
   ```

2. **Verify Super Admin Status**:
   ```sql
   -- Check all super admins
   SELECT id, email, role, tenant_id, status 
   FROM users 
   WHERE role = 'super_admin';
   -- All should have tenant_id = NULL
   ```

3. **Update User Status**:
   ```sql
   -- Activate super admin accounts
   UPDATE users 
   SET status = 'active' 
   WHERE role = 'super_admin' AND status != 'active';
   ```

### Creating First Super Admin

**Option 1: Via Registration API**
```bash
curl -X POST http://localhost:17009/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@mineaid.com",
    "firstName": "Super",
    "lastName": "Admin",
    "password": "SecurePassword123!",
    "role": "super_admin"
  }'
```

**Option 2: Direct Database Insert** (for initial setup)
```sql
INSERT INTO users (
  id, email, first_name, last_name, password, 
  role, tenant_id, status, auth_provider, is_email_verified
) VALUES (
  gen_random_uuid(),
  'superadmin@mineaid.com',
  'Super',
  'Admin',
  '$2b$12$...',  -- Hashed password (use bcrypt)
  'super_admin',
  NULL,  -- Super admins have no tenant
  'active',
  'custom',
  true
);
```

## User Flows

### Super Admin Flow

1. **Registration**:
   - Register with `role: 'super_admin'` and no `tenantId`
   - Account is auto-approved (`status: 'active'`)

2. **Login**:
   - Login with email/phone and password
   - System redirects to `/super-admin` dashboard

3. **Access**:
   - Can access `/super-admin` route
   - Can manage all tenants, tenant admins, and users
   - Sidebar shows "Super Administration" section

### Tenant Admin Flow

1. **Registration**:
   - Register with `tenantId` and `role: 'admin'`
   - Account status: `pending` (requires super admin approval)

2. **Approval**:
   - Super admin approves via `/api/super-admin/approve-admin/:adminId`
   - Status changes to `active`

3. **Login**:
   - Login with email/phone and password
   - System redirects to `/` (regular dashboard)

4. **Access**:
   - Can access `/admin` route
   - Can manage users, locations, settings within their tenant
   - Sidebar shows "Administration" section

## Troubleshooting

### Super Admin Cannot Access Dashboard

**Check:**
1. User has `role = 'super_admin'` in database
2. User has `tenant_id = NULL` in database
3. User has `status = 'active'` in database
4. Session token is valid (check cookies)

**Fix:**
```sql
UPDATE users 
SET role = 'super_admin', tenant_id = NULL, status = 'active'
WHERE email = 'superadmin@mineaid.com';
```

### Tenant Admin Cannot Access Admin Panel

**Check:**
1. User has `role = 'admin'` in database
2. User has `tenant_id IS NOT NULL` in database
3. User has `status = 'active'` in database

**Fix:**
```sql
UPDATE users 
SET role = 'admin', status = 'active'
WHERE email = 'admin@tenant.com';
-- Ensure tenant_id is set to their tenant
```

## Best Practices

1. **Super Admin Creation**: Create super admins through registration API, not direct DB inserts
2. **Role Management**: Never manually set `role='super_admin'` for tenant users
3. **Tenant Isolation**: Always verify `tenantId` matches user's tenant for tenant admin operations
4. **Status Checks**: Always verify `status='active'` before granting access
5. **Audit Logging**: All admin operations are logged with user ID and tenant context

## API Response Examples

### Current User Endpoint

```json
GET /api/auth/user
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "super_admin",
  "tenantId": null,
  "isAdmin": true,
  "isSuperAdmin": true,
  ...
}
```

### Super Admin Routes

All super admin routes now use session-based authentication. The frontend automatically includes session cookies with requests.

## Changes from Previous Version

### Removed
- ❌ `X-Super-Admin-Secret` header authentication
- ❌ `X-Admin-Secret` header authentication
- ❌ `ADMIN_SECRET` environment variable
- ❌ `SUPER_ADMIN_SECRET` environment variable
- ❌ `ADMIN_EMAILS` environment variable
- ❌ Hardcoded default secrets (`admin123`, `superadmin123`)

### Added
- ✅ Database-backed role checks
- ✅ Fresh user data on every request
- ✅ Proper super admin/tenant admin separation
- ✅ Session-based authentication for all admin routes
- ✅ Automatic redirect to super admin dashboard on login
- ✅ Conditional sidebar rendering based on role

### Updated
- ✅ All admin middleware now requires storage dependency
- ✅ Super admin routes use `requireSuperAdmin` middleware
- ✅ Frontend uses `useAuth()` hook for authentication
- ✅ Login response includes `redirectTo` field

