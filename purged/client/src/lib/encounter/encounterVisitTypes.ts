import {
  ENCOUNTER_TYPES,
  ENCOUNTER_TYPE_DEFINITIONS,
  defaultTriageRequired,
  dispositionOptionsFor,
  formatEncounterType,
  type EncounterModality,
  type EncounterType,
} from "@shared/encounterPathways";

export const ENCOUNTER_OPEN_TYPES = ENCOUNTER_TYPES.map((value) => ({
  value,
  label: ENCOUNTER_TYPE_DEFINITIONS[value].label,
  description: ENCOUNTER_TYPE_DEFINITIONS[value].description,
}));

export { defaultTriageRequired, dispositionOptionsFor, formatEncounterType };
export type { EncounterModality, EncounterType };

export const DISPOSITION_LABELS: Record<string, string> = {
  return_to_work: "Return to work",
  transferred_to_hospital: "Transferred to hospital",
  transferred_to_hospital_other: "Transferred to other facility",
  refer_in_person: "Refer in person",
  continue_telehealth: "Continue telehealth",
  unable_to_assess_remote: "Unable to assess remotely",
  light_duty: "Light duty",
  medical_leave: "Medical leave",
};
