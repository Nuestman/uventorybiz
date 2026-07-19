# uventorybiz — product overview

Multi-tenant **B2B business management** with inventory and point of sale.

| | |
|--|--|
| **Package** | `uventorybiz@1.2.0` |
| **Repo** | https://github.com/Nuestman/uventorybiz |
| **Stack** | Express + React + Drizzle + Neon PostgreSQL + Railway |
| **Origin** | Adapted from MineAid HMS code; versioning resets at **1.0.0** (MineAid history in `purged/docs/`) |

## What ships today

- **Inventory** — multi-store stock, **product catalog**, transfers/requisitions, purchase orders (catalog lines, receive into store or fleet unit, reverse receipt), suppliers, alerts, tenant-scoped categories
- **Business Assets** — tagged register; vehicles linked to fleet stock locations ([BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md))
- **Stores** — Admin Store Locations (`care_locations` fixed sites)
- **POS** — registers, shifts, tax, barcodes, sell/return/void ([POS_GUIDE.md](./POS_GUIDE.md))
- **Portal** — customers & suppliers, including system-issue support tickets ([PORTAL_GUIDE.md](./PORTAL_GUIDE.md))
- **Operations** — appointments, incidents, duties, tickets (asset picker, duplicate-category prompt)
- **ShiftOver**, **Fleet** (`/assets/fleet/*`), **POC laboratory** (instant tests), **Employee wellbeing**
- **Auth / tenancy / notifications / SOP / reports** (non-clinical); messaging behind platform flag (default off); portal-centric threads when enabled
- **Navigation** — staff / Super Admin breadcrumbs ([APP_NAVIGATION_AND_BREADCRUMBS.md](./APP_NAVIGATION_AND_BREADCRUMBS.md))

See [CHANGELOG.md](./CHANGELOG.md) · [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md)

## Schema & migrations

Tracked journal: `drizzle/0000` … `drizzle/0025_portal_ticket_attachments.sql`.  
See [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md).

## Workspace folder name

The product is **uventorybiz**. If this checkout folder is still named `uventory`, rename it after closing the IDE:

```powershell
Rename-Item "…\Cursor AI Agent\uventory" "uventorybiz"
```

Then reopen the folder in Cursor.
