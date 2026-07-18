import { describe, it, expect } from "vitest";
import { redactIncidentFreeText, redactIncidentForSafetyOfficer, INCIDENT_CASUALTY_DISPLAY } from "../shared/incidentSafetyRedaction";

describe("incidentSafetyRedaction", () => {
  it("replaces names and employee number in free text", () => {
    const ctx = { firstName: "Jane", lastName: "Doe", employeeNumber: "EMP-001" };
    const raw =
      "Jane Doe reported pain. IP/casualty, a worker of ABC Mining. Employee EMP-001 was present.";
    const out = redactIncidentFreeText(raw, ctx);
    expect(out).not.toContain("Jane");
    expect(out).not.toContain("Doe");
    expect(out).not.toContain("EMP-001");
    expect(out?.split(INCIDENT_CASUALTY_DISPLAY).length).toBeGreaterThan(1);
  });

  it("redacts nested employee fields while keeping company name", () => {
    const incident = {
      id: "i1",
      employeeId: "e1",
      description: "John Smith fell.",
      jobTitle: "Operator",
      employee: {
        id: "e1",
        firstName: "John",
        lastName: "Smith",
        employeeNumber: "E99",
        jobTitle: "Operator",
        company: { id: "c1", name: "Acme Mining Ltd" },
      },
    };
    const out = redactIncidentForSafetyOfficer(incident as Record<string, unknown>);
    expect((out.description as string).includes("John")).toBe(false);
    expect((out.employee as any).company.name).toBe("Acme Mining Ltd");
    expect((out.employee as any).firstName).toBe("");
    expect(out.employeeId).toBe("e1");
  });
});
