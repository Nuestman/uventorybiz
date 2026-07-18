# Inventory Implementation Scan

**Date:** February 2026  
**Purpose:** Current state of inventory flows (schema, backend, frontend) and remaining work.

---

## 1. Schema (shared/schema.ts)

### Implemented

| Area | Status | Notes |
|------|--------|--------|
| **Enums** | ✅ | `inventory_category`, `inventory_status`, `transaction_type` (includes new + legacy), `purchase_order_status` |
| **Suppliers** | ✅ | `suppliers` table, tenant-scoped |
| **Master catalog** | ✅ | `inventory_items` (item_code, item_name, category, brand, image_url, barcode, supplierId, etc.) |
| **Per-location stock** | ✅ | `inventory_stock` (item_id, location_id, currentStock, expiryDate, batchNumber, lotNumber, unitCost, etc.) |
| **Transactions** | ✅ | `inventory_transactions` with itemId→inventory_stock.id, locationId, counterpartyLocationId, patientId, medicalVisitId, documentType, documentId, transactionType |
| **Requisitions** | ✅ | `stock_requisitions`, `stock_requisition_items` (requesting/fulfilling location, status, items) |
| **Transfers** | ✅ | `stock_transfers`, `stock_transfer_items` (from/to location, requisitionId, status, dispatched/received) |
| **Purchase orders** | ✅ | `purchase_orders` (supplierId, status, dates), `purchase_order_items` (itemId→inventory_items, quantities) |
| **Alerts** | ✅ | `inventory_alerts` (itemId→inventory_stock, alertType, severity) |

### Not in schema / deferred

- No `locationType` on `care_locations` (optional per plan).
- Batch/lot/expiry are on `inventory_stock`; PO receive does not yet write per-line batch/lot/expiry to stock (single stock row per item+location).

---

## 2. Backend (server/storage.ts + server/routes.ts)

### Inventory (master + stock)

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET /api/inventory | ✅ | Defaults to session `activeLocationId` or tenant primary when `locationId` omitted; filters by location |
| POST /api/inventory | ✅ | Creates item + stock (injectLocationMiddleware), category enum mapping |
| GET /api/inventory/:id | ✅ | |
| PUT /api/inventory/:id | ✅ | Location-aware |
| DELETE /api/inventory/:id | ✅ | |
| GET /api/inventory/export | ✅ | CSV by category |
| POST /api/inventory/import | ✅ | Bulk create with validation |
| GET /api/inventory/analytics, low-stock, expiring | ✅ | |

### Inventory transactions

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET /api/inventory-transactions | ✅ | Filters: itemId, medicalVisitId (visit-scoped), documentType+documentId (incident-scoped); strict visit vs incident; returns itemName, itemCode, createdByName via joins |
| POST /api/inventory-transactions | ✅ | Visit/incident validation for `issue_to_client`; sets documentType, documentId, medicalVisitId, patientId, locationId; incidents force medical_visit_id null |
| PUT /api/inventory-transactions/:id | ✅ | |
| DELETE /api/inventory-transactions/:id | ✅ | |

### Suppliers

| API / capability | Status |
|------------------|--------|
| GET/POST /api/suppliers | ✅ |
| GET/PUT/DELETE /api/suppliers/:id | ✅ |

### Purchase orders

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET/POST /api/purchase-orders | ✅ | POST expects supplierId (or supplier fallback) |
| GET/PUT/DELETE /api/purchase-orders/:id | ✅ | |
| GET /api/purchase-orders/:poId/items | ✅ | |
| POST /api/purchase-orders/:id/receive | ✅ | Body: `{ items: [{ itemId, quantityReceived }], locationId? }`. Creates receipt_external txns, updates stock. **No batch/lot/expiry per line** |

### Stock requisitions

| API / capability | Status |
|------------------|--------|
| GET /api/stock-requisitions | ✅ |
| POST /api/stock-requisitions | ✅ |
| PUT /api/stock-requisitions/:id | ✅ |

### Stock transfers

| API / capability | Status | Notes |
|------------------|--------|--------|
| GET /api/stock-transfers | ✅ | |
| POST /api/stock-transfers | ✅ | |
| POST /api/stock-transfers/from-requisition/:requisitionId | ✅ | Creates transfer + items from approved requisition |
| POST /api/stock-transfers/:id/dispatch | ✅ | Sets dispatchedById, dispatchedAt; creates transfer_out txns; updates source stock |
| POST /api/stock-transfers/:id/receive | ✅ | Creates transfer_in txns; updates destination stock. **Full receive only** (no per-line quantity override or partial receive) |

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
| Inventory Overview | /inventory | ✅ | List/create/edit/delete stock; location from useActiveLocation; export/import CSV; category enum mapping |
| Stock Transfers | /stock-transfers | ✅ | **Full flow**: create requisition, create transfer, approve requisition → create transfer, dispatch, receive (confirm dialog) |
| Transactions | /inventory-transactions | ⚠️ | Uses **legacy** transaction types (receipt, issue, adjustment, transfer, disposal); create/edit/delete; no direction/counterparty/location in UI |
| Transaction History | /transaction-history | ⚠️ | Same legacy types; read-only list + detail; no document/visit/incident context |
| Purchase Orders | /purchase-orders | ✅ | List, create (supplierId), view, receive (items with quantityReceived); **no batch/lot/expiry per line in receive form** |
| Suppliers | /suppliers | ✅ | Full CRUD |

### Visit & incident dispensing

| Feature | Status |
|---------|--------|
| Medical visit form – Items used / dispensed | ✅ Search-as-you-type picker; location-scoped inventory; issue_to_client on submit |
| Records – 3-dots “Items used / dispensed” | ✅ Opens VisitDispensedItemsModal; add more, no duplicates |
| Edit visit – Items section | ✅ Count + button to open modal |
| Incident form (new) – Items used / dispensed | ✅ Same picker; creates incident then transactions (documentType incident) |
| Incident form (edit) – Items section | ✅ Count + button to open IncidentDispensedItemsModal |
| Incidents page – 3-dots “Items used / dispensed” | ✅ Opens IncidentDispensedItemsModal |

### Sidebar (Inventory Management)

- Inventory Overview, Stock Transfers, Transactions, Purchase Orders, Suppliers, Transaction History — all present and wired.

---

## 4. What’s remaining

### High level

1. **Transaction list UI (Transactions / Transaction History)**  
   - Backend uses new enum values (e.g. receipt_external, transfer_in, issue_to_client); frontend still uses legacy labels (receipt, issue, adjustment, transfer, disposal).  
   - Align: show new types, direction (in/out), counterparty location, and optional document/visit/incident context.

2. **Enhanced PO receiving**  
   - Plan: receiving form with **batch, lot, expiry per line**.  
   - Current: receive only sends itemId + quantityReceived; backend does not accept or store per-line batch/lot/expiry on receive (stock row has these fields but they are not set by PO receive).

3. **Transfer receive – partial / per-line (optional)**  
   - Plan mentioned optional “Edit quantities” for partial or over-receipt.  
   - Current: receive is “all as dispatched” (no per-line received quantity in request body).

4. **Returns (clinic → central)**  
   - Schema and transfer type support it; Stock Transfers UI does not yet expose a dedicated “return” flow (could be “create transfer” with from=clinic, to=central).

5. **Testing**  
   - Phase 4: unit tests for transaction direction; E2E for requisition → transfer → receive and for clinic issues; verify per-location stock.

6. **“Clinic Stock & Requests” single page (optional)**  
   - Plan described one page for clinic: stock list + “Request from Central” + “Incoming Transfers” + receive.  
   - Current: Inventory Overview shows stock; Stock Transfers shows requisitions + transfers and receive. So behaviour is covered across two pages; a single combined “Clinic Stock & Requests” view is a UX refinement, not a missing backend flow.

---

## 5. Summary table

| Flow | Schema | Backend | Frontend |
|------|--------|---------|----------|
| Master + per-location stock | ✅ | ✅ | ✅ Inventory page |
| Location-scoped GET inventory | — | ✅ | ✅ (visit/incident/Inventory) |
| Suppliers | ✅ | ✅ | ✅ Suppliers page |
| Purchase orders + receive | ✅ | ✅ (no batch/lot/expiry per line) | ✅ (receive without batch/lot/expiry) |
| Requisitions | ✅ | ✅ | ✅ Stock Transfers |
| Transfers (create, from-requisition, dispatch, receive) | ✅ | ✅ | ✅ Stock Transfers |
| Visit/incident issue_to_client | ✅ | ✅ (validated, scoped) | ✅ (forms + modals) |
| Transaction list (new types, direction, counterparty) | ✅ | ✅ | ⚠️ Legacy types only |
| PO receive with batch/lot/expiry per line | ✅ (stock has fields) | ❌ | ❌ |
| Partial / per-line transfer receive | ✅ | ❌ | ❌ |
| Returns (clinic → central) | ✅ | ✅ (same transfer API) | ⚠️ Via “create transfer” only |
| Phase 4 testing | — | — | ❌ |

---

**Conclusion:** Core inventory, requisitions, transfers, PO receive, and visit/incident dispensing are implemented end-to-end. Remaining work: (1) align Transactions/Transaction History UI with new transaction types and show direction/counterparty; (2) enhanced PO receiving (batch/lot/expiry per line); (3) optional partial receive and dedicated returns UX; (4) Phase 4 tests.
