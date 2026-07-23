# uventorybiz — Version Information

## Current package version: 1.3.0

**Product:** uventorybiz — multi-tenant B2B inventory + POS  
**Updated:** July 23, 2026  
**GitHub:** https://github.com/Nuestman/uventorybiz

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

## Version History

### Version 1.3.0 (current package)

- **Release type:** Minor — portal→POS sales, supplier PO/invoice lifecycle, fulfillment exceptions, return window, POS tenders
- **Date:** 2026-07-23
- **Highlights:** Portal orders create POS sales + deduct stock at ready/out; supplier Confirm → Ship → receive → invoice; staff Exceptions queue; Vehicles (VHC); portal return window (default 3 days); Mobile Money + Credit (Pay Later)
- **Schema:** `drizzle/0026_portal_sales_po_exceptions`, `drizzle/0027_return_window_and_pos_payments`
- **Docs:** [PORTAL_SALES_PO_INVOICE_EXCEPTIONS_PLAN.md](./PORTAL_SALES_PO_INVOICE_EXCEPTIONS_PLAN.md), [PORTAL_GUIDE.md](./PORTAL_GUIDE.md), [POS_GUIDE.md](./POS_GUIDE.md)

### Version 1.2.0

- **Release type:** Minor — navigation breadcrumbs, list pagination, portal orders UX, portal-centric messaging
- **Date:** 2026-07-19
- **Highlights:** Staff/Super Admin breadcrumbs; list + portal pagination; My orders filters; messaging restore (PortalUser / staff threads, Operations → Messages)
- **Schema:** no new journal entries (still through `0025`)
- **Docs:** [APP_NAVIGATION_AND_BREADCRUMBS.md](./APP_NAVIGATION_AND_BREADCRUMBS.md)

### Version 1.1.0

- **Release type:** Minor — business assets, fleet rename, portal support, session/messaging controls
- **Date:** 2026-07-19
- **Highlights:** Business Assets register + vehicle kinds; fleet rename (`ambulance` → `fleet`); portal system-issue tickets; messaging platform flag (default off); session 24h absolute + idle toggle; catalog/PO multi-location receive (incl. fleet); mobile-store inventory guide
- **Schema:** `drizzle/0016` … `drizzle/0025`
- **Docs:** [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md), [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md)

### Version 1.0.0

- **Release type:** Initial product release
- **Date:** 2026-07-18
- **Highlights:** Inventory + POS, customers/suppliers portal, operations, fleet, POC testing, wellbeing; clinical MineAid stack archived under `purged/`
- **Schema:** `drizzle/0003` … `drizzle/0015_uventorybiz_inventory_categories`
- **Docs:** [UVENTORYBIZ.md](./UVENTORYBIZ.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [POS_GUIDE.md](./POS_GUIDE.md), [PORTAL_GUIDE.md](./PORTAL_GUIDE.md)

---

## Predecessor (not version lineage)

Code was adapted from MineAid HMS. That product’s changelogs live in [`purged/docs/CHANGELOG_MINEAID.md`](../purged/docs/CHANGELOG_MINEAID.md) for historical reference only and do **not** affect uventorybiz semver.
