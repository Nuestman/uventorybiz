import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { createTicketsController } from "./tickets.controller";

const ticketPriorityZ = z.enum(["low", "normal", "high", "urgent"]);
const ticketStatusZ = z.enum([
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
]);

const ticketCreateBodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1).max(500),
  descriptionHtml: z.string(),
  priority: ticketPriorityZ.optional(),
  locationId: z.string().nullable().optional(),
  relatedIncidentId: z.string().nullable().optional(),
  /** Canonical link; free-text assetTag is not accepted on write. */
  assetId: z.string().nullable().optional(),
});

const ticketPatchBodySchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    descriptionHtml: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    priority: ticketPriorityZ.optional(),
    status: ticketStatusZ.optional(),
    assigneeUserId: z.string().nullable().optional(),
    locationId: z.string().nullable().optional(),
    relatedIncidentId: z.string().nullable().optional(),
    /** Prefer assetId; free-text assetTag is ignored when assetId is sent. */
    assetId: z.string().nullable().optional(),
  })
  .strict();

const ticketCommentBodySchema = z.object({
  bodyHtml: z.string().min(1),
  isInternal: z.boolean().optional(),
});

const ticketCategoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, hyphens")
    .optional(),
  sortOrder: z.number().int().optional(),
});

const ticketCategoryPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

function slugifyName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "category";
}

async function roleForRequest(req: { user?: { id?: string } }): Promise<string | undefined> {
  if (!req.user?.id) return undefined;
  const u = await storage.getUserById(req.user.id);
  return u?.role ?? undefined;
}

export interface TicketsRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  ticketUpload: Multer;
}

export function createTicketsRouter(deps: TicketsRoutesDeps): Router {
  const { authMiddleware, requireAdmin, ticketUpload } = deps;
  const router = Router();
  const controller = createTicketsController(storage);

  router.get("/ticket-categories", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const includeInactive = req.query.includeInactive === "true";
    const result = await controller.listCategories(tenantId, { includeInactive });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/ticket-categories",
    authMiddleware,
    requireAdmin,
    validateBody(ticketCategoryCreateSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const slug = req.body.slug ?? slugifyName(req.body.name);
      const result = await controller.createCategory(tenantId, {
        name: req.body.name,
        slug,
        sortOrder: req.body.sortOrder,
      });
      if (!result.ok) return sendError(res, 400, result.error);
      res.status(201).json(result.data);
    }
  );

  router.patch(
    "/ticket-categories/:id",
    authMiddleware,
    requireAdmin,
    validateBody(ticketCategoryPatchSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.updateCategory(req.params.id, tenantId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/ticket-categories/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.deleteCategory(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "IN_USE") return sendError(res, 409, result.error);
      return sendError(res, 400, result.error);
    }
    res.json(result.data);
  });

  router.get("/tickets", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    if (!userId) return sendError(res, 401, "User not identified");
    const role = await roleForRequest(req);
    const result = await controller.list(tenantId, userId, role, {
      scope: (req.query.scope as string) || undefined,
      status: (req.query.status as string) || undefined,
      categoryId: (req.query.categoryId as string) || undefined,
      source: (req.query.source as string) || undefined,
      limit: req.query.limit != null ? Number(req.query.limit) : undefined,
      offset: req.query.offset != null ? Number(req.query.offset) : undefined,
    });
    if (!result.ok) {
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      if (result.code === "INVALID") return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.get("/tickets/active-in-category", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : "";
    const result = await controller.listActiveInCategory(tenantId, categoryId);
    if (!result.ok) {
      if (result.code === "INVALID") return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.post(
    "/tickets",
    authMiddleware,
    validateBody(ticketCreateBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const result = await controller.create(tenantId, userId, req.body);
      if (!result.ok) return sendError(res, 400, result.error);
      res.status(201).json(result.data);
    }
  );

  router.get("/tickets/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    if (!userId) return sendError(res, 401, "User not identified");
    const role = await roleForRequest(req);
    const result = await controller.getDetail(req.params.id, tenantId, userId, role);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.delete("/tickets/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const role = await roleForRequest(req);
    const result = await controller.removeTicket(req.params.id, tenantId, role);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      return sendError(res, 400, result.error);
    }
    res.json(result.data);
  });

  router.patch(
    "/tickets/:id",
    authMiddleware,
    validateBody(ticketPatchBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const role = await roleForRequest(req);
      const result = await controller.patch(req.params.id, tenantId, userId, role, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        if (result.code === "INVALID") return sendError(res, 400, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  router.post(
    "/tickets/:id/comments",
    authMiddleware,
    validateBody(ticketCommentBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const role = await roleForRequest(req);
      const result = await controller.addComment(req.params.id, tenantId, userId, role, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        return sendError(res, 400, result.error);
      }
      res.status(201).json(result.data);
    }
  );

  router.post(
    "/tickets/:id/attachments",
    authMiddleware,
    ticketUpload.single("file"),
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId) return sendError(res, 400, "User has no tenant association");
        if (!userId) return sendError(res, 401, "User not identified");
        const file = req.file as Express.Multer.File | undefined;
        if (!file?.buffer) return sendError(res, 400, "No file uploaded");
        const ticket = await storage.getTicketById(req.params.id, tenantId);
        if (!ticket) return sendError(res, 404, "Ticket not found");
        const role = await roleForRequest(req);
        const isAdmin = role === "admin" || role === "super_admin";
        const canAttach =
          isAdmin || ticket.requesterUserId === userId || ticket.assigneeUserId === userId;
        if (!canAttach) return sendError(res, 403, "Not allowed to add attachments to this ticket");

        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId,
          category: "ticket-documents",
          itemName: file.originalname,
          mimetype: file.mimetype,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);
        const row = await storage.addTicketAttachment(req.params.id, tenantId, userId, {
          fileUrl: url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
        const storageBackend =
          typeof url === "string" && url.includes("blob.vercel-storage.com")
            ? "vercel-blob"
            : "local";
        res.status(201).json({ ...row, storageBackend });
      } catch (e) {
        console.error("ticket attachment upload:", e);
        sendError(res, 500, e instanceof Error ? e.message : "Upload failed");
      }
    }
  );

  return router;
}
