# Next development session — resume guide

**Product:** uventorybiz `1.1.0`  
**Repo:** https://github.com/Nuestman/uventorybiz  
**Branch:** `main`  
**Note:** Apply drizzle migrations through `0025` after pull (`npm run db:drizzle-migrate`).

---

## Quick start (local)

1. Ensure `.env` has `DATABASE_URL` (Neon) — never commit `.env`.
2. `npm install`
3. `npm run db:drizzle-migrate` (journal through `0025`)
4. `npm run db:seed` (idempotent notification / portal defaults)
5. Optional demo data: `npm run db:seed:demo`
6. `npm run dev` → http://localhost:17016 (port from env if customized)

---

## Suggested next work

| Priority | Item |
|----------|------|
| 1 | Push / tag `1.1.0` on remote when ready; Railway + Neon migrate through `0025` |
| 2 | Rename checkout folder `uventory` → `uventorybiz` after closing Cursor ([UVENTORYBIZ.md](./UVENTORYBIZ.md)) |
| 3 | Soften remaining appointment “telehealth” UI copy / modality (telecare already unmounted) |
| 4 | Align Transactions / Transaction History with new transaction types (incl. `return_to_supplier`) |
| 5 | Optional: PO receive batch/lot/expiry per line |
| 6 | Optional: auto-provision POS register when vehicle kind = mobile_store |

---

## Smoke checklist

| # | Area | Verify |
|---|------|--------|
| 1 | Auth | Staff login + location select; idle toggle / 24h absolute |
| 2 | Catalog | Create product at `/inventory-catalog` |
| 3 | PO | Receive into a **fleet** unit and into a store; reverse from same location |
| 4 | Assets | Create vehicle with kind + stationed-at; tag auto-assigned |
| 5 | Fleet | Pre-start Faulty → lodge ticket (duplicate prompt if category open) |
| 6 | Portal | `/portal/support` create issue; appears in staff tickets |
| 7 | Messaging | Off by default (no SSE); enable via Super Admin feature flags |
| 8 | Transfers | Main Store → mobile-store fleet location |

---

## Key docs

- [VERSION.md](./VERSION.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
- [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md)
- [MOBILE_STORE_AND_FLEET_INVENTORY.md](./MOBILE_STORE_AND_FLEET_INVENTORY.md)
- [UVENTORYBIZ.md](./UVENTORYBIZ.md)
- [DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)
