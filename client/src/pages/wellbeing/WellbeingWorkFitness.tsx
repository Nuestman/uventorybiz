import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EmployeeWorkFitnessCase, EmployeeWorkFitnessMedication } from "@shared/schema";
import {
  workFitnessActionLabel,
  workFitnessCaseTypeLabel,
  workFitnessImpactLabel,
  workFitnessOutcomeLabel,
  formatMedicationNamesList,
  formatWorkFitnessReviewerName,
  formatEmployeeJobTitle,
  isWorkFitnessCaseReviewed,
  workFitnessOutcomeRequiresRestrictions,
  workFitnessOutcomeShowsClearanceChecks,
  WORK_FITNESS_ACTIONS,
  WORK_FITNESS_IMPACTS,
  WORK_FITNESS_OUTCOMES,
} from "@shared/workFitness";
import { WorkFitnessOutcomeCell } from "@/components/medications/WorkFitnessOutcomeCell";
import { WorkFitnessCaseViewContent } from "@/components/medications/WorkFitnessCaseViewContent";
import { MedicationImageThumb } from "@/components/medications/MedicationImageThumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import PatientSearchInput from "@/components/PatientSearchInput";
import { WorkFitnessCaseFormFields } from "@/components/medications/WorkFitnessCaseFormFields";
import {
  buildWorkFitnessCasePayload,
  emptyWorkFitnessCaseForm,
  isWorkFitnessContextReasonValid,
  type ReferralFacilityOption,
  type WorkFitnessCaseFormValues,
} from "@/lib/workFitnessForm";
import { ArrowLeft, Plus, ShieldCheck, Eye, ClipboardCheck, Pencil, Trash2 } from "lucide-react";

type WorkFitnessRow = EmployeeWorkFitnessCase & {
  employee?: {
    firstName?: string | null;
    lastName?: string | null;
    employeeNumber?: string | null;
    jobTitle?: string | null;
    position?: string | null;
  } | null;
  company?: { name?: string | null } | null;
  medications: EmployeeWorkFitnessMedication[];
  reviewedByUser?: { id: string; firstName: string | null; lastName: string | null } | null;
};

type StatusFilter = "all" | "submitted" | "under_review" | "assessed" | "closed";

export default function WellbeingWorkFitness() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeLocation } = useActiveLocation();
  const canWrite = user?.role !== "operations";
  const isOperationsRole = user?.role === "operations";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "portal" | string>("all");
  const [employeeFilter, setEmployeeFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCase, setViewCase] = useState<WorkFitnessRow | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [activeCase, setActiveCase] = useState<WorkFitnessRow | null>(null);
  const [editingReview, setEditingReview] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCase, setDeleteCase] = useState<WorkFitnessRow | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [caseForm, setCaseForm] = useState<WorkFitnessCaseFormValues>(emptyWorkFitnessCaseForm());
  const [facilitySelectValues, setFacilitySelectValues] = useState<string[]>([""]);

  const [fitnessOutcome, setFitnessOutcome] = useState<string | undefined>();
  const [fitnessImpact, setFitnessImpact] = useState<string | undefined>();
  const [workRestrictions, setWorkRestrictions] = useState("");
  const [restrictionStartDate, setRestrictionStartDate] = useState("");
  const [restrictionEndDate, setRestrictionEndDate] = useState("");
  const [clearedUnderground, setClearedUnderground] = useState<boolean | null>(null);
  const [clearedHeavyMachinery, setClearedHeavyMachinery] = useState<boolean | null>(null);
  const [mayAffectDrugTest, setMayAffectDrugTest] = useState(false);
  const [drugTestDisclosureNotes, setDrugTestDisclosureNotes] = useState("");
  const [actionTaken, setActionTaken] = useState<string | undefined>();
  const [actionNotes, setActionNotes] = useState("");
  const [assessmentNotes, setAssessmentNotes] = useState("");
  const [medClinicianNotes, setMedClinicianNotes] = useState<Record<string, string>>({});

  const queryKey = ["/api/wellbeing/work-fitness", { statusFilter, employeeFilter, locationFilter }];

  const { data: careLocations = [] } = useQuery<{ id: string; locationName: string; locationCode?: string }[]>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load locations");
      return res.json();
    },
  });

  const { data: cases = [], isLoading } = useQuery<WorkFitnessRow[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationFilter === "portal") params.set("portalOnly", "true");
      else if (locationFilter !== "all") params.set("locationId", locationFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (employeeFilter.trim()) params.set("employeeId", employeeFilter.trim());
      const base = "/api/wellbeing/work-fitness";
      const res = await fetch(params.toString() ? `${base}?${params}` : base, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load work fitness cases");
      return res.json();
    },
  });

  const { data: referralFacilities = [] } = useQuery<ReferralFacilityOption[]>({
    queryKey: ["/api/referral-facilities"],
    queryFn: async () => {
      const res = await fetch("/api/referral-facilities");
      if (!res.ok) throw new Error("Failed to load referral facilities");
      return res.json();
    },
  });

  const resetCaseForm = () => {
    setSelectedPatient(null);
    setNewEmployeeId("");
    setCaseForm(emptyWorkFitnessCaseForm());
    setFacilitySelectValues([""]);
  };

  const resetAssessForm = () => {
    setFitnessOutcome(undefined);
    setFitnessImpact(undefined);
    setWorkRestrictions("");
    setRestrictionStartDate("");
    setRestrictionEndDate("");
    setClearedUnderground(null);
    setClearedHeavyMachinery(null);
    setMayAffectDrugTest(false);
    setDrugTestDisclosureNotes("");
    setActionTaken(undefined);
    setActionNotes("");
    setAssessmentNotes("");
    setMedClinicianNotes({});
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildWorkFitnessCasePayload(caseForm);
      const body: Record<string, unknown> = {
        employeeId: newEmployeeId.trim(),
        ...payload,
      };
      if (activeLocation?.id) body.locationId = activeLocation.id;
      const res = await fetch("/api/wellbeing/work-fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to create case");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Work fitness case created" });
      resetCaseForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create case", description: err.message, variant: "destructive" });
    },
  });

  const assessMutation = useMutation({
    mutationFn: async () => {
      if (!activeCase) return;
      const body = {
        fitnessOutcome: fitnessOutcome || undefined,
        fitnessImpact: fitnessImpact || undefined,
        workRestrictions: workRestrictions.trim() || undefined,
        restrictionStartDate: restrictionStartDate || undefined,
        restrictionEndDate: restrictionEndDate || undefined,
        clearedUnderground: clearedUnderground === null ? undefined : clearedUnderground,
        clearedHeavyMachinery: clearedHeavyMachinery === null ? undefined : clearedHeavyMachinery,
        mayAffectDrugTest,
        drugTestDisclosureNotes: drugTestDisclosureNotes.trim() || undefined,
        actionTaken: actionTaken || undefined,
        actionNotes: actionNotes.trim() || undefined,
        assessmentNotes: assessmentNotes.trim() || undefined,
        medicationNotes: activeCase.medications.map((m) => ({
          id: m.id,
          clinicianMedicationNotes: medClinicianNotes[m.id]?.trim() || null,
        })),
      };
      const res = await fetch(`/api/wellbeing/work-fitness/${activeCase.id}/assess`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to save assessment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: editingReview ? "Review updated" : "Review completed" });
      resetAssessForm();
      setAssessOpen(false);
      setActiveCase(null);
      setEditingReview(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save assessment", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/wellbeing/work-fitness/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete case");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Case deleted" });
      setDeleteOpen(false);
      setDeleteCase(null);
    },
  });

  const openAssess = (row: WorkFitnessRow) => {
    const reviewed = isWorkFitnessCaseReviewed(row.status);
    setEditingReview(reviewed);
    setActiveCase(row);
    setFitnessOutcome(row.fitnessOutcome ?? undefined);
    setFitnessImpact(row.fitnessImpact ?? undefined);
    setWorkRestrictions(row.workRestrictions ?? "");
    setRestrictionStartDate(row.restrictionStartDate ?? "");
    setRestrictionEndDate(row.restrictionEndDate ?? "");
    setClearedUnderground(row.clearedUnderground ?? null);
    setClearedHeavyMachinery(row.clearedHeavyMachinery ?? null);
    setMayAffectDrugTest(row.mayAffectDrugTest ?? false);
    setDrugTestDisclosureNotes(row.drugTestDisclosureNotes ?? "");
    setActionTaken(row.actionTaken ?? undefined);
    setActionNotes(row.actionNotes ?? "");
    setAssessmentNotes(row.assessmentNotes ?? "");
    const notes: Record<string, string> = {};
    for (const m of row.medications) notes[m.id] = m.clinicianMedicationNotes ?? "";
    setMedClinicianNotes(notes);
    setAssessOpen(true);
  };

  const handleFacilityChange = (index: number, selectValue: string, facilityName: string) => {
    setFacilitySelectValues((prev) => {
      const next = [...prev];
      next[index] = selectValue;
      return next;
    });
    setCaseForm((current) => ({
      ...current,
      medications: current.medications.map((m, i) =>
        i === index ? { ...m, prescriberFacility: facilityName } : m,
      ),
    }));
  };

  const pendingCount = cases.filter((c) => !isWorkFitnessCaseReviewed(c.status)).length;
  const showRestrictionFields = workFitnessOutcomeRequiresRestrictions(fitnessOutcome);
  const showClearanceFields = workFitnessOutcomeShowsClearanceChecks(fitnessOutcome);
  const showDrugTestSection =
    activeCase?.caseType === "drug_test_support" || mayAffectDrugTest || showRestrictionFields;

  return (
    <div className="p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Work fitness & medications</h1>
            <p className="text-sm text-uventorybiz-gray">
              Review employee medications, side effects, and fitness to return to normal duties.
            </p>
          </div>
        </div>
        {canWrite ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New case
          </Button>
        ) : null}
      </div>

      {isOperationsRole ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You see cases with work impact or drug-test relevance only. Assessment actions are read-only for your role.
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ShieldCheck className="h-4 w-4 text-uventorybiz-navy" />
                Fitness review queue
              </CardTitle>
              <CardDescription>
                {pendingCount > 0 ? (
                  <span><span className="font-medium text-amber-700">{pendingCount}</span> awaiting assessment · </span>
                ) : null}
                Portal submissions appear under the Employee portal filter.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v)}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  <SelectItem value="portal">Employee portal</SelectItem>
                  {careLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.locationCode ? `${loc.locationCode} — ` : ""}{loc.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Employee ID…" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-9 w-36" />
              <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Awaiting review</SelectItem>
                  <SelectItem value="under_review">Under review (legacy)</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-uventorybiz-gray">Loading cases…</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-uventorybiz-gray">No work fitness cases match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Assessment outcome</TableHead>
                    <TableHead>Assessed by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((row) => {
                    const name = `${row.employee?.firstName ?? ""} ${row.employee?.lastName ?? ""}`.trim() || "Unknown";
                    const jobTitle = formatEmployeeJobTitle(row.employee);
                    const selfDeclared = row.submittedByEmployee && !row.locationId;
                    const reviewed = isWorkFitnessCaseReviewed(row.status);
                    const assessedBy = formatWorkFitnessReviewerName(row.reviewedByUser);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{name}</p>
                          {jobTitle ? <p className="text-xs text-uventorybiz-gray">{jobTitle}</p> : null}
                          <p className="text-xs font-mono text-uventorybiz-gray">{row.employee?.employeeNumber ?? row.employeeId}</p>
                          {selfDeclared ? (
                            <Badge variant="secondary" className="mt-1 text-[10px]">Self-declared</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{workFitnessCaseTypeLabel(row.caseType)}</TableCell>
                        <TableCell className="text-sm max-w-[220px]">
                          <span className="line-clamp-2" title={formatMedicationNamesList(row.medications, 99)}>
                            {formatMedicationNamesList(row.medications)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <WorkFitnessOutcomeCell
                            fitnessOutcome={row.fitnessOutcome}
                            status={row.status}
                            workRestrictions={row.workRestrictions}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-uventorybiz-gray">
                          {assessedBy ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View details"
                              onClick={() => { setViewCase(row); setViewOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canWrite ? (
                              <>
                                <Button
                                  variant={reviewed ? "outline" : "default"}
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openAssess(row)}
                                >
                                  {reviewed ? (
                                    <>
                                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                      Edit review
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                                      Start review
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700"
                                  title="Delete case"
                                  onClick={() => { setDeleteCase(row); setDeleteOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
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

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCaseForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New work fitness case</DialogTitle>
            <DialogDescription>Record medications and employee-reported side effects for wellbeing review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <PatientSearchInput
              selectedPatient={selectedPatient}
              onSelect={(p) => {
                setSelectedPatient(p);
                setNewEmployeeId(p?.employeeId ?? "");
              }}
              placeholder="Search employee…"
            />
            <WorkFitnessCaseFormFields
              values={caseForm}
              onChange={(patch) => setCaseForm((c) => ({ ...c, ...patch }))}
              referralFacilities={referralFacilities}
              prescriberFacilitySelectValues={facilitySelectValues}
              onPrescriberFacilitySelectChange={handleFacilityChange}
              showSideEffects
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCaseForm(); }}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !newEmployeeId
                || !isWorkFitnessContextReasonValid(caseForm)
                || !caseForm.medications.some((m) => m.medicationName.trim())
                || createMutation.isPending
              }
            >
              Create case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={viewOpen} onOpenChange={(o) => { setViewOpen(o); if (!o) setViewCase(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work fitness case</DialogTitle>
          </DialogHeader>
          {viewCase ? (
            <WorkFitnessCaseViewContent
              caseType={viewCase.caseType}
              submittedAt={viewCase.submittedAt}
              contextNotes={viewCase.contextNotes}
              employeeFeelingNotes={viewCase.employeeFeelingNotes}
              status={viewCase.status}
              medications={viewCase.medications}
              fitnessOutcome={viewCase.fitnessOutcome}
              fitnessImpact={viewCase.fitnessImpact}
              workRestrictions={viewCase.workRestrictions}
              assessmentNotes={viewCase.assessmentNotes}
              actionTaken={viewCase.actionTaken}
              actionNotes={viewCase.actionNotes}
              mayAffectDrugTest={viewCase.mayAffectDrugTest}
              drugTestDisclosureNotes={viewCase.drugTestDisclosureNotes}
              assessedByName={formatWorkFitnessReviewerName(viewCase.reviewedByUser) ?? undefined}
              reviewedAt={viewCase.reviewedAt}
              employeeName={[viewCase.employee?.firstName, viewCase.employee?.lastName].filter(Boolean).join(" ") || undefined}
              employeeJobTitle={formatEmployeeJobTitle(viewCase.employee)}
              employeeNumber={viewCase.employee?.employeeNumber ?? undefined}
              companyName={viewCase.company?.name ?? undefined}
              selfDeclared={!!(viewCase.submittedByEmployee && !viewCase.locationId)}
              showClinicianMedNotes
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            {viewCase && canWrite ? (
              <Button onClick={() => { setViewOpen(false); openAssess(viewCase); }}>
                {isWorkFitnessCaseReviewed(viewCase.status) ? (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit review
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Start review
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assess */}
      <Dialog open={assessOpen} onOpenChange={(o) => { setAssessOpen(o); if (!o) { resetAssessForm(); setActiveCase(null); setEditingReview(false); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReview ? "Edit fitness review" : "Fitness review"}</DialogTitle>
            <DialogDescription>
              Review medications and side effects with the employee, then record clearance for work.
            </DialogDescription>
          </DialogHeader>
          {activeCase ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <p className="font-medium">
                  {`${activeCase.employee?.firstName ?? ""} ${activeCase.employee?.lastName ?? ""}`.trim() || "Employee"}
                </p>
                {formatEmployeeJobTitle(activeCase.employee) ? (
                  <p className="text-xs text-gray-600 mt-0.5">{formatEmployeeJobTitle(activeCase.employee)}</p>
                ) : null}
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {activeCase.employee?.employeeNumber ?? activeCase.employeeId}
                  {activeCase.company?.name ? ` · ${activeCase.company.name}` : ""}
                </p>
                <p className="text-xs text-gray-600 mt-1">{workFitnessCaseTypeLabel(activeCase.caseType)}</p>
              </div>

              {activeCase.medications.map((m) => (
                <div key={m.id} className="rounded border bg-gray-50 p-3 space-y-2 flex gap-3">
                  <MedicationImageThumb url={m.medicationImageUrl} className="h-14 w-14 rounded border object-cover shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium text-sm">{m.medicationName}</p>
                    {m.employeeSideEffects ? (
                      <p className="text-xs text-amber-800">Employee reports: {m.employeeSideEffects}</p>
                    ) : m.employeeNoSideEffects ? (
                      <p className="text-xs text-gray-500">Employee reports no side effects</p>
                    ) : null}
                    <Textarea
                      placeholder="Your notes on this medication (optional)"
                      rows={2}
                      className="text-xs"
                      value={medClinicianNotes[m.id] ?? ""}
                      onChange={(e) => setMedClinicianNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Fitness outcome</label>
                  <Select value={fitnessOutcome ?? "unset"} onValueChange={(v) => setFitnessOutcome(v === "unset" ? undefined : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      {WORK_FITNESS_OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>{workFitnessOutcomeLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(showRestrictionFields || fitnessImpact) ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Work impact level</label>
                    <Select value={fitnessImpact ?? "unset"} onValueChange={(v) => setFitnessImpact(v === "unset" ? undefined : v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not set</SelectItem>
                        {WORK_FITNESS_IMPACTS.map((i) => (
                          <SelectItem key={i} value={i}>{workFitnessImpactLabel(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              {showRestrictionFields ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Work restrictions</label>
                    <Textarea
                      value={workRestrictions}
                      onChange={(e) => setWorkRestrictions(e.target.value)}
                      placeholder="Describe duties the employee must avoid or limit"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Restriction from</label>
                      <Input type="date" value={restrictionStartDate} onChange={(e) => setRestrictionStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Restriction until</label>
                      <Input type="date" value={restrictionEndDate} onChange={(e) => setRestrictionEndDate(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : null}

              {showClearanceFields ? (
                <div className="flex flex-wrap gap-4 text-sm rounded-md border p-3 bg-white">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={clearedUnderground ?? false} onChange={(e) => setClearedUnderground(e.target.checked)} />
                    Cleared underground
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={clearedHeavyMachinery ?? false} onChange={(e) => setClearedHeavyMachinery(e.target.checked)} />
                    Cleared heavy machinery
                  </label>
                </div>
              ) : null}

              {showDrugTestSection ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-amber-900">
                    <input type="checkbox" checked={mayAffectDrugTest} onChange={(e) => setMayAffectDrugTest(e.target.checked)} />
                    May affect drug & alcohol test results
                  </label>
                  {mayAffectDrugTest ? (
                    <Textarea
                      value={drugTestDisclosureNotes}
                      onChange={(e) => setDrugTestDisclosureNotes(e.target.value)}
                      placeholder="Substances in these medications that kits may detect; use if employee may be randomly tested"
                      rows={2}
                      className="text-xs"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={actionTaken ?? "unset"} onValueChange={(v) => setActionTaken(v === "unset" ? undefined : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Action taken" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {WORK_FITNESS_ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>{workFitnessActionLabel(a)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {actionTaken ? (
                  <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Action notes" rows={2} />
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Assessment notes</label>
                <Textarea
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  placeholder="Summary for the employee and occupational health record"
                  rows={2}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessOpen(false)}>Cancel</Button>
            <Button onClick={() => assessMutation.mutate()} disabled={assessMutation.isPending}>
              {editingReview ? "Save changes" : "Complete review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work fitness case?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the case and all medication entries.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteCase && deleteMutation.mutate(deleteCase.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
