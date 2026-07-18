## Inventory Transfers & Clinic Issues - Redesign Plan

**Status:** Core flows done for uventorybiz; enhancements remaining (see scan)  
**Product context:** uventorybiz (B2B inventory + POS). Clinical visit dispensing and MineAid-specific UX below are historical; live app uses stores (`care_locations` / Store Locations admin), catalog, POs, transfers, and POS.  
**Scope (live):** Multi-store transfers, requisitions, returns-via-transfer, procurement (suppliers, purchase orders).  
**Scan:** [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md) `[Unreleased]`

### Implemented so far

**Baseline (schema + transfers — earlier):**

- **Master + per-location stock model**: `inventory_items` + `inventory_stock`. Migrations additive.
- **Master item attributes**: `image_url`, `barcode` on `inventory_items`.
- **Suppliers**: tenant-scoped CRUD, `/suppliers`.
- **Purchase orders**: lines use master `inventory_items.id`; receive → `receipt_external` + stock update.
- **Receive flows**: PO and transfer receive resolve stock by item + location.

**uventorybiz inventory UX (Jul 2026 — unreleased vs initial commit):**

- **Product catalog page** `/inventory-catalog` — CRUD on master items only; API `/api/inventory-catalog`.
- **PO lines from catalog** (not location stock); create-new-item from PO posts to catalog (no stock until receive).
- **Inline create supplier** on PO create/edit.
- **PO receive into any store** — UI store picker + `locationId` (active fixed-site only; not fleet).
- **PO reverse after receipt** — `POST /api/purchase-orders/:id/reverse-receive`; stock `return_to_supplier`; status rollback toward `ordered`.
- **Low/out-of-stock actions** on Inventory → Request stock (requisition) or Create PO (deep-link).
- **Store Locations** admin wording (business stores; DB table still `care_locations`).

**Visit & Incident ↔ Inventory integration (implemented):**

- **Medical visits – Items used / dispensed**
  - **New visit form** (`/medical-visit`): “Items used / dispensed” section with **search-as-you-type** item picker (no long dropdown). Items list is **scoped to the logged-in user’s store** (session active location or primary). On submit, visit is created then `issue_to_client` transactions are created with `medical_visit_id`, `patient_id`, `document_type = 'visit'`, `document_id = visit.id`, and `location_id`.
  - **Records (Medical Visits)**: Row 3-dots menu includes **“Items used / dispensed”**; opens **VisitDispensedItemsModal** for that visit (later entry). Modal shows existing items grouped with editable “Add more” quantity; new items use the same search-as-you-type picker; no duplicate items per visit.
  - **Edit Visit (Records)**: Edit medical visit dialog includes an “Items used / dispensed” section (count of recorded items + button to open the same modal).
  - **Backend**: `issue_to_client` for visits is **validated and scoped** by tenant, visit, patient, and location (see §9 below).
- **Incidents – Items used / dispensed**
  - **New incident form** (IncidentModal): “Items used / dispensed” section with search-as-you-type item picker scoped to form/session location. On create, incident is created then `issue_to_client` transactions with `document_type = 'incident'`, `document_id = incident.id`, `patient_id`, `location_id` (no `medical_visit_id`).
  - **Edit incident form**: Section shows count of recorded items + button to open **IncidentDispensedItemsModal**.
  - **Incidents page**: Row 3-dots menu includes **“Items used / dispensed”**; opens IncidentDispensedItemsModal for that incident.
  - **Backend**: `issue_to_client` for incidents is validated and scoped; `medical_visit_id` is forced to null for incident transactions.
- **Inventory list scoped to user’s store**
  - **GET `/api/inventory`**: When the client does not send `locationId`, the API resolves the **session’s active location** (or, for single-location tenants, the primary care location) and **filters items by that location**. So at a satellite clinic (e.g. ODDFAP), the items dropdown/picker shows only that store’s stock. Clients may still pass `locationId` (e.g. visit/incident location) to scope explicitly.
- **Backend enforcement (§9)** and **strict GET filters** for transactions ensure visit vs incident and patient/location scoping with no cross-talk.

**Still planned:** Enhanced PO receiving (batch, lot, expiry per line); Transactions UI alignment (new types, direction, counterparty); optional partial transfer receive and dedicated returns UX; Phase 4 testing.

---

## 1. Objectives & Constraints

- **Unify inventory flows** around a single, auditable transaction history.
- **Support transfers**:
  - Central store → clinic/FAP (with requisition + receiving + returns).
  - Clinic/FAP → clinic/FAP.
- **Support clinic-level issues to clients**:
  - After a visit, record what was used and deduct from that clinic’s stock.
- **Leverage existing `careLocations`**:
  - Clinics/FAPs are just `careLocations` (no separate entity).
  - Optional: distinguish “central store” vs “clinic/FAP” by a new field, but not required for core flows.
- **Safe to break compatibility** for inventory-related tables:
  - No real data → we can drop and recreate inventory tables, enums, and constraints as needed.

---

## 2. High-Level Design

### 2.1 Location Model

- **Reuse:** `careLocations` as the only concept for:
  - Central store(s).
  - Clinics/FAPs and other care sites.
- **Optional enhancement (later):**
  - Add `locationType` enum on `careLocations`:
    - `central_store`, `clinic`, `fap`, `other`.
  - This helps reporting and UX but is **not required** for core transfer logic.

### 2.2 Inventory Model Overview: Master Item + Per-Location Stock

- **Master catalog (`inventory_items`):** One row per logical item; no stock, no location. Unique per tenant: `(tenant_id, item_code)`.
- **Per-location stock (`inventory_stock`):** One row per (item, location). Unique: `(tenant_id, item_id, location_id)`. Dispatch and receive update the correct stock row for that location.
- **Movement log:** `inventory_transactions.item_id` references `inventory_stock.id`. Requisition/transfer items reference `inventory_items.id`; dispatch/receive resolve stock by (item_id, location_id).
---

## 3. Schema Changes (Database Level)

### 3.1 Drop & Rebuild Inventory Tables (Clean Slate)

We **drop** existing inventory-related data and tables, then create the new master + per-location stock schema. Migrating old `medical_inventory` into `inventory_items` + `inventory_stock` would require non-trivial ID mapping and would fuse the old single-row-per-item model into the new design; we **do not migrate** and start with empty tables.

**Drop order (dependencies first):**
- `inventory_transactions`, `stock_transfer_items`, `stock_transfers`, `stock_requisition_items`, `stock_requisitions`
- `inventory_alerts`, `purchase_order_items`, `purchase_orders`, `equipment_maintenance`
- `medical_inventory`

**Create:**
- `inventory_items` (master catalog)
- `inventory_stock` (item + location + stock)
- Recreate `inventory_transactions` (item_id → `inventory_stock.id`), requisitions, transfers, equipment_maintenance, purchase_order_items, inventory_alerts with FKs to the new tables.

### 3.2 `inventory_items` (Master Catalog)

**Goals:**
- Single source of truth for item identity: code, name, category, unit, supplier, etc.
- No stock, no location. One row per logical item per tenant.

**Key fields:**
- `id` (PK), `tenant_id` (FK → `tenants`), optional `company_id`
- `item_code`, `item_name`, `category`, `brand`, `model`, `description`, `unit_of_measure`, `dosage_form`
- `supplier`, `supplier_contact`
- `status`, equipment-related fields (equipment_status, last/next maintenance, warranty, serial_number)
- Alerts config: `low_stock_alert`, `expiry_alert`, `expiry_alert_days`
- `created_at`, `updated_at`
- **Unique:** `(tenant_id, item_code)`

### 3.3 `inventory_stock` (Per-Location Stock)

**Goals:**
- Represent current stock for a given item at a given location. One row per (item, location).

**Key fields:**
- `id` (PK), `tenant_id`, `item_id` (FK → `inventory_items`), `location_id` (FK → `care_locations`)
- Stock: `current_stock`, `minimum_stock`, `maximum_stock`, `reorder_point`
- Cost: `unit_cost`, `total_value`
- Batch/expiry: `expiry_date`, `batch_number`, `lot_number`; `barcode`, `image_url`
- `created_at`, `updated_at`
- **Unique:** `(tenant_id, item_id, location_id)`

**Dispatch:** Find row where `item_id = transfer item’s master item` and `location_id = from_location_id`; deduct and create `inventory_transactions` with `item_id = inventory_stock.id`.  
**Receive:** Find or create row where `item_id = transfer item’s master item` and `location_id = to_location_id`; add and create transaction. This keeps source and destination stock separate.

### 3.4 `inventory_transactions` (Movement Log)

We will expand `inventory_transactions` to:

- Track **where** a movement occurred.
- Represent **both sides** of transfers explicitly.
- Link to patients/visits when issuing to clients.
- Link to higher-level documents (requisitions, transfers, purchase orders, visits).

**Existing key fields (to keep, with adjustments):**
- `id`
- `tenant_id` (FK → `tenants`)
- `item_id` (FK → **`inventory_stock`** — the stock row that was updated)
- `quantity`
- `previous_stock`
- `new_stock`
- `unit_cost`, `total_cost`
- `reference`, `reason`, `notes`
- `transaction_date`
- `created_by` (FK → `users`)

**New/changed fields:**

- **Location & counterparty:**
  - `location_id` (FK → `care_locations.id`)  
    → Where this **specific row’s** stock change occurs.
  - `counterparty_location_id` (nullable FK → `care_locations.id`)  
    → The “other” side for transfers (from or to).

- **Patient/visit linkage (clinic issues):**
  - `patient_id` (nullable FK → `patients.id`)
  - `medical_visit_id` (nullable FK → `medical_visits.id`)

- **Document linkage:**
  - `document_type` (nullable enum):
    - `requisition`, `transfer`, `purchase_order`, `visit`, `manual`, `other`
  - `document_id` (nullable UUID/text) – ID of the parent document in its table.

- **Transaction direction & type (split):**
  - `transaction_type` (enum) – **split and expanded** (see §4).
  - Optional helper (derived, may not need its own column):
    - Logical `direction` = `in`, `out`, or `none`, inferred from `transaction_type`.

**Important behavioral rule:**

- One transaction row **always refers to one location** (`location_id`).
- **Transfers** between locations are represented as **two rows**:
  - Source row: `location_id = fromLocation`, `transaction_type = 'transfer_out'`.
  - Destination row: `location_id = toLocation`, `transaction_type = 'transfer_in'`.

### 3.4 New Tables: Requisitions

#### 3.4.1 `stock_requisitions`

Represents a **request** for stock (no stock change by itself).

- `id`
- `tenant_id`
- `requesting_location_id` (FK → `care_locations`) – clinic/FAP requesting items.
- `fulfilling_location_id` (FK → `care_locations`) – usually central store, but could be any location.
- `status`:
  - `draft`, `submitted`, `approved`, `rejected`, `partially_fulfilled`, `fulfilled`, `cancelled`
- `requested_by_id` (FK → `users`)
- `approved_by_id` (nullable FK → `users`)
- Timestamps: `requested_at`, `approved_at`, `created_at`, `updated_at`
- `notes`

#### 3.4.2 `stock_requisition_items`

- `id`
- `requisition_id` (FK → `stock_requisitions`)
- `item_id` (FK → `medical_inventory` or item catalog)
- `requested_quantity`
- `approved_quantity` (nullable until approved)
- `unit_of_measure`, `unit_cost` (optional for forecasting value)

### 3.5 New Tables: Transfers

#### 3.5.1 `stock_transfers`

Represents the **movement** of stock between locations.

- `id`
- `tenant_id`
- `from_location_id` (FK → `care_locations`)
- `to_location_id` (FK → `care_locations`)
- `status`:
  - `draft`, `pending_dispatch`, `in_transit`, `partially_received`, `received`, `cancelled`
- `type`:
  - `normal`, `return`, `loan` (extendable)
- `requisition_id` (nullable FK → `stock_requisitions`)
- `dispatched_by_id`, `dispatched_at`
- `received_by_id`, `received_at`
- `notes`

#### 3.5.2 `stock_transfer_items`

- `id`
- `transfer_id` (FK → `stock_transfers`)
- `item_id` (FK → `medical_inventory` or item catalog)
- `quantity_planned`
- `quantity_dispatched`
- `quantity_received`
- `unit_of_measure`, `unit_cost`
- Optional: `batch_number`, `expiry_date`

**Link to `inventory_transactions`:**

- For each `stock_transfer_item`, we create:
  - Source transaction row:
    - `transaction_type = 'transfer_out'`
    - `location_id = from_location_id`
    - `counterparty_location_id = to_location_id`
    - `document_type = 'transfer'`, `document_id = transfer_id`
  - Destination transaction row:
    - `transaction_type = 'transfer_in'`
    - `location_id = to_location_id`
    - `counterparty_location_id = from_location_id`
    - `document_type = 'transfer'`, `document_id = transfer_id`

### 3.6 Clinic Issues to Clients

No new tables are strictly required for stock movement; we extend `inventory_transactions`:

- When issuing items to a client after a visit:
  - `transaction_type = 'issue_to_client'`
  - `location_id = <clinic’s care_location.id>`
  - `patient_id = <patient id>`
  - `medical_visit_id = <visit id>`
  - `document_type = 'visit'`
  - `document_id = <visit id>`

Optionally, a separate `patient_dispensations` table can be added later for more structured “what the client took home”, but **stock changes must always go through `inventory_transactions`**.

---

## 4. Split `transaction_type` Enum

### 4.1 Current vs New

**Current (simplified):**
- `requisition`, `receipt`, `issue`, `adjustment`, `transfer`, `disposal`, `return`

**New (proposed):**

Core idea: make each value unambiguous about **what is happening** and **direction**.

- **Receipts (stock in):**
  - `receipt_external` – from supplier/PO (not from another location).
  - `receipt_transfer` – stock received from another internal location  
    (we may alias this to `transfer_in` in code).

- **Issues (stock out):**
  - `issue_to_client` – issued to a patient/client (linked to visit).
  - `issue_internal` – issued to an internal consumer (ward, department, etc.), no patient.

- **Adjustments:**
  - `adjustment_increase` – correction upwards (found extra stock, data fix, etc.).
  - `adjustment_decrease` – correction downwards (loss, spoilage, counting error).

- **Transfers (internal between locations):**
  - `transfer_out` – leaves this location (source).
  - `transfer_in` – arrives at this location (destination).

- **Returns:**
  - `return_from_client` – patient/client returns items to this location (stock in).
  - `return_to_supplier` – items sent back to supplier (stock out).
  - (Clinic ↔ central “returns” are just transfers with `type='return'` on `stock_transfers`; stock-wise they are still `transfer_out`/`transfer_in`.)

- **Disposal:**
  - `disposal` – destroyed/expired/damaged stock (stock out, non-recoverable).

> We can keep a small compatibility layer in the backend if needed (e.g. mapping old values to new ones for hard-coded UI), but since inventory has no data, the plan assumes we will fully migrate to the new enum.

### 4.2 Direction Semantics

For implementation and analytics, we treat `transaction_type` as the **single source** of direction:

- **Inbound (stock increases):**
  - `receipt_external`, `receipt_transfer` / `transfer_in`
  - `adjustment_increase`
  - `return_from_client`

- **Outbound (stock decreases):**
  - `issue_to_client`, `issue_internal`
  - `transfer_out`
  - `adjustment_decrease`
  - `return_to_supplier`
  - `disposal`

Backend helper (pseudo-logic):

- If `transaction_type` ∈ inbound set → `new_stock = previous_stock + quantity`.
- If `transaction_type` ∈ outbound set → `new_stock = previous_stock - quantity`.

This replaces the current `switch` logic in `createInventoryTransaction` and must be updated as part of implementation.

---

## 5. Core Flows

### 5.1 Central Store → Clinic/FAP (Requisition + Transfer + Receive)

**A. Clinic raises requisition**

1. Clinic user at care location `Clinic A`:
   - Creates `stock_requisition`:
     - `requesting_location_id = Clinic A`
     - `fulfilling_location_id = Central Store`
   - Adds `stock_requisition_items` with `requested_quantity`.
2. Central store reviews requisition:
   - Updates `approved_quantity` per line.
   - Sets `status = 'approved'` or `status = 'partially_fulfilled'` as needed.

**B. Central dispatches stock (transfer out)**

3. Central store creates `stock_transfer` from the approved requisition:
   - `from_location_id = Central Store`
   - `to_location_id = Clinic A`
   - `requisition_id = <id>`
   - `status = 'pending_dispatch'` → `in_transit` after dispatch.
4. For each transfer item:
   - Create `stock_transfer_item` with `quantity_dispatched`.
   - Create **source** `inventoryTransactions` row:
     - `transaction_type = 'transfer_out'`
     - `location_id = Central Store`
     - `counterparty_location_id = Clinic A`
     - `quantity = dispatched_qty`
     - `document_type = 'transfer'`, `document_id = transfer_id`
   - Central store stock decreases immediately.

**C. Clinic receives stock (transfer in)**

5. Clinic A opens the transfer and records received quantities.
6. For each received line:
   - Create **destination** `inventoryTransactions` row:
     - `transaction_type = 'transfer_in'`
     - `location_id = Clinic A`
     - `counterparty_location_id = Central Store`
     - `quantity = received_qty`
     - `document_type = 'transfer'`, `document_id = transfer_id`
   - Clinic A stock increases.
7. Update statuses:
   - `stock_transfers.status` → `partially_received` or `received`.
   - `stock_requisitions.status` → `partially_fulfilled` or `fulfilled`.

**D. Returns from clinic back to central**

- Same mechanism, but:
  - `from_location_id = Clinic A`
  - `to_location_id = Central Store`
  - `stock_transfers.type = 'return'`
- Transactions:
  - At Clinic A: `transfer_out` (stock out).
  - At Central: `transfer_in` (stock in).

### 5.2 Clinic/FAP → Clinic/FAP Transfers

- Same `stock_transfers` model:
  - `from_location_id = Clinic A`
  - `to_location_id = Clinic B`
- Optionally linked to a `stock_requisition` raised by Clinic B; not required.
- Always two `inventoryTransactions` entries (one per clinic).

### 5.3 Clinic-Level Issues to Clients

1. Clinician completes a medical visit at care location `Clinic A`.
2. On the visit/dispensing screen, user selects which items and quantities were used for the client.
3. When the visit is saved:
   - For each item:
     - Create `inventoryTransactions` row:
       - `transaction_type = 'issue_to_client'`
       - `location_id = Clinic A`
       - `patient_id = <patient id>`
       - `medical_visit_id = <visit id>`
       - `document_type = 'visit'`, `document_id = <visit id>`
     - Stock at Clinic A decreases accordingly.
4. If the patient returns unused medication:
   - Create `inventoryTransactions` row:
     - `transaction_type = 'return_from_client'`
     - `location_id = Clinic A`
     - `patient_id` and `medical_visit_id` (when applicable).
   - Stock increases at Clinic A.

---

## 6. Implementation Phases (Inventory Side Only)

This plan only covers the **inventory layer**; pharmacy-module–specific requirements stay in the pharmacy docs.  
**Checklist status as of v3.5.0 (Feb 2026).**

### Phase 1 – Schema & Migrations ✅

- [x] Create SQL migrations to:
  - Additive migrations: `inventory_items`, `inventory_stock`, `inventory_transactions` with `location_id`, `counterparty_location_id`, `patient_id`, `medical_visit_id`, `document_type`, `document_id`; `transaction_type` enum; `stock_requisitions`, `stock_requisition_items`, `stock_transfers`, `stock_transfer_items`. Legacy `medical_inventory` retained in parallel during overhaul.

### Phase 2 – Backend Storage & APIs ✅

- [x] Update `shared/schema.ts` to match new tables and enums.
- [x] Update `server/storage.ts`:
  - `createInventoryTransaction` uses `transaction_type` and location/patient/visit/incident scoping; visit/incident validation for `issue_to_client`.
  - Requisition and transfer CRUD: `createStockRequisition`, `getStockRequisitions`, `getStockRequisitionById`, `createStockTransfer`, `createStockTransferFromRequisition`, `dispatchStockTransfer`, `receiveStockTransfer`, etc.
- [x] Update `server/routes.ts`:
  - `/api/stock-requisitions` (GET, POST, PUT), `/api/stock-transfers` (GET, POST, from-requisition, dispatch, receive).
  - Transaction and purchase-order routes use new schema; GET `/api/inventory` defaults to session location.

### Phase 3 – Frontend Flows

- [ ] Inventory transactions UI:
  - Update `transaction_type` options and labels to new enum set.
  - Show direction (in/out) and counterparty location for transfers.
- [ ] New pages:
  - Clinic requisition page to request from central (or another location).
  - Central store approval + dispatch UI.
  - Clinic transfer receiving UI.
- [x] Visit/dispensing integration:
  - "Items used / dispensed" on visit form and Records (modal, search-as-you-type); same for incidents (new/edit forms + row modal).
  - Backend creates `issue_to_client` (and supports `return_from_client`) tied to `medical_visit_id` / `document_type`/`document_id` and `patient_id`. See §9.

### Phase 4 – Testing & Hardening

- [ ] Unit tests for transaction direction logic.
- [ ] End-to-end tests for:
  - Central → clinic requisition + transfer + receive.
  - Clinic → clinic transfer.
  - Clinic → client issues and returns.
- [ ] Verify per-location stock correctness under all flows.

---

## 7. Notes & Future Extensions

- Once this core inventory layer is solid, the **pharmacy module** can consume:
  - `inventory_transactions` as its movement log.
  - `stock_transfers` and `stock_requisitions` for inter-location distribution workflows.
  - Patient-linked `issue_to_client` records for dispensing history.
- Additional refinements (not required for initial implementation):
  - Location types and roles (e.g. mark one or more `careLocations` as central stores).
  - More detailed adjustment reasons and approval workflows.
  - Batch-wise stock tracking (lot/expiry splitting per item and location).

---

## 8. UX Principles & Low-Friction Flows

This section focuses on **minimizing clicks and cognitive load** for typical users (clinic staff, central store staff) while still supporting the data model defined above. It’s informed by general HMS inventory UX patterns and the high-level ideas in the shared “Medical Inventory System Design for HMS” discussion (`https://copilot.microsoft.com/shares/dCnv7n4vRBGaHRykb1RuM`).

### 8.1 General UX Principles

- **Respect session location:** Reuse the existing session-based `activeLocation` model everywhere.
  - Clinic/FAP users never pick a location in inventory forms; it’s inferred.
  - Central store users can have a central `careLocation` assigned (or switch via the existing location switcher).
- **One primary screen per role:**
  - Clinic/FAP: “Clinic Stock & Requests” page.
  - Central store: “Central Store Transfers & Requisitions” page.
- **Inline actions, not separate wizards:**
  - Requisitions and transfers should feel like actions taken **inside** the inventory list, not separate multi-step flows.
- **Defaults everywhere:**
  - Default `from_location_id` / `to_location_id` based on session and primary central store.
  - Smart defaults for quantities (e.g. last used, pack sizes) where appropriate.
- **Status is secondary:**
  - Use friendly labels and icons; avoid forcing users to think in workflow state machine terms.
  - Most users care about: “Requested”, “Coming”, “Here now”, “Sent out”, “Done”.

### 8.2 Clinic/FAP UX – “Clinic Stock & Requests”

Single page for clinic staff, driven by `activeLocation`:

- **Top-level layout:**
  - **Left:** Inventory table (items at `activeLocation`).
  - **Right / Drawer:** Contextual panels (New Request, Incoming Transfers, Items Used).

- **Key actions from the inventory list:**
  - **Quick request from central:**
    - Checkbox/select rows → “Request from Central” button.
    - Side panel opens with selected items and simple “Requested qty” fields.
    - On submit:
      - Creates a `stock_requisition` (status `submitted`) behind the scenes.
      - Uses:
        - `requesting_location_id = activeLocation.id`
        - `fulfilling_location_id = <tenant’s primary central store>` (autofilled; no manual choice in the simple flow).
  - **View stock details:** Shows per-item history (issues, receipts, transfers) in a timeline, but this is read-only and secondary.

- **Incoming items panel:**
  - Shows all `stock_transfers` with:
    - `to_location_id = activeLocation.id`
    - `status` in `pending_dispatch`, `in_transit`, `partially_received`.
  - **Primary actions:**
    - “Mark as received”:
      - Defaults `quantity_received = quantity_dispatched` for all lines.
      - One-click confirm for “everything arrived as expected”.
      - Optional “Edit quantities” for partial/over-receipt.
    - Behind the scenes:
      - Creates `transfer_in` `inventoryTransactions` rows.
      - Sets transfer status appropriately.

- **Issuing to clients:**
  - Done **from the visit/consultation screen**, not this inventory page (see §8.4).

### 8.3 Central Store UX – “Central Store Transfers & Requisitions”

One main page for central store staff:

- **Tabs or filters:**
  - `Requisitions` | `Transfers Out` | `Transfers In` (for returns) | `All`.

- **Requisitions tab:**
  - List of `stock_requisitions` where `fulfilling_location_id = central_store_location.id`.
  - Grouped by status with color-coded pills:
    - “New” (submitted), “Approved”, “In transit”, “Completed”.
  - **Actions per requisition:**
    - “Approve & Prepare Transfer”:
      - Opens a panel with all requested items and their current central stock.
      - Defaults `approved_quantity = requested_quantity` where stock is sufficient.
      - On confirm:
        - Sets requisition status to `approved`.
        - Creates a `stock_transfer` + `stock_transfer_items`.
        - Immediately shows the transfer in the `Transfers Out` tab.

- **Transfers Out tab:**
  - List of `stock_transfers` with `from_location_id = central_store_location.id`.
  - **Primary action:**
    - “Dispatch now”:
      - Confirm dialog with optional `dispatched_at` time.
      - On confirm:
        - Records `dispatched_by_id`, `dispatched_at`.
        - For each item:
          - Creates `transfer_out` `inventoryTransactions` rows at central store.
        - Updates status to `in_transit`.
  - Optionally a quick-create “Ad-hoc Transfer”:
    - For small sites, allow central to directly choose:
      - `to_location_id` + items + quantities.
    - Behind the scenes:
      - Creates a `stock_transfer` and immediately dispatches it (skipping requisition and approval UI).

### 8.4 Clinic Issues to Clients – Embedded in Visit UX

The dispensing workflow should **never force users to leave the visit**:

- On the medical visit/consult page (where `activeLocation` is already known):
  - Add an “Items used / dispensed” card:
    - Search box scoped to `medical_inventory` at `activeLocation`.
    - Simple line items: `[item] [qty] [unit] [Remove]`.
    - Optional shortcuts:
      - “Last used for this patient”.
      - “Common items at this location”.
  - On visit save/complete:
    - For each line:
      - Create `inventoryTransactions` rows with:
        - `transaction_type = 'issue_to_client'`
        - `location_id = activeLocation.id`
        - `patient_id`, `medical_visit_id`
    - If save fails, no stock is modified.

- Returns from clients:
  - From the same visit (or patient record), a simple “Record return” action:
    - Shows items previously issued from this visit.
    - User selects items + quantity returned.
    - Creates `return_from_client` transactions at the clinic’s location.

This keeps clinic staff in their **clinical context** and avoids a separate “dispense screen” unless the future pharmacy module requires one.

### 8.5 Power-User / Admin UX

To reduce friction for regular users, more advanced operations can be kept in admin/power-user views:

- **Advanced inventory transactions:**
  - A dedicated “Inventory Transactions” page (already exists) that:
    - Allows filtered views by `location_id`, `transaction_type`.
    - Allows manual adjustments with clear warnings and optional approvals.
  - Regular clinicians should rarely need to open this.

- **Configuration screens:**
  - Managing central store designation, default `fulfilling_location_id`, and advanced statuses can live under Admin/Settings, not in day-to-day workflows.

---

**Result:**  
The data model remains robust (full audit trail, clear per-location stock, rich transaction types), but typical users experience **simple, embedded flows**:
- Clinics mostly interact through “Clinic Stock & Requests” and the visit screen.
- Central store works from a single “Transfers & Requisitions” hub with minimal steps.
- All location context uses the existing `careLocations` + session `activeLocation`, so users almost never pick locations manually.

---

## 9. Backend Enforcement & Scoping (Implemented)

To prevent items from one context (e.g. a visit) being tied to another (e.g. an incident) and to keep data tenant-, location-, patient-, and document-scoped:

### 9.1 Creating `issue_to_client` transactions (POST `/api/inventory-transactions`)

- **Visit-scoped** (when `medicalVisitId` is in the body):
  - Backend loads the visit with `getMedicalVisit(medicalVisitId, tenantId)`. If not found → 404.
  - If body `patientId` is provided and does not match `visit.patientId` → 400.
  - Stored transaction uses **patientId**, **locationId** (from visit if not in body), **documentType = 'visit'**, **documentId = visit.id**, **medicalVisitId = visit.id**.
- **Incident-scoped** (when `documentType === 'incident'` and `documentId` is present):
  - Backend loads the incident with `getIncidentReport(documentId, tenantId)`. If not found → 404.
  - If body `patientId` is provided and does not match `incident.patientId` → 400.
  - Stored transaction uses **patientId**, **locationId** (from incident if not in body), **documentType = 'incident'**, **documentId = incident.id**, and **medicalVisitId = null** (forced so incident transactions never link to a visit).
- **patientId** is required for all `issue_to_client` transactions; it is taken from the validated visit or incident when applicable.

### 9.2 Fetching transactions (GET `/api/inventory-transactions`)

- **By visit** (`?medicalVisitId=...`): Only rows where `medical_visit_id = ...` **and** (`document_type = 'visit'` OR `document_type IS NULL`). Excludes any incident rows.
- **By incident** (`?documentType=incident&documentId=...`): Only rows where `document_type = 'incident'`, `document_id = ...`, **and** `medical_visit_id IS NULL`. Excludes visit-linked rows.

### 9.3 Inventory list (GET `/api/inventory`)

- When the client does **not** send `locationId`, the API uses the **session's active location** (or the tenant's primary location for single-location tenants) to filter items. Items returned are only from that store.
- When the client sends `locationId`, that value is used (e.g. for a specific visit/incident location).


