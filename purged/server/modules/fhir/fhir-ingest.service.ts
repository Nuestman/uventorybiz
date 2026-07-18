import { and, eq, sql } from "drizzle-orm";
import type { IStorage } from "../../storage";
import { db } from "../../config/db";
import { employees, interopTransfers, patients, resourceIdentifiers } from "@shared/schema";
import type { FhirBundle, FhirResource } from "./fhir.types";
import { MINEAID_INTERNAL_SYSTEM } from "./fhir.constants";
import {
  findBySystemValue,
  ensurePrimaryFhirIdentifier,
  type FhirResourceType,
} from "./resource-identifiers.repository";
import {
  createInteropTransfer,
  getInteropPartnerById,
} from "../interop/interop.repository";

type IngestIssue = { severity: "error" | "warning" | "information"; message: string };

export type IngestInboundResult =
  | {
      ok: true;
      transferId: string;
      patientId: string;
      encountersCreated: number;
      encountersSkipped: number;
      vitalsRowsCreated: number;
      summary: string;
      issues: IngestIssue[];
    }
  | { ok: false; error: string; code: string; status?: number; issues?: IngestIssue[] };

function partnerResourceSystem(partnerId: string, resourceType: FhirResourceType): string {
  return `https://mineaidhms.com/fhir/inbound/${partnerId}/${resourceType}`;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getIdentifiers(resource: FhirResource): Array<{ system?: string; value?: string }> {
  return asArray(resource.identifier as { system?: string; value?: string } | undefined);
}

function identifierValue(resource: FhirResource, system: string): string | null {
  const hit = getIdentifiers(resource).find((id) => id.system === system && id.value);
  return hit?.value ?? null;
}

function extensionString(resource: FhirResource, url: string): string | null {
  const extensions = asArray(
    resource.extension as { url?: string; valueString?: string; valueCode?: string } | undefined,
  );
  const hit = extensions.find((e) => e.url === url);
  return hit?.valueString ?? hit?.valueCode ?? null;
}

function refId(reference?: string): string | null {
  if (!reference) return null;
  const slash = reference.lastIndexOf("/");
  return slash >= 0 ? reference.slice(slash + 1) : reference;
}

function parseBundleEntries(bundle: FhirBundle): FhirResource[] {
  return (bundle.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is FhirResource => !!r && typeof r.resourceType === "string");
}

function mapFhirClassToModality(enc: FhirResource): "in_person" | "telehealth" | "phone" {
  const coding = asArray(
    (enc.class as { coding?: Array<{ code?: string }> } | undefined)?.coding,
  );
  const code = coding[0]?.code ?? (enc.class as { code?: string } | undefined)?.code;
  if (code === "VR") return "telehealth";
  return "in_person";
}

function mapFhirStatusToMineAid(status?: string): string {
  switch (status) {
    case "planned":
      return "planned";
    case "arrived":
      return "arrived";
    case "triaged":
      return "triaged";
    case "in-progress":
      return "in_progress";
    case "finished":
      return "finished";
    case "cancelled":
      return "cancelled";
    default:
      return "finished";
  }
}

function mapDisposition(code?: string | null): string {
  const allowed = new Set([
    "return_to_work",
    "transferred_to_hospital",
    "transferred_to_hospital_other",
    "refer_in_person",
    "continue_telehealth",
    "unable_to_assess_remote",
  ]);
  if (code && allowed.has(code)) return code;
  return "return_to_work";
}

function mapVisitType(enc: FhirResource): string {
  const types = asArray((enc.type as Array<{ text?: string; coding?: Array<{ code?: string }> }> | undefined));
  const pathway = types[0]?.coding?.find((c) => c.code)?.code;
  if (pathway) return pathway.replace(/-/g, "_").slice(0, 64);
  const text = types[0]?.text;
  if (text) return text.toLowerCase().replace(/\s+/g, "_").slice(0, 64);
  return "follow_up";
}

type VitalAccumulator = {
  recordedAt: Date;
  heartRate?: number;
  temperature?: string;
  respiratoryRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  glucoseLevel?: number;
  painScore?: number;
  weight?: string;
  height?: string;
};

function applyObservation(acc: VitalAccumulator, obs: FhirResource) {
  const effective = (obs.effectiveDateTime as string | undefined) ?? (obs.issued as string | undefined);
  if (effective) {
    const d = new Date(effective);
    if (!Number.isNaN(d.getTime())) acc.recordedAt = d;
  }

  const coding = asArray(
    (obs.code as { coding?: Array<{ system?: string; code?: string; display?: string }> } | undefined)?.coding,
  );
  const loinc = coding.find((c) => c.system?.includes("loinc"))?.code ?? coding[0]?.code;
  const qty = obs.valueQuantity as { value?: number; unit?: string } | undefined;
  const str = obs.valueString as string | undefined;
  const value = qty?.value ?? str;

  if (value == null || value === "") return;

  switch (loinc) {
    case "85354-9": {
      const parts = String(value).split("/");
      const sys = Number.parseInt(parts[0], 10);
      const dia = Number.parseInt(parts[1], 10);
      if (Number.isFinite(sys)) acc.bloodPressureSystolic = sys;
      if (Number.isFinite(dia)) acc.bloodPressureDiastolic = dia;
      break;
    }
    case "8867-4":
      if (typeof value === "number") acc.heartRate = value;
      break;
    case "8310-5":
      acc.temperature = String(value);
      break;
    case "9279-1":
      if (typeof value === "number") acc.respiratoryRate = value;
      break;
    case "2708-6":
    case "59408-5":
      if (typeof value === "number") acc.oxygenSaturation = value;
      break;
    case "2339-0":
      if (typeof value === "number") acc.glucoseLevel = Math.round((value / 18) * 10) / 10;
      break;
    case "2345-7":
      if (typeof value === "number") acc.glucoseLevel = value;
      break;
    case "72514-3":
      if (typeof value === "number") acc.painScore = value;
      break;
    case "29463-7":
    case "3141-9":
      acc.weight = String(value);
      break;
    case "8302-2":
      acc.height = String(value);
      break;
    default:
      break;
  }
}

async function resolveInteropActorUserId(storage: IStorage, tenantId: string): Promise<string | null> {
  const staff = await storage.getActiveTenantUsersByRoles(tenantId, ["medical_staff"]);
  if (staff[0]?.id) return staff[0].id;
  const admins = await storage.getActiveTenantUsersByRoles(tenantId, ["admin"]);
  return admins[0]?.id ?? null;
}

async function resolvePatientFromFhir(
  storage: IStorage,
  tenantId: string,
  patient: FhirResource,
  partnerId: string,
): Promise<string | null> {
  const internalId = identifierValue(patient, MINEAID_INTERNAL_SYSTEM);
  if (internalId) {
    const ctx = await storage.getPatient(internalId, tenantId);
    if (ctx?.patient) return ctx.patient.id;
  }

  if (patient.id) {
    const byInbound = await findBySystemValue(
      tenantId,
      partnerResourceSystem(partnerId, "patient"),
      patient.id,
    );
    if (byInbound?.resourceType === "patient") return byInbound.resourceId;
  }

  const empNo = identifierValue(patient, "https://mineaidhms.com/employee-number");
  if (empNo) {
    const employee = await storage.getEmployeeByNumber(empNo, tenantId);
    if (employee) {
      const p = await storage.getPatientByEmployeeId(employee.id, tenantId);
      if (p) return p.id;
    }
  }

  const names = asArray(
    patient.name as Array<{ family?: string; given?: string[]; text?: string }> | undefined,
  );
  const birthDate = patient.birthDate as string | undefined;
  const name = names[0];
  if (name && birthDate) {
    const first = name.given?.[0] ?? name.text?.split(" ")[0];
    const last = name.family ?? name.text?.split(" ").slice(-1)[0];
    if (first && last) {
      const [row] = await db
        .select({ patient: patients })
        .from(patients)
        .innerJoin(employees, eq(patients.employeeId, employees.id))
        .where(
          and(
            eq(patients.tenantId, tenantId),
            sql`LOWER(${employees.firstName}) = LOWER(${first})`,
            sql`LOWER(${employees.lastName}) = LOWER(${last})`,
            eq(employees.dateOfBirth, birthDate),
          ),
        )
        .limit(1);
      if (row?.patient) return row.patient.id;
    }
  }

  return null;
}

async function alreadyIngestedEncounter(
  tenantId: string,
  partnerId: string,
  externalId: string,
): Promise<string | null> {
  const row = await findBySystemValue(tenantId, partnerResourceSystem(partnerId, "encounter"), externalId);
  return row?.resourceId ?? null;
}

async function registerInboundIdentifier(
  tenantId: string,
  partnerId: string,
  resourceType: FhirResourceType,
  resourceId: string,
  externalFhirId: string,
) {
  await db
    .insert(resourceIdentifiers)
    .values({
      tenantId,
      resourceType,
      resourceId,
      system: partnerResourceSystem(partnerId, resourceType),
      value: externalFhirId,
      isPrimary: false,
    })
    .onConflictDoNothing();
}

export async function ingestInboundFhirBundle(
  storage: IStorage,
  tenantId: string,
  partnerId: string,
  bundle: FhirBundle,
): Promise<IngestInboundResult> {
  const issues: IngestIssue[] = [];

  if (!bundle || bundle.resourceType !== "Bundle") {
    return { ok: false, error: "Request body must be a FHIR Bundle", code: "invalid", status: 400 };
  }

  const partner = await getInteropPartnerById(tenantId, partnerId);
  if (!partner) {
    return { ok: false, error: "Interop partner not found", code: "not-found", status: 404 };
  }

  const resources = parseBundleEntries(bundle);
  const patientResource = resources.find((r) => r.resourceType === "Patient");
  if (!patientResource) {
    return { ok: false, error: "Bundle must contain a Patient resource", code: "invalid", status: 422 };
  }

  const patientId = await resolvePatientFromFhir(storage, tenantId, patientResource, partnerId);
  if (!patientId) {
    return {
      ok: false,
      error:
        "Patient could not be matched to an existing employee/patient record. Include employee-number or MineAid internal identifier.",
      code: "patient-not-found",
      status: 422,
    };
  }

  if (patientResource.id) {
    await registerInboundIdentifier(tenantId, partnerId, "patient", patientId, patientResource.id);
  }

  const allergies = extensionString(patientResource, "https://mineaidhms.com/fhir/StructureDefinition/patient-allergies");
  const history = extensionString(
    patientResource,
    "https://mineaidhms.com/fhir/StructureDefinition/patient-medical-history",
  );
  const meds = extensionString(
    patientResource,
    "https://mineaidhms.com/fhir/StructureDefinition/patient-home-medications",
  );
  const patientPatch: Record<string, string> = {};
  if (allergies) patientPatch.allergies = allergies;
  if (history) patientPatch.medicalHistory = history;
  if (meds) patientPatch.medications = meds;
  if (Object.keys(patientPatch).length > 0) {
    await storage.updatePatient(patientId, patientPatch, tenantId);
    issues.push({ severity: "information", message: "Patient health profile fields updated from bundle" });
  }

  const actorUserId = await resolveInteropActorUserId(storage, tenantId);
  if (!actorUserId) {
    return {
      ok: false,
      error: "No clinical staff user available to attribute imported encounters",
      code: "no-actor",
      status: 500,
    };
  }

  const primaryLocation = await storage.getPrimaryCareLocation(tenantId);
  const locationId = primaryLocation?.id ?? null;

  const encounterResources = resources.filter((r) => r.resourceType === "Encounter");
  const observations = resources.filter((r) => r.resourceType === "Observation");

  const encounterIdByFhirId = new Map<string, string>();
  let encountersCreated = 0;
  let encountersSkipped = 0;
  const encounterIds: string[] = [];

  for (const enc of encounterResources) {
    const externalId = enc.id ?? identifierValue(enc, MINEAID_INTERNAL_SYSTEM);
    if (!externalId) {
      issues.push({ severity: "warning", message: "Skipped Encounter without id" });
      continue;
    }

    const existingId = await alreadyIngestedEncounter(tenantId, partnerId, externalId);
    if (existingId) {
      encounterIdByFhirId.set(externalId, existingId);
      encountersSkipped += 1;
      continue;
    }

    const period = enc.period as { start?: string; end?: string } | undefined;
    const visitDate = period?.start ? new Date(period.start) : new Date();
    const reasonCodes = asArray(enc.reasonCode as Array<{ text?: string }> | undefined);
    const chiefComplaint =
      reasonCodes[0]?.text?.trim() ||
      extensionString(enc, "https://mineaidhms.com/fhir/StructureDefinition/clinical-assessment")?.slice(0, 500) ||
      "Imported clinical encounter";

    const disposition = mapDisposition(
      extensionString(enc, "https://mineaidhms.com/fhir/StructureDefinition/disposition"),
    );

    const created = await storage.createMedicalVisit(
      {
        patientId,
        medicalStaffId: actorUserId,
        locationId,
        modality: mapFhirClassToModality(enc),
        pathway: "routine_clinic",
        visitDate,
        visitType: mapVisitType(enc),
        chiefComplaint,
        historyOfPresentIllness: null,
        assessment: extensionString(enc, "https://mineaidhms.com/fhir/StructureDefinition/clinical-assessment"),
        treatment: extensionString(enc, "https://mineaidhms.com/fhir/StructureDefinition/treatment-plan"),
        workRestrictions: extensionString(enc, "https://mineaidhms.com/fhir/StructureDefinition/work-restrictions"),
        disposition,
        dispositionDateTime: period?.end ? new Date(period.end) : visitDate,
        status: mapFhirStatusToMineAid(enc.status as string | undefined),
        notes: `[Inbound FHIR from ${partner.name}]`,
      },
      tenantId,
      actorUserId,
    );

    encounterIdByFhirId.set(externalId, created.id);
    encounterIds.push(created.id);
    encountersCreated += 1;

    await registerInboundIdentifier(tenantId, partnerId, "encounter", created.id, externalId);
    await ensurePrimaryFhirIdentifier(tenantId, "encounter", created.id);
  }

  let vitalsRowsCreated = 0;
  const vitalsByEncounter = new Map<string, VitalAccumulator>();

  for (const obs of observations) {
    const encRef = refId((obs.encounter as { reference?: string } | undefined)?.reference);
    if (!encRef) continue;
    const internalEncounterId = encounterIdByFhirId.get(encRef);
    if (!internalEncounterId) continue;

    let acc = vitalsByEncounter.get(internalEncounterId);
    if (!acc) {
      acc = { recordedAt: new Date() };
      vitalsByEncounter.set(internalEncounterId, acc);
    }
    applyObservation(acc, obs);
  }

  for (const [medicalVisitId, vitals] of vitalsByEncounter) {
    const hasAny =
      vitals.heartRate != null ||
      vitals.temperature != null ||
      vitals.respiratoryRate != null ||
      vitals.bloodPressureSystolic != null ||
      vitals.bloodPressureDiastolic != null ||
      vitals.oxygenSaturation != null ||
      vitals.glucoseLevel != null ||
      vitals.painScore != null ||
      vitals.weight != null ||
      vitals.height != null;

    if (!hasAny) continue;

    await storage.createVitalSigns(
      {
        patientId,
        medicalVisitId,
        encounterId: medicalVisitId,
        recordedBy: actorUserId,
        locationId,
        recordedAt: vitals.recordedAt,
        heartRate: vitals.heartRate ?? null,
        temperature: vitals.temperature ?? null,
        respiratoryRate: vitals.respiratoryRate ?? null,
        bloodPressureSystolic: vitals.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: vitals.bloodPressureDiastolic ?? null,
        oxygenSaturation: vitals.oxygenSaturation ?? null,
        glucoseLevel: vitals.glucoseLevel ?? null,
        painScore: vitals.painScore ?? null,
        weight: vitals.weight ?? null,
        height: vitals.height ?? null,
        notes: `Imported from FHIR bundle (${partner.name})`,
      },
      tenantId,
    );
    vitalsRowsCreated += 1;
  }

  const transfer = await createInteropTransfer(tenantId, {
    patientId,
    partnerId,
    encounterIds,
    bundleId: bundle.id ?? bundle.identifier?.value ?? `inbound-${Date.now()}`,
    createdBy: actorUserId,
    deliveryMethod: "inbound",
    referringEncounterId: encounterIds[0] ?? null,
  });

  await db
    .update(interopTransfers)
    .set({ status: "received", updatedAt: new Date() })
    .where(and(eq(interopTransfers.id, transfer.id), eq(interopTransfers.tenantId, tenantId)));

  const summary = `Ingested bundle for patient ${patientId}: ${encountersCreated} encounter(s) created, ${encountersSkipped} skipped, ${vitalsRowsCreated} vital sign row(s).`;
  issues.push({ severity: "information", message: summary });

  return {
    ok: true,
    transferId: transfer.id,
    patientId,
    encountersCreated,
    encountersSkipped,
    vitalsRowsCreated,
    summary,
    issues,
  };
}
