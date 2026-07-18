# Authentication System Migration Guide

## Summary of Changes

The authentication system has been completely refactored to be production-ready:

### ✅ Completed Changes

1. **Removed Hardcoded Secrets**
   - ❌ Removed `admin123` and `superadmin123` hardcoded passwords
   - ❌ Removed `ADMIN_SECRET` and `SUPER_ADMIN_SECRET` environment variables
   - ❌ Removed `ADMIN_EMAILS` environment variable
   - ❌ Removed `X-Super-Admin-Secret` header authentication

2. **Database-Backed Authentication**
   - ✅ All admin checks now query the database
   - ✅ User role and status verified on every request
   - ✅ Fresh data ensures security and accuracy

3. **Super Admin Routes Restored**
   - ✅ All `/api/super-admin/*` routes are active
   - ✅ Protected by `requireSuperAdmin` middleware
   - ✅ Uses session-based authentication

4. **Frontend Updates**
   - ✅ `SuperAdmin.tsx` uses session-based auth (removed secret input)
   - ✅ `MainLayout.tsx` shows super admin link only to super admins
   - ✅ Login redirects super admins to `/super-admin` dashboard

5. **Registration Flow**
   - ✅ Super admins can register with `role: 'super_admin'` and no `tenantId`
   - ✅ Super admins are auto-approved (`status: 'active'`)

## Database Updates Required

### Check Existing Super Admins

Run this SQL to verify super admins have correct setup:

```sql
-- Check all super admins
SELECT id, email, role, tenant_id, status 
FROM users 
WHERE role = 'super_admin';

-- All should have tenant_id = NULL
```

### Fix Existing Super Admins

If any super admins have a `tenant_id`, update them:

```sql
-- Ensure super admins have null tenantId
UPDATE users 
SET tenant_id = NULL 
WHERE role = 'super_admin' AND tenant_id IS NOT NULL;

-- Activate super admin accounts
UPDATE users 
SET status = 'active' 
WHERE role = 'super_admin' AND status != 'active';
```

### Schema Verification

The database schema already supports:
- ✅ `role` enum includes `'super_admin'`
- ✅ `tenant_id` can be `NULL` (for super admins)
- ✅ `status` enum includes `'active'`, `'pending'`, `'blocked'`, `'decommissioned'`

**No schema migrations needed** - the existing schema is correct.

## Creating Super Admins

### Method 1: Via Registration API (Recommended)

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

**Important**: Do NOT include `tenantId` in the request.

### Method 2: Direct Database (Initial Setup Only)

```sql
-- Hash password first using bcrypt (12 rounds)
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
  NULL,  -- Super admins have no tenant
  'active',
  'custom',
  true
);
```

## User Flows

### Super Admin Flow

1. **Registration**: Register with `role: 'super_admin'`, no `tenantId`
2. **Login**: Login with email/phone and password
3. **Redirect**: Automatically redirected to `/super-admin` dashboard
4. **Access**: Can manage all tenants, tenant admins, and users

### Tenant Admin Flow

1. **Registration**: Register with `tenantId` and `role: 'admin'`
2. **Approval**: Super admin approves via `/api/super-admin/approve-admin/:adminId`
3. **Login**: Login with email/phone and password
4. **Redirect**: Redirected to `/` (regular dashboard)
5. **Access**: Can manage users and settings within their tenant

## Testing

### Test Super Admin Access

1. Register a super admin:
   ```bash
   POST /api/auth/register
   {
     "email": "test-superadmin@test.com",
     "firstName": "Test",
     "lastName": "SuperAdmin",
     "password": "Test123456!",
     "role": "super_admin"
   }
   ```

2. Login:
   ```bash
   POST /api/auth/login
   {
     "identifier": "test-superadmin@test.com",
     "password": "Test123456!"
   }
   ```

3. Verify redirect: Should redirect to `/super-admin`

4. Access super admin routes:
   ```bash
   GET /api/super-admin/tenants
   GET /api/super-admin/tenant-admins
   GET /api/super-admin/users
   ```

### Test Tenant Admin Access

1. Register a tenant admin:
   ```bash
   POST /api/auth/register
   {
     "email": "test-admin@test.com",
     "firstName": "Test",
     "lastName": "Admin",
     "password": "Test123456!",
     "role": "admin",
     "tenantId": "existing-tenant-id"
   }
   ```

2. Super admin approves:
   ```bash
   POST /api/super-admin/approve-admin/:adminId
   ```

3. Login and verify redirect to `/`

## Troubleshooting

### Super Admin Cannot Access Dashboard

**Symptoms**: Redirected to login or regular dashboard

**Fix**:
```sql
UPDATE users 
SET role = 'super_admin', tenant_id = NULL, status = 'active'
WHERE email = 'superadmin@mineaid.com';
```

### Super Admin Link Not Showing in Sidebar

**Check**:
- User has `role = 'super_admin'`
- User has `tenant_id = NULL`
- User is logged in

**Fix**: Ensure both conditions are met in database

### 403 Forbidden on Super Admin Routes

**Check**:
- User is authenticated (has valid session)
- User has `role = 'super_admin'`
- User has `tenant_id = NULL`
- User has `status = 'active'`

**Fix**: Verify all conditions in database

## Environment Variables

### Removed (No Longer Needed)

- ❌ `ADMIN_SECRET`
- ❌ `SUPER_ADMIN_SECRET`
- ❌ `ADMIN_EMAILS`

### Still Required

- ✅ `DATABASE_URL` - Database connection
- ✅ `SESSION_SECRET` - Session encryption (if using sessions)
- ✅ Email service credentials (SendGrid, etc.)

## API Changes

### Changed Endpoints

- All `/api/super-admin/*` routes now require:
  - Session authentication (via `authMiddleware`)
  - Super admin role verification (via `requireSuperAdmin`)

### Removed Headers

- ❌ `X-Super-Admin-Secret` - No longer accepted
- ❌ `X-Admin-Secret` - No longer accepted

### New Response Fields

- `POST /api/auth/login` now includes `redirectTo` field:
  ```json
  {
    "user": {...},
    "sessionToken": "...",
    "redirectTo": "/super-admin"  // For super admins
  }
  ```

## Frontend Changes

### SuperAdmin.tsx

**Before**: Secret-based authentication with dialog
**After**: Session-based authentication, redirects if not super admin

### MainLayout.tsx

**Before**: Showed super admin link to all admins
**After**: 
- Admin Panel: Shows for `role='admin'` with `tenantId`
- Super Admin Panel: Shows for `role='super_admin'` with `tenantId=null`

### AuthPage.tsx

**Before**: Always redirected to `/`
**After**: Redirects based on `redirectTo` field or user role

## Security Improvements

1. ✅ **No Hardcoded Secrets**: All authentication is database-backed
2. ✅ **Fresh Data**: User role/status checked on every request
3. ✅ **Proper Separation**: Super admins completely separate from tenant context
4. ✅ **Status Validation**: Only active users can access protected routes
5. ✅ **Session-Based**: Uses secure HTTP-only cookies

## Next Steps

1. **Update Existing Super Admins**: Run SQL to fix any existing super admins
2. **Test Registration**: Create a test super admin via API
3. **Test Login Flow**: Verify redirect works correctly
4. **Test Access Control**: Verify super admin routes are protected
5. **Update Documentation**: Update any user-facing docs with new flows

