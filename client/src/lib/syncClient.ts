import { apiRequest } from "@/lib/queryClient";
import { offlineStore } from "@/lib/offlineStore";
import type { SyncOperation, EntityType, OperationType } from "@/types/sync";

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `op_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export interface QueueOperationInput {
  entityType: EntityType;
  operationType: OperationType;
  tenantId: string;
  userId: string;
  entityId?: string;
  clientId?: string;
  baseVersion?: number | string;
  payload: Record<string, unknown>;
}

function buildOperation(input: QueueOperationInput): SyncOperation {
  return {
    id: generateId(),
    entityType: input.entityType,
    operationType: input.operationType,
    tenantId: input.tenantId,
    userId: input.userId,
    entityId: input.entityId,
    clientId: input.clientId,
    baseVersion: input.baseVersion,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

export async function queueOfflineOperation(input: QueueOperationInput) {
  const operation = buildOperation(input);
  await offlineStore.queueOperation(operation);
  return operation;
}

/** Queue sync op + local triage row in one IndexedDB transaction (offline triage save). */
export async function queueOfflineTriageWithLocalRow(
  input: QueueOperationInput,
  triageRecord: Record<string, unknown>,
) {
  const operation = buildOperation(input);
  await offlineStore.queueTriageAndPendingOperation(operation, triageRecord);
  return operation;
}

export async function getPendingOperations(limit?: number) {
  return offlineStore.getPendingOperations(limit);
}

export async function markOperationCompleted(id: string) {
  await offlineStore.removeOperation(id);
}

export async function incrementOperationRetry(
  id: string,
  lastError?: string,
) {
  const operations = await offlineStore.getPendingOperations();
  const op = operations.find((o) => o.id === id);
  if (!op) return;

  const updated: SyncOperation = {
    ...op,
    retryCount: op.retryCount + 1,
    lastError,
  };

  await offlineStore.queueOperation(updated);
}

/**
 * Run a single sync cycle.
 * Phase 1: this is a placeholder that will later:
 * - Push queued operations to /api/sync/changes
 * - Pull server changes from /api/sync/changes?since=...
 */
export async function runSyncOnce() {
  if (!isOnline()) {
    return;
  }

  const pending = await getPendingOperations();
  if (!pending.length) return;

  try {
    const res = await apiRequest("POST", "/api/sync/operations", {
      operations: pending,
    });
    const body = (await res.json()) as {
      appliedOperationIds?: string[];
    };
    const applied = body.appliedOperationIds ?? [];
    for (const id of applied) {
      await markOperationCompleted(id);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Sync failed", error);
    // We leave operations in the queue; they will be retried on next run.
  }
}

