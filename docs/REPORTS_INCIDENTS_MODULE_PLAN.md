# MineAid Incident / Safety Reports (`/reports/incidents`)

**Route:** `/reports/incidents` (**live**; distinct from operational list at `/incidents`)  
**API:** `GET /api/reports/incidents`  
**Status:** **Shipped in 4.23.0** — incident analytics page + API are live. Operational incident CRUD remains **`/incidents`** + **`/api/incident-reports`**. Clinical analytics still include **aggregate** incident counts in **`/reports/clinical`** when **Include occupational incidents** is on; this hub is the dedicated **safety / occupational health** slice.  
**Last updated:** April 20, 2026 (4.23.0 release alignment)

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** (cross-domain `/reports` shell, phases, shared filters).

---

## 1. Relationship to the broader reports module

Incident reports are one slice of the Comprehensive Reports workspace. They share the standard layout (filters bar, saved views, cards/charts/tables, exports) described in the comprehensive plan §3.

**Distinction from existing surfaces:**

| Surface | Purpose |
|---------|---------|
| **`/incidents`** | Day-to-day **create / edit / list** occupational incident records; file uploads; role-based redaction for `safety_officer`. |
| **`GET /api/incident-reports`** | Row-level incident payloads (with safety redaction where applicable). **Not** an analytics contract. |
| **`/reports/clinical`** | **Clinical-first** dashboard; merges **visit + incident counts** in **cases per post by day**, **incidents per post**, and **ambulance-by-clinic** **incident** columns when `includeIncidents=true`. Good for *clinical operations*; **not** a replacement for HSE trend analysis. |
| **`/reports/incidents` (this doc)** | **Safety / HSE analytics:** severity and type trends, status pipeline, treatment/disposition proxies, employer (company) breakdowns, location and “site of incident” views, ambulance and detention flags — **aggregates first**, detail gated like clinical. |

**Current app routing context:** Shift narrative reports live at **`/shiftover/shift-report`**. Testing analytics live at **`/testing/reports`**. **`/reports`** landing now includes an incidents card, and **`/reports/incidents`** is role-gated for incident analytics users.

---

## 2. Product scope

### 2.1 Goals

- Give **safety officers, medical leadership, and tenant admins** a single analytics view to answer: *How many occupational incidents occurred? What types and severities? Where (care post vs work site)? How are statuses trending? What share involved ambulance or prolonged FAP care?*
- Support **filters** aligned with operations: date window, care **location(s)**, **employer company** (via patient → employee → company), **severity**, **incident type**, **status**, optional free-text dimension buckets (future).
- Surface **company-level aggregates** for contractor vs mother-company governance (same join pattern as clinical reports) **without** exposing casualty identity in summaries.
- **Reuse** tenant scoping, company joins, and “unknown bucket” patterns from **`clinical-reports.service.ts`** where possible — **separate endpoint** to keep response shapes stable and avoid overloading `/api/reports/clinical`.

### 2.2 Non-goals (v1 incidents hub)

- **Not** duplicating **`/incidents`** CRUD or replacing **`/api/incident-reports`** list/detail.
- **Not** a full **regulatory / MSHA-style** submission workflow (export CSV/PDF may come later; statutory forms are out of scope unless explicitly scoped later).
- **Not** raw export of **narrative** fields (`description`, `emergencyMedicalMgt`, `actionsTaken`) to roles that only receive **redacted** incident rows today — exports must follow **§6** and **`docs/RBAC.md`** incident rules.
- **Not** patient-chart drilldown from aggregates unless the user already has clinical/patient permissions (optional later link: “open incident in `/incidents`” for authorized roles only).

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Safety officer / HSE | volume trends, severity mix, types, open vs closed pipeline, site hotspots |
| Medical manager | overlap with clinical activity (cross-reference to clinical page; ambulance / detained-at-FAP stats) |
| Site / regional admin | compare **care locations** and **companies** |
| Compliance (where granted) | period summaries, export bundles for audits |

---

## 3. Data sources (MineAid schema alignment)

Reports **must** tenant-scope all queries (`tenant_id`). Primary fact table: **`incident_reports`**.

| Column / area | Reporting use |
|---------------|---------------|
| `incident_date` | Primary time axis (filter + `groupBy` bucketing); align with clinical’s use of date ranges |
| `location_id` | Care location (FAP/post) — **Incidents per post**, matrix columns, top locations |
| `incident_location` | **Where the event occurred** (work site text) — **top-N or curated buckets** in v1; full text only in gated exports if ever allowed |
| `incident_type` | Category breakdown, filters |
| `severity` | Distribution, filters (values should be inventoried from production like clinical dispositions) |
| `status` | Open/closed (or tenant-specific workflow states) — pipeline KPIs |
| `treated_on_site`, `detained_at_fap`, `ambulance_used` | Boolean KPIs and shares |
| `reported_to_fap_date`, `disposition_date_time`, `general_condition_at_disposition` | Timeliness / disposition proxies (optional v1.1 charts) |
| `patient_id` | Join path to **company** only for aggregates: `patients` → `employees` → `companies` (same as clinical) |
| `reported_by_id` | Optional “reporting activity by recorder” rollups **if** product approves (privacy-sensitive; default **omit in v1**) |

**Joins (aggregates):**

- `incident_reports` → `patients` → `employees` → `companies` for **`companyId`**, **`companyName`**, **`companyType`**
- `incident_reports` → `care_locations` on `location_id` for post labels
- `incident_reports` → `users` on `reported_by_id` only if §7 approves recorder rollups

**Edge cases (QA):**

- **`location_id` null** — bucket **“Unknown location”**; do not drop rows from tenant totals.
- **Company unresolvable** — **“Unknown company”** bucket (broken employee chain).
- **Severity / type / status** null or legacy strings — normalize in application layer with tests; show **“Unknown”** bucket rather than excluding rows.

---

## 4. `/reports/incidents` — information architecture

### 4.0 How to use the page (operator guide) — intended UX

Mirror **`/reports/clinical`** §4.0: collapsible **How to use this page** card (**closed by default**), hidden from print/PDF.

1. **Pick the window** — **From** / **To** (required) and **Group by** (day, week, month).
2. **Scope posts** — **Care locations** (`location_id`); leave empty for all.
3. **Scope employers** — **Companies** / **Company types** (via patient→employee→company); optional **severity**, **incident type**, **status** multi-selects.
4. **Prior period** — Optional **Compare KPIs to the prior period** (same length as clinical).
5. **Detail table** — Optional **Incident-level detail** (paginated, **no casualty name** in v1 aggregate detail — see §5.3); link to **`/incidents`** only if role permits.
6. **Saved views** — Browser **localStorage** presets (same pattern as clinical).
7. **Exports** — CSV for aggregate tables; **Print / Save as PDF** with A4 styling and parameter summary (reuse clinical print patterns where practical).

### 4.1 Global filters (query params)

**Standard** (align with **`REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** §3.2):

| Param | Purpose |
|-------|---------|
| `from`, `to` | Required; filter on `incident_date` (tenant-local date interpretation — match clinical) |
| `locationIds[]` | Care post filter (`incident_reports.location_id`) |
| `groupBy` | `day` \| `week` \| `month` for time series |

**Incidents extensions:**

| Param | Purpose |
|-------|---------|
| `companyIds[]` | Employers (`companies.id`) via join |
| `companyTypes[]` | `companies.company_type` |
| `severities[]` | Filter `incident_reports.severity` |
| `incidentTypes[]` | Filter `incident_reports.incident_type` |
| `statuses[]` | Filter `incident_reports.status` |
| `comparePriorPeriod` | boolean — prior-window KPI replay |
| `includeDetail` | boolean — paginated incident summary rows |
| `detailPage`, `detailPageSize` | Pagination for `detail` |

**Omit-param behavior:** empty lists = “all allowed for tenant.”

### 4.2 Page layout (recommended widgets)

**Row A — KPI cards**

- Total incidents (period)
- Open vs closed counts (or open rate if statuses are boolean-like)
- **By severity** — top line: critical/high vs rest (exact split per §7 inventory)
- **Ambulance used** — count + share of incidents
- **Detained at FAP** — count + share
- **Treated on site** — count + share
- Optional prior-period deltas when `comparePriorPeriod=true`

**Row B — Charts**

- Incidents over time (line/bar by `groupBy`)
- **Severity mix** (horizontal bar or donut)
- **Incident type mix** (horizontal bar; top N + other)
- **Status mix** (if multiple meaningful states)
- **Incidents over time by company** (stacked bar)
- **Top care locations** by volume (horizontal bar)
- Optional: **incident type × severity** heatmap or matrix (table first in v1 is acceptable)

**Row C — Tables**

- **Metrics by company** — sortable; CSV export
- **Company × care location** matrix (incident counts)
- **Cases per post by day (incidents-only)** — optional if product wants parity with clinical matrix **without** visit merge (clinical already ships combined matrix)
- **Top incident sites** — derived from `incident_location` (**capped distinct values** or normalized mapping table in a later phase)

### 4.3 Exports

- **CSV:** by-company table, breakdown bundle, optional day×location matrix
- **Print / PDF:** browser print; strip app chrome; **Report parameters** block; **no narrative body** in default print layout

### 4.4 Relationship to clinical aggregates (avoid double-count confusion)

- **Clinical “Incidents per post”** and **cases matrix** already count **`incident_reports`** alongside visits for **operational** “what happened at this post this day.”
- **Incidents hub** focuses on **safety taxonomy** (type, severity, status, site-of-event) and deeper **incident-only** cuts. Cross-link in UI: “See also **Clinical reports** for visit+incident combined workload.”

---

## 5. API design — incidents

### 5.1 Endpoint

- `GET /api/reports/incidents` (**live**)

### 5.2 Auth

- **Minimum:** same gate as viewing **`/incidents`** list for the tenant (e.g. roles that may access occupational incident data — align with **`RequireClinicalAccess`** vs safety routes: **decision in §7**).
- **Safety officer:** may access **aggregates** that do not leak PHI; **detail** rows must respect **`redactIncidentForSafetyOfficer`** field rules or omit identifiers entirely in `detail` projection.

### 5.3 Response shape (guideline)

Typed JSON parallel to clinical for UI consistency:

```json
{
  "meta": {
    "from": "2026-01-01",
    "to": "2026-03-31",
    "groupBy": "week",
    "generatedAt": "2026-04-20T12:00:00.000Z",
    "priorPeriod": null,
    "filters": {
      "locationIds": [],
      "companyIds": [],
      "companyTypes": [],
      "severities": [],
      "incidentTypes": [],
      "statuses": []
    }
  },
  "kpis": {
    "totalIncidents": 0,
    "openIncidents": 0,
    "closedIncidents": 0,
    "incidentsWithAmbulance": 0,
    "ambulanceRate": null,
    "detainedAtFapCount": 0,
    "detainedAtFapRate": null,
    "treatedOnSiteCount": 0,
    "treatedOnSiteRate": null
  },
  "kpisPriorPeriod": null,
  "series": {
    "incidentsOverTime": [],
    "incidentsOverTimeByCompany": [],
    "severityMix": [],
    "incidentTypeMix": [],
    "statusMix": []
  },
  "tables": {
    "byCompany": [],
    "companyByLocation": [],
    "incidentsByDayByPost": null
  },
  "detail": null
}
```

**`detail` row (illustrative):** `incidentId`, `incidentDate`, `severity`, `incidentType`, `status`, `companyId`, `companyName`, `locationId`, `locationName`, `ambulanceUsed`, `detainedAtFap`, `treatedOnSite` — **no** `patientId`, **no** employee name, **no** free-text narrative in v1 unless role is explicitly allowed and product approves.

**Implementation note:** Prefer one SQL aggregation path per request for company/location tables to keep totals consistent.

---

## 6. Privacy, roles, and auditing

- **Aggregates:** should be safe for any role that may open **`/reports/incidents`**; **no casualty names** in KPI/series/table payloads.
- **Company names** are organizational labels (same rationale as clinical §6).
- **Safety officer** list/detail redaction rules in **`docs/RBAC.md`** apply to **row-level** APIs; the **reports** endpoint must **not** bypass redaction when returning `detail`.
- **Audit:** consider logging access to `includeDetail=true` queries (align with existing audit patterns).
- **Small-count suppression:** defer same as clinical **§7.2** until policy exists; document in release notes when enabled.

---

## 7. Stakeholder decisions (implementation record)

| Topic | Implemented decision |
|-------|----------------------|
| **Route guard** | **Implemented:** dedicated incident-report access middleware permits tenant roles aligned with incident analytics (including `safety_officer`) and guards both UI route and API route. |
| **Severity / type / status vocabulary** | **Implemented:** v1 uses production values and supports multi-select filtering; visual order follows aggregated counts. |
| **`incident_location` analytics** | **Implemented:** top-N raw site strings (`incident_location`) in the page chart/table slice. |
| **Recorder / reporter rollups** | **Implemented:** omitted in v1 (no `reported_by_id` rollups). |
| **Detail projection** | **Implemented:** identifier-safe detail projection (no patient/employee identity; no narrative fields). |
| **Cross-link to `/incidents`** | **Implemented:** role-gated “Manage incidents” link in the incidents reports page header. |

---

## 8. Implementation phases (delivery status)

These extend **Phase R2** of the comprehensive plan for the incidents route.

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **R-INC-1** | `GET /api/reports/incidents` with core `meta`/`kpis`/`series`/`tables`; core filters; `/reports` card + `/reports/incidents` shell | **Shipped (4.23.0)** |
| **R-INC-2** | Stacked incidents-over-time by company, company×location, type/status mixes, CSV exports | **Shipped (4.23.0)** |
| **R-INC-3** | `comparePriorPeriod`, paginated identifier-safe `includeDetail`, print/PDF styling, saved views | **Shipped (4.23.0)** |
| **R-INC-4** | Top incident sites (`incident_location`), type×severity matrix, visual + table polish | **Shipped (4.23.0)** |

**Note:** Remaining hardening is performance profiling and index tuning under production load.

---

## 9. Testing and QA

- **Contract tests** for `GET /api/reports/incidents`: tenant isolation, filter combinations, empty windows, unknown location/company buckets.
- **Parity checks** against clinical: for the **same** date range and filters (where comparable), **total incident count** in incidents hub should **match** clinical’s incident-backed totals when clinical has **`includeIncidents=true`** and uses the same company/location semantics (document any intentional deltas).
- **Role tests:** `safety_officer` receives aggregates without PHI leaks; detail behavior per §7.

---

## 10. Documentation governance

1. This file is the **source of truth** for **`/reports/incidents`** scope, API shape, and R-INC phases.
2. **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** — route map and cross-links.
3. **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** — clinical/incident **overlap** metrics (cases matrix, ambulance merge) remain **clinical-owned**; incidents hub **extends** safety analytics only.
4. **`docs/RBAC.md`** — incident redaction and role capabilities.
