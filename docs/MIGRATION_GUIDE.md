# Migration Guide: Replit to Vercel + Neon

> **Database schema (2026+):** For current setup, upgrades, and fresh installs, see **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)**. Legacy `migrations/_archive/legacy_upgrades/*.sql` paths in this guide are historical upgrade references only.

This guide will help you migrate MineAid HMS from Replit deployment to Vercel with Neon PostgreSQL database.

## Overview

Version 3.0.0 completely removes Replit dependencies and migrates to:
- **Hosting**: Vercel (serverless functions)
- **Database**: Neon PostgreSQL (with development and production branches)
- **File Storage**: Vercel Blob (cloud storage)

## Prerequisites

- Vercel account (free tier available)
- Neon account (free tier available)
- Access to your existing Replit deployment (for data export if needed)
- Git repository (for deploying to Vercel)

### SQL migration file naming (2026 onward)

When adding dated migrations under `migrations/`, use:

- **`YYYYMMDD_NN_short_description.sql`** — `NN` is a two-digit sequence (`01`, `02`, …) for **multiple files on the same day**, so lexicographic order matches apply order.
- Examples (2026-04-01): `20260401_01_ambulance_care_locations.sql`, then `20260401_02_emt_and_ambulance_prestart.sql`.
- A single migration on a day may still use `YYYYMMDD_description.sql` (no `_NN_`) if nothing else shares that date; when in doubt, use `_01_` for consistency.

**Examples (2026-04-04):** `20260404_super_admin_impersonation.sql`, `20260404_tenant_signed_legal_documents.sql` — apply in lexicographic filename order with your other dated files.

## Step 1: Set Up Neon Database

### Create Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project (e.g., `mineaidhms`)

### Create Database Branches

1. **Development Branch:**
   - Create a new branch named `development`
   - Copy the connection string

2. **Production Branch:**
   - Use the `main` branch for production
   - Copy the connection string

### Run Schema Migration

> **Preferred (new installs):** See **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)**.

```bash
# Set DATABASE_URL in .env
npm run db:drizzle-migrate
npm run db:seed
```

**Legacy options (historical only — do not use for new installs)**

1. ~~`migrations/schema.sql`~~ — superseded by `drizzle/0001_initial_schema.sql` + journal chain
2. ~~`npm run db:push`~~ — avoid on partial DBs; use `db:drizzle-migrate` instead

### Verify Schema

```sql
SELECT COUNT(*) FROM drizzle.__drizzle_migrations;
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expect 87+ public tables on a fully migrated fresh install
```

### Legacy incremental upgrades (pre-Drizzle journal databases only)

If upgrading an **old** database that predates `drizzle/`, run dated files under `migrations/` in lexicographic order (see `docs/DRIZZLE_MIGRATIONS.md` SQL supplement map). Examples:

- `migrations/20260301_referral_facilities_and_transfer.sql`
- `migrations/20260402_02_patient_portal_foundation.sql`
- …through release-specific files in `docs/NEXT_DEV_SESSION.md`

After legacy SQL is current, run **`npm run db:drizzle-baseline -- --confirm`** once, then use **`db:generate` / `db:drizzle-migrate`** for new structure.

## Step 2: Export Data from Replit (If Applicable)

If you have existing data in your Replit database:

### Export Data

```bash
# Connect to Replit database
pg_dump <your-replit-connection-string> > replit_backup.sql

# Or export specific tables only
pg_dump -t users -t tenants -t patients <your-replit-connection-string> > partial_backup.sql
```

### Import to Neon

```bash
# Import to Neon development branch
psql <your-neon-development-connection-string> < replit_backup.sql

# Verify data
psql <your-neon-development-connection-string> -c "SELECT COUNT(*) FROM users;"
```

## Step 3: Set Up Vercel Blob Storage

### Create Blob Store

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage
3. Create a new Blob Store (e.g., `mineaidhms-files`)
4. Copy the `BLOB_READ_WRITE_TOKEN`

### Note on Existing Files

If you have existing files in Replit Object Storage:
- Download files from Replit manually
- Re-upload to Vercel Blob via the migration script or manually
- Update file URLs in your database if needed

## Step 4: Update Environment Variables

### Remove Replit Variables

Remove these from your `.env` file:
- `REPLIT_DOMAINS`
- `REPL_ID`
- `ISSUER_URL`
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- `LOCAL_DATABASE_URL` / `NEON_DATABASE_URL` (if both existed)

### Add New Variables

Add these to your `.env` file (for local development):

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Session Security (Required)
SESSION_SECRET="your-super-secure-session-secret-256-bits"

# Environment (Required)
NODE_ENV="development"

# Vercel Blob Storage (Optional for production)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxx"

# Frontend URL (Optional - auto-detected in Vercel)
FRONTEND_URL="http://localhost:17009"

# Email (Optional)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
```

### Vercel Environment Variables

In Vercel Dashboard, add these environment variables:

**Production:**
```
DATABASE_URL=<production-neon-connection-string>
SESSION_SECRET=<your-production-secret>
NODE_ENV=production
BLOB_READ_WRITE_TOKEN=<your-blob-token>
FRONTEND_URL=<your-production-domain>
GMAIL_USER=<your-email>
GMAIL_APP_PASSWORD=<your-app-password>
```

**Development:**
```
DATABASE_URL=<development-neon-connection-string>
SESSION_SECRET=<your-dev-secret>
NODE_ENV=development
BLOB_READ_WRITE_TOKEN=<your-blob-token>
FRONTEND_URL=<your-vercel-dev-url>
```

## Step 5: Update Authentication

### User Migration

All users previously authenticated via Replit OAuth will need to:

1. **Reset Passwords:**
   - Use the "Forgot Password" flow
   - Set new passwords for staff authentication

2. **Or Re-register:**
   - Create new accounts with email/password
   - Admins can invite users via the admin panel

### Update User Records

If you exported user data, you may need to update the `authProvider` field:

```sql
-- Update all users to use staff auth (legacy column auth_provider = 'custom')
UPDATE users SET auth_provider = 'custom' WHERE auth_provider = 'replit';

-- Reset password hashes (users will need to reset passwords)
UPDATE users SET password = NULL WHERE auth_provider = 'custom';
```

## Step 6: Deploy to Vercel

### Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Select the repository containing MineAid HMS

### Configure Build Settings

Vercel will auto-detect from `vercel.json`:
- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Set Environment Variables

Add all environment variables from Step 4 to Vercel:
1. Go to Project Settings → Environment Variables
2. Add each variable for Production, Preview, and Development
3. Use different `DATABASE_URL` for each environment (different Neon branches)

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL

## Step 7: Post-Deployment Verification

### Test Authentication

1. Visit your deployed application
2. Try registering a new user
3. Test login with email/password
4. Verify session persistence

### Test File Uploads

1. Upload a profile picture
2. Upload an incident report attachment
3. Upload an inventory image
4. Verify files are stored in Vercel Blob

### Test Database Operations

1. Create a tenant
2. Create a company
3. Create an employee
4. Create a patient
5. Verify data is stored in Neon

### Check Logs

1. Go to Vercel Dashboard → Deployments → View Function Logs
2. Check for any errors or warnings
3. Verify database connections

## Step 8: Custom Domain (Optional)

### Add Domain to Vercel

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `mineaidhms.com`)
3. Configure DNS records as instructed
4. Wait for DNS propagation

### Update Environment Variables

After domain is configured:
```
FRONTEND_URL="https://mineaidhms.com"
```

## Troubleshooting

### Database Connection Issues

**Error**: `Cannot connect to database`

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check Neon dashboard for connection status
- Ensure connection string includes `?sslmode=require`
- Verify database branch is active

### File Upload Issues

**Error**: `Vercel Blob storage is not configured`

**Solutions:**
- Verify `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
- Check token permissions in Vercel dashboard
- Ensure Blob store exists and is accessible

### Authentication Issues

**Error**: `User not found` or `Invalid credentials`

**Solutions:**
- Check if user exists in database
- Verify password hash was migrated correctly
- Users may need to reset passwords
- Check `auth_provider` field matches `'custom'`

### Build Errors

**Error**: `Module not found` or `Type errors`

**Solutions:**
- Run `npm install` locally to verify dependencies
- Check `package.json` for all required dependencies
- Ensure TypeScript compilation passes locally
- Check Vercel build logs for specific errors

## Rollback Plan

If you need to rollback:

1. **Database:**
   - Use Neon's point-in-time restore feature
   - Or restore from backup SQL file

2. **Deployment:**
   - Use Vercel's deployment history
   - Rollback to previous deployment

3. **Data:**
   - Keep backup of Replit database
   - Keep backup of file storage

## Migration Checklist

- [ ] Neon account created
- [ ] Neon database branches created (development and production)
- [ ] Schema migrated to Neon (31 tables verified)
- [ ] Data exported from Replit (if applicable)
- [ ] Data imported to Neon (if applicable)
- [ ] Vercel account created
- [ ] Vercel Blob store created
- [ ] Environment variables updated
- [ ] Replit variables removed
- [ ] Repository connected to Vercel
- [ ] Build configuration verified
- [ ] Deployment successful
- [ ] Authentication tested
- [ ] File uploads tested
- [ ] Database operations verified
- [ ] Custom domain configured (if applicable)
- [ ] Users notified of migration
- [ ] Old Replit deployment archived

## Next Steps

After successful migration:

1. **Monitor Performance:**
   - Check Vercel analytics
   - Monitor Neon database performance
   - Watch for errors in logs

2. **Update Documentation:**
   - Update team documentation
   - Update user guides
   - Archive old Replit documentation

3. **Optimize:**
   - Configure Neon connection pooling if needed
   - Optimize Vercel Blob storage usage
   - Set up monitoring and alerts

4. **Future Enhancements:**
   - Consider Neon Auth for authentication (future feature)
   - Set up automated backups
   - Configure CDN for static assets

## Support

For migration assistance:
- Check Vercel documentation: https://vercel.com/docs
- Check Neon documentation: https://neon.tech/docs
- Review `docs/DEPLOYMENT_GUIDE.md` for deployment details
- Review `docs/LOCAL_DEVELOPMENT_SETUP.md` for local setup

---

**Migration Status**: ✅ Version 3.0.0 Ready  
**Last Updated**: June 13, 2026  
**Migration Complexity**: Medium (requires database and deployment migration)

---

## June 2026 schema migrations (4.27.0)

Apply **in filename order** on each environment (development/staging/production) **before** starting the 4.27.0 app:

Run **one file at a time** (the script does not auto-run all pending migrations):

```bash
npm run db:sql-migrate -- migrations/20260619_01_portal_access_requests.sql
```

| Order | File | Summary |
|-------|------|---------|
| 1 | `migrations/20260602_04_portal_appt_request_location.sql` | Portal appointment request preferred location |
| 2 | `migrations/20260602_05_glucose_mmol_context.sql` | Glucose mmol/L + `glucose_context` |
| 3 | `migrations/20260608_01_encounter_lifecycle_foundation.sql` | `encounters` rename, telecare sessions, appointment modality |
| 4 | `migrations/20260608_02_appointment_notification_types.sql` | Appointment notification types |
| 5 | `migrations/20260608_03_fhir_interoperability.sql` | Interop partners and transfers |
| 6 | `migrations/20260612_01_encounter_first_model.sql` | Encounter FK on triage/vitals |
| 7 | `migrations/20260612_02_encounter_model_v2.sql` | Lifecycle timestamps, status normalization |
| 8 | `migrations/20260612_03_incident_drill_simulation.sql` | Incident drill/simulation flag |

**Breaking changes after migrate:**
- Code references **`encounters`** (not `medical_visits`).
- Glucose values in **mmol/L**.
- List APIs may return paginated `{ rows, page, pageSize, totalCount }` when `page`/`pageSize` query params are used.

**New env vars (see `.env.example`):** telehealth (`TELEHEALTH_PROVIDER`, `LIVEKIT_*` or `TEAMS_*`), optional `APPOINTMENT_NO_SHOW_GRACE_MINUTES`, optional `DATABASE_DRIVER=websocket` for local Neon.

**Staging checklist:** [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md)

---

## June 2026 schema migrations (4.28.0)

Apply **after** all 4.27.0 migrations, in filename order, before starting the 4.28.0 app:

| Order | File | Summary |
|-------|------|---------|
| 9 | `migrations/20260613_01_telecare_consent_and_duration.sql` | Patient telehealth consent timestamp; `appointments.duration_minutes`; `scheduled_end` backfill |
| 10 | `migrations/20260614_01_messaging_foundation.sql` | Conversations, messages, participants, audit log |
| 11 | `migrations/20260614_02_message_received_notification_type.sql` | `message_received` notification type |
| 12 | `migrations/20260615_01_portal_notifications.sql` | Portal in-app notifications table |

**New features requiring migrate:** messaging, portal notifications, telecare consent/duration.

---

## June 2026 schema migrations (4.31.0)

Apply **after** all 4.30.0 migrations, in filename order, before starting the 4.31.0 app:

| Order | File | Summary |
|-------|------|---------|
| 13 | `migrations/20260616_01_appointment_confirmation_party.sql` | Who confirmed appointment (`confirmation_party`) |
| 14 | `migrations/20260616_02_work_fitness_medications.sql` | Work fitness medication declarations |
| 15 | `migrations/20260616_03_work_fitness_medication_images.sql` | Medication declaration image attachments |
| 16 | `migrations/20260616_04_portal_patient_vitals.sql` | Portal patient-submitted vitals |
| 17 | `migrations/20260617_01_fix_generate_patient_id.sql` | Sync patient ID sequence; collision-safe `generate_patient_id()` |

## June 2026 schema migrations (4.31.0 — continued)

Apply **after** `20260617_01_fix_generate_patient_id.sql`:

| Order | File | Summary |
|-------|------|---------|
| 18 | `migrations/20260619_01_portal_access_requests.sql` | Portal access request queue; `portal_access_request` notification type; enable messaging feature for active portals |
| 19 | `migrations/20260620_01_portal_access_request_notification_prefs.sql` | Default admin in-app/email prefs for portal access requests (idempotent) |
| 20 | `migrations/20260620_02_portal_notification_preferences.sql` | Portal patient notification preference rows (appointments, messaging email/in-app) |
| 21 | `migrations/20260620_03_release_notes_ack.sql` | Per-user last acknowledged release version (staff + portal) |

---

