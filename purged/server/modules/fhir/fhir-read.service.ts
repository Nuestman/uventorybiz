import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { IStorage } from "../../storage";
import { db } from "../../config/db";
import {
  encounters,
  referralFacilities,
  tenants,
  vitalSigns,
  type Encounter,
} from "@shared/schema";
import type { FhirBundle, FhirResource } from "./fhir.types";
import { getFhirBaseUrl, identifierSystem } from "./fhir.constants";
import { buildBundle } from "./mappers/fhir-utils";
import {
  mapEncounterToFhir,
  mapPatientToFhir,
  mapTenantToSourceOrg,
  mapTransferComposition,
  mapVitalObservation,
  vitalsFromEncounter,
  vitalsFromVitalSignsRow,
} from "./mappers/fhir-mappers";
import { ensurePrimaryFhirIdentifier, resolveInternalResourceId } from "./resource-identifiers.repository";

export async function buildFhirPatient(
  storage: IStorage,
  tenantId: string,
  patientId: string,
): Promise<FhirResource | null> {
  const ctx = await storage.getPatient(patientId, tenantId);
  if (!ctx?.patient) return null;
  const { fhirId } = await ensurePrimaryFhirIdentifier(tenantId, "patient", patientId);
  return mapPatientToFhir({ patient: ctx.patient, employee: ctx.employee, fhirId });
}

export async function buildFhirEncounter(
  storage: IStorage,
  tenantId: string,
  encounterId: string,
): Promise<FhirResource | null> {
  const encounter = await storage.getMedicalVisit(encounterId, tenantId);
  if (!encounter) return null;

  const { fhirId: patientFhirId } = await ensurePrimaryFhirIdentifier(tenantId, "patient", encounter.patientId);
  const { fhirId } = await ensurePrimaryFhirIdentifier(tenantId, "encounter", encounterId);

  const enc = encounter as Encounter & {
    transferFacility?: { name: string } | null;
    transferFacilityOther?: string | null;
  };

  return mapEncounterToFhir({
    encounter,
    fhirId,
    patientFhirId,
    transferFacilityName: enc.transferFacility?.name ?? enc.transferFacilityOther,
  });
}

export async function buildPatientEverythingBundle(
  storage: IStorage,
  tenantId: string,
  patientId: string,
): Promise<FhirBundle | null> {
  const patientResource = await buildFhirPatient(storage, tenantId, patientId);
  if (!patientResource?.id) return null;

  const resources: FhirResource[] = [patientResource];
  const visits = await storage.getMedicalVisits(patientId, tenantId);

  for (const visit of visits) {
    const enc = await buildFhirEncounter(storage, tenantId, visit.id);
    if (enc) resources.push(enc);
    resources.push(...(await observationsForEncounter(tenantId, visit, patientResource.id)));
  }

  return buildBundle("collection", resources, {
    system: identifierSystem(tenantId, "patient"),
    value: patientResource.id,
  });
}

async function observationsForEncounter(
  tenantId: string,
  encounter: Encounter,
  patientFhirId: string,
): Promise<FhirResource[]> {
  const { fhirId: encounterFhirId } = await ensurePrimaryFhirIdentifier(tenantId, "encounter", encounter.id);
  const out: FhirResource[] = [];
  const recordedAt = encounter.visitDate ?? new Date();

  for (const vital of vitalsFromEncounter(encounter)) {
    out.push(
      mapVitalObservation({
        fhirId: randomUUID(),
        patientFhirId,
        encounterFhirId,
        recordedAt,
        ...vital,
      }),
    );
  }

  const rows = await db
    .select()
    .from(vitalSigns)
    .where(and(eq(vitalSigns.tenantId, tenantId), eq(vitalSigns.medicalVisitId, encounter.id)));

  for (const row of rows) {
    for (const vital of vitalsFromVitalSignsRow(row)) {
      out.push(
        mapVitalObservation({
          fhirId: randomUUID(),
          patientFhirId,
          encounterFhirId,
          recordedAt: row.recordedAt,
          ...vital,
        }),
      );
    }
  }

  return out;
}

export async function buildCareTransferBundle(
  storage: IStorage,
  tenantId: string,
  input: {
    patientId: string;
    encounterIds: string[];
    partnerName?: string;
    destinationFacilityId?: string | null;
    referringEncounterId?: string | null;
  },
): Promise<FhirBundle | null> {
  const patientCtx = await storage.getPatient(input.patientId, tenantId);
  if (!patientCtx?.patient) return null;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return null;

  const { fhirId: patientFhirId } = await ensurePrimaryFhirIdentifier(tenantId, "patient", input.patientId);
  const sourceOrgId = randomUUID();
  const resources: FhirResource[] = [
    mapPatientToFhir({ patient: patientCtx.patient, employee: patientCtx.employee, fhirId: patientFhirId }),
    mapTenantToSourceOrg(tenant, sourceOrgId),
  ];

  let destinationOrgId: string | undefined;
  if (input.destinationFacilityId) {
    const [facility] = await db
      .select()
      .from(referralFacilities)
      .where(and(eq(referralFacilities.id, input.destinationFacilityId), eq(referralFacilities.tenantId, tenantId)))
      .limit(1);
    if (facility) {
      destinationOrgId = randomUUID();
      resources.push({
        resourceType: "Organization",
        id: destinationOrgId,
        identifier: [{ system: "https://mineaidhms.com/internal-id", value: facility.id }],
        active: facility.status === "active",
        name: facility.name,
        address: facility.address ? [{ text: facility.address }] : undefined,
        telecom: [
          ...(facility.contactPhone ? [{ system: "phone", value: facility.contactPhone }] : []),
          ...(facility.contactEmail ? [{ system: "email", value: facility.contactEmail }] : []),
        ],
      });
    }
  }

  const uniqueEncounterIds = [...new Set(input.encounterIds)];
  let encounterRows =
    uniqueEncounterIds.length > 0
      ? await db
          .select()
          .from(encounters)
          .where(
            and(
              eq(encounters.tenantId, tenantId),
              eq(encounters.patientId, input.patientId),
              inArray(encounters.id, uniqueEncounterIds),
            ),
          )
          .orderBy(desc(encounters.visitDate))
      : [];

  if (encounterRows.length === 0) {
    const recent = await storage.getMedicalVisits(input.patientId, tenantId);
    encounterRows = recent.slice(0, 5);
  }

  let primaryEncounterFhirId: string | undefined;
  const summaryLines: string[] = [];

  for (const enc of encounterRows) {
    const { fhirId } = await ensurePrimaryFhirIdentifier(tenantId, "encounter", enc.id);
    if (!primaryEncounterFhirId || enc.id === input.referringEncounterId) {
      primaryEncounterFhirId = fhirId;
    }
    resources.push(
      mapEncounterToFhir({
        encounter: enc,
        fhirId,
        patientFhirId,
        transferFacilityName: input.partnerName,
      }),
    );
    resources.push(...(await observationsForEncounter(tenantId, enc, patientFhirId)));
    summaryLines.push(
      `${new Date(enc.visitDate).toLocaleDateString()}: ${enc.chiefComplaint} — ${enc.disposition?.replace(/_/g, " ") ?? "open"}`,
    );
  }

  const employee = patientCtx.employee;
  const patientName = employee
    ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
    : "Patient";

  if (primaryEncounterFhirId) {
    resources.unshift(
      mapTransferComposition({
        fhirId: randomUUID(),
        patientFhirId,
        encounterFhirId: primaryEncounterFhirId,
        sourceOrgFhirId: sourceOrgId,
        destinationOrgFhirId: destinationOrgId,
        title: `Care transfer — ${patientName}`,
        patientName,
        summaryLines,
      }),
    );
  }

  return buildBundle("document", resources, {
    system: `${getFhirBaseUrl()}/Bundle/transfer`,
    value: randomUUID(),
  });
}

export async function resolveFhirPatientId(
  storage: IStorage,
  tenantId: string,
  fhirOrInternalId: string,
): Promise<string | null> {
  const internal = await resolveInternalResourceId(tenantId, "patient", fhirOrInternalId);
  if (!internal) return null;
  const ctx = await storage.getPatient(internal, tenantId);
  return ctx?.patient ? internal : null;
}

export async function resolveFhirEncounterId(tenantId: string, fhirOrInternalId: string): Promise<string | null> {
  return resolveInternalResourceId(tenantId, "encounter", fhirOrInternalId);
}
