# Demo seed data — UventoryBiz

CSV fixtures used by `npm run db:seed:demo` to populate the **UventoryBiz** demo tenant with realistic wholesale/retail data.

| File | Rows (approx.) | Import API / UI |
|------|----------------|-----------------|
| `customers.csv` | 40 | `POST /api/customers/bulk-import` · Customers page |
| `suppliers.csv` | 15 | `POST /api/suppliers/bulk-import` · Suppliers page |
| `products.csv` | 60 | `POST /api/inventory/import` · Inventory page |
| `employees.csv` | 8 | `POST /api/employees/bulk-import` · Admin → Employees (`companyId` substituted by seed script) |

Short downloadable templates for the UI live under `client/public/templates/`.

## Commands

```bash
# Seed / expand the demo tenant named "UventoryBiz" (idempotent skip for duplicate employee numbers / item codes where possible)
npm run db:seed:demo

# Optional: target a specific tenant id
DEMO_TENANT_ID=<uuid> npm run db:seed:demo
```

The script resolves tenant by name `UventoryBiz` (or `DEMO_TENANT_ID`), uses the first company + store location, then imports customers → suppliers → products → employees.
