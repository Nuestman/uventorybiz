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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ArrowLeft, FlaskConical, TestTube, Droplets, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/auth";

// Scheduling schema for drug tests
const drugTestScheduleSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  programId: z.string().min(1, "Testing program is required"),
  testReason: z.enum([
    "pre_employment",
    "random", 
    "post_incident",
    "reasonable_suspicion",
    "return_to_duty",
    "follow_up",
    "routine_screening"
  ], {
    required_error: "Test reason is required",
  }),
  scheduledDate: z.date({
    required_error: "Scheduled date is required",
  }),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
  collectionSite: z.string().min(1, "Collection site is required"),
  collectorName: z.string().min(1, "Collector name is required"),
  specimenType: z.enum(["urine", "saliva", "blood", "hair"], {
    required_error: "Specimen type is required",
  }),
  testingDevice: z.enum([
    "drugcheck_3000",
    "comprehensive_lab",
    "field_test",
    "instant_test"
  ], {
    required_error: "Testing device is required",
  }),
  chainOfCustody: z.boolean().default(true),
  notes: z.string().optional(),
});

// Alcohol test scheduling schema
const alcoholTestScheduleSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  programId: z.string().min(1, "Testing program is required"),
  testReason: z.enum([
    "pre_employment",
    "random", 
    "post_incident",
    "reasonable_suspicion",
    "return_to_duty",
    "follow_up",
    "routine_screening"
  ], {
    required_error: "Test reason is required",
  }),
  scheduledDate: z.date({
    required_error: "Scheduled date is required",
  }),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
  collectionSite: z.string().min(1, "Collection site is required"),
  collectorName: z.string().min(1, "Collector name is required"),
  testingDevice: z.enum([
    "breathalyzer",
    "comprehensive_lab",
    "field_test"
  ], {
    required_error: "Testing device is required",
  }),
  observationPeriod: z.number().min(15).max(60).default(15),
  confirmationTest: z.boolean().default(true),
  notes: z.string().optional(),
});

// Hydration test scheduling schema
const hydrationTestScheduleSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  programId: z.string().min(1, "Testing program is required"),
  testReason: z.enum([
    "random",
    "post_incident",
    "on_demand",
    "heat_illness_suspected",
    "routine_check"
  ], {
    required_error: "Test reason is required",
  }),
  scheduledDate: z.date({
    required_error: "Scheduled date is required",
  }),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
  collectionSite: z.string().min(1, "Collection site is required"),
  collectorName: z.string().min(1, "Collector name is required"),
  testType: z.enum(["urine_specific_gravity", "urine_color", "skin_pinch", "comprehensive"], {
    required_error: "Hydration test type is required",
  }),
  testLocation: z.enum(["underground", "surface", "medical_station"], {
    required_error: "Test location is required",
  }),
  ugPersonnel: z.boolean().default(false),
  environmentalFactors: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    workConditions: z.enum(["underground", "surface", "high_heat", "normal"]).optional(),
  }).optional(),
  notes: z.string().optional(),
});

type DrugTestScheduleData = z.infer<typeof drugTestScheduleSchema>;
type AlcoholTestScheduleData = z.infer<typeof alcoholTestScheduleSchema>;
type HydrationTestScheduleData = z.infer<typeof hydrationTestScheduleSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
}

interface TestingProgram {
  id: string;
  programName: string;
  programType: string;
  requiredTests: string[];
  active: boolean;
}

export default function TestScheduling() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract test type from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTestType = urlParams.get('type') as 'drug' | 'alcohol' | 'hydration' || 'drug';

  const [activeTestType, setActiveTestType] = useState<'drug' | 'alcohol' | 'hydration'>(initialTestType);
  const [isSimpleMode, setIsSimpleMode] = useState(true);

  // Get current user  
  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch employees and programs
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery<TestingProgram[]>({
    queryKey: ["/api/testing-programs"],
  });

  // Form setup for scheduling
  const drugScheduleForm = useForm<DrugTestScheduleData>({
    resolver: zodResolver(drugTestScheduleSchema),
    defaultValues: {
      scheduledDate: new Date(),
      scheduledTime: new Date().toTimeString().slice(0, 5),
      collectionSite: "Main Site Office",
      collectorName: "",
      specimenType: "urine",
      testingDevice: "drugcheck_3000",
      chainOfCustody: true,
    },
  });

  const alcoholScheduleForm = useForm<AlcoholTestScheduleData>({
    resolver: zodResolver(alcoholTestScheduleSchema),
    defaultValues: {
      scheduledDate: new Date(),
      scheduledTime: new Date().toTimeString().slice(0, 5),
      collectionSite: "Main Site Office",
      collectorName: "",
      testingDevice: "breathalyzer",
      observationPeriod: 15,
      confirmationTest: true,
    },
  });

  const hydrationScheduleForm = useForm<HydrationTestScheduleData>({
    resolver: zodResolver(hydrationTestScheduleSchema),
    defaultValues: {
      scheduledDate: new Date(),
      scheduledTime: new Date().toTimeString().slice(0, 5),
      collectionSite: "Underground Station A",
      collectorName: "",
      testType: "urine_specific_gravity",
      testLocation: "underground",
      ugPersonnel: false,
    },
  });

  // Mutations for scheduling
  const scheduleDrugTest = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/drug-tests", {
      ...data,
      status: "scheduled",
      testNumber: `DT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd'),
      createdBy: user?.id,
      testReason: data.testReason || "random",
      testMode: data.testMode || "simple",
      specimenType: data.specimenType || "urine",
      testingDevice: data.testingDevice || "drugcheck_3000",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drug-tests"] });
      toast({
        title: "Drug Test Scheduled",
        description: "Drug test has been successfully scheduled.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule drug test",
        variant: "destructive",
      });
    },
  });

  const scheduleAlcoholTest = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/alcohol-tests", {
      ...data,
      status: "scheduled",
      testNumber: `AT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      testDate: format(data.scheduledDate, 'yyyy-MM-dd'),
      testTime: data.scheduledTime,
      testLocation: data.collectionSite,
      createdBy: user?.id,
      testReason: data.testReason || "random",
      testMode: data.testMode || "simple",
      testingDevice: data.testingDevice || "breathalyzer",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alcohol-tests"] });
      toast({
        title: "Alcohol Test Scheduled",
        description: "Alcohol test has been successfully scheduled.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule alcohol test",
        variant: "destructive",
      });
    },
  });

  const scheduleHydrationTest = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/hydration-tests", {
      ...data,
      status: "scheduled",
      testNumber: `HT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      testDate: format(data.scheduledDate, 'yyyy-MM-dd'),
      testTime: data.scheduledTime,
      testedBy: user?.id,
      testReason: data.testReason || "routine_check",
      hydrationLevel: data.hydrationLevel || "adequate",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hydration-tests"] });
      toast({
        title: "Hydration Test Scheduled",
        description: "Hydration test has been successfully scheduled.",
      });
      navigate("/testing");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule hydration test",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onSubmitDrugSchedule = (data: DrugTestScheduleData) => {
    scheduleDrugTest.mutate(data);
  };

  const onSubmitAlcoholSchedule = (data: AlcoholTestScheduleData) => {
    scheduleAlcoholTest.mutate(data);
  };

  const onSubmitHydrationSchedule = (data: HydrationTestScheduleData) => {
    scheduleHydrationTest.mutate(data);
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
            Schedule New Tests
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Schedule Drug, Alcohol & Hydration testing with advanced configuration options
          </p>
        </div>
      </div>

      {/* Testing Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Scheduling Configuration
            <div className="flex items-center space-x-2">
              <span className="text-sm">Quick</span>
              <Switch
                checked={!isSimpleMode}
                onCheckedChange={(checked) => setIsSimpleMode(!checked)}
                data-testid="switch-scheduling-mode"
              />
              <span className="text-sm">Advanced</span>
            </div>
          </CardTitle>
          <CardDescription>
            {isSimpleMode 
              ? "Quick scheduling with standard settings" 
              : "Advanced scheduling with comprehensive configuration"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Test Type Selector */}
      <Tabs value={activeTestType} onValueChange={(value: any) => setActiveTestType(value)} className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="drug" data-testid="tab-schedule-drug" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <FlaskConical className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Schedule Drug Test</span>
            </TabsTrigger>
            <TabsTrigger value="alcohol" data-testid="tab-schedule-alcohol" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <TestTube className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Schedule Alcohol Test</span>
            </TabsTrigger>
            <TabsTrigger value="hydration" data-testid="tab-schedule-hydration" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Droplets className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Schedule Hydration Test</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Drug Test Scheduling Form */}
        <TabsContent value="drug">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Drug Test</CardTitle>
              <CardDescription>
                Schedule drug testing using DrugCheck 3000 or comprehensive laboratory analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...drugScheduleForm}>
                <form onSubmit={drugScheduleForm.handleSubmit(onSubmitDrugSchedule)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={drugScheduleForm.control}
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

                    {/* Program Selection */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="programId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testing Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-program">
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programsLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                programs.map((program) => (
                                  <SelectItem key={program.id} value={program.id}>
                                    {program.programName} ({program.programType})
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
                      control={drugScheduleForm.control}
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
                              <SelectItem value="routine_screening">Routine Screening</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Date */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
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
                                  date < new Date()
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Time */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-scheduled-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Site */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="collectionSite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection Site</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Main Site Office" data-testid="input-collection-site" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collector Name */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="collectorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collector Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of collector" data-testid="input-collector-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Specimen Type */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="specimenType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specimen Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select specimen type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="saliva">Saliva (Quick Test)</SelectItem>
                              <SelectItem value="urine">Urine (Most Common)</SelectItem>
                              <SelectItem value="blood">Blood (High Accuracy)</SelectItem>
                              <SelectItem value="hair">Hair (Long Detection Window)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Testing Device */}
                    <FormField
                      control={drugScheduleForm.control}
                      name="testingDevice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testing Equipment</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select testing device" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="drugcheck_3000">DrugCheck 3000 (Recommended)</SelectItem>
                              <SelectItem value="instant_test">Instant Test Kit</SelectItem>
                              <SelectItem value="comprehensive_lab">Comprehensive Lab Analysis</SelectItem>
                              <SelectItem value="field_test">Field Test Kit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={drugScheduleForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any special instructions or notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={scheduleDrugTest.isPending} data-testid="button-schedule-drug-test">
                      {scheduleDrugTest.isPending ? "Scheduling..." : "Schedule Drug Test"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alcohol Test Scheduling Form */}
        <TabsContent value="alcohol">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Alcohol Test</CardTitle>
              <CardDescription>
                Schedule alcohol testing using breathalyzer or laboratory analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...alcoholScheduleForm}>
                <form onSubmit={alcoholScheduleForm.handleSubmit(onSubmitAlcoholSchedule)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-alcohol">
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

                    {/* Program Selection */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="programId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testing Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-program-alcohol">
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programsLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                programs.map((program) => (
                                  <SelectItem key={program.id} value={program.id}>
                                    {program.programName} ({program.programType})
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
                      control={alcoholScheduleForm.control}
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
                              <SelectItem value="routine_screening">Routine Screening</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Date */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
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
                                  date < new Date()
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Time */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-scheduled-time-alcohol" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Site */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="collectionSite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection Site</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Main Site Office" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collector Name */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="collectorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collector Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of collector" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Testing Device */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="testingDevice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testing Equipment</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select testing device" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="breathalyzer">Breathalyzer (Recommended)</SelectItem>
                              <SelectItem value="comprehensive_lab">Comprehensive Lab Analysis</SelectItem>
                              <SelectItem value="field_test">Field Test Kit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Observation Period */}
                    <FormField
                      control={alcoholScheduleForm.control}
                      name="observationPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observation Period (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              placeholder="15-60 minutes"
                              min={15}
                              max={60}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={alcoholScheduleForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any special instructions or notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={scheduleAlcoholTest.isPending} data-testid="button-schedule-alcohol-test">
                      {scheduleAlcoholTest.isPending ? "Scheduling..." : "Schedule Alcohol Test"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hydration Test Scheduling Form */}
        <TabsContent value="hydration">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Hydration Test</CardTitle>
              <CardDescription>
                Schedule hydration monitoring for underground and surface personnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...hydrationScheduleForm}>
                <form onSubmit={hydrationScheduleForm.handleSubmit(onSubmitHydrationSchedule)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Selection */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee-hydration">
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

                    {/* Program Selection */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="programId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testing Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-program-hydration">
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programsLoading ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                              ) : (
                                programs.map((program) => (
                                  <SelectItem key={program.id} value={program.id}>
                                    {program.programName} ({program.programType})
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
                      control={hydrationScheduleForm.control}
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
                              <SelectItem value="on_demand">On-Demand</SelectItem>
                              <SelectItem value="heat_illness_suspected">Heat Illness Suspected</SelectItem>
                              <SelectItem value="routine_check">Routine Check</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Date */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date</FormLabel>
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
                                  date < new Date()
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Scheduled Time */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-scheduled-time-hydration" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collection Site */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="collectionSite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection Site</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Underground Station A" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Collector Name */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="collectorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collector Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Name of collector" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Type */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="testType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hydration Test Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select test type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="urine_specific_gravity">Urine Specific Gravity (Recommended)</SelectItem>
                              <SelectItem value="urine_color">Urine Color Assessment</SelectItem>
                              <SelectItem value="skin_pinch">Skin Pinch Test</SelectItem>
                              <SelectItem value="comprehensive">Comprehensive Assessment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Test Location */}
                    <FormField
                      control={hydrationScheduleForm.control}
                      name="testLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
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

                  {/* UG Personnel Checkbox */}
                  <FormField
                    control={hydrationScheduleForm.control}
                    name="ugPersonnel"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Underground Personnel"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Underground Personnel</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if this employee works underground (requires more frequent monitoring)
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={hydrationScheduleForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any special instructions or notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/testing")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={scheduleHydrationTest.isPending} data-testid="button-schedule-hydration-test">
                      {scheduleHydrationTest.isPending ? "Scheduling..." : "Schedule Hydration Test"}
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