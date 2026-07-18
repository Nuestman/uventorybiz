# uventorybiz — product overview

Multi-tenant **B2B business management** with inventory and point of sale.

| | |
|--|--|
| **Package** | `uventorybiz@1.0.0` |
| **Repo** | https://github.com/Nuestman/uventorybiz |
| **Stack** | Express + React + Drizzle + Neon PostgreSQL + Railway |
| **Origin** | Adapted from MineAid HMS code; versioning resets at **1.0.0** (MineAid history in `purged/docs/`) |

## What ships today

- **Inventory** — multi-store stock, **product catalog**, transfers/requisitions, purchase orders (catalog lines, receive into any store, reverse receipt), suppliers, alerts, tenant-scoped categories
- **Stores** — Admin Store Locations (`care_locations` fixed sites)
- **POS** — registers, shifts, tax, barcodes, sell/return/void ([POS_GUIDE.md](./POS_GUIDE.md))
- **Portal** — customers & suppliers ([PORTAL_GUIDE.md](./PORTAL_GUIDE.md))
- **Operations** — appointments, incidents, duties, tickets
- **ShiftOver**, **Fleet**, **POC laboratory** (instant tests), **Employee wellbeing**
- **Auth / tenancy / notifications / SOP / reports** (non-clinical)

Unreleased inventory UX detail: [CHANGELOG.md](./CHANGELOG.md) `[Unreleased]` · [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md)

## Schema & migrations

Tracked journal: `drizzle/0000` … `drizzle/0015_uventorybiz_inventory_categories.sql`.  
See [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md).

## Workspace folder name

The product is **uventorybiz**. If this checkout folder is still named `uventory`, rename it after closing the IDE:

```powershell
Rename-Item "…\Cursor AI Agent\uventory" "uventorybiz"
```

Then reopen the folder in Cursor.
