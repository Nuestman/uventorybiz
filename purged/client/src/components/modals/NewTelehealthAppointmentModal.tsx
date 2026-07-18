import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, User, Video } from "lucide-react";

const telehealthAppointmentSchema = insertAppointmentSchema.extend({
  modality: z.literal("telehealth"),
  locationId: z.string().optional().nullable(),
});

type TelehealthAppointmentForm = z.infer<typeof telehealthAppointmentSchema>;

const TELEHEALTH_VISIT_TYPES = [
  { value: "telehealth", label: "Telehealth visit" },
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "routine_checkup", label: "Routine check-in" },
  { value: "injury_assessment", label: "Injury assessment" },
  { value: "screening", label: "Health screening" },
] as const;

interface NewTelehealthAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewTelehealthAppointmentModal({
  open,
  onOpenChange,
}: NewTelehealthAppointmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<TelehealthAppointmentForm>({
    resolver: zodResolver(telehealthAppointmentSchema),
    defaultValues: {
      employeeId: "",
      medicalStaffId: user?.id || "",
      appointmentDate: new Date(),
      appointmentType: "telehealth",
      modality: "telehealth",
      durationMinutes: 30,
      locationId: null,
      notes: "",
    },
  });

  type EmployeeRow = {
    id: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
    department?: string;
    status?: string;
  };

  const { data: employees = [] as EmployeeRow[], isLoading: employeesLoading } = useQuery<EmployeeRow[]>({
    queryKey: searchQuery ? ["/api/employees", { search: searchQuery }] : ["/api/employees"],
    retry: false,
    enabled: open,
  });

  const filteredEmployees = employees.filter((employee) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.employeeNumber?.toLowerCase().includes(searchLower) ||
      employee.id?.toLowerCase().includes(searchLower)
    );
  });

  const invalidateTelehealthQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/appointments" });
    queryClient.invalidateQueries({ queryKey: ["/api/telecare/queue"] });
    queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/telecare/queue" });
    queryClient.invalidateQueries({ queryKey: ["/api/telecare/queue/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/telecare/queue/today"] });
  };

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: InsertAppointment) => {
      await apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "Video visit scheduled",
        description:
          "The telehealth appointment is on the schedule. A video session will be provisioned when the patient confirms in the portal.",
      });
      form.reset({
        employeeId: "",
        medicalStaffId: user?.id || "",
        appointmentDate: new Date(),
        appointmentType: "telehealth",
        modality: "telehealth",
        durationMinutes: 30,
        locationId: null,
        notes: "",
      });
      setSearchQuery("");
      invalidateTelehealthQueries();
      onOpenChange(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message?.replace(/^\d+:\s*/, "") || "Failed to schedule video visit.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TelehealthAppointmentForm) => {
    const appointmentData: InsertAppointment = {
      ...data,
      modality: "telehealth",
      locationId: null,
      medicalStaffId: user?.id || "",
      appointmentDate:
        data.appointmentDate instanceof Date ? data.appointmentDate : new Date(data.appointmentDate),
    };
    createAppointmentMutation.mutate(appointmentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-mineaid-navy" />
            Schedule video visit
          </DialogTitle>
          <DialogDescription>
            Book a telehealth appointment only. The patient confirms in the portal; a video session is created
            automatically after confirmation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee *</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or employee ID…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select employee">
                            {field.value &&
                              (() => {
                                const selected = employees.find((e) => e.id === field.value);
                                return selected ? (
                                  <span className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {selected.firstName} {selected.lastName}
                                  </span>
                                ) : null;
                              })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {employeesLoading ? (
                            <div className="p-4 text-center text-sm text-mineaid-gray">Loading employees…</div>
                          ) : filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span>
                                    {employee.firstName} {employee.lastName}
                                    {employee.employeeNumber ? ` (${employee.employeeNumber})` : ""}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                                    {employee.status ?? "active"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-mineaid-gray">No employees found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Date & time *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value instanceof Date
                            ? field.value.toISOString().slice(0, 16)
                            : String(field.value ?? "")
                        }
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={15}
                        max={120}
                        step={15}
                        value={field.value ?? 30}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TELEHEALTH_VISIT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes for patient / staff</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for visit, prep instructions, or internal notes…"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-mineaid-gray">
              <span className="font-medium text-gray-700">Telehealth only</span> — no clinic location required.
              Patient joins from the portal when the visit window opens.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-mineaid-navy hover:bg-mineaid-navy/90"
              >
                {createAppointmentMutation.isPending ? "Scheduling…" : "Schedule video visit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
