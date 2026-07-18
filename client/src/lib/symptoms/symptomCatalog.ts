export const SYMPTOM_SEVERITY_LABELS: Record<number, string> = {
  1: "Mild",
  2: "Mild–moderate",
  3: "Moderate",
  4: "Moderate–severe",
  5: "Severe",
};

export const SYMPTOM_DURATION_PRESETS = [
  { value: 30, label: "Less than 1 hour" },
  { value: 120, label: "1–4 hours" },
  { value: 720, label: "4–24 hours" },
  { value: 1440, label: "More than 1 day" },
] as const;

export const SYMPTOM_QUALITY_PRESETS = [
  "Sharp",
  "Dull",
  "Burning",
  "Aching",
  "Stabbing",
  "Throbbing",
  "Cramping",
  "Pressure",
  "Pins & needles",
] as const;

export const OPQRST_SECTIONS = [
  {
    letter: "O",
    title: "Onset",
    description: "When the symptom started.",
  },
  {
    letter: "P",
    title: "Provocation & Palliation",
    description: "What makes it worse or better.",
  },
  {
    letter: "Q",
    title: "Quality",
    description: "What it feels like (e.g. sharp, dull, burning).",
  },
  {
    letter: "R",
    title: "Region & Radiation",
    description: "Where it is and whether it spreads.",
  },
  {
    letter: "S",
    title: "Severity",
    description: "How intense it is on a 1–5 scale.",
  },
  {
    letter: "T",
    title: "Time",
    description: "How long it has lasted.",
  },
] as const;

export type SymptomOpqrstFields = {
  symptomQuality: string | null;
  provocation: string | null;
  palliation: string | null;
  radiation: string | null;
};

export type SymptomLogRow = {
  id: string;
  symptomTypeId: string;
  symptomCode: string;
  symptomLabel: string;
  recordedAt: string;
  severity: number;
  bodyLocation: string | null;
  durationMinutes: number | null;
  symptomQuality: string | null;
  provocation: string | null;
  palliation: string | null;
  radiation: string | null;
  notes: string | null;
  source: string;
  createdAt: string | null;
  canEdit?: boolean;
  pendingSync?: boolean;
};

export type SymptomTypeRow = {
  id: string;
  code: string;
  label: string;
  category: string;
  sortOrder: number;
  isTenantSpecific?: boolean;
};

export function formatSymptomSeverity(severity: number): string {
  return SYMPTOM_SEVERITY_LABELS[severity] ?? `Level ${severity}`;
}

export function formatSymptomDuration(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  const preset = SYMPTOM_DURATION_PRESETS.find((p) => p.value === minutes);
  if (preset) return preset.label;
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr`;
  return `${Math.round(minutes / (60 * 24))} day(s)`;
}

export function severityBadgeClass(severity: number): string {
  if (severity >= 5) return "bg-red-100 text-red-800 border-red-200";
  if (severity >= 4) return "bg-orange-100 text-orange-800 border-orange-200";
  if (severity >= 3) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export function groupSymptomCountsByDay(rows: SymptomLogRow[]): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.recordedAt.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function groupSymptomTypesByCategory(types: SymptomTypeRow[]): Map<string, SymptomTypeRow[]> {
  const map = new Map<string, SymptomTypeRow[]>();
  for (const type of types) {
    const key = type.category || "general";
    const list = map.get(key) ?? [];
    list.push(type);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }
  return map;
}

export function formatSymptomCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type OpqrstDetailLine = { label: string; value: string };

export function getSymptomOpqrstDetails(row: SymptomLogRow): OpqrstDetailLine[] {
  const lines: OpqrstDetailLine[] = [];
  const duration = formatSymptomDuration(row.durationMinutes);
  if (row.symptomQuality) lines.push({ label: "Quality", value: row.symptomQuality });
  if (row.bodyLocation) lines.push({ label: "Region", value: row.bodyLocation });
  if (row.radiation) lines.push({ label: "Radiation", value: row.radiation });
  if (row.provocation) lines.push({ label: "Provocation", value: row.provocation });
  if (row.palliation) lines.push({ label: "Palliation", value: row.palliation });
  if (duration) lines.push({ label: "Time", value: duration });
  return lines;
}
