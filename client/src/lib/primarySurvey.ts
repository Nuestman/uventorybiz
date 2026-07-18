/**
 * Primary survey (ABCDE) assessment – options and helpers.
 * Stored in medical_visits.primary_survey as JSON: { A?: string, B?: string, C?: string, D?: string, E?: string }
 */

export const PRIMARY_SURVEY_LABELS: Record<string, string> = {
  A: "A – Airway",
  B: "B – Breathing",
  C: "C – Circulation",
  D: "D – Disability",
  E: "E – Exposure",
};

export const PRIMARY_SURVEY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  A: [
    { value: "clear", label: "Clear" },
    { value: "compromised", label: "Compromised" },
    { value: "obstructed", label: "Obstructed" },
    { value: "not_assessed", label: "Not assessed" },
  ],
  B: [
    { value: "normal", label: "Normal" },
    { value: "labored", label: "Labored" },
    { value: "absent", label: "Absent" },
    { value: "shallow", label: "Shallow" },
    { value: "not_assessed", label: "Not assessed" },
  ],
  C: [
    { value: "normal_pulse", label: "Normal pulse" },
    { value: "weak_pulse", label: "Weak pulse" },
    { value: "no_pulse", label: "No pulse" },
    { value: "hemorrhage", label: "Hemorrhage" },
    { value: "not_assessed", label: "Not assessed" },
  ],
  D: [
    { value: "alert", label: "Alert" },
    { value: "voice", label: "Voice" },
    { value: "pain", label: "Pain" },
    { value: "unresponsive", label: "Unresponsive" },
    { value: "not_assessed", label: "Not assessed" },
  ],
  E: [
    { value: "no_obvious_injury", label: "No obvious injury" },
    { value: "injury_noted", label: "Injury / environmental concern" },
    { value: "not_assessed", label: "Not assessed" },
  ],
};

export const ABCDE_KEYS = ["A", "B", "C", "D", "E"] as const;

export type PrimarySurveyFindings = Partial<Record<(typeof ABCDE_KEYS)[number], string>>;

export function parsePrimarySurvey(value: string | null | undefined): PrimarySurveyFindings {
  if (!value || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return ABCDE_KEYS.reduce<PrimarySurveyFindings>((acc, k) => {
      if (parsed[k]) acc[k] = parsed[k];
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function formatPrimarySurvey(findings: PrimarySurveyFindings): string {
  return JSON.stringify(findings);
}

export function getFindingLabel(component: string, value: string): string {
  const opts = PRIMARY_SURVEY_OPTIONS[component];
  if (!opts) return value;
  const found = opts.find((o) => o.value === value);
  return found ? found.label : value;
}
