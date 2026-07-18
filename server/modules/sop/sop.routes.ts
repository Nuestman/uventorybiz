import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { sanitizeTicketHtml } from "../../shared/ticketHtmlSanitize";

export interface SopRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  sopUpload: Multer;
}

function requireTenant(req: any, res: any): string | null {
  const tenantId = req.user?.tenantId as string | undefined;
  if (!tenantId) {
    sendError(res, 400, "User has no tenant association");
    return null;
  }
  return tenantId;
}

const createDocumentBody = z.object({
  title: z.string().min(1).max(512),
  code: z.string().max(64).optional().nullable(),
  department: z.string().max(128).optional().nullable(),
});

const patchDocumentBody = z
  .object({
    title: z.string().min(1).max(512).optional(),
    code: z.string().max(64).optional().nullable(),
    department: z.string().max(128).optional().nullable(),
    isArchived: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" });

const createVersionBody = z.object({
  contentHtml: z.string().optional(),
  changeNotes: z.string().max(8000).optional().nullable(),
});

const patchVersionBody = z.object({
  contentHtml: z.string().optional(),
  changeNotes: z.string().max(8000).optional().nullable(),
});

const rejectBody = z.object({
  reason: z.string().min(1).max(4000),
});

export function createSopRouter(deps: SopRoutesDeps): Router {
  const { authMiddleware, requireAdmin, sopUpload } = deps;
  const router = Router();

  /** Published SOPs for any tenant user (read-only). */
  router.get("/sops/library", authMiddleware, async (req: any, res) => {
    try {
      const tenantId = requireTenant(req, res);
      if (!tenantId) return;

      const rows = await storage.listTenantSopPublishedLibrary(tenantId);
      res.json({
        items: rows.map(({ document: d, version: v }) => ({
          documentId: d.id,
          title: d.title,
          code: d.code,
          department: d.department,
          publishedVersionId: v.id,
          versionNumber: v.versionNumber,
          approvedAt: v.approvedAt,
          hasAttachment: Boolean(v.attachmentUrl),
          attachmentFilename: v.attachmentFilename,
        })),
      });
    } catch (e) {
      console.error("GET /sops/library:", e);
      sendError(res, 500, "Failed to list SOPs");
    }
  });

  router.get("/sops/library/:documentId", authMiddleware, async (req: any, res) => {
    try {
      const tenantId = requireTenant(req, res);
      if (!tenantId) return;

      const row = await storage.getTenantSopPublishedForReader(tenantId, req.params.documentId);
      if (!row) {
        return sendError(res, 404, "SOP not found or not published");
      }

      res.json({
        document: {
          id: row.document.id,
          title: row.document.title,
          code: row.document.code,
          department: row.document.department,
        },
        version: {
          id: row.version.id,
          versionNumber: row.version.versionNumber,
          contentHtml: sanitizeTicketHtml(row.version.contentHtml ?? ""),
          attachmentUrl: row.version.attachmentUrl,
          attachmentFilename: row.version.attachmentFilename,
          attachmentMime: row.version.attachmentMime,
          approvedAt: row.version.approvedAt,
        },
      });
    } catch (e) {
      console.error("GET /sops/library/:documentId:", e);
      sendError(res, 500, "Failed to load SOP");
    }
  });

  /** Admin: list documents + latest version summary */
  router.get("/sops/admin/documents", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const tenantId = requireTenant(req, res);
      if (!tenantId) return;

      const rows = await storage.listTenantSopDocumentsAdmin(tenantId);
      res.json({
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          code: r.code,
          department: r.department,
          isArchived: r.isArchived,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          latestVersionNumber: r.latestVersionNumber,
          latestStatus: r.latestStatus,
        })),
      });
    } catch (e) {
      console.error("GET /sops/admin/documents:", e);
      sendError(res, 500, "Failed to list SOP documents");
    }
  });

  router.get(
    "/sops/admin/documents/:documentId",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const detail = await storage.getTenantSopDocumentWithVersions(tenantId, req.params.documentId);
        if (!detail) {
          return sendError(res, 404, "Document not found");
        }

        res.json({
          document: {
            id: detail.document.id,
            title: detail.document.title,
            code: detail.document.code,
            department: detail.document.department,
            isArchived: detail.document.isArchived,
            createdAt: detail.document.createdAt,
            updatedAt: detail.document.updatedAt,
          },
          versions: detail.versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            status: v.status,
            contentHtml: v.contentHtml,
            changeNotes: v.changeNotes,
            attachmentUrl: v.attachmentUrl,
            attachmentFilename: v.attachmentFilename,
            attachmentMime: v.attachmentMime,
            createdAt: v.createdAt,
            submittedAt: v.submittedAt,
            approvedAt: v.approvedAt,
            rejectedAt: v.rejectedAt,
            rejectionReason: v.rejectionReason,
          })),
        });
      } catch (e) {
        console.error("GET /sops/admin/documents/:documentId:", e);
        sendError(res, 500, "Failed to load SOP document");
      }
    }
  );

  router.post("/sops/admin/documents", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const tenantId = requireTenant(req, res);
      if (!tenantId) return;

      const parsed = createDocumentBody.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, "Invalid body", { errors: parsed.error.flatten() });
      }

      const userId = req.user?.id as string;
      const created = await storage.createTenantSopDocument(tenantId, userId, parsed.data);
      res.status(201).json(created);
    } catch (e) {
      console.error("POST /sops/admin/documents:", e);
      sendError(res, 500, "Failed to create SOP document");
    }
  });

  router.patch(
    "/sops/admin/documents/:documentId",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const parsed = patchDocumentBody.safeParse(req.body);
        if (!parsed.success) {
          return sendError(res, 400, "Invalid body", { errors: parsed.error.flatten() });
        }

        const updated = await storage.updateTenantSopDocument(tenantId, req.params.documentId, parsed.data);
        if (!updated) return sendError(res, 404, "Document not found");

        res.json({ document: updated });
      } catch (e) {
        console.error("PATCH /sops/admin/documents/:documentId:", e);
        sendError(res, 500, "Failed to update document");
      }
    }
  );

  router.post(
    "/sops/admin/documents/:documentId/versions",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const parsed = createVersionBody.safeParse(req.body);
        if (!parsed.success) {
          return sendError(res, 400, "Invalid body", { errors: parsed.error.flatten() });
        }

        const userId = req.user?.id as string;
        const html = sanitizeTicketHtml(parsed.data.contentHtml ?? "");
        const ver = await storage.createTenantSopDraftVersion(tenantId, req.params.documentId, userId, {
          contentHtml: html,
          changeNotes: parsed.data.changeNotes,
        });
        if (!ver) {
          return sendError(
            res,
            409,
            "Cannot create a new version while a draft or pending approval exists"
          );
        }
        res.status(201).json(ver);
      } catch (e) {
        console.error("POST /sops/admin/documents/:documentId/versions:", e);
        sendError(res, 500, "Failed to create version");
      }
    }
  );

  router.patch(
    "/sops/admin/versions/:versionId",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const parsed = patchVersionBody.safeParse(req.body);
        if (!parsed.success) {
          return sendError(res, 400, "Invalid body", { errors: parsed.error.flatten() });
        }

        const patch: { contentHtml?: string; changeNotes?: string | null } = {};
        if (parsed.data.contentHtml !== undefined) {
          patch.contentHtml = sanitizeTicketHtml(parsed.data.contentHtml);
        }
        if (parsed.data.changeNotes !== undefined) patch.changeNotes = parsed.data.changeNotes;

        const updated = await storage.updateTenantSopDraftVersion(tenantId, req.params.versionId, patch);
        if (!updated) return sendError(res, 404, "Draft version not found");

        res.json(updated);
      } catch (e) {
        console.error("PATCH /sops/admin/versions/:versionId:", e);
        sendError(res, 500, "Failed to update version");
      }
    }
  );

  router.post(
    "/sops/admin/versions/:versionId/submit",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const userId = req.user?.id as string;
        const updated = await storage.submitTenantSopVersionForApproval(
          tenantId,
          req.params.versionId,
          userId
        );
        if (!updated) {
          return sendError(
            res,
            400,
            "Submit failed (must be draft with text content or an attachment)"
          );
        }
        res.json(updated);
      } catch (e) {
        console.error("POST /sops/admin/versions/:versionId/submit:", e);
        sendError(res, 500, "Failed to submit version");
      }
    }
  );

  router.post(
    "/sops/admin/versions/:versionId/withdraw",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const updated = await storage.withdrawTenantSopSubmission(tenantId, req.params.versionId);
        if (!updated) {
          return sendError(res, 400, "Withdraw failed (version is not pending approval)");
        }
        res.json(updated);
      } catch (e) {
        console.error("POST /sops/admin/versions/:versionId/withdraw:", e);
        sendError(res, 500, "Failed to withdraw version");
      }
    }
  );

  router.post(
    "/sops/admin/versions/:versionId/approve",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const adminUserId = req.user?.id as string;
        const updated = await storage.approveTenantSopVersion(tenantId, req.params.versionId, adminUserId);
        if (!updated) return sendError(res, 400, "Approve failed (version not pending approval)");

        res.json(updated);
      } catch (e) {
        console.error("POST /sops/admin/versions/:versionId/approve:", e);
        sendError(res, 500, "Failed to approve version");
      }
    }
  );

  router.post(
    "/sops/admin/versions/:versionId/reject",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const parsed = rejectBody.safeParse(req.body);
        if (!parsed.success) {
          return sendError(res, 400, "Invalid body", { errors: parsed.error.flatten() });
        }

        const adminUserId = req.user?.id as string;
        const updated = await storage.rejectTenantSopVersion(
          tenantId,
          req.params.versionId,
          adminUserId,
          parsed.data.reason
        );
        if (!updated) return sendError(res, 400, "Reject failed (version not pending approval)");

        res.json(updated);
      } catch (e) {
        console.error("POST /sops/admin/versions/:versionId/reject:", e);
        sendError(res, 500, "Failed to reject version");
      }
    }
  );

  router.delete(
    "/sops/admin/versions/:versionId",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const ok = await storage.deleteTenantSopDraftVersion(tenantId, req.params.versionId);
        if (!ok) return sendError(res, 400, "Only draft versions can be deleted");

        res.json({ ok: true });
      } catch (e) {
        console.error("DELETE /sops/admin/versions/:versionId:", e);
        sendError(res, 500, "Failed to delete version");
      }
    }
  );

  router.post(
    "/sops/admin/versions/:versionId/attachment",
    authMiddleware,
    requireAdmin,
    sopUpload.single("file"),
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const file = req.file as Express.Multer.File | undefined;
        if (!file?.buffer?.length) return sendError(res, 400, "No file uploaded");

        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPrivateUploadPath({
          tenantId,
          category: "sop-attachments",
          itemName: file.originalname,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);

        const updated = await storage.setTenantSopVersionAttachment(tenantId, req.params.versionId, {
          url,
          filename: file.originalname,
          mime: file.mimetype,
        });
        if (!updated) return sendError(res, 400, "Failed to attach file");

        res.json({
          attachmentUrl: updated.attachmentUrl,
          attachmentFilename: updated.attachmentFilename,
          attachmentMime: updated.attachmentMime,
        });
      } catch (e) {
        console.error("POST /sops/admin/versions/:versionId/attachment:", e);
        sendError(res, 500, "Failed to upload attachment");
      }
    }
  );

  router.delete(
    "/sops/admin/versions/:versionId/attachment",
    authMiddleware,
    requireAdmin,
    async (req: any, res) => {
      try {
        const tenantId = requireTenant(req, res);
        if (!tenantId) return;

        const updated = await storage.clearTenantSopVersionAttachment(tenantId, req.params.versionId);
        if (!updated) return sendError(res, 400, "Cannot clear attachment");

        res.json({ ok: true });
      } catch (e) {
        console.error("DELETE /sops/admin/versions/:versionId/attachment:", e);
        sendError(res, 500, "Failed to remove attachment");
      }
    }
  );

  return router;
}
