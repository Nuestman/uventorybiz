# ShiftOver — Comprehensive Implementation Plan

**Product name (marketing):** ShiftOver  
**Engineering / URL prefix:** `shiftover` (e.g. `/shiftover`, `/shiftover/shift-report`)  
**Status:** Active implementation + tracking document  
**Baseline today:** Production-grade ShiftOver is in place; this plan tracks shipped scope and deferred items (see §10)  
**Last updated:** April 2026  

---

## 1. Purpose and scope

### 1.1 What ShiftOver is

ShiftOver is MineAid’s **continuity and accountability** module for site-based operations: ensuring that work, risk, and open items are **explicitly transferred** across shift boundaries (day/night, roster changes, location coverage gaps).

It is **not** the same as MineAid’s future **comprehensive reporting** product area (`/reports`), which will aggregate analytics across clinical, operational, inventory, and compliance domains.

### 1.2 Naming and copy rules

| Context | Use |
|---------|-----|
| Marketing, module title, landing hub | **ShiftOver** (capital O) |
| Sidebar group label | **ShiftOver** |
| Day-to-day workflows, forms, buttons, table headers | **Shift report**, **handover**, **duty**, etc. — plain operational language |
| URL path segment | Lowercase `shiftover` |

Avoid rebranding every button or form label as “Shiftover”; reserve the product name for module positioning and hub copy.

### 1.3 Relationship to shift reports (baseline)

The existing **shift report** feature remains the **first-class artifact** inside ShiftOver until expanded capabilities ship:

- **Route:** `/shiftover/shift-report`
- **API:** `GET/POST/PUT/DELETE /api/shift-reports` (unchanged unless this plan introduces extensions)
- **Data:** `shift_reports` table (unchanged unless extended)

New ShiftOver capabilities should **compose around** shift reports (linking, acknowledgment, structured handover sections) rather than replacing them abruptly.

---

## 2. Information architecture

### 2.1 Route map (target)

| Route | Purpose | Phase |
|-------|---------|--------|
| `/shiftover` | Hub: explains ShiftOver; entry points to tools | **Shipped (minimal hub)** |
| `/shiftover/shift-report` | Current shift report list + CRUD + filters | **Baseline (shipped)** |
| `/shiftover/handover` *(planned)* | Structured handover session / checklist (future) | Later |
| `/shiftover/open-items` *(planned)* | Cross-shift task / risk register view | Later |
| `/reports` | MineAid comprehensive reporting (separate initiative) | Separate |

Deep links from notifications or email should prefer stable paths such as `/shiftover/shift-report?highlight=<id>`.

### 2.2 Sidebar

A dedicated **ShiftOver** group (not nested under Operations) containing:

- **Overview** → `/shiftover`
- **Shift reports** → `/shiftover/shift-report`

As features are added, new items appear here (e.g. **Handover checklist**, **Open items**) without renaming operational labels.

---

## 3. Vision: expanded ShiftOver capabilities

The following capabilities are **planned**; priority and phasing are suggestions and should be validated with operations stakeholders.

### 3.1 Structured handover (beyond free-text)

**Goal:** Improve handover quality with optional **structured sections** while keeping shift reports usable for quick narrative entry.

**Ideas:**

- Optional template: “Completed”, “In progress”, “Blocked”, “Risks / watch”, “For next shift”
- Either **additional columns** on `shift_reports`, a **JSON `handoverPayload`** field, or a child table `shift_handover_sections` keyed by `shift_report_id`
- UI: wizard or accordion on submit; still one primary “shift report” submit flow or a separate “Structured handover” flow at `/shiftover/handover` that **creates or updates** a linked shift report

### 3.2 Read receipt / acknowledgment

**Goal:** Evidence that incoming staff **saw** the handover for a location/shift.

**Ideas:**

- Table `shift_report_acknowledgments` (`shift_report_id`, `user_id`, `acknowledged_at`, `tenant_id`)
- UI: “Acknowledge” on detail view; filter “Unacknowledged for my location”
- Optional rule: cannot start certain duties until latest handover acknowledged (future integration with operational duties)

### 3.3 Open items and linkage

**Goal:** Track items that **span** shifts (equipment fault, follow-up patient flag, pending ticket).

**Ideas:**

- Link shift reports to **Staff tickets** (`/tickets`), **incidents**, or **operational duties**
- `shift_report_links` polymorphic table or explicit FKs per entity type
- “Carried forward” badge when an open item appears in a new shift report

### 3.4 Attachments and evidence

**Goal:** Photos or files for facility issues, inventory counts, or incident context.

**Ideas:**

- Reuse existing file upload patterns (see project file upload docs)
- `shift_report_attachments` with storage key, uploader, created_at

### 3.5 Notifications

**Goal:** Proactive nudge before shift end or when a new handover is published.

**Ideas:**

- In-app notification + optional email (tenant-configurable)
- Events: `shift_report.created`, `shift_report.updated`, `handover.acknowledged`

### 3.6 Permissions and roles

**Goal:** Default remains “tenant staff can create/list”; tighten if needed.

**Ideas:**

- Location-scoped create vs. read-only for some roles
- “Handover supervisor” role to edit others’ reports (audit-heavy)
- Align with existing RBAC patterns (`RequireRole`, server middleware)

### 3.7 Audit and compliance

**Goal:** Defensible history for regulators and internal review.

**Ideas:**

- Immutable log of edits (or store `previous_version` JSON on update)
- Integrate with existing audit trail patterns if present server-side

### 3.8 Analytics inside ShiftOver vs. `/reports`

**Goal:** Keep ShiftOver **operational** (lists, filters, acknowledgments); push cross-module KPIs to `/reports`.

**ShiftOver-appropriate metrics:**

- Handover completion rate by location/shift
- Time-to-acknowledge
- Open item aging

**Mine-wide reporting (`/reports`):**

- Trending incidents, visits, inventory — **out of scope** for this module’s core UI

---

## 4. Phased delivery roadmap

### Phase A — Baseline (current)

- Hub at `/shiftover` with link to shift reports
- Full shift report experience at `/shiftover/shift-report`
- Sidebar **ShiftOver** module
- `/reports` reserved for comprehensive reporting

### Phase B — Hub polish

- Cards for each tool
- “What’s new” / release notes snippet
- Quick stats: “Last handover at this location”, “Pending acknowledgments”

### Phase C — Acknowledgments

- Schema + API + UI for acknowledge / list acknowledgments
- Optional badge on shift report list rows

### Phase D — Structured handover (MVP)

- Minimal extra fields or one JSON payload; backward compatible with existing rows
- Dedicated route or tab **without** renaming shift report buttons

### Phase E — Linking and open items

- Link to tickets/incidents; open items rollup view

### Phase F — Attachments and notifications

- Files + notification hooks

---

## 5. Technical considerations

### 5.1 Frontend

- **Routing:** Wouter `Switch` — register **`/shiftover/shift-report` before `/shiftover`** so the more specific path matches.
- **Layout:** Optional future `ShiftoverLayout` wrapper with sub-nav tabs; not required for Phase A.
- **State:** Continue React Query keys anchored on `/api/shift-reports`.

### 5.2 Backend

- Maintain **backward compatible** APIs for existing mobile or integrations.
- Version new endpoints if breaking changes become necessary (e.g. `/api/shift-reports/v2/...`).

### 5.3 Data migration

- Any new columns on `shift_reports` should be **nullable** with sensible defaults for legacy rows
- Prefer additive migrations; avoid destructive renames without a migration playbook

### 5.4 Testing

- E2E: hub loads, navigate to shift report, create minimal report (if test env supports auth + location)
- Contract tests for new acknowledgment endpoints when added

---

## 6. Non-goals (for this module)

- Replacing the entire **Testing** reports area (`/testing/reports`)
- Building the full **comprehensive `/reports`** product inside ShiftOver
- Real-time collaborative editing (Google Docs style) unless explicitly prioritized later

---

## 7. Documentation map

| Document | Role |
|----------|------|
| `docs/SHIFT_REPORTING_FEATURE_PLAN.md` | Baseline shift report feature (forms, filters, API, schema) |
| `docs/SHIFTOVER_SYSTEM_ADDENDUM.md` | Short bridge: marketing vs UI naming, route split from `/reports` |
| **This file** | Full ShiftOver product/technical roadmap |

---

## 8. Open questions

1. Should **one location** allow **multiple** shift reports per date+shift (current behavior) or enforce uniqueness?
2. Are **night shifts** that cross calendar midnight modeled as report date = start date, end date, or both?
3. Which roles **must** acknowledge handovers (incoming only vs. charge nurse)?
4. Do we need **offline** capture for sync later (align with existing sync client patterns)?

---

## 9. Implementation checklist (execution tracking)

- [x] Confirm Phase B–F priority with stakeholders (**confirmed**)
- [x] Add acknowledgment schema + migration (Phase C)
- [x] API routes + storage methods + validation (Phase C–F scope)
- [x] UI: hub widgets; shift report deep links
- [x] RBAC implementation in controller/routes (author/admin/super_admin management paths)
- [x] Update user-facing docs / reference materials (ShiftOver vs shift report language)
- [ ] Changelog entry for user-visible ShiftOver changes (release process dependent)

---

## 10. Implementation status (tracking appendix)

*This section is additive only: it does not change the phased roadmap above (§4). Update it as features ship or scope changes. Older tables in §2 may still label routes as “planned” even after they ship — use this appendix as the live checklist.*

### 10.1 Shipped (production-oriented baseline)

| Area | Notes |
|------|--------|
| **Routes** | `/shiftover` hub, `/shiftover/shift-report`, `/shiftover/open-items`; `/reports` reserved |
| **Sidebar** | ShiftOver group: Overview, Shift reports, Open items |
| **Shift reports API** | CRUD on `/api/shift-reports`; list supports filters + `enrich` (acks); `GET ...?detail=1` returns acknowledgments, links, attachments, revision history |
| **Structured handover** | `handoverStructured` JSON on `shift_reports`; optional sections in form |
| **Acknowledgments** | Schema, API, list/detail UI, “awaiting my acknowledgment” filter |
| **Linked records** | `shift_report_links`; add/remove API; UI on report **View** and **Edit** (after save); feeds **Open handover items**; **`ShiftReportLinkPicker`** searches tickets / incidents / duty assignments (no manual UUID) |
| **Attachments** | `shift_report_attachments`; upload/remove on report detail |
| **Revision history** | Snapshot on edit (author/admin) |
| **ShiftOver hub API** | `GET /api/shiftover/summary` (last report, pending acks count, open linked count) |
| **Phase B hub polish** | Tool cards, quick stats, and “What’s new” snippet on `/shiftover` |
| **Open items API** | `GET /api/shiftover/open-items` (90-day window, location scope, open-status rules) |
| **Notifications** | Types and triggers for publish / acknowledgment (see migration + `notificationTriggers`) |

### 10.2 Not shipped / deferred (relative to vision §3)

| Item | Notes |
|------|--------|
| **`/shiftover/handover`** | Dedicated structured handover session route (optional future) |
| **Auto-linking** | No automatic attachment of tickets/incidents/duties to shift reports |
| **“Carried forward” badge** | Not implemented on list rows |

### 10.3 Reference for link / open-items behavior

See **`docs/SHIFTOVER_SYSTEM_ADDENDUM.md` §6** (Linked records and Open handover items).
