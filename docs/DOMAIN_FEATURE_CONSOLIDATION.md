# Domain / Feature Consolidation

This doc describes the **coarse domain** (one feature = one folder) structure for `server/modules/` and tracks consolidation status and enhancement plans.

---

## Rationale: Coarser is better

Modern Node/Express and feature-based setups favor **coarser, product-aligned domains**: one folder = one product feature / bounded context, not one folder per HTTP resource. Names match product/capability (e.g. `inventory/`, `testing/`), not API slices like `inventory-alerts/`, `stock-requisitions/` as separate top-level “domains”. Inside a feature you can still have multiple route files or sub-routers (e.g. `inventory/routes/items.ts`, `inventory/routes/alerts.ts`) or a single `inventory.routes.ts` that mounts sub-routers.

| Aspect | Coarser (e.g. `inventory/`, `testing/`) | Finer (inventory, inventory-alerts, stock-*, …) |
|--------|----------------------------------------|--------------------------------------------------|
| **Convention** | Matches “feature folder” / “bounded context” in most guides. | Closer to “one folder per resource”; often over-split. |
| **Onboarding** | “Inventory code is under `inventory/`.” | “Inventory is spread across inventory, inventory-alerts, stock-requisitions, stock-transfers.” |
| **Refactors** | Change one feature → one top-level domain. | Same feature can touch many top-level folders. |
| **Ownership** | One team/contributor “owns” one feature folder. | Ownership is per tiny module; “inventory” has no single home. |
| **Naming** | Folder name = product term (Inventory, Testing). | Folder names = API/technical slices. |

---

## Target coarse domains (consolidation map)

Use this as the single source of truth: which modules belong to which product-aligned domain. Each row is one folder under `server/modules/<domain>/` with one or more route files or sub-routers.

| Target coarse domain | Modules included | Notes |
|----------------------|------------------|--------|
| **auth** | auth | Single module. |
| **patients** | patients | Single module. |
| **appointments** | appointments | Single module. |
| **incidents** | incidents | Single module. |
| **clinical** | medical-visits, medical-records, triage, vital-signs | Visits, records, triage (SATS), vitals. |
| **notifications** | notifications | Single module. |
| **dashboard** | dashboard | Single module. |
| **users** | users | Single module. |
| **admin** | admin | Single module. |
| **care-locations** | care-locations | Single module. |
| **audit-logs** | audit-logs | Single module. |
| **feedback** | feedback | Single module. |
| **companies** | companies | Single module. |
| **employees** | employees | Single module. |
| **suppliers** | suppliers | Single module. |
| **inventory** | inventory, inventory-alerts, inventory-transactions, stock-requisitions, stock-transfers, purchase-orders | Items, alerts, transactions, requisitions, transfers, purchase orders. |
| **equipment** | equipment-maintenance | Optional: rename top-level folder to `equipment/` and keep maintenance as sub-routes. |
| **testing** | testing, testing-programs, testing-equipment | Programs, equipment, test execution. |
| **duties** | operational-duties, duty-assignments | Duty definitions + assignments/completions. |
| **tenants** | tenants | Single module. |
| **super-admin** | super-admin | Single module. |

---

## Current state (post-consolidation)

**Principle:** One domain = one folder. Aggregator routers mount at `/api`; sub-modules live **inside** each coarse folder.

| Coarse domain | Folder structure | Mount in `routes/index.ts` |
|---------------|------------------|----------------------------|
| **clinical** | `server/modules/clinical/` with `clinical.routes.ts` + subfolders `medical-visits/`, `triage/`, `vital-signs/`, `medical-records/` | `createClinicalRouter` |
| **inventory** | `server/modules/inventory/` with `inventory.routes.ts`, `inventory.feature.routes.ts` + subfolders `inventory-alerts/`, `inventory-transactions/`, `stock-requisitions/`, `stock-transfers/`, `purchase-orders/` | `createInventoryFeatureRouter` |
| **testing** | `server/modules/testing/` with `testing.routes.ts` + subfolders `testing-programs/`, `testing-equipment/` | `createTestingRouter` |
| **duties** | `server/modules/duties/` with `duties.routes.ts` + subfolders `operational-duties/`, `duty-assignments/` | `createDutiesRouter` |

- **API paths unchanged** (e.g. `/api/medical-visits`, `/api/triage`, `/api/inventory`, `/api/testing-programs`).
- Imports in moved subfolders use `../../../storage`, `../../../validation`, `../../../errors` to reach server root.
- **equipment**: `equipment-maintenance` remains a top-level module (not yet under `equipment/`).

All other domains (auth, patients, appointments, incidents, notifications, etc.) are already single-module folders and unchanged.

---

## Feature flags (why coarse helps)

If the system supports turning features on or off (billing, access control, tenant preference):

- **One product feature = one router.** You can gate in one place: mount the router only when the feature is enabled, or use middleware that returns 403 when the feature is off.
- **Feature list** for billing or tenant settings = list of coarse domains (inventory, testing, incidents, etc.); no ambiguity (e.g. “is stock-transfers a separate feature?”).
- **What you need:** (1) Store (DB or config) of which features are enabled per tenant/globally. (2) Guard at mount time or middleware. (3) Optional: feature registry (feature key → router) for conditional mount. The current coarse structure does not need to change for this.

---

## Layers (independent of domain granularity)

- **Routes** – Define endpoints, attach middleware, call controller; no logic.
- **Controller** – Read `req`/params, validate, call service (or storage), map result to `res.status().json()`.
- **Service** – (Optional.) Business logic; no `req`/`res`; calls repository/storage and notifications.
- **Repository** – (Optional.) Pure data access: findById, save, update, etc.

---

## Plan to enhance consolidation

### 1. Equipment → coarse domain (optional)

- [ ] Rename `server/modules/equipment-maintenance/` → `server/modules/equipment/`.
- [ ] Move current routes into `equipment/equipment.routes.ts` (or keep `equipment-maintenance.routes.ts` as sub-router under `equipment/`).
- [ ] Update `server/routes/index.ts` to import from `../modules/equipment/...` and keep the same mount path (e.g. `/api/equipment-maintenance` or `/api/equipment` if you change the path).

### 2. Single entry file per coarse domain (optional)

- [ ] **Clinical:** Consider renaming or merging so the only public entry is `clinical.routes.ts` (already the case; subfolders are implementation detail).
- [ ] **Inventory:** Consider renaming `inventory.feature.routes.ts` → `inventory.routes.ts` and moving current `inventory.routes.ts` to e.g. `inventory/items.routes.ts` (or `inventory/routes/items.ts`) so the domain has one clear “main” routes file that composes all sub-routers. This makes “inventory” a single entry point.
- [ ] **Testing / Duties:** Already have a single entry file (`testing.routes.ts`, `duties.routes.ts`). No change required unless you want internal subfolders to use a shared `routes/` subfolder (e.g. `testing/routes/programs.ts`, `testing/routes/equipment.ts`).

### 3. Shared path aliases for server root (optional)

- [ ] Add path aliases in `tsconfig.json` (e.g. `@server/storage`, `@server/validation`, `@server/errors`) so subfolders use `@server/storage` instead of `../../../storage`. Reduces breakage when moving files and clarifies “server root” imports.
- [ ] Apply aliases incrementally in consolidated domains (clinical, inventory, testing, duties) and optionally in equipment after rename.

### 4. Feature registry for conditional mount (optional)

- [ ] Introduce a small registry: list of feature keys (e.g. `inventory`, `testing`, `clinical`) and the router factory + deps for each.
- [ ] In `registerAllRoutes`, optionally check tenant/global feature flags and only mount routers for enabled features. Enables feature flags without scattering conditionals.

### 5. Consistent subfolder naming (optional)

- [ ] Standardize subfolder naming within a domain (e.g. all kebab-case: `medical-visits`, `vital-signs`) — already the case.
- [ ] Optionally group by type: e.g. `inventory/routes/`, `inventory/controllers/`, `inventory/services/` instead of one folder per sub-feature. Only do this if the team prefers “layer-first” over “sub-feature-first” inside a domain.

### 6. Documentation and onboarding

- [ ] Keep this doc as the single source of truth for “which folder owns what.”
- [ ] Add a short “Module map” in the main README or CONTRIBUTING that points to this doc and lists the coarse domains (e.g. “Clinical: `server/modules/clinical/` — visits, triage, vitals, records”).

---

## Reference: target structure (from implementation plan)

```
server/
├── modules/
│   ├── auth/
│   ├── patients/
│   ├── appointments/
│   ├── incidents/
│   ├── clinical/          # medical-visits, triage, vital-signs, medical-records
│   ├── inventory/          # items, alerts, transactions, requisitions, transfers, purchase-orders
│   ├── testing/            # programs, equipment, test execution
│   ├── duties/             # operational-duties, duty-assignments
│   ├── equipment/          # (optional rename from equipment-maintenance)
│   ├── notifications/
│   ├── dashboard/
│   ├── users/
│   ├── admin/
│   ├── care-locations/
│   ├── audit-logs/
│   ├── feedback/
│   ├── companies/
│   ├── employees/
│   ├── suppliers/
│   ├── tenants/
│   ├── super-admin/
│   └── ...
├── shared/                 # middleware, errors, validation (if extracted)
├── storage.ts
└── index.ts
```

---

*Last updated: 2025-02-20. See also: `IMPROVEMENTS_IMPLEMENTATION_PLAN.md` (Phase 2.5, Phase 3).*
