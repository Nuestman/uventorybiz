import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { buildReleaseNotesStatus, getCurrentAppVersion } from "./release-notes.service";

const acknowledgeSchema = z.object({
  version: z.string().min(1).max(32),
});

export function createReleaseNotesRouter(deps: {
  authMiddleware: RequestHandler;
  storage: IStorage;
}): Router {
  const router = Router();
  const { authMiddleware, storage } = deps;

  router.get("/release-notes/status", authMiddleware, async (req: any, res) => {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      sendError(res, 401, "Authentication required");
      return;
    }
    const user = await storage.getUser(userId);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }
    res.json(buildReleaseNotesStatus("staff", user.lastAcknowledgedReleaseVersion));
  });

  router.post(
    "/release-notes/acknowledge",
    authMiddleware,
    validateBody(acknowledgeSchema),
    async (req: any, res) => {
      const userId = req.user?.id as string | undefined;
      if (!userId) {
        sendError(res, 401, "Authentication required");
        return;
      }
      const currentVersion = getCurrentAppVersion();
      const body = req.body as z.infer<typeof acknowledgeSchema>;
      if (body.version !== currentVersion) {
        sendError(res, 400, "Version mismatch");
        return;
      }
      await storage.updateUser(userId, { lastAcknowledgedReleaseVersion: currentVersion });
      res.json(buildReleaseNotesStatus("staff", currentVersion));
    },
  );

  return router;
}
