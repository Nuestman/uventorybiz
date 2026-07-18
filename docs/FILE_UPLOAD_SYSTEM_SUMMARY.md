# File Upload System - Complete Summary 📸

## Overview

MineAid HMS now has a comprehensive file upload system across multiple modules.

---

## 📁 Upload Systems

### 1. Profile Images ✅
- **Location:** `public/profiles/`
- **Endpoint:** `/api/profile`
- **Max size:** 5MB
- **Types:** Images only
- **Count:** 1 per user

### 2. Incident Documents ✅
- **Location:** `public/incident-documents/`
- **Endpoint:** `/api/incident-uploads`
- **Max size:** 10MB per file
- **Types:** Images, PDF, Word docs
- **Count:** Up to 5 files
- **Features:** Multiple file upload, file list with remove

### 3. Inventory Images ✅ (NEW!)
- **Location:** `public/inventory-images/`
- **Endpoint:** `/api/inventory-image-upload`
- **Max size:** 5MB
- **Types:** Images only
- **Count:** 1 per item
- **Features:** Preview, replace functionality

### 4. Staff ticket attachments ✅
- **Local path:** `public/ticket-documents/` (when Blob is off or upload falls back).
- **Vercel Blob:** `mineaidhms-blob/tenants/<tenantId>/ticket-documents/<filename>` with **public** object access (required for `put` with the current Blob token).
- **Endpoint:** `POST /api/tickets/:id/attachments` (multipart); response includes **`storageBackend`**: `vercel-blob` | `local` so the UI can warn when files are not in Blob.
- **Limits:** Aligned with incident-style rules (size/types); multiple files per ticket.
- **Module:** Operations → Staff tickets (`/tickets`, `/tickets/new`, `/tickets/:id`).

---

## 🎯 UX Enhancements Applied

### Enhanced Upload Areas:
All upload areas now feature:
- ✅ **Large clickable area** (not just input button)
- ✅ **Hover effects** (border + background color change)
- ✅ **Clear instructions** ("Click to upload...")
- ✅ **Upload progress** (spinner with text)
- ✅ **File preview** (thumbnails/lists)
- ✅ **Replace functionality** (click to change)

### Human-Readable Filenames:
All uploads use the format:
```
{prefix}-{YYYY-MM-DD}-{HH-MM-SS}-{random}-{safeName}.{ext}
```

Examples:
```
incident-2025-10-10-14-30-45-123456789-accident_report.pdf
inventory-2025-10-10-14-31-22-987654321-paracetamol.jpg
```

Benefits:
- Date sortable
- Time visible at a glance
- Original filename preserved
- Guaranteed unique (timestamp + random)
- Special characters sanitized

---

## 📊 Feature Comparison

| Feature | Profiles | Incidents | Inventory | Staff tickets |
|---------|----------|-----------|-----------|---------------|
| **Module** | User Management | Safety | Operations | Operations |
| **Use Case** | User avatars | Evidence/docs | Item photos | Ticket evidence/docs |
| **Multiple Files** | No | Yes (5 max) | No | Yes |
| **File Types** | Images | Images, PDF, Docs | Images | Images, PDF, Docs |
| **Max Size** | 5MB | 10MB each | 5MB | Same as incidents (per route) |
| **Preview** | Avatar display | File list | Thumbnail | File list + download |
| **Remove** | Replace only | ✓ per file | Replace only | Per file (where UI allows) |
| **Table Display** | Avatar | - | Thumbnail | Detail attachments list |
| **Edit Support** | ✓ | ✓ | ✓ | ✓ |
| **Cloud** | Local / varies | Blob + local | Blob + local | **Blob (`ticket-documents`) + local** |

---

## 🔧 Technical Architecture

### Backend
```typescript
// Legacy / core routes (server/routes.ts and related):
1. upload                 → profile images
2. incidentUpload         → incident documents
3. inventoryImageUpload   → inventory images

POST /api/profile                    → single image
POST /api/incident-uploads           → multiple files
POST /api/inventory-image-upload     → single image

// Tickets module (server/modules/tickets):
POST /api/tickets/:id/attachments    → multiple files; category ticket-documents; see storageBackend in JSON
```

### Directory Structure (local)
```
public/
├── profiles/
│   └── [user-profile images]
├── incident-documents/
│   └── [incident files - multiple types]
├── inventory-images/
│   └── [inventory item photos]
└── ticket-documents/
    └── [staff ticket attachments when not on Blob]
```

### Vercel Blob (production)
Tenant-scoped prefixes (including **`ticket-documents`**) live under `mineaidhms-blob/tenants/<tenantId>/…`. Staff ticket uploads use **`access: "public"`** on `put` so the current token/SDK accepts the write.

### Database Fields
```sql
users.profile_image_url          → VARCHAR
incident_reports.incident_uploads → TEXT (comma-separated)
medical_inventory.image_url       → VARCHAR
```

---

## 🎨 UI Components

### Upload Area Template:
```tsx
<div className="border-2 border-dashed... hover:border-gray-400">
  <label htmlFor="file-input" className="block p-4 cursor-pointer hover:bg-gray-50">
    {uploadedFile ? (
      <Preview file={uploadedFile} />
    ) : (
      <EmptyState icon={Icon} text="Click to upload..." />
    )}
    <Input id="file-input" type="file" className="hidden" onChange={handleUpload} />
  </label>
  {isUploading && <ProgressIndicator />}
</div>
```

---

## 📋 Migration Scripts

### Profile Images
- No migration needed (existing)

### Incident Documents
- Part of multi-location system
- Field already exists

### Inventory Images
```sql
-- migrations/add_inventory_image_url.sql
ALTER TABLE medical_inventory 
ADD COLUMN IF NOT EXISTS image_url VARCHAR;
```

---

## 🧪 Testing Guide

### For Each Upload System:

#### Test 1: Upload Success
1. Navigate to form
2. Click upload area
3. Select valid file
4. Verify upload progress shown
5. Verify preview/thumbnail appears
6. Submit form
7. Verify file saved to DB
8. Verify file exists in directory

#### Test 2: Edit/Replace
1. Edit existing record with file
2. Verify existing file shows
3. Click upload area
4. Select new file
5. Verify new preview
6. Submit
7. Verify file replaced in DB

#### Test 3: Validation
1. Try oversized file → Should reject
2. Try wrong file type → Should reject
3. Try without file → Should allow (optional)
4. Verify error messages shown

---

## 🎉 Result

**MineAid HMS now has professional-grade file uploads:**

1. ✅ **Incidents:** Upload multiple documents/photos
2. ✅ **Inventory:** Upload item images
3. ✅ **Profiles:** Upload user avatars
4. ✅ **Staff tickets:** Upload multiple attachments (Blob + local fallback with `storageBackend`)
4. ✅ **Enhanced UX:** Large click areas, hover effects
5. ✅ **Smart Naming:** Human-readable filenames
6. ✅ **Edit Support:** Can replace/update files
7. ✅ **Validation:** Size and type checking
8. ✅ **Feedback:** Progress indicators, success/error toasts

---

## 📝 Usage Examples

### Incident Reports:
```
User uploads:
- accident_scene.jpg
- witness_statement.pdf
- medical_report.docx

Stored as:
- incident-2025-10-10-14-30-45-123-accident_scene.jpg
- incident-2025-10-10-14-30-47-456-witness_statement.pdf
- incident-2025-10-10-14-30-49-789-medical_report.docx

Database: "/public/incident-documents/..., /public/incident-documents/..."
Display: File list with download links
```

### Inventory Items:
```
User uploads:
- paracetamol.jpg

Stored as:
- inventory-2025-10-10-14-31-22-987-paracetamol.jpg

Database: "/public/inventory-images/inventory-2025-10-10-..."
Display: Thumbnail in table, preview in form
```

---

## 🚀 Next Steps

All file upload systems are now complete and production-ready!

**To use:**
1. Run inventory migration (if not already run)
2. Restart server
3. Test uploads in each module
4. Enjoy professional file management! 🎉

---

**Date:** April 1, 2026 (staff tickets + Blob notes added)  
**Status:** ✅ Core upload systems complete  
**Systems:** Profile Images, Incident Documents, Inventory Images, Staff Ticket Attachments

