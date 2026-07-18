/**
 * Redact casualty-identifiable fields from incident payloads for operations-role responses.
 * Keeps employer (company) name and job title where appropriate; replaces names/numbers in free text.
 */

export const INCIDENT_CASUALTY_DISPLAY = "Casualty/IP";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type IncidentTextRedactionCtx = {
  firstName?: string | null;
  lastName?: string | null;
  employeeNumber?: string | null;
};

/**
 * Replace identifiable tokens in narrative fields with "Casualty/IP".
 */
export function redactIncidentFreeText(
  text: string | null | undefined,
  ctx: IncidentTextRedactionCtx
): string | null | undefined {
  if (text == null || String(text).trim() === "") return text;

  const patterns: string[] = [];
  const fn = ctx.firstName?.trim();
  const ln = ctx.lastName?.trim();
  const en = ctx.employeeNumber?.trim();

  if (fn && ln) {
    patterns.push(`${fn} ${ln}`);
    patterns.push(`${ln}, ${fn}`);
  }
  if (fn) patterns.push(fn);
  if (ln) patterns.push(ln);
  if (en) patterns.push(en);

  const sorted = Array.from(new Set(patterns)).sort((a, b) => b.length - a.length);

  let out = String(text);
  for (const p of sorted) {
    if (!p) continue;
    const re = new RegExp(escapeRegExp(p), "gi");
    out = out.replace(re, INCIDENT_CASUALTY_DISPLAY);
  }
  return out;
}

/**
 * Shape returned for safety officers: company preserved; employee name/number stripped; patient id omitted.
 */
export function redactIncidentForSafetyOfficer(incident: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...incident } as Record<string, unknown>;
  const employeeNested = copy.employee as Record<string, unknown> | undefined;
  const legacyPatient = copy.patient as Record<string, unknown> | undefined;
  const employee = (employeeNested ?? legacyPatient?.employee) as Record<string, unknown> | undefined;

  const ctx: IncidentTextRedactionCtx = {
    firstName: employee?.firstName != null ? String(employee.firstName) : undefined,
    lastName: employee?.lastName != null ? String(employee.lastName) : undefined,
    employeeNumber: employee?.employeeNumber != null ? String(employee.employeeNumber) : undefined,
  };

  const textKeys = ["description", "emergencyMedicalMgt", "actionsTaken", "reportedTo", "incidentLocation"] as const;
  for (const key of textKeys) {
    const v = copy[key];
    if (typeof v === "string") {
      copy[key] = redactIncidentFreeText(v, ctx) ?? v;
    }
  }

  copy.lastMenstrualPeriod = null;

  const company =
    (employeeNested?.company as Record<string, unknown> | undefined) ??
    (legacyPatient?.company as Record<string, unknown> | undefined);
  const companySafe =
    company && typeof company === "object"
      ? {
          id: company.id,
          name: company.name,
        }
      : undefined;

  const jobTitle =
    (typeof copy.jobTitle === "string" && copy.jobTitle) ||
    (employee?.jobTitle != null ? String(employee.jobTitle) : "") ||
    (employee?.position != null ? String(employee.position) : "");

  copy.employee = employee
    ? {
        company: companySafe,
        firstName: "",
        lastName: "",
        employeeNumber: "",
        jobTitle: jobTitle || undefined,
        position: employee?.position != null ? String(employee.position) : undefined,
      }
    : undefined;
  copy.patient = undefined;

  /** Keep employeeId for server-side inventory/issue flows and edit merge; never show in UI for safety officers. */
  return copy;
}
