# uventorybiz — Version Information

## Current package version: 1.1.0

**Product:** uventorybiz — multi-tenant B2B inventory + POS  
**Updated:** July 19, 2026  
**GitHub:** https://github.com/Nuestman/uventorybiz

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

## Version History

### Version 1.1.0 (current package)

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
