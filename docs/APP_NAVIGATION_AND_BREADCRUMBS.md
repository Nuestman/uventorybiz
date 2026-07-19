# App navigation & breadcrumbs

**Package:** `uventorybiz@1.2.0`  
**Audience:** Staff (tenant) UI and Super Admin console  
**Related:** Portal breadcrumbs in [PORTAL_GUIDE.md](./PORTAL_GUIDE.md) § UI chrome

---

## Purpose

Top-bar breadcrumbs give orientation on every authenticated staff and super-admin page, matching the portal pattern (`root › … › current page`).

They replace the previous header logo + quick-link strip in `MainLayout` / `SuperAdminLayout`. Branding remains in the sidebar (`BrandLogo`).

---

## Components

| Piece | Path | Role |
|-------|------|------|
| UI | `client/src/components/AppBreadcrumbs.tsx` | Renders trail; listens to path + `hashchange` |
| Resolver | `client/src/lib/appBreadcrumbs.ts` | Maps URL → crumbs from nav config |
| Staff nav source | `client/src/config/sidebarConfig.tsx` | Groups, items, optional `tabs` |
| Super-admin nav source | `client/src/config/superAdminNav.tsx` | Sections + items (incl. hash routes) |
| Primitives (unused by staff trail) | `client/src/components/ui/breadcrumb.tsx` | shadcn building blocks (available if needed) |

Portal desktop trail (separate): `client/src/portal/PortalDesktopTopBar.tsx` + `getPortalPageTitle` in `portalNav.ts`.

---

## Trail shapes

### Staff (`variant="staff"`)

1. **Home** → `/dashboard` (always linked unless it is the only context)
2. **Section** — sidebar group label when useful (e.g. Inventory Management, Operations); skipped for the Dashboard group
3. **Page** — matched sidebar item title (current)
4. **Extra** — admin/assignment hash tabs, or a detail segment under a matched prefix (e.g. ticket id → “Details”)

Examples:

- `/dashboard` → `Home › Dashboard`
- `/inventory-catalog` → `Home › Inventory Management › Product Catalog`
- `/assets/fleet/pre-start` → `Home › Business Assets › Pre-start checks`
- `/admin#users` → `Home › Administration › … › Users` (via item tabs)

### Super Admin (`variant="super-admin"`)

1. **System console** → `/super-admin/dashboard`
2. **Section** — nav section label (Platform, Access, System, …)
3. **Page** — matched item title

Hash console tabs (`/super-admin#tenants`, etc.) resolve from `superAdminNavSections`.

---

## Matching rules

- Prefer **exact** path match, then **longest prefix**.
- Hash-aware items (e.g. `/admin#users`, `/super-admin#feedback`) only win when the hash matches.
- Exact-only parents: `/assets`, `/assets/fleet`, `/shiftover` do not swallow child routes.
- Unknown paths fall back to a titleized last path segment.

When adding a sidebar or super-admin nav item, breadcrumbs pick it up automatically—no per-page breadcrumb wiring.

---

## List pagination (related UX)

Staff list pages share `client/src/components/ListPagination.tsx` (controls hidden when `total ≤ pageSize`). Used on customers, suppliers, inventory catalog, and inventory transactions (20 per page).

Portal shop/orders use `client/src/portal/PortalPagination.tsx` with client-side paging and order filters on My orders.
