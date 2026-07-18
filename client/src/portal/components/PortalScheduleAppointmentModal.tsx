import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PortalModalShell } from "./PortalModalShell";
import { PortalAppointmentRequestFields } from "./PortalAppointmentRequestFields";
import {
  buildPortalAppointmentRequestPayload,
  combinePreferredDateTime,
  emptyPortalAppointmentRequestForm,
  splitPreferredDateTime,
  type PortalAppointmentRequestForm,
} from "../portalAppointmentRequestForm";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { modalityLabel, formatDateTime } from "../portalUi";

type CareLocationOption = { id: string; locationName: string; isPrimary?: boolean };

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
];

type PortalScheduleAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  careLocations: CareLocationOption[];
  onSuccess?: () => void;
};

export function PortalScheduleAppointmentModal({
  open,
  onOpenChange,
  careLocations,
  onSuccess,
}: PortalScheduleAppointmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const defaultLocationId = useMemo(
    () => careLocations.find((l) => l.isPrimary)?.id ?? careLocations[0]?.id ?? "",
    [careLocations],
  );

  const form = useForm<PortalAppointmentRequestForm>({
    defaultValues: emptyPortalAppointmentRequestForm(defaultLocationId),
  });

  const values = form.watch();

  useEffect(() => {
    if (open && defaultLocationId && !form.getValues("preferredLocationId")) {
      form.setValue("preferredLocationId", defaultLocationId);
    }
  }, [open, defaultLocationId, form]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...values,
        preferredDateTime: combinePreferredDateTime(preferredDate, selectedTime),
      };
      await apiRequest("POST", "/api/portal/appointment-requests", buildPortalAppointmentRequestPayload(payload));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/portal/appointment-requests"] });
      toast({ title: "Request submitted", description: "Your organization will confirm your appointment." });
      handleClose(false);
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast({ title: "Could not submit", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleClose = (next: boolean) => {
    if (!next) {
      setStep(1);
      setPreferredDate("");
      setSelectedTime(null);
      form.reset(emptyPortalAppointmentRequestForm(defaultLocationId));
    }
    onOpenChange(next);
  };

  const summaryDateTime = preferredDate
    ? formatDateTime(combinePreferredDateTime(preferredDate, selectedTime))
    : "Flexible";

  const footer =
    step < 3 ? (
      <div className="portal-modal-footer-actions">
        {step > 1 ? (
          <button type="button" className="portal-btn-outline flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        ) : (
          <button type="button" className="portal-btn-outline flex-1" onClick={() => handleClose(false)}>
            Cancel
          </button>
        )}
        <button type="button" className="portal-btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
          Continue
        </button>
      </div>
    ) : (
      <div className="portal-modal-footer-actions">
        <button type="button" className="portal-btn-outline flex-1" onClick={() => setStep(2)}>
          Back
        </button>
        <button
          type="button"
          className="portal-btn-primary flex-1"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
        </button>
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="portal-root portal-ui max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-lg [&>button]:hidden">
        <PortalModalShell
          title="Request an appointment"
          subtitle={`Step ${step} of 3`}
          step={step}
          totalSteps={3}
          onClose={() => handleClose(false)}
          footer={footer}
        >
          {step === 1 ? (
            <PortalAppointmentRequestFields
              form={form}
              idPrefix="schedule"
              careLocations={careLocations}
              variant="portal"
              showDateTime={false}
              showReason
            />
          ) : null}

          {step === 2 ? (
            <PortalAppointmentRequestFields
              form={form}
              idPrefix="schedule-time"
              careLocations={careLocations}
              variant="portal"
              showReason={false}
              showDateTime
              dateValue={preferredDate}
              onDateChange={setPreferredDate}
              selectedTime={selectedTime}
              onTimeSelect={setSelectedTime}
              timeSlots={TIME_SLOTS}
            />
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="portal-summary-card">
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Visit type</span>
                  <span className="portal-summary-value">{modalityLabel(values.preferredModality)}</span>
                </div>
                {values.preferredModality === "in_person" && values.preferredLocationId ? (
                  <div className="portal-summary-row">
                    <span className="portal-summary-label">Location</span>
                    <span className="portal-summary-value">
                      {careLocations.find((l) => l.id === values.preferredLocationId)?.locationName ?? "—"}
                    </span>
                  </div>
                ) : null}
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Preferred time</span>
                  <span className="portal-summary-value">{summaryDateTime}</span>
                </div>
                <div className="portal-summary-row">
                  <span className="portal-summary-label">Reason</span>
                  <span className="portal-summary-value">{values.reason.trim() || "—"}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--portal-muted)]">
                Your organization will review this request and confirm a time. Track status under My requests.
              </p>
            </div>
          ) : null}
        </PortalModalShell>
      </DialogContent>
    </Dialog>
  );
}

export { splitPreferredDateTime };
