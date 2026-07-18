import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ArrowLeft, FlaskConical, TestTube, Droplets, Activity } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/auth";

// Simple drug test schema for field testing
const drugTestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  testReason: z.enum(["random", "post_incident", "reasonable_suspicion", "pre_employment"]),
  collectionDate: z.date({ required_error: "Test date is required" }),
  collectionTime: z.string().min(1, "Test time is required"),
  collectionSite: z.string().min(1, "Test location is required"),
  testedBy: z.string().min(1, "Tester name is required"),
  testingDevice: z.enum(["drugcheck_3000", "instant_test"]),
  specimenType: z.string().optional(),
  // Simple overall result
  drugResult: z.enum(["negative", "positive", "non-negative", "dilute", "invalid", "pending", "inconclusive"]),
  cocResult: z.string().optional(),
  opiResult: z.string().optional(),
  thcResult: z.string().optional(),
  ampResult: z.string().optional(),
  metResult: z.string().optional(),
  bzoResult: z.string().optional(),
  overallResult: z.string().optional(),
  witnessedBy: z.string().optional(),
  conclusion: z.string().optional(),
  notes: z.string().optional(),
});

// Simple alcohol test schema
const alcoholTestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  testReason: z.enum(["random", "post_incident", "reasonable_suspicion", "pre_employment"]),
  collectionDate: z.date({ required_error: "Test date is required" }),
  collectionTime: z.string().min(1, "Test time is required"),
  collectionSite: z.string().min(1, "Test location is required"),
  testedBy: z.string().min(1, "Tester name is required"),
  testingDevice: z.enum(["breathalyzer", "field_test"]),
  bacLevel: z.string().default("0.00"),
  alcoholResult: z.enum(["negative", "positive"]),
  witnessedBy: z.string().optional(),
  conclusion: z.string().optional(),
  notes: z.string().optional(),
});

// Simple hydration test schema
const hydrationTestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  testReason: z.enum(["random", "post_incident", "on_demand", "heat_illness_suspected", "routine_check"]),
  collectionDate: z.date({ required_error: "Test date is required" }),
  collectionTime: z.string().min(1, "Test time is required"),
  testLocation: z.enum(["underground", "surface"]),
  testedBy: z.string().min(1, "Tester name is required"),
  hydrationLevel: z.enum(["adequate", "mild_dehydration", "moderate_dehydration", "severe_dehydration"]),
  recommendedAction: z.enum(["continue_work", "hydrate_and_rest", "medical_review", "immediate_treatment"]),
  witnessedBy: z.string().optional(),
  conclusion: z.string().optional(),
  notes: z.string().optional(),
});

// Instant test schema (HB, Pregnancy, Malaria, Typhoid)
const instantTestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  testType: z.enum(["hb", "pregnancy", "malaria", "typhoid"], {
    required_error: "Test type is required",
  }),
  testDate: z.date({ required_error: "Test date is required" }),
  testTime: z.string().min(1, "Test time is required"),
  // For HB tests only
  hbLevel: z.string().optional(),
  // For other tests (pregnancy, malaria, typhoid)
  testResult: z.enum(["positive", "negative", "invalid"]).optional(),
  notes: z.string().optional(),
});

type DrugTestData = z.infer<typeof drugTestSchema>;
type AlcoholTestData = z.infer<typeof alcoholTestSchema>;
type HydrationTestData = z.infer<typeof hydrationTestSchema>;
type InstantTestData = z.infer<typeof instantTestSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

export default function TestResultForm() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract test type from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTestType = urlParams.get('type') as 'drug' | 'alcohol' | 'hydration' | 'instant' || 'drug';

  const [activeTestType, setActiveTestType] = useState<'drug' | 'alcohol' | 'hydration' | 'instant'>(initialTestType);

  // Get current user
  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Form setup - simplified
  const drugForm = useForm<DrugTestData>({
    resolver: zodResolver(drugTestSchema),
    defaultValues: {
      testReason: "random",
      collectionDate: new Date(),
      collectionTime: new Date().toTimeString().slice(0, 5),
      collectionSite: "Mine Site",
      testedBy: "",
      testingDevice: "drugcheck_3000",
      drugResult: "negative",
    },
  });

  const alcoholForm = useForm<AlcoholTestData>({
    resolver: zodResolver(alcoholTestSchema),
    defaultValues: {
      testReason: "random",
      collectionDate: new Date(),
      collectionTime: new Date().toTimeString().slice(0, 5),
      collectionSite: "Mine Site",
      testedBy: "",
      testingDevice: "breathalyzer",
      bacLevel: "0.00",
      alcoholResult: "negative",
    },
  });

  const hydrationForm = useForm<HydrationTestData>({
    resolver: zodResolver(hydrationTestSchema),
    defaultValues: {
      testReason: "routine_check",
      collectionDate: new Date(),
      collectionTime: new Date().toTimeString().slice(0, 5),
      testLocation: "underground",
      testedBy: "",
      hydrationLevel: "adequate",
      recommendedAction: "continue_work",
    },
  });

  const instantTestForm = useForm<InstantTestData>({
    resolver: zodResolver(instantTestSchema),
    defaultValues: {
      testDate: new Date(),
      testTime: new Date().toTimeString().slice(0, 5),
      testType: "hb",
      hbLevel: "",
      testResult: "negative",
      notes: "",
    },
  });

  // Simplified mutations
  const submitDrugTest = useMutation({
    mutationFn: (data: DrugTestData) => apiRequest("POST", "/api/drug-tests", {
      ...data,
      status: "completed",
      testNumber: `DT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      collectionDate: format(data.collectionDate, 'yyyy-MM-dd'),
      createdBy: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drug-tests"] });
      toast({
        title: "Drug Test Results Recorded",
        description: "Drug test results have been successfully recorded.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record drug test results",
        variant: "destructive",
      });
    },
  });

  const submitAlcoholTest = useMutation({
    mutationFn: (data: AlcoholTestData) => apiRequest("POST", "/api/alcohol-tests", {
      ...data,
      status: "completed",
      testNumber: `AT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      testDate: format(data.collectionDate, 'yyyy-MM-dd'),
      testTime: data.collectionTime,
      testLocation: data.collectionSite,
      createdBy: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alcohol-tests"] });
      toast({
        title: "Alcohol Test Results Recorded",
        description: "Alcohol test results have been successfully recorded.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record alcohol test results",
        variant: "destructive",
      });
    },
  });

  const submitHydrationTest = useMutation({
    mutationFn: (data: HydrationTestData) => apiRequest("POST", "/api/hydration-tests", {
      ...data,
      status: "completed",
      testNumber: `HT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      testDate: format(data.collectionDate, 'yyyy-MM-dd'),
      testTime: data.collectionTime,
      testedBy: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hydration-tests"] });
      toast({
        title: "Hydration Test Results Recorded",
        description: "Hydration test results have been successfully recorded.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record hydration test results",
        variant: "destructive",
      });
    },
  });

  const submitInstantTest = useMutation({
    mutationFn: (data: InstantTestData) => apiRequest("POST", "/api/instant-tests", {
      ...data,
      testNumber: `IT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      testDate: format(data.testDate, 'yyyy-MM-dd'),
      testedBy: user?.id, // Auto-set from logged-in user
      createdBy: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({
        title: "Instant Test Recorded",
        description: "Instant test results have been successfully recorded.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record instant test",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onSubmitDrugTest = (data: DrugTestData) => {
    submitDrugTest.mutate(data);
  };

  const onSubmitAlcoholTest = (data: AlcoholTestData) => {
    submitAlcoholTest.mutate(data);
  };

  const onSubmitHydrationTest = (data: HydrationTestData) => {
    submitHydrationTest.mutate(data);
  };

  const onSubmitInstantTest = (data: InstantTestData) => {
    submitInstantTest.mutate(data);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/testing")} data-testid="button-back" className="self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            Record Test Results
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Quick field testing for drugs, alcohol, hydration & instant POC tests - administered by safety officers
          </p>
        </div>
      </div>



      {/* Test Type Selector */}
      <Tabs value={activeTestType} onValueChange={(value: any) => setActiveTestType(value)} className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="drug" data-testid="tab-drug-test" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <FlaskConical className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Drug Test</span>
            </TabsTrigger>
            <TabsTrigger value="alcohol" data-testid="tab-alcohol-test" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <TestTube className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Alcohol Test</span>
            </TabsTrigger>
            <TabsTrigger value="hydration" data-testid="tab-hydration-test" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Droplets className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Hydration Test</span>
            </TabsTrigger>
            <TabsTrigger value="instant" data-testid="tab-instant-test" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Activity className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Instant Tests</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Drug Test Form */}
        <TabsContent value="drug">
          <Card>
            <CardHeader>
              <CardTitle>Drug Test Results Entry</CardTitle>
              <CardDescription>
                Simple field testing for prohibited substances using DrugCheck 3000
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...drugForm}>
                <form onSubmit={drugForm.handleSubmit(onSubmitDrugTest)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={drugForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employeesLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Reason */}
                    <FormField
                      control={drugForm.control}
                      name="testReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Reason</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="random">Random</SelectItem>
                              <SelectItem value="post_incident">Post-Incident</SelectItem>
                              <SelectItem value="reasonable_suspicion">Reasonable Suspicion</SelectItem>
                              <SelectItem value="pre_employment">Pre-Employment</SelectItem>
                              <SelectItem value="return_to_duty">Return to Duty</SelectItem>
                              <SelectItem value="follow_up">Follow-up</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Date */}
                    <FormField
                      control={drugForm.control}
                      name="collectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Time */}
                    <FormField
                      control={drugForm.control}
                      name="collectionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-test-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Site */}
                    <FormField
                      control={drugForm.control}
                      name="collectionSite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Main Medical Station" data-testid="input-test-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Witnessed By */}
                    <FormField
                      control={drugForm.control}
                      name="witnessedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witnessed By</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of witness" data-testid="input-witnessed-by" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tested By */}
                    <FormField
                      control={drugForm.control}
                      name="testedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tested By</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of tester" data-testid="input-tested-by" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Specimen Type */}
                    <FormField
                      control={drugForm.control}
                      name="specimenType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specimen Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select specimen type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="urine">Urine</SelectItem>
                              <SelectItem value="saliva">Saliva</SelectItem>
                              <SelectItem value="blood">Blood</SelectItem>
                              <SelectItem value="hair">Hair</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Drug Results Section - Specific Substances */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium">Drug Test Results (DrugCheck 3000)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* COC (Cocaine) */}
                      <FormField
                        control={drugForm.control}
                        name="cocResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>COC (Cocaine)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* OPI (Opioids) */}
                      <FormField
                        control={drugForm.control}
                        name="opiResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OPI (Opioids)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* THC */}
                      <FormField
                        control={drugForm.control}
                        name="thcResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>THC (Cannabis)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* AMP (Amphetamines) */}
                      <FormField
                        control={drugForm.control}
                        name="ampResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AMP (Amphetamines)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* MET (Methamphetamines) */}
                      <FormField
                        control={drugForm.control}
                        name="metResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MET (Methamphetamines)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* BZO (Benzodiazepines) */}
                      <FormField
                        control={drugForm.control}
                        name="bzoResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>BZO (Benzodiazepines)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="dilute">Dilute</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Overall Result */}
                    <FormField
                      control={drugForm.control}
                      name="overallResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Result</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="negative">Negative</SelectItem>
                              <SelectItem value="non-negative">Non-Negative</SelectItem>
                              <SelectItem value="invalid">Invalid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conclusion */}
                  <FormField
                    control={drugForm.control}
                    name="conclusion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Conclusion</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={String(field.value ?? '')} placeholder="Enter test conclusion and any relevant observations..." data-testid="textarea-conclusion" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={drugForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional notes or observations..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitDrugTest.isPending} data-testid="button-submit-drug-test">
                      {submitDrugTest.isPending ? "Recording..." : "Record Test Results"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alcohol Test Form */}
        <TabsContent value="alcohol">
          <Card>
            <CardHeader>
              <CardTitle>Alcohol Test Results Entry</CardTitle>
              <CardDescription>
                Record alcohol test results using breathalyzer or laboratory analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...alcoholForm}>
                <form onSubmit={alcoholForm.handleSubmit(onSubmitAlcoholTest)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={alcoholForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* BAC Level */}
                    <FormField
                      control={alcoholForm.control}
                      name="bacLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BAC Level (%)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" data-testid="input-bac-level" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Alcohol Result */}
                    <FormField
                      control={alcoholForm.control}
                      name="alcoholResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alcohol Result</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="negative">Negative</SelectItem>
                              <SelectItem value="positive">Positive</SelectItem>
                              <SelectItem value="invalid">Invalid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Same common fields as drug test */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Test Date */}
                    <FormField
                      control={alcoholForm.control}
                      name="collectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Time */}
                    <FormField
                      control={alcoholForm.control}
                      name="collectionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Location */}
                    <FormField
                      control={alcoholForm.control}
                      name="collectionSite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Main Medical Station" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Witnessed By */}
                    <FormField
                      control={alcoholForm.control}
                      name="witnessedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witnessed By</FormLabel>
                          <FormControl>
                            <Input {...field} value={String(field.value ?? '')} placeholder="Name of witness" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tested By */}
                    <FormField
                      control={alcoholForm.control}
                      name="testedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tested By</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of tester" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Reason */}
                    <FormField
                      control={alcoholForm.control}
                      name="testReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Reason</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="random">Random</SelectItem>
                              <SelectItem value="post_incident">Post-Incident</SelectItem>
                              <SelectItem value="reasonable_suspicion">Reasonable Suspicion</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conclusion */}
                  <FormField
                    control={alcoholForm.control}
                    name="conclusion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Conclusion</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={String(field.value ?? '')} placeholder="Enter test conclusion..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitAlcoholTest.isPending} data-testid="button-submit-alcohol-test">
                      {submitAlcoholTest.isPending ? "Recording..." : "Record Test Results"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hydration Test Form */}
        <TabsContent value="hydration">
          <Card>
            <CardHeader>
              <CardTitle>Hydration Test Results Entry</CardTitle>
              <CardDescription>
                Record hydration assessment results for underground and surface personnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...hydrationForm}>
                <form onSubmit={hydrationForm.handleSubmit(onSubmitHydrationTest)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={hydrationForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Reason */}
                    <FormField
                      control={hydrationForm.control}
                      name="testReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Reason</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="random">Random</SelectItem>
                              <SelectItem value="post_incident">Post Incident</SelectItem>
                              <SelectItem value="on_demand">On Demand</SelectItem>
                              <SelectItem value="heat_illness_suspected">Heat Illness Suspected</SelectItem>
                              <SelectItem value="routine_check">Routine Check</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hydration Level */}
                    <FormField
                      control={hydrationForm.control}
                      name="hydrationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hydration Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="adequate">Adequate</SelectItem>
                              <SelectItem value="mild_dehydration">Mild Dehydration</SelectItem>
                              <SelectItem value="moderate_dehydration">Moderate Dehydration</SelectItem>
                              <SelectItem value="severe_dehydration">Severe Dehydration</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recommended Action */}
                    <FormField
                      control={hydrationForm.control}
                      name="recommendedAction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommended Action</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="continue_work">Continue Work</SelectItem>
                              <SelectItem value="hydrate_and_rest">Rest & Hydrate</SelectItem>
                              <SelectItem value="medical_review">Medical Evaluation</SelectItem>
                              <SelectItem value="immediate_treatment">Immediate Treatment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Location */}
                    <FormField
                      control={hydrationForm.control}
                      name="testLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="underground">Underground</SelectItem>
                              <SelectItem value="surface">Surface</SelectItem>
                              <SelectItem value="medical_station">Medical Station</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Common fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Test Date */}
                    <FormField
                      control={hydrationForm.control}
                      name="collectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Time */}
                    <FormField
                      control={hydrationForm.control}
                      name="collectionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Witnessed By */}
                    <FormField
                      control={hydrationForm.control}
                      name="witnessedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witnessed By</FormLabel>
                          <FormControl>
                            <Input {...field} value={String(field.value ?? '')} placeholder="Name of witness" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tested By */}
                    <FormField
                      control={hydrationForm.control}
                      name="testedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tested By</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of tester" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conclusion */}
                  <FormField
                    control={hydrationForm.control}
                    name="conclusion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Conclusion</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={String(field.value ?? '')} placeholder="Enter test conclusion..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitHydrationTest.isPending} data-testid="button-submit-hydration-test">
                      {submitHydrationTest.isPending ? "Recording..." : "Record Test Results"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instant Test Form */}
        <TabsContent value="instant">
          <Card>
            <CardHeader>
              <CardTitle>Instant Test Results Entry (POC)</CardTitle>
              <CardDescription>
                Record Point-of-Care instant test results: Hemoglobin, Pregnancy, Malaria, Typhoid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...instantTestForm}>
                <form onSubmit={instantTestForm.handleSubmit(onSubmitInstantTest)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={instantTestForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employeesLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Type */}
                    <FormField
                      control={instantTestForm.control}
                      name="testType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select test type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hb">Hemoglobin (HB)</SelectItem>
                              <SelectItem value="pregnancy">Pregnancy Test</SelectItem>
                              <SelectItem value="malaria">Malaria Test</SelectItem>
                              <SelectItem value="typhoid">Typhoid Test</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Date */}
                    <FormField
                      control={instantTestForm.control}
                      name="testDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Time */}
                    <FormField
                      control={instantTestForm.control}
                      name="testTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-test-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Info Note */}
                  {/* <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ️ Care location is automatically assigned from your active session location
                    </p>
                  </div> */}

                  {/* Conditional: HB Level for HB tests */}
                  {instantTestForm.watch("testType") === "hb" && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-medium">Hemoglobin Test Result</h3>
                      <FormField
                        control={instantTestForm.control}
                        name="hbLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hemoglobin Level (g/dL)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max="25"
                                placeholder="e.g., 14.5" 
                                {...field} 
                                data-testid="input-hb-level"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-sm text-muted-foreground mt-1">
                              Normal ranges: Male 13.5-17.5 g/dL, Female 12.0-15.5 g/dL
                            </p>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Conditional: Test Result for non-HB tests */}
                  {instantTestForm.watch("testType") !== "hb" && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-medium">
                        {instantTestForm.watch("testType") === "pregnancy" && "Pregnancy Test Result"}
                        {instantTestForm.watch("testType") === "malaria" && "Malaria Test Result"}
                        {instantTestForm.watch("testType") === "typhoid" && "Typhoid Test Result"}
                      </h3>
                      <FormField
                        control={instantTestForm.control}
                        name="testResult"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Result</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                <SelectTrigger data-testid="select-test-result">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <FormField
                    control={instantTestForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional observations..." data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitInstantTest.isPending} data-testid="button-submit-instant-test">
                      {submitInstantTest.isPending ? "Recording..." : "Record Test Results"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}