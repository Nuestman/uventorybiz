# Changelog

All notable changes to **uventorybiz** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning follows [SemVer](https://semver.org/).

MineAid HMS history (pre–uventorybiz) is archived at [`purged/docs/CHANGELOG_MINEAID.md`](../purged/docs/CHANGELOG_MINEAID.md).

---

## [Unreleased]

Inventory and multi-store UX landed after the initial `1.0.0` baseline commit (`ac3b33d`). Still package version `1.0.0` until the next tagged release.

### Added

- **Product catalog** — `/inventory-catalog` CRUD on master `inventory_items` only (no stock). API: `GET/POST /api/inventory-catalog`, `PUT/DELETE /api/inventory-catalog/:id`. Sidebar: Product Catalog; linked from Inventory.
- **PO reverse receipt** — `POST /api/purchase-orders/:id/reverse-receive` with `{ locationId, items: [{ itemId, quantityReversed }], notes? }`. Decreases store stock, reduces `quantityReceived`, logs `return_to_supplier`, adjusts PO status (`completed` / `partially_received` / back to `ordered`). UI: Reverse receipt on partially received / completed POs.
- **PO receive into any store** — Receive modal store picker; body `locationId` validated (active fixed-site store, not fleet).
- **Inline create supplier** on create/edit PO modal (`POST /api/suppliers`, auto-select).
- **Low / out-of-stock row actions** on Inventory: Request stock (requisition prefilled) and Create PO (`/purchase-orders?create=1&itemId=…&qty=…`).
- **Store locations admin** — Admin UI copy and form for business stores (`operatingHours`, `staffCount`); default “Main Store” (table remains `care_locations`).

### Changed

- Purchase Orders item picker loads **catalog** (`/api/inventory-catalog`), not location stock; “Create new item” posts to catalog (stock created on receive).
- Clinical / MineAid pitch, encounter, FHIR, telehealth, and pharmacy plan docs moved from `docs/` → `purged/docs/`.

### Docs

- Updated [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md), [INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [NEXT_DEV_SESSION.md](./NEXT_DEV_SESSION.md), [UVENTORYBIZ.md](./UVENTORYBIZ.md), [VERSION.md](./VERSION.md).

---

## [1.0.0] - 2026-07-18

### Added

- **uventorybiz** — multi-tenant B2B inventory and POS platform (fresh product line; not a MineAid continuation version).
- Inventory: multi-location stock, transfers, purchase orders, alerts, tenant-scoped categories (defaults + custom).
- Point of Sale: registers, cash-drawer shifts, tax/VAT, barcodes, sell / return / void with stock updates.
- Portal: customers and suppliers — orders, receipt/returns flow, supplier invoices, messaging.
- Operations: appointments, incidents, duties, tickets; ShiftOver; fleet; POC testing; employee wellbeing.
- Auth, tenancy, notifications, SOP, non-clinical reports, platform feature flags.
- Demo seed CSVs and bulk CSV import for customers, suppliers, and products.
- Docs: [UVENTORYBIZ.md](./UVENTORYBIZ.md), [POS_GUIDE.md](./POS_GUIDE.md), [PORTAL_GUIDE.md](./PORTAL_GUIDE.md).

### Changed

- Product identity and package name **uventorybiz** (`1.0.0`).
- Clinical / patient / FHIR / telecare surfaces archived under `purged/` (not part of the running app).
- LiveKit / telehealth packages removed from live dependencies.

### Schema

- Drizzle journal `0003`–`0015` (domain remap, POS, portal parties/orders, feature flags, inventory categories).
