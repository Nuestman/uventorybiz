import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertEmployeeSchema } from "@shared/schema";
import { createEmployeesController } from "./employees.controller";

export interface EmployeesRoutesDeps {
  authMiddleware: RequestHandler;
  csvUpload: Multer;
}

/**
 * Create the employees router. Mount at /api.
 * Routes: /api/employees/search, /api/employees/search/:employeeNumber, /api/employees,
 * /api/employees/export, /api/employees/bulk-import, /api/employees/:id, /api/employees/:employeeId/test-history
 */
export function createEmployeesRouter(deps: EmployeesRoutesDeps): Router {
  const { authMiddleware, csvUpload } = deps;
  const router = Router();
  const controller = createEmployeesController(storage);

  router.get("/employees/search", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.search(tenantId, (req.query.q as string) ?? "");
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/employees/search/:employeeNumber", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.searchByNumber(req.params.employeeNumber, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.get("/employees", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/employees",
    authMiddleware,
    validateBody(insertEmployeeSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof insertEmployeeSchema>;
      const result = await controller.create(tenantId, {
        ...body,
        position: body.jobTitle,
        status: body.status === null ? undefined : body.status,
      } as Parameters<typeof controller.create>[1]);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.put(
    "/employees/:id",
    authMiddleware,
    validateBody(insertEmployeeSchema.partial()),
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

  router.post("/employees/bulk-import", authMiddleware, csvUpload.single("file"), async (req: any, res) => {
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

  router.get("/employees/export", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.export(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
    res.send(result.data.csvContent);
  });

  router.get("/employees/:employeeId/test-history", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getTestHistory(req.params.employeeId, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.delete("/employees/:id", authMiddleware, async (req: any, res) => {
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
