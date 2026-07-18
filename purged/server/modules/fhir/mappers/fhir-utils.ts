import { randomUUID } from "crypto";
import type { FhirBundle, FhirResource } from "../fhir.types";
import { getFhirBaseUrl } from "../fhir.constants";

export function fhirInstant(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function fhirDate(value: Date | string | null | undefined): string | undefined {
  const iso = fhirInstant(value);
  return iso?.slice(0, 10);
}

export function fullUrl(resourceType: string, id: string): string {
  return `${getFhirBaseUrl()}/${resourceType}/${id}`;
}

export function ref(resourceType: string, id: string, display?: string) {
  return { reference: `${resourceType}/${id}`, display };
}

export function buildBundle(
  type: FhirBundle["type"],
  resources: FhirResource[],
  identifier?: { system: string; value: string },
): FhirBundle {
  return {
    resourceType: "Bundle",
    type,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    identifier,
    entry: resources.map((resource) => ({
      fullUrl: resource.id ? fullUrl(resource.resourceType, resource.id) : undefined,
      resource,
    })),
  };
}

export function narrativeDiv(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  return `<div xmlns="http://www.w3.org/1999/xhtml"><h3>${escapeHtml(title)}</h3>${body}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dispositionDisplay(code: string | null | undefined): string {
  switch (code) {
    case "return_to_work":
      return "Return to work";
    case "transferred_to_hospital":
      return "Transferred to hospital";
    case "transferred_to_hospital_other":
      return "Transferred to hospital (other)";
    case "refer_in_person":
      return "Refer in person";
    case "continue_telehealth":
      return "Continue telehealth";
    case "unable_to_assess_remote":
      return "Unable to assess remotely";
    default:
      return code?.replace(/_/g, " ") ?? "Unknown";
  }
}

export function mapGender(gender?: string | null): "male" | "female" | "other" | "unknown" {
  if (gender === "male") return "male";
  if (gender === "female") return "female";
  if (gender === "other") return "other";
  return "unknown";
}

export function mapEncounterStatus(status?: string | null): string {
  switch (status) {
    case "planned":
      return "planned";
    case "arrived":
      return "arrived";
    case "triaged":
      return "triaged";
    case "in_progress":
      return "in-progress";
    case "finished":
      return "finished";
    case "cancelled":
      return "cancelled";
    case "entered_in_error":
      return "entered-in-error";
    default:
      return "finished";
  }
}

export function mapModalityClass(modality?: string | null): { code: string; display: string } {
  if (modality === "telehealth") return { code: "VR", display: "virtual" };
  if (modality === "phone") return { code: "VR", display: "virtual phone" };
  return { code: "AMB", display: "ambulatory" };
}
