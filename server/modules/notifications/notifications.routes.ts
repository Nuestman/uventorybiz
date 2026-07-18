import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createNotificationsController } from "./notifications.controller";

export interface NotificationsRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Create the notifications router. Mount at /api.
 * Routes: /api/notifications, /api/notifications/unread-count, /api/notifications/read-all,
 * /api/notifications/:id/read,
 * /api/notification-types, /api/notification-preferences (GET, PUT)
 */
export function createNotificationsRouter(deps: NotificationsRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createNotificationsController(storage);

  router.get("/notifications", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return res.json([]);
    const channel = req.query.channel as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const limitRaw = req.query.limit;
    const limitParsed =
      limitRaw !== undefined && limitRaw !== "" ? parseInt(String(limitRaw), 10) : NaN;
    const limit = Number.isFinite(limitParsed) ? limitParsed : undefined;
    const unreadRaw = req.query.unreadOnly;
    const unreadOnly =
      unreadRaw === "true" ||
      unreadRaw === "1" ||
      (Array.isArray(unreadRaw) && String(unreadRaw[0]).toLowerCase() === "true");
    const result = await controller.list(userId, tenantId, {
      channel,
      status: statusFilter,
      limit,
      unreadOnly: unreadOnly ? true : undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/notifications/unread-count", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return res.json({ count: 0 });
    const channel = req.query.channel as string | undefined;
    const result = await controller.unreadCount(userId, tenantId, channel ? { channel } : undefined);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/notifications/read-all", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return sendError(res, 401, "Unauthorized");
    const channel = req.query.channel as string | undefined;
    const result = await controller.markAllRead(userId, tenantId, channel ? { channel } : undefined);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/notifications/:id/read", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 401, "Unauthorized");
    const result = await controller.markRead(req.params.id, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/notification-types", authMiddleware, async (req: any, res) => {
    const category = req.query.category as string | undefined;
    const result = await controller.getTypes(category);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/notification-preferences", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const result = await controller.getPreferences(userId, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/notification-preferences", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId) return sendError(res, 400, "User must be associated with a tenant");
    const { preferences } = req.body;
    const result = await controller.updatePreferences(userId, tenantId, preferences ?? []);
    if (!result.ok) {
      if (result.error === "Preferences must be an array") return sendError(res, 400, result.error);
      return sendError(res, 500, result.error);
    }
    res.json({
      success: true,
      message: "Preferences updated successfully",
      updatedCount: result.data.updatedCount,
    });
  });

  return router;
}
