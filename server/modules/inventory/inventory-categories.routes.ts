import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { INVENTORY_FIELD_TEMPLATES } from "@shared/inventoryCategories";
import { createInventoryCategoriesController } from "./inventory-categories.controller";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
  itemCodePrefix: z.string().min(2).max(8),
  fieldTemplate: z.enum(INVENTORY_FIELD_TEMPLATES as [string, ...string[]]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: z.string().min(1).max(64).optional(),
    itemCodePrefix: z.string().min(2).max(8).optional(),
    fieldTemplate: z.enum(INVENTORY_FIELD_TEMPLATES as [string, ...string[]]).optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "No fields to update" });

export interface InventoryCategoriesRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
}

export function createInventoryCategoriesRouter(deps: InventoryCategoriesRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createInventoryCategoriesController(storage);

  router.get("/inventory-categories", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const includeInactive = req.query.includeInactive === "true";
    const result = await controller.list(tenantId, { includeInactive });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/inventory-categories",
    authMiddleware,
    requireAdmin,
    validateBody(createSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body);
      if (!result.ok) return sendError(res, result.code === "INVALID" ? 400 : 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.patch(
    "/inventory-categories/:id",
    authMiddleware,
    requireAdmin,
    validateBody(patchSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "INVALID") return sendError(res, 400, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/inventory-categories/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "IN_USE" || result.code === "SYSTEM") return sendError(res, 409, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
