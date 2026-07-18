import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type IncidentStatusMenuItemsProps = {
  incidentId: string;
  status: string;
  onUpdate: (incidentId: string, status: string) => void;
  /** When closing — show drill/simulation confirmation dialog */
  onRequestClose?: (incidentId: string) => void;
};

export function IncidentStatusMenuItems({
  incidentId,
  status,
  onUpdate,
  onRequestClose,
}: IncidentStatusMenuItemsProps) {
  const mutate = (next: string) => onUpdate(incidentId, next);
  const close = () => {
    if (onRequestClose) onRequestClose(incidentId);
    else mutate("closed");
  };

  return (
    <>
      {status === "open" && (
        <>
          <DropdownMenuItem onClick={() => mutate("investigating")}>
            <Clock className="h-4 w-4 mr-2" />
            Mark as investigating
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => mutate("resolved")}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as resolved
          </DropdownMenuItem>
          <DropdownMenuItem onClick={close}>
            <XCircle className="h-4 w-4 mr-2" />
            Close incident
          </DropdownMenuItem>
        </>
      )}
      {status === "investigating" && (
        <>
          <DropdownMenuItem onClick={() => mutate("resolved")}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as resolved
          </DropdownMenuItem>
          <DropdownMenuItem onClick={close}>
            <XCircle className="h-4 w-4 mr-2" />
            Close incident
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => mutate("open")}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reopen (open)
          </DropdownMenuItem>
        </>
      )}
      {status === "resolved" && (
        <>
          <DropdownMenuItem onClick={close}>
            <XCircle className="h-4 w-4 mr-2" />
            Close incident
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => mutate("open")}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reopen (open)
          </DropdownMenuItem>
        </>
      )}
      {status === "closed" && (
        <DropdownMenuItem onClick={() => mutate("open")}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Reopen incident
        </DropdownMenuItem>
      )}
    </>
  );
}
