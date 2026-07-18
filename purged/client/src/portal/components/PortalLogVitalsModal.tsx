import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PortalModalShell } from "@/portal/components/PortalModalShell";
import {
  VitalSignEntryFormFields,
  buildVitalSignEntryPayload,
  emptyVitalSignEntryForm,
  vitalSignEntryHasReading,
  type VitalSignEntryFormValues,
} from "@/components/vitals/VitalSignEntryFormFields";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PortalLogVitalsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PortalLogVitalsModal({ open, onOpenChange }: PortalLogVitalsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VitalSignEntryFormValues>(emptyVitalSignEntryForm);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/vital-signs", buildVitalSignEntryPayload(form));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/portal/vital-signs"] });
      toast({ title: "Reading saved", description: "Shared with your care team." });
      onOpenChange(false);
      setForm(emptyVitalSignEntryForm());
    },
    onError: (e: Error) => {
      toast({ title: "Could not save", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const canSubmit = vitalSignEntryHasReading(form);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptyVitalSignEntryForm());
      }}
    >
      <DialogContent className="portal-root portal-ui max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-lg [&>button]:hidden">
        <PortalModalShell
          title="Log a vital reading"
          subtitle="Self-reported readings are marked and shared with your care team."
          onClose={() => onOpenChange(false)}
          footer={
            <button
              type="button"
              className="portal-btn-primary w-full py-3"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save reading"
              )}
            </button>
          }
        >
          <div className="portal-form-fields space-y-4">
            <VitalSignEntryFormFields values={form} onChange={setForm} />
          </div>
        </PortalModalShell>
      </DialogContent>
    </Dialog>
  );
}
