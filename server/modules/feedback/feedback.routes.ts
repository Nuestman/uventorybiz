import { Router } from "express";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createFeedbackController } from "./feedback.controller";

/**
 * Create the feedback router. Mount at /api.
 * Routes: POST /api/feedback (public, no auth required)
 */
export function createFeedbackRouter(): Router {
  const router = Router();
  const controller = createFeedbackController(storage);

  router.post("/feedback", async (req: any, res) => {
    const {
      feedback: comment,
      email: contactEmail,
      context,
      path,
      uxRating,
      uiRating,
      navigationRating,
      speedRating,
      reliabilityRating,
      npsScore,
      areasUsed,
      recommendation,
    } = req.body || {};

    if (
      !comment &&
      !uxRating &&
      !uiRating &&
      !navigationRating &&
      !speedRating &&
      !reliabilityRating &&
      !npsScore &&
      !recommendation
    ) {
      return sendError(res, 400, "Feedback payload is empty");
    }

    const userId = req.user?.id ?? null;
    const tenantId = req.user?.tenantId ?? null;

    const result = await controller.create({
      userId,
      tenantId,
      path: path || req.path || req.originalUrl || "/",
      context: context || null,
      kind: "global",
      uxRating: uxRating ?? null,
      uiRating: uiRating ?? null,
      navigationRating: navigationRating ?? null,
      speedRating: speedRating ?? null,
      reliabilityRating: reliabilityRating ?? null,
      npsScore: npsScore ?? (recommendation ?? null),
      areasUsed: Array.isArray(areasUsed) ? areasUsed : null,
      comment: comment || null,
      contactEmail: contactEmail || null,
    });

    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json({ success: true, id: result.data.id });
  });

  return router;
}
