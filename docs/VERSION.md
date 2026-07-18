# uventorybiz — Version Information

## Current package version: 1.0.0

**Product:** uventorybiz — multi-tenant B2B inventory + POS  
**Updated:** July 18, 2026  
**GitHub:** https://github.com/Nuestman/uventorybiz

This is the **first** versioned release of uventorybiz as its own product. It is not a continuation of MineAid HMS `4.x` numbering.

See [CHANGELOG.md](./CHANGELOG.md) for release notes. Working-tree inventory UX after the initial commit is listed under **`[Unreleased]`**.

---

## Version History

### Version 1.0.0 (current package)

- **Release type:** Initial product release
- **Date:** 2026-07-18
- **Highlights:** Inventory + POS, customers/suppliers portal, operations, fleet, POC testing, wellbeing; clinical MineAid stack archived under `purged/`
- **Schema:** `drizzle/0003` … `drizzle/0015_uventorybiz_inventory_categories`
- **Docs:** [UVENTORYBIZ.md](./UVENTORYBIZ.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [POS_GUIDE.md](./POS_GUIDE.md), [PORTAL_GUIDE.md](./PORTAL_GUIDE.md)

### Unreleased (working tree — same `1.0.0` package until next tag)

- Product catalog (`/inventory-catalog`)
- PO receive into any store + reverse receipt after receive
- Inline supplier create on PO; low-stock → requisition / Create PO
- Store Locations admin (business copy)
- Clinical docs moved `docs/` → `purged/docs/`

Details: [CHANGELOG.md](./CHANGELOG.md) · [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md)

---

## Predecessor (not version lineage)

Code was adapted from MineAid HMS. That product’s changelogs live in [`purged/docs/CHANGELOG_MINEAID.md`](../purged/docs/CHANGELOG_MINEAID.md) for historical reference only and do **not** affect uventorybiz semver.
