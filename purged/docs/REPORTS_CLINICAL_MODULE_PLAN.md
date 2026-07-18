# MineAid Clinical Reports (`/reports/clinical`)

**Route:** `/reports/clinical`  
**API:** `GET /api/reports/clinical`  
**Status:** **4.22.0** ships **R-CLIN-3** plus **R-CLIN-4** (ambulance): medical-visit **ambulance on hospital transfer** in new/edit flows; clinical API/UI **ambulance KPIs**, **per-clinic** `tables.ambulanceByClinic`, and the **Ambulance usage** dashboard block (summary card, horizontal bar for total by clinic, total table, source-detail bar + table). **4.22.1** polishes the in-app **How to use this page** guide (§4.0): **collapsible**, **closed by default**, hidden from print/PDF. Optional **performance** tuning deferred until profiling. See §4.4–§4.5, §8.  
**Last updated:** April 20, 2026 (§4.0 collapsible guide + version alignment)

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** (cross-domain `/reports` shell, phases, shared filters).

---

## 1. Relationship to the broader reports module

Clinical reports are one slice of the Comprehensive Reports workspace. They share the standard layout (filters bar, saved views, cards/charts/tables, exports) described in the comprehensive plan §3.

**Current app routing context:** Shift narrative reports live at **`/shiftover/shift-report`**. Testing analytics live at **`/testing/reports`**. This document targets **`/reports/clinical`** under the unified analytics hub.

---

## 2. Product scope

### 2.1 Goals

- Give clinical leadership and authorized admins a **single place** to answer: *How busy was the clinic? What did we see? What happened to patients? Where are hotspots?*
- Support **filters** that match how sites run operations: date window, location(s), **employer company** (contractor vs mother company, etc.), optional drilldown dimensions.
- Surface **detailed aggregates and drilldowns by company** so tenant leadership can compare utilization and outcomes across employers operating on site — without exposing unauthorized patient identifiers (see §6).
- Default to **aggregates and de-identified rollups**; expose **line-level clinical detail** only to roles that already have chart access, with audit expectations consistent with the rest of the app.

### 2.2 Non-goals (v1 clinical)

- **Not** a full HL7/FHIR analytics warehouse.
- **Not** duplicating **`/testing/reports`** (drug/alcohol program metrics stay there); optional *future* cross-links only.
- **Not** replacing **incident / safety** management reporting (use **`/reports/incidents`**); clinical may show **correlated counts** only.
- **Not** raw export of unrestricted narrative notes to low-privilege roles.

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Medical manager / clinical lead | volumes, acuity, dispositions, transfer rates, week-over-week trends |
| Site / regional admin | compare locations and **companies**, support staffing decisions |
| Contractor / employer relations (where granted) | visit load and outcomes **by company** for governance and SLAs |
| Compliance / quality (where granted) | documentation completeness proxies, follow-up adherence indicators |

---

## 3. Data sources (MineAid schema alignment)

Reports **must** tenant-scope all queries (`tenant_id`). Below, “primary fact table” drives most metrics.

| Domain | Primary tables | Reporting use |
|--------|----------------|---------------|
| Encounters | `medical_visits` | counts, visit type mix, disposition, transfer/referral fields, detained-at-facility, status, linked triage (`triage_id`), visit date by location |
| Triage | `triage` | volume, acuity (`red`/`orange`/`yellow`/`green`), `tews_score` distribution, triage-to-visit linkage rates |
| Vitals | `vital_signs` | optional volumes (readings per day), extreme vitals thresholds (future), readings tied to visits vs triage vs standalone |
| Occupational linkage | `incident_reports` | counts by `severity`, `incident_type`, disposition proxies — **aggregate only** unless user has incident detail permissions |
| Employer / company | `companies`, `employees`, `patients` | **Company-level reporting** joins: `medical_visits.patient_id` → `patients.employee_id` → `employees.company_id` → `companies.id`. Use `companies.name` for labels and `companies.company_type` (e.g. `mother_company`, `contractor`, `subcontractor`) for grouping or badges |
| Staffing context | `users` (medical_staff_id / recorded_by), `care_locations` | “visits by provider” rollups if allowed; location labels |

**Field anchors (implementations should match product labels to these columns):**

- Visit cohort: `medical_visits.visit_date`, `visit_type`, `disposition`, `status`, `location_id`, `detained_at_facility`, `ambulance_used`, `transfer_facility_id` / `transfer_facility_other`, `follow_up_required`, `follow_up_date`
- Company cohort (via patient): `employees.company_id`, `companies.name`, `companies.company_type`, `companies.status`
- Triage cohort: `triage.triage_at`, `acuity`, `tews_score`, `medical_visit_id` (converted-to-visit rate)

**Edge cases to define in QA:**

- Visits **without** `location_id` — include in tenant totals or exclude (recommend: show in “Unknown location” bucket).
- Visits whose patient/employee chain cannot resolve a company (data integrity edge case) — **“Unknown company”** bucket; do not drop rows from tenant totals without an explicit filter.
- Multiple triage rows per patient/day — triage metrics count **events**, not unique patients, unless a “unique patients triaged” metric is explicitly added later.
- **Triage-by-company:** triage rows link to `patient_id`; join the same **patient → employee → company** path to attribute triage events to a company for aggregate charts/tables.

---

## 4. `/reports/clinical` — information architecture

### 4.0 How to use the page (operator guide)

In the app, this section is shown as the **How to use this page** card at the top of **`/reports/clinical`**. It is implemented as a **collapsible** block (**closed by default**); expand the header to read the steps. The card is **hidden when printing** or saving as PDF so exports stay focused on data.

1. **Pick the window** — Set **From** / **To** (required) and **Group by** (day, week, or month) for time-based charts.
2. **Scope the cohort** — Use **Locations** and **Companies** (and **Company types** if needed); leave empty for all. Optional: **Visit types**, **Dispositions**, **Visit status**, **Triage acuity** to narrow visits and triage widgets.
3. **Occupational incidents** — Leave **Include occupational incidents** on to merge incidents into the **cases matrix**, **Incidents per post**, and **incident ambulance** counts in the ambulance section. Turn off for visits-only incident widgets (overlap KPIs may still reference incidents per API design).
4. **Prior period** — Enable **Compare KPIs to the prior period** to show the previous interval of the same length and deltas on KPI cards.
5. **Visit-level detail** — Optional: turn on **Visit-level detail table** to paginate de-identified visit rows (no patient names); use **Export** for the current page CSV.
6. **Saved views** — **Save** the current filter set with a name; reload from **Saved views** (stored in this browser only).
7. **Exports** — Use **Export by company**, **Export breakdowns**, **Export matrix** where shown; **Print / Save as PDF** uses the browser print dialog (A4 styling).
8. **Ambulance block** — Read totals at the top; **Total ambulance by clinic** bar + table use combined visit+incident counts per post; **By source** splits visit transfer vs incident ambulance. See **§4.5** for definitions.

Full UI behavior ships in **`ClinicalReportsPage.tsx`**; this list is the intended workflow for clinical leads and admins.

### 4.1 Global filters

**Standard filters** align with **`REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** §3.2: `from`, `to`, `locationIds[]`, `groupBy` (`day` | `week` | `month`).

**Clinical extensions (query params):**

| Param | Purpose |
|-------|---------|
| `visitTypes[]` | Filter `medical_visits.visit_type` |
| `dispositions[]` | Filter disposition codes |
| `visitStatus[]` | e.g. open / closed / in_progress |
| `triageAcuities[]` | Filter triage `acuity` when triage widgets are included |
| `companyIds[]` | Limit to one or more `companies.id` (employers); omit = all companies in tenant |
| `companyTypes[]` | Optional filter on `companies.company_type` |
| `includeIncidents` | boolean — when **false**, occupational `incident_reports` are **not** merged into **Cases per post by day**, **Incidents per post** returns empty, and **incident-side ambulance KPIs / per-clinic incident columns** are zeroed (no incident SQL for those paths). **Omitted** or `true` → previous combined behavior (**default true** for backward compatibility). Visit↔incident overlap KPIs still use incidents for the overlap metric. |
| `comparePriorPeriod` | boolean — when **true**, **`kpisPriorPeriod`** repeats the KPI math for the **contiguous prior window** of equal calendar length (ends the day before `from`). Default **false**. |
| `includeDetail` | boolean — when **true**, **`detail`** includes paginated visit rows (company, location, recording provider display; **no patient identifiers**). Default **false** (avoid heavy queries by default). |
| `detailPage` | integer ≥ 1 — page index for **`detail`** (default **1**). |
| `detailPageSize` | integer 1–100 — rows per page for **`detail`** (default **25**). |

**Saved views:** named presets stored in **`localStorage`** on the client (full filter snapshot including dates). Example names: “Last 30 days — all sites”, “Emergency + injury — Site A”.

### 4.2 Page layout (recommended widgets)

**Row A — KPI cards (period totals vs prior period optional)**

- Total visits (each visit row counted once)
- **Unique patients KPI** — **omit in v1** (**§7.1**); optional in a later phase with policy gates
- Triage events count
- Transfer / hospital disposition count + **rate** (% of visits with disposition in transferred categories — exact enum mapping in implementation from `disposition` vocabulary)
- **Ambulance on transfers (visits)** — count and **share of transfer dispositions** only (`medical_visits.ambulance_used` where disposition is a hospital-transfer class; not “any visit with the flag”). Prior-period comparison when enabled.
- **Occupational incidents — ambulance** — total incidents and count with `ambulance_used` + share; **requires** `includeIncidents=true` (same filters as other incident aggregates).
- **Detained at facility** count + share of visits (detention rate)
- **Visits with patient incident in window** (count + share of visits — aggregate overlap only, **§7.1**)

**Row B — Charts**

- Visits over time (line chart by `groupBy`)
- Disposition mix (horizontal bar)
- **Detentions at facility — disposition after detention:** pie chart + table of disposition counts among visits with `detained_at_facility`, for the same filters
- **Operational continuity — return to work vs hospital transfer:** pie chart (plus “other disposition” when present), summary list, and **continuity rate** (RTW ÷ (RTW + hospital transfer))
- Visit type mix (horizontal bar)
- **Triage acuity (period)** distribution; **triage acuity over time** (stacked areas by acuity band)
- Top care locations by volume (horizontal bar)
- “Visit type × disposition” cross-tab (table)
- **Visits over time by company** (stacked bar, top employers + “other”)
- **Detailed metrics by company:** sortable table — **CSV export** (`Export by company`) plus **Export breakdowns** (visit types, locations, acuity, cross-tabs, detention dispositions, work-continuity counts)
- **Cases per post by day:** calendar day × care location matrix — medical **visits + occupational incidents** combined; row/column/grand totals; bounded scroll + sticky headers; **CSV export** (`Export matrix`, wide format: `date`, one column per post, `row_total`, plus a **Total** footer row)

**Row C — Additional / future tables**

- **Company × location** matrix (optional v1.1): visit counts only, for sites with many contractors
- Triage: acuity × week (heatmap optional later)
- Exportable **line-level detail** table (permissioned): visit id, date, **company name**, location, type, disposition, provider display — **no patient/employee name** unless role permits PII

Cross-tabs and leadership tables listed under Row B follow **§7.1** (no unique-patient columns in v1 aggregates).

### 4.3 Exports

- **CSV:** aggregate tables — **by company**, **breakdown bundle**, **cases per post by day matrix** (see §4.2); detail export **role-gated**
- **PDF / print:** **Print / Save as PDF** opens the browser print dialog; choose “Save as PDF” (or a printer). Output is **A4 portrait** with app chrome (sidebar, top bar, filter card, CSV/export buttons, mobile nav) omitted; a **Report parameters** block lists the active window, locations, companies, company types, and generation timestamp. Charts and tables use **print color** fidelity where supported. Server-generated PDF is not required for this slice.

### 4.4 Implemented dashboard sections (current build)

The live `/reports/clinical` page currently includes the filters bar (date range, `groupBy`, locations, companies, company types, **visit type / disposition / visit status / triage acuity** multi-selects, **include incidents** (also gates **incident ambulance metrics** in the ambulance block), **compare prior-period KPIs**, **visit-level detail** fetch, **saved views** load/save/delete in this browser), **Print / Save as PDF**, **KPI row** (visits, triage events, transfers + rate, **ambulance on transfers (visits)** + transfer share, detention + rate, incident overlap + rate; optional prior-period deltas when enabled), **Visits over time**, **Disposition mix**, **Detentions at facility** (pie + table), **Operational continuity** (pie + RTW/transfer/other counts + continuity rate), **Visit type mix**, **Triage acuity (period)** and **Triage acuity over time**, **Top care locations**, **Visit type × disposition**, **Incidents per post** (two-column table + donut, incident counts by care location), **Visits over time by company** (stacked), **Metrics by company** (sort + exports), **Company × care location** (visit counts by employer × post), **Visit-level detail** (paginated table + CSV for current page), **Cases per post by day** (matrix + **Export matrix**), and **Ambulance usage (transfers & incidents)** (§4.5). Items not listed here (e.g. permissioned narrative drilldown from reports, tenant-wide performance SLAs) may remain future scope.

### 4.5 Ambulance usage (4.22.0)

**Product / data entry**

- **New medical visit** (`MedicalVisit.tsx`): when disposition is **Transferred to Hospital** or **Transferred to Hospital (Other)**, **Ambulance used** switch; cleared when disposition is not a transfer. Submitted as `ambulanceUsed` on create.
- **Edit medical visit** (`Records.tsx`, `PatientDetails.tsx`): same rule; save sends `ambulanceUsed` for transfer dispositions and **false** otherwise (legacy `emergency` disposition branch removed).
- **Visit details** (`MedicalVisitDetailsModal.tsx`): shows ambulance for transfer dispositions when `ambulance_used` is set.
- **Incidents:** unchanged model — `incident_reports.ambulance_used` (no separate “transfer disposition” on incidents).

**Clinical reports — KPIs (`kpis`)**

- `ambulanceVisits` — visits with **hospital-transfer disposition** and `ambulance_used` true (not all visits with the flag).
- `ambulanceTransferRate` — `ambulanceVisits / transfers` when `transfers > 0`.
- `totalIncidents`, `incidentsWithAmbulance`, `incidentAmbulanceRate` — from `incident_reports` when `includeIncidents=true`; otherwise zeros / null rate.

**Clinical reports — `tables.ambulanceByClinic`**

Per care location (visit rows bucketed by `medical_visits.location_id`; incident rows by `incident_reports.location_id`; merged on bucket):

- `visitCaseCount`, `visitTransfers`, `visitAmbulanceOnTransfers`, `visitAmbulanceShareOfTransfers`
- `incidentTotal`, `incidentsWithAmbulance`, `incidentAmbulanceShare`
- `totalCasesAtPost` = `visitCaseCount + incidentTotal`
- `totalAmbulanceUsage` = `visitAmbulanceOnTransfers + incidentsWithAmbulance`
- `ambulancePerOverallCaseVolume` = `totalAmbulanceUsage / totalCasesAtPost` when `totalCasesAtPost > 0`

**Clinical reports — UI**

- Summary card: visit transfer vs incident ambulance copy + prior window when comparison on.
- **By clinic:** horizontal **bar chart** (top 15 by `totalAmbulanceUsage`) + **table** (all clinics: total amb., cases, amb./case).
- **By source (detail):** grouped horizontal bar (visit vs incident ambulance) + table (clinic, transfer/visit/incident breakdown without duplicating the total columns).

Server: `server/modules/reports/clinical-reports.service.ts` (`ambulanceOnTransferVisitCondition`, `fetchIncidentAmbulanceAgg`, merge queries).

---

## 5. API design — clinical

### 5.1 Endpoint

- `GET /api/reports/clinical`

### 5.2 Request (query string)

Combine standard filters + §4.1 extensions. Examples:

`GET /api/reports/clinical?from=2026-01-01&to=2026-03-31&locationIds=a,b&groupBy=week&visitTypes=emergency,routine`

`GET /api/reports/clinical?from=2026-01-01&to=2026-03-31&groupBy=month&companyIds=c1,c2&companyTypes=contractor`

### 5.3 Response shape (guideline)

Typed JSON with stable keys for the UI and exports. **v1:** omit **`uniquePatients`** / **`uniquePatientCount`** everywhere per **§7.1** (omit keys or keep `null`).

```json
{
  "meta": {
    "from": "2026-01-01",
    "to": "2026-03-31",
    "groupBy": "week",
    "generatedAt": "2026-04-17T12:00:00.000Z",
    "priorPeriod": { "from": "2025-12-01", "to": "2025-12-31" },
    "filters": {
      "includeIncidents": true,
      "locationIds": [],
      "visitTypes": [],
      "dispositions": [],
      "visitStatus": [],
      "triageAcuities": [],
      "companyIds": [],
      "companyTypes": []
    }
  },
  "kpis": {
    "totalVisits": 0,
    "triageEvents": 0,
    "transfers": 0,
    "transferRate": null,
    "detentionVisits": 0,
    "detentionRate": null,
    "returnToWorkVisits": 0,
    "otherDispositionVisits": 0,
    "operationalContinuityRate": null,
    "visitsWithIncidentOverlap": 0,
    "incidentOverlapRate": null,
    "ambulanceVisits": 0,
    "ambulanceTransferRate": null,
    "totalIncidents": 0,
    "incidentsWithAmbulance": 0,
    "incidentAmbulanceRate": null
  },
  "kpisPriorPeriod": null,
  "series": {
    "visitsOverTime": [],
    "visitsOverTimeByCompany": [],
    "triageAcuityOverTime": [],
    "dispositionMix": [],
    "dispositionByCompany": []
  },
  "tables": {
    "visitTypeByDisposition": [],
    "topLocations": [],
    "incidentsPerPost": [{ "locationId": null, "locationName": "", "count": 0 }],
    "byCompany": [],
    "companyByLocation": [],
    "ambulanceByClinic": [],
    "casesByDayByPost": {
      "dates": [],
      "columns": [{ "key": "", "locationId": null, "locationName": "" }],
      "rows": [{ "date": "2026-01-01", "cells": [], "rowTotal": 0 }],
      "columnTotals": [],
      "grandTotal": 0
    }
  },
  "detail": null
}
```

**`byCompany` row shape (illustrative, v1):** `{ "companyId", "companyName", "companyType", "visitCount", "triageEventCount", "transferCount", "transferRate" }` — **no `uniquePatientCount` in v1** (§7.1). Empty arrays may be omitted when filters yield no data.

**`casesByDayByPost`:** matrix for **Cases per post by day** — each `rows[]` entry is one calendar `date` (ISO date string), `cells[]` aligns with `columns[]` order (visit + incident counts per location), `rowTotal` is the row sum; `columnTotals[]` and `grandTotal` match the UI footer. CSV export uses column headers from `locationName`, with a `(key)` suffix when two posts share the same display name.

**`incidentsPerPost`:** rows `{ locationId, locationName, count }` — occupational **incident_reports** only, grouped by care location; same tenant/date/location/company filters as other incident-backed aggregates on this endpoint. Used for the **Incidents per post** table + donut on `/reports/clinical` (dedicated safety analytics hub: **`docs/REPORTS_INCIDENTS_MODULE_PLAN.md`** / route **`/reports/incidents`**, planned).

**`detail`:** when `includeDetail=false`, **`null`**. When `includeDetail=true`, **`{ rows[], page, pageSize, totalCount }`** — each row includes **`visitId`**, **`visitDate`** (ISO), **`visitType`**, **`disposition`**, **`status`**, **`companyId`**, **`companyName`**, **`locationId`**, **`locationName`**, **`providerDisplay`** (recording clinician). **No patient or employee identifiers.**

**`kpisPriorPeriod`:** **`null`** unless **`comparePriorPeriod=true`** and a prior window exists; otherwise same numeric keys as **`kpis`**.

**`tables.companyByLocation`:** `{ companyId, companyName, companyType, locationId, locationName, visitCount }` rows (visit counts only).

**`tables.ambulanceByClinic`:** per-post ambulance rollups (see **§4.5**). Row shape includes `locationId`, `locationName`, visit and incident sub-counts, `totalCasesAtPost`, `totalAmbulanceUsage`, `ambulancePerOverallCaseVolume`, and related shares.

**Implementation note:** Prefer one SQL aggregation path per request (visits joined to `patients` → `employees` → `companies`) so company breakdowns stay consistent across KPIs, charts, and `byCompany`.

- All counts computed server-side; **never** send full note text in aggregate endpoints.

### 5.4 Performance

- Prefer **single tenant-scoped queries** with narrow `visit_date` / `triage_at` ranges and existing indexes (`tenantId` + date).
- Join path for companies adds tables already keyed by tenant; ensure **indexes** on `patients(employee_id)`, `employees(company_id)` match production (add migration if profiling shows sequential scans on large tenants).
- Consider **rolling daily snapshot** materialization only if p95 latency exceeds target under load (defer until measured).

---

## 6. Privacy, roles, and auditing

- **Aggregate endpoint** (`/api/reports/clinical` without detail) should mirror what a **dashboard** user is allowed to know: counts and rates for their tenant scope.
- **Company-level counts** are organizational metrics (employer identity), not patient names — apply **small-count suppression** once policy is set (**§7.2**); **v1 ships without suppression** pending legal/HR review.
- **Patient-identifying detail** belongs in existing patient-chart flows; reports module should **not** become a backdoor. Per **§7.1**, **unique-patient KPIs are omitted in v1**; when introduced later, gate or null `uniquePatients` / `uniquePatientCount` per tenant policy if needed.
- **Incident row content** stays in incident permissions; clinical dashboard only pulls **counts** unless `includeIncidents` and user passes incident read checks.
- Reuse existing auth patterns (same as `/api/medical-visits` / triage APIs) for any expanded read.

---

## 7. Stakeholder decisions

Signed off **April 2026**. Use this section as the source of truth for v1 behavior.

### 7.1 Resolved

| Topic | Decision |
|-------|----------|
| **Small-count suppression** | **Deferred:** v1 ships **without** suppression; revisit after legal/HR review (may add configurable thresholds or flags later). Details under **§7.2**. |
| **Disposition → “transfer” & transfer rate** | **Implementation-led mapping:** Before coding, **enumerate actual `disposition` values** in use (UI + DB, including legacy strings). Codify **transfer vs non-transfer** in application logic (including strings containing “transfer” and any canonical enums). **Transfer rate** = visits classified as transfer ÷ **all visits** matching the active filters. Add **tests** so the mapping stays stable when labels change. |
| **Unique patients KPI** | **Omit in v1** — dashboard and `GET /api/reports/clinical` do **not** expose unique-patient counts or `uniquePatientCount` on `byCompany` rows until a later phase. |
| **Visits linked to incident (cross-module)** | **In v1** as an **aggregate percentage (or count) only** — no drilldown to individuals or incident records in the first shipped version of this metric. |
| **Export units (temp, weight, etc.)** | **Metric in exports:** e.g. °C and kg in CSV (convert at export if stored otherwise). |
| **Company breakdown access** | **Anyone who can access `/reports/clinical`** sees **all companies** in the tenant (no per-user company scoping in v1). |

### 7.2 Suppression policy (pending legal / HR)

- **Status:** Not yet finalized (see also **§7.1** row on suppression).
- **Intent for a later release:** Define rules for hiding or banding small cells in by-company (and similar) breakdowns to reduce re-identification risk.
- **v1 behavior:** No automated suppression; document in release notes.

---

## 8. Clinical implementation phases (build order)

These refine **Phase R2** of the comprehensive plan for the clinical route only.

| Phase | Deliverable |
|-------|-------------|
| **R-CLIN-1** | `/reports` shell + `/reports/clinical` page with filters (**including `companyIds` / `companyTypes`**), KPI row, visits-over-time chart, disposition chart; **`tables.byCompany`** + visits-by-company series in `GET /api/reports/clinical` |
| **R-CLIN-2** | Triage panels (acuity distribution + time series); visit type breakdown; location top-N; **stacked visits-over-time by company**; detention / operational-continuity / incident-overlap KPIs and charts; **cases per post by day** matrix; CSV exports: **by-company**, **breakdowns**, **cases matrix** |
| **R-CLIN-3** | **`includeDetail`** visit rows (no patient identifiers); **`companyByLocation`** matrix; **`comparePriorPeriod`** KPI replay; performance pass deferred until measured |
| **R-CLIN-4** | **Ambulance:** capture **`ambulance_used`** on medical visits for **hospital-transfer** dispositions (new + edit + details modal); clinical **`GET /api/reports/clinical`** extended KPIs (`ambulanceTransferRate`, incident ambulance fields), **`tables.ambulanceByClinic`**, and **Ambulance usage** UI (summary, bar + tables by clinic and by source) |

**Dependency:** §7.1 is locked for v1. Before R-CLIN-2–3, complete **disposition inventory + coded mapping** (§7.1) in code; align any new KPIs with **§7.2** when suppression is introduced.
