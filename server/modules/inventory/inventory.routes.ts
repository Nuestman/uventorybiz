import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertInventoryItemSchema, createInventoryCatalogItemSchema, updateInventoryCatalogItemSchema } from "@shared/schema";
import { createInventoryController } from "./inventory.controller";

// Stock-level fields live on inventory_stock, not inventory_items, so they are not part of
// insertInventoryItemSchema. They must be validated explicitly or zod strips them from the
// body and stock updates silently no-op.
const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .nullable();

const stockFieldsSchema = z
  .object({
    currentStock: z.coerce.number().int().min(0),
    minimumStock: z.coerce.number().int().min(0),
    maximumStock: z.coerce.number().int().min(0),
    reorderPoint: z.coerce.number().int().min(0),
    unitCost: decimalString,
    totalValue: decimalString,
    expiryDate: z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    batchNumber: z.string().nullable(),
    lotNumber: z.string().nullable(),
  })
  .partial();

const insertInventoryItemWithLocationSchema = insertInventoryItemSchema
  .merge(stockFieldsSchema)
  .extend({
    locationId: z.string().uuid(),
  });

const updateInventorySchema = insertInventoryItemSchema
  .partial()
  .merge(stockFieldsSchema)
  .extend({
    locationId: z.string().uuid().optional(),
  });

export interface InventoryRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware: RequestHandler;
  inventoryImageUpload: { single: (field: string) => RequestHandler };
}

/**
 * Create the inventory router. Mount at /api.
 * Routes: POST inventory-image-upload; GET/POST inventory, export, import, analytics, low-stock, expiring; GET/PUT/DELETE inventory/:id
 */
export function createInventoryRouter(deps: InventoryRoutesDeps): Router {
  const { authMiddleware, injectLocationMiddleware, inventoryImageUpload } = deps;
  const router = Router();
  const controller = createInventoryController(storage);
  const inventoryImageUploadMiddleware = inventoryImageUpload.single("image");

  router.post(
    "/inventory-image-upload",
    authMiddleware,
    (req: any, res: any, next: any) => {
      inventoryImageUploadMiddleware(req, res, (err: any) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message || "File upload error", error: err.code || "UPLOAD_ERROR" });
        }
        next();
      });
    },
    async (req: any, res: any) => {
      try {
        if (!req.file || !req.file.buffer) return sendError(res, 400, "No image uploaded");
        const tenantId = req.user?.tenantId;
        if (!tenantId) return sendError(res, 400, "User has no tenant association");
        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId,
          category: "inventory-images",
          itemName: req.file.originalname,
        });
        const imageUrl = await fileStorage.saveFile(uploadPath, req.file.buffer);
        return res.json({ imageUrl });
      } catch (error: any) {
        console.error("Error storing inventory image:", error);
        return res.status(500).json({
          message: "Failed to store inventory image",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  router.get("/inventory/export", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const category = req.query.category as string | undefined;
    const result = await controller.exportCsv(tenantId, category);
    if (!result.ok) return sendError(res, 500, result.error);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.data.filename}"`);
    res.send(result.data.csv);
  });

  router.get("/inventory/analytics", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.analytics(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/inventory/low-stock", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.lowStock(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/inventory/expiring", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const daysAhead = req.query.days ? parseInt(req.query.days as string) : 30;
    const result = await controller.expiring(tenantId, daysAhead);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/inventory/import", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const body = req.body;
    let rows: Record<string, unknown>[] = [];
    let locationId: string | undefined;
    if (Array.isArray(body)) {
      rows = body;
    } else if (body && typeof body === "object" && Array.isArray(body.items)) {
      rows = body.items;
      if (typeof body.locationId === "string" && body.locationId.trim()) {
        locationId = body.locationId.trim();
      }
    } else {
      return sendError(res, 400, "Send JSON body: { items: [], locationId } or a raw items array");
    }
    // Fall back: session active location → primary → first active fixed site
    if (!locationId) {
      try {
        const sessionToken =
          req.headers.authorization?.replace("Bearer ", "") || req.cookies?.sessionToken;
        if (sessionToken) {
          const session = await storage.getUserSession(sessionToken);
          locationId = session?.activeLocationId || undefined;
        }
        if (!locationId) {
          const primary = await storage.getPrimaryCareLocation(tenantId);
          locationId = primary?.id;
        }
        if (!locationId) {
          const first = await storage.getFirstActiveCareLocationForTenant(tenantId);
          locationId = first?.id;
        }
      } catch {
        /* ignore */
      }
    }
    if (!locationId) {
      return sendError(res, 400, "Store location is required for import. Select your working location.");
    }
    const result = await controller.import(tenantId, rows, locationId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json({ success: true, ...result.data });
  });

  router.post(
    "/inventory",
    authMiddleware,
    injectLocationMiddleware,
    validateBody(insertInventoryItemWithLocationSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertInventoryItemWithLocationSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  // Master catalog (inventory_items only — no location stock)
  router.get("/inventory-catalog", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.listCatalog(tenantId, {
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/inventory-catalog/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getCatalogItem(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    if (result.data === null) return sendError(res, 404, "Catalog item not found");
    res.json(result.data);
  });

  router.post(
    "/inventory-catalog",
    authMiddleware,
    validateBody(createInventoryCatalogItemSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.createCatalogItem(tenantId, req.body);
      if (!result.ok) return sendError(res, 400, result.error);
      res.status(201).json(result.data);
    }
  );

  router.put(
    "/inventory-catalog/:id",
    authMiddleware,
    validateBody(updateInventoryCatalogItemSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.updateCatalogItem(req.params.id, tenantId, req.body);
      if (!result.ok) {
        if (result.error === "Catalog item not found") return sendError(res, 404, result.error);
        return sendError(res, 400, result.error);
      }
      res.json(result.data);
    }
  );

  router.delete("/inventory-catalog/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.deleteCatalogItem(req.params.id, tenantId);
    if (!result.ok) {
      if (result.error === "Catalog item not found") return sendError(res, 404, result.error);
      return sendError(res, 400, result.error);
    }
    res.json(result.data);
  });

  router.get("/inventory", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const ambQ = req.query.ambulanceOnly;
    const ambulanceOnly =
      ambQ === "true" ||
      ambQ === true ||
      (Array.isArray(ambQ) && ambQ[0] === "true");
    const allLocations = req.query.allLocations === "true" || ambulanceOnly;
    let resolvedLocationId: string | undefined = typeof req.query.locationId === "string" ? req.query.locationId.trim() : undefined;
    if (!ambulanceOnly && !allLocations && !resolvedLocationId) {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "") || (req as any).cookies?.sessionToken;
      if (sessionToken) {
        const session = await storage.getUserSession(sessionToken);
        if (session?.activeLocationId) resolvedLocationId = session.activeLocationId;
      }
      if (!resolvedLocationId) {
        const tenant = await storage.getTenant(tenantId);
        if (tenant && !tenant.hasMultipleLocations) {
          const primary = await storage.getPrimaryCareLocation(tenantId);
          if (primary) resolvedLocationId = primary.id;
        }
      }
    }
    const filters = {
      category: req.query.category as string,
      status: req.query.status as string,
      lowStock: req.query.lowStock === "true",
      locationId: resolvedLocationId,
      locationKind: ambulanceOnly ? ("ambulance" as const) : undefined,
    };
    const result = await controller.list(tenantId, filters);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/inventory/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    if (result.data === null) return sendError(res, 404, "Inventory item not found");
    res.json(result.data);
  });

  router.put(
    "/inventory/:id",
    authMiddleware,
    injectLocationMiddleware,
    validateBody(updateInventorySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/inventory/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
