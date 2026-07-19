# Tenant-Scoped E-Ticketing (Staff) — Comprehensive Plan

**Version:** 1.2.0  
**Status:** **Implemented** (core product: schema, API, UI, TinyMCE, sanitization, attachments, activity, RBAC, Blob-aligned storage, requester vs admin PATCH split). SLA/email analytics remain future phases.  
**Last Updated:** April 1, 2026  
**Related docs:** [AUTH_SYSTEM.md](./AUTH_SYSTEM.md), [TENANT_SETTINGS_AND_BRANDING.md](./TENANT_SETTINGS_AND_BRANDING.md), [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md)

---

## Table of Contents

1. [Executive overview](#1-executive-overview)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Scope and ticket types](#3-scope-and-ticket-types)
4. [Architecture](#4-architecture)
5. [Data model](#5-data-model)
6. [Workflows](#6-workflows)
7. [Rich text (TinyMCE)](#7-rich-text-tinymce)
8. [Attachments and notifications](#8-attachments-and-notifications)
9. [API surface (conceptual)](#9-api-surface-conceptual)
10. [UI placement](#10-ui-placement)
11. [RBAC and security](#11-rbac-and-security)
12. [Reporting](#12-reporting)
13. [Implementation phases](#13-implementation-phases)
14. [Risks and open decisions](#14-risks-and-open-decisions)

---

## 1. Executive overview

### Purpose

Add a **tenant-scoped electronic ticketing system** for **staff** to:

- **Lodge complaints** (e.g. facilities, conduct, safety culture — scope configurable per tenant).
- **Request repairs** (e.g. broken equipment, building issues, ambulance defects).
- Optionally track **other IT/facilities** categories under the same ticket model.

Tickets are **not** patient-facing; they are **internal operations** requests. Each ticket belongs to **exactly one tenant** (`tenant_id`), consistent with the rest of MineAid HMS ([RBAC.md](./RBAC.md)).

### Business value

- **Structured intake** instead of ad-hoc email/chat; auditable history.
- **Accountability** for assignees and resolution times.
- **Separation of concerns** from clinical modules (patients, visits) while still allowing **cross-links** when a ticket references an incident or equipment (optional).

---

## 2. Goals and non-goals

### Goals

1. **Tenant isolation** – No cross-tenant ticket visibility or search.
2. **Role-based lifecycle** – Create, triage, assign, resolve, close with **least privilege**.
3. **Rich descriptions** – Reuse the project’s **TinyMCE** integration (already in use per product requirements) for the main description and **internal notes** (configurable).
4. **Auditability** – Immutable **activity log** (status changes, assignments, comments).
5. **Discoverability** – List, filter, and detail views with **SLA-friendly** timestamps (optional SLA rules in later phase).

### Implementation notes (code)

- **Migration:** `migrations/20260401_03_staff_e_ticketing.sql`
- **Drizzle:** `shared/schema.ts` (`tickets`, `ticket_categories`, `ticket_comments`, `ticket_attachments`, `ticket_activity`, `ticket_number_sequences`)
- **API:** `server/modules/tickets/tickets.routes.ts`, `tickets.controller.ts` (mounted from `server/routes/index.ts`). Attachments: `POST /api/tickets/:id/attachments` returns **`storageBackend`**: `"vercel-blob"` | `"local"`.
- **Client:** `client/src/pages/tickets/*`, `client/src/components/tickets/TicketRichTextEditor.tsx`, Operations sidebar **Staff tickets** → `/tickets`
- **Storage:** Upload category **`ticket-documents`** → tenant folder on **Vercel Blob** (`mineaidhms-blob/tenants/<tenantId>/ticket-documents/…`) with **`access: "public"`** on `put` (token/SDK requirement). Local dev uses `public/ticket-documents/` when Blob is not configured or fails.

### Non-goals (initial phase)

- **Full commercial helpdesk** for purchase disputes, invoice disputes, or clinical advice (those stay in orders / messaging / support email).
- **Full ITIL** suite (problem management, change management, CMDB) unless scoped later.
- **Real-time chat** inside tickets (threaded public comments suffice for MVP).

### Portal system issues (added Jul 2026)

Customers and suppliers can file **system-related** issues from the portal (`/portal/support`):

- APIs under `/api/portal/support-tickets` (requires platform flags `portal` + `tickets`)
- Tickets use `source = portal`, `requester_portal_user_id`, category slug `it-systems`
- Staff triage in the existing Tickets UI (Portal badge / source filter)
- Staff notified via `portal_system_issue`

---

## 3. Scope and ticket types

### Suggested categories (tenant-configurable)

| Category | Example use |
|----------|-------------|
| **Repair / maintenance** | Facility, vehicle, medical equipment |
| **Complaint / concern** | Workplace, safety, interpersonal (policy-dependent) |
| **IT / systems** | Access, software, hardware |
| **Health & safety** | Non-incident HSE suggestions (distinct from formal **Incidents** module) |

**Clarification:** Where a matter is a **regulated incident**, the product should **continue** to use the **Incidents** module; the ticketing module can offer a **link** to an incident id or **guide** the user to create an incident instead. This avoids duplicate reporting.

### Priority and severity (optional)

- **Priority:** `low`, `normal`, `high`, `urgent` (tenant defaults).
- **Severity:** optional separate field for **safety** impact.

---

## 4. Architecture

### Multi-tenant

- All tables include **`tenant_id`**.
- APIs derive tenant from **session** (same pattern as existing modules).

### Stack alignment

- **PostgreSQL + Drizzle** for schema.
- **Express** routes under a dedicated module (e.g. `server/modules/tickets/`).
- **React** pages: list, create, detail, **admin** queue for assignees.
- **Zod** validation for request bodies; **React Query** for data fetching.

---

## 5. Data model

### 5.1 Core entities

**`ticket_categories`** (optional if enums suffice initially)

- `id`, `tenant_id`, `name`, `slug`, `sort_order`, `is_active`, `created_at`, `updated_at`

**`tickets`**

- `id` (PK), `tenant_id`
- `ticket_number` — human-readable per tenant (e.g. `TKT-2026-00042`), **unique per tenant**
- `category_id` or `category` enum
- `title` — short subject (plain text)
- `description_html` — **TinyMCE** body (HTML; sanitize on save)
- `status` — e.g. `open`, `triaged`, `in_progress`, `resolved`, `closed`, `cancelled`
- `priority`
- `requester_user_id` — FK → `users` (staff who created)
- `assignee_user_id` — nullable; FK → `users`
- `location_id` — nullable FK → `care_locations` (where issue applies)
- `related_incident_id` — nullable FK — **optional** link to formal incident
- `asset_id` — nullable FK → `business_assets` (preferred); UI uses asset dropdown. Legacy free-text `asset_tag` may still be stored as a display snapshot. See [BUSINESS_ASSETS_MANAGEMENT.md](./BUSINESS_ASSETS_MANAGEMENT.md).
- ~~`related_equipment_id` or free-text **asset tag**~~ — superseded by `asset_id`
- `resolved_at`, `closed_at`
- `created_at`, `updated_at`, `created_by`, `updated_by`

**`ticket_comments`**

- `id`, `tenant_id`, `ticket_id`
- `author_user_id`
- `body_html` or `body_text` — prefer HTML if TinyMCE used for comments too
- `is_internal` — boolean (visible only to assignees/admin)
- `created_at`

**`ticket_attachments`** (or reuse global file upload pattern)

- `id`, `tenant_id`, `ticket_id`
- `file_key` / `url` / `mime` / `size` — align with existing [file upload system](./FILE_UPLOAD_SYSTEM_SUMMARY.md) patterns
- `uploaded_by`, `created_at`

**`ticket_activity`** (audit trail)

- `id`, `tenant_id`, `ticket_id`
- `actor_user_id`
- `action` — e.g. `created`, `status_changed`, `assigned`, `commented`, `attachment_added`
- `metadata` — JSON (old/new status, assignee ids)
- `created_at`

### 5.2 Indexing

- `(tenant_id, status, updated_at)` for queues.
- `(tenant_id, requester_user_id)` for “my tickets”.
- `(tenant_id, assignee_user_id)` for “assigned to me”.

---

## 6. Workflows

### 6.1 Create ticket

1. Staff opens **New ticket**.
2. Enters title, category, priority, optional location (dropdown of tenant care locations).
3. Fills **description** in **TinyMCE**.
4. Submits → `tickets` row + `ticket_activity` (`created`).
5. After create, staff may attach **multiple files** on the same flow (detail redirect); uploads use the attachments API above.

### 6.2 Triage and assign

1. **Admin** or **designated role** views queue, **assigns** assignee.
2. Status moves `open` → `triaged` or directly `in_progress`.
3. Activity log records assignment.

### 6.3 Resolve and close

1. Assignee documents resolution (comment + optional attachment).
2. Status → `resolved` → requester may **confirm** or auto-close after N days (optional).
3. `closed` terminal state; **reopen** allowed only for specific roles (optional).

### 6.4 Escalation (phase 2)

- Escalate priority, notify manager role, or **SLA breach** flag.

---

## 7. Rich text (TinyMCE)

### Requirements

- **Sanitize HTML** on server save (allowlist tags/attributes) to prevent XSS.
- **Store** sanitized HTML in `description_html` / `body_html`.
- **Render** with existing typography styles (e.g. Tailwind prose) if used elsewhere.

### Reuse

- Centralize a **TinyMCE wrapper component** (or existing one) so ticket forms and comments share one configuration (toolbar, height, paste behavior).

---

## 8. Attachments and notifications

### Attachments

- Reuse **tenant-scoped** upload URLs and **size/type limits** consistent with other modules (images, PDF, Word).
- **Vercel Blob:** objects are stored per tenant under **`ticket-documents`** with **public** read access at the blob URL (required for successful `put` with the current integration).
- **Local fallback:** if Blob upload fails, the server may persist under `public/ticket-documents/`; the API reports **`storageBackend: "local"`** so the client can warn the operator.
- Virus scanning policy if the platform adds it globally.

### Notifications (optional phases)

- Email (e.g. Resend) on: assign, comment, status change — **tenant-configurable** toggles in [TENANT_SETTINGS_AND_BRANDING.md](./TENANT_SETTINGS_AND_BRANDING.md) or a small `tenant_notification_settings` extension.

---

## 9. API surface (conceptual)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tickets` | List with filters (status, assignee, requester, category, date range). |
| POST | `/api/tickets` | Create ticket. |
| GET | `/api/tickets/:id` | Detail + comments + activity (with permission checks). |
| PATCH | `/api/tickets/:id` | **Split by role:** requester updates **content** (title, description HTML, location, incident/asset links) when not closed/cancelled; **admin** updates **triage** (assignee, category, status, priority). One request must not mix both groups. |
| POST | `/api/tickets/:id/comments` | Add comment. |
| POST | `/api/tickets/:id/attachments` | Upload attachment. |
| GET | `/api/ticket-categories` | List categories for tenant. |

---

## 10. UI placement

### Options (choose one in implementation)

| Option | Pros | Cons |
|--------|------|------|
| **Operations** group | Aligns with repairs, facilities | May bury “complaints” |
| **Standalone** top-level “Support & tickets” | Clear visibility | More sidebar noise |
| **Admin** sub-area | Good for admins | Hides from staff |

**Recommendation:** **Operations** group for **repair**-heavy workflows, plus **global “My tickets”** entry in dashboard or user menu for all roles.

### Key pages

- `/tickets` — list (tabs: My requests, Assigned to me, All [role gated])
- `/tickets/new`
- `/tickets/:id`

---

## 11. RBAC and security

### Principles ([RBAC.md](./RBAC.md))

- **Tenant isolation** on every query.
- **Staff-only** — authenticated users with `tenantId` (exclude `super_admin` from normal tenant queues unless impersonating/support mode is explicitly designed).

### Suggested permissions

| Action | medical_staff | safety_officer | admin |
|--------|---------------|----------------|-------|
| Create ticket | Yes | Yes | Yes |
| View own tickets | Yes | Yes | Yes |
| View all tenant tickets | No* | No* | Yes |
| Edit **own** ticket **title / description / links** (request fields) | Yes | Yes | Yes |
| Assign / triage | No* | No* | Yes |
| Internal comments | Assignee only | Assignee only | Yes |

\*Configurable: **facility manager** role could be added later.

**Note:** For tickets **raised by someone else**, **admins** use **triage** `PATCH` only (assignee, category, status, priority). They do **not** overwrite another user’s title/description/links; only that **requester** may edit those fields (while the ticket is open for edits).

### Data protection

- **Complaints** may contain **sensitive** personal information — restrict **export** and **search** to roles that need it; consider **redaction** for unrelated viewers.
- **Audit** who accessed ticket detail (optional phase 2).

---

## 12. Reporting

- Volume by category, status, **mean time to resolve** (MTTR).
- **Per location** breakdown (if `location_id` populated).
- Export CSV for admin (tenant-scoped).

---

## 13. Implementation phases

| Phase | Deliverables |
|-------|----------------|
| **MVP** | Schema, CRUD, list/detail, TinyMCE description, **comments**, status workflow, tenant admin queue |
| **MVP+ (shipped)** | **Attachments** (detail + post-create multi-file), **categories admin UI**, **internal comments**, **incident/equipment links**, requester vs admin **PATCH** rules, Blob **`ticket-documents`** + `storageBackend` |
| **Phase 2** | Email notifications for ticket events |
| **Phase 3** | SLA, analytics dashboard |

---

## 14. Risks and open decisions

### Risks

- **Overlap with Incidents** — mitigate with UX copy and optional linking.
- **HTML injection** — mitigate with strict sanitization.
- **Abuse** — rate limiting on create; optional approval workflow for anonymous categories (not applicable if staff-only).

### Open decisions

1. Should **safety officers** see **all** tickets or only **HSE-related** categories?
2. **Anonymous** reporting to HR — typically **not** supported in a logged-in-only system; if required, separate **anonymous** flow with careful policy.
3. **Ticket numbering** format per tenant branding.

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| 1.0.0 | 2026-04-01 | Initial planning document |
| 1.1.0 | 2026-04-01 | Marked implemented; added code pointers (migration, API, client) |
| 1.2.0 | 2026-04-01 | Blob `ticket-documents` + public `put`; `storageBackend`; requester content vs admin triage PATCH; new-ticket attachments; phase table refresh |
