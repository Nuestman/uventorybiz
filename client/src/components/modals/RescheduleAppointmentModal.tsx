import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toDateTimeLocalInputValue } from "@shared/appointmentReschedule";

export type RescheduleAppointmentTarget = {
  id: string;
  appointmentDate: string | Date;
  durationMinutes?: number | null;
  employee?: { firstName?: string; lastName?: string };
  appointmentType?: string | null;
};

type RescheduleForm = {
  appointmentDate: string;
  durationMinutes: number;
  reason: string;
};

type RescheduleAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: RescheduleAppointmentTarget | null;
  mode: "staff" | "portal";
  onSuccess?: () => void;
};

export default function RescheduleAppointmentModal({
  open,
  onOpenChange,
  appointment,
  mode,
  onSuccess,
}: RescheduleAppointmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RescheduleForm>({
    defaultValues: {
      appointmentDate: "",
      durationMinutes: 30,
      reason: "",
    },
  });

  useEffect(() => {
    if (!open || !appointment) return;
    form.reset({
      appointmentDate: toDateTimeLocalInputValue(appointment.appointmentDate),
      durationMinutes: appointment.durationMinutes ?? 30,
      reason: "",
    });
  }, [open, appointment, form]);

  const mutation = useMutation({
    mutationFn: async (values: RescheduleForm) => {
      if (!appointment) throw new Error("No appointment selected");
      const appointmentDate = new Date(values.appointmentDate);
      if (Number.isNaN(appointmentDate.getTime())) {
        throw new Error("Enter a valid date and time");
      }

      if (mode === "portal") {
        await apiRequest("POST", `/api/portal/appointments/${appointment.id}/reschedule`, {
          appointmentDate,
          reason: values.reason.trim() || null,
        });
        return;
      }

      await apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        appointmentDate,
        durationMinutes: values.durationMinutes,
      });
    },
    onSuccess: () => {
      if (mode === "portal") {
        void queryClient.invalidateQueries({ queryKey: ["/api/portal/appointments"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/portal/telecare/sessions"] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      }
      toast({
        title: "Appointment rescheduled",
        description:
          mode === "portal"
            ? "Your new time was submitted. The clinic will confirm before the visit is finalized."
            : "The attendee will be notified to confirm the updated visit time.",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Could not reschedule",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const patientLabel = appointment?.employee
    ? `${appointment.employee.firstName ?? ""} ${appointment.employee.lastName ?? ""}`.trim()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            {mode === "portal"
              ? "Choose a new date and time. The clinic must confirm before the visit is finalized."
              : patientLabel
                ? `Pick a new slot for ${patientLabel}. They must confirm the updated time in the portal.`
                : "Pick a new date and time. The attendee must confirm in the portal."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="reschedule-datetime">New date & time</Label>
            <Input
              id="reschedule-datetime"
              type="datetime-local"
              required
              {...form.register("appointmentDate", { required: true })}
            />
          </div>
          {mode === "staff" ? (
            <div className="space-y-2">
              <Label htmlFor="reschedule-duration">Duration (minutes)</Label>
              <Input
                id="reschedule-duration"
                type="number"
                min={5}
                max={240}
                step={5}
                {...form.register("durationMinutes", { valueAsNumber: true })}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reschedule-reason">Reason (optional)</Label>
              <Textarea
                id="reschedule-reason"
                rows={2}
                placeholder="Let the clinic know why you need a different time"
                {...form.register("reason")}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save new time"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
