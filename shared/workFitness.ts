/** Employee work fitness & medication review — shared constants and labels */

export const WORK_FITNESS_CASE_TYPES = [
  "return_to_work",
  "routine_update",
  "drug_test_support",
] as const;
export type WorkFitnessCaseType = (typeof WORK_FITNESS_CASE_TYPES)[number];

export const WORK_FITNESS_CASE_STATUSES = [
  "submitted",
  "under_review",
  "assessed",
  "closed",
  "withdrawn",
] as const;
export type WorkFitnessCaseStatus = (typeof WORK_FITNESS_CASE_STATUSES)[number];

export const WORK_FITNESS_OUTCOMES = [
  "cleared",
  "cleared_with_restrictions",
  "not_cleared",
  "pending_follow_up",
] as const;
export type WorkFitnessOutcome = (typeof WORK_FITNESS_OUTCOMES)[number];

export const WORK_FITNESS_IMPACTS = [
  "none",
  "temporary_restriction",
  "light_duty",
  "unfit_specific_task",
  "unfit_duty",
] as const;
export type WorkFitnessImpact = (typeof WORK_FITNESS_IMPACTS)[number];

export const WORK_FITNESS_ACTIONS = [
  "documented_only",
  "med_replacement_suggested",
  "sick_leave_recommended",
  "referral",
  "notified_safety",
  "other",
] as const;
export type WorkFitnessAction = (typeof WORK_FITNESS_ACTIONS)[number];

/** Preset options for "what happened / why reporting" (stored in context_notes). */
export const WORK_FITNESS_CONTEXT_REASONS = [
  { id: "recovering_illness", label: "Recovering from illness or injury" },
  { id: "returning_sick_leave", label: "Returning after sick leave" },
  { id: "new_or_changed_meds", label: "Started or changed medication" },
  { id: "underground_clearance", label: "Need clearance for underground work" },
  { id: "machinery_clearance", label: "Need clearance for heavy machinery" },
  { id: "drug_test_disclosure", label: "Proactive drug test disclosure" },
  { id: "routine_medication", label: "Routine medication update" },
  { id: "__other__", label: "Other (describe below)" },
] as const;

export type WorkFitnessContextReasonId = (typeof WORK_FITNESS_CONTEXT_REASONS)[number]["id"];

export function resolveContextReasonPreset(stored: string | null | undefined): {
  preset: string;
  otherText: string;
} {
  const text = stored?.trim() ?? "";
  if (!text) return { preset: "", otherText: "" };
  const match = WORK_FITNESS_CONTEXT_REASONS.find((r) => r.id !== "__other__" && r.label === text);
  if (match) return { preset: match.id, otherText: "" };
  return { preset: "__other__", otherText: text };
}

export function formatContextReasonForStorage(preset: string, otherText: string): string | null {
  if (!preset) return otherText.trim() || null;
  if (preset === "__other__") return otherText.trim() || null;
  const item = WORK_FITNESS_CONTEXT_REASONS.find((r) => r.id === preset);
  return item?.label ?? (otherText.trim() || null);
}

export function displayContextReason(stored: string | null | undefined): string | null {
  return stored?.trim() || null;
}

export function workFitnessCaseTypeLabel(value: WorkFitnessCaseType | string | null | undefined): string {
  switch (value) {
    case "return_to_work":
      return "Return to work after illness";
    case "routine_update":
      return "Routine medication update";
    case "drug_test_support":
      return "Drug & alcohol test disclosure";
    default:
      return value?.replace(/_/g, " ") ?? "—";
  }
}

export function workFitnessStatusLabel(value: WorkFitnessCaseStatus | string | null | undefined): string {
  switch (value) {
    case "submitted":
      return "Awaiting review";
    case "under_review":
      return "Under review";
    case "assessed":
      return "Assessed";
    case "closed":
      return "Closed";
    case "withdrawn":
      return "Withdrawn";
    default:
      return value?.replace(/_/g, " ") ?? "—";
  }
}

export function workFitnessOutcomeLabel(value: WorkFitnessOutcome | string | null | undefined): string {
  switch (value) {
    case "cleared":
      return "Cleared for normal duties";
    case "cleared_with_restrictions":
      return "Cleared with restrictions";
    case "not_cleared":
      return "Not cleared for duty";
    case "pending_follow_up":
      return "Pending follow-up";
    default:
      return value?.replace(/_/g, " ") ?? "—";
  }
}

export function workFitnessImpactLabel(value: WorkFitnessImpact | string | null | undefined): string {
  switch (value) {
    case "none":
      return "No work impact";
    case "temporary_restriction":
      return "Temporary restriction";
    case "light_duty":
      return "Light duty";
    case "unfit_specific_task":
      return "Unfit for specific task";
    case "unfit_duty":
      return "Unfit for duty";
    default:
      return value?.replace(/_/g, " ") ?? "—";
  }
}

export function workFitnessActionLabel(value: WorkFitnessAction | string | null | undefined): string {
  switch (value) {
    case "documented_only":
      return "Documented only";
    case "med_replacement_suggested":
      return "Alternative medication suggested";
    case "sick_leave_recommended":
      return "Sick leave recommended";
    case "referral":
      return "Referral";
    case "notified_safety":
      return "Safety team notified";
    case "other":
      return "Other";
    default:
      return value?.replace(/_/g, " ") ?? "—";
  }
}

export function caseHasWorkImpact(caseRow: {
  fitnessOutcome?: string | null;
  fitnessImpact?: string | null;
  workRestrictions?: string | null;
  mayAffectDrugTest?: boolean | null;
}): boolean {
  if (caseRow.mayAffectDrugTest) return true;
  if (caseRow.workRestrictions?.trim()) return true;
  if (caseRow.fitnessOutcome === "cleared_with_restrictions" || caseRow.fitnessOutcome === "not_cleared") {
    return true;
  }
  const impact = caseRow.fitnessImpact;
  return !!impact && impact !== "none";
}

/** Comma-separated medication names for tables (not a count). */
export function formatMedicationNamesList(
  medications: { medicationName?: string | null }[],
  maxNames = 3,
): string {
  const names = medications.map((m) => m.medicationName?.trim()).filter((n): n is string => !!n);
  if (names.length === 0) return "—";
  if (names.length <= maxNames) return names.join(", ");
  const shown = names.slice(0, maxNames).join(", ");
  const remaining = names.length - maxNames;
  return `${shown}, and ${remaining} more`;
}

/** Portal/staff table: assessment outcome, not workflow status. */
export function workFitnessAssessmentOutcomeDisplay(
  fitnessOutcome: string | null | undefined,
  assessed: boolean,
): string {
  if (fitnessOutcome) return workFitnessOutcomeLabel(fitnessOutcome);
  if (assessed) return "Review complete — outcome not recorded";
  return "Awaiting review";
}

export function isWorkFitnessCaseReviewed(status: string | null | undefined): boolean {
  return status === "assessed" || status === "closed";
}

export type WorkFitnessReviewer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

export function formatWorkFitnessReviewerName(
  reviewer: WorkFitnessReviewer | null | undefined,
): string | null {
  if (!reviewer) return null;
  const name = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function workFitnessOutcomeBadgeVariant(
  fitnessOutcome: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (fitnessOutcome === "cleared") return "default";
  if (fitnessOutcome === "cleared_with_restrictions") return "secondary";
  if (fitnessOutcome === "not_cleared") return "destructive";
  if (fitnessOutcome === "pending_follow_up") return "outline";
  return "outline";
}

/** Outcomes where work restrictions and impact fields are clinically relevant. */
export function workFitnessOutcomeRequiresRestrictions(
  fitnessOutcome: string | null | undefined,
): boolean {
  return fitnessOutcome === "cleared_with_restrictions" || fitnessOutcome === "not_cleared";
}

/** Outcomes where underground / machinery clearance checkboxes apply. */
export function workFitnessOutcomeShowsClearanceChecks(
  fitnessOutcome: string | null | undefined,
): boolean {
  return fitnessOutcome === "cleared" || fitnessOutcome === "cleared_with_restrictions";
}

export function formatEmployeeJobTitle(employee: {
  jobTitle?: string | null;
  position?: string | null;
} | null | undefined): string | null {
  if (!employee) return null;
  const title = employee.jobTitle?.trim();
  if (title) return title;
  const position = employee.position?.trim();
  return position || null;
}
