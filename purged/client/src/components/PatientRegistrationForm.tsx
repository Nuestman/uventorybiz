import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Employee } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { queueOfflineOperation } from "@/lib/syncClient";
import { offlineStore } from "@/lib/offlineStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Search, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientHealthProfileFields } from "@/components/PatientHealthProfileFields";

export default function PatientRegistrationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  const createPatientMutation = useMutation({
    mutationFn: async (patientData: InsertPatient) => {
      await apiRequest("POST", "/api/patients", patientData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient registered successfully",
      });
      form.reset();
      setEmployeeNumber("");
      setEmployeeFound(null);
      setLookupError("");
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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
      // For non-auth errors we let onSubmit decide whether to fall back to offline save.
    },
  });

  async function savePatientOffline(data: InsertPatient) {
    if (!employeeFound) {
      toast({
        title: "Employee lookup required",
        description:
          "To register a patient while offline, please ensure employee details are available from a prior lookup.",
        variant: "destructive",
      });
      return;
    }

    const tenantId =
      (user as any)?.tenantId && typeof (user as any)?.tenantId === "string"
        ? (user as any).tenantId
        : "";
    const userId =
      (user as any)?.id && typeof (user as any)?.id === "string"
        ? (user as any).id
        : "";

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `patient_${Date.now()}`;

    const offlineRecord: Record<string, unknown> = {
      id: clientId,
      clientId,
      tenantId,
      employeeId: data.employeeId,
      status: data.status,
      medicalClearance: data.medicalClearance,
      notes: data.notes,
      allergies: data.allergies,
      medicalHistory: data.medicalHistory,
      medications: data.medications,
      disability: data.disability,
      employee: employeeFound,
      createdOfflineAt: new Date().toISOString(),
      pendingSync: true,
    };

    await offlineStore.putPatient(offlineRecord);

    await queueOfflineOperation({
      entityType: "patient",
      operationType: "CREATE",
      tenantId,
      userId,
      clientId,
      payload: {
        ...data,
        employeeNumber:
          employeeNumber || (employeeFound as any)?.employeeNumber || "",
      },
    });

    toast({
      title: "Saved offline",
      description:
        "Patient registration has been stored locally and will sync when you're back online.",
    });

    form.reset();
    setEmployeeNumber("");
    setEmployeeFound(null);
    setLookupError("");
  }

  const onSubmit = async (data: InsertPatient) => {
    const isOnline =
      typeof navigator === "undefined" ? true : navigator.onLine;

    if (!isOnline) {
      if (!employeeFound) {
        toast({
          title: "Employee lookup required",
          description:
            "To register a patient while offline, please ensure employee details are available from a prior lookup.",
          variant: "destructive",
        });
        return;
      }
      try {
        await savePatientOffline(data);
      } catch (error) {
        console.error("Offline patient save failed", error);
        toast({
          title: "Offline save failed",
          description:
            "Could not save patient locally. Please try again or check device storage permissions.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      await createPatientMutation.mutateAsync(data);
    } catch (error) {
      // Network or server failure: fall back to offline save
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Control plane request failed"));

      if (isNetworkError) {
        try {
          await savePatientOffline(data);
          return;
        } catch (offlineError) {
          console.error("Offline patient save failed", offlineError);
          toast({
            title: "Offline save failed",
            description:
              "Could not save patient locally. Please try again or check device storage permissions.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Error",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card id="patient-registration-form">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="font-semibold">
          Register New Patient
        </CardTitle>
        <p className="text-sm text-mineaid-gray mt-1">
          Enter employee number to auto-fetch details and register as patient
        </p>
      </CardHeader>
      <CardContent className="p-6">
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

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setEmployeeNumber("");
                  setEmployeeFound(null);
                  setLookupError("");
                }}
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={createPatientMutation.isPending || !employeeFound}
                className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
              >
                {createPatientMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Patient"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}