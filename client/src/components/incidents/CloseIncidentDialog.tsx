import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CloseIncidentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isDrillOrSimulation: boolean) => void;
  pending?: boolean;
};

export function CloseIncidentDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
}: CloseIncidentDialogProps) {
  const [isDrillOrSimulation, setIsDrillOrSimulation] = useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setIsDrillOrSimulation(false);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close incident</AlertDialogTitle>
          <AlertDialogDescription>
            Closing marks the incident record as administratively complete. Confirm whether this was a real event or a
            drill/simulation — drills are tracked separately in incident and compliance reports.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-2 py-2">
          <Checkbox
            id="incident-drill-sim"
            checked={isDrillOrSimulation}
            onCheckedChange={(v) => setIsDrillOrSimulation(v === true)}
          />
          <Label htmlFor="incident-drill-sim" className="text-sm font-normal leading-snug cursor-pointer">
            This was a drill or simulation (not a real operational incident)
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(isDrillOrSimulation);
            }}
          >
            Close incident
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
