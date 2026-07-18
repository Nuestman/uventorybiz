# MineAid `/reports` — Comprehensive Reporting Module Plan

**Module name:** Comprehensive Reports  
**Primary route:** `/reports`  
**Status:** **Clinical** through **4.22.1** — **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`**. **Incidents** at **`/reports/incidents`** + **`GET /api/reports/incidents`** (**4.23.0+**). **Operations** at **`/reports/operations`** + **`GET /api/reports/operations`** (**4.24.0**; validate in production, then continue **R-OPS-4** per **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`**). **Compliance** at **`/reports/compliance`** + **`GET /api/reports/compliance`** (**4.25.0**). **Overview** at **`/reports/overview`** + **`GET /api/reports/overview`** (**4.26.0**, R-OVR-1 baseline). **Custom** — specified below; UI delivery still planned.  
**Last updated:** May 31, 2026 (**4.26.0** overview + session security release)

---

## 1. Purpose

The `/reports` module is MineAid's cross-domain reporting workspace for trend analysis, KPI monitoring, compliance views, and exports.

It is intentionally separate from ShiftOver:

- **`/shiftover/*`** = shift handover continuity workflows (including shift activity text reports)
- **`/reports/*`** = organization-wide **analytics** and exportable summaries (aggregates and role-gated detail)

**Current app state (May 2026):** Shift handover *list and forms* live at **`/shiftover/shift-report`** (not at `/reports`). Testing analytics live at **`/testing/reports`**. **Clinical** ships at **`/reports/clinical`**. **Incidents** ship at **`/reports/incidents`**. **Operations** ship at **`/reports/operations`**. **Compliance** ships at **`/reports/compliance`**. **Overview** ships at **`/reports/overview`** (**4.26.0**). **Specifications** remain for **`/reports/custom`**. Landing **`/reports`** is live.

---

## 2. Target route map

| Route | Purpose | Audience |
|------|---------|----------|
| `/reports` | Landing page / global report navigation | All report-enabled users |
| `/reports/overview` | Executive snapshot: top KPIs, risk indicators, trends | Leadership, admins |
| `/reports/operations` | Operations performance (tickets, duties, response times, workload) | Operations managers, admins |
| `/reports/clinical` | Clinical activity and outcomes summaries | Clinical leadership, admins |
| `/reports/incidents` | Occupational / safety incident analytics (aggregates; separate from `/incidents` CRUD) | Safety officers, medical leadership, admins |
| `/reports/compliance` | Audit/compliance metrics and required reporting views | Compliance leads, admins |
| `/reports/custom` | User-defined reports and saved views | Admins, advanced users |

---

## 3. Information architecture

### 3.1 Shared page layout

Every `/reports/*` page should follow a common layout:

- **Global filters bar:** date range, location(s), optional department/team
- **Saved view selector:** presets for common reporting slices
- **Cards + charts + detailed tables:** summary first, detail on drilldown
- **Export actions:** CSV/XLSX/PDF where relevant
- **Last refreshed + data window indicator**

### 3.2 Standard filter model

Core filters used across sub-routes:

- `from`, `to` (required date window)
- `locationIds[]` (multi-select)
- `groupBy` (day/week/month for trendable charts)
- route-specific dimensions (category, severity, status, role, etc.)

---

## 4. Data domains and example KPIs

### 4.1 `/reports/overview`

**Full specification:** **`docs/REPORTS_OVERVIEW_MODULE_PLAN.md`** (`GET /api/reports/overview`, R-OVR phases).

At a glance:

- Cross-domain **headline KPIs** (incidents, operations, shift handover signals, optional clinical/compliance teasers) with **deep links** to domain reports
- **Compose** metrics from shared aggregation helpers where possible so numbers align with drill-down routes

### 4.2 `/reports/operations`

**Full specification:** **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`** (`GET /api/reports/operations`, R-OPS phases; **shipped 4.24.0** through R-OPS-3, resume at §8.2).

At a glance:

- **Tickets:** throughput, aging buckets, status/priority/category mix, assignee **filter** (top-assignee workload tables = **R-OPS-4**)
- **Operational duties:** completion rates, overdue counts, **by care location** breakdown (by duty catalog = future)
- **Shift reports:** filing volume, **acknowledgment** metrics, **linked record** counts — analytics only; workflows stay on **`/shiftover/*`**

### 4.3 `/reports/clinical`

**Full specification:** **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** (scope, schema mapping, API, privacy, R-CLIN phases).

At a glance:

- Encounter / visit volumes and mix by location, time, **employer company** (contractor / mother company, etc.), visit type, disposition
- Triage acuity and workload (SATS bands, TEWS distribution)
- Referrals and transfers (facility usage); **ambulance** on **hospital-transfer** visits plus **incident** `ambulance_used` in aggregates and per-clinic rollups (**§4.5** in the clinical plan)
- Links to occupational incidents where clinically relevant (counts and severity — not a replacement for safety analytics)

### 4.4 `/reports/incidents`

**Full specification:** **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`** (schema mapping, `GET /api/reports/incidents`, privacy, R-INC phases).

At a glance:

- **Occupational `incident_reports`** trends: volume over time, **severity** and **incident type** mix, **status** pipeline, care **location** and **company** breakdowns
- Treatment flags: **ambulance used**, **detained at FAP**, **treated on site** — consistent with columns on `incident_reports`
- **Distinct from** **`/incidents`** (operational list/CRUD) and **complementary to** **`/reports/clinical`** (which merges incidents into cases matrix / per-post counts for clinical workload)

### 4.5 `/reports/compliance`

**Full specification:** **`docs/REPORTS_COMPLIANCE_MODULE_PLAN.md`** (`GET /api/reports/compliance`, R-COMP phases).

At a glance:

- **`audit_logs`** aggregates (counts by action / resource type / time) without bulk **`original_data`** exposure
- **SOP** workflow snapshot (`tenant_sop_*`), optional **signed legal** summaries
- Optional **shift acknowledgment** summary for audit narrative (shared KPI logic with operations/overview)

### 4.6 `/reports/custom`

**Full specification:** **`docs/REPORTS_CUSTOM_MODULE_PLAN.md`** (run + saved definitions API, R-CUST phases).

At a glance:

- **Guardrailed** dataset picker (allow-list), dimensions, metrics, filters
- Saved report definitions (tenant or personal — per plan §7), CSV export, rate limits

---

## 5. API design direction (planned)

### 5.1 Route pattern

- `GET /api/reports/overview`
- `GET /api/reports/operations`
- `GET /api/reports/clinical`
- `GET /api/reports/incidents`
- `GET /api/reports/compliance`
- `GET /api/reports/custom`

### 5.2 Response shape guidelines

- include `meta` (date window, filters applied, generatedAt)
- return normalized card/chart/table payloads
- avoid leaking raw PHI/PII where role should receive aggregates only

### 5.3 Performance and caching

- compute-heavy endpoints may use pre-aggregation or materialized snapshots
- React Query caching keyed by route + normalized filters
- server-side pagination for large tables

---

## 6. Roles and access control (planned)

- **admin / super_admin:** full module access
- **managerial roles:** scoped domain access (operations/clinical/incidents/compliance as configured)
- **staff roles:** limited or no access to executive views unless explicitly granted

Fine-grained access should be enforced server-side by route and data slice.

---

## 7. Phased implementation plan

### Phase R1 — Foundation

- `/reports` landing page
- shared filters and layout shell
- `/reports/overview` — **`docs/REPORTS_OVERVIEW_MODULE_PLAN.md`** §8 (R-OVR-1…4)

### Phase R2 — Domain dashboards

Recommended order (can overlap): **`/reports/clinical` first**, then **`/reports/incidents`**, **`/reports/operations`**, **`/reports/compliance`**.

- `/reports/clinical` — **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** §8 (R-CLIN-1…4)
- `/reports/incidents` — **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`** §8 (R-INC-1…4)
- `/reports/operations` — **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`** §8 (R-OPS-1…4)
- `/reports/compliance` — **`docs/REPORTS_COMPLIANCE_MODULE_PLAN.md`** §8 (R-COMP-1…4)
- basic exports (CSV) per domain plan

### Phase R3 — Custom reporting

- `/reports/custom` — **`docs/REPORTS_CUSTOM_MODULE_PLAN.md`** §8 (R-CUST-1…4): builder, registry, saved definitions, exports

### Phase R4 — Hardening

- performance tuning/pre-aggregation
- role-scoped data security review
- test coverage and release hardening

---

## 8. Non-goals

- Replacing ShiftOver handover workflows (`/shiftover/*`)
- Real-time collaborative BI editing in v1
- Building a universal third-party BI platform inside MineAid

---

## 9. Dependencies and prerequisites

- Confirm KPI definitions with stakeholders (operations, clinical, compliance)
- Confirm row-level visibility rules per role
- Confirm export requirements and data governance constraints
- Align naming and glossary across product/docs

---

## 10. Documentation governance

When `/reports` work begins:

1. Keep this file as the primary product/technical plan for comprehensive reports.
2. **`docs/REPORTS_CLINICAL_MODULE_PLAN.md`** — clinical dashboard (`/reports/clinical`), API, privacy, R-CLIN phases.
3. **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`** — incident / safety analytics (`/reports/incidents`, `GET /api/reports/incidents`), R-INC phases.
4. **`docs/REPORTS_OVERVIEW_MODULE_PLAN.md`** — executive overview (`/reports/overview`), R-OVR phases.
5. **`docs/REPORTS_OPERATIONS_MODULE_PLAN.md`** — operations (`/reports/operations`), R-OPS phases.
6. **`docs/REPORTS_COMPLIANCE_MODULE_PLAN.md`** — compliance (`/reports/compliance`), R-COMP phases.
7. **`docs/REPORTS_CUSTOM_MODULE_PLAN.md`** — custom builder (`/reports/custom`), R-CUST phases.
8. Keep `docs/SHIFTOVER_SYSTEM_ADDENDUM.md` focused on route separation intent.
9. Keep `docs/SHIFTOVER_IMPLEMENTATION_PLAN.md` focused on ShiftOver only.

