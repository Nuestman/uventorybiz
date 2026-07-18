# MineAid Custom Reports (`/reports/custom`)

**Route:** `/reports/custom` (planned)  
**API (planned):** `GET /api/reports/custom` (query execution) + **`POST/GET/PATCH/DELETE /api/reports/custom/definitions`** (saved definitions — optional phase)  
**Status:** **Planning** — user- or tenant-defined **datasets, dimensions, and metrics** with exportable tables. **Last** in comprehensive roadmap (**Phase R3**) after domain dashboards stabilize.  
**Last updated:** April 20, 2026

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**.

---

## 1. Relationship to the broader reports module

Custom reporting lets power users build **ad hoc** tables and charts from **approved datasets** without shipping a new page per question. It complements fixed hubs (**clinical**, **incidents**, **operations**, etc.) by offering **controlled flexibility**.

**Design principle:** **Guardrailed query builder** — not arbitrary SQL from the browser. Every run maps to **server-validated** dataset + dimension + metric tuples.

---

## 2. Product scope

### 2.1 Goals

- Select a **dataset** (e.g. medical visits, incidents, tickets, audit events) from an allow-list.
- Choose **dimensions** (group by): time bucket, location, company, category, status, etc. — **dataset-specific**.
- Choose **metrics** (aggregations): count, sum (where numeric), distinct count (only if policy allows — many PHI-adjacent tables **forbid** distinct patient in v1).
- Apply **filters** compatible with the dataset (same vocabulary as domain reports where possible).
- **Save** named definitions (tenant-level or personal — **decide in §7**).
- **Export** CSV (and optionally XLSX later) of the result grid.

### 2.2 Non-goals (v1 custom)

- **Not** arbitrary SQL, regex on JSON columns, or cross-tenant queries.
- **Not** real-time collaboration on editing definitions.
- **Not** embedding external BI tools (Power BI, etc.) inside v1.
- **Not** schedules/email delivery in v1 (future).

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Tenant admin | ad hoc operational and clinical-adjacent summaries (within permissions) |
| Analyst roles (future) | repeating monthly extracts |

---

## 3. Allowed datasets (illustrative registry)

Server maintains a **registry** mapping dataset id → implementation (query builder module). Initial candidates **after** domain endpoints exist:

| Dataset id | Source tables | Notes |
|------------|---------------|--------|
| `medical_visits_agg` | `medical_visits` + company join | **Same rules as clinical** — no patient identifiers in default export |
| `incident_reports_agg` | `incident_reports` + company join | Align with **`/api/reports/incidents`** semantics |
| `tickets_agg` | `tickets` | No `description_html` in grid by default |
| `duty_assignments_agg` | `operational_duty_assignments` | |
| `audit_logs_agg` | `audit_logs` | **Admin-only** dataset |

New datasets require **security review** before registry add.

---

## 4. Information architecture

### 4.0 Operator guide

Collapsible **How to use this page** (**closed by default**); builder steps: **Dataset → Filters → Rows (dimensions) → Columns (metrics)** → Run → Save.

### 4.1 Builder UI

- **Step 1 — Dataset:** card picker with short description and **sensitivity badge** (Low / Medium / High).
- **Step 2 — Filters:** dynamic form from dataset schema (reuse query param names from domain routes where possible).
- **Step 3 — Layout:** pick up to **N** dimensions (e.g. max 3 in v1 to limit query complexity).
- **Step 4 — Metrics:** pick from allow-list (Count rows, Sum(duration) if exists, etc.).
- **Results:** virtualized table + optional single chart type (bar or line) when one time dimension selected.
- **Saved reports:** dropdown; **duplicate** and **delete** with confirmation.

### 4.2 Exports

- **CSV:** current result set (respect row limits, e.g. max 50k rows).
- **Print:** table + parameters only.

---

## 5. API design — custom

### 5.1 Query execution

`GET /api/reports/custom/run?dataset=...&...`  
Or **`POST /api/reports/custom/run`** with JSON body for complex filter arrays (preferred if filters exceed URL length).

**Request body (illustrative):**

```json
{
  "dataset": "tickets_agg",
  "filters": {
    "from": "2026-04-01",
    "to": "2026-04-30",
    "locationIds": [],
    "ticketStatuses": ["open", "in_progress"]
  },
  "dimensions": ["week", "categoryId"],
  "metrics": ["count"],
  "sort": [{ "field": "count", "dir": "desc" }],
  "limit": 5000
}
```

**Response:**

```json
{
  "meta": {
    "dataset": "tickets_agg",
    "generatedAt": "2026-04-20T12:00:00.000Z",
    "truncated": false,
    "rowCount": 0
  },
  "columns": [
    { "key": "week", "label": "Week", "type": "string" },
    { "key": "categoryId", "label": "Category", "type": "string" },
    { "key": "count", "label": "Ticket count", "type": "number" }
  ],
  "rows": []
}
```

### 5.2 Saved definitions (optional R3.2)

- `GET /api/reports/custom/definitions` — list
- `POST /api/reports/custom/definitions` — create (validate body against schema)
- `PATCH /api/reports/custom/definitions/:id` — rename or update query spec
- `DELETE /api/reports/custom/definitions/:id`

Storage: new table **`report_custom_definitions`** (tenant_id, owner_user_id, name, spec_json, created_at) — **migration in implementation phase**, not now.

### 5.3 Auth

- **Dataset-level** permission flags (e.g. only admin can run `audit_logs_agg`).
- Enforce **same** PHI rules as domain routes; server rejects forbidden dimension/metric pairs (e.g. `patientId` as dimension).

### 5.4 Abuse controls

- **Rate limit** runs per user per minute.
- **Timeout** and **row cap** on queries.
- **Explain** logging in dev only.

---

## 6. Privacy and roles

- Custom reports are a **common exfiltration path** — default **deny** new datasets until reviewed.
- **No** free-text columns from clinical narratives in v1 registry.
- **Audit** each `run` in `audit_logs` with dataset id and filter hash (not full PHI payload).

---

## 7. Stakeholder decisions (pre-build)

| Topic | Decision needed |
|-------|-----------------|
| **Personal vs tenant saves** | Who can see shared definitions. |
| **Max dimensions / cartesian explosion** | Hard limits in v1. |
| **Clinical datasets** | Whether custom builder is allowed for clinical at all in v1 or **phase 2**. |
| **Chart library** | Reuse existing chart components from clinical page. |

---

## 8. Implementation phases — custom

| Phase | Deliverable |
|-------|-------------|
| **R-CUST-1** | **One** safe dataset (e.g. `tickets_agg`) + run API + minimal UI + CSV |
| **R-CUST-2** | Multi-dataset registry; builder UX; permission matrix |
| **R-CUST-3** | Saved definitions CRUD + `report_custom_definitions` migration |
| **R-CUST-4** | Charts, XLSX export (optional), rate limits, audit logging |

---

## 9. Documentation governance

- This file owns **`/reports/custom`** and custom run/definition APIs.
- Domain semantics remain the **source of truth** in **`REPORTS_CLINICAL_MODULE_PLAN.md`**, **`REPORTS_INCIDENTS_MODULE_PLAN.md`**, **`REPORTS_OPERATIONS_MODULE_PLAN.md`**, **`REPORTS_COMPLIANCE_MODULE_PLAN.md`**.
