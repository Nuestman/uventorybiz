# Migrations folder

| Path | Purpose |
|------|---------|
| [`seeds/`](./seeds/) | **Active** — reference data and catalog seeds (`npm run db:seed`) |
| [`_archive/`](./_archive/) | **Archived** — legacy DDL upgrades and old combined migration files |
| [`_legacy_drizzle_meta/`](./_legacy_drizzle_meta/) | Stale 2025 drizzle-kit snapshot; superseded by [`../drizzle/meta/`](../drizzle/meta/) |

## Schema structure (Drizzle)

```bash
npm run db:drizzle-migrate          # fresh DB — full journal
npm run db:drizzle-baseline -- --confirm   # existing DB — one-time
npm run db:generate                 # after editing shared/schema.ts
```

See [`../docs/DRIZZLE_MIGRATIONS.md`](../docs/DRIZZLE_MIGRATIONS.md).

## Seeds (data only)

```bash
npm run db:seed
npm run db:seed:optional
```

See [`seeds/README.md`](./seeds/README.md).

## Ad-hoc SQL

```bash
npm run db:sql-migrate -- migrations/_archive/legacy_upgrades/<file>.sql
```

Use only for legacy upgrade gaps — not for new installs.
