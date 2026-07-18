export type FhirResource = Record<string, unknown> & { resourceType: string; id?: string };

export interface FhirBundle extends FhirResource {
  resourceType: "Bundle";
  type: "collection" | "document" | "searchset" | "transaction" | "batch";
  timestamp?: string;
  identifier?: { system?: string; value: string };
  entry?: Array<{
    fullUrl?: string;
    resource: FhirResource;
  }>;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: "usual" | "official" | "temp" | "secondary";
}

export interface FhirCodeableConcept {
  coding?: Array<{ system?: string; code?: string; display?: string }>;
  text?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}
