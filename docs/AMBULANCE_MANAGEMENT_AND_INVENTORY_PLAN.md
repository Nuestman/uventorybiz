# Ambulance Management & Ambulance Inventory — Comprehensive Plan

**Version:** 1.1.0  
**Status:** Phase 1 implemented (fleet register, pre-start checks, on-board inventory, transfer receive); this document now tracks current state + next phases  
**Last Updated:** April 1, 2026  
**Related docs:** [INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md), [MULTI_LOCATION_SYSTEM_DOCUMENTATION.md](./MULTI_LOCATION_SYSTEM_DOCUMENTATION.md), [RBAC.md](./RBAC.md)

---

## Table of Contents

1. [Executive overview](#1-executive-overview)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Design principle: ambulance as an inventory location](#3-design-principle-ambulance-as-an-inventory-location)
4. [Data model](#4-data-model)
5. [Operations module: ambulance management features](#5-operations-module-ambulance-management-features)
6. [Inventory integration](#6-inventory-integration)
7. [API surface (conceptual)](#7-api-surface-conceptual)
8. [UI/UX (conceptual)](#8-uiux-conceptual)
9. [RBAC and security](#9-rbac-and-security)
10. [Reporting and audits](#10-reporting-and-audits)
11. [Implementation phases](#11-implementation-phases)
12. [Dependencies, risks, open decisions](#12-dependencies-risks-open-decisions)

---

## 1. Executive overview

### Purpose

Add **ambulance management** under the existing **Operations** area of MineAid HMS, and treat **each ambulance** as a **first-class inventory location** so that:

- Stock on an ambulance is tracked with the same **master catalog + per-location stock + transaction history** model already described in [INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md).
- Users can **transfer** supplies and equipment **to/from** an ambulance from the **central store**, **clinics/FAPs**, or other locations using the same **requisitions, transfers, receiving, returns, and quantity adjustment** patterns as today.
- Operational users can see **which ambulances exist**, their **operational status**, and (where configured) **crew/duty linkage** without duplicating a parallel “shadow inventory” system.

### Business value

- **One source of truth** for what is on each ambulance, aligned with site-wide inventory and audits.
- **Reduced stock-outs** on ambulances through the same low-stock and transaction visibility as fixed locations.
- **Compliance** via immutable movement history (`inventory_transactions`) tied to locations and documents.
- **Operational clarity** by colocating fleet-oriented tasks with other Operations workflows (appointments, duties, reports).

---

## 2. Goals and non-goals

### Goals

1. **Inventory parity:** Ambulance stock is **inventory_stock** at a **location_id** that represents that ambulance; movements are **inventory_transactions** (and transfers/requisitions as applicable).
2. **Transfers:** Support **central store ↔ ambulance**, **clinic/FAP ↔ ambulance**, and **ambulance ↔ ambulance** if the product allows multiple ambulances per tenant.
3. **Adjustments:** Support **positive/negative adjustments** at ambulance locations with reason codes and audit fields, consistent with other locations.
4. **Operations UI:** New **Operations** navigation entries for ambulance list/detail (and optional dispatch/assignment views) per [RBAC](#9-rbac-and-security).
5. **Tenant isolation:** All data scoped by `tenant_id` like existing care locations and inventory.

### Non-goals (initial phase)

- Full **CAD/dispatch** system, GPS fleet tracking, or integration with external emergency services (unless later phase).
- **Billing** per ambulance run or per transport (optional future).
- Replacing **clinical** documentation (e.g. runsheets as legal medical records) unless explicitly scoped later.

---

## 3. Design principle: ambulance as an inventory location

Today, **clinics and FAPs** are modeled as **`care_locations`** with **`inventory_stock`** per `(item_id, location_id)` ([INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md)).

**Recommended approach:** Represent each ambulance as a **`care_locations`** row (or a row strongly linked to one) so that:

- **No new inventory engine** is required: `stock_transfers`, `inventory_transactions`, and requisitions continue to use `location_id` / `from_location_id` / `to_location_id`.
- **Session location** and reporting can optionally treat “active ambulance” like any other site (see [open decisions](#12-dependencies-risks-open-decisions)).

**Alternative (not preferred unless product requires it):** A separate `ambulances` table **without** a `care_locations` row would force **duplicate** transfer endpoints or mapping layers. If introduced, each ambulance should still **mirror** a dedicated `care_locations` id used **only** for inventory to avoid branching logic in stock math.

---

## 4. Data model

### 4.1 Care location extension

To distinguish **fixed care sites** from **mobile units**, add metadata either:

- **Option A (preferred):** Extend **`care_locations`** with:
  - `location_kind` enum: e.g. `fixed_site`, `ambulance`, `other_mobile`.
  - Optional fields when `location_kind = ambulance`: `call_sign`, `registration_plate`, `fleet_number`, `capacity_notes`, `default_base_location_id` (FK to a fixed `care_locations` row representing “home” station/clinic).
- **Option B:** New table **`ambulances`** with `id`, `tenant_id`, `care_location_id` (1:1), plus fleet/ops fields. Inventory **always** uses `care_location_id`.

**Why:** Operations screens need fleet fields; inventory only needs a stable `location_id`.

### 4.2 Inventory (unchanged pattern)

- **`inventory_items`:** Master catalog (unchanged).
- **`inventory_stock`:** One row per `(tenant_id, item_id, location_id)` where `location_id` is the ambulance’s location.
- **`inventory_transactions`:** All issues, receipts, transfers, adjustments; `location_id` and `counterparty_location_id` as today for transfers.

### 4.3 Optional operational entities (later phases)

- **`ambulance_assignments` or linkage to `operational_duties`:** Which crew is associated with which ambulance for a shift.
- **`ambulance_dispatch_events`:** Lightweight log of “out of service / available / on call” (if not covered by duties alone).

These are **orthogonal** to inventory; they feed **Operations** dashboards and reports.

---

## 5. Operations module: ambulance management features

### 5.1 Placement in the app

- **Sidebar:** Standalone **Ambulance & EMS** module with tab navigation:
  - `#fleet` — register/manage units.
  - `#pre-start` — pre-start safety checks.
  - `#inventory` — on-board inventory management UI (ambulance-only stock scope).
- **Unit detail route:** `/ambulance/units/:id` with tabs for Overview, On-board stock, Movements, Transfers.

### 5.2 Core features (implemented)

| Feature | Description |
|--------|-------------|
| **Fleet register** | CRUD for ambulances with fleet identifiers, stationing info, and ops status. |
| **Status** | `available`, `deployed`, `standby`, `out_of_service` on ambulance rows. |
| **Home base / stationing** | Optional link to a fixed location, plus pooled coverage notes. |
| **On-board inventory tab** | Embedded inventory UI scoped to `ambulanceOnly=true` with ambulance location filtering. |
| **Transfer receive action** | Ambulance unit detail transfers tab can mark inbound `in_transit` transfers as received. |

### 5.3 Secondary features (phase 2+)

- **Duty integration:** tie ambulance to **Operational Duties** or **assignment history** when the product already models shifts.
- **Checklists** — pre-trip equipment checklist (non-clinical logistics) stored as structured tasks or forms.
- **Maintenance** — integration with **equipment_maintenance** if ambulances are equipment records; or separate maintenance tickets (see [E_TICKETING_STAFF_PLAN.md](./E_TICKETING_STAFF_PLAN.md)).

---

## 6. Inventory integration

### 6.1 Flows to support (same as existing locations)

| Flow | From → To | Notes |
|------|-----------|--------|
| **Central store → ambulance** | Dispatch / transfer | Standard `stock_transfers` + receive. |
| **Clinic → ambulance** | Same | e.g. restock before shift. |
| **Ambulance → central store** | Return transfer | Unused stock return. |
| **Ambulance → clinic** | Transfer | Patient handoff scenarios (optional). |
| **Ambulance → ambulance** | Transfer | Multi-tenant fleet with multiple units. |
| **Adjustment** | At ambulance `location_id` | Damaged, expired, lost, count correction. |
| **Issue to patient / incident** | From ambulance stock | Reuse **issue_to_client** / visit/incident flows **if** session or document location is the ambulance location (align with existing visit/incident location rules). |

### 6.2 UX expectations

- **Stock Transfers** page: location pickers include **ambulances**.
- **Ambulance & EMS → On-board inventory:** uses the inventory page in ambulance mode (ambulance-only scope).
- **Ambulance unit detail → Transfers:** includes per-row **Receive** action for inbound transfers.
- **Inventory overview / Transactions:** can be filtered by ambulance location and show transfer counterparties.

### 6.3 Data integrity rules

- Transfers **cannot** complete with negative stock at source; destination rows create or update `inventory_stock` as today.
- **Adjustments** require a **reason** (enum + free text) consistent with other locations.
- Optional: **block** transfers when ambulance status is `maintenance` (configurable).

---

## 7. API surface (conceptual)

| Area | Examples |
|------|----------|
| **Ambulance CRUD** | `GET/POST /api/.../ambulances`, `GET/PATCH/DELETE .../ambulances/:id` (tenant-scoped). |
| **Inventory** | Reuse existing **inventory** and **stock-transfers** routes; **no duplicate** ambulance-specific stock APIs unless a thin wrapper improves UX for mobile. |
| **Metrics** | Optional `GET .../ambulances/:id/stock-summary` aggregating counts by category. |

---

## 8. UI/UX (current)

- **Fleet list:** status, call sign/plate, stationing, on-board stock summary, CRUD actions.
- **Detail:** tabs — **Overview**, **On-board stock**, **Transfers**, **Movements**.
- **Ambulance module tabs:** **Fleet**, **Pre-start checks**, **On-board inventory**.
- **Mobile-friendly:** ambulance users may be on tablets; prefer responsive layouts and large touch targets for stock checks.

---

## 9. RBAC and security

- **Tenant isolation:** All ambulance and stock endpoints enforce `tenant_id` (same as [RBAC.md](./RBAC.md)).
- **Current module access:** `emt`, `medical_staff`, `admin`, `super_admin` (tenant required except platform contexts).
- **Suggested role evolution:** add dedicated ambulance/fleet permissions (or roles) to separate fleet CRUD from full tenant admin and to control receive/dispatch rights per site policy.
- **Least privilege:** Restrict **fleet registration** (create/delete ambulance) to **admin** or a new **`operations_manager`** role if introduced later.

---

## 10. Reporting and audits

- **Inventory transaction history** already provides audit trail; ensure **reports** can filter by `location_kind = ambulance` or by explicit ambulance list.
- **Operational reports:** “Stock value by ambulance”, “transfers to ambulances this month”, “expiring items on ambulance X”.

---

## 11. Implementation phases

| Phase | Scope |
|-------|--------|
| **Phase 1** | `care_locations` (or 1:1) extension for ambulance; fleet list/detail; inventory filters and transfer UX including ambulances. |
| **Phase 2** | Duty/shift linkage; status-driven warnings; optional dashboards. |
| **Phase 3** | Checklists, maintenance integration, advanced analytics. |

---

## 12. Dependencies, risks, open decisions

### Dependencies

- Stable **multi-location inventory** model ([INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md](./INVENTORY_TRANSFERS_AND_ISSUES_PLAN.md)).
- **`care_locations`** lifecycle (create/disable) for ambulance rows.

### Risks

- **User confusion** if ambulances appear in **clinical location** pickers where inappropriate — mitigate with **filtering** by `location_kind` per screen.
- **Duplicate locations** if admins create both a “clinic” and an “ambulance” with the same name — enforce unique **fleet numbers** per tenant.

### Open decisions

1. Should **session location** (active site) ever be set to an **ambulance**, or only fixed sites? (Affects visit/incident default location.)
2. **One inventory location per ambulance** vs. **shared pool** for multiple ambulances (usually one per ambulance).
3. **Naming** in UI: “Ambulance” vs “Mobile unit” for non-ambulance vehicles.

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| 1.1.0 | 2026-04-01 | Updated with implemented Phase 1 scope and current UX/API behaviors |
| 1.0.0 | 2026-04-01 | Initial planning document |
