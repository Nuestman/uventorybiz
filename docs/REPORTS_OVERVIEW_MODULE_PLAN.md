# MineAid Executive Overview Reports (`/reports/overview`)

**Route:** `/reports/overview`  
**API:** `GET /api/reports/overview`  
**Status:** **Implemented (4.26.0)** — R-OVR-1 baseline: executive KPI snapshot with role-aware sections; further widgets/phases in §8 remain optional.  
**Last updated:** May 31, 2026

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**.

---

## 1. Relationship to the broader reports module

The overview is the **entry-level executive** view: a **single screen** of headline KPIs and short trends so leadership can see whether clinical load, safety, operations, and compliance signals are within expectations **before** opening a domain dashboard.

**Design principle:** **Compose, don’t duplicate** business logic. Prefer calling shared report services (or thin SQL helpers used by domain endpoints) so numbers **match** the drill-down routes when filters align. Where full aggregation is too heavy for one request, v1 may return **subset** widgets with explicit “partial data” flags in `meta` (see §7).

**Distinction from `/reports` landing:** **`/reports`** is **navigation** (cards and links). **`/reports/overview`** is **data** (KPIs and sparklines).

---

## 2. Product scope

### 2.1 Goals

- Answer in under a minute: *Are incidents, tickets, duties, shift handovers, and clinical volume roughly where we expect for this period?*
- Support **global filters**: date window, location(s); optional **role-based** hiding of domains the user cannot access.
- Provide **deep links** into domain reports with **query params** pre-filled where possible (same filter contract as **`REPORTS_COMPREHENSIVE_MODULE_PLAN.md`** §3.2).

### 2.2 Non-goals (v1 overview)

- **Not** replacing domain dashboards for analysis or CSV-heavy exports.
- **Not** mixing PHI into executive cards for roles that lack clinical access.
- **Not** real-time streaming; **snapshot** semantics with `generatedAt` in `meta`.

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Site / regional leadership | morning check-in, board pack inputs |
| Tenant admin | cross-module health before escalation |
| Super admin (via impersonation) | tenant-scoped snapshot only |

---

## 3. Candidate data sources (schema alignment)

All queries **tenant-scoped**. Overview may **summarize** from:

| Domain | Tables / notes | Example headline metrics |
|--------|----------------|---------------------------|
| Occupational incidents | `incident_reports` | open vs closed count in window; optional severity strip |
| Clinical (if permitted) | `medical_visits`, `triage` (counts only) | visit volume; triage events — **omit if user lacks clinical report access** |
| Tickets | `tickets`, `ticket_categories` | open count, created/resolved in window, aging bucket summary |
| Operational duties | `operational_duty_assignments`, `operational_duty_completions` | completion rate; overdue count |
| Shift handover | `shift_reports`, `shift_report_acknowledgments` | reports filed count; **ack coverage** (reports with ≥1 ack / total reports in window — define precisely in §7) |
| Compliance (light) | `audit_logs` (counts), optional SOP/legal rollups | high-level “audit events” or “pending approvals” **only** if product approves (see **`REPORTS_COMPLIANCE_MODULE_PLAN.md`**) |

**Edge cases:** null `location_id` on tickets or incidents — bucket as **Unknown** in location-filtered mode or exclude per product decision (document in §7).

---

## 4. Information architecture

### 4.0 Operator guide (intended UX)

Collapsible **How to use this page** (**closed by default**), hidden from print — same UX pattern as **`/reports/clinical`** §4.0.

1. Set **From / To** and **Locations** (optional).
2. Scan **domain cards**; use **Open full report** to jump with filters preserved.
3. Note **last refreshed** timestamp; large tenants may use cached rollups (future).

### 4.1 Filters

| Param | Purpose |
|-------|---------|
| `from`, `to` | Required window (interpret consistently with other report routes) |
| `locationIds[]` | Scope all widgets that support location |

Optional: `includeDomains[]` for power users (default = all allowed for role).

### 4.2 Page layout (recommended)

- **Row A — Domain summary cards** (each: 2–4 numbers + trend arrow vs prior period optional)
  - Incidents (link → `/reports/incidents`)
  - Clinical (link → `/reports/clinical`, gated)
  - Operations / tickets & duties (link → `/reports/operations`)
  - Compliance teaser (link → `/reports/compliance`, optional)
- **Row B — Single combined “activity timeline”** (optional v1.1): stacked or multi-line of normalized counts per `groupBy`
- **Row C — Risk / attention list** (optional): e.g. locations with more than *N* open high-priority tickets — **role-gated**, no patient identifiers

### 4.3 Exports

- **v1:** Print-friendly **PDF via browser print** only; **no** bulk CSV on overview (use domain routes).

---

## 5. API design — overview

### 5.1 Endpoint

- `GET /api/reports/overview` (planned)

### 5.2 Auth

- **Baseline:** authenticated tenant user.
- **Per-section nulling:** if user cannot access clinical reports, **`clinical`** section is `null` with `meta.clinical.omittedReason: "forbidden"`. Same pattern for incidents, operations, compliance.

### 5.3 Response shape (guideline)

```json
{
  "meta": {
    "from": "2026-04-01",
    "to": "2026-04-30",
    "generatedAt": "2026-04-20T12:00:00.000Z",
    "locationIds": [],
    "partial": false,
    "notes": []
  },
  "incidents": {
    "totalInWindow": 0,
    "openCount": 0,
    "closedCount": 0,
    "priorPeriod": null
  },
  "clinical": null,
  "operations": {
    "ticketsOpen": 0,
    "ticketsCreatedInWindow": 0,
    "ticketsResolvedInWindow": 0,
    "dutyAssignmentsCompletedRate": null
  },
  "shiftHandover": {
    "reportsSubmitted": 0,
    "acknowledgmentRate": null
  },
  "compliance": null
}
```

**Implementation strategies:**

1. **Monolithic handler** — one service orchestrating sub-queries (watch total latency).
2. **Parallel promises** — independent aggregations with `Promise.all` and per-section timeouts (mark `meta.partial=true` on failure).

---

## 6. Privacy and roles

- **No patient names** on overview.
- **Clinical section:** same gate as **`GET /api/reports/clinical`** (or stricter if overview is leadership-only — **decide in §7**).
- **Incident aggregates:** align with **`requireIncidentReportsAccess`** or overview-specific policy.

---

## 7. Stakeholder decisions (pre-build)

| Topic | Decision needed |
|-------|-----------------|
| **Acknowledgment KPI definition** | Exact formula for shift report ack rate (per report, per location, per user). |
| **Clinical on overview** | Show for all admins or only users with clinical report route access. |
| **Latency budget** | Max p95 for `GET /api/reports/overview`; when to split into lazy-loaded sections on the client. |
| **Prior period** | Match clinical (equal-length prior window) for all cards or omit in v1. |

---

## 8. Implementation phases — overview

| Phase | Deliverable |
|-------|-------------|
| **R-OVR-1** | Route shell + `GET /api/reports/overview` with **incidents + operations** sections only; links to domain reports |
| **R-OVR-2** | **Shift handover** block; optional prior-period deltas |
| **R-OVR-3** | **Clinical** and **compliance** teaser blocks with role gating; print layout |
| **R-OVR-4** | Performance (parallel fetch, caching), attention list widgets |

---

## 9. Documentation governance

- This file owns **`/reports/overview`** scope and API contract.
- Domain truth remains in **`REPORTS_CLINICAL_MODULE_PLAN.md`**, **`REPORTS_INCIDENTS_MODULE_PLAN.md`**, **`REPORTS_OPERATIONS_MODULE_PLAN.md`**, **`REPORTS_COMPLIANCE_MODULE_PLAN.md`**.
