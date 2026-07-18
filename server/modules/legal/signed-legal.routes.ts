import type { Request, RequestHandler, Response } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import path from "path";
import { z } from "zod";
import { sendError } from "../../shared/errors";
import { FileNotFoundError, FileStorageService } from "../../fileStorage";
import { storage } from "../../storage";

const DOCUMENT_TYPES = [
  "commercial_agreement",
  "data_processing_addendum",
  "baa",
  "subprocessors_ack",
  "other",
] as const;

const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export interface SignedLegalRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  requireSuperAdmin: RequestHandler;
  legalUpload: Multer;
}

function contentTypeForFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] || "application/octet-stream";
}

async function sendStoredFile(row: { storageUrl: string; originalFilename: string }, res: Response) {
  const fileStorage = new FileStorageService();
  const buf = await fileStorage.getFile(row.storageUrl);
  const ct = contentTypeForFilename(row.originalFilename);
  res.set({
    "Content-Type": ct,
    "Content-Length": String(buf.length),
    "Content-Disposition": `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
    "Cache-Control": "private, no-store",
  });
  res.send(buf);
}

/**
 * Tenant admin upload/list/download and super-admin cross-tenant list/download.
 * Mounted at /api.
 */
export function createSignedLegalRouter(deps: SignedLegalRoutesDeps): Router {
  const { authMiddleware, requireAdmin, requireSuperAdmin, legalUpload } = deps;
  const router = Router();

  router.get(
    "/admin/legal-signed-documents",
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response) => {
      const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId;
      if (!tenantId) return sendError(res, 400, "Tenant context required");
      try {
        const documents = await storage.listSignedLegalDocumentsForTenant(tenantId);
        res.json({ documents });
      } catch (err) {
        console.error("GET /admin/legal-signed-documents:", err);
        sendError(res, 500, "Failed to list documents");
      }
    }
  );

  router.post(
    "/admin/legal-signed-documents",
    authMiddleware,
    requireAdmin,
    legalUpload.single("file"),
    async (req: Request, res: Response) => {
      const tenantId = (req as unknown as { user?: { tenantId?: string; id?: string } }).user?.tenantId;
      const userId = (req as unknown as { user?: { id?: string } }).user?.id;
      if (!tenantId) return sendError(res, 400, "Tenant context required");

      const file = (req as unknown as {
        file?: { buffer?: Buffer; originalname: string; mimetype: string; size: number };
      }).file;
      if (!file?.buffer?.length) return sendError(res, 400, "File required");

      const parsed = documentTypeSchema.safeParse(String((req.body as { documentType?: string })?.documentType ?? "").trim());
      if (!parsed.success) return sendError(res, 400, "Invalid documentType");

      const notesRaw = (req.body as { notes?: string })?.notes;
      const notes =
        typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim().slice(0, 2000) : null;

      try {
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPrivateUploadPath({
          tenantId,
          category: "signed-legal-documents",
          itemName: file.originalname,
        });
        const storageUrl = await fileStorage.saveFile(uploadPath, file.buffer);
        const row = await storage.createSignedLegalDocument({
          tenantId,
          documentType: parsed.data,
          storageUrl,
          originalFilename: file.originalname.slice(0, 512),
          mimeType: file.mimetype || null,
          fileSizeBytes: file.size,
          uploadedByUserId: userId ?? null,
          notes,
        });
        res.status(201).json({
          id: row.id,
          documentType: row.documentType,
          originalFilename: row.originalFilename,
          createdAt: row.createdAt,
          uploadedByUserId: row.uploadedByUserId,
          notes: row.notes,
        });
      } catch (err) {
        console.error("POST /admin/legal-signed-documents:", err);
        sendError(res, 500, "Upload failed");
      }
    }
  );

  router.get(
    "/admin/legal-signed-documents/:id/download",
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response) => {
      const tenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId;
      if (!tenantId) return sendError(res, 400, "Tenant context required");
      const { id } = req.params;
      try {
        const row = await storage.getSignedLegalDocumentById(id);
        if (!row || row.tenantId !== tenantId) return sendError(res, 404, "Document not found");
        await sendStoredFile(row, res);
      } catch (err) {
        if (err instanceof FileNotFoundError) return sendError(res, 404, "File not found");
        console.error("GET /admin/legal-signed-documents/:id/download:", err);
        sendError(res, 500, "Download failed");
      }
    }
  );

  router.get(
    "/super-admin/legal-signed-documents",
    authMiddleware,
    requireSuperAdmin,
    async (_req: Request, res: Response) => {
      try {
        const documents = await storage.listAllSignedLegalDocumentsForSuperAdmin();
        res.json({ documents });
      } catch (err) {
        console.error("GET /super-admin/legal-signed-documents:", err);
        sendError(res, 500, "Failed to list documents");
      }
    }
  );

  router.get(
    "/super-admin/legal-signed-documents/:id/download",
    authMiddleware,
    requireSuperAdmin,
    async (req: Request, res: Response) => {
      const { id } = req.params;
      try {
        const row = await storage.getSignedLegalDocumentById(id);
        if (!row) return sendError(res, 404, "Document not found");
        await sendStoredFile(row, res);
      } catch (err) {
        if (err instanceof FileNotFoundError) return sendError(res, 404, "File not found");
        console.error("GET /super-admin/legal-signed-documents/:id/download:", err);
        sendError(res, 500, "Download failed");
      }
    }
  );

  return router;
}
