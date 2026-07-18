# Shiftover System Addendum

**Feature Name:** Shiftover (marketing name for Shift Handover System)  
**Parent Plan:** `docs/SHIFT_REPORTING_FEATURE_PLAN.md`  
**Status:** Active addendum  
**Last Updated:** April 2026

---

## 1. Why This Addendum Exists

The original shift reporting plan scoped shift handover functionality under `/reports`.  
MineAid now reserves `/reports` for a broader, cross-module comprehensive reporting suite.

This addendum formally separates concerns:

- **`/shiftover`** = operational shift handover workflow (existing shift reports enhanced as shiftover)
- **`/reports`** = upcoming comprehensive reporting workspace (analytics, KPI rollups, exports, executive reporting)

---

## 2. Route and Navigation Reassignment

The current shift reporting page is reassigned as follows:

- Main route moved from **`/reports`** to **`/shiftover`**
- Operations sidebar item renamed from **Reports** to **Shiftover**
- Route protection now includes **`/shiftover`**
- `/reports` is no longer used by the shift handover feature

This prevents naming collision and keeps future reporting architecture clean.

---

## 3. Feature Positioning Update

Shiftover should be positioned as a **continuity and accountability tool**, not just a static end-of-shift report form.

Core value pillars:

- **Continuity:** ensures incoming staff receive context
- **Traceability:** captures what happened, what changed, and what remains open
- **Operational readiness:** links completed duties and known issues into a single handover artifact
- **Risk reduction:** decreases dropped tasks between day/night transitions

---

## 4. Functional Enhancements to Track

These enhancements augment the original plan and should be tracked with implementation tasks:

1. **Terminology standardization**
   - UI copy, labels, and help text should use "Shiftover" for feature naming.
   - Data model/table naming can remain `shift_reports` for backward compatibility.

2. **Handover-first UX language**
   - Primary CTA and headings should reinforce handover intent (for example: "New shiftover", "Shiftover details").

3. **Continuity detail structure (future-friendly)**
   - Encourage content sections that map to handover quality:
     - completed work
     - unresolved issues
     - risks/watch items
     - actions for next shift

4. **Comprehensive reports readiness**
   - Keep `/reports` free so future reporting routes can evolve without migration churn:
     - `/reports/overview`
     - `/reports/operations`
     - `/reports/clinical`
     - `/reports/compliance`
     - `/reports/custom`
   - Reference plan: `docs/REPORTS_COMPREHENSIVE_MODULE_PLAN.md`

---

## 5. Documentation Governance

Use both docs together:

- **`docs/SHIFT_REPORTING_FEATURE_PLAN.md`** remains the implementation baseline.
- **This addendum** records route reassignment, naming strategy, and product positioning changes.

When updating shiftover behavior, update both:

- technical implementation steps in the parent plan
- strategy/naming/routing intent in this addendum

---

## 6. Linked records and the Open handover items register (reference)

This section describes how **handover links** relate to shift reports and what the **Open handover items** screen actually shows. It is the operational reference for staff and implementers.

### 6.1 What a “linked record” is

A **link** is an explicit row associating a **shift report** with exactly one of:

- a **staff ticket**
- an **incident** (incident report)
- an **operational duty assignment**

Links are **not** inferred from “everything open at the site.” They are stored in **`shift_report_links`** and must be **added by a user** (author or permitted role) on a saved report. The product does **not** auto-attach tickets, incidents, or duties today.

### 6.2 Where links are managed in the product

Links are managed from the **shift report** workflow (under **Shift reports** at `/shiftover/shift-report`): use **View** or **Edit** on a report, then the **Linked records** section. **New** reports must be **submitted first** (so the report has an id); then open **View** or **Edit** to add links.

Staff choose the link **type** (ticket, incident, or duty assignment), then use **Search** to open a filterable list loaded from the same APIs as the rest of the app (tickets list, incident reports list, duty assignments near the report date). No manual UUID entry is required.

### 6.3 What “Open handover items” shows

The page at **`/shiftover/open-items`** calls **`GET /api/shiftover/open-items`**, optionally scoped by the **active location** in the header (same pattern as the ShiftOver hub summary).

The server:

1. Loads links joined to their **shift reports** for the tenant.
2. Keeps only reports whose **report date** falls within a **rolling window** (default **90 days**).
3. If **`locationId`** is supplied, keeps only reports for that **care location** (the location on the **shift report**, not inferred from the linked entity).
4. Resolves each link against the live **tickets**, **incident_reports**, or **operational_duty_assignments** table.
5. Keeps rows only if the linked entity is still considered **open** under simple status rules (for example: tickets not resolved/closed/cancelled; incidents not closed; duties not completed/cancelled). Exact status strings are defined in server logic.
6. Skips links if the linked row **cannot be found** (bad id, wrong tenant, deleted record).

**Important:** The register is **not** a global “all open tickets” list. If nothing is linked on recent reports for that location, the page correctly shows **no rows** even when other modules have many open items.

### 6.4 Relationship to the ShiftOver hub

Hub cards such as **open linked items count** use the **same** open-items logic as `/shiftover/open-items` when a location filter is applied.

### 6.5 Documentation map for this behavior

- **Roadmap and phases:** `docs/SHIFTOVER_IMPLEMENTATION_PLAN.md` (see **Implementation status** appendix for what is shipped).
- **Shift report feature baseline:** `docs/SHIFT_REPORTING_FEATURE_PLAN.md`.

---

# ShiftOver System — Addendum (naming & routes)

**Marketing name:** ShiftOver (continuity & accountability module)  
**Related plans:**  
- `docs/SHIFT_REPORTING_FEATURE_PLAN.md` — shift **report** baseline (forms, API, data)  
- `docs/SHIFTOVER_IMPLEMENTATION_PLAN.md` — full ShiftOver roadmap  

**Last updated:** April 2026  

---

## 1. Why ShiftOver is separate from `/reports`

MineAid reserves **`/reports`** for a future **comprehensive reporting** workspace (cross-module analytics, exports, executive views).

**ShiftOver** lives under **`/shiftover`** and focuses on **operational continuity** at shift change — starting with **shift reports**, with room to add handover tools, acknowledgments, and linked open items without colliding with global reporting.

---

## 2. Naming: marketing vs. product UI

| Use | Wording |
|-----|---------|
| Module title, hub headline, sales/marketing | **ShiftOver** |
| Buttons, modals, form labels, list titles | **Shift report**, **handover** (operational terms) — **not** “Shiftover” on every control |

“Shiftover” as a casual lowercase term may appear in **internal** docs or URLs only (`/shiftover`).

---

## 3. Current routes and navigation

| Path | Behavior |
|------|----------|
| `/shiftover` | **ShiftOver hub** — introduces the module; links into tools |
| `/shiftover/shift-report` | **Shift reports** — list, filters, CRUD |
| `/shiftover/open-items` | **Open handover items** — linked records still open (see §6) |
| `/reports` | Reserved; **not** used by ShiftOver |

**Sidebar:** Dedicated **ShiftOver** group with **Overview**, **Shift reports**, and **Open items** entries.

---

## 4. Baseline vs. future

- **Today:** Shift reports live under ShiftOver routes; **structured handover**, **acknowledgments**, **linked records**, **attachments**, and the **open items** register are implemented (see `docs/SHIFTOVER_IMPLEMENTATION_PLAN.md` §10 and this addendum §6).
- **Future:** Optional **`/shiftover/handover`** checklist flow, link search/pickers, auto-linking, and other items called out in the plan’s **Implementation status** appendix.

---

## 5. Governance

When changing ShiftOver behavior:

1. Update **`SHIFTOVER_IMPLEMENTATION_PLAN.md`** for roadmap and phases.  
2. Update **`SHIFT_REPORTING_FEATURE_PLAN.md`** when the **shift report** artifact, API, or schema changes.  
3. Keep this addendum **short** — it only records naming rules and route intent.
