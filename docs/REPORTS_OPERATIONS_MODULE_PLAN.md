# MineAid Operations Reports (`/reports/operations`)

**Route:** `/reports/operations`  
**API:** `GET /api/reports/operations`  
**Status:** **Shipped (4.24.0)** — **R-OPS-1 through R-OPS-3** plus assignee workload, duties-by-catalog rollups, requester filter UI, saved views, and prior-period KPI compare. **Validate in production**; **§8.0** lists remaining gaps (**`ticket_activity`**, perf, median/SLA, roles). Does **not** replace **`/shiftover/*`** workflows.  
**Last updated:** April 21, 2026 — **§8.0** is the canonical “where we are / what’s left” snapshot for picking up work.

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**.

---

## 1. Relationship to the broader reports module

Operations reporting answers: *How well is the site running day-to-day work?* — request/ticket flow, duty completion, and handover **signals** (volume, acknowledgment, linked records).

**Boundaries:**

| Surface | Role |
|---------|------|
| **`/shiftover/*`** | **Do work:** create shift reports, acknowledgments, open items, linked tickets/incidents/duties. |
| **`/reports/operations`** | **Measure work:** aggregates, aging, throughput, completion rates, trends. |
| **Ticket UI** (e.g. `/tickets` or equivalent) | CRUD and conversation threads — not analytics. |

---

## 2. Product scope

### 2.1 Goals

- **Tickets:** volume, status pipeline, priority mix, category mix, assignee workload, **aging** (time in `open` / since `updatedAt`), resolution cycle times (where `resolvedAt` / `closedAt` exist).
- **Operational duties:** assignments by `assignment_date`, `shift`, `status`; completion rate; overdue counts; optional location breakdown.
- **Shift reports (analytics):** count of `shift_reports` in window; **acknowledgment** metrics using `shift_report_acknowledgments`; **linked record** counts via `shift_report_links` (`linked_type`: ticket | incident | duty).
- Support **filters:** `from`, `to`, `locationIds[]`, `groupBy` for trends; ticket-specific: `categoryIds[]`, `statuses[]`, `priorities[]`, `assigneeUserIds[]` (admin use).

### 2.2 Non-goals (v1 operations hub)

- **Not** editing tickets or duties from the report page (link out only).
- **Not** duplicating full ShiftOver open-items **task UI** — optional **aggregate** “open items age” only if backed by schema/API (define in §7).
- **Not** exporting full ticket HTML bodies to CSV for all roles — exports are **aggregate tables** or **metadata columns** unless role permits.

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Operations / site manager | backlog, SLA-style aging, duty completion |
| Admin | assignee fairness, category hotspots |
| Leadership | trend lines in monthly reviews |

---

## 3. Data sources (schema alignment)

Primary tables (see **`shared/schema.ts`**):

| Table | Reporting use |
|-------|---------------|
| **`tickets`** | `status`, `priority`, `category_id`, `assignee_user_id`, `requester_user_id`, `location_id`, `created_at`, `updated_at`, `resolved_at`, `closed_at`, `related_incident_id` |
| **`ticket_categories`** | Labels for category breakdown |
| **`ticket_activity`** | Optional event-level analytics (status transitions) — phase 2 |
| **`operational_duty_assignments`** | `assignment_date`, `shift`, `status`, `location_id`, `duty_id`, completion timestamps |
| **`operational_duties`** | Duty catalog metadata (`category`, `priority`, etc.) |
| **`operational_duty_completions`** | Completion events (if distinct from assignment `completed_at`) |
| **`shift_reports`** | `report_date`, `location_id`, `shift`, `has_issues`, filing volume |
| **`shift_report_acknowledgments`** | `acknowledged_at` per report/user |
| **`shift_report_links`** | Count of linked tickets/incidents/duties per report or in aggregate |

**Indexes (performance):** existing `idx_tickets_tenant_status_updated`, shift report indexes on `tenant_id` + `report_date` — add composite indexes only after profiling.

**Edge cases:** unassigned tickets (`assignee_user_id` null), tickets without `location_id`, cancelled duty assignments — explicit buckets in QA.

---

## 4. Information architecture

### 4.0 Operator guide

Collapsible **How to use this page** (**closed by default**); hidden from print — align with clinical §4.0.

### 4.1 Filters (query params)

**Standard:** `from`, `to`, `locationIds[]`, `groupBy` (`day` | `week` | `month`). Optional **`comparePriorPeriod`** (`true` / absent) — same-length window ending the day before `from`; returns **`meta.priorPeriod`** and **`kpisPriorPeriod`** (KPIs only).

**Tickets:**

| Param | Purpose |
|-------|---------|
| `ticketCategoryIds[]` | Filter `tickets.category_id` |
| `ticketStatuses[]` | `open`, `in_progress`, `resolved`, `closed`, … (match `ticketStatusEnum`) |
| `ticketPriorities[]` | `low`, `normal`, `high`, `urgent` (matches `ticket_priority` enum in schema) |
| `assigneeUserIds[]` | Filter assignee |
| `requesterUserIds[]` | Optional |

**Duties:**

| Param | Purpose |
|-------|---------|
| `dutyIds[]` | Filter catalog duty |
| `dutyAssignmentStatuses[]` | `pending`, `in_progress`, `completed`, … |
| `shifts[]` | `day`, `night` |

**Shift reports:**

| Param | Purpose |
|-------|---------|
| `shiftReportShifts[]` | `day`, `night` |
| `onlyWithIssues` | boolean — `has_issues` |

### 4.2 Page layout (recommended widgets)

**Tickets**

- KPI row: open count, created/resolved/closed in window, mean/median age of open (define), overdue count if SLA fields added later
- Status mix (donut/bar), priority mix, category mix (top N)
- Tickets over time (line/bar)
- **Aging buckets** table: 0–24h, 1–3d, 3–7d, 7d+ (based on `updatedAt` or policy)
- **Top assignees** by open load and by resolved count (admin-gated if sensitive)

**Duties**

- Completion rate, overdue count, assignments over time
- Breakdown by `duty_id` / category, by location

**Shift handover (metrics only)**

- Reports filed over time; acknowledgment rate (see **`REPORTS_OVERVIEW_MODULE_PLAN.md`** §7 — same definition)
- Linked records: counts by `linked_type`

### 4.3 Exports

- CSV: aging table, category/status breakdowns, duty completion summary
- Print: A4, parameters block

---

## 5. API design — operations

### 5.1 Endpoint

- `GET /api/reports/operations` — live; see `server/modules/reports/operations-reports.routes.ts`.

### 5.2 Auth

- **Shipped (v1):** tenant **`admin`** and global **`super_admin`** (with impersonation for tenant context). Middleware: `server/shared/middleware/operationsReportsAuth.ts`.
- **Future:** optional dedicated “operations reports” or read-only staff slices (**§7**).

### 5.3 Response shape (guideline)

```json
{
  "meta": {
    "from": "2026-04-01",
    "to": "2026-04-30",
    "groupBy": "week",
    "generatedAt": "2026-04-20T12:00:00.000Z",
    "filters": {}
  },
  "kpis": {
    "ticketsOpen": 0,
    "ticketsCreated": 0,
    "ticketsResolved": 0,
    "ticketsClosed": 0,
    "dutyAssignmentsTotal": 0,
    "dutyAssignmentsCompleted": 0,
    "dutyCompletionRate": null,
    "shiftReportsSubmitted": 0,
    "shiftReportAckRate": null
  },
  "series": {
    "ticketsOverTime": [],
    "dutiesOverTime": [],
    "shiftReportsOverTime": []
  },
  "tables": {
    "ticketsByStatus": [],
    "ticketsByCategory": [],
    "ticketsAgingBuckets": [],
    "dutiesByLocation": [],
    "shiftReportLinkCounts": []
  }
}
```

---

## 6. Privacy and roles

- Ticket **titles** in detail exports may identify people or assets — keep **aggregate** exports safe; row-level export **admin-only** or match ticket read permissions.
- **Assignee / requester** user ids: display as display name only when viewer has user-directory access.

---

## 7. Stakeholder decisions

| Topic | Status / note |
|-------|----------------|
| **Route guard** | **Shipped:** `admin` + `super_admin` (see §5.2). Broader roles TBD after prod feedback. |
| **Aging clock** | **Open-ticket aging buckets** use **`updatedAt`** vs “now” (see `operations-reports.service.ts`). Revisit if product wants `createdAt` or SLA start. |
| **Ack rate** | **Shipped:** `shiftReportAcknowledgmentCount / shiftReportsSubmitted` — revalidate if multiple acks per report should change the definition. |
| **Open items** | Still **out of scope** for v1 unless a durable open-items fact table feeds aggregates. |

---

## 8. Implementation status & resume after production validation

### 8.0 Current implementation snapshot (what’s done vs what’s left)

Use this table when planning the next slice of work. **Primary code:** `server/modules/reports/operations-reports.service.ts`, `operations-reports.routes.ts`, `server/shared/middleware/operationsReportsAuth.ts`, `client/src/pages/reports/OperationsReportsPage.tsx`, `client/src/components/RequireOperationsReportsAccess.tsx`.

| Area | Implemented? | Detail |
|------|----------------|--------|
| **Auth / routing** | Yes | Tenant **`admin`** + **`super_admin`** (impersonation for tenant context). Hub + sidebar + `/reports/operations` route. |
| **API query contract** | Yes | Above filters plus **`comparePriorPeriod`**. |
| **API response** | Yes (extend §5.3) | **`kpisPriorPeriod`** + optional **`meta.priorPeriod`** when compare is on. Extra KPI/series/table fields: `kpis.meanOpenTicketAgeHours`, `kpis.dutyAssignmentsOverdue`, `kpis.shiftReportsWithIssues*`, `kpis.shiftReportAcknowledgmentCount`, `series.dutiesOverTime[].completed`, `tables.ticketsByPriority`, **`tables.ticketsByAssignee`**, **`tables.dutiesByDuty`**, **`tables.dutiesByCategory`**. Update §5.3 sample when convenient. |
| **Tickets — KPIs & charts** | Yes | Open count; created / resolved / closed **in window** (resolved/closed filtered by timestamp in range); **mean** open-ticket age (hours) from **`updatedAt`**; status mix, priority mix, category table, tickets over time, aging buckets. |
| **Tickets — median age / SLA overdue** | No | Plan §4.2 mentions median and SLA-style overdue; only **mean** age is implemented; no SLA fields. |
| **Tickets — assignee workload** | Yes | **`tables.ticketsByAssignee`**: open backlog per assignee (incl. unassigned) + resolved-in-window counts (among tickets **created** in window, same rule as KPI resolved). Top 50 by open then resolved. |
| **Tickets — requester filter** | Yes | **`requesterUserIds`** on API and **Requesters** multi-select in UI. |
| **Duties — KPIs & trends** | Yes | Totals, completed, overdue, completion rate; assignments over time with completed series. |
| **Duties — by location** | Yes | `tables.dutiesByLocation` (after PostgreSQL **`GROUP BY location_id`** fix). |
| **Duties — by duty_id / catalog category** | Yes | **`tables.dutiesByDuty`** (join **`operational_duties`**) and **`tables.dutiesByCategory`**. |
| **Shift reports — metrics** | Yes | Submitted count, with-issues count/rate, ack count & rate (see §7), link counts by `linked_type`; shift reports over time. |
| **Shift reports — ack definition** | Shipped v1 | **Total acknowledgment rows** in window / **reports submitted** in window — not “% of reports with ≥1 ack” unless counts align; validate with multi-ack data (§7). |
| **Exports** | Yes | CSV: aging, ticket breakdowns, duty-by-location, **assignee workload**, **duties by duty**, **duties by category**. |
| **Print** | Yes | Parameters block + shared clinical reports print styles / body class. |
| **Saved filter presets** | Yes | Local storage (`mineaid-operations-report-views-v1`), same pattern as incidents. |
| **Prior-period KPI compare** | Yes | Query **`comparePriorPeriod`**; UI checkbox + KPI subtext + print line for prior window. |
| **`ticket_activity` analytics** | No | **R-OPS-4** optional (status transition analytics). |
| **Open-items age / aggregates** | Out of scope | §7 — needs durable facts or schema. |

**Suggested resume order:** (1) Optional **`ticket_activity`** / transition analytics. (2) Index / performance pass on hot queries. (3) Median open age / SLA-style fields if product defines them. (4) Broader roles if governance approves.

### 8.1 Delivered in 4.24.0 (verify in production)

- **API:** `GET /api/reports/operations` — filters in §4.1, **`comparePriorPeriod`**, workload / duty rollup tables (**§8.0**).
- **UI:** `OperationsReportsPage` — filters (incl. requesters), saved views, prior-period KPI compare, KPIs, charts, assignee workload + duties-by-duty/category + location tables, shift link-type counts, CSV exports, print.
- **Phases:** **R-OPS-1**–**R-OPS-3** plus the **§8.0** parity slice (assignee table, duty catalog rollups, requester UI, saved views, prior KPIs). Remaining **R-OPS-4** = mostly **`ticket_activity`** + perf.

### 8.2 Pick up here after production testing

- **R-OPS-4:** optional **`ticket_activity`** transition analytics; index/performance review on hot paths.
- **Analytics:** confirm **acknowledgment** KPI with real multi-ack patterns (§7).
- **Roles:** expand beyond **admin** only if governance approves.
- **Product:** median age / SLA overdue if fields and policy are defined.

---

## 9. Implementation phases — operations (reference)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **R-OPS-1** | Tickets KPI + status/priority/category + over time + aging buckets; CSV | **Done (4.24.0)** |
| **R-OPS-2** | Duties completion + by location; filters | **Done (4.24.0)** |
| **R-OPS-3** | Shift report + ack + link aggregates; print layout | **Done (4.24.0)** |
| **R-OPS-4** | Assignee workload views; ticket_activity transitions (optional); performance | **Next** (after prod validation) |

---

## 10. Documentation governance

- This file owns **`/reports/operations`** and `GET /api/reports/operations`.
- Shift **workflow** docs: **`docs/SHIFTOVER_IMPLEMENTATION_PLAN.md`**, **`docs/SHIFTOVER_SYSTEM_ADDENDUM.md`**.
