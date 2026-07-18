# Point-of-Care Laboratory (Instant Tests) Guide

## Overview

The POC Laboratory module records **instant tests** — walk-in rapid tests typically offered by **pharmacies** and **laboratories**:

- **Hemoglobin (HB)** — anemia screening (numeric g/dL result)
- **Pregnancy** — positive / negative / invalid
- **Malaria** — rapid test, positive / negative / invalid
- **Typhoid** — positive / negative / invalid

There is **no scheduling** — results are recorded immediately after the test is performed.

**Subjects are customers first.** Staff can select an existing customer or enter details for a new one (auto-saved as a customer for the next visit). Testing an **employee** is available as an optional alternative.

> The legacy drug, alcohol, and hydration testing suites (and test scheduling) were purged from the UI. Their backend tables/routes still exist behind the same feature gate and are slated for schema cleanup.

---

## Enabling the module

POC testing is gated three ways:

1. **Platform feature flag `poc_testing`** — super admin at `/super-admin/feature-flags`.
2. **Business category** — only `pharmacy` and `laboratory` are eligible. Other categories never see the Settings toggle or sidebar group.
3. **Per-business toggle `pocTestingEnabled`** —
   - Asked during **business registration** when Pharmacy or Laboratory is selected.
   - Toggleable later in **Settings → Point-of-care lab testing** (eligible categories only).

---

## Pages

| Page | Route | Purpose |
|---|---|---|
| Instant Tests | `/testing` | Dashboard: stats, filterable results table, edit/delete |
| Record Instant Test | `/testing/new` | Entry form — customer (default) or employee subject |

### Recording a test (`/testing/new`)

1. Choose **Customer** (default) or **Employee**.
2. For customers: **Select existing** (search) **or Enter new customer** (first/last name required; phone/email optional — saved to Customers automatically).
3. Select **Test Type**, **Date**, and **Time**.
4. For **HB**: enter hemoglobin level (g/dL). For other types: Positive / Negative / Invalid.
5. Optional notes → **Record Test Results**.

### Viewing results (`/testing`)

- Subject column shows customer or employee with a type label.
- Filter by test type and store location; edit/delete as before.

---

## API

All routes require authentication and are gated by the `poc_testing` platform flag.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/instant-tests` | List instant tests (`?customerId=` / `?employeeId=` optional) |
| POST | `/api/instant-tests` | Record a test — exactly one of `customerId` or `employeeId` |
| PATCH | `/api/instant-tests/:id` | Update a test |
| DELETE | `/api/instant-tests/:id` | Delete a test |

Table: `instant_tests` — `customer_id` (nullable FK → customers), `employee_id` (nullable FK → employees), check constraint requiring at least one subject.
