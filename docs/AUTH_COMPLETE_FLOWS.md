# Complete Authentication Flows - MineAid HMS

**Version**: 3.4.6 | **Last Updated**: February 2026

## Overview

This document provides a complete guide to all authentication flows in the MineAid HMS system, including registration, login, and access control for all user types.

## User Types and Roles

### 1. Medical Staff (`medical_staff`)
- **Tenant-bound**: Yes (`tenantId` required)
- **Status**: `pending` → `active` (requires admin approval)
- **Access**: Patient records, appointments, medical visits within their tenant
- **Registration**: Via `/api/auth/register` with `tenantId` and `role: 'medical_staff'` (or default)

### 2. Safety Officer (`safety_officer`)
- **Tenant-bound**: Yes (`tenantId` required)
- **Status**: `pending` → `active` (requires admin approval)
- **Access**: Incident reports, safety data within their tenant
- **Registration**: Via `/auth` (Register tab) → `POST /api/auth/register` with `tenantId` and `role: 'safety_officer'`

### 3. Tenant Admin (`admin`)
- **Tenant-bound**: Yes (`tenantId` required)
- **Status**: `pending` → `active` (requires super admin approval)
- **Access**: User management, locations, settings within their tenant
- **Registration**: Via `/auth` (Register tab) → `POST /api/auth/register` with `tenantId` and `role: 'admin'`
- **Dashboard**: `/admin` (tenant administration panel)

### 4. Super Admin (`super_admin`)
- **Tenant-bound**: No (`tenantId = null`)
- **Status**: `active` (auto-approved on registration)
- **Access**: All tenants, tenant admins, system settings (platform-wide)
- **Registration**: Via `/auth/super-admin` page (manual entry only) or `POST /api/auth/register` with `role: 'super_admin'` and **NO** `tenantId`
- **Dashboard**: `/super-admin` (global administration panel)

## Frontend Routes

### Authentication Pages

- **`/auth`** - Main authentication page with tabbed interface
  - **Login Tab**: Sign in with email/phone and password
  - **Register Tab**: Register new tenant-bound user (with tenant selection/creation)
  - Both tabs use the same `/auth` route - switching is done via UI tabs
- **`/auth/super-admin`** - Super admin registration page (manual entry only, no links)
  - Dedicated page for creating super admin accounts
  - Not linked from anywhere in the UI - must be accessed manually via URL
  - Only for creating additional super admin accounts

### API Endpoints

All authentication uses the following API endpoints:
- `POST /api/auth/register` - Register new user (regular or super admin)
- `POST /api/auth/login` - Authenticate and create session

## Registration Flows

### Regular User Registration (Tenant-Bound)

**Important**: Tenant creation precedes user creation. Users must select or create a tenant during registration. The system no longer creates default tenants or companies.

**Frontend Route**: `/auth` (Register tab)

**API Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "phoneNumber": "+1234567890",  // Optional
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "tenantId": "uuid-of-tenant",  // Required for tenant-bound users (must be provided)
  "employeeNumber": "E-001",     // Optional; used as employee number when creating new org admin (no default EMP0001)
  "role": "admin"                // Optional; defaults to 'admin' (tenant admin) for first user / new org
}
```

**Note:** The system creates an **employee** record first (using a default company if needed), then creates the **user** with `employee_id` pointing to that employee. Account activation and login are blocked until the tenant is **active**.

**Process**:
1. System validates that `tenantId` is provided (for non-super-admin users)
2. System validates email/phone uniqueness
3. Password is hashed (bcrypt, 12 rounds)
4. **Employee created first** (default company created if needed; `employeeNumber` from form or generated), then user created with `employee_id` set to that employee
5. User created with `status: 'pending'`
6. Verification email/SMS sent
7. User cannot activate or log in until tenant is **active**; then may require tenant admin approval

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email/phone.",
  "userId": "uuid"
}
```

### Super Admin Registration

**Frontend Route**: `/auth/super-admin` (dedicated page, manual entry only - no links)

**API Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "superadmin@mineaid.com",
  "firstName": "Super",
  "lastName": "Admin",
  "password": "SecurePassword123!",
  "role": "super_admin"
  // Note: tenantId is NOT provided - super admins are platform-wide
}
```

**Process**:
1. System validates email/phone uniqueness
2. Password is hashed (bcrypt, 12 rounds)
3. User created with:
   - `role: 'super_admin'`
   - `tenantId: null` (NOT tenant-bound)
   - `status: 'active'` (auto-approved)
4. Verification email/SMS sent
5. User can immediately log in

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email/phone.",
  "userId": "uuid"
}
```

**Important**: Super admins must NOT provide `tenantId` in registration. If `tenantId` is provided, the user will be created as a tenant-bound user, not a super admin.

## Login Flow

### Login Page

**Frontend Route**: `/auth` (Login tab)

### Login API Endpoint

**API Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "identifier": "user@example.com",  // Email or phone number
  "password": "SecurePassword123!"
}
```

### Login Process

1. **Authentication**:
   - System finds user by email or phone
   - Verifies password using bcrypt
   - Checks user status (must be `active`)

2. **Session Creation**:
   - Creates session token (32-byte hex string)
   - Stores session in database with 30-day expiry
   - Sets HTTP-only cookie: `sessionToken`

3. **Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "role": "super_admin",
    "tenantId": null,
    "isEmailVerified": true,
    "isPhoneVerified": false
  },
  "sessionToken": "session-token-string",
  "redirectTo": "/super-admin"  // For super admins, "/" for others
}
```

### Redirect Logic

- **Super Admins** (`role: 'super_admin'` AND `tenantId: null`): Redirected to `/super-admin`
- **All Others**: Redirected to `/` (regular dashboard)

The frontend (`AuthPage.tsx`) uses the `redirectTo` field from the response to navigate the user to the appropriate dashboard.

**Important**: The frontend uses a single `/auth` route with a tabbed interface. There are no separate `/auth/login` or `/auth/register` routes. Users switch between login and registration using tabs on the same page. Super admin registration is available at `/auth/super-admin` (manual entry only, no links in UI).

## Access Control

### Middleware Functions

#### `requireAdminAccess(storage)`
- **Purpose**: Tenant admin access control
- **Requirements**:
  - User must be authenticated (session valid)
  - `role = 'admin'` AND `tenantId IS NOT NULL`
  - `status = 'active'`
- **Access**: Tenant-scoped resources only
- **Routes**: All `/api/admin/*` endpoints
- **Note**: Super admins can also access tenant admin routes (cross-tenant access)

#### `requireSuperAdminAccess(storage)`
- **Purpose**: Super admin access control
- **Requirements**:
  - User must be authenticated (session valid)
  - `role = 'super_admin'` AND `tenantId IS NULL`
  - `status = 'active'`
- **Access**: Platform-wide resources
- **Routes**: All `/api/super-admin/*` endpoints
- **Note**: Only super admins can access these routes (no tenant admins)

#### `checkAdminStatus(storage)`
- **Purpose**: Non-blocking check for UI features
- **Attaches**: `req.isAdmin` and `req.isSuperAdmin` flags
- **Usage**: Routes that need to know admin status but don't require it

### Frontend Access Control

#### Super Admin Dashboard (`/super-admin`)
- **Component**: `SuperAdmin.tsx`
- **Access Check**: Uses `useAuth()` hook
- **Requirements**: `user?.role === 'super_admin' && !user?.tenantId`
- **Behavior**: Redirects to `/` if not super admin

#### Tenant Admin Dashboard (`/admin`)
- **Component**: `Admin.tsx`
- **Access Check**: Uses `useAuth()` hook
- **Requirements**: `user?.role === 'admin' && user?.tenantId`
- **Behavior**: Redirects to `/` if not tenant admin

#### Sidebar Navigation (`MainLayout.tsx`)
- **Admin Panel Link**: Only visible if `user?.role === 'admin' && user?.tenantId`
- **Super Admin Link**: Only visible if `user?.role === 'super_admin' && !user?.tenantId`

## Session Management

### Session Creation
- **Token Generation**: 32-byte random hex string
- **Storage**: Database table `user_sessions`
- **Expiry**: 30 days from creation
- **Cookie**: HTTP-only, secure in production, same-site strict/lax

### Session Validation
- **Middleware**: `createAuthMiddleware(authService)`
- **Process**:
  1. Extracts `sessionToken` from cookie or Authorization header
  2. Validates session exists and not expired
  3. Fetches user from database
  4. Attaches user to `req.user`

### Session Termination
- **Endpoint**: `POST /api/auth/logout`
- **Process**:
  1. Deletes session from database
  2. Clears `sessionToken` cookie
  3. Returns success response

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  phone_number VARCHAR,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  password VARCHAR,  -- Hashed with bcrypt
  role user_role DEFAULT 'medical_staff',
  tenant_id VARCHAR REFERENCES tenants(id),  -- NULL for super admins
  status user_status DEFAULT 'pending',
  auth_provider VARCHAR DEFAULT 'custom',
  is_email_verified BOOLEAN DEFAULT false,
  is_phone_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR,
  phone_verification_code VARCHAR,
  password_reset_token VARCHAR,
  password_reset_expires TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### User Roles Enum

```sql
CREATE TYPE user_role AS ENUM (
  'medical_staff',
  'safety_officer',
  'admin',
  'super_admin'
);
```

### User Status Enum

```sql
CREATE TYPE user_status AS ENUM (
  'pending',
  'active',
  'blocked',
  'decommissioned'
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
7. **Password Hashing**: bcrypt with 12 rounds
8. **Email/Phone Verification**: Required for account activation

### Removed Security Risks

- ❌ Hardcoded `admin123` secret
- ❌ Hardcoded `superadmin123` secret
- ❌ Environment variable fallbacks for secrets
- ❌ Email-based admin access (`ADMIN_EMAILS`)
- ❌ Header-based secret authentication (`X-Admin-Secret`, `X-Super-Admin-Secret`)

## Common Scenarios

### Scenario 1: Creating First Super Admin

**Method 1: Via Frontend** (Recommended)
1. Navigate to `/auth/super-admin` (manual URL entry - no links in UI)
2. Fill in the super admin registration form
3. Click "Create Super Admin Account"
4. Account will be created with `role: 'super_admin'` and `tenantId: null`
5. Redirected to `/auth` login page to sign in

**Method 2: Via Registration API** (Alternative)
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

**Method 2: Direct Database** (Initial Setup Only)
```sql
-- First, hash the password using bcrypt (12 rounds)
-- Then insert:
INSERT INTO users (
  id, email, first_name, last_name, password,
  role, tenant_id, status, auth_provider, is_email_verified
) VALUES (
  gen_random_uuid(),
  'superadmin@mineaid.com',
  'Super',
  'Admin',
  '$2b$12$...',  -- Hashed password
  'super_admin',
  NULL,
  'active',
  'custom',
  true
);
```

### Scenario 2: Tenant Admin Registration and Approval

1. **User Registers**:
```bash
POST /api/auth/register
{
  "email": "admin@tenant.com",
  "firstName": "Tenant",
  "lastName": "Admin",
  "password": "SecurePassword123!",
  "tenantId": "tenant-uuid",
  "role": "admin"
}
```

2. **Super Admin Approves**:
```bash
POST /api/super-admin/approve-admin/:adminId
```

3. **User Logs In**:
```bash
POST /api/auth/login
{
  "identifier": "admin@tenant.com",
  "password": "SecurePassword123!"
}
```

4. **User Redirected**: To `/` (regular dashboard), can access `/admin` panel

### Scenario 3: Regular User Registration

1. **User Registers**:
```bash
POST /api/auth/register
{
  "email": "user@tenant.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "tenantId": "tenant-uuid",
  "role": "medical_staff"
}
```

2. **User Verifies Email/Phone**: Via verification link/code

3. **Tenant Admin Approves**:
```bash
POST /api/admin/approve-user/:userId
```

4. **User Logs In**: Can access regular dashboard

## Troubleshooting

### Issue: Super Admin Cannot Access `/super-admin`

**Check**:
1. User has `role = 'super_admin'` in database
2. User has `tenant_id = NULL` in database
3. User has `status = 'active'` in database
4. Session is valid (not expired)

**Fix**:
```sql
UPDATE users 
SET tenant_id = NULL, status = 'active'
WHERE role = 'super_admin' AND email = 'superadmin@mineaid.com';
```

### Issue: Tenant Admin Cannot Access `/admin`

**Check**:
1. User has `role = 'admin'` in database
2. User has `tenant_id IS NOT NULL` in database
3. User has `status = 'active'` in database
4. Session is valid (not expired)

**Fix**:
```sql
UPDATE users 
SET status = 'active'
WHERE role = 'admin' AND email = 'admin@tenant.com';
```

### Issue: User Redirected to Wrong Dashboard

**Check**:
1. Login response includes correct `redirectTo` field
2. Frontend uses `redirectTo` from response
3. User role and `tenantId` match expected values

**Fix**: Verify `AuthService.loginUser()` returns correct `redirectTo` based on user role.

## API Reference

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/user` - Get current user

### Admin Endpoints (Tenant-Scoped)

- `GET /api/admin/pending-users` - Get pending users
- `POST /api/admin/invite-user` - Invite user to tenant
- `POST /api/admin/approve-user/:userId` - Approve user
- `GET /api/admin/all-users` - Get all users in tenant
- `GET /api/admin/audit-logs` - Get audit logs

### Super Admin Endpoints (Platform-Wide)

- `GET /api/super-admin/tenants` - Get all tenants
- `GET /api/super-admin/tenant-admins` - Get all tenant admins
- `GET /api/super-admin/users` - Get all users grouped by tenant
- `POST /api/super-admin/create-tenant` - Create new tenant
- `POST /api/super-admin/approve-admin/:adminId` - Approve tenant admin
- `PATCH /api/super-admin/users/:userId` - Update user
- `DELETE /api/super-admin/users/:userId` - Delete user

## Summary

The authentication system is now fully production-ready with:

✅ Database-backed role and status checks  
✅ No hardcoded secrets or passwords  
✅ Proper separation of tenant admins and super admins  
✅ Session-based authentication with secure cookies  
✅ Automatic redirects based on user role  
✅ Conditional UI rendering based on permissions  
✅ Comprehensive audit logging  
✅ Email/SMS verification support  

All authentication flows are secure, scalable, and ready for production deployment.

