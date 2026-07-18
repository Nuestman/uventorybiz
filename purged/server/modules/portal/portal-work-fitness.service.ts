import type {
  EmployeeWorkFitnessCase,
  EmployeeWorkFitnessMedication,
} from "@shared/schema";
import { formatWorkFitnessReviewerName } from "@shared/workFitness";
import type { IStorage } from "../../storage";
import type { PortalWorkFitnessCreate, PortalWorkFitnessUpdate } from "./portal-work-fitness.schemas";

export type PortalWorkFitnessMedicationDto = {
  id: string;
  medicationName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  frequency: string | null;
  prescribedFor: string | null;
  prescriberName: string | null;
  prescriberFacility: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  isOngoing: boolean | null;
  employeeSideEffects: string | null;
  employeeNoSideEffects: boolean | null;
  medicationImageUrl: string | null;
};

export type PortalWorkFitnessAssessmentDto = {
  reviewedAt: Date | string | null;
  assessedByName: string | null;
  fitnessOutcome: string | null;
  fitnessImpact: string | null;
  workRestrictions: string | null;
  restrictionStartDate: string | null;
  restrictionEndDate: string | null;
  clearedUnderground: boolean | null;
  clearedHeavyMachinery: boolean | null;
  mayAffectDrugTest: boolean | null;
  drugTestDisclosureNotes: string | null;
  assessmentNotes: string | null;
  actionTaken: string | null;
  actionNotes: string | null;
};

export type PortalWorkFitnessCaseDto = {
  id: string;
  submittedAt: Date | string;
  caseType: string;
  contextNotes: string | null;
  employeeFeelingNotes: string | null;
  status: string;
  medications: PortalWorkFitnessMedicationDto[];
  assessment: PortalWorkFitnessAssessmentDto | null;
  canEdit: boolean;
};

function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

function mapMedication(med: EmployeeWorkFitnessMedication): PortalWorkFitnessMedicationDto {
  return {
    id: med.id,
    medicationName: med.medicationName,
    genericName: med.genericName,
    strength: med.strength,
    dosageForm: med.dosageForm,
    route: med.route,
    frequency: med.frequency,
    prescribedFor: med.prescribedFor,
    prescriberName: med.prescriberName,
    prescriberFacility: med.prescriberFacility,
    startDate: formatDateOnly(med.startDate),
    expectedEndDate: formatDateOnly(med.expectedEndDate),
    isOngoing: med.isOngoing,
    employeeSideEffects: med.employeeSideEffects,
    employeeNoSideEffects: med.employeeNoSideEffects,
    medicationImageUrl: med.medicationImageUrl,
  };
}

export function sanitizeWorkFitnessCaseForPortal(
  row: EmployeeWorkFitnessCase & {
    medications: EmployeeWorkFitnessMedication[];
    reviewedByUser?: { id: string; firstName: string | null; lastName: string | null } | null;
  },
): PortalWorkFitnessCaseDto {
  const status = row.status ?? "submitted";
  const assessed = status === "assessed" || status === "closed";
  return {
    id: row.id,
    submittedAt: row.submittedAt,
    caseType: row.caseType,
    contextNotes: row.contextNotes,
    employeeFeelingNotes: row.employeeFeelingNotes,
    status,
    medications: row.medications.map(mapMedication),
    assessment: assessed
      ? {
          reviewedAt: row.reviewedAt,
          assessedByName: formatWorkFitnessReviewerName(row.reviewedByUser),
          fitnessOutcome: row.fitnessOutcome,
          fitnessImpact: row.fitnessImpact,
          workRestrictions: row.workRestrictions,
          restrictionStartDate: formatDateOnly(row.restrictionStartDate),
          restrictionEndDate: formatDateOnly(row.restrictionEndDate),
          clearedUnderground: row.clearedUnderground,
          clearedHeavyMachinery: row.clearedHeavyMachinery,
          mayAffectDrugTest: row.mayAffectDrugTest,
          drugTestDisclosureNotes: row.drugTestDisclosureNotes,
          assessmentNotes: row.assessmentNotes,
          actionTaken: row.actionTaken,
          actionNotes: row.actionNotes,
        }
      : null,
    canEdit: status === "submitted",
  };
}

export async function listPortalWorkFitnessCases(
  storage: IStorage,
  tenantId: string,
  employeeId: string,
): Promise<PortalWorkFitnessCaseDto[]> {
  const rows = await storage.listWorkFitnessCases(tenantId, { employeeId });
  return rows.map((row) => sanitizeWorkFitnessCaseForPortal(row));
}

export async function getPortalWorkFitnessCase(
  storage: IStorage,
  tenantId: string,
  employeeId: string,
  id: string,
): Promise<PortalWorkFitnessCaseDto | null> {
  const row = await storage.getWorkFitnessCase(id, tenantId);
  if (!row || row.employeeId !== employeeId) return null;
  return sanitizeWorkFitnessCaseForPortal(row);
}

function normalizeMedications(body: PortalWorkFitnessCreate["medications"]) {
  return body.map((med, index) => ({
    medicationName: med.medicationName.trim(),
    genericName: med.genericName?.trim() || null,
    strength: med.strength?.trim() || null,
    dosageForm: med.dosageForm?.trim() || null,
    route: med.route?.trim() || null,
    frequency: med.frequency?.trim() || null,
    prescribedFor: med.prescribedFor?.trim() || null,
    prescriberName: med.prescriberName?.trim() || null,
    prescriberFacility: med.prescriberFacility?.trim() || null,
    startDate: med.startDate ?? null,
    expectedEndDate: med.expectedEndDate ?? null,
    isOngoing: med.isOngoing ?? true,
    employeeSideEffects: med.employeeSideEffects?.trim() || null,
    employeeNoSideEffects: med.employeeNoSideEffects ?? false,
    medicationImageUrl: med.medicationImageUrl?.trim() || null,
    sortOrder: index,
  }));
}

export async function createPortalWorkFitnessCase(
  storage: IStorage,
  tenantId: string,
  employeeId: string,
  body: PortalWorkFitnessCreate,
): Promise<PortalWorkFitnessCaseDto> {
  const created = await storage.createWorkFitnessCase(tenantId, null, {
    employeeId,
    caseType: body.caseType ?? "return_to_work",
    contextNotes: body.contextNotes?.trim() || null,
    employeeFeelingNotes: body.employeeFeelingNotes?.trim() || null,
    submittedByEmployee: true,
    status: "submitted",
    locationId: null,
    medications: normalizeMedications(body.medications),
  });
  return sanitizeWorkFitnessCaseForPortal(created);
}

export async function updatePortalWorkFitnessCase(
  storage: IStorage,
  tenantId: string,
  employeeId: string,
  id: string,
  body: PortalWorkFitnessUpdate,
): Promise<{ ok: true; data: PortalWorkFitnessCaseDto } | { ok: false; code: "NOT_FOUND" | "NOT_EDITABLE" }> {
  const existing = await storage.getWorkFitnessCase(id, tenantId);
  if (!existing || existing.employeeId !== employeeId) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if ((existing.status ?? "submitted") !== "submitted") {
    return { ok: false, code: "NOT_EDITABLE" };
  }

  const patch: Parameters<IStorage["updateWorkFitnessCase"]>[2] = {};
  if (body.caseType !== undefined) patch.caseType = body.caseType;
  if (body.contextNotes !== undefined) patch.contextNotes = body.contextNotes?.trim() || null;
  if (body.employeeFeelingNotes !== undefined) {
    patch.employeeFeelingNotes = body.employeeFeelingNotes?.trim() || null;
  }
  if (body.medications !== undefined) {
    patch.medications = normalizeMedications(body.medications);
  }

  const updated = await storage.updateWorkFitnessCase(id, tenantId, patch);
  return { ok: true, data: sanitizeWorkFitnessCaseForPortal(updated) };
}
