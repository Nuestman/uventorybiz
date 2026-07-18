import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getEncounterTypeDefinition,
  isEncounterWritable,
  type EncounterModality,
  type EncounterType,
} from "@shared/encounterPathways";
import { ENCOUNTER_OPEN_TYPES } from "@/lib/encounter/encounterVisitTypes";
import { formatEncounterStatus, formatVisitType } from "@/lib/formatters";

type EncounterRow = {
  id: string;
  patientId?: string;
  status?: string;
  visitType?: string;
  modality?: string;
  triageRequired?: boolean;
  chiefComplaint?: string | null;
  historyOfPresentIllness?: string | null;
  physicalExamination?: string | null;
  assessment?: string | null;
  treatment?: string | null;
  workRestrictions?: string | null;
  followUpInstructions?: string | null;
  followUpRequired?: boolean;
  notes?: string | null;
};

type EditEncounterModalProps = {
  encounter: EncounterRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function EditEncounterModal({
  encounter,
  open,
  onOpenChange,
  onSaved,
}: EditEncounterModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const writable = encounter?.status ? isEncounterWritable(encounter.status) : false;
  const typeDef = getEncounterTypeDefinition(encounter?.visitType ?? "clinical");
  const showClinical = typeDef.hasClinicalDocumentation;

  const [visitType, setVisitType] = useState<EncounterType>("clinical");
  const [modality, setModality] = useState<EncounterModality>("in_person");
  const [triageRequired, setTriageRequired] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [physicalExamination, setPhysicalExamination] = useState("");
  const [assessment, setAssessment] = useState("");
  const [treatment, setTreatment] = useState("");
  const [workRestrictions, setWorkRestrictions] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!encounter || !open) return;
    setVisitType((encounter.visitType ?? "clinical") as EncounterType);
    setModality((encounter.modality ?? "in_person") as EncounterModality);
    setTriageRequired(!!encounter.triageRequired);
    setChiefComplaint(encounter.chiefComplaint ?? "");
    setHistoryOfPresentIllness(encounter.historyOfPresentIllness ?? "");
    setPhysicalExamination(encounter.physicalExamination ?? "");
    setAssessment(encounter.assessment ?? "");
    setTreatment(encounter.treatment ?? "");
    setWorkRestrictions(encounter.workRestrictions ?? "");
    setFollowUpInstructions(encounter.followUpInstructions ?? "");
    setFollowUpRequired(!!encounter.followUpRequired);
    setNotes(encounter.notes ?? "");
  }, [encounter?.id, open, encounter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!encounter?.id) throw new Error("No encounter selected");

      if (writable) {
        const headerRes = await apiRequest("PATCH", `/api/encounters/${encounter.id}/header`, {
          visitType,
          modality,
          triageRequired,
        });
        if (!headerRes.ok) {
          const err = await headerRes.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || "Failed to update encounter header");
        }
      }

      if (writable && showClinical) {
        const body: Record<string, unknown> = {
          chiefComplaint: chiefComplaint.trim() || null,
          historyOfPresentIllness: historyOfPresentIllness.trim() || null,
          physicalExamination: physicalExamination.trim() || null,
          assessment: assessment.trim() || null,
          treatment: treatment.trim() || null,
          workRestrictions: workRestrictions.trim() || null,
          followUpInstructions: followUpInstructions.trim() || null,
          followUpRequired,
          notes: notes.trim() || null,
        };
        const docRes = await apiRequest("PUT", `/api/encounters/${encounter.id}`, body);
        if (!docRes.ok) {
          const err = await docRes.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || "Failed to save documentation");
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Encounter updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters"] });
      if (encounter?.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/medical-visits", { patientId: encounter.patientId }] });
      }
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  if (!encounter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit encounter</DialogTitle>
          <DialogDescription>
            {writable
              ? "Update encounter header and clinical documentation. Vitals and triage are edited in the encounter workflow."
              : "This encounter is discharged and read-only."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{formatVisitType(encounter.visitType)}</p>
              <p className="text-xs text-muted-foreground">
                Status: {formatEncounterStatus(encounter.status)}
              </p>
            </div>
            {writable && encounter.patientId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/encounter?patientId=${encounter.patientId}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open workflow
                </Link>
              </Button>
            )}
          </div>

          {writable && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Encounter header</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Encounter type</Label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as EncounterType)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {ENCOUNTER_OPEN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Care modality</Label>
                  <select
                    value={modality}
                    onChange={(e) => setModality(e.target.value as EncounterModality)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="in_person">In person</option>
                    <option value="telehealth">Telehealth</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-enc-triage"
                  checked={triageRequired}
                  onCheckedChange={(v) => setTriageRequired(v === true)}
                />
                <Label htmlFor="edit-enc-triage" className="text-sm font-normal cursor-pointer">
                  Require triage / baseline assessment
                </Label>
              </div>
            </div>
          )}

          {writable && showClinical && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Clinical documentation</h3>
              <div>
                <Label>Chief complaint</Label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>History of present illness</Label>
                <Textarea
                  value={historyOfPresentIllness}
                  onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Physical examination</Label>
                <Textarea
                  value={physicalExamination}
                  onChange={(e) => setPhysicalExamination(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Assessment</Label>
                <Textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Treatment / plan</Label>
                <Textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Work restrictions</Label>
                <Input value={workRestrictions} onChange={(e) => setWorkRestrictions(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Follow-up instructions</Label>
                <Textarea
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-enc-follow-up"
                  checked={followUpRequired}
                  onCheckedChange={(v) => setFollowUpRequired(v === true)}
                />
                <Label htmlFor="edit-enc-follow-up" className="text-sm font-normal cursor-pointer">
                  Follow-up required
                </Label>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
              </div>
            </div>
          )}

          {writable && !showClinical && (
            <p className="text-sm text-muted-foreground">
              This encounter type ({typeDef.label}) does not use the full clinical documentation form. Record vitals and
              discharge from the encounter workflow.
            </p>
          )}

          {!writable && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Discharged encounters cannot be edited here. Open a new encounter for a new episode.</p>
              {encounter.chiefComplaint && (
                <p>
                  <span className="font-medium text-foreground">Chief complaint:</span> {encounter.chiefComplaint}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {writable ? "Cancel" : "Close"}
          </Button>
          {writable && (
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
