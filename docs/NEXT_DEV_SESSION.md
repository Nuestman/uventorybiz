# Next development session — resume guide

**Product:** uventorybiz `1.0.0`  
**Repo:** https://github.com/Nuestman/uventorybiz  
**Branch:** `main`  
**Note:** Working tree has unreleased inventory UX after initial commit — see [CHANGELOG.md](./CHANGELOG.md) `[Unreleased]`.

---

## Quick start (local)

1. Ensure `.env` has `DATABASE_URL` (Neon) — never commit `.env`.
2. `npm install`
3. `npm run db:drizzle-migrate` (if journal ahead of DB)
4. `npm run db:seed` (idempotent notification / portal defaults)
5. Optional demo data: `npm run db:seed:demo`
6. `npm run dev` → http://localhost:17016 (port from env if customized)

---

## Suggested next work

| Priority | Item |
|----------|------|
| 1 | Commit / PR the unreleased inventory + docs work (catalog, PO receive store, reverse, store locations UI) when ready |
| 2 | Rename checkout folder `uventory` → `uventorybiz` after closing Cursor ([UVENTORYBIZ.md](./UVENTORYBIZ.md)) |
| 3 | Soften remaining appointment “telehealth” UI copy / modality (telecare already unmounted) |
| 4 | Align Transactions / Transaction History with new transaction types (incl. `return_to_supplier`) |
| 5 | Optional: PO receive batch/lot/expiry per line |
| 6 | Railway / production Neon cutover checklist |

---

## Smoke checklist

| # | Area | Verify |
|---|------|--------|
| 1 | Auth | Staff login + location select |
| 2 | Catalog | Create product at `/inventory-catalog` (no stock row yet) |
| 3 | PO | Create PO from catalog; inline create supplier; receive into a **non-primary** store |
| 4 | PO reverse | Reverse receipt from that store; stock and `quantityReceived` drop; status can return to `ordered` |
| 5 | Inventory | Low/out row → Request stock / Create PO deep-link |
| 6 | POS | Open shift, sell, close shift ([POS_GUIDE.md](./POS_GUIDE.md)) |
| 7 | Portal | Orders attention badge; customer/supplier login |
| 8 | Fleet / POC | Feature flags gate correctly |
| 9 | `npm run check` | TypeScript clean |
| 10 | What's New | Staff/portal see `1.0.0` curated notes |

---

## References

- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
- [INVENTORY_IMPLEMENTATION_SCAN.md](./INVENTORY_IMPLEMENTATION_SCAN.md)
- [VERSION.md](./VERSION.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [UVENTORYBIZ.md](./UVENTORYBIZ.md)
- [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)
