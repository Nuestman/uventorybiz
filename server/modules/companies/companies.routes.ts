import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertCompanySchema } from "@shared/schema";
import { createCompaniesController } from "./companies.controller";

export interface CompaniesRoutesDeps {
  authMiddleware: RequestHandler;
  csvUpload: Multer;
}

/**
 * Create the companies router. Mount at /api.
 * Routes: /api/companies, /api/companies/bulk-import, /api/companies/export, /api/companies/:id
 */
export function createCompaniesRouter(deps: CompaniesRoutesDeps): Router {
  const { authMiddleware, csvUpload } = deps;
  const router = Router();
  const controller = createCompaniesController(storage);

  router.post(
    "/companies",
    authMiddleware,
    validateBody(insertCompanySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertCompanySchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/companies", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json([]);
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/companies/bulk-import", authMiddleware, csvUpload.single("file"), async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    let csvData = "";
    if (req.file) {
      csvData = req.file.buffer.toString("utf-8");
    } else {
      const { csvData: bodyCsvData } = req.body;
      if (!bodyCsvData) return sendError(res, 400, "CSV file or data is required");
      csvData = bodyCsvData;
    }
    if (!csvData?.trim()) return sendError(res, 400, "CSV data is empty");
    const result = await controller.bulkImport(tenantId, csvData);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/companies/export", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.export(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
    res.send(result.data.csvContent);
  });

  router.put(
    "/companies/:id",
    authMiddleware,
    validateBody(insertCompanySchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/companies/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
