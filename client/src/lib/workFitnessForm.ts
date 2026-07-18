import type { WorkFitnessCaseType } from "@shared/workFitness";
import { resolveContextReasonPreset, formatContextReasonForStorage } from "@shared/workFitness";

export type WorkFitnessMedicationFormValues = {
  medicationName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
  frequency: string;
  prescribedFor: string;
  prescriberName: string;
  prescriberFacility: string;
  startDate: string;
  /** Number of days from start date; empty when chronic/long-term. */
  durationDays: string;
  isOngoing: boolean;
  employeeSideEffects: string;
  employeeNoSideEffects: boolean;
  medicationImageUrl: string;
};

export type WorkFitnessCaseFormValues = {
  caseType: WorkFitnessCaseType;
  contextReasonPreset: string;
  contextNotes: string;
  employeeFeelingNotes: string;
  medications: WorkFitnessMedicationFormValues[];
};

export type ReferralFacilityOption = {
  id: string;
  name: string;
};

export function addDaysToDateString(startDate: string, days: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function inferDurationDaysFromDates(
  startDate: string | null | undefined,
  expectedEndDate: string | null | undefined,
): string {
  if (!startDate || !expectedEndDate) return "";
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${expectedEndDate}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff > 0 ? String(diff) : "";
}

export function computeExpectedEndDate(
  startDate: string,
  durationDays: string,
  isOngoing: boolean,
): string | null {
  if (isOngoing || !startDate.trim()) return null;
  const days = parseInt(durationDays, 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  return addDaysToDateString(startDate, days);
}

export function emptyWorkFitnessMedication(): WorkFitnessMedicationFormValues {
  return {
    medicationName: "",
    genericName: "",
    strength: "",
    dosageForm: "",
    route: "",
    frequency: "",
    prescribedFor: "",
    prescriberName: "",
    prescriberFacility: "",
    startDate: "",
    durationDays: "",
    isOngoing: false,
    employeeSideEffects: "",
    employeeNoSideEffects: false,
    medicationImageUrl: "",
  };
}

export function emptyWorkFitnessCaseForm(): WorkFitnessCaseFormValues {
  return {
    caseType: "return_to_work",
    contextReasonPreset: "",
    contextNotes: "",
    employeeFeelingNotes: "",
    medications: [emptyWorkFitnessMedication()],
  };
}

export function resolvePrescriberFacilitySelectValue(
  facilityName: string | null | undefined,
  referralFacilities: ReferralFacilityOption[],
): string {
  if (!facilityName) return "";
  const match = referralFacilities.find((f) => f.name === facilityName);
  return match ? match.id : "__manual";
}

function buildMedicationPayload(med: WorkFitnessMedicationFormValues) {
  const isOngoing = med.isOngoing;
  const body: Record<string, unknown> = {
    medicationName: med.medicationName.trim(),
    genericName: med.genericName.trim() || null,
    strength: med.strength.trim() || null,
    dosageForm: med.dosageForm.trim() || null,
    route: med.route.trim() || null,
    frequency: med.frequency.trim() || null,
    prescribedFor: med.prescribedFor.trim() || null,
    prescriberName: med.prescriberName.trim() || null,
    prescriberFacility: med.prescriberFacility.trim() || null,
    isOngoing,
    employeeSideEffects: med.employeeNoSideEffects ? null : med.employeeSideEffects.trim() || null,
    employeeNoSideEffects: med.employeeNoSideEffects,
  };
  if (med.medicationImageUrl?.trim()) body.medicationImageUrl = med.medicationImageUrl.trim();
  if (med.startDate) body.startDate = med.startDate;
  const expectedEnd = computeExpectedEndDate(med.startDate, med.durationDays, isOngoing);
  if (expectedEnd) body.expectedEndDate = expectedEnd;
  return body;
}

export function isWorkFitnessContextReasonValid(
  values: Pick<WorkFitnessCaseFormValues, "contextReasonPreset" | "contextNotes">,
): boolean {
  if (!values.contextReasonPreset) return false;
  if (values.contextReasonPreset === "__other__") return values.contextNotes.trim().length > 0;
  return true;
}

export function buildWorkFitnessCasePayload(values: WorkFitnessCaseFormValues) {
  const medications = values.medications
    .filter((m) => m.medicationName.trim())
    .map(buildMedicationPayload);
  return {
    caseType: values.caseType,
    contextNotes: formatContextReasonForStorage(values.contextReasonPreset, values.contextNotes),
    employeeFeelingNotes: values.employeeFeelingNotes.trim() || null,
    medications,
  };
}

export function workFitnessCaseFormFromApi(row: {
  caseType: string;
  contextNotes?: string | null;
  employeeFeelingNotes?: string | null;
  medications: Parameters<typeof medicationFormFromApi>[0][];
}): WorkFitnessCaseFormValues {
  const { preset, otherText } = resolveContextReasonPreset(row.contextNotes);
  return {
    caseType: (row.caseType as WorkFitnessCaseType) || "return_to_work",
    contextReasonPreset: preset,
    contextNotes: otherText,
    employeeFeelingNotes: row.employeeFeelingNotes ?? "",
    medications: row.medications.map((m) => medicationFormFromApi(m)),
  };
}

export function medicationFormFromApi(med: {
  medicationName: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  frequency?: string | null;
  prescribedFor?: string | null;
  prescriberName?: string | null;
  prescriberFacility?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  isOngoing?: boolean | null;
  employeeSideEffects?: string | null;
  employeeNoSideEffects?: boolean | null;
  medicationImageUrl?: string | null;
}): WorkFitnessMedicationFormValues {
  const isOngoing = med.isOngoing ?? false;
  const startDate = med.startDate ?? "";
  return {
    medicationName: med.medicationName,
    genericName: med.genericName ?? "",
    strength: med.strength ?? "",
    dosageForm: med.dosageForm ?? "",
    route: med.route ?? "",
    frequency: med.frequency ?? "",
    prescribedFor: med.prescribedFor ?? "",
    prescriberName: med.prescriberName ?? "",
    prescriberFacility: med.prescriberFacility ?? "",
    startDate,
    durationDays: isOngoing ? "" : inferDurationDaysFromDates(startDate, med.expectedEndDate),
    isOngoing,
    employeeSideEffects: med.employeeSideEffects ?? "",
    employeeNoSideEffects: med.employeeNoSideEffects ?? false,
    medicationImageUrl: med.medicationImageUrl ?? "",
  };
}
