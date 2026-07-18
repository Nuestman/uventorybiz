# uventorybiz - Railway Deployment Guide

This guide covers deploying uventorybiz (multi-tenant business management: inventory + POS) to Railway, which is designed for Express.js monoliths and works seamlessly with our application.

---

## Production Cutover Checklist (uventorybiz)

Use this end-to-end sequence when standing up (or cutting over to) the production environment:

1. **Neon (database)**
   - Use the `uventorybiz` Neon project. Create/confirm a `production` branch and copy its pooled connection string (`?sslmode=require`).
   - Apply migrations against production: set `DATABASE_URL` in `.env` to the production string, then `npm run db:drizzle-migrate` (applies `drizzle/0000` … `0006`, which include the domain remap, roles/fleet, portal parties, and POS tables).
   - Apply required seeds: `npm run db:seed` (notification types, business categories, staff notification preferences). Do **not** run optional seeds — the clinical inventory catalog is archived under `/purged`.
2. **Railway (app)**
   - Connect the GitHub repo; `railway.json` already sets build (`npm run build`) and start (`npm start`).
   - Set variables: `DATABASE_URL` (Neon production string), `SESSION_SECRET` (long random string), `NODE_ENV=production`, `FRONTEND_URL` (Railway domain or custom domain).
   - Optional: `GMAIL_USER`/`GMAIL_APP_PASSWORD` or `RESEND_API_KEY`/`RESEND_FROM_EMAIL` for real email, `BLOB_READ_WRITE_TOKEN` for file storage, OIDC client IDs/secrets for "Continue with" buttons.
3. **Smoke test after first deploy**
   - Register a business (tenant) with a business category; log in as the admin.
   - Create a store location, a supplier, an inventory item, then a PO → receive it → confirm stock and unit cost update.
   - POS: create a register, open a shift, complete a sale (stock decrements), process a return by receipt number (stock restores).
   - Create a customer, attach it to a sale, and confirm dashboard metrics populate.
4. **Cleanup**
   - Delete the smoke-test tenant, or keep it as a demo account.

---

## Why Railway?

- **Perfect for Express**: Railway is designed for traditional Express/Node.js apps
- **Simple Deployment**: Just connect GitHub and deploy - no complex configuration needed
- **PostgreSQL Support**: Native PostgreSQL or use your existing Neon database
- **Automatic HTTPS**: Railway provides SSL certificates automatically
- **No Serverless Limitations**: Runs as a traditional server, perfect for our monolithic app

---

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected to Railway
3. Neon PostgreSQL database (or Railway's PostgreSQL)

---

## Step 1: Connect Repository to Railway

1. Log in to Railway dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your uventorybiz repository
5. Railway will automatically detect it's a Node.js project

---

## Step 2: Configure Build Settings

Railway will auto-detect:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Output Directory**: `dist/public`

These are already configured in `package.json`, so Railway should detect them automatically.

---

## Step 3: Set Environment Variables

Go to your Railway project → **Variables** and add:

### Required Environment Variables

```bash
# Database (Required)
# Use your Neon PostgreSQL connection string
DATABASE_URL="postgresql://user:password@ep-xxxxx.aws.neon.tech/neondb?sslmode=require"

# Session Security (Required)
SESSION_SECRET="your-super-secret-session-key-min-32-characters-long"

# Environment (Required)
NODE_ENV="production"

# Frontend URL (Required for email links)
# Railway will set RAILWAY_PUBLIC_DOMAIN automatically
# Or set your custom domain
FRONTEND_URL="https://your-app.up.railway.app"
```

### Optional Environment Variables

```bash
# Vercel Blob Storage (if using for file storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxx"

# Email Service (Gmail SMTP)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

# Logging
LOG_LEVEL="info"
```

**Note**: Railway automatically sets:
- `PORT` - Port to run the app on (automatically assigned)
- `RAILWAY_ENVIRONMENT` - Environment name
- `RAILWAY_PUBLIC_DOMAIN` - Public domain (if custom domain not set)

---

## Step 4: Deploy

Railway will automatically:
1. Install dependencies (`npm install`)
2. Build the project (`npm run build`)
3. Start the server (`npm start`)

**The deployment happens automatically on every push to your connected branch!**

---

## Step 5: Configure Custom Domain (Optional)

1. Go to your Railway project → **Settings** → **Networking**
2. Click **"Generate Domain"** to get a Railway subdomain (e.g., `your-app.up.railway.app`)
3. Or add a **Custom Domain**:
   - Click **"Custom Domain"** → **"Add Domain"**
   - Enter your domain (e.g., `preview.mineaidhms.com`)
   - Railway will provide DNS records (CNAME or A record) to add to your DNS provider
   - **Important**: Make sure to link the domain to your **service** (not just the project)
   - Once DNS propagates (usually 5-60 minutes), Railway will provision SSL automatically
   - Railway will automatically set `RAILWAY_PUBLIC_DOMAIN` environment variable to your custom domain

### Troubleshooting Custom Domain "Deployment Not Found" Error

If you see "Deployment not found" when accessing your custom domain:

1. **Verify Domain is Linked to Service**:
   - Go to Railway → Your Project → **Settings** → **Networking**
   - Ensure your custom domain is listed and shows "Active" status
   - Make sure the domain is linked to the correct **service** (the service running your app)

2. **Check DNS Configuration**:
   - Verify DNS records are correctly added to your DNS provider (Cloudflare, Route53, etc.)
   - If using Cloudflare, try disabling the proxy (set to "DNS Only") temporarily
   - Wait 5-60 minutes for DNS propagation

3. **Verify Environment Variables**:
   - Railway automatically sets `RAILWAY_PUBLIC_DOMAIN` to your custom domain
   - Optionally, manually set `FRONTEND_URL=https://preview.mineaidhms.com` in Railway Variables
   - Restart/redeploy your service after setting environment variables

4. **Test Default Railway Domain**:
   - Try accessing `https://your-app.up.railway.app` first
   - If it works, the issue is with the custom domain configuration
   - If it doesn't work, the issue is with the application itself

5. **Redeploy After Domain Setup**:
   - After configuring a custom domain, trigger a new deployment
   - This ensures the domain is properly linked to your service

---

## Step 6: Verify Deployment

1. **Check Logs**: Railway project → **Deployments** → Click latest deployment → **Logs**
2. **Test Application**: Visit your Railway URL (e.g., `https://your-app.up.railway.app`)
3. **Test Authentication**: Try logging in/registering
4. **Test Database**: Verify database connection works

---

## Database Setup

### Option A: Use Existing Neon Database

1. Add `DATABASE_URL` environment variable in Railway
2. Use your existing Neon connection string
3. Railway will connect to Neon PostgreSQL

**Neon Free + Railway always-on:** Neon suspends compute after ~5 minutes idle. Avoid sub-5-minute crons that hit Postgres (they keep CU-hours burning). Prefer the production branch for `DATABASE_URL`; idle development branches also consume the same project CU quota.

**Optional:** Set `HOURLY_CRON_JOBS_ENABLED=false` in Railway variables to pause the hourly appointment auto no-show cron — Neon then sleeps whenever no user is active. Staff mark appointment no-shows manually while paused. Client session polling is visibility-aware, so idle open tabs do not keep the compute awake.

### Option B: Use Railway PostgreSQL

1. Railway project → **New** → **Database** → **PostgreSQL**
2. Railway will automatically create `DATABASE_URL` environment variable
3. Run migrations:
   ```bash
   # Set DATABASE_URL in .env to Railway Postgres URL
   npm run db:drizzle-migrate
   npm run db:seed
   ```
   See **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)**.

---

## Monitoring and Logs

### View Logs

- **Real-time Logs**: Railway project → **Deployments** → Latest → **Logs**
- **Stream Logs**: Railway CLI: `railway logs`

### Metrics

- **CPU Usage**: Railway dashboard
- **Memory Usage**: Railway dashboard
- **Request Metrics**: Railway dashboard (for Pro plans)

---

## Troubleshooting

### Build Fails

- **Check logs**: Railway → Deployments → Latest → Logs
- **Common issues**:
  - Missing environment variables
  - Build command failing
  - Node.js version mismatch

### App Crashes

- **Check logs**: Railway → Deployments → Latest → Logs
- **Common issues**:
  - Database connection issues (check `DATABASE_URL`)
  - Missing `SESSION_SECRET`
  - Port binding issues (Railway sets `PORT` automatically)

### Database Connection Issues

- **Verify DATABASE_URL**: Check it's correctly set in Railway variables
- **Check SSL**: Neon requires `?sslmode=require`
- **Test Connection**: Use `psql` or Railway's database dashboard

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Session encryption key (min 32 chars) | `your-secret-key-here` |
| `NODE_ENV` | Environment (production/development) | `production` |
| `FRONTEND_URL` | Frontend URL for email links | `https://your-app.up.railway.app` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | `vercel_blob_rw_xxxxx` |
| `GMAIL_USER` | Gmail SMTP username | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail SMTP app password | `xxxx xxxx xxxx xxxx` |
| `LOG_LEVEL` | Logging level | `info`, `debug`, `error` |

---

## Pricing

- **Free Tier**: $5/month credit (usually covers small apps)
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

**Most small apps run on the free credit!**

---

## Benefits of Railway vs Vercel

✅ **Designed for Express**: No serverless workarounds needed  
✅ **Traditional Server**: Runs as a long-lived process  
✅ **Simple Configuration**: Just connect GitHub and deploy  
✅ **Automatic HTTPS**: SSL certificates provided  
✅ **PostgreSQL Support**: Native database or use Neon  
✅ **WebSocket Support**: Full WebSocket support  
✅ **No Cold Starts**: Always running, no cold start delays  
✅ **Simple Debugging**: Standard server logs  

---

## Migration from Vercel

If migrating from Vercel:

1. **Remove Vercel-specific code** (already done):
   - Removed `api/` directory
   - Removed `vercel.json`
   - Removed `@vercel/node` dependency

2. **Update Environment Variables**:
   - Remove `VERCEL_URL` references
   - Update `FRONTEND_URL` to Railway domain
   - Keep `DATABASE_URL` (Neon works with Railway)

3. **Deploy to Railway**: Follow steps above

---

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Railway Status**: [status.railway.app](https://status.railway.app)

---

**Last Updated**: November 22, 2025  
**Version**: 3.0.0  
**Platform**: Railway

