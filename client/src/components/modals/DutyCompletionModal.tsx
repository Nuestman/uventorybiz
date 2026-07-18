import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle } from "lucide-react";

const COMPLETION_REASONS = [
  { value: "completed_ok", label: "Completed without issues" },
  { value: "completed_issues", label: "Completed but issues found" },
  { value: "not_applicable", label: "Not applicable today" },
  { value: "unable_to_complete", label: "Unable to complete (will retry)" },
  { value: "other", label: "Other" },
] as const;

const CANCELLATION_REASONS = [
  { value: "equipment_failure", label: "Equipment failure" },
  { value: "staffing", label: "Staffing / availability issues" },
  { value: "safety", label: "Safety concern" },
  { value: "duplicate", label: "Duplicate / not needed" },
  { value: "schedule_change", label: "Schedule / operational change" },
  { value: "other", label: "Other" },
] as const;

const completionSchema = z.object({
  reason: z.string().min(1, "Select a completion reason"),
  notes: z.string().optional(),
  startedAt: z.string().optional(),
});

const cancellationSchema = z
  .object({
    reason: z.string().min(1, "Select a cancellation reason"),
    details: z.string().optional(),
  })
  .refine(
    (data) => data.reason !== "other" || (data.details && data.details.trim().length >= 10),
    {
      message: "Please provide details for 'Other' (minimum 10 characters)",
      path: ["details"],
    }
  );

type CompletionFormData = z.infer<typeof completionSchema>;
type CancellationFormData = z.infer<typeof cancellationSchema>;

type CompletionPayload = { startedAt?: string; notes?: string };
type CancellationPayload = { cancellationReason: string };

interface DutyCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    duty: {
      title: string;
    };
    assignedTo?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  type: "complete" | "cancel";
  onComplete?: (assignmentId: string, data: CompletionPayload) => void;
  onCancel?: (assignmentId: string, data: CancellationPayload) => void;
  isLoading?: boolean;
}

export default function DutyCompletionModal({
  isOpen,
  onClose,
  assignment,
  type,
  onComplete,
  onCancel,
  isLoading = false,
}: DutyCompletionModalProps) {
  const completionForm = useForm<CompletionFormData>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      reason: "",
      notes: "",
      startedAt: "",
    },
  });

  const cancellationForm = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: "",
      details: "",
    },
  });

  useEffect(() => {
    if (isOpen && type === "complete") {
      const now = new Date();
      const hhmm = now.toISOString().slice(11, 16);
      const current = completionForm.getValues();
      completionForm.reset({
        ...current,
        startedAt: hhmm,
      });
    }
  }, [isOpen, type, assignment, completionForm]);

  const onSubmitCompletion = (data: CompletionFormData) => {
    if (onComplete && assignment) {
      const reasonLabel =
        COMPLETION_REASONS.find((r) => r.value === data.reason)?.label ?? "Completed";
      const extra = data.notes?.trim();
      const notes = extra ? `${reasonLabel}: ${extra}` : reasonLabel;
      onComplete(assignment.id, {
        startedAt: data.startedAt,
        notes,
      });
    }
  };

  const onSubmitCancellation = (data: CancellationFormData) => {
    if (onCancel && assignment) {
      const baseLabel =
        CANCELLATION_REASONS.find((r) => r.value === data.reason)?.label ?? "Cancelled";
      let cancellationReason: string;
      if (data.reason === "other") {
        cancellationReason = (data.details || "").trim();
      } else {
        const extra = data.details?.trim();
        cancellationReason = extra ? `${baseLabel}: ${extra}` : baseLabel;
      }
      onCancel(assignment.id, { cancellationReason });
    }
  };

  // Don't render if assignment is null
  if (!assignment) {
    return null;
  }

  if (type === "complete") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]" data-testid="completion-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Complete Assignment</span>
            </DialogTitle>
            <DialogDescription>
              Mark "{assignment.duty.title}" as completed
              {assignment.assignedTo && (
                <span> for {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...completionForm}>
            <form onSubmit={completionForm.handleSubmit(onSubmitCompletion)} className="space-y-4">
              <FormField
                control={completionForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Reason</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger data-testid="select-completion-reason">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLETION_REASONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Choose the option that best describes the outcome of this duty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={completionForm.control}
                name="startedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Started (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        placeholder="When did work begin?"
                        data-testid="input-started-time"
                      />
                    </FormControl>
                    <FormDescription>
                      When did you actually start working on this duty?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={completionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add any notes or context (e.g. issues found, follow-up needed)."
                        rows={4}
                        data-testid="input-completion-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      This text is stored together with the selected completion reason.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isLoading}
                  data-testid="button-cancel-completion"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  data-testid="button-confirm-completion"
                >
                  {isLoading ? "Completing..." : "Mark as Complete"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="cancellation-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span>Cancel Assignment</span>
          </DialogTitle>
          <DialogDescription>
            Cancel "{assignment.duty.title}" assignment
            {assignment.assignedTo && (
              <span> for {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...cancellationForm}>
          <form onSubmit={cancellationForm.handleSubmit(onSubmitCancellation)} className="space-y-4">
            <FormField
              control={cancellationForm.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Reason *</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger data-testid="select-cancellation-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {CANCELLATION_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Choose a common reason. Select &quot;Other&quot; to provide a custom reason.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={cancellationForm.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (Optional{cancellationForm.watch("reason") === "other" ? ", required for Other" : ""})</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={
                        cancellationForm.watch("reason") === "other"
                          ? "Describe the reason for cancellation (minimum 10 characters)."
                          : "Optionally add more context (e.g. specific issue, follow-up plan)."
                      }
                      rows={4}
                      data-testid="input-cancellation-details"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
                data-testid="button-cancel-cancellation"
              >
                Keep Assignment
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={isLoading}
                data-testid="button-confirm-cancellation"
              >
                {isLoading ? "Cancelling..." : "Cancel Assignment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}