/** Values aligned with `IncidentModal` and production incident data. */

export const INCIDENT_SEVERITY_FILTERS = [
  "minor",
  "moderate",
  "major",
  "critical",
  "catastrophic",
] as const;

export const INCIDENT_TYPE_FILTERS = [
  "injury",
  "near_miss",
  "equipment_damage",
  "environmental",
  "security",
  "fire",
  "chemical_spill",
  "vehicle_accident",
  "other",
] as const;

export const INCIDENT_STATUS_FILTERS = ["open", "investigating", "resolved", "closed"] as const;

export function formatIncidentTypeLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatIncidentSeverityLabel(raw: string): string {
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
}
