# Inventory Implementation Scan

**Date:** July 18, 2026 (updated)  
**Product:** uventorybiz `1.0.0` (+ unreleased inventory UX — see [CHANGELOG.md](./CHANGELOG.md) `[Unreleased]`)  
**Purpose:** Current state of inventory flows (schema, backend, frontend) and remaining work.

**Mental model**

| Layer | Table / concept | Notes |
|-------|-----------------|--------|
| Master catalog | `inventory_items` | Identity only — no quantity. Managed at `/inventory-catalog` and via PO “create item”. |
| Per-store stock | `inventory_stock` | One row per `(item × location)`. Created on Inventory add, PO receive, or transfer receive. |
| Stores | `care_locations` (`locationKind = fixed_site`) | Admin UI: Store Locations. Fleet units are not receive targets for POs. |

---

## 1. Schema (shared/schema.ts)

### Implemented

| Area | Status | Notes |
|------|--------|--------|
| **Enums** | ✅ | `inventory_category`, `inventory_status`, `transaction_type` (includes new + legacy), `purchase_order_status` |
| **Suppliers** | ✅ | `suppliers` table, tenant-scoped |
| **Master catalog** | ✅ | `inventory_items` (item_code, item_name, category, brand, image_url, barcode, supplierId, etc.) |
| **Per-location stock** | ✅ | `inventory_stock` (item_id, location_id, currentStock, expiryDate, batchNumber, lotNumber, unitCost, etc.) |
| **Transactions** | ✅ | `inventory_transactions` with itemId→inventory_stock.id, locationId, counterpartyLocationId, documentType, documentId, transactionType (incl. `receipt_external`, `return_to_supplier`) |
| **Requisitions** | ✅ | `stock_requisitions`, `stock_requisition_items` |
| **Transfers** | ✅ | `stock_transfers`, `stock_transfer_items` |
| **Purchase orders** | ✅ | `purchase_orders`, `purchase_order_items` (itemId→inventory_items) |
| **Alerts** | ✅ | `inventory_alerts` |
| **Tenant categories** | ✅ | Inventory categories (defaults + custom) — `drizzle/0015` |

### Not in schema / deferred

- No `locationType` on `care_locations` (optional per plan); UI uses store vs fleet (`locationKind`).
- Batch/lot/expiry are on `inventory_stock`; PO receive does not yet write per-line batch/lot/expiry (single stock row per item+location).

---

## 2. Backend

### Inventory (stock) + catalog

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET /api/inventory | ✅ | Defaults to session `activeLocationId` or tenant primary when `locationId` omitted |
| POST /api/inventory | ✅ | Creates item + stock at a location |
| GET/PUT/DELETE /api/inventory/:id | ✅ | Location-aware |
| GET /api/inventory/export, POST import | ✅ | CSV |
| GET /api/inventory/analytics, low-stock, expiring | ✅ | |
| GET/POST /api/inventory-catalog | ✅ | Master items only (no stock) |
| PUT/DELETE /api/inventory-catalog/:id | ✅ | Catalog CRUD |

### Inventory transactions

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET/POST /api/inventory-transactions | ✅ | Filters by item, document, location; visit/incident issue paths still validated where used |
| PUT/DELETE /api/inventory-transactions/:id | ✅ | |

### Suppliers

| API / capability | Status |
|------------------|--------|
| GET/POST /api/suppliers | ✅ |
| GET/PUT/DELETE /api/suppliers/:id | ✅ |

### Purchase orders

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET/POST /api/purchase-orders | ✅ | POST: supplierId + line items (master item ids) |
| GET/PUT/DELETE /api/purchase-orders/:id | ✅ | |
| GET /api/purchase-orders/:poId/items | ✅ | |
| POST /api/purchase-orders/:id/receive | ✅ | `{ items: [{ itemId, quantityReceived }], locationId? }`. Creates `receipt_external`, updates/creates stock at store. **No batch/lot/expiry per line** |
| POST /api/purchase-orders/:id/reverse-receive | ✅ | `{ locationId, items: [{ itemId, quantityReversed }], notes? }`. Stock out via `return_to_supplier`; reduces `quantityReceived`; status → completed / partially_received / ordered |

### Stock requisitions & transfers

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET/POST/PUT /api/stock-requisitions | ✅ | |
| GET/POST /api/stock-transfers | ✅ | |
| POST /api/stock-transfers/from-requisition/:id | ✅ | |
| POST /api/stock-transfers/:id/dispatch | ✅ | `transfer_out` |
| POST /api/stock-transfers/:id/receive | ✅ | `transfer_in`; full receive only |

### Inventory alerts

| API / capability | Status |
|------------------|--------|
| POST/GET /api/inventory-alerts | ✅ |
| PUT, acknowledge, resolve, process-pending | ✅ |

---

## 3. Frontend

### Pages and routes

| Page | Route | Status | Notes |
|------|--------|--------|--------|
| Inventory Overview | /inventory | ✅ | Location stock; low/out row actions → Request stock / Create PO; link to Product Catalog |
| Product Catalog | /inventory-catalog | ✅ | CRUD on `inventory_items` only |
| Stock Transfers | /stock-transfers | ✅ | Requisition → transfer → dispatch → receive |
| Transactions | /inventory-transactions | ⚠️ | Legacy type labels in UI; backend has richer enum |
| Transaction History | /transaction-history | ⚠️ | Same; limited document context |
| Purchase Orders | /purchase-orders | ✅ | Catalog picker; inline new supplier; receive with **store picker**; **reverse receipt**; deep-link `?create=1&itemId=&qty=` |
| Suppliers | /suppliers | ✅ | Full CRUD |
| Store Locations (Admin) | Admin → Store Locations | ✅ | Business copy; stores (not clinical “care” wording) |

### Sidebar (Inventory Management)

- Inventory Overview, **Product Catalog**, Stock Transfers, Transactions, Purchase Orders, Suppliers, Transaction History.

### Visit / incident dispensing

Clinical visit dispensing UIs live under `purged/` and are not part of the live uventorybiz app. Incident “items used” may still exist where operations remain wired; prefer store stock + POS / transfers for B2B flows.

---

## 4. What’s remaining

1. **Transaction list UI** — Align Transactions / Transaction History with new types, direction, counterparty, document context.
2. **Enhanced PO receiving** — Batch, lot, expiry per line on receive (schema fields exist on stock).
3. **Transfer receive – partial / per-line (optional)**.
4. **Dedicated returns UX** (store → central) — transfer API supports it; no dedicated “return” button yet.
5. **Phase 4 testing** — unit + E2E for requisition → transfer → receive and PO receive/reverse.
6. **Optional single “store stock & requests” page** — behaviour already split across Inventory + Stock Transfers.

---

## 5. Summary table

| Flow | Schema | Backend | Frontend |
|------|--------|---------|----------|
| Master catalog (no stock) | ✅ | ✅ `/api/inventory-catalog` | ✅ `/inventory-catalog` |
| Per-location stock | ✅ | ✅ | ✅ `/inventory` |
| Suppliers | ✅ | ✅ | ✅ + inline on PO |
| PO create from catalog | ✅ | ✅ | ✅ |
| PO receive (any store) | ✅ | ✅ `locationId` | ✅ store picker |
| PO reverse after receipt | ✅ | ✅ `/reverse-receive` | ✅ Reverse receipt |
| Low-stock → requisition / PO | — | ✅ existing APIs | ✅ row actions |
| Requisitions / transfers | ✅ | ✅ | ✅ Stock Transfers |
| Transaction list (new types UI) | ✅ | ✅ | ⚠️ Legacy labels |
| PO receive batch/lot/expiry | ✅ (stock fields) | ❌ | ❌ |
| Partial transfer receive | ✅ | ❌ | ❌ |

---

**Conclusion:** Catalog → PO → receive/reverse into chosen store, plus multi-store transfers and low-stock shortcuts, are implemented. Remaining: transaction UI alignment, PO batch/lot/expiry, optional partial transfer receive, and automated tests. See also [INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md).
