# uventorybiz — Implementation Status

**Product:** Multi-tenant B2B business management (inventory + POS)  
**Version:** `1.1.0`  
**Last updated:** July 19, 2026  
**Repo:** https://github.com/Nuestman/uventorybiz

> Clinical MineAid surfaces live under [`purged/`](../purged/README.md). Historical MineAid release notes: [`purged/docs/CHANGELOG_MINEAID.md`](../purged/docs/CHANGELOG_MINEAID.md).

## Transformation milestones

| Milestone | Status |
|-----------|--------|
| M1 Rebrand + `/purged` clinical archive | Done |
| Schema remap (employee / customer / supplier) | Done (`drizzle/0003`–`0007`) |
| M2 Operations IA, roles, fleet | Done |
| M3 Portal customers & suppliers | Done (`0005`, `0009`–`0012`) |
| M4 POS fuller retail | Done (`0006`, [POS_GUIDE.md](./POS_GUIDE.md)) |
| M5 Polish / verification | Done (ongoing doc cleanup) |
| Inventory categories (tenant custom) | Done (`0015`) |
| Product catalog + PO multi-location receive/reverse | Done (`1.1.0`) |
| Business Assets + fleet rename + vehicle kind | Done (`0020`–`0024`) |
| Portal support tickets | Done (`0016`, `0025`) |
| MineAid clinical docs → `purged/docs/` | Done (Jul 2026) |

## Current surface

### Keep (live)
- **Inventory Management** — per-location stock, **product catalog**, transfers/requisitions, purchase orders (catalog lines, receive store or fleet, reverse receipt), suppliers, categories, alerts
- **Business Assets** — tagged register (`/assets`); vehicles ↔ fleet stock locations; vehicle kind (commute / mobile store); stationed-at home store
- **Admin — Store Locations** — fixed-site stores (`care_locations`; business copy)
- Point of Sale (registers can bind to store or fleet location)
- Portal orders / supplier invoices / **system-issue support tickets**
- Operations (appointments, incidents, duties, tickets with asset picker + duplicate-category prompt)
- ShiftOver, Fleet (`/assets/fleet/*`), POC Laboratory (instant tests), Employee Wellbeing
- Auth, tenancy, admin, notifications, SOP, non-clinical reports
- Platform feature flags (incl. messaging default off)

### Purged (not wired)
- Patients, encounters, medical visits/records, triage/vitals
- Telecare / LiveKit, FHIR / interop, clinical reports
- MineAid pitch decks and clinical-only plans (see `purged/docs/`)

## Database

- Drizzle journal through **`0025_portal_ticket_attachments`**
- Seeds: `npm run db:seed`, demo: `npm run db:seed:demo`
- Guide: [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)

## Inventory + mobile store (quick)

1. **Catalog** — define products at `/inventory-catalog`  
2. **PO** — order from catalog; receive into store **or** fleet unit  
3. **Transfer** — Main Store ↔ mobile-store fleet location  
4. **POS** — optional register on fleet location for van sales  

Details: [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md) · [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md)

## Known residuals

- Workspace folder may still be named `uventory` while the product is **uventorybiz** — rename after closing the IDE ([UVENTORYBIZ.md](./UVENTORYBIZ.md))
- Appointment UI still carries some telehealth modality labels; telecare routes/packages are removed
- Messaging is platform-flagged off by default — enable in Super Admin when needed

## Docs map

| Doc | Use |
|-----|-----|
| [CHANGELOG.md](./CHANGELOG.md) | Release notes |
| [VERSION.md](./VERSION.md) | Semver |
| [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md) | Assets register |
| [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md) | Fleet ↔ inventory |
| [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md) | Resume checklist |
