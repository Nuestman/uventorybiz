import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, Loader2 } from "lucide-react";
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
import {
  dispositionOptionsFor,
  isEncounterWritable,
  type EncounterModality,
} from "@shared/encounterPathways";

type EncounterRow = {
  id: string;
  patientId?: string;
  status?: string;
  visitType?: string;
  modality?: string;
  chiefComplaint?: string | null;
  disposition?: string | null;
};

type DischargeEncounterModalProps = {
  encounter: EncounterRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDischarged?: () => void;
};

export function DischargeEncounterModal({
  encounter,
  open,
  onOpenChange,
  onDischarged,
}: DischargeEncounterModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const writable = encounter?.status ? isEncounterWritable(encounter.status) : false;

  const dischargeMutation = useMutation({
    mutationFn: async () => {
      if (!encounter?.id) throw new Error("No encounter selected");
      const modality = (encounter.modality ?? "in_person") as EncounterModality;
      const options = dispositionOptionsFor(modality);
      const disposition =
        encounter.disposition && options.includes(encounter.disposition as (typeof options)[number])
          ? encounter.disposition
          : (options[0] ?? "return_to_work");
      const res = await apiRequest("POST", `/api/encounters/${encounter.id}/discharge`, {
        disposition,
        dispositionDateTime: new Date(),
        chiefComplaint: encounter.chiefComplaint ?? undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Failed to discharge encounter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Encounter discharged", description: "This episode is now read-only." });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters"] });
      if (encounter?.patientId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/medical-visits", { patientId: encounter.patientId }],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/encounters/active", encounter.patientId],
        });
      }
      onOpenChange(false);
      onDischarged?.();
    },
    onError: (e: Error) => {
      toast({ title: "Discharge failed", description: e.message, variant: "destructive" });
    },
  });

  if (!encounter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discharge encounter</DialogTitle>
          <DialogDescription>
            Are you sure you want to discharge? You won&apos;t be able to make any more entries or edits afterwards.
          </DialogDescription>
        </DialogHeader>

        {!writable ? (
          <p className="text-sm text-muted-foreground py-2">
            This encounter is not open for discharge ({encounter.status}).
          </p>
        ) : (
          encounter.patientId && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/encounter?patientId=${encounter.patientId}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Open encounter workflow
              </Link>
            </Button>
          )
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {writable && (
            <Button
              type="button"
              className="bg-mineaid-navy hover:bg-mineaid-navy/90"
              disabled={dischargeMutation.isPending}
              onClick={() => dischargeMutation.mutate()}
            >
              {dischargeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Discharge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
