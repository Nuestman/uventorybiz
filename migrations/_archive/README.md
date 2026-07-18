# Archived SQL migrations

Historical hand-written migrations superseded by the Drizzle journal (`drizzle/0000` → latest).

## Do not run on fresh databases

After `npm run db:drizzle-migrate`, use [`../seeds/`](../seeds/) instead:

```bash
npm run db:seed
npm run db:seed:optional   # dev/demo catalogs only
```

## Contents

| Folder | What |
|--------|------|
| `legacy_upgrades/` | All former `migrations/*.sql` — DDL increments, data migrations, and old combined seed+DDL files (e.g. `add_notification_system.sql`) |
| `legacy_drizzle_meta_stale/` | Orphaned 2025 `migrations/meta/` snapshot (superseded by `drizzle/meta/`) |

## When you still need these files

- Upgrading a **long-lived** database that was built before Drizzle adoption and has not been fully baselined
- Auditing when a column or table was introduced
- One-off `npm run db:sql-migrate -- migrations/_archive/legacy_upgrades/<file>.sql` on a specific gap

For new Neon branches and local Postgres from scratch, only Drizzle + seeds are required.
