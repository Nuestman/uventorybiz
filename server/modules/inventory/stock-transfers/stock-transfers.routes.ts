import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { createStockTransfersController } from "./stock-transfers.controller";

const createStockTransferBodySchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  type: z.string().optional(),
  requisitionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantityPlanned: z.number().int().positive(),
    unitOfMeasure: z.string().optional(),
    unitCost: z.string().optional(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })).min(1),
});

const fromRequisitionBodySchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    approvedQuantity: z.number().int().nonnegative(),
  })).optional(),
});

export interface StockTransfersRoutesDeps {
  authMiddleware: RequestHandler;
}

async function resolveTenantId(req: any): Promise<string | null> {
  let tenantId = req.user?.tenantId ?? req.tenantId;
  if (!tenantId && req.user?.id) {
    const fullUser = await storage.getUserById(req.user.id);
    tenantId = fullUser?.tenantId ?? null;
  }
  return tenantId ?? null;
}

/**
 * Create the stock transfers router. Mount at /api.
 * Routes: GET/POST /stock-transfers, POST from-requisition/:requisitionId, POST :id/dispatch, POST :id/receive
 */
export function createStockTransfersRouter(deps: StockTransfersRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createStockTransfersController(storage);

  router.get("/stock-transfers", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { status, fromLocationId, toLocationId, requisitionId } = req.query as {
      status?: string;
      fromLocationId?: string;
      toLocationId?: string;
      requisitionId?: string;
    };
    const result = await controller.list(tenantId, { status, fromLocationId, toLocationId, requisitionId });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/stock-transfers", authMiddleware, validateBody(createStockTransferBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const body = req.body as z.infer<typeof createStockTransferBodySchema>;
    const result = await controller.create(tenantId, {
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      type: body.type,
      requisitionId: body.requisitionId ?? undefined,
      notes: body.notes ?? undefined,
      items: body.items,
    });
    if (!result.ok) return sendError(res, result.error.includes("required") ? 400 : 500, result.error);
    res.json(result.data);
  });

  router.post("/stock-transfers/from-requisition/:requisitionId", authMiddleware, validateBody(fromRequisitionBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId) return sendError(res, 400, "User ID is required");
    const { requisitionId } = req.params;
    const { items } = req.body as z.infer<typeof fromRequisitionBodySchema>;
    const result = await controller.createFromRequisition(
      requisitionId,
      userId,
      tenantId,
      items && items.length > 0 ? items : undefined
    );
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/stock-transfers/:id/dispatch", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId) return sendError(res, 400, "User ID is required");
    const result = await controller.dispatch(req.params.id, userId, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });

  router.post("/stock-transfers/:id/receive", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId) return sendError(res, 400, "User ID is required");
    const result = await controller.receive(req.params.id, userId, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });

  return router;
}
