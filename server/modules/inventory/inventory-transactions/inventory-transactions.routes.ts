import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertInventoryTransactionSchema } from "@shared/schema";
import { createInventoryTransactionsController } from "./inventory-transactions.controller";

// createdBy is resolved from the session (never sent by clients), and unit/total cost
// arrive as numbers from the UI while the columns are varchar — the controller converts
// them to strings before persisting.
const moneyInput = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v) && v >= 0, { message: "Must be a non-negative number" })
  .nullish();

const transactionBodySchema = insertInventoryTransactionSchema
  .omit({ createdBy: true, transactionDate: true })
  .extend({
    unitCost: moneyInput,
    totalCost: moneyInput,
  });

export interface InventoryTransactionsRoutesDeps {
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
 * Create the inventory transactions router. Mount at /api.
 * Routes: GET/POST /inventory-transactions, PUT/DELETE /inventory-transactions/:id
 */
export function createInventoryTransactionsRouter(deps: InventoryTransactionsRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createInventoryTransactionsController(storage);

  router.get("/inventory-transactions", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { itemId, documentType, documentId } = req.query as Record<string, string | undefined>;
    const result = await controller.list(tenantId, { itemId, documentType, documentId });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/inventory-transactions", authMiddleware, validateBody(transactionBodySchema), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const userId = req.user?.id;
    if (!userId || userId === "" || typeof userId !== "string") {
      return sendError(res, 400, "Valid User ID is required");
    }
    const result = await controller.create(tenantId, userId, req.body);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, result.error.includes("required") ? 400 : 500, result.error);
    }
    res.json(result.data);
  });

  router.put("/inventory-transactions/:id", authMiddleware, validateBody(transactionBodySchema.partial()), async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.update(req.params.id, tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.delete("/inventory-transactions/:id", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
