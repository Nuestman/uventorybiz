/**
 * Shift pre-start safety checklist for ambulances (keys stored in ambulance_prestart_checks.responses JSON).
 * UI and API validate that submitted keys are a subset of these definitions.
 */
export const AMBULANCE_PRESTART_CHECKLIST_ITEMS = [
  { key: "vehicle_exterior", label: "Vehicle exterior — no visible damage affecting safety" },
  { key: "tires_wheels", label: "Tires & wheels — condition, pressure acceptable" },
  { key: "lights_sirens", label: "Lights, sirens & horn operational" },
  { key: "fuel_battery", label: "Fuel / battery adequate for shift" },
  { key: "o2_supply", label: "Oxygen supply — secured, pressure checked" },
  { key: "stretcher_lift", label: "Stretcher / lift — locks, operation checked" },
  { key: "cab_interior", label: "Cab interior — clean, no loose hazards" },
  { key: "medical_bag_equipment", label: "Primary bags / equipment present & secured" },
  { key: "comms_radio", label: "Communications / radio operational" },
  { key: "ppe_available", label: "Required PPE available in unit" },
  { key: "documentation_log", label: "Vehicle log / run documentation ready" },
] as const;

export type AmbulancePrestartChecklistKey = (typeof AMBULANCE_PRESTART_CHECKLIST_ITEMS)[number]["key"];

export const AMBULANCE_PRESTART_KEYS = new Set<string>(
  AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((i) => i.key)
);

export function isValidPrestartResponses(responses: Record<string, boolean>): boolean {
  for (const k of Object.keys(responses)) {
    if (!AMBULANCE_PRESTART_KEYS.has(k)) return false;
  }
  return true;
}
