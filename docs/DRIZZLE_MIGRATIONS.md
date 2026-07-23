# Drizzle migrations (schema tracking)

**Source of truth for structure:** `shared/schema.ts`  
**Tracked migrations:** `drizzle/` (journal in `drizzle/meta/_journal.json`)  
**Supplementary SQL (seeds/backfills):** `migrations/seeds/` — see [SQL supplement map](#sql-supplement-map) below.

---

## Commands

| Command | When to use |
|---------|-------------|
| `npm run db:drizzle-migrate` | **New empty DB** — applies all `drizzle/*.sql` in journal order, records each in `drizzle.__drizzle_migrations` |
| `npm run db:drizzle-baseline -- --confirm` | **Existing DB** already on legacy SQL — marks journal migrations as applied **without** re-running DDL |
| `npm run db:generate` | After editing `shared/schema.ts` — creates the next numbered `drizzle/NNNN_*.sql` |
| `npm run db:seed` | **After `db:drizzle-migrate`** — notification types, staff prefs, portal defaults (idempotent) |
| `npm run db:seed:optional` | Dev/demo tenant catalogs (duties, inventory, procedures, SOPs) |
| `npm run db:sql-migrate -- path/to.sql` | Ad-hoc SQL (e.g. legacy upgrade from `_archive/`) |
| `npm run db:push` | **Avoid** on partial/legacy DBs (rename prompts). OK only for quick local experiments on empty DBs; prefer `db:drizzle-migrate` |

`drizzle.config.ts` and migration scripts load **`.env` only** (see `scripts/load-env.ts`).

---

## Fresh database (recommended)

```bash
# 1. Set DATABASE_URL to the new Neon branch / local Postgres
npm run db:drizzle-migrate

# 2. Run supplementary seeds (reference data)
npm run db:seed
# optional: npm run db:seed:optional

# 3. Start app
npm run dev
```

### What Drizzle applies automatically

| File | Contents |
|------|----------|
| `drizzle/0000_patient_id_function.sql` | `generate_patient_id()` — required before `patients` default |
| `drizzle/0001_initial_schema.sql` | Baseline schema from `shared/schema.ts` at Drizzle adoption (~87 tables) |

`0001` creates the **baseline** shape at Drizzle adoption time. Later structure changes live in `0002`, `0003`, … — applied automatically on fresh installs (see [Journal chain](#journal-chain-do-not-merge-into-0001) below).

---

## Journal chain (do not merge into `0001`)

### The concern

After `0002_schema_migration_demos` (and future migrations), `0001_initial_schema.sql` does not contain those tables. You might worry that new databases need “0001 **plus** 0002 **plus** …” manually — repeating the old `schema.sql` + dozens of incremental files problem.

### How it actually works

**One command applies the full chain:**

```bash
npm run db:drizzle-migrate
```

Drizzle runs every file in `drizzle/meta/_journal.json` **in order**, once each:

```
0000_patient_id_function.sql
0001_initial_schema.sql
0002_schema_migration_demos.sql
0003_… (future)
```

Each step is recorded in `drizzle.__drizzle_migrations`. Nothing runs twice. You do **not** hand-pick files or merge deltas back into `0001`.

### What to edit vs what stays frozen

| Artifact | Role | Edit when schema changes? |
|----------|------|---------------------------|
| `shared/schema.ts` | App + Drizzle source of truth | **Yes** |
| `drizzle/0001_initial_schema.sql` | Day-zero baseline snapshot | **No** — frozen (hash tracked) |
| `drizzle/0002_…`, `0003_…` | Incremental DDL | **Generated** via `db:generate` |
| `migrations/schema.sql` | **Deprecated** legacy | **No** — use `drizzle/` instead |

**Do not merge `0002` into `0001`.** Changing `0001` changes its hash and breaks tracking for databases that already baselined or migrated.

The journal chain **as a whole** supersedes `migrations/schema.sql` — not any single file alone.

---

## Fresh database policy

Use this checklist for a **new** Neon branch, local Postgres, or Railway database:

```bash
# 1. Copy env (single file — .env only)
cp .env.example .env
# Set DATABASE_URL, SESSION_SECRET, etc.

# 2. Apply full Drizzle journal (0000 → latest)
npm run db:drizzle-migrate

# 3. Supplementary seeds (structure is already done)
npm run db:seed
# optional dev catalogs: npm run db:seed:optional

# 4. Start app
npm run dev
```

**Verify:**

```sql
SELECT COUNT(*) FROM drizzle.__drizzle_migrations;
-- Should match number of entries in drizzle/meta/_journal.json

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'schema_migration_demos';
-- Present if 0002 is in the journal and migrate succeeded
```

**Do not use** `migrations/schema.sql` or `db:push` for new installs.

---

## Squash policy (rare housekeeping)

Squashing means replacing many journal files with one new baseline — like when we created `0001` to replace `schema.sql`.

### When to squash

- Journal has grown **large** (rule of thumb: 30–50+ migrations) and fresh `db:drizzle-migrate` is noticeably slow
- You want to archive old migration files for readability
- **Not** after every feature — normal changes use `db:generate` → next numbered file

### When not to squash

- After each schema change (use incremental `000N` instead)
- To “keep 0001 up to date” (the chain already handles fresh DBs)

### Squash procedure (one-time, team-coordinated)

1. Ensure `shared/schema.ts` matches production schema.
2. Move current `drizzle/*.sql` and `drizzle/meta/` to `drizzle/_archive_YYYYMMDD/`.
3. Regenerate baseline:
   ```bash
   npm run db:generate -- --custom --name patient_id_function
   # paste generate_patient_id SQL into 0000
   npm run db:generate -- --name initial_schema_YYYYMMDD
   ```
4. **Existing databases:** `npm run db:drizzle-baseline -- --confirm` on each environment (does not re-run DDL).
5. **New databases:** `npm run db:drizzle-migrate` runs only the new short journal.
6. Document the squash date in this file’s journal history table.

Coordinate squash with the team; mistiming breaks CI or teammate local DBs.

---

## Existing database (dev / prod on legacy SQL)

One-time after upgrading to this Drizzle journal:

```bash
npm run db:drizzle-baseline -- --confirm
```

Requirements:

- `encounters` table exists (sanity check that schema is not empty)
- Does **not** execute `0000`/`0001` SQL — only writes hashes to `drizzle.__drizzle_migrations`
- Does **not** fix missing tables/columns — run legacy files from `migrations/_archive/legacy_upgrades/` via `db:sql-migrate` only if baselining an old DB with gaps

Then for **future** schema changes:

```bash
# edit shared/schema.ts
npm run db:generate -- --name describe_your_change
npm run db:drizzle-migrate
```

---

## Why not only `db:push`?

| Issue | Drizzle migrate | `db:push` |
|-------|-----------------|-----------|
| Tracks what ran | `drizzle.__drizzle_migrations` | Nothing |
| `generate_patient_id()` before patients | `0000` runs first | Often fails until function exists manually |
| Rename vs create prompts | N/A on fresh migrate | Common on legacy/partial DBs |
| Data backfills / seeds | Use `migrations/*.sql` | Not supported |

---

## Adding a schema change (ongoing)

1. Update `shared/schema.ts`
2. `npm run db:generate -- --name short_description`
3. Review generated `drizzle/NNNN_short_description.sql`
4. `npm run db:drizzle-migrate` on each environment (or Neon SQL editor for prod if preferred)
5. If the change needs **seed rows** or **data migration**, add `migrations/seeds/required/NN_description.sql` (or `optional/`) and run via `db:seed`

Custom SQL-only steps (functions, complex backfills) before a generated migration:

```bash
npm run db:generate -- --custom --name my_function
# edit drizzle/NNNN_my_function.sql
npm run db:generate -- --name tables_after_function
```

---

## SQL supplement map

Drizzle `0001_initial_schema` creates **empty** tables. Use **`migrations/seeds/`** for reference data on fresh installs.

### Required (`npm run db:seed`)

| File | Purpose |
|------|---------|
| `seeds/required/01_notification_types.sql` | All `notification_types` rows (consolidates former `add_notification_system`, appointment/message/portal/shift types) |
| `seeds/required/02_staff_notification_preferences.sql` | Default prefs by role — re-run after onboarding tenants/admins |
| `seeds/required/03_portal_tenant_defaults.sql` | Messaging feature backfill for enabled portals (no-op on empty DB) |

**Backfills are not needed on an empty DB** for structure — only these reference rows. Former per-feature notification INSERT files are archived.

### Optional (`npm run db:seed:optional`)

| File | Purpose |
|------|---------|
| `seeds/optional/01_operational_duties.sql` | Default duty templates (app also seeds via `ensureDefaultOperationalDuties`) |
| `seeds/optional/02_inventory_catalog.sql` | Default inventory catalog |
| `seeds/optional/03_procedures_catalog.sql` | Procedure master list |
| `seeds/optional/04_tenant_sops.sql` | Sample SOP HTML per tenant |
| `seeds/optional/05_enable_multi_location_testing.sql` | Dev flag for multi-location |

### Legacy upgrades (archived — not for fresh DB)

All former `migrations/*.sql` DDL increments and data migrations live in **`migrations/_archive/legacy_upgrades/`**. Use only when upgrading a database that predates Drizzle `0001`.

Examples (skip after `db:drizzle-migrate` on empty DB):

| Archived file | Notes |
|---------------|-------|
| `add_notification_system.sql` | DDL superseded by Drizzle; seeds moved to `seeds/required/` |
| `20260213_suppliers_and_po_image_barcode.sql` | Data migration: `supplier` text → `suppliers` |
| `20260608_01_encounter_lifecycle_foundation.sql` | `medical_visits` → `encounters` (0001 already uses `encounters`) |
| `20260617_01_fix_generate_patient_id.sql` | Superseded by `drizzle/0000` on fresh installs |
| `schema.sql` | Deprecated baseline (~31 tables) |

After baselining dev/prod, only run **new** `drizzle/` migrations plus `db:seed`.

---

## Journal history

| Tag | When |
|-----|------|
| `0000_patient_id_function` | Custom — PostgreSQL function |
| `0001_initial_schema` | Generated from `shared/schema.ts` at Drizzle adoption |
| `0002_schema_migration_demos` | Example incremental migration — demo table workflow |
| … | See `drizzle/meta/_journal.json` for the full chain |
| `0026_portal_sales_po_exceptions` | Portal sale link, `shipped` PO status, `fulfillment_exceptions` |
| `0027_return_window_and_pos_payments` | `tenants.return_window_days`; POS `mobile_money` / `credit` |

### Worked example (`schema_migration_demos`)

1. Add table to `shared/schema.ts`
2. `npm run db:generate -- --name schema_migration_demos`
3. `npm run db:drizzle-migrate`

No supplementary `migrations/*.sql` needed for structure-only changes.

Old `migrations/meta/_journal.json` (single 2025 entry) moved to `migrations/_legacy_drizzle_meta/`.

---

## Related docs

- `migrations/README.md` — seeds + archive layout
- `DATABASE_SETUP.md` — quick start
- `docs/LOCAL_DEVELOPMENT_SETUP.md` — full local dev guide
- `docs/DEPLOYMENT_GUIDE.md` — Neon / production deploy
- `docs/ENCOUNTER_SCHEMA_MIGRATION.md` — encounter SQL (legacy upgrade path)
- `docs/NEXT_DEV_SESSION.md` — release-specific checklist
