# uventorybiz — Implementation Status

**Product:** Multi-tenant B2B business management (inventory + POS)  
**Version:** `1.0.0` (+ inventory UX in working tree — [CHANGELOG.md](./CHANGELOG.md) `[Unreleased]`)  
**Last updated:** July 18, 2026  
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
| Product catalog + PO multi-store receive/reverse | Done (unreleased vs initial commit) |
| MineAid clinical docs → `purged/docs/` | Done (Jul 2026) |

## Current surface

### Keep (live)
- **Inventory Management** — per-store stock, **product catalog**, transfers/requisitions, purchase orders (catalog lines, receive any store, reverse receipt), suppliers, categories, alerts
- **Admin — Store Locations** — fixed-site stores (`care_locations`; business copy)
- Point of Sale
- Portal orders / supplier invoices
- Operations (appointments, incidents, duties, tickets)
- ShiftOver, Fleet, POC Laboratory (instant tests), Employee Wellbeing
- Auth, tenancy, admin, notifications, SOP, non-clinical reports

### Purged (not wired)
- Patients, encounters, medical visits/records, triage/vitals
- Telecare / LiveKit, FHIR / interop, clinical reports
- MineAid pitch decks and clinical-only plans (see `purged/docs/`)

## Database

- Drizzle journal through **`0015_uventorybiz_inventory_categories`**
- Seeds: `npm run db:seed`, demo: `npm run db:seed:demo`
- Guide: [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)

## Inventory flow (quick)

1. **Catalog** — define products (`inventory_items`) at `/inventory-catalog`  
2. **PO** — order from catalog; optional inline supplier create  
3. **Receive** — into chosen store → creates/updates `inventory_stock` + `receipt_external`  
4. **Reverse** — undo receipt from a store → `return_to_supplier`  
5. **Transfer** — move stock between stores via Stock Transfers  
6. **Low stock** — Request stock or Create PO from Inventory row menu  

Details: [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md)

## Known residuals

- Workspace folder may still be named `uventory` while the product is **uventorybiz** — rename after closing the IDE ([UVENTORYBIZ.md](./UVENTORYBIZ.md))
- Appointment UI still carries some telehealth modality labels; telecare routes/packages are removed
- Large `server/storage.ts` not fully split (POS/customers extracted where needed)
- Transactions / Transaction History UI still show legacy type labels
- PO receive does not yet capture batch/lot/expiry per line

## Related docs

- [UVENTORYBIZ.md](./UVENTORYBIZ.md) — short product overview
- [VERSION.md](./VERSION.md) — current version line
- [CHANGELOG.md](./CHANGELOG.md) — release + unreleased notes
- [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md) — resume checklist
- [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md) — inventory status
- [INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md) — inventory design plan
- [PORTAL_GUIDE.md](./PORTAL_GUIDE.md), [POS_GUIDE.md](./POS_GUIDE.md)
