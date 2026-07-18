import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Plus, Eye, Pencil } from "lucide-react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WorkFitnessCaseFormFields } from "@/components/medications/WorkFitnessCaseFormFields";
import {
  buildWorkFitnessCasePayload,
  emptyWorkFitnessCaseForm,
  isWorkFitnessContextReasonValid,
  workFitnessCaseFormFromApi,
  resolvePrescriberFacilitySelectValue,
  type WorkFitnessCaseFormValues,
  type ReferralFacilityOption,
} from "@/lib/workFitnessForm";
import {
  PortalEmptyState,
  PortalLoadingBlock,
  PortalPageHeader,
  PORTAL_PRIMARY_BTN_CLASS,
  formatDateTime,
} from "./portalUi";
import {
  workFitnessCaseTypeLabel,
  formatMedicationNamesList,
  isWorkFitnessCaseReviewed,
} from "@shared/workFitness";
import { WorkFitnessOutcomeCell } from "@/components/medications/WorkFitnessOutcomeCell";
import { WorkFitnessCaseViewContent } from "@/components/medications/WorkFitnessCaseViewContent";

type PortalMedication = {
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

type PortalAssessment = {
  reviewedAt: string | null;
  assessedByName: string | null;
  fitnessOutcome: string | null;
  fitnessImpact: string | null;
  workRestrictions: string | null;
  mayAffectDrugTest: boolean | null;
  drugTestDisclosureNotes: string | null;
  assessmentNotes: string | null;
  actionTaken: string | null;
  actionNotes: string | null;
};

export type PortalWorkFitnessCase = {
  id: string;
  submittedAt: string;
  caseType: string;
  contextNotes: string | null;
  employeeFeelingNotes: string | null;
  status: string | null;
  medications: PortalMedication[];
  assessment: PortalAssessment | null;
  canEdit: boolean;
};

const LIST_KEY = ["/api/portal/work-fitness"] as const;
const REFERRAL_KEY = ["/api/portal/referral-facilities"] as const;

function caseToForm(row: PortalWorkFitnessCase): WorkFitnessCaseFormValues {
  return workFitnessCaseFormFromApi(row);
}

export default function PortalWorkFitnessPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewCase, setViewCase] = useState<PortalWorkFitnessCase | null>(null);
  const [editCase, setEditCase] = useState<PortalWorkFitnessCase | null>(null);
  const [form, setForm] = useState<WorkFitnessCaseFormValues>(emptyWorkFitnessCaseForm());
  const [facilitySelectValues, setFacilitySelectValues] = useState<string[]>([""]);

  const { data = [], isLoading } = useQuery<PortalWorkFitnessCase[]>({
    queryKey: LIST_KEY,
    queryFn: getQueryFn<PortalWorkFitnessCase[]>({ on401: "throw" }),
  });

  const { data: referralFacilities = [] } = useQuery<ReferralFacilityOption[]>({
    queryKey: REFERRAL_KEY,
    queryFn: getQueryFn<ReferralFacilityOption[]>({ on401: "throw" }),
  });

  const resetForm = () => {
    setForm(emptyWorkFitnessCaseForm());
    setFacilitySelectValues([""]);
  };

  const handleFacilityChange = (index: number, selectValue: string, facilityName: string) => {
    setFacilitySelectValues((prev) => {
      const next = [...prev];
      next[index] = selectValue;
      return next;
    });
    setForm((current) => ({
      ...current,
      medications: current.medications.map((m, i) =>
        i === index ? { ...m, prescriberFacility: facilityName } : m,
      ),
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildWorkFitnessCasePayload(form);
      if (!payload.medications.length) throw new Error("Add at least one medication");
      const res = await apiRequest("POST", "/api/portal/work-fitness", payload);
      return res.json() as Promise<PortalWorkFitnessCase>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast({
        title: "Declaration submitted",
        description: "Your occupational health team will review your medications and work fitness.",
      });
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not save declaration",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCase) throw new Error("No case selected");
      const res = await apiRequest(
        "PUT",
        `/api/portal/work-fitness/${editCase.id}`,
        buildWorkFitnessCasePayload(form),
      );
      return res.json() as Promise<PortalWorkFitnessCase>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      setEditCase(null);
      resetForm();
      toast({ title: "Declaration updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update declaration",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const openEdit = (row: PortalWorkFitnessCase) => {
    setEditCase(row);
    setForm(caseToForm(row));
    setFacilitySelectValues(
      row.medications.map((m) => resolvePrescriberFacilitySelectValue(m.prescriberFacility, referralFacilities)),
    );
  };

  const hasValidMeds = form.medications.some((m) => m.medicationName.trim());
  const canSubmit = hasValidMeds && isWorkFitnessContextReasonValid(form);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon={ShieldCheck}
        title="Medication declarations"
        description="Declare medications and how you feel so clinic staff can assess whether you are safe to return to your normal duties."
        action={
          <Button
            className={PORTAL_PRIMARY_BTN_CLASS}
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New declaration
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your declarations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PortalLoadingBlock />
          ) : data.length === 0 ? (
            <PortalEmptyState
              icon={ShieldCheck}
              title="No medication declarations yet"
              description="After illness or when starting new medications, submit a declaration so clinicians can review side effects and clearance for work — including drug test context if relevant."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Clinic outcome</TableHead>
                    <TableHead className="hidden md:table-cell">Assessed by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const outcome = row.assessment?.fitnessOutcome ?? null;
                    const reviewed = isWorkFitnessCaseReviewed(row.status);
                    return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{workFitnessCaseTypeLabel(row.caseType)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDateTime(row.submittedAt)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        <span className="line-clamp-2" title={formatMedicationNamesList(row.medications, 99)}>
                          {formatMedicationNamesList(row.medications)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <WorkFitnessOutcomeCell
                          fitnessOutcome={outcome}
                          status={row.status}
                          workRestrictions={row.assessment?.workRestrictions}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {row.assessment?.assessedByName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" title="View details" onClick={() => setViewCase(row)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {row.canEdit ? (
                            <Button variant="ghost" size="sm" title="Edit declaration" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="portal-root portal-ui sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Declare medication</DialogTitle>
            <DialogDescription>
              Tell us about your medications and any side effects. This helps determine if you are fit for your normal work — and can support drug test results if your medicine contains substances kits may detect.
            </DialogDescription>
          </DialogHeader>
          <WorkFitnessCaseFormFields
            values={form}
            onChange={(patch) => setForm((c) => ({ ...c, ...patch }))}
            referralFacilities={referralFacilities}
            prescriberFacilitySelectValues={facilitySelectValues}
            onPrescriberFacilitySelectChange={handleFacilityChange}
            imageUploadTarget="portal"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending} className={PORTAL_PRIMARY_BTN_CLASS}>
              {createMutation.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewCase} onOpenChange={(o) => !o && setViewCase(null)}>
        <DialogContent className="portal-root portal-ui sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your declaration</DialogTitle>
          </DialogHeader>
          {viewCase ? (
            <WorkFitnessCaseViewContent
              caseType={viewCase.caseType}
              submittedAt={viewCase.submittedAt}
              contextNotes={viewCase.contextNotes}
              employeeFeelingNotes={viewCase.employeeFeelingNotes}
              status={viewCase.status}
              medications={viewCase.medications}
              fitnessOutcome={viewCase.assessment?.fitnessOutcome}
              fitnessImpact={viewCase.assessment?.fitnessImpact}
              workRestrictions={viewCase.assessment?.workRestrictions}
              assessmentNotes={viewCase.assessment?.assessmentNotes}
              actionTaken={viewCase.assessment?.actionTaken}
              actionNotes={viewCase.assessment?.actionNotes}
              mayAffectDrugTest={viewCase.assessment?.mayAffectDrugTest}
              drugTestDisclosureNotes={viewCase.assessment?.drugTestDisclosureNotes}
              assessedByName={viewCase.assessment?.assessedByName ?? undefined}
              reviewedAt={viewCase.assessment?.reviewedAt}
              formatDateTime={formatDateTime}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCase(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCase} onOpenChange={(o) => { if (!o) { setEditCase(null); resetForm(); } }}>
        <DialogContent className="portal-root portal-ui sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit declaration</DialogTitle>
            <DialogDescription>Changes are allowed until clinic staff begin their review.</DialogDescription>
          </DialogHeader>
          <WorkFitnessCaseFormFields
            values={form}
            onChange={(patch) => setForm((c) => ({ ...c, ...patch }))}
            referralFacilities={referralFacilities}
            prescriberFacilitySelectValues={facilitySelectValues}
            onPrescriberFacilitySelectChange={handleFacilityChange}
            imageUploadTarget="portal"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCase(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!canSubmit || updateMutation.isPending} className={PORTAL_PRIMARY_BTN_CLASS}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
