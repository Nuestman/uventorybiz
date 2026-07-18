# SQL seeds (reference data)

Data-only SQL run **after** `npm run db:drizzle-migrate`. No DDL here — structure lives in `drizzle/` + `shared/schema.ts`.

## Commands

```bash
# Required: notification types, staff prefs, portal backfills (idempotent)
npm run db:seed

# Optional: tenant catalog demos (duties, inventory, procedures, SOPs, multi-location flag)
npm run db:seed:optional

# Demo tenant (UventoryBiz): customers, suppliers, products, employees from CSV
npm run db:seed:demo
```

Re-run `npm run db:seed` after onboarding new tenants/admins if notification preferences are missing (`02_staff_notification_preferences.sql` is idempotent).

## Layout (individual files, not one monolith)

| Path | Purpose |
|------|---------|
| `required/01_notification_types.sql` | All `notification_types` reference rows |
| `required/02_staff_notification_preferences.sql` | Default prefs by role (needs users) |
| `required/03_portal_tenant_defaults.sql` | Messaging feature backfill for enabled portals |
| `optional/01_operational_duties.sql` | Default duty templates (app also seeds) |
| `optional/03_procedures_catalog.sql` | Procedure master list |
| `optional/04_tenant_sops.sql` | Sample SOP HTML per tenant |
| `optional/05_enable_multi_location_testing.sql` | Dev flag on all tenants |
| `demo/*.csv` | Expansive UventoryBiz demo fixtures (see `demo/README.md`) |

Files are numbered so `db:seed` runs them in a stable order. Split by concern so you can re-run or skip one area without touching others.

## Fresh database checklist

```bash
npm run db:drizzle-migrate
npm run db:seed
# optional: npm run db:seed:optional
npm run dev
```

`01_notification_types` is **required** before notifications work. `02` and `03` are safe on an empty DB (no rows updated). Run `db:seed` again after creating your first organization if you want default staff notification prefs.

## Legacy upgrades

DDL and historical incremental migrations are in [`_archive/legacy_upgrades/`](./_archive/legacy_upgrades/). Use only when upgrading a database that predates Drizzle `0001` — not for fresh installs.

See [`../docs/DRIZZLE_MIGRATIONS.md`](../docs/DRIZZLE_MIGRATIONS.md).
