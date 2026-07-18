import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { createStockRequisitionsController } from "./stock-requisitions.controller";

const createStockRequisitionBodySchema = z.object({
  requestingLocationId: z.string().min(1),
  fulfillingLocationId: z.string().min(1),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    requestedQuantity: z.number().int().positive(),
    unitOfMeasure: z.string().optional(),
    unitCost: z.string().optional(),
  })).min(1),
});

const updateStockRequisitionBodySchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({ itemId: z.string(), requestedQuantity: z.number().int().nonnegative() })).optional(),
  locationId: z.string().optional(),
});

export interface StockRequisitionsRoutesDeps {
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

function statusFromCode(code?: string): number {
  if (code === "NOT_FOUND") return 404;
  if (code === "FORBIDDEN") return 403;
  if (code === "BAD_REQUEST") return 400;
  return 500;
}

/**
 * Create the stock requisitions router. Mount at /api.
 * Routes: GET/POST /stock-requisitions, PUT /stock-requisitions/:id
 */
export function createStockRequisitionsRouter(deps: StockRequisitionsRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createStockRequisitionsController(storage);

  router.get("/stock-requisitions", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { status, requestingLocationId, fulfillingLocationId } = req.query as {
      status?: string;
      requestingLocationId?: string;
      fulfillingLocationId?: string;
    };
    const result = await controller.list(tenantId, { status, requestingLocationId, fulfillingLocationId });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/stock-requisitions", authMiddleware, validateBody(createStockRequisitionBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId) return sendError(res, 400, "User ID is required");
    const { requestingLocationId, fulfillingLocationId, notes, items } = req.body as z.infer<typeof createStockRequisitionBodySchema>;
    const result = await controller.create(tenantId, userId, {
      requestingLocationId,
      fulfillingLocationId,
      notes: notes ?? undefined,
      items,
    });
    if (!result.ok) return sendError(res, result.error.includes("required") ? 400 : 500, result.error);
    res.json(result.data);
  });

  router.put("/stock-requisitions/:id", authMiddleware, validateBody(updateStockRequisitionBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { id } = req.params;
    const body = req.body as z.infer<typeof updateStockRequisitionBodySchema>;
    const result = await controller.update(id, tenantId, {
      status: body.status,
      notes: body.notes ?? undefined,
      items: body.items,
      locationId: body.locationId,
    });
    if (!result.ok) return sendError(res, statusFromCode(result.code), result.error);
    res.json(result.data);
  });

  return router;
}
