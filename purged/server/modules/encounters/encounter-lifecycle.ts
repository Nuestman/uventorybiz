import type { Encounter } from "@shared/schema";
import {
  dispositionOptionsFor,
  isEncounterWritable,
  type EncounterModality,
} from "@shared/encounterPathways";

export function assertEncounterWritable(
  encounter: Encounter | null | undefined,
): { ok: true; encounter: Encounter } | { ok: false; error: string; code: "NOT_FOUND" | "CLOSED" } {
  if (!encounter) {
    return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };
  }
  if (!isEncounterWritable(encounter.status)) {
    return {
      ok: false,
      error: "Encounter is closed. Start a new encounter for this patient.",
      code: "CLOSED",
    };
  }
  return { ok: true, encounter };
}

export function validateDischargeDisposition(
  modality: EncounterModality | string | null | undefined,
  disposition: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!disposition?.trim()) {
    return { ok: false, error: "Disposition is required to discharge the encounter" };
  }
  const m = (modality ?? "in_person") as EncounterModality;
  if (!dispositionOptionsFor(m).includes(disposition)) {
    return {
      ok: false,
      error: `Disposition "${disposition}" is not valid for modality "${m}"`,
    };
  }
  return { ok: true };
}

/** @deprecated use validateDischargeDisposition */
export function validateDischargeForPathway(
  _pathway: string,
  disposition: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  return validateDischargeDisposition("in_person", disposition);
}
