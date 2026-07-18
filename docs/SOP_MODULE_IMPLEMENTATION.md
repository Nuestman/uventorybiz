# SOP module — implementation reference

## Database

**Migrations:** `migrations/20260403_02_tenant_sop_module.sql` (schema), `migrations/20260403_03_seed_tenant_sops.sql` (idempotent sample content per tenant).

**Tables**

- `tenant_sop_documents` — logical SOP (title, optional code/department, `is_archived`, tenant FK).
- `tenant_sop_versions` — immutable-feeling revisions (`version_number`, `status`, `content_html`, optional attachment metadata, approval/rejection timestamps).

**Enum:** `tenant_sop_version_status` — `draft` | `pending_approval` | `published` | `archived` | `rejected`.

**Constraints**

- `UNIQUE (document_id, version_number)`.

**Drizzle:** `shared/schema.ts` — `tenantSopDocuments`, `tenantSopVersions`, `tenantSopVersionStatusEnum`.

## Storage layer

`server/storage.ts` — `DatabaseStorage` methods (see `IStorage`):

- Library: `listTenantSopPublishedLibrary`, `getTenantSopPublishedForReader`.
- Admin: `listTenantSopDocumentsAdmin`, `getTenantSopDocumentWithVersions`, `createTenantSopDocument`, `createTenantSopDraftVersion`, `updateTenantSopDraftVersion`, attachment set/clear, submit/approve/reject, delete draft, archive document.

**Publish rule:** approving a pending version sets any existing **published** row for that document to **archived**, then marks the target row **published**.

## HTTP API

Router: `server/modules/sop/sop.routes.ts`, mounted under `/api` in `server/routes/index.ts`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sops/library` | Tenant session | Published SOP index for the tenant. |
| GET | `/api/sops/library/:documentId` | Tenant session | Published detail (sanitized `contentHtml`). |
| GET | `/api/sops/admin/documents` | Admin | List documents + latest version summary. |
| GET | `/api/sops/admin/documents/:documentId` | Admin | Document + all versions (raw admin `contentHtml`). |
| POST | `/api/sops/admin/documents` | Admin | Create document + v1 draft. |
| PATCH | `/api/sops/admin/documents/:documentId` | Admin | Partial `{ title?, code?, department?, isArchived? }` (at least one field). Returns `{ document }`. |
| POST | `/api/sops/admin/documents/:documentId/versions` | Admin | New draft (blocked if draft/pending exists). |
| PATCH | `/api/sops/admin/versions/:versionId` | Admin | Update **draft** only. |
| POST | `/api/sops/admin/versions/:versionId/submit` | Admin | Draft → pending (requires non-empty text or attachment). |
| POST | `/api/sops/admin/versions/:versionId/approve` | Admin | Pending → published (+ archive prior published). |
| POST | `/api/sops/admin/versions/:versionId/reject` | Admin | Pending → rejected + reason. |
| DELETE | `/api/sops/admin/versions/:versionId` | Admin | Delete **draft** only. |
| POST | `/api/sops/admin/versions/:versionId/attachment` | Admin | `multipart/form-data` field `file` (multer memory). |
| DELETE | `/api/sops/admin/versions/:versionId/attachment` | Admin | Clear attachment on **draft**. |

**Uploads:** `FileStorageService.getPrivateUploadPath` with category `sop-attachments` (private on local disk → URL prefix `/objects/...`).

**HTML sanitization:** `server/shared/ticketHtmlSanitize.ts` (`sanitizeTicketHtml`) on write and on library GET. **`img`** may use **`http:` / `https:`** `src` only — **`data:`** (inline base64) is **not** persisted (keeps payloads small; use the version **attachment** for files).

**JSON body size:** Express default is overridden to **1mb** for JSON/urlencoded unless `JSON_BODY_LIMIT` is set in the environment — sufficient for rich HTML **without** embedded base64 images.

## Client

| Area | File |
|------|------|
| Admin UI (TinyMCE + CRUD) | `client/src/components/sop/SopAdminWorkspace.tsx` |
| Standalone admin page | `client/src/pages/SopAdministration.tsx` — route **`/admin/sops`** (outside `MainLayout`) |
| Sidebar | `client/src/config/sidebarConfig.tsx` — link to SOP admin / library as configured |
| Library | `client/src/pages/SOPLibrary.tsx` — route **`/sop`** inside `MainLayout` (`client/src/App.tsx`) |
| Editor | `client/src/components/SopRichTextEditor.tsx` — API key `import.meta.env.VITE_TINYMCE_API_KEY` |

## Environment

See `.env.example`: `VITE_TINYMCE_API_KEY` for the rich-text editor. Optional: `JSON_BODY_LIMIT` if you need a larger JSON cap (not required for text-only HTML).

## Operational notes

- Run SQL migrations `20260403_02_*` and `20260403_03_*` (and any prior dependencies) on each environment before using the module.
- If TinyMCE shows licensing warnings, configure the key in Tiny Cloud and restrict allowed domains.
- Vercel Blob URLs for attachments may be publicly readable depending on blob settings; tenant paths still provide obscurity. For stricter confidentiality, prefer private disk mode or a future signed-URL flow.
