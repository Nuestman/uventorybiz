import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPatientSchema, type InsertPatient, type Employee } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientHealthProfileFields } from "@/components/PatientHealthProfileFields";
import { Loader2, Search, CheckCircle, AlertCircle, User } from "lucide-react";

interface NewPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewPatientModal({ open, onOpenChange }: NewPatientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [employeeFound, setEmployeeFound] = useState<Employee | null>(null);
  const [lookupError, setLookupError] = useState("");

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      employeeId: "",
      status: "active",
      medicalClearance: false,
      notes: "",
      allergies: "",
      medicalHistory: "",
      medications: "",
      disability: "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (patientData: InsertPatient) => {
      await apiRequest("POST", "/api/patients", patientData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient registered successfully!",
        variant: "default",
      });
      form.reset();
      setEmployeeNumber("");
      setEmployeeFound(null);
      setLookupError("");
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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
      
      // Handle duplicate patient error
      if (error instanceof Error && error.message.includes("409")) {
        toast({
          title: "Duplicate Patient",
          description: "This employee is already registered as a patient.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-fetch employee details when employee number is entered
  const fetchEmployeeDetails = async (empNumber: string) => {
    if (!empNumber.trim()) {
      setEmployeeFound(null);
      setLookupError("");
      return;
    }

    setIsLookingUp(true);
    setLookupError("");
    
    try {
      const response = await apiRequest("GET", `/api/employees/search/${empNumber}`);
      const employee = await response.json();
      
      setEmployeeFound(employee);
      
      // Auto-populate form fields with employee data
      form.setValue("employeeId", employee.id);
      
      toast({
        title: "Employee Found",
        description: `${employee.firstName} ${employee.lastName} - ${employee.position}`,
      });
    } catch (error) {
      setEmployeeFound(null);
      if (error instanceof Error && error.message.includes("404")) {
        setLookupError("Employee not found. Please check the employee number.");
      } else if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/auth", 500);
      } else {
        setLookupError("Failed to lookup employee. Please try again.");
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  // Debounced employee lookup
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEmployeeDetails(employeeNumber);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [employeeNumber]);

  const onSubmit = (data: InsertPatient) => {
    createPatientMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Register New Patient
          </DialogTitle>
          <DialogDescription>
            Search for an employee and register them as a patient with medical information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Lookup Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-mineaid-navy" />
                <Label className="text-sm font-medium">Employee Lookup</Label>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Enter employee number (e.g., EMP0001, num-123)"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    className="pr-10"
                  />
                  {isLookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-mineaid-navy" />
                  )}
                </div>

                {/* Employee Found Display */}
                {employeeFound && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="font-medium">
                        {employeeFound.firstName} {employeeFound.lastName}
                      </div>
                      <div className="text-sm">
                        {employeeFound.position} • {employeeFound.department} • {employeeFound.email}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Ready to register as patient
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Employee Not Found Display */}
                {lookupError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {lookupError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Hidden Employee ID Field */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Patient-Specific Information */}
            {employeeFound && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="h-0.5 flex-1 bg-gray-200"></div>
                  <Label className="text-sm font-medium text-gray-600">Patient Information</Label>
                  <div className="h-0.5 flex-1 bg-gray-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "active"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="follow_up">Follow Up Required</SelectItem>
                            <SelectItem value="incident">Incident Recovery</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicalClearance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Medical Clearance</FormLabel>
                          <div className="text-sm text-mineaid-gray">
                            Employee has current medical clearance
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <PatientHealthProfileFields control={form.control} />
              </div>
            )}

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
                disabled={createPatientMutation.isPending || !employeeFound}
                className="bg-mineaid-navy hover:bg-mineaid-navy/90"
              >
                {createPatientMutation.isPending ? "Registering..." : "Register Patient"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}