/**
 * SAMPLE history – patient history mnemonic.
 * Stored in medical_visits.sample_history as JSON: { S?: string, A?: string, M?: string, P?: string, L?: string, E?: string }
 */

export const SAMPLE_LABELS: Record<string, string> = {
  S: "S – Signs/Symptoms",
  A: "A – Allergies",
  M: "M – Medications",
  P: "P – Past medical history",
  L: "L – Last oral intake",
  E: "E – Events leading to presentation",
};

export const SAMPLE_KEYS = ["S", "A", "M", "P", "L", "E"] as const;

export type SampleHistoryData = Partial<Record<(typeof SAMPLE_KEYS)[number], string>>;

export function parseSampleHistory(value: string | null | undefined): SampleHistoryData {
  if (!value || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return SAMPLE_KEYS.reduce<SampleHistoryData>((acc, k) => {
      if (parsed[k] && String(parsed[k]).trim()) acc[k] = String(parsed[k]).trim();
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function formatSampleHistory(data: SampleHistoryData): string {
  return JSON.stringify(data);
}
