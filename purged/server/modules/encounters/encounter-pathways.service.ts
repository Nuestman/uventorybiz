import {
  ENCOUNTER_MODALITIES,
  ENCOUNTER_TYPES,
  ENCOUNTER_TYPE_DEFINITIONS,
  type EncounterModality,
  type EncounterType,
  defaultTriageRequired,
  derivePathwaySlug,
  dispositionOptionsFor,
  formatEncounterStatus,
  formatEncounterType,
  getEncounterTypeDefinition,
  resolveModalityForEncounterType,
  inferPathwayFromAppointmentModality,
  resolvePathwayFromVisitType,
} from "@shared/encounterPathways";

export {
  ENCOUNTER_MODALITIES,
  ENCOUNTER_TYPES,
  ENCOUNTER_TYPE_DEFINITIONS,
  defaultTriageRequired,
  derivePathwaySlug,
  dispositionOptionsFor,
  formatEncounterStatus,
  formatEncounterType,
  getEncounterTypeDefinition,
  resolveModalityForEncounterType,
  inferPathwayFromAppointmentModality,
  resolvePathwayFromVisitType,
};

export type PathwayListResult = {
  encounterTypes: (typeof ENCOUNTER_TYPE_DEFINITIONS)[EncounterType][];
  modalities: readonly EncounterModality[];
};

export function listEncounterPathways(): PathwayListResult {
  return {
    encounterTypes: ENCOUNTER_TYPES.map((id) => ENCOUNTER_TYPE_DEFINITIONS[id]),
    modalities: ENCOUNTER_MODALITIES,
  };
}

/** Apply defaults when opening an encounter. */
export function applyEncounterOpenDefaults(input: {
  visitType: string;
  modality?: EncounterModality;
  triageRequired?: boolean;
  status?: string;
}): {
  visitType: string;
  modality: EncounterModality;
  pathway: string;
  triageRequired: boolean;
  status: string;
} {
  const visitType = ENCOUNTER_TYPES.includes(input.visitType as EncounterType)
    ? input.visitType
    : "clinical";
  const modality = resolveModalityForEncounterType(visitType, input.modality);
  const triageRequired =
    input.triageRequired ?? defaultTriageRequired(visitType, modality);
  return {
    visitType,
    modality,
    pathway: derivePathwaySlug(visitType, modality),
    triageRequired,
    status: input.status ?? "arrived",
  };
}

/** @deprecated */
export function applyEncounterDefaults(input: {
  visitType?: string;
  modality?: EncounterModality;
  pathway?: string;
  status?: string;
}) {
  const open = applyEncounterOpenDefaults({
    visitType: input.visitType ?? "clinical",
    modality: input.modality,
    status: input.status,
  });
  return {
    visitType: open.visitType,
    modality: open.modality,
    pathway: input.pathway ?? open.pathway,
    status: open.status,
  };
}
