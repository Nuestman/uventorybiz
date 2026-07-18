# MineAid Compliance & Audit Reports (`/reports/compliance`)

**Route:** `/reports/compliance` (live in **4.25.0**)  
**API:** `GET /api/reports/compliance` (live in **4.25.0**)  
**Status:** **Implemented baseline** — tenant-level **governance** visibility (audit trails, documentation posture, acknowledgments). **Not** a full GRC platform.  
**Last updated:** April 21, 2026

Parent module plan: **`docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`**.

---

## 1. Relationship to the broader reports module

Compliance reporting supports: *Can we demonstrate control activity, documentation health, and review cycles for this tenant?*

**Existing related APIs (reference only):**

- **`GET /api/audit-logs`** — tenant audit stream (authenticated user).
- **`GET /api/admin/audit-logs`** — **admin** audit views per **`docs/RBAC.md`**.
- Super-admin **`GET /api/super-admin/global-audit-logs`** — **cross-tenant**; **must not** power tenant `/reports/compliance` directly.

This hub **aggregates** and **summarizes**; raw log scrolling remains in admin/super-admin tools where appropriate.

---

## 2. Product scope

### 2.1 Goals

- **Audit activity:** counts of `audit_logs` by `action`, `resource_type`, day/week/month; top actors (user display); optional “high-risk” actions list (configurable mapping: `delete`, `login` failures, etc.).
- **Documentation / SOP posture:** counts from **`tenant_sop_documents`** / **`tenant_sop_versions`** — e.g. published vs pending approval, versions aging without review (product-defined).
- **Legal / signed documents:** high-level counts from **`tenant_signed_legal_documents`** (if present) — uploads in window, expiring soon (if metadata supports).
- **Shift handover compliance signals:** acknowledgment gaps (same KPI as operations/overview but framed for audits) — **optional** widget to avoid three copies of logic; prefer **shared service function**.
- **Exports:** CSV summaries for auditors; **no** bulk `original_data` JSON in default export (too sensitive).

### 2.2 Non-goals (v1 compliance hub)

- **Not** replacing **`/api/audit-logs`** detail screens.
- **Not** immutable legal hold / WORM storage.
- **Not** patient chart access or clinical PHI in compliance aggregates.

### 2.3 Primary audiences

| Audience | Typical use |
|----------|-------------|
| Compliance / quality lead | periodic control evidence |
| Tenant admin | audit readiness before external audit |
| Leadership | exception summaries |

---

## 3. Data sources (schema alignment)

| Table | Reporting use |
|-------|---------------|
| **`audit_logs`** | `action`, `resource_type`, `resource_id`, `user_id`, `created_at`, `tenant_id` — **aggregate**; avoid returning `original_data` in report API |
| **`tenant_sop_documents`**, **`tenant_sop_versions`** | Workflow status (`draft`, `pending_approval`, `published`, …), version counts |
| **`tenant_signed_legal_documents`** | Upload / signature timestamps (per schema) |
| **`shift_reports`**, **`shift_report_acknowledgments`** | Ack coverage for compliance narrative (shared KPI helper) |

**Performance:** time-range scans on `audit_logs` may need **`(tenant_id, created_at)`** index verification at scale.

---

## 4. Information architecture

### 4.0 Operator guide

Collapsible **How to use this page** (**closed by default**); hidden from print.

### 4.1 Filters

| Param | Purpose |
|-------|---------|
| `from`, `to` | Required on `audit_logs.created_at` and other time-based widgets |
| `locationIds[]` | Where applicable (e.g. shift reports); audit logs may be **tenant-wide** unless `details` encodes location (defer) |
| `groupBy` | `day` \| `week` \| `month` for audit volume series |
| `auditActions[]`, `auditResourceTypes[]` | Narrow audit aggregates |

### 4.2 Page layout (recommended)

- KPI row: total audit events, unique active users (optional), deletes count, failed auth count (if logged in audit)
- Audit volume over time (line chart)
- Breakdown tables: by `resource_type`, by `action`
- SOP workflow snapshot: versions by status
- Signed legal snapshot (if enabled)
- **Exceptions** list (configurable rules): e.g. more than 100 delete actions in a week — **admin-only** notification surface

### 4.3 Exports

- CSV: audit summary tables, SOP status table
- Print: parameter summary + charts

---

## 5. API design — compliance

### 5.1 Endpoint

- `GET /api/reports/compliance` (implemented in 4.25.0)

### 5.2 Auth

- **Minimum:** **`requireAdmin`** or **`compliance_reports`** role (**define**).
- **Staff:** typically **no access** to compliance hub in v1.

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
    "auditEventsTotal": 0,
    "auditDeleteActions": 0,
    "sopVersionsPendingApproval": 0,
    "sopVersionsPublished": 0
  },
  "series": {
    "auditEventsOverTime": []
  },
  "tables": {
    "auditByResourceType": [],
    "auditByAction": [],
    "sopVersionStatusMix": []
  },
  "shiftHandoverAckSummary": null
}
```

---

## 6. Privacy, retention, and legal

- **Audit payloads:** treat `original_data` as **highly sensitive**; keep off aggregate endpoint.
- **Retention:** align with tenant policy and DB retention jobs (future); document in runbooks.
- **Impersonation:** audit rows may reference impersonator in `details` — compliance UI should surface impersonation consistently with **`docs/IMPERSONATION.md`**.

---

## 7. Stakeholder decisions (post-baseline / follow-up)

| Topic | Decision needed |
|-------|-----------------|
| **Who may access** | **Current:** admin + super_admin (impersonation). Decide if dedicated compliance role is needed. |
| **Exception rules** | **Current baseline:** delete-rate and failed-auth-rate warnings. Confirm configurable rule model. |
| **SOP metrics** | Which states count as “compliant” for leadership green/red. |
| **Cross-border** | Whether super-admin global audit is ever summarized for a tenant (likely **never**). |

---

## 8. Implementation phases — compliance

| Phase | Deliverable |
|-------|-------------|
| **R-COMP-1** | ✅ Audit aggregates + time series + breakdown tables; admin gate; CSV |
| **R-COMP-2** | ✅ SOP workflow snapshot + signed legal upload snapshot |
| **R-COMP-3** | ✅ Shared shift ack summary; print layout |
| **R-COMP-4** | 🔄 Configurable exception rules; performance hardening (index baseline shipped: `audit_logs (tenant_id, created_at)`) |

---

## 9. Documentation governance

- This file owns **`/reports/compliance`** contract.
- RBAC: **`docs/RBAC.md`**; impersonation: **`docs/IMPERSONATION.md`**.
