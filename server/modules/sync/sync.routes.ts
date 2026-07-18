import type { Router, Request, Response } from "express";
import { Router as createRouter } from "express";
import { sendError } from "../../shared/errors";

interface SyncOperationPayload {
  id: string;
  entityType: string;
  operationType: string;
  tenantId: string;
  userId: string;
  entityId?: string;
  clientId?: string;
  baseVersion?: number | string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export function createSyncRouter(): Router {
  const router = createRouter();

  // Minimal sync endpoint: accepts a batch of operations and echoes back which were "applied".
  // In this first iteration we don't mutate domain tables yet – this is primarily to
  // verify that offline-queued operations are correctly pushed from the client.
  router.post(
    "/sync/operations",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const operations = (req.body?.operations ?? []) as SyncOperationPayload[];

        if (!Array.isArray(operations)) {
          sendError(res, 400, "Invalid payload: operations must be an array");
          return;
        }

        // For now, simply log the operations and mark all as applied.
        if (process.env.NODE_ENV !== "test") {
          // eslint-disable-next-line no-console
          console.log(
            `[Sync] Received ${operations.length} operations`,
            operations.map((op) => ({
              id: op.id,
              entityType: op.entityType,
              operationType: op.operationType,
            })),
          );
        }

        res.json({
          appliedOperationIds: operations.map((op) => op.id),
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[Sync] Error processing operations:", error);
        sendError(res, 500, "Failed to process sync operations");
      }
    },
  );

  return router;
}

