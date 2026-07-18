import type { SymptomLogEntry, SymptomType } from "@shared/schema";
import { resolveSymptomDisplayLabel } from "@shared/symptomCatalog";
import type { IStorage } from "../../storage";
import type {
  PortalSymptomLogCreate,
  PortalSymptomLogDto,
  PortalSymptomLogUpdate,
  PortalSymptomTypeDto,
} from "./portal-symptom-logs.schemas";

export const SYMPTOM_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const HIGH_RISK_SYMPTOM_CODES = new Set(["chest_pain", "shortness_of_breath"]);

export function canEditSymptomLog(entry: SymptomLogEntry, portalUserId: string): boolean {
  if (entry.portalUserId !== portalUserId) return false;
  if (!entry.createdAt) return false;
  return Date.now() - new Date(entry.createdAt).getTime() <= SYMPTOM_EDIT_WINDOW_MS;
}

export function shouldNotifyForSymptom(severity: number, symptomCode: string): boolean {
  return severity >= 4 || HIGH_RISK_SYMPTOM_CODES.has(symptomCode);
}

function toTypeDto(row: SymptomType): PortalSymptomTypeDto {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    category: row.category,
    sortOrder: row.sortOrder,
    isTenantSpecific: row.tenantId != null,
  };
}

export function summarizeSymptomLog(
  entry: SymptomLogEntry,
  type: SymptomType,
  options?: { portalUserId?: string },
): PortalSymptomLogDto {
  return {
    id: entry.id,
    symptomTypeId: entry.symptomTypeId,
    symptomCode: type.code,
    symptomLabel: resolveSymptomDisplayLabel(type.code, type.label, entry.notes),
    recordedAt: entry.recordedAt,
    severity: entry.severity,
    bodyLocation: entry.bodyLocation ?? null,
    durationMinutes: entry.durationMinutes ?? null,
    symptomQuality: entry.symptomQuality ?? null,
    provocation: entry.provocation ?? null,
    palliation: entry.palliation ?? null,
    radiation: entry.radiation ?? null,
    notes: entry.notes ?? null,
    source: entry.source ?? "patient_self",
    createdAt: entry.createdAt ?? null,
    canEdit: options?.portalUserId ? canEditSymptomLog(entry, options.portalUserId) : false,
  };
}

export async function listPortalSymptomTypes(
  storage: IStorage,
  tenantId: string,
): Promise<PortalSymptomTypeDto[]> {
  const rows = await storage.listSymptomTypes(tenantId);
  return rows.map(toTypeDto);
}

export async function listPortalSymptomLogs(
  storage: IStorage,
  tenantId: string,
  patientId: string,
  filters?: { from?: Date; to?: Date; symptomTypeId?: string; limit?: number },
  portalUserId?: string,
): Promise<PortalSymptomLogDto[]> {
  const rows = await storage.listSymptomLogEntries(tenantId, { patientId, ...filters });
  return rows.map(({ entry, type }) => summarizeSymptomLog(entry, type, { portalUserId }));
}

export async function createPortalSymptomLog(
  storage: IStorage,
  tenantId: string,
  patientId: string,
  portalUserId: string,
  body: PortalSymptomLogCreate,
): Promise<{ dto: PortalSymptomLogDto; notify: boolean; symptomCode: string }> {
  const type = await storage.getSymptomType(body.symptomTypeId, tenantId);
  if (!type || !type.isActive) {
    throw new Error("Invalid symptom type");
  }
  if (type.code === "other" && !(body.notes?.trim())) {
    throw new Error("Please enter a symptom name when selecting Other");
  }

  const entry = await storage.createSymptomLogEntry(
    {
      patientId,
      portalUserId,
      symptomTypeId: body.symptomTypeId,
      recordedAt: body.recordedAt ?? new Date(),
      severity: body.severity,
      bodyLocation: body.bodyLocation ?? null,
      durationMinutes: body.durationMinutes ?? null,
      symptomQuality: body.symptomQuality ?? null,
      provocation: body.provocation ?? null,
      palliation: body.palliation ?? null,
      radiation: body.radiation ?? null,
      notes: body.notes ?? null,
      source: "patient_self",
    },
    tenantId,
  );

  const dto = summarizeSymptomLog(entry, type, { portalUserId });
  return {
    dto,
    notify: shouldNotifyForSymptom(body.severity, type.code),
    symptomCode: type.code,
  };
}

export async function updatePortalSymptomLog(
  storage: IStorage,
  tenantId: string,
  portalUserId: string,
  entryId: string,
  body: PortalSymptomLogUpdate,
): Promise<PortalSymptomLogDto> {
  const existing = await storage.getSymptomLogEntry(entryId, tenantId);
  if (!existing) throw new Error("Symptom log not found");
  if (!canEditSymptomLog(existing.entry, portalUserId)) {
    throw new Error("This entry can no longer be edited");
  }

  const typeId = body.symptomTypeId ?? existing.entry.symptomTypeId;
  const type = await storage.getSymptomType(typeId, tenantId);
  if (!type || !type.isActive) throw new Error("Invalid symptom type");

  const notes = body.notes !== undefined ? body.notes : existing.entry.notes;
  if (type.code === "other" && !(notes?.trim())) {
    throw new Error("Please enter a symptom name when selecting Other");
  }

  const updated = await storage.updateSymptomLogEntry(
    entryId,
    tenantId,
    {
      ...(body.symptomTypeId !== undefined ? { symptomTypeId: body.symptomTypeId } : {}),
      ...(body.recordedAt !== undefined ? { recordedAt: body.recordedAt } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.bodyLocation !== undefined ? { bodyLocation: body.bodyLocation } : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
      ...(body.symptomQuality !== undefined ? { symptomQuality: body.symptomQuality } : {}),
      ...(body.provocation !== undefined ? { provocation: body.provocation } : {}),
      ...(body.palliation !== undefined ? { palliation: body.palliation } : {}),
      ...(body.radiation !== undefined ? { radiation: body.radiation } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  );
  if (!updated) throw new Error("Symptom log not found");

  const refreshedType = await storage.getSymptomType(updated.symptomTypeId, tenantId);
  if (!refreshedType) throw new Error("Symptom type not found");

  return summarizeSymptomLog(updated, refreshedType, { portalUserId });
}

export async function deletePortalSymptomLog(
  storage: IStorage,
  tenantId: string,
  portalUserId: string,
  entryId: string,
): Promise<void> {
  const existing = await storage.getSymptomLogEntry(entryId, tenantId);
  if (!existing) throw new Error("Symptom log not found");
  if (!canEditSymptomLog(existing.entry, portalUserId)) {
    throw new Error("This entry can no longer be deleted");
  }
  await storage.deleteSymptomLogEntry(entryId, tenantId);
}
