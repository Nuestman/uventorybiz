import type { IStorage } from "../../storage";

export type FeedbackResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Input for creating feedback (matches what route builds from req.body). */
export interface CreateFeedbackInput {
  userId: string | null;
  tenantId: string | null;
  path: string;
  context: string | null;
  kind: string;
  uxRating: number | null;
  uiRating: number | null;
  navigationRating: number | null;
  speedRating: number | null;
  reliabilityRating: number | null;
  npsScore: number | null;
  areasUsed: string[] | null;
  comment: string | null;
  contactEmail: string | null;
}

/**
 * Feedback controller: create. No req/res; returns result objects.
 * Public endpoint (no auth required); route passes userId/tenantId from req.user when present.
 */
export function createFeedbackController(storage: IStorage) {
  return {
    async create(input: CreateFeedbackInput): Promise<FeedbackResult<{ id: string }>> {
      try {
        const created = await storage.createFeedback(input);
        return { ok: true, data: { id: created.id } };
      } catch (err) {
        console.error("Feedback controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to submit feedback",
        };
      }
    },
  };
}

export type FeedbackController = ReturnType<typeof createFeedbackController>;
