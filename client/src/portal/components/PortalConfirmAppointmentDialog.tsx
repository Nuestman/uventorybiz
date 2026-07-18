import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PortalModalShell } from "./PortalModalShell";
import { formatDateTime } from "../portalUi";

type ApptConfirmTarget = {
  id: string;
  appointmentDate: string;
  appointmentType: string;
  modality?: string | null;
  locationName?: string | null;
};

type PortalConfirmAppointmentDialogProps = {
  appointment: ApptConfirmTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
  confirmPending?: boolean;
  providerName?: string;
};

export function PortalConfirmAppointmentDialog({
  appointment,
  onOpenChange,
  onConfirm,
  confirmPending,
  providerName,
}: PortalConfirmAppointmentDialogProps) {
  const open = !!appointment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="portal-root portal-ui max-w-md border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:hidden">
        <PortalModalShell
          title="Confirm appointment"
          subtitle="Step 3 of 3"
          step={3}
          totalSteps={3}
          onClose={() => onOpenChange(false)}
          footer={
            <div className="portal-modal-footer-actions">
              <button type="button" className="portal-btn-outline flex-1" onClick={() => onOpenChange(false)}>
                Back
              </button>
              <button
                type="button"
                className="portal-btn-primary flex-1"
                disabled={confirmPending || !appointment}
                onClick={() => appointment && onConfirm(appointment.id)}
              >
                {confirmPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm appointment"}
              </button>
            </div>
          }
        >
          {appointment ? (
            <div className="space-y-4">
              <div className="portal-summary-card">
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Visit type</span>
                  <span className="portal-summary-value">{appointment.appointmentType}</span>
                </div>
                {providerName ? (
                  <div className="portal-summary-row">
                    <span className="portal-summary-label">Provider</span>
                    <span className="portal-summary-value">{providerName}</span>
                  </div>
                ) : null}
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Mode</span>
                  <span className="portal-summary-value">
                    {appointment.modality === "telehealth" ? "Video visit" : "In-person"}
                  </span>
                </div>
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Date</span>
                  <span className="portal-summary-value">{formatDateTime(appointment.appointmentDate)}</span>
                </div>
                {appointment.locationName ? (
                  <div className="portal-summary-row">
                    <span className="portal-summary-label">Location</span>
                    <span className="portal-summary-value">{appointment.locationName}</span>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-[var(--portal-muted)]">
                A confirmation will be sent to your email and phone.
              </p>
            </div>
          ) : null}
        </PortalModalShell>
      </DialogContent>
    </Dialog>
  );
}
