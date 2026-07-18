/**
 * Encounter model — single source of truth.
 * See docs/ENCOUNTER_FIRST_MODEL.md
 *
 * Encounter **type** = why the patient came (case category).
 * **Modality** = how care is delivered.
 * **triageRequired** = per-encounter flag (staff can override at open/edit).
 * **pathway** column in DB is a derived slug for FHIR/reporting only — not shown in UI.
 */

export const ENCOUNTER_MODALITIES = ["in_person", "telehealth", "phone"] as const;
export type EncounterModality = (typeof ENCOUNTER_MODALITIES)[number];

/** Canonical encounter types (stored in encounters.visit_type). */
export const ENCOUNTER_TYPES = [
  "monitoring",
  "procedure",
  "clinical",
  "injury",
  "screening",
  "follow_up",
] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

/** @deprecated Use ENCOUNTER_TYPES — alias for gradual TS migration */
export const ENCOUNTER_VISIT_TYPES = ENCOUNTER_TYPES;
export type EncounterVisitType = EncounterType;

/** FHIR Encounter.status-aligned lifecycle. */
export const ENCOUNTER_STATUSES = [
  "planned",
  "arrived",
  "triaged",
  "in_progress",
  "finished",
  "cancelled",
  "entered_in_error",
] as const;
export type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];

export const WRITABLE_ENCOUNTER_STATUSES: readonly EncounterStatus[] = [
  "planned",
  "arrived",
  "triaged",
  "in_progress",
];

/** Staff-facing filter groups for Records / lists. */
export const ENCOUNTER_STATUS_FILTER_GROUPS = [
  "all",
  "open",
  "discharged",
  "cancelled",
  "planned",
] as const;
export type EncounterStatusFilterGroup = (typeof ENCOUNTER_STATUS_FILTER_GROUPS)[number];

export const OPEN_ENCOUNTER_STATUSES: readonly EncounterStatus[] = [
  "arrived",
  "triaged",
  "in_progress",
];

export const DISPOSITION_VALUES = [
  "return_to_work",
  "transferred_to_hospital",
  "transferred_to_hospital_other",
  "refer_in_person",
  "continue_telehealth",
  "unable_to_assess_remote",
  "light_duty",
  "medical_leave",
] as const;
export type DispositionValue = (typeof DISPOSITION_VALUES)[number];

export const CORE_DISPOSITION_VALUES = [
  "return_to_work",
  "transferred_to_hospital",
  "transferred_to_hospital_other",
] as const;

export type EncounterTypeDefinition = {
  id: EncounterType;
  label: string;
  description: string;
  defaultModality: EncounterModality;
  /** Suggested triage flag when opening — staff may override. */
  defaultTriageRequired: boolean;
  /** Show full clinical documentation tab (not monitoring-only). */
  hasClinicalDocumentation: boolean;
};

export const ENCOUNTER_TYPE_DEFINITIONS: Record<EncounterType, EncounterTypeDefinition> = {
  monitoring: {
    id: "monitoring",
    label: "Monitoring",
    description: "Vitals and observations — no full clinical visit unless triage is enabled.",
    defaultModality: "in_person",
    defaultTriageRequired: false,
    hasClinicalDocumentation: false,
  },
  procedure: {
    id: "procedure",
    label: "Procedure",
    description: "Procedural care with documentation.",
    defaultModality: "in_person",
    defaultTriageRequired: false,
    hasClinicalDocumentation: true,
  },
  clinical: {
    id: "clinical",
    label: "Clinical visit",
    description: "Illness or general clinical presentation — triage typically required in person.",
    defaultModality: "in_person",
    defaultTriageRequired: true,
    hasClinicalDocumentation: true,
  },
  injury: {
    id: "injury",
    label: "Injury",
    description: "Work-related or acute injury — triage typically required; may link to incident later.",
    defaultModality: "in_person",
    defaultTriageRequired: true,
    hasClinicalDocumentation: true,
  },
  screening: {
    id: "screening",
    label: "Screening",
    description: "Pre-employment, annual, or periodic occupational health screening.",
    defaultModality: "in_person",
    defaultTriageRequired: false,
    hasClinicalDocumentation: true,
  },
  follow_up: {
    id: "follow_up",
    label: "Follow-up",
    description: "Follow-up after a prior encounter.",
    defaultModality: "telehealth",
    defaultTriageRequired: false,
    hasClinicalDocumentation: true,
  },
};

export function getEncounterTypeDefinition(type: string): EncounterTypeDefinition {
  const key = type as EncounterType;
  return ENCOUNTER_TYPE_DEFINITIONS[key] ?? ENCOUNTER_TYPE_DEFINITIONS.clinical;
}

/** Default triageRequired when staff does not specify. */
export function defaultTriageRequired(
  encounterType: string,
  modality: EncounterModality = "in_person",
): boolean {
  const def = getEncounterTypeDefinition(encounterType);
  if (encounterType === "monitoring" || encounterType === "procedure" || encounterType === "screening") {
    return false;
  }
  if (encounterType === "clinical" || encounterType === "injury") {
    return modality === "in_person";
  }
  if (encounterType === "follow_up") {
    return false;
  }
  return def.defaultTriageRequired;
}

/** Disposition options — same set for all encounter types; telehealth adds remote-specific outcomes. */
export function dispositionOptionsFor(modality: EncounterModality): readonly string[] {
  if (modality === "telehealth" || modality === "phone") {
    return [
      "return_to_work",
      "refer_in_person",
      "continue_telehealth",
      "unable_to_assess_remote",
      "transferred_to_hospital",
      "transferred_to_hospital_other",
      "light_duty",
      "medical_leave",
    ];
  }
  return [
    ...CORE_DISPOSITION_VALUES,
    "refer_in_person",
    "light_duty",
    "medical_leave",
  ];
}

export function validateDisposition(
  disposition: string | null | undefined,
  modality: EncounterModality = "in_person",
): { ok: true } | { ok: false; error: string } {
  if (!disposition?.trim()) {
    return { ok: false, error: "Disposition is required to discharge the encounter" };
  }
  if (!dispositionOptionsFor(modality).includes(disposition)) {
    return { ok: false, error: `Disposition "${disposition}" is not valid for this modality` };
  }
  return { ok: true };
}

/** Internal DB slug (FHIR / reports) — not shown in staff UI. */
export function derivePathwaySlug(encounterType: string, modality: EncounterModality): string {
  if (encounterType === "follow_up" && modality === "telehealth") return "telehealth_follow_up";
  if (encounterType === "follow_up" && modality === "phone") return "phone_follow_up";
  if (modality === "telehealth") return "telehealth_scheduled";
  return encounterType;
}

export function isEncounterWritable(status: string | null | undefined): boolean {
  return !!status && (WRITABLE_ENCOUNTER_STATUSES as readonly string[]).includes(status);
}

export function formatEncounterStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  const map: Record<string, string> = {
    planned: "Scheduled",
    arrived: "Arrived",
    triaged: "Triaged",
    in_progress: "In progress",
    finished: "Discharged",
    cancelled: "Cancelled",
    entered_in_error: "Entered in error",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export function formatEncounterType(type: string | null | undefined): string {
  if (!type) return "N/A";
  return getEncounterTypeDefinition(type).label;
}

export function matchesEncounterStatusFilter(
  status: string | null | undefined,
  group: EncounterStatusFilterGroup,
): boolean {
  if (group === "all" || !status) return group === "all";
  if (group === "open") return (OPEN_ENCOUNTER_STATUSES as readonly string[]).includes(status);
  if (group === "discharged") return status === "finished";
  if (group === "cancelled") return status === "cancelled";
  if (group === "planned") return status === "planned";
  return status === group;
}

export function resolveModalityForEncounterType(
  encounterType: string,
  modality?: EncounterModality,
): EncounterModality {
  if (modality) return modality;
  return getEncounterTypeDefinition(encounterType).defaultModality;
}

// ---------------------------------------------------------------------------
// Legacy pathway exports (FHIR / old imports) — thin wrappers
// ---------------------------------------------------------------------------

export const ENCOUNTER_PATHWAYS = [
  "monitoring",
  "procedure",
  "clinical",
  "injury",
  "screening",
  "follow_up",
  "telehealth_scheduled",
  "telehealth_follow_up",
  "phone_follow_up",
] as const;
export type EncounterPathway = (typeof ENCOUNTER_PATHWAYS)[number];

export function getPathwayDefinition(pathway: string) {
  const type = pathway.replace("telehealth_follow_up", "follow_up").replace("telehealth_scheduled", "clinical") as EncounterType;
  const def = getEncounterTypeDefinition(type);
  return {
    id: pathway,
    label: def.label,
    description: def.description,
    allowedModalities: ENCOUNTER_MODALITIES,
    triageRequired: def.defaultTriageRequired,
    defaultModality: def.defaultModality,
    dispositionOptions: dispositionOptionsFor("in_person"),
    requiredSteps: [] as readonly string[],
    optionalSteps: [] as readonly string[],
  };
}

export function pathwayHasStep(_pathway: string, step: string): boolean {
  if (step === "triage") return true;
  if (step === "vitals") return true;
  if (step === "subjective" || step === "assessment" || step === "plan" || step === "disposition") return true;
  return false;
}

export function resolvePathwayFromVisitType(
  visitType: string,
  modality?: EncounterModality,
): { pathway: EncounterPathway; modality: EncounterModality } {
  const m = resolveModalityForEncounterType(visitType, modality);
  return { pathway: derivePathwaySlug(visitType, m) as EncounterPathway, modality: m };
}

export function inferPathwayFromAppointmentModality(
  modality: EncounterModality,
  appointmentType?: string,
): EncounterPathway {
  if (modality === "telehealth") {
    return appointmentType?.toLowerCase().includes("follow") ? "telehealth_follow_up" : "telehealth_scheduled";
  }
  if (modality === "phone") return "phone_follow_up";
  if (appointmentType === "pre_employment" || appointmentType === "annual") return "screening";
  return "clinical";
}

export function isModalityAllowedForPathway(_pathway: string, _modality: EncounterModality): boolean {
  return true;
}
