import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "lucide-react";

export default function AppointmentForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees = [] } = useQuery<Array<{ id: string; firstName?: string; lastName?: string; employeeNumber?: string }>>({
    queryKey: searchQuery ? ["/api/employees", { search: searchQuery }] : ["/api/employees"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertAppointmentSchema.omit({ medicalStaffId: true })),
    defaultValues: {
      employeeId: "",
      appointmentDate: new Date().toISOString().slice(0, 16),
      appointmentType: "",
      notes: "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      await apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
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
      console.error("Appointment creation error:", error);
      toast({
        title: "Error",
        description: "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!data.employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    createAppointmentMutation.mutate(data);
  };

  return (
    <Card id="appointment-form">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Schedule New Appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Employee</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="Search by name or employee ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                                {employee.employeeNumber ? ` (${employee.employeeNumber})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Date & Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="appointmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                        <SelectItem value="incident_followup">Incident Follow-up</SelectItem>
                        <SelectItem value="pre_employment">Pre-Employment Medical</SelectItem>
                        <SelectItem value="fitness_for_duty">Fitness for Duty</SelectItem>
                        <SelectItem value="return_to_work">Return to Work</SelectItem>
                        <SelectItem value="injury_assessment">Injury Assessment</SelectItem>
                        <SelectItem value="wellness_check">Wellness Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information or special requirements..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}