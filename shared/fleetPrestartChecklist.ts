/**
 * Vehicle pre-start checklist (keys stored in fleet_prestart_checks.responses JSON).
 * UI and API validate that submitted keys are a subset of these definitions.
 * Response values: "unchecked" | "pass" | "faulty".
 */

export const PRESTART_RESPONSE_VALUES = ["unchecked", "pass", "faulty"] as const;
export type PrestartResponseValue = (typeof PRESTART_RESPONSE_VALUES)[number];

export const AMBULANCE_PRESTART_CHECKLIST_ITEMS = [
  { key: "vehicle_exterior", label: "Vehicle exterior — no visible damage affecting safety" },
  { key: "wheel_fl", label: "Front-left wheel — condition & pressure acceptable" },
  { key: "wheel_fr", label: "Front-right wheel — condition & pressure acceptable" },
  { key: "wheel_rl", label: "Rear-left wheel — condition & pressure acceptable" },
  { key: "wheel_rr", label: "Rear-right wheel — condition & pressure acceptable" },
  { key: "wheel_spare", label: "Spare wheel — present & serviceable" },
  { key: "lights_horn", label: "Lights & horn operational" },
  { key: "fuel_battery", label: "Fuel / battery adequate for the shift" },
  { key: "cabin_interior", label: "Cabin interior — clean, no loose hazards" },
  { key: "cargo_tools", label: "Cargo / tools present & secured" },
  { key: "comms", label: "Communications operational" },
  { key: "documentation_log", label: "Vehicle log / documentation ready" },
] as const;

/** Alias for Fleet UI naming — same checklist as AMBULANCE_PRESTART_CHECKLIST_ITEMS. */
export const FLEET_PRESTART_CHECKLIST_ITEMS = AMBULANCE_PRESTART_CHECKLIST_ITEMS;

export type AmbulancePrestartChecklistKey = (typeof AMBULANCE_PRESTART_CHECKLIST_ITEMS)[number]["key"];
export type FleetPrestartChecklistKey = AmbulancePrestartChecklistKey;

export const AMBULANCE_PRESTART_KEYS = new Set<string>(
  AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((i) => i.key)
);

export type PrestartResponses = Record<string, PrestartResponseValue>;

export function emptyPrestartResponses(): PrestartResponses {
  return Object.fromEntries(
    AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((i) => [i.key, "unchecked" as const])
  );
}

/** Normalize legacy boolean responses and unknown keys into the current model. */
export function migrateLegacyResponses(
  existing?: Record<string, unknown> | null
): PrestartResponses {
  const base = emptyPrestartResponses();
  if (!existing) return base;
  for (const item of AMBULANCE_PRESTART_CHECKLIST_ITEMS) {
    const raw = existing[item.key];
    if (raw === true || raw === "pass") base[item.key] = "pass";
    else if (raw === "faulty") base[item.key] = "faulty";
    else if (raw === false || raw === "unchecked") base[item.key] = "unchecked";
  }
  // Legacy combined tires_wheels → apply to all wheel keys if present and wheels unset
  const legacyWheels = existing.tires_wheels;
  if (legacyWheels === true || legacyWheels === "pass") {
    for (const k of ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "wheel_spare"] as const) {
      if (!(k in existing)) base[k] = "pass";
    }
  } else if (legacyWheels === "faulty") {
    for (const k of ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr", "wheel_spare"] as const) {
      if (!(k in existing)) base[k] = "faulty";
    }
  }
  return base;
}

export function isValidPrestartResponses(responses: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(responses)) {
    if (!AMBULANCE_PRESTART_KEYS.has(k)) return false;
    if (typeof v === "boolean") continue; // legacy tolerated at boundary; migrate before store
    if (v !== "unchecked" && v !== "pass" && v !== "faulty") return false;
  }
  return true;
}

export function allPrestartItemsDecided(responses: PrestartResponses): boolean {
  return AMBULANCE_PRESTART_CHECKLIST_ITEMS.every((item) => {
    const v = responses[item.key];
    return v === "pass" || v === "faulty";
  });
}

export function countFaultyPrestartItems(responses: PrestartResponses): number {
  return AMBULANCE_PRESTART_CHECKLIST_ITEMS.filter((item) => responses[item.key] === "faulty")
    .length;
}

export function hasFaultyPrestartItems(responses: PrestartResponses): boolean {
  return countFaultyPrestartItems(responses) > 0;
}

export function faultyPrestartLabels(responses: PrestartResponses): string[] {
  return AMBULANCE_PRESTART_CHECKLIST_ITEMS.filter((item) => responses[item.key] === "faulty").map(
    (item) => item.label
  );
}
