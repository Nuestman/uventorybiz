import type { InsertVitalSigns } from "@shared/schema";

export type VitalsAtTriageInput = Partial<
  Omit<
    InsertVitalSigns,
    "id" | "tenantId" | "createdAt" | "recordedBy" | "patientId" | "triageId" | "medicalVisitId"
  >
>;

const VITAL_KEYS: (keyof VitalsAtTriageInput)[] = [
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "heartRate",
  "temperature",
  "respiratoryRate",
  "oxygenSaturation",
  "glucoseLevel",
  "glucoseContext",
  "painScore",
  "weight",
  "height",
  "notes",
];

export function vitalsAtTriageHasValues(input: VitalsAtTriageInput | null | undefined): boolean {
  if (!input) return false;
  return VITAL_KEYS.some((key) => {
    const val = input[key];
    return val != null && val !== "";
  });
}

export function normalizeVitalsAtTriage(
  input: VitalsAtTriageInput | null | undefined,
): VitalsAtTriageInput | null {
  if (!input || !vitalsAtTriageHasValues(input)) return null;

  const out: VitalsAtTriageInput = {};

  if (input.bloodPressureSystolic != null) out.bloodPressureSystolic = input.bloodPressureSystolic;
  if (input.bloodPressureDiastolic != null) out.bloodPressureDiastolic = input.bloodPressureDiastolic;
  if (input.heartRate != null) out.heartRate = input.heartRate;
  if (input.respiratoryRate != null) out.respiratoryRate = input.respiratoryRate;
  if (input.oxygenSaturation != null) out.oxygenSaturation = input.oxygenSaturation;
  if (input.glucoseLevel != null) out.glucoseLevel = input.glucoseLevel;
  if (input.painScore != null) out.painScore = input.painScore;

  if (input.temperature != null && String(input.temperature).trim() !== "") {
    out.temperature = String(input.temperature);
  }
  if (input.weight != null && String(input.weight).trim() !== "") {
    out.weight = String(input.weight);
  }
  if (input.height != null && String(input.height).trim() !== "") {
    out.height = String(input.height);
  }
  if (input.glucoseContext === "fbs" || input.glucoseContext === "rbs") {
    out.glucoseContext = input.glucoseContext;
  }
  if (input.notes != null && String(input.notes).trim() !== "") {
    out.notes = String(input.notes);
  }

  return vitalsAtTriageHasValues(out) ? out : null;
}
