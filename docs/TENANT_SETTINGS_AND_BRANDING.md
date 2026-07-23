## Tenant Settings & Branding (`/settings`)

**Last updated:** 2026-07-23  
**Scope:** Tenant‑scoped configuration for currency, branding, white‑label options, and returns policy.

---

## Overview

The **Tenant Settings** page (`/settings`) lets an authenticated tenant administrator configure:

- **Currency preference** used across UI and inventory.
- **Returns & refunds**:
  - Master toggle (`returnsEnabled`) — when off, POS returns and portal return requests are blocked.
  - **Portal return window** (`returnWindowDays`, default **3**) — days after receipt/completion during which a customer may request a return. Staff POS refunds are not limited by this window.
- **White‑label branding**:
  - Application name.
  - Logo (sidebar + header).
  - Primary theme color.
  - Favicon.
- **POC lab testing** (pharmacies / laboratories only).

All settings are **tenant‑scoped** and are automatically applied to users in that tenant only. Super admin views that are not tenant‑scoped are unaffected.

---

## Access & Permissions

- **Route:** `/settings`
- **Protection:** Authenticated route (protected by `ProtectedRouteGuard`).
- **Sidebar visibility:**  
  - Shown to any user with a `tenantId` in the **Administration** group.
- **Edit permissions:**
  - Only users with role **`admin`** or **`super_admin`** can change and save settings.
  - Non‑admin tenant users can open the page but see a **read‑only** view (no Save/Restore).

---

## Backend API

All endpoints are mounted under `/api` and are tenant‑aware via `req.user.tenantId`.

### GET `/api/settings`

- **Auth:** Any authenticated user with a tenant.
- **Purpose:** Fetch current tenant’s settings.
- **Response shape:**

```json
{
  "tenantId": "string",
  "tenantName": "string",
  "currencyCode": "GHS",
  "appName": "My Tenant HMS",
  "logoUrl": "https://... or /public/tenants/<tenantId>/tenant-branding/...",
  "primaryColor": "#142F5C",
  "faviconUrl": "https://... or /public/tenants/<tenantId>/tenant-branding/...",
  "returnsEnabled": true,
  "returnWindowDays": 3,
  "pocTestingEnabled": false,
  "businessCategory": "retail"
}
```

### PATCH `/api/settings`

- **Auth:** `admin` or `super_admin` for the current tenant.
- **Purpose:** Update tenant‑scoped settings.
- **Body (partial allowed):**

```json
{
  "currencyCode": "GHS" | "USD" | "EUR" | "GBP" | "ZAR" | "XAF" | "XOF",
  "appName": "string | null",
  "logoUrl": "string | null",
  "primaryColor": "string | null",
  "faviconUrl": "string | null",
  "returnsEnabled": true,
  "returnWindowDays": 3,
  "pocTestingEnabled": false
}
```

- **`returnWindowDays`:** integer **1–365**. Saved via the Returns card **Save** button (independent of branding form).
- **`returnsEnabled` / `pocTestingEnabled`:** toggles save immediately.

---

## Frontend Behavior

### Settings Page (`client/src/pages/Settings.tsx`)

The page is implemented with **React Hook Form** + **Zod** and includes:

- **Currency** (always visible)
  - Dropdown backed by `CURRENCY_OPTIONS`.
  - Stored as `currencyCode` in tenant record.

- **White Labeling**
  - **Application name**
    - Text input stored as `appName`.
    - Used to update `document.title` as `"{appName} | MineAid HMS"`.
  - **Logo**
    - Dropdown: **Use default (MineAid)** | **Upload custom logo**.
    - Uses `SimpleFileUploader` with category `tenant-branding`.
    - On upload, the API returns a per‑tenant URL (Blob or `/public/tenants/...`), stored as `logoUrl`.
    - Preview + **Remove** button (clears `logoUrl`).
  - **Primary color**
    - Dropdown of presets:
      - Default (MineAid navy).
      - A few common hex presets (blue, green, purple).
      - **Custom…** option that reveals a hex input with live swatch.
    - Stored as `primaryColor` (or `null` for default).
  - **Favicon**
    - Dropdown: **Use default** | **Upload custom favicon**.
    - File upload via `SimpleFileUploader` with `category="tenant-branding"` and `accept="image/x-icon,image/png,image/svg+xml"`.
    - Stored URL in `faviconUrl` with preview + **Remove**.

- **Confirm modals**
  - **Save settings**:
    - Validates the form, then opens an `AlertDialog` asking for confirmation.
    - Confirm triggers PATCH `/api/settings`.
  - **Restore to defaults**:
    - Button in header opens an `AlertDialog` explaining the reset.
    - PATCH `/api/settings` with:
      - `currencyCode = "GHS"`.
      - `appName = null`, `logoUrl = null`, `primaryColor = null`, `faviconUrl = null`.

### Tenant Settings Hook (`client/src/hooks/useTenantSettings.ts`)

Shared hook to consume tenant settings across the app:

- Query key: `["/api/settings"]` (cached via React Query).
- Returns:
  - `settings` – full `TenantSettings` object or `null`.
  - `currencyCode` – `settings.currencyCode` or `GHS` fallback.
  - `formatCurrency(amount)` – uses `lib/currency.ts` to format with tenant currency.

Used by:

- **Inventory**, **Purchase Orders**, **InventoryTransactions**, **TransactionHistory** to display currency symbols and amounts correctly.
- **MainLayout** and **TenantBranding** (see below).

### Branding Application (`TenantBranding` component)

`client/src/components/TenantBranding.tsx` is rendered once in `App.tsx` and:

- **Favicon**
  - When `settings.faviconUrl` is set and user has a `tenantId`, updates `<link rel="icon">` and `<link rel="shortcut icon">` in `<head>` to point at the tenant favicon.

- **Primary color**
  - Updates CSS variables on `<html>`:
    - `--mineaid-navy`
    - `--primary`
  - Any UI using these tokens will take on the tenant’s color (buttons, nav, accents).

- **Document title**
  - If `settings.appName` is set, title becomes `"{appName} | MineAid HMS"`.
  - Otherwise remains `"MineAid HMS"`.

---

## File Storage & URLs (Logos & Favicons)

Uploads for tenant branding use the existing storage abstraction:

- **Endpoint:** `POST /api/public-objects/upload`
  - Requires auth and a `tenantId`.
  - Accepts multipart upload under `file`.
  - Uses `category = "tenant-branding"` for logos and favicons.
- **Storage behavior:**
  - When **Vercel Blob** is configured:
    - Tenant branding is treated as **public**.
    - File path: `mineaidhms-blob/tenants/<tenantId>/tenant-branding/<filename>`.
    - Returns a **public Blob URL** usable directly in `<img src>` / favicon links.
  - When Blob is not available or fails:
    - Falls back to **local** storage.
    - Writes to `public/tenants/<tenantId>/tenant-branding/<filename>`.
    - Returns `/public/tenants/<tenantId>/tenant-branding/<filename>`, served by `express.static`.

The tenant’s `logoUrl` and `faviconUrl` store **only** the returned URL (no extra processing is required by consumers).

---

## How Settings Affect the Rest of the System

- **Currency**
  - Pages using monetary values:
    - `Inventory` – total inventory value.
    - `PurchaseOrders` – PO totals, line item unit/total costs.
    - `InventoryTransactions` – unit/total cost display.
    - `TransactionHistory` – unit/total cost display.
  - All use `useTenantSettings().formatCurrency(...)`, so changing the currency updates symbols and formatting everywhere.

- **Logo**
  - `MainLayout`:
    - Sidebar collapsible logo (mark) and full logo use `settings.logoUrl` when set, falling back to MineAid defaults.
  - Header content also uses `settings.logoUrl` as the brand logo.

- **Primary color**
  - Propagated via CSS variables; affects:
    - Buttons.
    - Active nav states.
    - Components using `--mineaid-navy` / `--primary`.

- **Favicon**
  - Updated globally via `<link rel="icon">` and `<link rel="shortcut icon">` once per tenant session.

---

## Operational Notes

- **Caching**
  - Tenant settings are cached by React Query (`staleTime = 5 minutes`).
  - On successful PATCH, `/api/settings` is invalidated to ensure the UI picks up new values.

- **Environment differences**
  - In development, uploads typically go to local filesystem (`public/tenants/...`).
  - In production with `BLOB_READ_WRITE_TOKEN` set, tenant branding assets go to Vercel Blob with public access.

- **Known gotchas**
  - Browsers aggressively cache favicons. After updating favicon:
    - Use a **hard refresh** (Ctrl+Shift+R) or clear site data.
    - Or open in a new private/incognito window to verify.

