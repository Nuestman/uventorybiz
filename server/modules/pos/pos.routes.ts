import type { RequestHandler } from "express";
import { Router } from "express";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { createPosController } from "./pos.controller";
import {
  closeShiftSchema,
  completeSaleSchema,
  createRegisterSchema,
  createSaleSchema,
  openShiftSchema,
  returnSaleSchema,
  updateSaleSchema,
} from "./pos.schemas";

export interface PosRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

export function createPosRouter(deps: PosRoutesDeps): Router {
  const { authMiddleware, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createPosController();

  router.get("/pos/registers", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const result = await controller.listRegisters(tenantId, locationId);
    res.json(result.data);
  });

  router.post(
    "/pos/registers",
    authMiddleware,
    validateBody(createRegisterSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.createRegister(tenantId, req.body);
      res.status(201).json(result.data);
    },
  );

  router.get("/pos/registers/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getRegister(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error, { code: result.code });
    res.json({ ...result.data.register, locationName: result.data.locationName });
  });

  router.post(
    "/pos/shifts/open",
    authMiddleware,
    validateBody(openShiftSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.openShift(tenantId, userId, req.body);
      if (!result.ok) return sendError(res, result.code === "CONFLICT" ? 409 : result.code === "NOT_FOUND" ? 404 : 400, result.error, { code: result.code });
      res.status(201).json(result.data);
    },
  );

  router.post(
    "/pos/shifts/:id/close",
    authMiddleware,
    validateBody(closeShiftSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.closeShift(tenantId, userId, req.params.id, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
      res.json(result.data);
    },
  );

  router.get("/pos/shifts/current", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const registerId = typeof req.query.registerId === "string" ? req.query.registerId : undefined;
    if (!registerId) return sendError(res, 400, "registerId query parameter is required");
    const result = await controller.getCurrentShift(tenantId, registerId);
    res.json(result.data);
  });

  router.get("/pos/items/search", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!locationId) return sendError(res, 400, "locationId is required");
    const result = await controller.searchItems(tenantId, locationId, q);
    res.json(result.data);
  });

  router.get("/pos/items/barcode/:barcode", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    if (!locationId) return sendError(res, 400, "locationId is required");
    const result = await controller.lookupBarcode(tenantId, locationId, req.params.barcode);
    if (!result.ok) return sendError(res, 404, result.error, { code: result.code });
    res.json(result.data);
  });

  router.post(
    "/pos/sales",
    authMiddleware,
    injectLocationMiddleware,
    validateBody(createSaleSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.createDraftSale(tenantId, userId, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
      res.status(201).json(result.data);
    },
  );

  router.patch(
    "/pos/sales/:id",
    authMiddleware,
    validateBody(updateSaleSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.updateSaleLines(tenantId, req.params.id, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
      res.json(result.data);
    },
  );

  router.post(
    "/pos/sales/:id/pay",
    authMiddleware,
    validateBody(completeSaleSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.completeSale(tenantId, userId, req.params.id, req.body.payments);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
      res.json(result.data);
    },
  );

  router.post("/pos/sales/:id/void", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.voidSale(tenantId, req.params.id);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
    res.json(result.data);
  });

  router.post(
    "/pos/sales/:id/return",
    authMiddleware,
    validateBody(returnSaleSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.returnSale(tenantId, userId, req.params.id, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400, result.error, { code: result.code });
      res.status(201).json(result.data);
    },
  );

  // Paginated sales history (the /sales page).
  router.get("/pos/sales", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.listSales(tenantId, {
      page: typeof req.query.page === "string" ? parseInt(req.query.page, 10) || 1 : 1,
      pageSize: typeof req.query.pageSize === "string" ? parseInt(req.query.pageSize, 10) || 20 : 20,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      search: typeof req.query.q === "string" ? req.query.q : undefined,
    });
    res.json(result.data);
  });

  // Must be registered before /pos/sales/:id so "by-receipt" isn't captured as an id.
  router.get("/pos/sales/by-receipt/:receiptNumber", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.lookupSaleByReceipt(tenantId, req.params.receiptNumber);
    if (!result.ok) return sendError(res, 404, result.error, { code: result.code });
    res.json(result.data);
  });

  router.get("/pos/sales/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getSaleReceipt(tenantId, req.params.id);
    if (!result.ok) return sendError(res, 404, result.error, { code: result.code });
    res.json(result.data);
  });

  router.get("/pos/reports/daily", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
    const registerId = typeof req.query.registerId === "string" ? req.query.registerId : undefined;
    const result = await controller.dailyReport(tenantId, date, registerId);
    res.json(result.data);
  });

  return router;
}
