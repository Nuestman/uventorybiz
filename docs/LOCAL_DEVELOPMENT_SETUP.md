# Local Development Setup Guide

## Overview

This guide documents how to set up **MineAid HMS** for local development. The system runs on Vercel in production and uses Neon PostgreSQL for the database. For local development, you can use either a local PostgreSQL database or connect directly to a Neon development branch.

---

## Key Features

### 1. **Staff authentication**

The system uses email/password authentication:
- User registration with email/phone
- Secure password hashing with bcrypt
- Session management with PostgreSQL
- Email verification support
- Password reset functionality

---

### 2. **Database Configuration**

**File:** `server/env.ts`

Environment loader that handles `.env` files in TypeScript ESM modules:

```typescript
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

// DATABASE_URL should be set to Neon connection string (or local PostgreSQL)
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env file.');
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  USING_NEON_DATABASE: process.env.DATABASE_URL.includes('neon.tech'),
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN, // Optional
  FRONTEND_URL: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.FRONTEND_URL || 'http://localhost:17009',
} as const;
```

**Files:**
- `server/db.ts` - Database connection
- `server/env.ts` - Environment configuration
- `drizzle.config.ts` - Drizzle Kit configuration (`out: ./drizzle`, schema `./shared/schema.ts`)

> **Database migrations:** See **[docs/DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)** — structure via `db:drizzle-migrate`, seeds via `db:seed`. Use **`.env` only** (not `.env.local`).

---

### 3. **Database Options**

You have two options for local development:

**Option A: Local PostgreSQL (Recommended for Development)**

```bash
# Create database
psql -U postgres
CREATE DATABASE mineaid_hms;
\q

# Apply schema (Drizzle journal: 0000 → latest)
npm run db:drizzle-migrate
npm run db:seed
```

**Connection String Format:**
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/mineaid_hms
```

**Option B: Neon Development Branch (Shared Development Database)**

Use a Neon development branch for shared development:
```
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require
```

**Recommendation**: Use local PostgreSQL for development to avoid conflicts with other developers.

---

## Environment Variables

### Minimal Configuration (Local Development)

Create a `.env` file in the project root:

```env
# Database (Required)
# Option 1: Local PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mineaid_hms

# Option 2: Neon Development Branch
# DATABASE_URL=postgresql://user:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# Session Security (Required)
SESSION_SECRET=your-super-secure-random-string-min-32-characters

# Environment (Required)
NODE_ENV=development

# Frontend URL (Required)
FRONTEND_URL=http://localhost:17009

# Vercel Blob Storage (Optional - for testing file uploads)
# BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Email (Optional - for sending invitations)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

### Production Configuration (Vercel)

In Vercel Dashboard → Environment Variables:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# Session Security (Required)
SESSION_SECRET=your-production-secret-256-bits

# Environment (Required)
NODE_ENV=production

# Vercel Blob Storage (Recommended)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Frontend URL (Auto-detected from VERCEL_URL, or set custom domain)
FRONTEND_URL=https://your-domain.vercel.app

# Email Service (Required for notifications)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

---

## Running Locally

### Prerequisites

1. **PostgreSQL 17+** installed locally
2. **Node.js 20+** installed
3. **npm** or **yarn** package manager

### Setup Steps

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (see above)
# Create manually or use:
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mineaid_hms
SESSION_SECRET=your-super-secure-random-string-min-32-characters
NODE_ENV=development
EOF

# 3. Create database
psql -U postgres -c "CREATE DATABASE mineaid_hms;"

# 4. Apply schema
npm run db:drizzle-migrate
npm run db:seed

# 5. Start development server
npm run dev
```

### Access Points

- **Frontend:** http://localhost:5173
- **API:** http://localhost:17009/api
- **Staff auth:** Email/password registration and login

---

## Authentication Flows

### 1. Self-Registration (New Organization)

**For users creating a new mining site:**

1. User visits `/auth`
2. Clicks "Register" tab
3. Selects "Create New Organization"
4. Fills registration form (goes to `/tenant-registration`)
5. Creates tenant + admin account
6. Receives email verification (if configured)
7. Can login immediately
8. Status: `pending` until Super Admin approves organization

### 2. Self-Registration (Joining Existing Organization)

**For users joining an existing mining site:**

1. User visits `/auth`
2. Clicks "Register" tab
3. Selects "Join Existing Organization"
4. Enters:
   - Personal details (name, email/phone, employee ID)
   - Organization ID (tenant code)
   - Password
5. Account created with `status = 'pending'`
6. Awaits Admin approval
7. After approval, can login

### 3. Admin Invitation Flow (Recommended)

**Streamlined flow for admins to invite team members:**

#### Admin Side:
1. Admin logs into `/admin`
2. Clicks "Invite User"
3. Enters only:
   - Email address
   - Role (Medical Staff, Safety Officer, or Administrator)
4. Clicks "Send Invitation"
5. ✓ Invitation email sent with organization code

#### User Side:
1. User receives professional invitation email with:
   - Organization name and code
   - Assigned role
   - "Activate Account & Set Password" button
2. User clicks activation button
3. Redirected to `/activate` page pre-loaded with:
   - Email (read-only)
   - Role (displayed)
   - Organization (displayed)
4. User completes:
   - First Name
   - Last Name
   - Phone Number (optional)
   - Password (+ confirmation)
5. Clicks "Activate Account"
6. Account immediately active
7. Redirected to `/auth` with email pre-filled
8. User logs in

**Benefits:**
- ✅ No duplicate data entry
- ✅ Admin only needs email + role
- ✅ User completes own profile
- ✅ Immediate activation (no approval needed)
- ✅ Organization code included in email

### 4. Login Flow

1. User visits `/auth`
2. Enters email/phone + password
3. Clicks "Sign In"
4. Session stored in PostgreSQL
5. Redirected to dashboard
6. "Forgot Password?" link available


---

## File Storage System

### Overview

The system supports flexible file storage:

**Development (Local Filesystem):**
- Profile pictures → `./public/profiles/`
- Document uploads → `./uploads/`
- Inventory images → `./public/inventory-images/`
- Direct file upload via multipart/form-data
- No cloud dependencies required

**Production (Vercel Blob Storage):**
- Automatic upload to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- Falls back to local filesystem if token not set
- Seamless switching via environment variables
- Files stored in Vercel Blob are automatically CDN-cached

### Directory Structure

```
project-root/
├── public/               # Public files (accessible without auth)
│   ├── profiles/        # Profile pictures
│   └── uventorybiz-logo-full.png
│
└── uploads/             # Private files (require auth)
    └── ...
```

### File Upload Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/public-objects/upload` | POST | Required | Upload public files (profiles) |
| `/api/objects/upload` | POST | Required | Upload private files |
| `/public-objects/:path` | GET | None | Serve public files |
| `/objects/:path` | GET | Required | Serve private files |
| `/api/profile/picture` | PUT | Required | Update user profile picture |

### Usage Example

**Upload Profile Picture:**
```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('category', 'profiles');

const response = await fetch('/api/public-objects/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  },
  body: formData
});

const { uploadURL } = await response.json();
// uploadURL: "/public/profiles/john-doe-1736234567.jpg"

// Update user profile
await fetch('/api/profile/picture', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({ imageURL: uploadURL })
});
```

### File Storage Configuration

**Local Development (Default):**
Files are stored locally:
- No configuration needed
- Files stored in `./public/` and `./uploads/` directories
- Automatically created on first upload

**Production with Vercel Blob:**
```env
# Set BLOB_READ_WRITE_TOKEN in Vercel environment variables
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

Files are automatically uploaded to Vercel Blob when token is set. If not set, falls back to local filesystem.

**File Storage Service:**
- `server/fileStorage.ts` - Unified storage abstraction
- `server/vercelBlobStorage.ts` - Vercel Blob implementation
- Automatic detection: Uses Vercel Blob if token exists, otherwise local files

### Features

✅ **Human-Readable Filenames**: `john-doe-1736234567.jpg` instead of UUIDs  
✅ **Automatic Directory Creation**: Directories created on startup  
✅ **Content-Type Detection**: Proper MIME types for images, PDFs, etc.  
✅ **Caching Headers**: 1-hour cache for better performance  
✅ **Auth Protection**: Private files require authentication  
✅ **Flexible Backend**: Works with local files, S3, GCS, etc.  

---

## New API Endpoints

### Invitation & Activation

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/admin/invite-user` | POST | Invite user (email + role only) | Admin |
| `/api/auth/activation-details` | GET | Get user details from token | None |
| `/api/auth/complete-activation` | POST | Complete profile & set password | None |
| `/api/auth/confirm-account` | GET | Redirect to activation page | None |

### Request/Response Examples

**Invite User:**
```json
POST /api/admin/invite-user
{
  "email": "user@company.com",
  "role": "medical_staff"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "role": "medical_staff",
    "status": "pending"
  }
}
```

**Complete Activation:**
```json
POST /api/auth/complete-activation
{
  "token": "verification-token-from-email",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "message": "Account activated successfully"
}
```

---

## Database Schema

All 38 tables created via Drizzle ORM:

**Core Tables:**
- `users`, `tenants`, `sessions`, `user_sessions`
- `companies`, `employees`, `patients`

**Healthcare:**
- `appointments`, `medical_visits`, `incident_reports`
- `operational_duties`, `operational_duty_assignments`, `operational_duty_completions`

**Inventory:**
- `medical_inventory`, `inventory_transactions`
- `purchase_orders`, `purchase_order_items`
- `equipment_maintenance`, `inventory_alerts`

**Testing:**
- `drug_tests`, `alcohol_tests`, `hydration_tests`
- `testing_programs`, `testing_equipment`
- `random_testing_pools`, `random_selections`

**Admin:**
- `notifications`, `audit_logs`, `email_verifications`

---

## Troubleshooting

### Issue: "DATABASE_URL must be set"

**Solution:** Ensure `.env` file exists in project root with proper encoding:
```bash
# Check file exists
ls -la .env

# Verify contents
cat .env

# Recreate if needed with UTF-8 encoding
```

### Issue: "Port 5000 already in use"

**Solution:** Kill existing process or change port:
```bash
# Windows
netstat -ano | findstr :17009
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:17009 | xargs kill -9
```

### Issue: "Cannot connect to PostgreSQL"

**Solution:** Verify PostgreSQL is running:
```bash
# Check status
psql -U postgres -c "SELECT version();"

# Start if needed (varies by OS)
# Windows: Services -> PostgreSQL
# Linux: sudo systemctl start postgresql
# Mac: brew services start postgresql
```

### Issue: "User with this email already exists"

**Solution:** Check for existing users:
```sql
psql -U postgres -d mineaid_hms

-- Check existing users
SELECT email, status, "authProvider" FROM users WHERE email = 'user@example.com';

-- Delete test user if needed
DELETE FROM users WHERE email = 'user@example.com';
```

### Issue: "Phone number already in use"

**Solution:** Phone numbers must be unique:
```sql
-- Find user with phone number
SELECT email, "phoneNumber" FROM users WHERE "phoneNumber" = '+1234567890';

-- Update or remove duplicate
UPDATE users SET "phoneNumber" = NULL WHERE email = 'old@example.com';
```

### Issue: Activation link expired

**Solution:** Admin can resend invitation:
1. Go to `/admin`
2. Find user in "Pending" status
3. Click "Approve" to send new activation email
4. Or delete user and re-invite

---

## Development vs Production

| Feature | Local Development | Vercel Production |
|---------|------------------|-------------------|
| **Auth System** | Staff auth (email/password) | Staff auth (email/password) |
| **Database** | Local PostgreSQL or Neon Dev Branch | Neon Production Branch |
| **HTTPS** | Not required | Automatic (Vercel) |
| **Domain** | localhost:17009 | your-domain.vercel.app or custom domain |
| **File Storage** | Local filesystem | Vercel Blob (or local fallback) |
| **Session Store** | PostgreSQL | PostgreSQL (Neon) |
| **Hosting** | Local Node.js server | Vercel serverless functions |

---

## Deployment Options

### 1. **Vercel (Recommended)**

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete Vercel deployment instructions.

**Quick Steps:**
1. Connect Git repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main` branch

**Benefits:**
- Automatic HTTPS
- Global CDN
- Serverless scaling
- Built-in monitoring

### 2. **Self-Hosted VPS**

```bash
# Install dependencies
npm ci --production

# Build frontend
npm run build

# Run with PM2
pm2 start npm --name "mineaid-hms" -- start
```

### 3. **Other Cloud Platforms**
- **Railway:** Connect GitHub repo, set env vars, use Neon PostgreSQL
- **Render:** Deploy as Web Service, connect to Neon database
- **AWS:** Deploy to Lambda + API Gateway, use RDS PostgreSQL
- **Google Cloud:** Cloud Run + Cloud SQL

---

## Testing

### Create Test User

```bash
# Access auth page
http://localhost:5173/auth

# Register with:
Email: admin@test.com
Password: Test123!@#
```

### Verify Database

```bash
psql -U postgres -d mineaid_hms

-- Check users
SELECT id, email, role, status FROM users;

-- Check sessions
SELECT sid, expire FROM sessions;
```

---

## Next Steps

1. ✅ System running locally
2. ✅ Staff auth working
3. ✅ Database connected
4. 📋 Create test tenant
5. 📋 Test core features
6. 📋 Plan production deployment

---

## Support

For issues specific to local development:
1. Check this guide
2. Review `docs/DEPLOYMENT_GUIDE.md`
3. Verify `.env` configuration
4. Check PostgreSQL logs

For Replit deployment:
1. Use original Replit configuration
2. Add all Replit-specific env vars
3. Test OAuth flow on production domain

---

**Last Updated:** November 22, 2025  
**Version:** 3.0.0  
**Status:** ✅ Local Development Ready  
**Platform:** Vercel + Neon PostgreSQL

---

## Summary

This guide covers setting up MineAid HMS for local development. The system:
- Uses staff authentication (email/password)
- Connects to Neon PostgreSQL or local PostgreSQL
- Stores files locally in development
- Uses Vercel Blob in production (when configured)

For production deployment, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Vercel deployment instructions
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration from Replit to Vercel

## Key Features

- ✅ **Staff authentication**: Email/password with secure sessions
- ✅ **Flexible Database**: Local PostgreSQL or Neon development branch
- ✅ **Local File Storage**: No cloud dependencies for development
- ✅ **Vercel Blob Support**: Automatic cloud storage in production
- ✅ **Complete Schema**: All 31 tables with migrations
- ✅ **Type-Safe**: Full TypeScript support

