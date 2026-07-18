import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TelecareOpenEncounterModalProps = {
  sessionId: string;
  open: boolean;
  patientName?: string;
  onOpenChange: (open: boolean) => void;
  onEncounterReady: (encounterId: string) => void;
};

export default function TelecareOpenEncounterModal({
  sessionId,
  open,
  patientName,
  onOpenChange,
  onEncounterReady,
}: TelecareOpenEncounterModalProps) {
  const { toast } = useToast();

  const openEncounter = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/telecare/sessions/${sessionId}/open-encounter`);
      return (await res.json()) as { encounterId: string; created: boolean };
    },
    onSuccess: (data) => {
      toast({
        title: data.created ? "Encounter opened" : "Encounter ready",
        description: "Joining the video visit…",
      });
      onEncounterReady(data.encounterId);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to open encounter",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-mineaid-navy" />
            Open clinical encounter
          </DialogTitle>
          <DialogDescription>
            Start a telehealth encounter for {patientName ?? "this patient"} before joining the video
            room. Documentation will be available in the visit room without leaving the call.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
            disabled={openEncounter.isPending}
            onClick={() => openEncounter.mutate()}
          >
            {openEncounter.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening…
              </>
            ) : (
              "Open encounter & continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
