import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertCustomerSchema } from "@shared/schema";
import { createCustomersController } from "./customers.controller";

// customerNumber is server-generated when omitted; status limited to known values.
const customerBodySchema = insertCustomerSchema.extend({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  status: z.enum(["active", "inactive"]).optional(),
});

export interface CustomersRoutesDeps {
  authMiddleware: RequestHandler;
  csvUpload: Multer;
}

/**
 * Create the customers router. Mount at /api.
 * Routes: GET/POST /customers, POST /customers/bulk-import, GET/PUT/DELETE /customers/:id
 */
export function createCustomersRouter(deps: CustomersRoutesDeps): Router {
  const { authMiddleware, csvUpload } = deps;
  const router = Router();
  const controller = createCustomersController(storage);

  router.get("/customers", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await controller.list(tenantId, search);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/customers/bulk-import",
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
    "/customers",
    authMiddleware,
    validateBody(customerBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof customerBodySchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get("/customers/:id", authMiddleware, async (req: any, res) => {
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
    "/customers/:id",
    authMiddleware,
    validateBody(customerBodySchema.partial()),
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

  router.delete("/customers/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(204).send();
  });

  return router;
}
