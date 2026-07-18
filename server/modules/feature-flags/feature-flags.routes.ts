import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import {
  getFeatureFlags,
  isFeatureEnabled,
  isKnownFeatureKey,
  listFeatureFlags,
  setFeatureFlag,
  type PlatformFeatureKey,
} from "./feature-flags.service";

const updateFlagSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Path gate for a platform feature. Mount ahead of the feature's routers:
 *   app.use("/api/appointments", requireFeature("appointments"));
 */
export function requireFeature(key: PlatformFeatureKey): RequestHandler {
  return async (_req, res, next) => {
    try {
      if (await isFeatureEnabled(key)) return next();
    } catch (err) {
      console.error(`Feature gate check failed for "${key}":`, err);
      return next();
    }
    return sendError(res, 403, "This feature is currently disabled by the platform administrator", {
      code: "FEATURE_DISABLED",
    });
  };
}

export interface FeatureFlagsRoutesDeps {
  authMiddleware: RequestHandler;
  requireSuperAdmin: RequestHandler;
}

/**
 * Create the feature flags router. Mount at /api.
 * Routes:
 *   GET  /feature-flags                     — public enabled/disabled map (drives client nav/routes)
 *   GET  /super-admin/feature-flags         — detailed list for the platform admin console
 *   PATCH /super-admin/feature-flags/:key   — toggle a flag
 */
export function createFeatureFlagsRouter(deps: FeatureFlagsRoutesDeps): Router {
  const { authMiddleware, requireSuperAdmin } = deps;
  const router = Router();

  router.get("/feature-flags", async (_req, res) => {
    const flags = await getFeatureFlags();
    res.json(flags);
  });

  router.get("/super-admin/feature-flags", authMiddleware, requireSuperAdmin, async (_req, res) => {
    try {
      const flags = await listFeatureFlags();
      res.json(flags);
    } catch (err) {
      console.error("Feature flags list failed:", err);
      sendError(res, 500, "Failed to load feature flags");
    }
  });

  router.patch(
    "/super-admin/feature-flags/:key",
    authMiddleware,
    requireSuperAdmin,
    validateBody(updateFlagSchema),
    async (req: any, res) => {
      const key = req.params.key as string;
      if (!isKnownFeatureKey(key)) return sendError(res, 404, "Unknown feature flag");
      try {
        const updated = await setFeatureFlag(key, (req.body as z.infer<typeof updateFlagSchema>).enabled, req.user?.id ?? "unknown");
        res.json(updated);
      } catch (err) {
        console.error("Feature flag update failed:", err);
        sendError(res, 500, "Failed to update feature flag");
      }
    },
  );

  return router;
}
