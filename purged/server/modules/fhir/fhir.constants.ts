import { env } from "../../config/env";

export const FHIR_VERSION = "4.0.1";

export function getFhirBaseUrl(): string {
  const base = env.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/fhir/R4`;
}

export function identifierSystem(tenantId: string, resourceType: string): string {
  return `${getFhirBaseUrl()}/tenant/${tenantId}/${resourceType.toLowerCase()}`;
}

export const MINEAID_INTERNAL_SYSTEM = "https://mineaidhms.com/internal-id";

export const HL7_ACT_CODE = "http://terminology.hl7.org/CodeSystem/v3-ActCode";
export const HL7_ENCOUNTER_CLASS = "http://terminology.hl7.org/CodeSystem/v3-ActCode";
export const HL7_OBSERVATION_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category";
export const LOINC = "http://loinc.org";
export const SNOMED = "http://snomed.info/sct";

export const COMPOSITION_LOINC = "34133-9";
