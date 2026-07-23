# Point of Sale (POS) — Operations Guide

uventorybiz includes a full retail point-of-sale module: multi-till registers, cash-drawer shifts, barcode scanning, cart-based selling with tax, split-tender payments, receipts, voids, and returns. Every sale decrements inventory stock atomically, and every return restocks it.

This guide covers concepts, admin setup, the daily cashier workflow, the API surface, the data model, and current limitations.

---

## 1. Concepts

| Concept | What it means |
|---|---|
| **Register** | A till / checkout point, tied to one store location. A business can have any number of registers per location (e.g. "Front counter", "Till 2"). |
| **Shift** | A cash-drawer session on a register. A cashier opens a shift with an opening float, sells during it, and closes it with a counted closing float. Only one shift can be open per register at a time. |
| **Sale** | A transaction. It starts as a `draft` (cart), and becomes `completed` when paid, `voided` if abandoned, or is created with status `returned` for refunds. |
| **Sale line** | One item on a sale: item, quantity, unit price, tax rate, line total. |
| **Payment** | One tender against a sale: `cash`, `card`, `mobile_money`, `credit` (pay later), or `other`. A sale can have multiple payments (split tender). |
| **Return** | A refund transaction linked to an original completed sale. Returned quantities go back into stock. |
| **Receipt number** | Assigned when a sale completes, in the format `RCP-YYYYMMDD-0001` (per-tenant daily sequence). |

All POS data is tenant-isolated: registers, shifts, sales, and reports only ever show your own business's data.

### How POS relates to Inventory

- POS sells **inventory items** that have a **stock row at the register's location**. Item search and barcode lookup only return items stocked at that location.
- The sale price is taken from the stock row's **unit cost** field (`inventory_stock.unit_cost`). Set it when creating/editing the item — and receiving a purchase order automatically updates it to the PO line's unit cost (last-cost valuation).
- Completing a sale **decrements** `current_stock`; a return **increments** it. Both happen inside a single database transaction with row locking, so concurrent tills cannot oversell the same stock.
- A sale is rejected if any line would drive stock below zero.
- New businesses start with an **empty inventory** — no catalog is seeded. Add your own products under **Inventory** before selling.

---

## 2. Access & permissions

- The POS screen lives at **`/pos`** (sidebar: *Inventory → Point of Sale*).
- It requires a staff-level account: roles `staff`, `admin`, or `super_admin` (`STAFF_ACCESS_ROLES`).
- All POS API endpoints require an authenticated session and are scoped to the caller's tenant.

---

## 3. One-time setup (admin)

1. **Locations** — make sure your store location(s) exist (Admin → Locations). Every register belongs to a location.
2. **Inventory** — create your products under **Inventory**:
   - Give each item a name, category, and unit of measure. An item code is generated automatically if you don't supply one.
   - Set the **unit cost** on the stock record — this is the price POS charges.
   - Add a **barcode** if you use a scanner.
   - Set the stock quantity at the location where it will be sold.
3. **Tax** — the tenant's `default_tax_rate` (stored on the business record, e.g. `0.15` for 15% VAT) is applied to every sale line unless the line specifies its own rate. Rate `0` means tax-free.
4. **Registers** — on the POS page, click **New register**, give it a name (e.g. "Front counter") and pick its location.

---

## 4. Daily operation (cashier workflow)

### 4.1 Open a shift

1. Go to **`/pos`** and select your register from the dropdown.
2. Click **Open shift**, enter the **opening float** (cash placed in the drawer), and confirm.
3. The register is now live. Selling is disabled until a shift is open.

### 4.2 Ring up a sale

Add items to the cart in either way:

- **Barcode**: scan (or type) into the *Scan or enter barcode* box and press **Add**. Unknown barcodes show a "Barcode not found" error.
- **Search**: type at least 2 characters of the item's name, code, or barcode; click a result to add it.

Cart behavior:

- Adding the same item again increments its quantity (capped at available stock).
- Edit the quantity directly in the line's number box; remove a line with the trash icon.
- Subtotal, tax, and total update live.

### 4.3 Take payment

1. Under **Payments**, choose the method (**Cash / Card / Other**) and enter the amount.
2. For split tender, click **Add payment** and enter each tender (e.g. part cash, part card).
3. The **Complete sale** button enables only when payments cover the total.
4. Click **Complete sale**. Behind the scenes this creates the draft sale, saves the lines, takes payment, assigns a receipt number, and decrements stock — atomically. If stock ran out in the meantime, the sale is rejected and nothing is charged or deducted.

### 4.4 Receipt & sales history

After completion the POS redirects to **Sales History** (`/sales`) with the new receipt
open in a dialog, ready to print via the browser. The Sales History page lists all POS
sales **and portal online orders** (sales with `portal_order_id`, shown with a Portal badge).
Portal orders create a sale and deduct stock when staff mark them ready for pickup / out for
delivery — see [PORTAL_SALES_PO_INVOICE_EXCEPTIONS_PLAN.md](./PORTAL_SALES_PO_INVOICE_EXCEPTIONS_PLAN.md).
sales (paginated, newest first) with receipt number, customer, store, salesperson, item
count, payment methods, amount, status, and date. Row actions:

- **View** — opens the full receipt (lines, tax, totals, payments).
- **Print receipt** — opens the receipt and triggers the browser print dialog.
- **Return** — starts a return against that sale (only on completed sales, and only
  when returns are enabled; see §5).

The list can be filtered by status (completed / returns / voided / drafts) and searched
by receipt number or customer name. Any past receipt can also be re-fetched with
`GET /api/pos/sales/:id`.

### 4.5 Void a draft

If a cart was started but shouldn't be charged, click **Void draft**. Only `draft` sales can be voided; completed sales must be handled as returns.

### 4.6 Close the shift

At end of day (or handover), click **Close shift**, count the drawer, and enter the **closing float**. Notes are optional (e.g. discrepancies). The shift records who opened/closed it and when.

---

## 5. Returns & refunds

In-person returns are processed from the POS page via the **Returns** button (look up
the original sale by receipt number) or directly from **Sales History** via the row's
**Return** action (pre-loaded, no lookup needed). Choose quantities to return and
process the refund. The same flow is available via the API:

```
POST /api/pos/sales/:id/return
{
  "lines": [{ "inventoryItemId": "<uuid>", "quantity": 1 }],
  "reason": "Damaged in box",
  "payments": [{ "method": "cash", "amount": 11.50 }]   // optional; defaults to cash for the full refund value
}
```

Rules enforced by the server:

- Returns must be enabled for the business (**Settings → Returns & refunds**,
  `tenants.returns_enabled`). When disabled, the Returns button is hidden and the
  endpoint rejects requests. The same toggle gates portal return requests
  (see `PORTAL_GUIDE.md` §5a).
- Portal customer return *requests* are also limited by **`tenants.return_window_days`**
  (default 3 days after receipt/completion). In-person POS refunds are **not** limited by that window.
- Only **completed** sales can be returned.
- Each item must appear on the original sale, and cumulative returns can never exceed the quantity originally sold (partial and multiple returns are tracked).
- Refund pricing reuses the original unit price and tax rate.
- Refund tender may be cash, card, mobile money, credit (pay later), or other.
- The return is recorded as its own sale (status `returned`) with its own receipt number, linked to the original via `pos_returns`, and stock is restocked in the same transaction.

---

## 6. Reports

`GET /api/pos/reports/daily?date=YYYY-MM-DD&registerId=<optional>` returns, for completed sales on that day: sale count, gross/tax totals, and a per-payment-method breakdown. The dashboard's **Sales Today** card uses the same underlying data.

---

## 7. API reference

All endpoints are mounted under `/api` and require an authenticated staff session.

| Method & path | Purpose |
|---|---|
| `GET /pos/registers?locationId=` | List registers (optionally by location) |
| `POST /pos/registers` | Create a register (`{ locationId, name }`) |
| `GET /pos/registers/:id` | Get one register with its location name |
| `POST /pos/shifts/open` | Open a shift (`{ registerId, openingFloat, notes? }`). 409 if one is already open |
| `POST /pos/shifts/:id/close` | Close a shift (`{ closingFloat, notes? }`) |
| `GET /pos/shifts/current?registerId=` | The open shift for a register, or `null` |
| `GET /pos/items/search?locationId=&q=` | Search sellable items at a location (name/code/barcode, max 25) |
| `GET /pos/items/barcode/:barcode?locationId=` | Exact barcode lookup at a location |
| `POST /pos/sales` | Create a draft sale (`{ registerId, shiftId, customerId?, notes? }`) |
| `PATCH /pos/sales/:id` | Replace the draft's lines (`{ lines: [{ inventoryItemId, quantity, unitPrice, taxRate?, barcodeSnapshot? }] }`) |
| `POST /pos/sales/:id/pay` | Complete the sale (`{ payments: [{ method, amount }] }`). Validates payment ≥ total; decrements stock atomically |
| `POST /pos/sales/:id/void` | Void a draft sale |
| `POST /pos/sales/:id/return` | Return items from a completed sale (see §5) |
| `GET /pos/sales?page=&pageSize=&status=&q=` | Paginated sales history (customer, store, salesperson, item count, payment methods). Drafts excluded unless `status=draft` |
| `GET /pos/sales/:id` | Full sale detail / receipt (sale, lines, payments, register, location) |
| `GET /pos/reports/daily?date=&registerId=` | Daily sales summary |

Error convention: `400` validation, `404` not found, `409` state conflicts (e.g. shift already open, sale not a draft), with `{ message, code }` bodies.

---

## 8. Data model

Six tenant-scoped tables (all UUID keys, `created_at`/`updated_at`):

```
pos_registers      one row per till (tenant, location, name, is_active)
pos_shifts         drawer sessions (register, opened/closed by+at, opening/closing float, status)
pos_sales          transactions (register, shift, location, cashier, optional customer,
                   status: draft|completed|voided|returned, subtotal/tax_total/total,
                   currency_code, receipt_number, completed_at/voided_at)
pos_sale_lines     items on a sale (item, qty, unit_price, tax_rate, tax_amount, line_total,
                   barcode_snapshot)
pos_payments       tenders (method: cash|card|mobile_money|credit|other, amount)
pos_returns        links a return sale to its original sale (reason, created_by)
```

Money amounts are stored as strings for decimal precision; the tenant's `currency_code` (default `GHS`) is snapshotted onto each sale. Stock movements from POS are recorded against inventory with document types `pos_sale` / `pos_return`.

---

## 9. Current limitations / roadmap

- **Customer attachment** — sales accept an optional `customerId`; the POS screen has a basic customer search/picker.
- **Line price/tax edits at the till** — the UI charges the stock unit cost with the default tax rate; per-line overrides are supported by the API (`PATCH /pos/sales/:id`).
- **Receipt printing** — uses the browser print dialog; no thermal-printer/ESC-POS integration.
- **Discounts & promotions** — not yet modeled.
- **Receipt numbering** — sequence is computed per day per tenant; under very high concurrency two simultaneous completions could collide (known trade-off documented in code).
- **Credit (pay later)** — recorded as a tender method only; no separate AR / collections workflow yet.

---

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Item search returns nothing | The item has no stock row at the register's location, or fewer than 2 characters were typed. Check Inventory for that location. |
| "Register already has an open shift" | Another cashier left a shift open. Close it (Close shift) before opening a new one. |
| **Complete sale** stays disabled | Payments don't cover the total, the cart is empty, or no shift is open. |
| Sale rejected with a stock error | Another till sold the last units first. Refresh, adjust quantity, retry. |
| Price shows 0.00 | The stock row has no unit cost set. Edit the item's stock record in Inventory. |
| Tax is 0 | The business's `default_tax_rate` is 0. Update the tenant settings. |
