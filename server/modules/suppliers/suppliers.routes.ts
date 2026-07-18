import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertSupplierSchema } from "@shared/schema";
import { createSuppliersController } from "./suppliers.controller";

export interface SuppliersRoutesDeps {
  authMiddleware: RequestHandler;
  csvUpload: Multer;
}

/**
 * Create the suppliers router. Mount at /api.
 * Routes: GET/POST /suppliers, POST /suppliers/bulk-import, GET/PUT/DELETE /suppliers/:id
 */
export function createSuppliersRouter(deps: SuppliersRoutesDeps): Router {
  const { authMiddleware, csvUpload } = deps;
  const router = Router();
  const controller = createSuppliersController(storage);

  router.get("/suppliers", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/suppliers/bulk-import",
    authMiddleware,
    csvUpload.single("file"),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      let csvData = "";
      if (req.file) {
        csvData = req.file.buffer.toString("utf-8");
      } else if (typeof req.body?.csvData === "string") {
        csvData = req.body.csvData;
      }
      if (!csvData.trim()) {
        return sendError(res, 400, "CSV file or csvData is required");
      }
      const result = await controller.bulkImport(tenantId, csvData);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    },
  );

  router.post(
    "/suppliers",
    authMiddleware,
    validateBody(insertSupplierSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertSupplierSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/suppliers/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.put(
    "/suppliers/:id",
    authMiddleware,
    validateBody(insertSupplierSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/suppliers/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(204).send();
  });

  return router;
}
