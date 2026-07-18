import type { VitalSigns } from "@shared/schema";
import type { IStorage } from "../../storage";
import type { PortalVitalSignCreate, PortalVitalSignDto } from "./portal-vital-signs.schemas";

export function summarizePortalVital(v: VitalSigns): PortalVitalSignDto {
  return {
    id: v.id,
    recordedAt: v.recordedAt,
    source: v.source ?? "clinic",
    heartRate: v.heartRate,
    temperature: v.temperature,
    respiratoryRate: v.respiratoryRate,
    bloodPressureSystolic: v.bloodPressureSystolic,
    bloodPressureDiastolic: v.bloodPressureDiastolic,
    oxygenSaturation: v.oxygenSaturation,
    glucoseLevel: v.glucoseLevel,
    glucoseContext: (v.glucoseContext as PortalVitalSignDto["glucoseContext"]) ?? null,
    painScore: v.painScore,
    weight: v.weight,
    height: v.height,
    notes: v.notes,
  };
}

export async function createPortalPatientVitalSign(
  storage: IStorage,
  tenantId: string,
  patientId: string,
  portalUserId: string,
  body: PortalVitalSignCreate,
): Promise<PortalVitalSignDto> {
  const recordedAt = body.recordedAt ?? new Date();
  const row = await storage.createVitalSigns(
    {
      patientId,
      recordedAt,
      portalUserId,
      source: "patient_self",
      bloodPressureSystolic: body.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: body.bloodPressureDiastolic ?? null,
      heartRate: body.heartRate ?? null,
      temperature: body.temperature ?? null,
      respiratoryRate: body.respiratoryRate ?? null,
      oxygenSaturation: body.oxygenSaturation ?? null,
      glucoseLevel: body.glucoseLevel ?? null,
      glucoseContext: body.glucoseContext ?? null,
      painScore: body.painScore ?? null,
      weight: body.weight ?? null,
      height: body.height ?? null,
      notes: body.notes ?? null,
    } as Parameters<IStorage["createVitalSigns"]>[0],
    tenantId,
  );
  return summarizePortalVital(row);
}
