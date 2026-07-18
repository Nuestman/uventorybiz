/** Matches server `INCIDENT_CASUALTY_DISPLAY` for operations-role incident views. */
export const CASUALTY_IP_LABEL = "Casualty/IP";

/**
 * Primary line for cards/tables: name for clinical roles; placeholder for safety.
 */
export function incidentPersonPrimaryLine(incident: any, isSafetyOfficer: boolean): string {
  if (!isSafetyOfficer) {
    const fn = incident?.patient?.employee?.firstName;
    const ln = incident?.patient?.employee?.lastName;
    return [fn, ln].filter(Boolean).join(" ").trim() || "—";
  }
  return CASUALTY_IP_LABEL;
}

/**
 * Secondary line: employee number for clinical; company worker phrasing for safety.
 */
export function incidentPersonSecondaryLine(incident: any, isSafetyOfficer: boolean): string {
  if (!isSafetyOfficer) {
    return incident?.patient?.employee?.employeeNumber?.trim() || "";
  }
  const company = incident?.patient?.company?.name?.trim();
  if (company) {
    return `a worker of ${company}`;
  }
  if (incident?.jobTitle) {
    return incident.jobTitle;
  }
  return "";
}

/**
 * Combined subtitle for card layout: "Casualty/IP • a worker of ABC • Job" style.
 */
export function incidentPersonCardSubtitle(incident: any, isSafetyOfficer: boolean): string {
  if (!isSafetyOfficer) {
    const name = incidentPersonPrimaryLine(incident, false);
    const jt = incident?.jobTitle;
    return jt ? `${name} • ${jt}` : name;
  }
  const company = incident?.patient?.company?.name?.trim();
  const jt = incident?.jobTitle;
  const parts = [CASUALTY_IP_LABEL];
  if (company) parts.push(`a worker of ${company}`);
  if (jt) parts.push(jt);
  return parts.join(" • ");
}
