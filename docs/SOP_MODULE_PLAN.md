# SOP module — product plan

**Implementation (schema, API, migrations, editor):** [SOP_MODULE_IMPLEMENTATION.md](./SOP_MODULE_IMPLEMENTATION.md)

## Purpose

Give each **tenant** a place to own **standard operating procedures (SOPs)** that are:

- Authored in rich text (TinyMCE) and/or attached as files (PDF, Word, images).
- **Versioned** with a clear lifecycle: draft → pending approval → published (or rejected).
- **Readable** by all authenticated staff on the tenant via a dedicated **SOP Library** under Resources.

## Personas and permissions

| Persona | Experience |
|--------|------------|
| **Tenant admin** | Full lifecycle on the standalone **SOP administration** page (`/admin/sops`, same full-screen pattern as Docs): create documents, edit metadata and drafts with forms, TinyMCE, attachments, submit, approve/reject, archive. Also linked from **Administration → SOP administration** in the sidebar. |
| **Other tenant users** (medical staff, safety, EMT, etc.) | Read-only **SOP Library** at `/sop`: browse published SOPs, read HTML body, open/download attachments. |
| **Super admin (no tenant)** | No SOP data; module is tenant-scoped. |

## User journeys

1. **Author**  
   Admin creates an SOP document → receives **version 1** in **draft** → writes content in TinyMCE and/or uploads a file → **Save draft** → **Submit for approval**.

2. **Approver**  
   Another admin (same role gate today: tenant admin) opens the pending version → reviews HTML preview → **Approve & publish** or **Reject** with a reason.

3. **Reader**  
   Any tenant user opens **Resources → SOP Library** → selects an SOP → reads sanitized HTML and opens the attachment link if present.

## Scope (current release)

- Single approval lane (no separate “SOP editor” role).
- One active **draft or pending** version per document at a time; new work starts after publish/reject via **new draft version**.
- **Archive** hides the document from the library without deleting history.

## Out of scope / future

- Email notifications on submit/approve/reject.
- Multi-step approval chains or non-admin authors with restricted publish rights.
- Full-text search across SOP bodies (only title filter in UI today).
- E-signatures and regulated Part 11-style controls.
- Patient portal exposure (staff app only).

## Success criteria

- Tenants can publish at least one SOP and all tenant users can read it.
- HTML is **sanitized server-side** before storage and when serving the library.
- Attachments are stored with **tenant-scoped paths** (private disk layout locally; Blob URL when configured).

## Sample data

After applying migrations, `20260403_03_seed_tenant_sops.sql` adds **per tenant** (idempotent): two **published** procedures (heat stress; incident reporting) and one **draft** clinical triage template. Codes are prefixed with `MAID-SEED-` so you can find or replace them in the admin UI.

## Related documentation

- [SOP_MODULE_IMPLEMENTATION.md](./SOP_MODULE_IMPLEMENTATION.md) — schema, API, and code map.
