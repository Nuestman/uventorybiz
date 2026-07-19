# Customer & Supplier Portal Guide

The portal is the external-facing side of uventorybiz: a tenant-scoped, branded web
portal where a business's **customers** and **suppliers** sign in to interact with the
business. It replaces the legacy patient/employee portal from the MineAid era — the
patient → employee bridge is fully deprecated for account acquisition; portal accounts
are linked **directly to customer or supplier records**.

- Portal URL: `/portal` (marketing page) and `/portal/login` (sign-in)
- Branded link: `/portal/login?org=<portal-slug>` — loads the tenant's name, logo, and colors
- All portal APIs live under `/api/portal/*`; admin management APIs under `/api/admin/portal-*`

---

## 1. Who can use the portal

| Party | Source record | Portal capabilities (current) |
|---|---|---|
| Customer | `customers` row (with email) | Dashboard, **shop & place orders (pickup or delivery)**, **track/cancel orders**, **Support (system issues)**, profile & password, notification preferences |
| Supplier | `suppliers` row (with email) | Dashboard, **view purchase orders issued to them**, **submit invoices**, **Support (system issues)**, profile & password, notification preferences |

A person can get a portal account only if a matching **customer** or **supplier**
record exists in the tenant (matched by email), or if an admin provisions an account
manually and links it to a record.

## 2. Enablement & settings

Every tenant has one row in `tenant_portal_settings`:

| Column | Meaning |
|---|---|
| `enabled` | Master switch. **Created `TRUE` automatically when a tenant is created** (and backfilled for existing tenants by migration 0009). |
| `support_email` | Shown on the portal; also receives access-request notifications. |
| `privacy_policy_url` | Linked from portal emails and pages. |
| `features_json` | Per-tenant feature toggles (e.g. `messaging`). |

Admins manage these under **Settings → Portal** (company admins only), including the
**portal slug** (stored on `tenants.portal_slug`) that powers the branded sign-in link.

> If the settings row is missing or `enabled = false`, email lookup cannot resolve the
> tenant and public sign-in/access requests fail. This was the cause of the
> `org_required` / "Use your organization's personalized portal link" errors.

## 3. Authentication flows

### 3.1 Email lookup (`POST /api/portal/public/email-lookup`)

Given an email (+ optional org slug), the server resolves in this order **within a tenant**:

1. `portal_users.email` — existing portal account
2. `customers.email` — customer record without an account
3. `suppliers.email` — supplier record without an account

Statuses returned (shared type `PortalEmailLookupStatus`):

| Status | Meaning |
|---|---|
| `portal_active` | Account exists and can sign in (magic link offered) |
| `portal_suspended` / `portal_locked` | Account exists but is blocked |
| `record_no_account` | Email matches a customer/supplier record but no portal account yet — an access request can be submitted |
| `not_found` | No customer, supplier, or portal account matches |
| `ambiguous` | Email matches records in multiple tenants — must use the branded link |
| `org_required` | No tenant could be resolved from the email — must use the branded link |
| `portal_disabled` | Tenant portal is switched off |

Without a slug, the server searches portal users, customers, and suppliers across all
tenants **whose portal is enabled**; a single match resolves the tenant automatically.

### 3.2 Magic link (`POST /api/portal/auth/magic-link`)

For `portal_active` accounts a one-time sign-in link is emailed (rate limited).
Completing the link (`/portal/magic?token=…`) creates a portal session cookie.

### 3.3 Password sign-in (`POST /api/portal/auth/login`)

Requires the org context (slug). 5 failed attempts → 15-minute lockout.
Sessions are validated per request with idle/absolute timeouts (see
`SESSION_SECURITY_AND_MFA.md`).

### 3.4 Access requests (`POST /api/portal/public/access-request`)

Anyone can request access from the sign-in page. The request is stored in
`portal_access_requests` with the matched party captured:

- `customer_id` / `supplier_id` — set when the email matched a record (`match_kind`:
  `customer_on_file` / `supplier_on_file`)
- `portal_user_id` — set when the email matched an existing account (`sign_in_help`)
- neither — `match_kind: unknown`; the admin must create the customer/supplier record
  first (approval is blocked until a record is linked)

Admins are notified in-app (`portal_access_request` notification type) and via the
portal support email. Rate limit: 3 pending requests per email per 15 minutes.

### 3.5 Admin approval

**Settings → Portal → Access requests** lists pending requests with the matched
customer/supplier. Approving:

1. Creates the portal account linked to the matched customer/supplier (or reactivates
   a suspended one, and updates the email if it changed).
2. Emails the person a welcome message with a magic link + temporary password
   (or just a fresh magic link for existing active accounts).

Rejecting records the reviewer + optional notes; no credentials are sent.

## 4. Admin account management (Settings → Portal)

- **Add portal account** — pick Customer or Supplier, search the record, set login
  email + temporary password. A welcome email with a sign-in link is sent.
  (`POST /api/admin/portal-users` with `partyType` + `customerId`|`supplierId`.)
- **Suspend / reactivate** — suspending also revokes all active sessions.
- **Resend magic link**, **delete account**.
- One portal account per customer/supplier record; email unique per tenant.

## 5. Portal user experience (current)

- **Dashboard** — greeting, quick access cards tailored to the party type.
- **Shop** (customers) — browse sellable products per store location (active items
  with stock on hand and a price), cart, checkout with **pickup** (choose location)
  or **delivery** (address required), optional order notes.
- **My orders** (customers) — order history with live status, item lines, totals,
  staff notes; pending orders can be cancelled by the customer. Once ready for
  pickup / out for delivery the customer can **confirm receipt** (completes the
  order) or **report it as not received**; for delivery orders the courier's
  name/phone is shown. After staff confirm an order, the UI tells the customer to
  call the business to cancel. On completed orders the customer can **request a
  return** (if the business has returns enabled). List UX: status filters
  (All / Active / Needs action / Completed / Cancelled), status dropdown, and
  client-side pagination (`PortalPagination`). The sidebar does **not** badge
  My orders for unread order-update notifications (Messages keeps the messaging
  unread badge).
- **Purchase orders & invoices** (suppliers) — POs issued to them (approved and
  later stages only; drafts stay hidden), PO detail with line items and received
  quantities, and invoice submission (against a PO or standalone) with status
  tracking (submitted → accepted/rejected → paid).
- **Settings/Profile** — account email, password change, notification preferences
  (including **Order updates**, email + in-app).
- **Support** — report system-related portal issues (login, shop, orders UX). Nav item
  **Support** → `/portal/support` when the platform `tickets` flag is on. Creates staff
  tickets (`source=portal`, category `it-systems`); APIs under `/api/portal/support-tickets`.
  Staff see them in **Staff Tickets** and get `portal_system_issue` notifications.
- **Secure messaging** — feature-flagged (`features_json.messaging` + platform `messaging` flag). Available to customer and supplier portal accounts (**PortalUser**-centric threads; no patient bridge). Staff inbox is under **Operations → Messages** (`/messages`), including staff↔staff threads. Staff recipient picker: `GET /api/messaging/portal-recipients`.
- **UI chrome** — desktop top bar breadcrumbs (`Customer & supplier portal › {page}`); see also staff/Super Admin trails in [APP_NAVIGATION_AND_BREADCRUMBS.md](./APP_NAVIGATION_AND_BREADCRUMBS.md).

- **Appointments** — legacy module; disabled platform-wide via the `appointments`
  platform feature flag.

## 5a. Customer ordering flow

1. Customer places an order (`POST /api/portal/orders`). The server prices each line
   from `inventory_stock.unit_cost` at the fulfilment location (pickup location, or
   the primary location for delivery), validates quantities against stock on hand,
   and snapshots item names/prices onto the order lines.
2. Order starts **pending**. Staff admins are notified (`portal_order_placed`
   notification type, email + in-app, preference-based).
3. Staff manage orders under **Inventory Management → Portal Orders** (`/orders`):
   confirm, mark ready for pickup (pickup orders) / out for delivery (delivery
   orders), complete, cancel, or reject. Transitions are fulfillment-aware and
   validated (`allowedOrderTransitions` in `shared/portalOrders.ts`) — pickup
   orders never pass through *out for delivery*.
4. When dispatching a delivery, staff can record the **courier's name and phone**
   (`delivery_contact_*`); these are shown to the customer while the order is out
   for delivery (and included in the notification email).
5. **Receipt confirmation** — moving to *ready for pickup* or *out for delivery*
   sets `ready_at` and starts a **3-day grace window** (`ORDER_RECEIPT_GRACE_DAYS`):
   - The customer confirms receipt (`POST /api/portal/orders/:id/confirm-receipt`)
     → order completes immediately (`receipt_confirmed_at` set).
   - Or reports a problem (`POST /api/portal/orders/:id/not-received`, optional
     reason) → order moves to **not_received** and staff admins are notified
     (`portal_order_issue` type). Staff resolve by re-dispatching/re-staging
     (which restarts the grace window), completing, or cancelling.
   - Staff cannot mark the order complete until the grace window ends (server
     returns `GRACE_PERIOD`); after it ends, the daily cron (6:30 AM,
     `processPortalOrderAutoCompletion`) auto-completes any order still awaiting
     confirmation and notifies the customer.
6. **Returns** — on a *completed* order the customer can request a return
   (`POST /api/portal/orders/:id/request-return`, optional reason) → order moves to
   **return_requested** and staff admins are notified (`portal_order_issue` type).
   Staff process the refund through the POS (Returns → look up the receipt) and mark
   the order **returned**, or move it back to *completed* to decline. Gated by the
   per-business **Returns & refunds** toggle (`tenants.returns_enabled`, managed in
   Settings), which also gates in-person POS returns.
7. Each staff status change notifies the customer (portal in-app notification +
   email, honouring the customer's `order_updates` preferences).
8. Stock is **not** decremented by portal orders — fulfil the order through the POS
   or an inventory transaction as part of your normal process. Staff see orders and
   invoices needing action (pending, not received, return requested, submitted
   invoices) as a badge on the **Portal Orders** sidebar item
   (`GET /api/orders/attention-count`), and not-received / return-requested rows are
   highlighted in the Orders list.

## 5b. Supplier invoicing flow

1. Supplier sees POs with status `approved` / `ordered` / `partially_received` /
   `completed` (`GET /api/portal/supplier/purchase-orders`).
2. Supplier submits an invoice (`POST /api/portal/supplier/invoices`) — invoice
   number (unique per supplier), amount, optional PO link, date, and notes. Staff
   admins are notified (`supplier_invoice_submitted` type).
3. Staff review invoices on the **Portal Orders → Supplier invoices** tab:
   accept, reject, or mark paid.

## 6. Data model

| Table | Purpose |
|---|---|
| `portal_users` | Accounts. `party_type` (`customer`\|`supplier`), `customer_id`, `supplier_id` (FKs, cascade), unique (tenant, email), lockout fields. `patient_id` remains only as a deprecated legacy column. |
| `portal_access_requests` | Public access/sign-in-help requests. `customer_id`/`supplier_id` (FKs, set-null), `request_kind`, `match_kind`, review fields. |
| `tenant_portal_settings` | Per-tenant enablement + features (one row per tenant, created at tenant creation). |
| `portal_sessions` | Session tokens (idle/absolute expiry). |
| `portal_audit_events` | Sign-ins, failures, magic-link events, orders placed/cancelled, invoices submitted. |
| `portal_notification_preferences` | Per-user, per-key, per-channel opt-outs (includes `order_updates`). |
| `portal_orders` | Customer orders. `order_number` (unique per tenant, `ORD-YYYYMMDD-NNN`), status enum (incl. `not_received`, `return_requested`, `returned`), `fulfillment_type` (`pickup`\|`delivery`), `location_id`, `delivery_address`, customer/staff notes, courier contact (`delivery_contact_name`/`_phone`), receipt-window fields (`ready_at`, `receipt_confirmed_at`, `not_received_at`, `not_received_reason`), return fields (`return_requested_at`, `return_reason`, `returned_at`), money as decimal strings. |
| `portal_order_items` | Order lines with `item_name_snapshot` / `item_code_snapshot` / `unit_price` snapshots (survive catalog edits); `item_id` FK set-null. |
| `supplier_invoices` | Supplier-submitted invoices. Unique (tenant, supplier, invoice_number), optional `purchase_order_id`, status enum (`submitted`/`accepted`/`rejected`/`paid`), review fields. |

Relevant migrations:

- `drizzle/0009_uventorybiz_portal_customer_supplier.sql` — replaced
  `patient_id`/`employee_id` on `portal_access_requests` with `customer_id`/`supplier_id`
  and backfilled a `tenant_portal_settings` row (enabled) for every tenant.
- `drizzle/0010_uventorybiz_portal_orders.sql` — added `portal_orders`,
  `portal_order_items`, `supplier_invoices`, plus the `portal_order_placed` and
  `supplier_invoice_submitted` staff notification types with default admin preferences.
- `drizzle/0011_uventorybiz_order_receipt_flow.sql` — added the `not_received`
  order status, courier contact and receipt-window columns on `portal_orders`,
  and the `portal_order_issue` staff notification type with default admin preferences.
- `drizzle/0012_uventorybiz_order_returns.sql` — added the `return_requested` and
  `returned` order statuses, return columns on `portal_orders`, and the per-business
  `tenants.returns_enabled` toggle.

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| 400 "Use your organization's personalized portal link" (`org_required`) | Email doesn't match any enabled tenant's portal user/customer/supplier. Check the record's email, or use `/portal/login?org=<slug>`. |
| 403 "portal is not available" (`portal_disabled`) | `tenant_portal_settings.enabled` is false for the tenant. |
| "No portal account yet" (`record_no_account`) | Customer/supplier record exists but no account — submit an access request or have an admin add the account. |
| Approve fails: "no customer or supplier record is linked" | The request matched nothing; create the customer/supplier record, then add the portal account manually. |
