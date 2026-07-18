# 🗄️ MineAid HMS - Quick Database Setup

## For Local Development

### 1. Create Database in PostgreSQL

```sql
-- Open psql
psql -U postgres

-- Create database
CREATE DATABASE mineaid_hms;

-- Verify
\l

-- Exit
\q
```

### 2. Configure Environment

### Environment

Copy `.env.example` → **`.env`** only (not `.env.local`). All tools read from `.env`.

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mineaid_hms
SESSION_SECRET=mineaid-local-dev-secret-min-32-characters
NODE_ENV=development
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

### 3. Push Schema

```bash
npm install
npm run db:drizzle-migrate   # applies drizzle/0000 → latest in one command
npm run db:seed
```

See **[docs/DRIZZLE_MIGRATIONS.md](docs/DRIZZLE_MIGRATIONS.md)** for full workflow (baseline for existing DBs, supplementary SQL).

### 4. Start Server

```bash
npm run dev
```

Server runs on: **http://localhost:5173**

---

## What Gets Created

- **38 Tables** including:
  - Users, Tenants, Companies, Employees
  - Patients, Appointments, Medical Visits
  - Incident Reports, Audit Logs
  - Inventory, Purchase Orders
  - Drug/Alcohol/Hydration Tests
  - Operational Duties

---

For detailed documentation, see: **[docs/LOCAL_DEVELOPMENT_SETUP.md](docs/LOCAL_DEVELOPMENT_SETUP.md)**

---

## For Preview/Production (Neon)

1. **Create Neon database**
   - Project name: `mineaidhms`
   - Copy the connection string (looks like `postgresql://user:password@ep-xxxxx.aws.neon.tech/neondb`)

2. **Configure deployment secrets**
   - `DATABASE_URL=<your neon connection string>` in Vercel (this is all you need for preview/production)
   - Optional: also set `NEON_DATABASE_URL` if you want the app to detect Neon automatically while keeping a local `DATABASE_URL` around
   - Ensure `SESSION_SECRET` and other required secrets are set; `NODE_ENV` is automatically `production` on Vercel

3. **Run migrations against Neon when promoting changes**
   - Set `DATABASE_URL` in `.env` / shell to the target branch
   - **New DB:** `npm run db:drizzle-migrate` then supplementary SQL (see `docs/DRIZZLE_MIGRATIONS.md`)
   - **Existing DB:** one-time `npm run db:drizzle-baseline -- --confirm`, then `npm run db:generate` + `npm run db:drizzle-migrate` for new changes
   - Avoid `db:push` on legacy databases (interactive rename prompts)

4. **Deploy**
   - The server automatically connects to Neon whenever `NODE_ENV=production` (or the deployment is a Vercel preview) and `NEON_DATABASE_URL` is defined.

