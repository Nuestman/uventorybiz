import type { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { offlineStore } from "@/lib/offlineStore";
import type { SymptomLogRow, SymptomTypeRow } from "@/lib/symptoms/symptomCatalog";
import { resolveSymptomDisplayLabel } from "@shared/symptomCatalog";
import type {
  PortalSymptomLogPayload,
  SymptomOutboxItem,
} from "@/types/offlineSymptoms";
import {
  OFFLINE_SYMPTOM_LOG_PREFIX,
  isOfflineSymptomLogId,
} from "@/types/offlineSymptoms";

export const PORTAL_SYMPTOM_LOGS_QUERY_KEY = ["/api/portal/symptom-logs"] as const;
export const PORTAL_SYMPTOM_TYPES_QUERY_KEY = ["/api/portal/symptom-types"] as const;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function isLikelyNetworkFailure(error: unknown): boolean {
  if (isBrowserOffline()) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed") ||
      msg.startsWith("503:") ||
      msg.startsWith("502:")
    );
  }
  return false;
}

function symptomLogsCacheKey(patientId: string): string {
  return `portal|symptom-logs|${patientId}`;
}

function sortLogsNewestFirst(logs: SymptomLogRow[]): SymptomLogRow[] {
  return [...logs].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

function mergeLogs(server: SymptomLogRow[], local: SymptomLogRow[]): SymptomLogRow[] {
  const byId = new Map<string, SymptomLogRow>();
  for (const row of server) {
    byId.set(row.id, row);
  }
  for (const row of local) {
    if (row.pendingSync || isOfflineSymptomLogId(row.id)) {
      byId.set(row.id, row);
    }
  }
  return sortLogsNewestFirst(Array.from(byId.values()));
}

function normalizeLogRow(row: SymptomLogRow): SymptomLogRow {
  return {
    ...row,
    bodyLocation: row.bodyLocation ?? null,
    durationMinutes: row.durationMinutes ?? null,
    symptomQuality: row.symptomQuality ?? null,
    provocation: row.provocation ?? null,
    palliation: row.palliation ?? null,
    radiation: row.radiation ?? null,
    notes: row.notes ?? null,
    recordedAt:
      typeof row.recordedAt === "string"
        ? row.recordedAt
        : new Date(row.recordedAt as unknown as string).toISOString(),
    createdAt: row.createdAt
      ? typeof row.createdAt === "string"
        ? row.createdAt
        : new Date(row.createdAt as unknown as string).toISOString()
      : null,
  };
}

async function readLogsCache(patientId: string): Promise<SymptomLogRow[]> {
  const cached = await offlineStore.getSymptomLogsCache(symptomLogsCacheKey(patientId));
  return cached?.logs ?? [];
}

async function writeLogsCache(patientId: string, logs: SymptomLogRow[]): Promise<void> {
  await offlineStore.putSymptomLogsCache({
    key: symptomLogsCacheKey(patientId),
    patientId,
    logs: sortLogsNewestFirst(logs.map(normalizeLogRow)),
    cachedAt: new Date().toISOString(),
  });
}

async function queueOutboxItem(item: SymptomOutboxItem): Promise<void> {
  await offlineStore.putSymptomOutbox(item);
}

function buildOfflineLog(
  patientId: string,
  payload: PortalSymptomLogPayload,
  type: SymptomTypeRow,
): SymptomLogRow {
  const now = new Date().toISOString();
  return {
    id: `${OFFLINE_SYMPTOM_LOG_PREFIX}${generateId()}`,
    symptomTypeId: payload.symptomTypeId,
    symptomCode: type.code,
    symptomLabel: resolveSymptomDisplayLabel(type.code, type.label, payload.notes),
    recordedAt: payload.recordedAt,
    severity: payload.severity,
    bodyLocation: payload.bodyLocation,
    durationMinutes: payload.durationMinutes,
    symptomQuality: payload.symptomQuality,
    provocation: payload.provocation,
    palliation: payload.palliation,
    radiation: payload.radiation,
    notes: payload.notes,
    source: "patient_self",
    createdAt: now,
    canEdit: true,
    pendingSync: true,
  };
}

export async function fetchPortalSymptomTypesOfflineFirst(): Promise<SymptomTypeRow[]> {
  if (isBrowserOffline()) {
    const cached = await offlineStore.getSymptomTypesCache();
    return cached?.types ?? [];
  }

  try {
    const res = await fetch("/api/portal/symptom-types", { credentials: "include" });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    const types = (await res.json()) as SymptomTypeRow[];
    await offlineStore.putSymptomTypesCache({
      types,
      cachedAt: new Date().toISOString(),
    });
    return types;
  } catch (error) {
    const cached = await offlineStore.getSymptomTypesCache();
    if (cached?.types.length) {
      return cached.types;
    }
    throw error;
  }
}

export async function fetchPortalSymptomLogsOfflineFirst(
  patientId: string,
): Promise<SymptomLogRow[]> {
  if (isBrowserOffline()) {
    return readLogsCache(patientId);
  }

  try {
    const res = await fetch("/api/portal/symptom-logs", { credentials: "include" });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    const serverRows = ((await res.json()) as SymptomLogRow[]).map(normalizeLogRow);
    const localPending = (await readLogsCache(patientId)).filter(
      (row) => row.pendingSync || isOfflineSymptomLogId(row.id),
    );
    const merged = mergeLogs(serverRows, localPending);
    await writeLogsCache(patientId, merged);
    return merged;
  } catch (error) {
    const cached = await readLogsCache(patientId);
    if (cached.length) {
      return cached;
    }
    if (isLikelyNetworkFailure(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchPortalSymptomLogsByTypeOfflineFirst(
  patientId: string,
  symptomTypeId: string,
): Promise<SymptomLogRow[]> {
  const all = await fetchPortalSymptomLogsOfflineFirst(patientId);
  return all.filter((row) => row.symptomTypeId === symptomTypeId);
}

async function saveSymptomLogOffline(
  patientId: string,
  payload: PortalSymptomLogPayload,
  type: SymptomTypeRow,
): Promise<SymptomLogRow> {
  const row = buildOfflineLog(patientId, payload, type);
  const existing = await readLogsCache(patientId);
  await writeLogsCache(patientId, [row, ...existing]);
  await queueOutboxItem({
    id: generateId(),
    kind: "create",
    patientId,
    logId: row.id,
    requestBody: { ...payload },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  return row;
}

async function updateSymptomLogOffline(
  patientId: string,
  logId: string,
  payload: PortalSymptomLogPayload,
  type: SymptomTypeRow,
): Promise<SymptomLogRow> {
  const existing = await readLogsCache(patientId);
  const index = existing.findIndex((row) => row.id === logId);
  if (index < 0) {
    throw new Error("Symptom log not found");
  }

  const updated: SymptomLogRow = {
    ...existing[index],
    symptomTypeId: payload.symptomTypeId,
    symptomCode: type.code,
    symptomLabel: resolveSymptomDisplayLabel(type.code, type.label, payload.notes),
    recordedAt: payload.recordedAt,
    severity: payload.severity,
    bodyLocation: payload.bodyLocation,
    durationMinutes: payload.durationMinutes,
    symptomQuality: payload.symptomQuality,
    provocation: payload.provocation,
    palliation: payload.palliation,
    radiation: payload.radiation,
    notes: payload.notes,
    pendingSync: true,
  };

  const next = [...existing];
  next[index] = updated;
  await writeLogsCache(patientId, next);

  if (isOfflineSymptomLogId(logId)) {
    const outbox = await offlineStore.getSymptomOutbox();
    const createItem = outbox.find((item) => item.kind === "create" && item.logId === logId);
    if (createItem) {
      await queueOutboxItem({
        ...createItem,
        requestBody: { ...payload },
      });
    }
  } else {
    await queueOutboxItem({
      id: generateId(),
      kind: "update",
      patientId,
      logId,
      requestBody: { ...payload },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  }

  return updated;
}

async function deleteSymptomLogOffline(patientId: string, logId: string): Promise<void> {
  const existing = await readLogsCache(patientId);
  await writeLogsCache(
    patientId,
    existing.filter((row) => row.id !== logId),
  );

  const outbox = await offlineStore.getSymptomOutbox();
  if (isOfflineSymptomLogId(logId)) {
    for (const item of outbox) {
      if (item.logId === logId) {
        await offlineStore.removeSymptomOutbox(item.id);
      }
    }
    return;
  }

  await queueOutboxItem({
    id: generateId(),
    kind: "delete",
    patientId,
    logId,
    requestBody: {},
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

export async function createPortalSymptomLogOfflineFirst(
  patientId: string,
  payload: PortalSymptomLogPayload,
  types: SymptomTypeRow[],
): Promise<SymptomLogRow> {
  const type = types.find((t) => t.id === payload.symptomTypeId);
  if (!type) {
    throw new Error("Invalid symptom type");
  }
  if (type.code === "other" && !(payload.notes?.trim())) {
    throw new Error("Please enter a symptom name when selecting Other");
  }

  if (!isBrowserOffline()) {
    try {
      const res = await apiRequest("POST", "/api/portal/symptom-logs", payload);
      const created = normalizeLogRow((await res.json()) as SymptomLogRow);
      const cached = await readLogsCache(patientId);
      await writeLogsCache(patientId, mergeLogs([created], cached));
      return created;
    } catch (error) {
      if (!isLikelyNetworkFailure(error)) {
        throw error;
      }
    }
  }

  return saveSymptomLogOffline(patientId, payload, type);
}

export async function createPortalSymptomLogsBatchOfflineFirst(
  patientId: string,
  payloads: PortalSymptomLogPayload[],
  types: SymptomTypeRow[],
): Promise<SymptomLogRow[]> {
  const created: SymptomLogRow[] = [];
  for (const payload of payloads) {
    const row = await createPortalSymptomLogOfflineFirst(patientId, payload, types);
    created.push(row);
  }
  return created;
}

export async function updatePortalSymptomLogOfflineFirst(
  patientId: string,
  logId: string,
  payload: PortalSymptomLogPayload,
  types: SymptomTypeRow[],
): Promise<SymptomLogRow> {
  const type = types.find((t) => t.id === payload.symptomTypeId);
  if (!type) {
    throw new Error("Invalid symptom type");
  }
  if (type.code === "other" && !(payload.notes?.trim())) {
    throw new Error("Please enter a symptom name when selecting Other");
  }

  if (!isBrowserOffline() && !isOfflineSymptomLogId(logId)) {
    try {
      const res = await apiRequest("PATCH", `/api/portal/symptom-logs/${logId}`, payload);
      const updated = normalizeLogRow((await res.json()) as SymptomLogRow);
      const cached = await readLogsCache(patientId);
      await writeLogsCache(
        patientId,
        cached.map((row) => (row.id === logId ? updated : row)),
      );
      return updated;
    } catch (error) {
      if (!isLikelyNetworkFailure(error)) {
        throw error;
      }
    }
  }

  return updateSymptomLogOffline(patientId, logId, payload, type);
}

export async function deletePortalSymptomLogOfflineFirst(
  patientId: string,
  logId: string,
): Promise<void> {
  if (!isBrowserOffline() && !isOfflineSymptomLogId(logId)) {
    try {
      await apiRequest("DELETE", `/api/portal/symptom-logs/${logId}`);
      const cached = await readLogsCache(patientId);
      await writeLogsCache(
        patientId,
        cached.filter((row) => row.id !== logId),
      );
      return;
    } catch (error) {
      if (!isLikelyNetworkFailure(error)) {
        throw error;
      }
    }
  }

  await deleteSymptomLogOffline(patientId, logId);
}

async function remapSymptomLogAfterSync(
  patientId: string,
  localId: string,
  serverRow: SymptomLogRow,
): Promise<void> {
  const cached = await readLogsCache(patientId);
  const remapped = cached.map((row) => (row.id === localId ? normalizeLogRow(serverRow) : row));
  await writeLogsCache(patientId, remapped);

  const outbox = await offlineStore.getSymptomOutbox();
  for (const item of outbox) {
    if (item.logId !== localId) continue;
    if (item.kind === "create") continue;
    await queueOutboxItem({
      ...item,
      logId: serverRow.id,
    });
  }
}

export async function getSymptomOutboxCount(): Promise<number> {
  return (await offlineStore.getSymptomOutbox()).length;
}

export async function syncPortalSymptomOutbox(queryClient: QueryClient): Promise<number> {
  if (isBrowserOffline()) return 0;

  const items = (await offlineStore.getSymptomOutbox()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  if (!items.length) return 0;

  let synced = 0;

  for (const item of items) {
    try {
      if (item.kind === "create") {
        const res = await apiRequest("POST", "/api/portal/symptom-logs", item.requestBody);
        const serverRow = normalizeLogRow((await res.json()) as SymptomLogRow);
        await remapSymptomLogAfterSync(item.patientId, item.logId, serverRow);
        await offlineStore.removeSymptomOutbox(item.id);
        synced++;
        continue;
      }

      if (isOfflineSymptomLogId(item.logId)) {
        continue;
      }

      if (item.kind === "update") {
        await apiRequest("PATCH", `/api/portal/symptom-logs/${item.logId}`, item.requestBody);
        await offlineStore.removeSymptomOutbox(item.id);
        synced++;
        continue;
      }

      if (item.kind === "delete") {
        await apiRequest("DELETE", `/api/portal/symptom-logs/${item.logId}`);
        await offlineStore.removeSymptomOutbox(item.id);
        synced++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await offlineStore.putSymptomOutbox({
        ...item,
        retryCount: item.retryCount + 1,
        lastError: message,
      });
      if (!isLikelyNetworkFailure(error)) {
        break;
      }
    }
  }

  if (synced > 0) {
    void queryClient.invalidateQueries({ queryKey: [...PORTAL_SYMPTOM_LOGS_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [...PORTAL_SYMPTOM_TYPES_QUERY_KEY] });
  }

  return synced;
}
