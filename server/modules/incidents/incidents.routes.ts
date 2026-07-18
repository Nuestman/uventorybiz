import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertIncidentReportSchema } from "@shared/schema";
import { createIncidentsController } from "./incidents.controller";
import { redactIncidentForSafetyOfficer } from "../../shared/incidentSafetyRedaction";

async function getRequestUserRole(req: { user?: { id?: string } }): Promise<string | undefined> {
  if (!req.user?.id) return undefined;
  const user = await storage.getUserById(req.user.id);
  return user?.role ?? undefined;
}

export interface IncidentRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware: RequestHandler;
  incidentUpload: Multer;
}

/**
 * Create the incident reports router. Mount at /api so that routes are
 * /api/incident-uploads and /api/incident-reports (and /api/incident-reports/:id).
 * Routes are thin: validate, call controller, map result to HTTP.
 */
export function createIncidentRouter(deps: IncidentRoutesDeps): Router {
  const { authMiddleware, injectLocationMiddleware, incidentUpload } = deps;
  const controller = createIncidentsController(storage);
  const router = Router();

  router.post(
    "/incident-uploads",
    authMiddleware,
    (req: any, res: any, next: any) => {
      next();
    },
    incidentUpload.array("files", 5),
    async (req: any, res) => {
      try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return sendError(res, 400, "User has no tenant association");

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) return sendError(res, 400, "No files uploaded");

        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const filePaths = await Promise.all(
          files.map(async (file) => {
            const uploadPath = await fileStorage.getPublicUploadPath({
              tenantId,
              category: "incident-documents",
              itemName: file.originalname,
            });
            return fileStorage.saveFile(uploadPath, file.buffer);
          })
        );
        res.json({ files: filePaths });
      } catch (error) {
        console.error("Error uploading incident files:", error);
        sendError(res, 500, "Failed to upload files", {
          errors: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  router.post(
    "/incident-reports",
    authMiddleware,
    injectLocationMiddleware,
    validateBody(insertIncidentReportSchema.omit({ reportedById: true })),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const reportData = {
        ...(req.body as z.infer<typeof insertIncidentReportSchema>),
        reportedById: req.user.claims?.sub || userId,
      };
      const result = await controller.create(tenantId, userId!, reportData);
      if (!result.ok) return sendError(res, 500, result.error);
      const joined = (await storage.getIncidentReports(tenantId)).find((r) => r.id === result.data.id);
      const payload = joined ?? result.data;
      const role = await getRequestUserRole(req);
      res
        .status(201)
        .json(
          role === "operations"
            ? redactIncidentForSafetyOfficer(payload as Record<string, unknown>)
            : payload,
        );
    }
  );

  router.get("/incident-reports", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    const role = await getRequestUserRole(req);
    const data =
      role === "operations"
        ? result.data.map((row) => redactIncidentForSafetyOfficer(row as Record<string, unknown>))
        : result.data;
    res.json(data);
  });

  router.put(
    "/incident-reports/:id",
    authMiddleware,
    validateBody(insertIncidentReportSchema.partial()),
    async (req: any, res) => {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const updateData = req.body as z.infer<typeof insertIncidentReportSchema>;
      const result = await controller.update(id, tenantId, userId!, updateData);
      if (!result.ok) return sendError(res, 500, result.error);
      const joined = (await storage.getIncidentReports(tenantId)).find((r) => r.id === id);
      const payload = joined ?? result.data;
      const role = await getRequestUserRole(req);
      res.json(
        role === "operations"
          ? redactIncidentForSafetyOfficer(payload as Record<string, unknown>)
          : payload,
      );
    }
  );

  router.delete("/incident-reports/:id", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(id, tenantId, userId!);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
