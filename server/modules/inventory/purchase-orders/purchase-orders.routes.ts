import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertPurchaseOrderSchema, insertPurchaseOrderItemSchema } from "@shared/schema";
import { createPurchaseOrdersController } from "./purchase-orders.controller";

const createPurchaseOrderBodySchema = z.object({
  supplierId: z.string().min(1),
  expectedDelivery: z.union([z.string(), z.coerce.date()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantityOrdered: z.number().int().positive(),
    unitCost: z.number().nonnegative(),
  })).min(1),
});

const receivePurchaseOrderBodySchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantityReceived: z.number().int().nonnegative(),
  })).optional().default([]),
  locationId: z.string().optional(),
});

// Cost columns are varchar (decimal precision), but clients send numbers.
// Accept both and normalize to string so validation doesn't 400 on numeric input.
const costString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, { message: "Must be a non-negative number" });

const purchaseOrderItemBodySchema = insertPurchaseOrderItemSchema.extend({
  unitCost: costString,
  totalCost: costString,
});

const updatePurchaseOrderBodySchema = insertPurchaseOrderSchema
  .partial()
  .extend({ totalAmount: costString.optional() });

export interface PurchaseOrdersRoutesDeps {
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
 * Create the purchase orders router. Mount at /api.
 * Routes: GET/POST/PUT/DELETE /purchase-orders, GET /purchase-orders/:poId/items,
 * POST /purchase-orders/:id/receive, POST/PUT/DELETE /purchase-order-items
 */
export function createPurchaseOrdersRouter(deps: PurchaseOrdersRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createPurchaseOrdersController(storage);

  router.post("/purchase-orders", authMiddleware, validateBody(createPurchaseOrderBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId || userId === "" || typeof userId !== "string") {
      return sendError(res, 400, "Valid User ID is required");
    }
    const { supplierId, expectedDelivery, notes, items } = req.body as z.infer<typeof createPurchaseOrderBodySchema>;
    const result = await controller.create(tenantId, userId, {
      supplierId,
      expectedDelivery: expectedDelivery != null ? String(expectedDelivery) : undefined,
      notes: notes ?? undefined,
      items,
    });
    if (!result.ok) return sendError(res, result.error === "supplierId and items are required" ? 400 : 500, result.error);
    res.json(result.data);
  });

  router.get("/purchase-orders", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const filters = { status: req.query.status as string, supplierId: req.query.supplierId as string };
    const result = await controller.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/purchase-orders/:poId/items", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getItems(req.params.poId, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/purchase-orders/:id/receive", authMiddleware, validateBody(receivePurchaseOrderBodySchema), async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId) return sendError(res, 400, "User ID required");
    const { items, locationId } = req.body as z.infer<typeof receivePurchaseOrderBodySchema>;
    const result = await controller.receive(req.params.id, userId, tenantId, { items, locationId });
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.get("/purchase-orders/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.put("/purchase-orders/:id", authMiddleware, validateBody(updatePurchaseOrderBodySchema), async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.update(req.params.id, tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.delete("/purchase-orders/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/purchase-order-items", authMiddleware, validateBody(purchaseOrderItemBodySchema), async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.createItem(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/purchase-order-items/:id", authMiddleware, validateBody(purchaseOrderItemBodySchema.partial()), async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.updateItem(req.params.id, tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.delete("/purchase-order-items/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.deleteItem(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
