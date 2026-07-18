export const OTHER_SYMPTOM_CODE = "other";

/** Display label for a log row; "other" uses the patient-entered name stored in notes. */
export function resolveSymptomDisplayLabel(
  code: string,
  typeLabel: string,
  notes: string | null | undefined,
): string {
  if (code === OTHER_SYMPTOM_CODE) {
    const trimmed = notes?.trim();
    if (trimmed) return trimmed;
  }
  return typeLabel;
}

export function isOtherSymptomCode(code: string): boolean {
  return code === OTHER_SYMPTOM_CODE;
}
