import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MedicationImageThumb } from "@/components/medications/MedicationImageThumb";
import {
  workFitnessActionLabel,
  workFitnessCaseTypeLabel,
  workFitnessImpactLabel,
  workFitnessAssessmentOutcomeDisplay,
  workFitnessOutcomeBadgeVariant,
  isWorkFitnessCaseReviewed,
  displayContextReason,
} from "@shared/workFitness";

function defaultFormatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type WorkFitnessViewMedication = {
  id: string;
  medicationName: string;
  strength?: string | null;
  frequency?: string | null;
  employeeSideEffects?: string | null;
  employeeNoSideEffects?: boolean | null;
  clinicianMedicationNotes?: string | null;
  medicationImageUrl?: string | null;
};

export type WorkFitnessCaseViewContentProps = {
  caseType: string;
  submittedAt?: string | Date | null;
  contextNotes?: string | null;
  employeeFeelingNotes?: string | null;
  status?: string | null;
  medications: WorkFitnessViewMedication[];
  fitnessOutcome?: string | null;
  fitnessImpact?: string | null;
  workRestrictions?: string | null;
  assessmentNotes?: string | null;
  actionTaken?: string | null;
  actionNotes?: string | null;
  mayAffectDrugTest?: boolean | null;
  drugTestDisclosureNotes?: string | null;
  assessedByName?: string | null;
  reviewedAt?: string | Date | null;
  employeeName?: string;
  employeeJobTitle?: string | null;
  employeeNumber?: string;
  companyName?: string | null;
  selfDeclared?: boolean;
  showClinicianMedNotes?: boolean;
  formatDateTime?: (value: string | Date) => string;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2 text-sm">
      <span className="text-muted-foreground text-xs font-medium pt-0.5">{label}</span>
      <div className="text-foreground min-w-0">{children}</div>
    </div>
  );
}

export function WorkFitnessCaseViewContent({
  caseType,
  submittedAt,
  contextNotes,
  employeeFeelingNotes,
  status,
  medications,
  fitnessOutcome,
  fitnessImpact,
  workRestrictions,
  assessmentNotes,
  actionTaken,
  actionNotes,
  mayAffectDrugTest,
  drugTestDisclosureNotes,
  assessedByName,
  reviewedAt,
  employeeName,
  employeeJobTitle,
  employeeNumber,
  companyName,
  selfDeclared,
  showClinicianMedNotes = false,
  formatDateTime,
}: WorkFitnessCaseViewContentProps) {
  const reviewed = isWorkFitnessCaseReviewed(status);
  const reason = displayContextReason(contextNotes);
  const feeling = employeeFeelingNotes?.trim();
  const fmt = formatDateTime ?? defaultFormatDateTime;
  const submittedLabel = submittedAt ? fmt(typeof submittedAt === "string" ? submittedAt : submittedAt.toISOString()) : null;

  return (
    <div className="space-y-5 text-sm">
      {(employeeName || employeeJobTitle || employeeNumber) ? (
        <div className="space-y-1">
          {employeeName ? <p className="text-base font-semibold text-foreground">{employeeName}</p> : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {employeeJobTitle ? <span>{employeeJobTitle}</span> : null}
            {employeeJobTitle && employeeNumber ? <span aria-hidden>·</span> : null}
            {employeeNumber ? <span className="font-mono">{employeeNumber}</span> : null}
            {companyName ? (
              <>
                <span aria-hidden>·</span>
                <span>{companyName}</span>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] font-normal">
              {workFitnessCaseTypeLabel(caseType)}
            </Badge>
            {selfDeclared ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Self-declared
              </Badge>
            ) : null}
            {submittedLabel ? (
              <span className="text-[11px] text-muted-foreground self-center">Submitted {submittedLabel}</span>
            ) : null}
          </div>
        </div>
      ) : submittedLabel ? (
        <p className="text-xs text-muted-foreground">Submitted {submittedLabel}</p>
      ) : null}

      <div
        className={
          reviewed
            ? "rounded-xl border bg-muted/40 px-4 py-3 space-y-2"
            : "rounded-xl border border-dashed px-4 py-3"
        }
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Clinic outcome
        </p>
        {reviewed ? (
          <>
            <Badge variant={workFitnessOutcomeBadgeVariant(fitnessOutcome)} className="whitespace-normal text-left">
              {workFitnessAssessmentOutcomeDisplay(fitnessOutcome, true)}
            </Badge>
            {workRestrictions?.trim() ? (
              <p className="text-xs text-foreground/80 leading-relaxed">{workRestrictions.trim()}</p>
            ) : null}
            {assessedByName ? (
              <p className="text-[11px] text-muted-foreground">
                {assessedByName}
                {reviewedAt ? ` · ${fmt(typeof reviewedAt === "string" ? reviewedAt : reviewedAt.toISOString())}` : ""}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Awaiting clinic review</p>
        )}
      </div>

      {(reason || feeling) ? (
        <>
          <Separator />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Employee report
            </p>
            <DetailRow label="Reason">{reason}</DetailRow>
            <DetailRow label="How they feel">{feeling}</DetailRow>
          </div>
        </>
      ) : null}

      {medications.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Medications ({medications.length})
            </p>
            <ul className="space-y-2">
              {medications.map((m) => (
                <li
                  key={m.id}
                  className="flex gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <MedicationImageThumb
                    url={m.medicationImageUrl}
                    className="h-12 w-12 rounded-md border object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium text-foreground leading-snug">{m.medicationName}</p>
                    {(m.strength || m.frequency) ? (
                      <p className="text-xs text-muted-foreground">
                        {[m.strength, m.frequency].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {m.employeeNoSideEffects ? (
                      <p className="text-xs text-muted-foreground">No side effects reported</p>
                    ) : m.employeeSideEffects ? (
                      <p className="text-xs text-amber-800/90">{m.employeeSideEffects}</p>
                    ) : null}
                    {showClinicianMedNotes && m.clinicianMedicationNotes ? (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/50 mt-1">
                        Clinician: {m.clinicianMedicationNotes}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {reviewed && (fitnessImpact || assessmentNotes || actionTaken || mayAffectDrugTest) ? (
        <>
          <Separator />
          <div className="space-y-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Review details
            </p>
            <DetailRow label="Work impact">
              {fitnessImpact ? workFitnessImpactLabel(fitnessImpact) : null}
            </DetailRow>
            <DetailRow label="Notes">{assessmentNotes?.trim()}</DetailRow>
            <DetailRow label="Action">
              {actionTaken ? (
                <span>
                  {workFitnessActionLabel(actionTaken)}
                  {actionNotes?.trim() ? ` — ${actionNotes.trim()}` : ""}
                </span>
              ) : null}
            </DetailRow>
            {mayAffectDrugTest ? (
              <DetailRow label="Drug test">
                <span className="text-amber-800/90">
                  Recorded for testing context
                  {drugTestDisclosureNotes?.trim() ? ` — ${drugTestDisclosureNotes.trim()}` : ""}
                </span>
              </DetailRow>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
