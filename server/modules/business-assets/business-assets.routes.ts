import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  createBusinessAssetSchema,
  updateBusinessAssetSchema,
} from "@shared/schema";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { requireFleetModuleAccess } from "../../shared/middleware/ambulanceAuth";
import { requireFeature } from "../feature-flags/feature-flags.routes";
import {
  createBusinessAsset,
  getBusinessAsset,
  listBusinessAssetOptions,
  listBusinessAssets,
  retireBusinessAsset,
  updateBusinessAsset,
} from "./business-assets.service";

export interface BusinessAssetsRoutesDeps {
  authMiddleware: RequestHandler;
}

function assetWriteErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  if (msg.includes("business_assets_tenant_tag_unique") || msg.includes("duplicate key")) {
    return "Could not assign a unique asset tag. Refresh and try again.";
  }
  // Avoid dumping raw Drizzle "Failed query: …" into the UI.
  if (msg.startsWith("Failed query:")) return fallback;
  return msg;
}

/**
 * Business assets register. Mount at /api.
 * GET /business-assets/options — any authenticated tenant user (ticket pickers).
 * Remaining routes — fleet feature + fleet module access.
 */
export function createBusinessAssetsRouter(deps: BusinessAssetsRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const crudGate = [authMiddleware, requireFeature("fleet"), requireFleetModuleAccess()];

  router.get("/business-assets/options", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId as string | undefined;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    try {
      const includeId =
        typeof req.query.includeId === "string" && req.query.includeId.trim()
          ? req.query.includeId.trim()
          : undefined;
      const data = await listBusinessAssetOptions(tenantId, includeId);
      res.json(data);
    } catch (err) {
      console.error("business-assets options:", err);
      sendError(res, 500, err instanceof Error ? err.message : "Failed to load asset options");
    }
  });

  router.get("/business-assets", ...crudGate, async (req: any, res) => {
    const tenantId = req.user?.tenantId as string | undefined;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    try {
      const data = await listBusinessAssets(tenantId, {
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        assetType: typeof req.query.assetType === "string" ? req.query.assetType : undefined,
        locationId: typeof req.query.locationId === "string" ? req.query.locationId : undefined,
        assignedLocationId:
          typeof req.query.assignedLocationId === "string" ? req.query.assignedLocationId : undefined,
        stockLocationId:
          typeof req.query.stockLocationId === "string" ? req.query.stockLocationId : undefined,
        includeRetired: req.query.includeRetired === "1" || req.query.includeRetired === "true",
      });
      res.json(data);
    } catch (err) {
      console.error("business-assets list:", err);
      sendError(res, 500, err instanceof Error ? err.message : "Failed to list assets");
    }
  });

  router.get("/business-assets/:id", ...crudGate, async (req: any, res) => {
    const tenantId = req.user?.tenantId as string | undefined;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    try {
      const row = await getBusinessAsset(req.params.id, tenantId);
      if (!row) return sendError(res, 404, "Asset not found");
      res.json(row);
    } catch (err) {
      console.error("business-assets get:", err);
      sendError(res, 500, err instanceof Error ? err.message : "Failed to load asset");
    }
  });

  router.post(
    "/business-assets",
    ...crudGate,
    validateBody(createBusinessAssetSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId as string | undefined;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      try {
        const row = await createBusinessAsset(
          tenantId,
          req.body as z.infer<typeof createBusinessAssetSchema>,
        );
        res.status(201).json(row);
      } catch (err) {
        console.error("business-assets create:", err);
        sendError(res, 400, assetWriteErrorMessage(err, "Failed to create asset"));
      }
    },
  );

  router.patch(
    "/business-assets/:id",
    ...crudGate,
    validateBody(updateBusinessAssetSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId as string | undefined;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      try {
        if (req.body?.assetTag !== undefined) {
          return sendError(res, 400, "Asset tag cannot be changed");
        }
        const row = await updateBusinessAsset(
          req.params.id,
          tenantId,
          req.body as z.infer<typeof updateBusinessAssetSchema>,
        );
        if (!row) return sendError(res, 404, "Asset not found");
        res.json(row);
      } catch (err) {
        console.error("business-assets update:", err);
        sendError(res, 400, assetWriteErrorMessage(err, "Failed to update asset"));
      }
    },
  );

  router.delete("/business-assets/:id", ...crudGate, async (req: any, res) => {
    const tenantId = req.user?.tenantId as string | undefined;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    try {
      const row = await retireBusinessAsset(req.params.id, tenantId);
      if (!row) return sendError(res, 404, "Asset not found");
      res.json(row);
    } catch (err) {
      console.error("business-assets retire:", err);
      sendError(res, 400, assetWriteErrorMessage(err, "Failed to retire asset"));
    }
  });

  return router;
}
