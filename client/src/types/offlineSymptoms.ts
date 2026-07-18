import type { SymptomLogRow, SymptomTypeRow } from "@/lib/symptoms/symptomCatalog";

export type SymptomOutboxKind = "create" | "update" | "delete";

export interface SymptomOutboxItem {
  id: string;
  kind: SymptomOutboxKind;
  patientId: string;
  logId: string;
  requestBody: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface SymptomLogsCache {
  key: string;
  patientId: string;
  logs: SymptomLogRow[];
  cachedAt: string;
}

export interface SymptomTypesCache {
  types: SymptomTypeRow[];
  cachedAt: string;
}

export const OFFLINE_SYMPTOM_LOG_PREFIX = "offline_symptom_";

export function isOfflineSymptomLogId(id: string): boolean {
  return id.startsWith(OFFLINE_SYMPTOM_LOG_PREFIX);
}

export type PortalSymptomLogPayload = {
  symptomTypeId: string;
  recordedAt: string;
  severity: number;
  bodyLocation: string | null;
  durationMinutes: number | null;
  symptomQuality: string | null;
  provocation: string | null;
  palliation: string | null;
  radiation: string | null;
  notes: string | null;
};
