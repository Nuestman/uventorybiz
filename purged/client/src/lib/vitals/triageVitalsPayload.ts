import type { GlucoseContext } from "@shared/glucose";

export type TriageVitalsFormState = {
  systolicBp: number | "";
  diastolicBp: number | "";
  hr: number | "";
  temp: number | "";
  rr: number | "";
  oxygenSaturation: number | "";
  glucose: number | "";
  glucoseContext: GlucoseContext | "";
  painScore: number | "";
  weight: string;
  height: string;
};

export function triageVitalsHasValues(vitals: Record<string, unknown> | null | undefined): boolean {
  if (!vitals) return false;
  const keys = [
    "bloodPressureSystolic",
    "bloodPressureDiastolic",
    "heartRate",
    "temperature",
    "respiratoryRate",
    "oxygenSaturation",
    "glucoseLevel",
    "painScore",
    "weight",
    "height",
  ];
  return keys.some((k) => {
    const val = vitals[k];
    return val != null && val !== "";
  });
}

export function buildVitalsAtTriagePayload(
  state: TriageVitalsFormState,
): Record<string, unknown> | undefined {
  const payload: Record<string, unknown> = {
    bloodPressureSystolic:
      state.systolicBp !== "" && state.systolicBp != null ? Number(state.systolicBp) : undefined,
    bloodPressureDiastolic:
      state.diastolicBp !== "" && state.diastolicBp != null ? Number(state.diastolicBp) : undefined,
    heartRate: state.hr !== "" && state.hr != null ? Number(state.hr) : undefined,
    temperature: state.temp !== "" ? String(state.temp) : undefined,
    respiratoryRate: state.rr !== "" && state.rr != null ? Number(state.rr) : undefined,
    oxygenSaturation:
      state.oxygenSaturation !== "" && state.oxygenSaturation != null
        ? Number(state.oxygenSaturation)
        : undefined,
    glucoseLevel:
      state.glucose !== "" && state.glucose != null ? Number(state.glucose) : undefined,
    glucoseContext: state.glucoseContext || undefined,
    painScore:
      state.painScore !== "" && state.painScore != null ? Number(state.painScore) : undefined,
    weight: state.weight?.trim() || undefined,
    height: state.height?.trim() || undefined,
  };

  return triageVitalsHasValues(payload) ? payload : undefined;
}
