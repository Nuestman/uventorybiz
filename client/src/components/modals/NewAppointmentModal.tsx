import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Calendar, Search, User } from "lucide-react";

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewAppointmentModal({ open, onOpenChange }: NewAppointmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      employeeId: "",
      medicalStaffId: user?.id || "",
      appointmentDate: new Date(),
      appointmentType: "routine_checkup",
      modality: "in_person" as const,
      durationMinutes: 30,
      locationId: "",
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
    company?: { name?: string };
  };
  
  const { data: employees = [] as EmployeeRow[], isLoading: employeesLoading } = useQuery<EmployeeRow[]>({
    queryKey: searchQuery ? ["/api/employees", { search: searchQuery }] : ["/api/employees"],
    retry: false,
  });

  const { data: careLocations = [] } = useQuery<Array<{ id: string; locationName: string; isPrimary?: boolean }>>({
    queryKey: ["/api/care-locations", { locationKind: "fixed_site" }],
    queryFn: async () => {
      const res = await fetch("/api/care-locations?locationKind=fixed_site", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load care locations");
      return res.json();
    },
  });

  const modality = form.watch("modality");

  const filteredEmployees = employees.filter((employee: EmployeeRow) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.employeeNumber?.toLowerCase().includes(searchLower) ||
      employee.id?.toLowerCase().includes(searchLower)
    );
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: InsertAppointment) => {
      await apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment scheduled — awaiting confirmation in the portal.",
        variant: "default",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/appointments" });
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
        description: error.message?.replace(/^\d+:\s*/, "") || "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const appointmentData: InsertAppointment = {
      ...data,
      medicalStaffId: user?.id || "",
      appointmentDate: data.appointmentDate instanceof Date ? data.appointmentDate : new Date(data.appointmentDate),
    };
    createAppointmentMutation.mutate(appointmentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Schedule New Appointment
          </DialogTitle>
          <DialogDescription>
            Schedule a visit. New appointments start as &quot;scheduled&quot; until the attendee confirms in the portal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Selection */}
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
                        placeholder="Search employees by name or employee ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an employee...">
                            {field.value && (() => {
                              const selectedEmployee = employees.find((e) => e.id === field.value);
                              return selectedEmployee ? (
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>
                                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                                    {selectedEmployee.employeeNumber && ` (${selectedEmployee.employeeNumber})`}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {employeesLoading ? (
                            <div className="p-4 text-center text-uventorybiz-gray">
                              <div className="animate-spin h-4 w-4 border-2 border-uventorybiz-navy border-t-transparent rounded-full mx-auto mb-2"></div>
                              Loading employees...
                            </div>
                          ) : filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                      {employee.firstName?.charAt(0) || 'U'}{employee.lastName?.charAt(0) || 'N'}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {employee.firstName || 'Unknown'} {employee.lastName || 'Employee'}
                                      </p>
                                      <p className="text-xs text-uventorybiz-gray">
                                        {employee.employeeNumber || 'N/A'} • {employee.department || 'N/A'}
                                      </p>
                                      {employee.company?.name && (
                                        <p className="text-xs text-uventorybiz-gray">{employee.company.name}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={employee.status === 'active' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {employee.status || 'active'}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-uventorybiz-gray">
                              {searchQuery ? 'No employees match your search' : 'No employees found'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Appointment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value instanceof Date 
                          ? field.value.toISOString().slice(0, 16)
                          : field.value
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
                    <FormLabel>Duration (minutes) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        step={5}
                        {...field}
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
                    <FormLabel>Appointment Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appointment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                        <SelectItem value="injury_assessment">Injury Assessment</SelectItem>
                        <SelectItem value="follow_up">Follow-up Visit</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="physical_exam">Physical Examination</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="screening">Health Screening</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="modality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Care modality *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "in_person"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="In person or telehealth" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in_person">In person on site</SelectItem>
                      <SelectItem value="telehealth">Telehealth (video)</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {modality === "in_person" && careLocations.length > 0 && (
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care location *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {careLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.locationName}
                            {loc.isPrimary ? " (primary)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes or special instructions for this appointment"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90"
              >
                {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}