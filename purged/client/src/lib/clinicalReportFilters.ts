/** Canonical filter option lists for `/reports/clinical` (aligned with `encounters` schema v2). */

import { ENCOUNTER_TYPES, ENCOUNTER_STATUSES } from "@shared/encounterPathways";

export const CLINICAL_VISIT_TYPES = [...ENCOUNTER_TYPES] as const;

export const CLINICAL_DISPOSITIONS = [
  "return_to_work",
  "transferred_to_hospital",
  "transferred_to_hospital_other",
  "refer_in_person",
  "continue_telehealth",
  "unable_to_assess_remote",
  "light_duty",
  "medical_leave",
] as const;

/** Staff filter groups map to underlying FHIR-aligned statuses via `matchesEncounterStatusFilter`. */
export const CLINICAL_VISIT_STATUS = ["open", "discharged", "cancelled", "planned", ...ENCOUNTER_STATUSES] as const;

export const CLINICAL_TRIAGE_ACUITIES = ["red", "orange", "yellow", "green"] as const;
