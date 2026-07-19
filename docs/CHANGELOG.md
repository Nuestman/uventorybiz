# Changelog

All notable changes to **uventorybiz** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning follows [SemVer](https://semver.org/).

MineAid HMS history (pre–uventorybiz) is archived at [`purged/docs/CHANGELOG_MINEAID.md`](../purged/docs/CHANGELOG_MINEAID.md).

---

## [Unreleased]

### Added

### Fixed

### Changed

### Docs

---

## [1.2.0] - 2026-07-19

Navigation orientation, list pagination, portal orders UX, and portal-centric secure messaging restore (staff ↔ portal users, staff ↔ staff).

### Added

- **Staff & Super Admin breadcrumbs** — top-bar trail on all pages via `AppBreadcrumbs` + `appBreadcrumbs` resolver (sidebar / `superAdminNav`); portal-style `Home` / `System console` › section › page. Spec: [APP_NAVIGATION_AND_BREADCRUMBS.md](./APP_NAVIGATION_AND_BREADCRUMBS.md).
- **List pagination** — shared `ListPagination` (20/page, hidden when ≤ page size) on Customers, Suppliers, Product Catalog, Inventory Transactions.
- **Portal pagination** — `PortalPagination` on Shop and My orders (client-side).
- **Portal My orders filters** — All / Active / Needs action / Completed / Cancelled plus status dropdown.
- **Messages under Operations** — staff sidebar **Messages** (`/messages`); recipient picker via `/api/messaging/portal-recipients` (customers/portal users, not patients).

### Fixed

- Portal messaging auth no longer requires a patient bridge; threads are **PortalUser**-centric.
- Staff new-thread picker aligned with portal parties (customers / portal users).

### Changed

- Staff / Super Admin header: breadcrumbs replace logo + quick-link strip (logo stays in sidebar).
- Portal sidebar: remove **My orders** unread order-update badge (Messages keeps messaging unread badge).
- Messaging copy and flows de-emphasize clinical/patient context for uventorybiz B2B use.

### Docs

- [APP_NAVIGATION_AND_BREADCRUMBS.md](./APP_NAVIGATION_AND_BREADCRUMBS.md)
- Updated [PORTAL_GUIDE.md](./PORTAL_GUIDE.md), [MESSAGING_MODULE_PLAN.md](./MESSAGING_MODULE_PLAN.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [VERSION.md](./VERSION.md)

---

## [1.1.0] - 2026-07-19

Inventory multi-store UX from after `1.0.0`, plus business assets, fleet rename, portal support tickets, session controls, and messaging feature flag.

### Added

- **Business Assets register** — `/assets` CRUD with auto tags (`AST-######`), types including `vehicle` (provisions linked fleet stock location). Ticket forms use asset dropdown (`assetId`). Sidebar: Business Assets group. Migrations `0020`–`0024`. Spec: [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md).
- **Vehicle kind** — `commute` | `mobile_store` on business assets; Assets + Fleet forms; existing vehicles default to commute (`0024`).
- **Mobile store / fleet inventory guide** — [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md).
- **Portal system-issue tickets** — `/portal/support`; APIs under `/api/portal/support-tickets`; staff queue `source=portal`. Migrations `0016`, `0025` (attachments).
- **Secure Messaging platform flag** — Super-admin `messaging` (default **off**); gates staff/portal messaging APIs, UI, and SSE.
- **Ticket duplicate prompt** — New ticket + fleet pre-start lodge modal warn when open/triaged/in-progress tickets exist in the same category (`GET /api/tickets/active-in-category`).
- **Product catalog** — `/inventory-catalog` CRUD on master items (no stock).
- **PO reverse receipt** — `POST /api/purchase-orders/:id/reverse-receive`.
- **PO receive into any location** — Store or fleet unit picker (`locationId`).
- **Inline create supplier** on PO create/edit.
- **Low / out-of-stock row actions** on Inventory (requisition / Create PO).
- **Store locations admin** — Business store copy (`care_locations`).
- **Idle timeout toggle** — `idle_timeout_enabled` (migration `0018`).

### Fixed

- Asset tag counter syncs to `MAX(existing AST-######)` before increment; create retries on unique collision; friendly write errors.
- Feature-flag DB failures cache defaults for 30s (no Neon timeout stampede).
- Portal messaging SSE stops reconnecting when platform messaging is off.
- Super-admin without tenant: `GET /api/settings` returns `null`; client skips fetch when no `tenantId`.
- Business Assets review hardening (counter repair `0021`, fleet sync, options for pickers, `?edit=` race, retired `includeId`).
- Fleet sidebar/routes and pre-start UX under `/assets/fleet/*`.

### Changed

- Staff absolute session default **12h → 24h** (`0017`).
- **Fleet DB/API rename** — `ambulance_*` → `fleet_*`, `location_kind` `ambulance` → `fleet` (`0019`); UI under `client/src/pages/fleet/`.
- Fleet pre-start tri-state checklist; repair ticket before complete when Faulty.
- Vehicle **Ops** / **Stationed at** / location filter on Assets register.
- Asset statuses aligned with equipment checks + `sold` (`0022`, `0023`).
- Equipment checks under Inventory; PO catalog-driven lines.
- Clinical / MineAid docs moved `docs/` → `purged/docs/`.

### Schema

- Drizzle journal `0016`–`0025` (portal support, sessions, fleet rename, business assets, vehicle kind, portal ticket attachments).

### Docs

- [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md), [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md)
- Updated inventory, portal, session, sidebar, ticketing, and status docs

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
