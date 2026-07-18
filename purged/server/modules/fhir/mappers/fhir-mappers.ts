import type { Employee, Encounter, Patient, Tenant, VitalSigns } from "@shared/schema";
import { HL7_ENCOUNTER_CLASS, LOINC, MINEAID_INTERNAL_SYSTEM } from "../fhir.constants";
import type { FhirResource } from "../fhir.types";
import {
  dispositionDisplay,
  fhirDate,
  fhirInstant,
  mapEncounterStatus,
  mapGender,
  mapModalityClass,
  narrativeDiv,
  ref,
} from "./fhir-utils";

type PatientContext = {
  patient: Patient;
  employee?: Employee | null;
  fhirId: string;
};

export function mapPatientToFhir(ctx: PatientContext): FhirResource {
  const { patient, employee, fhirId } = ctx;
  const name = employee
    ? [{ family: employee.lastName, given: [employee.firstName], text: `${employee.firstName} ${employee.lastName}` }]
    : undefined;

  return {
    resourceType: "Patient",
    id: fhirId,
    identifier: [
      { system: MINEAID_INTERNAL_SYSTEM, value: patient.id, use: "official" },
      ...(employee?.employeeNumber
        ? [{ system: "https://mineaidhms.com/employee-number", value: employee.employeeNumber }]
        : []),
    ],
    active: patient.status === "active",
    name,
    gender: mapGender(employee?.gender),
    birthDate: fhirDate(employee?.dateOfBirth),
    telecom: [
      ...(employee?.phoneNumber ? [{ system: "phone", value: employee.phoneNumber, use: "mobile" }] : []),
      ...(employee?.email ? [{ system: "email", value: employee.email }] : []),
    ],
    extension: [
      ...(patient.allergies
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/patient-allergies",
              valueString: patient.allergies,
            },
          ]
        : []),
      ...(patient.medicalHistory
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/patient-medical-history",
              valueString: patient.medicalHistory,
            },
          ]
        : []),
      ...(patient.medications
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/patient-home-medications",
              valueString: patient.medications,
            },
          ]
        : []),
    ],
  };
}

type EncounterContext = {
  encounter: Encounter;
  fhirId: string;
  patientFhirId: string;
  transferFacilityName?: string | null;
};

export function mapEncounterToFhir(ctx: EncounterContext): FhirResource {
  const { encounter, fhirId, patientFhirId, transferFacilityName } = ctx;
  const modality = mapModalityClass(encounter.modality);

  const hospitalization =
    encounter.disposition === "transferred_to_hospital" ||
    encounter.disposition === "transferred_to_hospital_other"
      ? {
          dischargeDisposition: {
            text: dispositionDisplay(encounter.disposition),
          },
          origin: transferFacilityName ? { display: transferFacilityName } : undefined,
        }
      : undefined;

  return {
    resourceType: "Encounter",
    id: fhirId,
    identifier: [{ system: MINEAID_INTERNAL_SYSTEM, value: encounter.id, use: "official" }],
    status: mapEncounterStatus(encounter.status),
    class: {
      system: HL7_ENCOUNTER_CLASS,
      code: modality.code,
      display: modality.display,
    },
    type: [
      {
        text: encounter.visitType?.replace(/_/g, " ") ?? "clinical visit",
        coding: encounter.pathway
          ? [{ system: "https://mineaidhms.com/fhir/pathway", code: encounter.pathway }]
          : undefined,
      },
    ],
    subject: ref("Patient", patientFhirId),
    period: {
      start: fhirInstant(encounter.visitDate),
      end: fhirInstant(encounter.dispositionDateTime ?? encounter.updatedAt),
    },
    reasonCode: encounter.chiefComplaint ? [{ text: encounter.chiefComplaint }] : undefined,
    hospitalization,
    extension: [
      {
        url: "https://mineaidhms.com/fhir/StructureDefinition/disposition",
        valueCode: encounter.disposition,
      },
      ...(encounter.workRestrictions
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/work-restrictions",
              valueString: encounter.workRestrictions,
            },
          ]
        : []),
      ...(encounter.assessment
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/clinical-assessment",
              valueString: encounter.assessment,
            },
          ]
        : []),
      ...(encounter.treatment
        ? [
            {
              url: "https://mineaidhms.com/fhir/StructureDefinition/treatment-plan",
              valueString: encounter.treatment,
            },
          ]
        : []),
    ],
  };
}

export function mapOrganizationToFhir(input: {
  fhirId: string;
  name: string;
  internalId?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}): FhirResource {
  return {
    resourceType: "Organization",
    id: input.fhirId,
    identifier: input.internalId
      ? [{ system: MINEAID_INTERNAL_SYSTEM, value: input.internalId }]
      : undefined,
    active: true,
    name: input.name,
    telecom: [
      ...(input.phone ? [{ system: "phone", value: input.phone }] : []),
      ...(input.email ? [{ system: "email", value: input.email }] : []),
    ],
    address: input.address ? [{ text: input.address, use: "work" }] : undefined,
  };
}

export function mapVitalObservation(input: {
  fhirId: string;
  patientFhirId: string;
  encounterFhirId?: string;
  loinc: string;
  display: string;
  value: number | string;
  unit?: string;
  recordedAt: Date | string;
}): FhirResource {
  const isNumeric = typeof input.value === "number";
  return {
    resourceType: "Observation",
    id: input.fhirId,
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    code: {
      coding: [{ system: LOINC, code: input.loinc, display: input.display }],
      text: input.display,
    },
    subject: ref("Patient", input.patientFhirId),
    encounter: input.encounterFhirId ? ref("Encounter", input.encounterFhirId) : undefined,
    effectiveDateTime: fhirInstant(input.recordedAt),
    valueQuantity: isNumeric
      ? { value: input.value, unit: input.unit ?? "", system: "http://unitsofmeasure.org" }
      : undefined,
    valueString: !isNumeric ? String(input.value) : undefined,
  };
}

export function vitalsFromEncounter(encounter: Encounter): Array<{
  loinc: string;
  display: string;
  value: number | string;
  unit?: string;
}> {
  const out: Array<{ loinc: string; display: string; value: number | string; unit?: string }> = [];
  if (encounter.bloodPressureSystolic != null && encounter.bloodPressureDiastolic != null) {
    out.push({
      loinc: "85354-9",
      display: "Blood pressure",
      value: `${encounter.bloodPressureSystolic}/${encounter.bloodPressureDiastolic}`,
      unit: "mmHg",
    });
  }
  if (encounter.heartRate != null) {
    out.push({ loinc: "8867-4", display: "Heart rate", value: encounter.heartRate, unit: "/min" });
  }
  if (encounter.temperature) {
    out.push({ loinc: "8310-5", display: "Body temperature", value: encounter.temperature, unit: "Cel" });
  }
  if (encounter.respiratoryRate != null) {
    out.push({ loinc: "9279-1", display: "Respiratory rate", value: encounter.respiratoryRate, unit: "/min" });
  }
  if (encounter.oxygenSaturation != null) {
    out.push({ loinc: "2708-6", display: "Oxygen saturation", value: encounter.oxygenSaturation, unit: "%" });
  }
  if (encounter.painScore != null) {
    out.push({ loinc: "72514-3", display: "Pain severity", value: encounter.painScore, unit: "{score}" });
  }
  return out;
}

export function vitalsFromVitalSignsRow(row: VitalSigns): Array<{
  loinc: string;
  display: string;
  value: number | string;
  unit?: string;
}> {
  const out: Array<{ loinc: string; display: string; value: number | string; unit?: string }> = [];
  if (row.bloodPressureSystolic != null && row.bloodPressureDiastolic != null) {
    out.push({
      loinc: "85354-9",
      display: "Blood pressure",
      value: `${row.bloodPressureSystolic}/${row.bloodPressureDiastolic}`,
      unit: "mmHg",
    });
  }
  if (row.heartRate != null) {
    out.push({ loinc: "8867-4", display: "Heart rate", value: row.heartRate, unit: "/min" });
  }
  if (row.temperature) {
    out.push({ loinc: "8310-5", display: "Body temperature", value: row.temperature, unit: "Cel" });
  }
  if (row.respiratoryRate != null) {
    out.push({ loinc: "9279-1", display: "Respiratory rate", value: row.respiratoryRate, unit: "/min" });
  }
  if (row.oxygenSaturation != null) {
    out.push({ loinc: "2708-6", display: "Oxygen saturation", value: row.oxygenSaturation, unit: "%" });
  }
  if (row.painScore != null) {
    out.push({ loinc: "72514-3", display: "Pain severity", value: row.painScore, unit: "{score}" });
  }
  return out;
}

export function mapTransferComposition(input: {
  fhirId: string;
  patientFhirId: string;
  encounterFhirId: string;
  sourceOrgFhirId: string;
  destinationOrgFhirId?: string;
  title: string;
  patientName: string;
  summaryLines: string[];
}): FhirResource {
  return {
    resourceType: "Composition",
    id: input.fhirId,
    status: "final",
    type: {
      coding: [{ system: LOINC, code: "34133-9", display: "Summarization of episode note" }],
      text: "Care transfer summary",
    },
    subject: ref("Patient", input.patientFhirId),
    encounter: ref("Encounter", input.encounterFhirId),
    date: new Date().toISOString(),
    author: [ref("Organization", input.sourceOrgFhirId)],
    title: input.title,
    custodian: ref("Organization", input.sourceOrgFhirId),
    section: [
      {
        title: "Transfer summary",
        text: { status: "generated", div: narrativeDiv(input.title, input.summaryLines) },
      },
      ...(input.destinationOrgFhirId
        ? [
            {
              title: "Receiving facility",
              entry: [ref("Organization", input.destinationOrgFhirId)],
            },
          ]
        : []),
    ],
  };
}

export function mapTenantToSourceOrg(tenant: Tenant, fhirId: string): FhirResource {
  return mapOrganizationToFhir({
    fhirId,
    name: tenant.appName ?? tenant.name,
    internalId: tenant.id,
    address: tenant.address,
    phone: tenant.contactPhone,
    email: tenant.contactEmail,
  });
}
