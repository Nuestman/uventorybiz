import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createShiftReportsController } from "./shift-reports.controller";
import { validateBody } from "../../shared/validation";
import { handoverStructuredSchema } from "@shared/schema";

const shiftReportCreateBodySchema = z.object({
  locationId: z.string().min(1),
  reportDate: z.string().min(1),
  shift: z.enum(["day", "night"]),
  summary: z.string().min(1),
  notes: z.string().optional(),
  activitiesNotes: z.string().optional(),
  handoverNotes: z.string().optional(),
  hasIssues: z.boolean().optional(),
  issuesNotes: z.string().optional(),
  handoverStructured: handoverStructuredSchema.nullish(),
});

const shiftReportUpdateBodySchema = z.object({
  reportDate: z.string().optional(),
  shift: z.enum(["day", "night"]).optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),
  activitiesNotes: z.string().optional(),
  handoverNotes: z.string().optional(),
  hasIssues: z.boolean().optional(),
  issuesNotes: z.string().optional(),
  handoverStructured: handoverStructuredSchema.nullish(),
});

const acknowledgeBodySchema = z.object({
  note: z.string().optional(),
});

const addLinkBodySchema = z.object({
  linkedType: z.enum(["ticket", "incident", "duty"]),
  linkedId: z.string().min(1),
  note: z.string().optional(),
});

export interface ShiftReportsRoutesDeps {
  authMiddleware: RequestHandler;
  shiftReportUpload: Multer;
}

/**
 * Shift reports + ShiftOver routes. Mount at /api.
 */
export function createShiftReportsRouter(deps: ShiftReportsRoutesDeps): Router {
  const { authMiddleware, shiftReportUpload } = deps;
  const router = Router();
  const controller = createShiftReportsController(storage);

  router.get("/shiftover/summary", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    if (!userId) return sendError(res, 401, "User not identified");
    const locationId = (req.query.locationId as string)?.trim() || undefined;
    const result = await controller.shiftoverSummary(tenantId, userId, locationId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/shiftover/open-items", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = (req.query.locationId as string)?.trim() || undefined;
    const result = await controller.openItems(tenantId, locationId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/shift-reports", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = (req.query.locationId as string)?.trim() || undefined;
    const fromDate = (req.query.fromDate as string)?.trim() || undefined;
    const toDate = (req.query.toDate as string)?.trim() || undefined;
    const shift = (req.query.shift as string)?.trim() || undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const offset = req.query.offset != null ? Number(req.query.offset) : undefined;
    const enrich = req.query.enrich === "1" || req.query.enrich === "true";
    const unacknowledgedOnly =
      req.query.unacknowledgedOnly === "1" || req.query.unacknowledgedOnly === "true";
    const result = await controller.list(
      tenantId,
      {
        locationId,
        fromDate,
        toDate,
        shift,
        limit,
        offset,
        unacknowledgedByUserId: unacknowledgedOnly && userId ? userId : undefined,
      },
      { enrich, currentUserId: userId ?? undefined }
    );
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/shift-reports/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const detail = req.query.detail === "1" || req.query.detail === "true";
    const result = await controller.getById(req.params.id, tenantId, { detail });
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.post(
    "/shift-reports",
    authMiddleware,
    validateBody(shiftReportCreateBodySchema),
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

  router.put(
    "/shift-reports/:id",
    authMiddleware,
    validateBody(shiftReportUpdateBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const result = await controller.update(req.params.id, tenantId, userId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/shift-reports/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    if (!userId) return sendError(res, 401, "User not identified");
    const result = await controller.remove(req.params.id, tenantId, userId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      return sendError(res, 400, result.error);
    }
    res.json(result.data);
  });

  router.post(
    "/shift-reports/:id/acknowledge",
    authMiddleware,
    validateBody(acknowledgeBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const result = await controller.acknowledge(req.params.id, tenantId, userId, req.body.note);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 400, result.error);
      }
      res.status(201).json(result.data);
    }
  );

  router.post(
    "/shift-reports/:id/links",
    authMiddleware,
    validateBody(addLinkBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const result = await controller.addLink(req.params.id, tenantId, userId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        if (result.code === "BAD_TARGET") return sendError(res, 400, result.error);
        return sendError(res, 400, result.error);
      }
      res.status(201).json(result.data);
    }
  );

  router.delete("/shift-reports/:reportId/links/:linkId", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    if (!userId) return sendError(res, 401, "User not identified");
    const result = await controller.removeLink(req.params.linkId, tenantId, userId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
      return sendError(res, 400, result.error);
    }
    res.json(result.data);
  });

  router.post(
    "/shift-reports/:id/attachments",
    authMiddleware,
    shiftReportUpload.single("file"),
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId) return sendError(res, 400, "User has no tenant association");
        if (!userId) return sendError(res, 401, "User not identified");
        const file = req.file as Express.Multer.File | undefined;
        if (!file?.buffer) return sendError(res, 400, "No file uploaded");
        const report = await storage.getShiftReportById(req.params.id, tenantId);
        if (!report) return sendError(res, 404, "Shift report not found");
        const user = await storage.getUserById(userId);
        const canManage =
          report.reportedById === userId ||
          user?.role === "admin" ||
          user?.role === "super_admin";
        if (!canManage) return sendError(res, 403, "Not allowed to attach files to this shift report");

        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId,
          category: "shift-report-attachments",
          itemName: file.originalname,
          mimetype: file.mimetype,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);
        const row = await storage.createShiftReportAttachment(tenantId, req.params.id, userId, {
          fileUrl: url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
        res.status(201).json(row);
      } catch (e) {
        console.error("shift report attachment:", e);
        sendError(res, 500, e instanceof Error ? e.message : "Upload failed");
      }
    }
  );

  router.delete(
    "/shift-reports/:reportId/attachments/:attachmentId",
    authMiddleware,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 401, "User not identified");
      const result = await controller.removeAttachment(req.params.attachmentId, tenantId, userId);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  return router;
}
