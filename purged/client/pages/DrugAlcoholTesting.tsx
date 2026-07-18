import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Users, TestTube, FlaskConical, Activity, AlertTriangle, CheckCircle, XCircle, Droplets, Plus, Edit, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DrugTest {
  id: string;
  testNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  testType?: "urine" | "saliva" | "blood" | "hair";
  specimenType?: "urine" | "saliva" | "blood" | "hair";
  testReason: string;
  scheduledDate: string;
  scheduledTime: string;
  collectionDate?: string;
  collectionTime?: string;
  testingDevice: string;
  drugResult?: "negative" | "non-negative" | "positive" | "inconclusive" | "pending" | "dilute" | "invalid";
  testResult?: "negative" | "non-negative" | "positive" | "inconclusive" | "pending";
  // Individual drug panel results
  cocResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  opiResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  thcResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  ampResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  metResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  bzoResult?: "negative"  | "non-negative" | "positive" | "inconclusive" | "pending" | "invalid";
  substancesDetected?: string[];
  labResults?: Record<string, any>;
  chainOfCustody?: boolean;
  status: "scheduled" | "collected" | "in_lab" | "results_pending" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
}

interface AlcoholTest {
  id: string;
  testNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  testType?: "breathalyzer" | "blood" | "urine";
  testReason: string;
  scheduledDate: string;
  scheduledTime: string;
  collectionDate?: string;
  collectionTime?: string;
  testingDevice: string;
  bacLevel?: number;
  alcoholLevel?: string;
  breathalyzerReading?: string;
  testResult?: "negative" | "non-negative" | "positive" | "inconclusive" | "pending";
  observationPeriod?: number;
  confirmationTest?: boolean;
  status: "scheduled" | "collected" | "in_lab" | "results_pending" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
}

interface HydrationTest {
  id: string;
  testNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  testType?: "urine_specific_gravity" | "urine_color" | "skin_pinch" | "comprehensive";
  testReason: string;
  scheduledDate: string;
  scheduledTime: string;
  collectionDate?: string;
  collectionTime?: string;
  testingDevice?: string;
  testLocation?: string;
  hydrationLevel?: "adequate" | "mild_dehydration" | "moderate_dehydration" | "severe_dehydration";
  specificGravity?: number;
  urineSpecificGravity?: number;
  urineColor?: "pale_yellow" | "yellow" | "dark_yellow" | "amber" | "dark_amber";
  vitalSigns?: Record<string, any>;
  recommendations?: string;
  recommendedAction?: "continue_work" | "rest_hydrate" | "medical_evaluation" | "immediate_treatment";
  status: "scheduled" | "collected" | "results_pending" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
}

interface InstantTest {
  id: string;
  testNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  locationId?: string;
  locationName?: string;
  locationCode?: string;
  testType: "hb" | "pregnancy" | "malaria" | "typhoid";
  testDate: string;
  testTime?: string;
  testResult?: "positive" | "negative" | "invalid";
  hbLevel?: string; // For HB tests only
  notes?: string;
  testedBy: string;
  testerName?: string;
  createdAt: string;
}

const INSTANT_TEST_TYPE_OPTIONS = [
  { value: "hb", label: "Hemoglobin (HB)" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "malaria", label: "Malaria" },
  { value: "typhoid", label: "Typhoid" },
] as const;

const ALL_INSTANT_TEST_TYPES = INSTANT_TEST_TYPE_OPTIONS.map(option => option.value);

interface TestingProgram {
  id: string;
  programName: string;
  programType: "pre_employment" | "random" | "post_incident" | "reasonable_suspicion" | "return_to_duty" | "follow_up";
  testingFrequency: string;
  active: boolean;
  requiredTests: string[] | string;
  departments: string[] | string;
  poolSize?: number;
  ugPersonnelFocused?: boolean;
}

interface TestingEquipment {
  id: string;
  deviceName?: string;
  equipmentName?: string;
  deviceType?: "drugcheck_3000" | "breathalyzer" | "comprehensive_lab" | "field_test" | "instant_test";
  equipmentType?: "drugcheck_3000" | "breathalyzer" | "comprehensive_lab" | "field_test" | "instant_test";
  serialNumber: string;
  calibrationDate?: string;
  nextCalibrationDate?: string;
  status: "active" | "maintenance" | "calibration" | "out_of_service";
}

export default function DrugAlcoholTesting() {
  const [location, navigate] = useLocation();
  const [activeTestingType, setActiveTestingType] = useState<"drug" | "alcohol" | "hydration" | "instant">("drug");
  const [activeMainTab, setActiveMainTab] = useState("performed-tests");
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TestingProgram | null>(null);
  const [programForm, setProgramForm] = useState({
    programName: "",
    programType: "random" as any,
    testingFrequency: "monthly",
    poolSize: 0,
    active: true,
    requiredTests: [] as string[],
    departments: [] as string[],
    ugPersonnelFocused: false,
  });

  // Edit test state management
  const [isEditTestDialogOpen, setIsEditTestDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<{type: 'drug' | 'alcohol' | 'hydration' | 'instant', data: any} | null>(null);
  const [testEditForm, setTestEditForm] = useState<any>({});

  // Status filters for completed tests (show all non-scheduled by default)
  const [drugStatusFilter, setDrugStatusFilter] = useState<string[]>(['completed', 'collected', 'in_lab', 'results_pending']);
  const [alcoholStatusFilter, setAlcoholStatusFilter] = useState<string[]>(['completed', 'collected', 'in_lab', 'results_pending']);
  const [hydrationStatusFilter, setHydrationStatusFilter] = useState<string[]>(['completed', 'collected', 'results_pending']);
  const [instantTypeFilter, setInstantTypeFilter] = useState<string[]>(ALL_INSTANT_TEST_TYPES);
  const [instantLocationFilter, setInstantLocationFilter] = useState<string>('all');

  // Listen for sidebar tab navigation
  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveMainTab(e.detail.tabValue);
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    
    // Check URL hash on mount
    const hash = window.location.hash.replace('#', '');
    if (hash && ['performed-tests', 'scheduled-tests', 'programs', 'equipment'].includes(hash)) {
      setActiveMainTab(hash);
    }

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    };
  }, []);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user for personalization
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch separated testing data
  const { data: drugTests = [], isLoading: drugTestsLoading } = useQuery<DrugTest[]>({
    queryKey: ["/api/drug-tests"],
  });

  const { data: alcoholTests = [], isLoading: alcoholTestsLoading } = useQuery<AlcoholTest[]>({
    queryKey: ["/api/alcohol-tests"],
  });

  const { data: hydrationTests = [], isLoading: hydrationTestsLoading } = useQuery<HydrationTest[]>({
    queryKey: ["/api/hydration-tests"],
  });

  const { data: instantTests = [], isLoading: instantTestsLoading } = useQuery<InstantTest[]>({
    queryKey: ["/api/instant-tests"],
  });

  const { data: careLocations = [] } = useQuery<any[]>({
    queryKey: ["/api/care-locations"],
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery<TestingProgram[]>({
    queryKey: ["/api/testing-programs"],
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<TestingEquipment[]>({
    queryKey: ["/api/testing-equipment"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/testing/analytics"],
  });

  // Testing Programs Mutations
  const createProgramMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/testing-programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testing-programs"] });
      toast({
        title: "Program Created",
        description: "Testing program has been successfully created.",
      });
      setIsProgramDialogOpen(false);
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create program",
        variant: "destructive",
      });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/testing-programs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testing-programs"] });
      toast({
        title: "Program Updated",
        description: "Testing program has been successfully updated.",
      });
      setIsProgramDialogOpen(false);
      setEditingProgram(null);
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update program",
        variant: "destructive",
      });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/testing-programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testing-programs"] });
      toast({
        title: "Program Deleted",
        description: "Testing program has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete program",
        variant: "destructive",
      });
    },
  });

  const toggleProgramStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiRequest("PUT", `/api/testing-programs/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testing-programs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update program status",
        variant: "destructive",
      });
    },
  });

  // Program form handlers
  const resetProgramForm = () => {
    setProgramForm({
      programName: "",
      programType: "random" as any,
      testingFrequency: "monthly",
      poolSize: 0,
      active: true,
      requiredTests: [],
      departments: [],
      ugPersonnelFocused: false,
    });
  };

  const handleEditProgram = (program: TestingProgram) => {
    setEditingProgram(program);
    setProgramForm({
      programName: program.programName,
      programType: program.programType,
      testingFrequency: program.testingFrequency || "monthly",
      poolSize: program.poolSize || 0,
      active: program.active,
      requiredTests: typeof program.requiredTests === 'string' ? JSON.parse(program.requiredTests) : (program.requiredTests || []),
      departments: typeof program.departments === 'string' ? JSON.parse(program.departments) : (program.departments || []),
      ugPersonnelFocused: program.ugPersonnelFocused || false,
    });
    setIsProgramDialogOpen(true);
  };

  const handleSubmitProgram = () => {
    const submitData = {
      ...programForm,
      requiredTests: JSON.stringify(programForm.requiredTests),
      departments: JSON.stringify(programForm.departments),
    };

    if (editingProgram) {
      updateProgramMutation.mutate({ id: editingProgram.id, data: submitData });
    } else {
      createProgramMutation.mutate(submitData);
    }
  };

  const handleDeleteProgram = (id: string, programName: string) => {
    if (confirm(`Are you sure you want to delete "${programName}"? This action cannot be undone.`)) {
      deleteProgramMutation.mutate(id);
    }
  };

  const handleToggleRequiredTest = (testType: string) => {
    setProgramForm(prev => ({
      ...prev,
      requiredTests: prev.requiredTests.includes(testType)
        ? prev.requiredTests.filter(t => t !== testType)
        : [...prev.requiredTests, testType]
    }));
  };

  const handleToggleDepartment = (dept: string) => {
    setProgramForm(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }));
  };

  // Test deletion mutations
  const deleteDrugTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/drug-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drug-tests"] });
      toast({
        title: "Test Deleted",
        description: "Drug test has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test",
        variant: "destructive",
      });
    },
  });

  const deleteAlcoholTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/alcohol-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alcohol-tests"] });
      toast({
        title: "Test Deleted",
        description: "Alcohol test has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test",
        variant: "destructive",
      });
    },
  });

  const deleteHydrationTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/hydration-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hydration-tests"] });
      toast({
        title: "Test Deleted",
        description: "Hydration test has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test",
        variant: "destructive",
      });
    },
  });

  const deleteInstantTestMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/instant-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({
        title: "Test Deleted",
        description: "Instant test has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTest = (type: 'drug' | 'alcohol' | 'hydration' | 'instant', id: string, testNumber: string) => {
    if (confirm(`Are you sure you want to delete test "${testNumber}"? This action cannot be undone.`)) {
      if (type === 'drug') {
        deleteDrugTestMutation.mutate(id);
      } else if (type === 'alcohol') {
        deleteAlcoholTestMutation.mutate(id);
      } else if (type === 'hydration') {
        deleteHydrationTestMutation.mutate(id);
      } else {
        deleteInstantTestMutation.mutate(id);
      }
    }
  };

  // Edit test mutations
  const updateDrugTestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/drug-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drug-tests"] });
      toast({
        title: "Test Updated",
        description: "Drug test has been successfully updated.",
      });
      setIsEditTestDialogOpen(false);
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update drug test",
        variant: "destructive",
      });
    },
  });

  const updateAlcoholTestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/alcohol-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alcohol-tests"] });
      toast({
        title: "Test Updated",
        description: "Alcohol test has been successfully updated.",
      });
      setIsEditTestDialogOpen(false);
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update alcohol test",
        variant: "destructive",
      });
    },
  });

  const updateHydrationTestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/hydration-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hydration-tests"] });
      toast({
        title: "Test Updated",
        description: "Hydration test has been successfully updated.",
      });
      setIsEditTestDialogOpen(false);
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update hydration test",
        variant: "destructive",
      });
    },
  });

  const updateInstantTestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/instant-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({
        title: "Test Updated",
        description: "Instant test has been successfully updated.",
      });
      setIsEditTestDialogOpen(false);
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update instant test",
        variant: "destructive",
      });
    },
  });

  // Handle edit test
  const handleEditTest = (type: 'drug' | 'alcohol' | 'hydration' | 'instant', test: any) => {
    setEditingTest({ type, data: test });
    setTestEditForm(test);
    setIsEditTestDialogOpen(true);
  };

  // Handle submit test edit
  const handleSubmitTestEdit = () => {
    if (!editingTest) return;

    const { type, data } = editingTest;
    
    // Prepare data with proper date conversion
    const preparedData: any = { ...testEditForm };
    
    // Convert date strings to Date objects if they exist
    if (preparedData.scheduledDate) {
      preparedData.scheduledDate = new Date(preparedData.scheduledDate);
    }
    if (preparedData.testDate) {
      preparedData.testDate = new Date(preparedData.testDate);
    }
    if (preparedData.collectionDate) {
      preparedData.collectionDate = new Date(preparedData.collectionDate);
    }
    
    // Remove read-only and computed fields
    delete preparedData.employeeName;
    delete preparedData.employeeNumber;
    delete preparedData.testerName;
    delete preparedData.locationName;
    delete preparedData.locationCode;
    if (type !== 'instant') {
      delete preparedData.testResult; // This is computed from drugResult/alcoholResult (not for instant)
      delete preparedData.testType; // Don't send if it's a default value
    }
    if (type === 'instant') {
      // For instant tests, don't send status or testReason (they don't have these)
      delete preparedData.status;
      delete preparedData.testReason;
      delete preparedData.testLocation;
    }
    delete preparedData.createdAt;
    delete preparedData.updatedAt;
    
    if (type === 'drug') {
      updateDrugTestMutation.mutate({ id: data.id, data: preparedData });
    } else if (type === 'alcohol') {
      updateAlcoholTestMutation.mutate({ id: data.id, data: preparedData });
    } else if (type === 'hydration') {
      updateHydrationTestMutation.mutate({ id: data.id, data: preparedData });
    } else {
      updateInstantTestMutation.mutate({ id: data.id, data: preparedData });
    }
  };

  // Calculate dashboard metrics across all testing types
  const todayDrugTests = drugTests.filter(test => test.scheduledDate === new Date().toISOString().split('T')[0]);
  const todayAlcoholTests = alcoholTests.filter(test => test.scheduledDate === new Date().toISOString().split('T')[0]);
  const todayHydrationTests = hydrationTests.filter(test => test.scheduledDate === new Date().toISOString().split('T')[0]);
  const totalTodayTests = todayDrugTests.length + todayAlcoholTests.length + todayHydrationTests.length;

  const pendingDrugTests = drugTests.filter(test => test.status === "scheduled" || test.status === "results_pending");
  const pendingAlcoholTests = alcoholTests.filter(test => test.status === "scheduled" || test.status === "results_pending");
  const pendingHydrationTests = hydrationTests.filter(test => test.status === "scheduled" || test.status === "results_pending");
  const totalPendingTests = pendingDrugTests.length + pendingAlcoholTests.length + pendingHydrationTests.length;

  const positiveDrugTests = drugTests.filter(test => test.testResult === "positive" || test.testResult === "non-negative");
  const positiveAlcoholTests = alcoholTests.filter(test => test.testResult === "positive" || test.testResult === "non-negative");
  const dehydratedTests = hydrationTests.filter(test => test.hydrationLevel && test.hydrationLevel !== "adequate");
  const instantLocationOptionMap = new Map<string, string>();
  careLocations.forEach((location: any) => {
    const label = `${location.locationName}${location.locationCode ? ` (${location.locationCode})` : ""}`;
    instantLocationOptionMap.set(location.id, label);
  });
  instantTests.forEach((test) => {
    if (test.locationId && !instantLocationOptionMap.has(test.locationId)) {
      instantLocationOptionMap.set(
        test.locationId,
        test.locationName || "Care Location"
      );
    }
  });
  const instantLocationOptions = Array.from(instantLocationOptionMap.entries()).map(([value, label]) => ({
    value,
    label,
  }));
  const hasUnassignedInstantTests = instantTests.some((test) => !test.locationId);
  const filteredInstantTests = instantTests.filter((test) => {
    const matchesType = instantTypeFilter.includes(test.testType);
    let matchesLocation = true;
    
    if (instantLocationFilter === "all") {
      matchesLocation = true;
    } else if (instantLocationFilter === "unassigned") {
      // Match tests with no locationId
      matchesLocation = !test.locationId || test.locationId === null || test.locationId === undefined || String(test.locationId).trim() === '';
    } else {
      // Match tests with specific locationId
      // Normalize both values for comparison
      const testLocationId = test.locationId ? String(test.locationId).trim() : '';
      const filterLocationId = instantLocationFilter ? String(instantLocationFilter).trim() : '';
      
      // Only match if both are non-empty and equal
      matchesLocation = testLocationId !== '' && filterLocationId !== '' && testLocationId === filterLocationId;
    }
    
    return matchesType && matchesLocation;
  });
  
  const activeEquipment = equipment.filter(eq => eq.status === "active");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "results_pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "negative": return "text-green-600 dark:text-green-400";
      case "positive": return "text-red-600 dark:text-red-400";
      case "awaiting_confirmation": return "text-yellow-600 dark:text-yellow-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "negative": return <CheckCircle className="h-4 w-4" />;
      case "positive": return <XCircle className="h-4 w-4" />;
      case "awaiting_confirmation": return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      {/* Header - Responsive */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">
            Drug, Alcohol & Hydration Testing
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 lg:mt-2">
            Comprehensive D&A&H testing with DrugCheck 3000 by Drager, breathalyzer technology, and hydration monitoring for workplace compliance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-row">
          <Button 
            onClick={() => navigate("/testing/new")} 
            data-testid="button-record-test-results"
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <TestTube className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Record Test Results</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/testing/schedule")} 
            data-testid="button-schedule-tests"
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Schedule Tests</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/testing#programs")} 
            data-testid="button-manage-programs"
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Programs</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-todays-tests">{totalTodayTests}</div>
            <p className="text-xs text-muted-foreground">
              {todayDrugTests.length} drug, {todayAlcoholTests.length} alcohol, {todayHydrationTests.length} hydration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Results</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-results">{totalPendingTests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-critical-results">
              {positiveDrugTests.length + positiveAlcoholTests.length + dehydratedTests.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Equipment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-equipment">{activeEquipment.length}</div>
            <p className="text-xs text-muted-foreground">
              {equipment.filter(eq => eq.status === "maintenance").length} in maintenance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="performed-tests" data-testid="tab-performed-tests" className="tab-trigger-custom text-xs sm:text-sm">
              Tests
            </TabsTrigger>
            <TabsTrigger value="scheduled-tests" data-testid="tab-scheduled-tests" className="tab-trigger-custom text-xs sm:text-sm">
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="programs" data-testid="tab-programs" className="tab-trigger-custom text-xs sm:text-sm">
              Programs
            </TabsTrigger>
            <TabsTrigger value="equipment" data-testid="tab-equipment" className="tab-trigger-custom text-xs sm:text-sm">
              Equipment
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Performed Tests Tab - Shows actual test results */}
        <TabsContent value="performed-tests" className="space-y-4">
          {/* Testing Type Selector */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4 overflow-x-auto">
            <Button
              variant={activeTestingType === "drug" ? "default" : "outline"}
              onClick={() => setActiveTestingType("drug")}
              data-testid="button-drug-tests-performed"
              className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm"
            >
              <FlaskConical className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Drug Tests ({drugTests.filter(t => t.status !== 'scheduled' && t.status !== 'cancelled' && t.status !== 'no_show').length})</span>
            </Button>
            <Button
              variant={activeTestingType === "alcohol" ? "default" : "outline"}
              onClick={() => setActiveTestingType("alcohol")}
              data-testid="button-alcohol-tests-performed"
              className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm"
            >
              <TestTube className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Alcohol Tests ({alcoholTests.filter(t => t.status !== 'scheduled' && t.status !== 'cancelled' && t.status !== 'no_show').length})</span>
            </Button>
            <Button
              variant={activeTestingType === "hydration" ? "default" : "outline"}
              onClick={() => setActiveTestingType("hydration")}
              data-testid="button-hydration-tests-performed"
              className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm"
            >
              <Droplets className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Hydration Tests ({hydrationTests.filter(t => t.status !== 'scheduled' && t.status !== 'cancelled' && t.status !== 'no_show').length})</span>
            </Button>
            <Button
              variant={activeTestingType === "instant" ? "default" : "outline"}
              onClick={() => setActiveTestingType("instant")}
              data-testid="button-instant-tests-performed"
              className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm"
            >
              <Activity className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Instant Tests ({instantTests.length})</span>
            </Button>
          </div>

          {/* Display completed tests with results */}
          {activeTestingType === "drug" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Drug Tests (DrugCheck 3000)</CardTitle>
                    <CardDescription>
                      Drug screening results with comprehensive substance detection data
                    </CardDescription>
                  </div>
                  {/* Status Filter */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={drugStatusFilter.length === 4 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDrugStatusFilter(['completed', 'collected', 'in_lab', 'results_pending'])}
                      className="text-xs font-semibold"
                    >
                      All
                    </Button>
                    {['completed', 'collected', 'in_lab', 'results_pending'].map((status) => (
                      <Button
                        key={status}
                        variant={drugStatusFilter.includes(status) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (drugStatusFilter.includes(status)) {
                            setDrugStatusFilter(drugStatusFilter.filter(s => s !== status));
                          } else {
                            setDrugStatusFilter([...drugStatusFilter, status]);
                          }
                        }}
                        className="text-xs"
                      >
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {drugTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : drugTests.filter(t => drugStatusFilter.includes(t.status)).length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No completed drug tests yet</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/new?type=drug")}>
                      Record First Drug Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test Type</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Result</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Details</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drugTests.filter(t => drugStatusFilter.includes(t.status)).slice(0, 10).map((test, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-completed-drug-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.collectionDate ? new Date(test.collectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs">
                                {test.specimenType ? (
                                  <span className="font-medium">{test.specimenType.charAt(0).toUpperCase() + test.specimenType.slice(1)}</span>
                                ) : '-'}
                                {' / '}
                                {test.testingDevice === 'drugcheck_3000' ? 'DrugCheck 3000' : test.testingDevice?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">
                          <Badge 
                                variant={test.testResult === "negative" ? "outline" : (test.testResult === "positive" || test.testResult === "non-negative") ? "destructive" : "secondary"}
                                className="flex items-center w-fit"
                          >
                            {test.testResult === "negative" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {(test.testResult === "positive" || test.testResult === "non-negative") && <XCircle className="h-3 w-3 mr-1" />}
                                {test.testResult?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                          </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {test.substancesDetected && Array.isArray(test.substancesDetected) && test.substancesDetected.length > 0 ? (
                                <span className="text-red-600 font-medium">{test.substancesDetected.length} substance(s) detected</span>
                              ) : test.testResult === 'negative' ? (
                                <span className="text-green-600">No substances detected</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('drug', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('drug', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                        </div>
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Similar structure for alcohol tests */}
          {activeTestingType === "alcohol" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Alcohol Tests</CardTitle>
                    <CardDescription>
                      Breathalyzer and blood alcohol content test results
                    </CardDescription>
                  </div>
                  {/* Status Filter */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={alcoholStatusFilter.length === 4 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAlcoholStatusFilter(['completed', 'collected', 'in_lab', 'results_pending'])}
                      className="text-xs font-semibold"
                    >
                      All
                    </Button>
                    {['completed', 'collected', 'in_lab', 'results_pending'].map((status) => (
                      <Button
                        key={status}
                        variant={alcoholStatusFilter.includes(status) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (alcoholStatusFilter.includes(status)) {
                            setAlcoholStatusFilter(alcoholStatusFilter.filter(s => s !== status));
                          } else {
                            setAlcoholStatusFilter([...alcoholStatusFilter, status]);
                          }
                        }}
                        className="text-xs"
                      >
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {alcoholTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : alcoholTests.filter(t => alcoholStatusFilter.includes(t.status)).length === 0 ? (
                  <div className="text-center py-8">
                    <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No completed alcohol tests yet</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/new?type=alcohol")}>
                      Record First Alcohol Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Device</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">BAC Level</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Result</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alcoholTests.filter(t => alcoholStatusFilter.includes(t.status)).slice(0, 10).map((test: AlcoholTest, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-completed-alcohol-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.collectionDate ? new Date(test.collectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3">
                              {test.testingDevice === 'breathalyzer' ? 'Breathalyzer' : test.testingDevice?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "font-medium",
                                test.alcoholLevel && parseFloat(test.alcoholLevel) > 0 ? "text-red-600" : "text-green-600"
                              )}>
                                {test.alcoholLevel ? `${test.alcoholLevel}%` : test.breathalyzerReading ? `${test.breathalyzerReading}%` : '0.00%'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                          <Badge 
                                variant={test.testResult === "negative" ? "outline" : (test.testResult === "positive" || test.testResult === "non-negative") ? "destructive" : "secondary"}
                                className="flex items-center w-fit"
                          >
                            {test.testResult === "negative" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {(test.testResult === "positive" || test.testResult === "non-negative") && <XCircle className="h-3 w-3 mr-1" />}
                                {test.testResult?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                          </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('alcohol', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('alcohol', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                        </div>
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hydration tests */}
          {activeTestingType === "hydration" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Hydration Tests</CardTitle>
                    <CardDescription>
                      Hydration assessments for underground and surface personnel
                    </CardDescription>
                  </div>
                  {/* Status Filter */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={hydrationStatusFilter.length === 3 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHydrationStatusFilter(['completed', 'collected', 'results_pending'])}
                      className="text-xs font-semibold"
                    >
                      All
                    </Button>
                    {['completed', 'collected', 'results_pending'].map((status) => (
                      <Button
                        key={status}
                        variant={hydrationStatusFilter.includes(status) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (hydrationStatusFilter.includes(status)) {
                            setHydrationStatusFilter(hydrationStatusFilter.filter(s => s !== status));
                          } else {
                            setHydrationStatusFilter([...hydrationStatusFilter, status]);
                          }
                        }}
                        className="text-xs"
                      >
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {hydrationTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : hydrationTests.filter(t => hydrationStatusFilter.includes(t.status)).length === 0 ? (
                  <div className="text-center py-8">
                    <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No completed hydration tests yet</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/new?type=hydration")}>
                      Record First Hydration Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Specific Gravity</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Hydration Level</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Action Required</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hydrationTests.filter(t => hydrationStatusFilter.includes(t.status)).slice(0, 10).map((test, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-completed-hydration-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.collectionDate ? new Date(test.collectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3 font-medium">
                              {(() => {
                                const value = test.urineSpecificGravity ?? test.specificGravity;
                                return value !== undefined && value !== null && !isNaN(Number(value)) 
                                  ? Number(value).toFixed(3) 
                                  : '-';
                              })()}
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">
                          <Badge 
                                variant={test.hydrationLevel === "adequate" ? "outline" : test.hydrationLevel === "severe_dehydration" ? "destructive" : "secondary"}
                                className={cn(
                                  "flex items-center w-fit",
                                  test.hydrationLevel === "adequate" ? "text-green-600" :
                                  test.hydrationLevel === "mild_dehydration" ? "text-yellow-600" :
                                  test.hydrationLevel === "moderate_dehydration" ? "text-orange-600" :
                                  "text-red-600"
                                )}
                              >
                                {test.hydrationLevel === "adequate" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {(test.hydrationLevel?.includes('dehydration')) && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {test.hydrationLevel?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                          </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {test.recommendedAction ? (
                                <span className={cn(
                                  "font-medium",
                                  test.recommendedAction === "continue_work" ? "text-green-600" :
                                  test.recommendedAction === "rest_hydrate" ? "text-yellow-600" :
                                  test.recommendedAction === "medical_evaluation" ? "text-orange-600" :
                                  "text-red-600"
                                )}>
                                  {test.recommendedAction?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('hydration', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('hydration', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                        </div>
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instant Tests (POC) */}
          {activeTestingType === "instant" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div>
                    <CardTitle>Instant Tests (POC)</CardTitle>
                    <CardDescription>
                      Point-of-Care instant tests: HB, Pregnancy, Malaria, Typhoid
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-4 lg:flex-row justify-between">
                    <div className="min-w-[220px]">
                      <p className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Care Location</p>
                      <Select value={instantLocationFilter} onValueChange={setInstantLocationFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {instantLocationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          {hasUnassignedInstantTests && (
                            <SelectItem value="unassigned">No Location Recorded</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Test Type</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={instantTypeFilter.length === ALL_INSTANT_TEST_TYPES.length ? "default" : "outline"}
                          onClick={() => setInstantTypeFilter(ALL_INSTANT_TEST_TYPES)}
                        >
                          Show All Types
                        </Button>
                        {INSTANT_TEST_TYPE_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            size="sm"
                            variant={instantTypeFilter.includes(option.value) ? "default" : "outline"}
                            onClick={() =>
                              setInstantTypeFilter((prev) =>
                                prev.includes(option.value)
                                  ? prev.filter((type) => type !== option.value)
                                  : [...prev, option.value]
                              )
                            }
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {instantTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : instantTests.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No instant tests recorded yet</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/new?type=instant")}>
                      Record First Instant Test
                    </Button>
                  </div>
                ) : filteredInstantTests.length === 0 ? (
                  <div className="text-center py-10 border rounded-md bg-gray-50 dark:bg-gray-900/40">
                    <p className="text-gray-500 dark:text-gray-400">No instant tests match the selected filters.</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test Type</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Care Location</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Result / HB Level</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Normal Range</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Tester</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInstantTests.slice(0, 20).map((test, index) => {
                          const isHBTest = test.testType === 'hb';
                          const hbValue = isHBTest && test.hbLevel ? parseFloat(test.hbLevel) : null;
                          const isLowHB = hbValue && hbValue < 12;
                          const isHighHB = hbValue && hbValue > 16;
                          
                          return (
                            <tr 
                              key={test.id} 
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                              data-testid={`row-instant-test-${test.id}`}
                            >
                              <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                              <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">
                                  {test.testType === 'hb' && 'Hemoglobin'}
                                  {test.testType === 'pregnancy' && 'Pregnancy'}
                                  {test.testType === 'malaria' && 'Malaria'}
                                  {test.testType === 'typhoid' && 'Typhoid'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {test.testDate ? new Date(test.testDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                {test.testTime && <span className="text-gray-500 text-xs ml-1">{test.testTime}</span>}
                              </td>
                              <td className="px-4 py-3">
                                {test.locationName ? (
                                  <div>
                                    <p className="font-medium text-sm">{test.locationName}</p>
                                    {test.locationCode && (
                                      <p className="text-xs text-muted-foreground">
                                        Code: {test.locationCode}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isHBTest ? (
                                  <span className={cn(
                                    "font-bold text-base",
                                    isLowHB ? "text-red-600" : isHighHB ? "text-orange-600" : "text-green-600"
                                  )}>
                                    {test.hbLevel || '-'} g/dL
                                  </span>
                                ) : (
                                  <Badge 
                                    variant={test.testResult === "negative" ? "outline" : test.testResult === "positive" ? "destructive" : "secondary"}
                                    className="flex items-center w-fit"
                                  >
                                    {test.testResult === "negative" && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {test.testResult === "positive" && <XCircle className="h-3 w-3 mr-1" />}
                                    {test.testResult === "invalid" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {test.testResult?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {isHBTest ? (
                                  <div className="space-y-0.5">
                                    <div>Male: 13.5-17.5 g/dL</div>
                                    <div>Female: 12.0-15.5 g/dL</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs">{test.testerName || '-'}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTest('instant', test);
                                    }}
                                    title="Edit Test"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTest('instant', test.id, test.testNumber);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete Test"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Tests Tab */}
        <TabsContent value="scheduled-tests" className="space-y-4">
          {/* Testing Type Selector */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTestingType === "drug" ? "default" : "outline"}
              onClick={() => setActiveTestingType("drug")}
              data-testid="button-drug-tests-scheduled"
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Scheduled Drug Tests ({drugTests.filter(t => t.status === 'scheduled').length})
            </Button>
            <Button
              variant={activeTestingType === "alcohol" ? "default" : "outline"}
              onClick={() => setActiveTestingType("alcohol")}
              data-testid="button-alcohol-tests-scheduled"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Scheduled Alcohol Tests ({alcoholTests.filter(t => t.status === 'scheduled').length})
            </Button>
            <Button
              variant={activeTestingType === "hydration" ? "default" : "outline"}
              onClick={() => setActiveTestingType("hydration")}
              data-testid="button-hydration-tests-scheduled"
            >
              <Droplets className="h-4 w-4 mr-2" />
              Scheduled Hydration Tests ({hydrationTests.filter(t => t.status === 'scheduled').length})
            </Button>
          </div>

          {/* Scheduled Drug Tests */}
          {activeTestingType === "drug" && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Drug Tests</CardTitle>
                <CardDescription>
                  Upcoming drug tests scheduled for completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {drugTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : drugTests.filter(t => t.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No scheduled drug tests</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/schedule")}>
                      Schedule Drug Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Scheduled Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test Type</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drugTests.filter(t => t.status === 'scheduled').slice(0, 10).map((test, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-scheduled-drug-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3">{test.scheduledTime || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs">
                                {test.specimenType ? (
                                  <span className="font-medium">{test.specimenType.charAt(0).toUpperCase() + test.specimenType.slice(1)}</span>
                                ) : '-'}
                                {' / '}
                                {test.testingDevice === 'drugcheck_3000' ? 'DrugCheck 3000' : test.testingDevice?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">
                          <Badge className={cn("text-xs", getStatusColor(test.status))}>
                                {test.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('drug', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('drug', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                        </div>
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scheduled Alcohol Tests */}
          {activeTestingType === "alcohol" && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Alcohol Tests</CardTitle>
                <CardDescription>
                  Upcoming breathalyzer tests scheduled for completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alcoholTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : alcoholTests.filter(t => t.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8">
                    <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No scheduled alcohol tests</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/schedule")}>
                      Schedule Alcohol Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Scheduled Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Device</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alcoholTests.filter(t => t.status === 'scheduled').slice(0, 10).map((test, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-scheduled-alcohol-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3">{test.scheduledTime || '-'}</td>
                            <td className="px-4 py-3">
                              {test.testingDevice === 'breathalyzer' ? 'Breathalyzer' : test.testingDevice?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">
                          <Badge className={cn("text-xs", getStatusColor(test.status))}>
                                {test.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('alcohol', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('alcohol', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Scheduled Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scheduled Hydration Tests */}
          {activeTestingType === "hydration" && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Hydration Tests</CardTitle>
                <CardDescription>
                  Upcoming hydration assessments for personnel safety monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hydrationTestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : hydrationTests.filter(t => t.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8">
                    <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No scheduled hydration tests</p>
                    <Button className="mt-4" onClick={() => navigate("/testing/schedule")}>
                      Schedule Hydration Test
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-[var(--uventorybiz-navy)] text-white">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Employee</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Scheduled Date</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test Type</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Location</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hydrationTests.filter(t => t.status === 'scheduled').slice(0, 10).map((test, index) => (
                          <tr 
                        key={test.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-scheduled-hydration-test-${test.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                            <td className="px-4 py-3 font-medium">{test.employeeName || test.employeeNumber || test.employeeId}</td>
                            <td className="px-4 py-3">{test.scheduledDate ? new Date(test.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                            <td className="px-4 py-3">{test.scheduledTime || '-'}</td>
                            <td className="px-4 py-3">
                              {test.testType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Urine Specific Gravity'}
                            </td>
                            <td className="px-4 py-3">{test.testReason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="px-4 py-3">{test.testLocation?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '-'}</td>
                            <td className="px-4 py-3">
                          <Badge className={cn("text-xs", getStatusColor(test.status))}>
                                {test.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTest('hydration', test);
                                  }}
                                  title="Edit Test"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTest('hydration', test.id, test.testNumber);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Test"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                        </div>
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Testing Programs</CardTitle>
              <CardDescription>
                    Manage drug, alcohol, and hydration testing protocols for different scenarios
              </CardDescription>
                </div>
                <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      resetProgramForm();
                      setEditingProgram(null);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Program
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProgram ? "Edit Testing Program" : "Create New Testing Program"}</DialogTitle>
                      <DialogDescription>
                        Configure a testing program for your organization's compliance requirements
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {/* Program Name */}
                      <div className="space-y-2">
                        <Label htmlFor="programName">Program Name *</Label>
                        <Input
                          id="programName"
                          placeholder="e.g., Pre-Employment Drug Screening"
                          value={programForm.programName}
                          onChange={(e) => setProgramForm(prev => ({ ...prev, programName: e.target.value }))}
                        />
                      </div>

                      {/* Program Type */}
                      <div className="space-y-2">
                        <Label htmlFor="programType">Program Type *</Label>
                        <Select value={programForm.programType} onValueChange={(value) => setProgramForm(prev => ({ ...prev, programType: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre_employment">Pre-Employment</SelectItem>
                            <SelectItem value="random">Random Testing</SelectItem>
                            <SelectItem value="post_incident">Post-Incident</SelectItem>
                            <SelectItem value="reasonable_suspicion">Reasonable Suspicion</SelectItem>
                            <SelectItem value="return_to_duty">Return to Duty</SelectItem>
                            <SelectItem value="follow_up">Follow-Up Testing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Testing Frequency */}
                      <div className="space-y-2">
                        <Label htmlFor="testingFrequency">Testing Frequency</Label>
                        <Select value={programForm.testingFrequency} onValueChange={(value) => setProgramForm(prev => ({ ...prev, testingFrequency: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                            <SelectItem value="as_needed">As Needed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pool Size */}
                      <div className="space-y-2">
                        <Label htmlFor="poolSize">Pool Size (for random testing)</Label>
                        <Input
                          id="poolSize"
                          type="number"
                          min="0"
                          value={programForm.poolSize}
                          onChange={(e) => setProgramForm(prev => ({ ...prev, poolSize: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      {/* Required Tests */}
                      <div className="space-y-2">
                        <Label>Required Tests *</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="test-drug"
                              checked={programForm.requiredTests.includes("drug")}
                              onChange={() => handleToggleRequiredTest("drug")}
                              className="rounded"
                            />
                            <label htmlFor="test-drug" className="text-sm">Drug Testing</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="test-alcohol"
                              checked={programForm.requiredTests.includes("alcohol")}
                              onChange={() => handleToggleRequiredTest("alcohol")}
                              className="rounded"
                            />
                            <label htmlFor="test-alcohol" className="text-sm">Alcohol Testing</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="test-hydration"
                              checked={programForm.requiredTests.includes("hydration")}
                              onChange={() => handleToggleRequiredTest("hydration")}
                              className="rounded"
                            />
                            <label htmlFor="test-hydration" className="text-sm">Hydration Testing</label>
                          </div>
                        </div>
                      </div>

                      {/* Departments */}
                      <div className="space-y-2">
                        <Label>Applicable Departments</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["extraction", "processing", "maintenance", "safety", "administration"].map((dept) => (
                            <div key={dept} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`dept-${dept}`}
                                checked={programForm.departments.includes(dept)}
                                onChange={() => handleToggleDepartment(dept)}
                                className="rounded"
                              />
                              <label htmlFor={`dept-${dept}`} className="text-sm capitalize">{dept}</label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Underground Personnel Focused */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="ugPersonnelFocused">Underground Personnel Focused</Label>
                          <p className="text-sm text-muted-foreground">Special focus on underground workers (hydration priority)</p>
                        </div>
                        <Switch
                          id="ugPersonnelFocused"
                          checked={programForm.ugPersonnelFocused}
                          onCheckedChange={(checked) => setProgramForm(prev => ({ ...prev, ugPersonnelFocused: checked }))}
                        />
                      </div>

                      {/* Active Status */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="active">Program Active</Label>
                          <p className="text-sm text-muted-foreground">Enable or disable this program</p>
                        </div>
                        <Switch
                          id="active"
                          checked={programForm.active}
                          onCheckedChange={(checked) => setProgramForm(prev => ({ ...prev, active: checked }))}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsProgramDialogOpen(false);
                        setEditingProgram(null);
                        resetProgramForm();
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitProgram}
                        disabled={!programForm.programName || programForm.requiredTests.length === 0}
                      >
                        {editingProgram ? "Update Program" : "Create Program"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {programsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : programs.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No testing programs configured yet</p>
                  <p className="text-sm text-gray-400 mb-4">Create your first testing program to start managing compliance testing</p>
                  <Button onClick={() => {
                    resetProgramForm();
                    setEditingProgram(null);
                    setIsProgramDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Program
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-[var(--uventorybiz-navy)] text-white">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Program Name</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Frequency</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Required Tests</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Departments</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Pool Size</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((program, index) => {
                        const requiredTestsArray = typeof program.requiredTests === 'string' 
                          ? JSON.parse(program.requiredTests) 
                          : (program.requiredTests || []);
                        const departmentsArray = typeof program.departments === 'string'
                          ? JSON.parse(program.departments)
                          : (program.departments || []);

                        return (
                          <tr 
                      key={program.id} 
                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`row-program-${program.id}`}
                          >
                            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">{program.programName}</td>
                            <td className="px-4 py-3">
                              {program.programType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="px-4 py-3 capitalize">{program.testingFrequency?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {requiredTestsArray.map((test: string) => (
                                  <Badge key={test} variant="outline" className="text-xs">
                                    {test === 'drug' && <FlaskConical className="h-3 w-3 mr-1" />}
                                    {test === 'alcohol' && <TestTube className="h-3 w-3 mr-1" />}
                                    {test === 'hydration' && <Droplets className="h-3 w-3 mr-1" />}
                                    {test.charAt(0).toUpperCase() + test.slice(1)}
                                  </Badge>
                                ))}
                        </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {departmentsArray.length > 0 
                                ? departmentsArray.slice(0, 2).map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") + 
                                  (departmentsArray.length > 2 ? ` +${departmentsArray.length - 2}` : "")
                                : "All"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {program.poolSize || 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={program.active}
                                  onCheckedChange={(checked) => toggleProgramStatusMutation.mutate({ id: program.id, active: checked })}
                                />
                                <Badge variant={program.active ? "default" : "secondary"} className="text-xs">
                        {program.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProgram(program);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProgram(program.id, program.programName);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing Equipment</CardTitle>
              <CardDescription>
                DrugCheck 3000, breathalyzers, and other testing devices status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipmentLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {equipment.map((eq) => {
                    const deviceType = eq.deviceType || eq.equipmentType;
                    const deviceName = eq.deviceName || eq.equipmentName;
                    
                    return (
                    <div 
                      key={eq.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      data-testid={`card-equipment-${eq.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            {deviceType === "drugcheck_3000" ? (
                            <FlaskConical className="h-8 w-8 text-blue-500" />
                            ) : deviceType === "breathalyzer" ? (
                            <TestTube className="h-8 w-8 text-purple-500" />
                          ) : (
                            <Activity className="h-8 w-8 text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold" data-testid={`text-equipment-name-${eq.id}`}>
                              {deviceName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                              {deviceType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'} • S/N: {eq.serialNumber}
                          </div>
                          {eq.nextCalibrationDate && (
                            <div className="text-xs text-gray-500">
                              Next calibration: {eq.nextCalibrationDate}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={eq.status === "active" ? "default" : "secondary"}
                        className={cn(
                          eq.status === "active" ? "bg-green-100 text-green-800" :
                          eq.status === "maintenance" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        )}
                      >
                          {eq.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                      </Badge>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Universal Test Edit Dialog */}
      <Dialog open={isEditTestDialogOpen} onOpenChange={setIsEditTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingTest?.type === 'drug' ? 'Drug' : editingTest?.type === 'alcohol' ? 'Alcohol' : editingTest?.type === 'hydration' ? 'Hydration' : 'Instant'} Test
            </DialogTitle>
            <DialogDescription>
              Update test information and {editingTest?.type === 'instant' ? 'results' : 'status'}
            </DialogDescription>
          </DialogHeader>

          {editingTest && (
            <div className="space-y-4 py-4">
              {/* Test Number (Read-only) */}
              <div className="space-y-2">
                <Label>Test ID</Label>
                <Input value={testEditForm.testNumber || ''} disabled className="bg-gray-50" />
              </div>

              {/* Employee (Read-only for now) */}
              <div className="space-y-2">
                <Label>Employee</Label>
                <Input value={testEditForm.employeeName || testEditForm.employeeNumber || testEditForm.employeeId || ''} disabled className="bg-gray-50" />
              </div>

              {/* Conditional Date Fields - Instant tests always use testDate/testTime */}
              {editingTest.type === 'instant' ? (
                <>
                  {/* Instant Test Date */}
                  <div className="space-y-2">
                    <Label htmlFor="testDate">Test Date</Label>
                    <Input
                      id="testDate"
                      type="date"
                      value={testEditForm.testDate || ''}
                      onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, testDate: e.target.value }))}
                    />
                  </div>

                  {/* Instant Test Time */}
                  <div className="space-y-2">
                    <Label htmlFor="testTime">Test Time</Label>
                    <Input
                      id="testTime"
                      type="time"
                      value={testEditForm.testTime || ''}
                      onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, testTime: e.target.value }))}
                    />
                  </div>
                </>
              ) : testEditForm.status === 'scheduled' || !testEditForm.status ? (
                <>
                  {/* Scheduled Date */}
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Scheduled Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={testEditForm.scheduledDate || ''}
                      onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, scheduledDate: e.target.value }))}
                    />
                  </div>

                  {/* Scheduled Time */}
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Scheduled Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={testEditForm.scheduledTime || ''}
                      onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, scheduledTime: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Actual Test Date (for completed tests) */}
                  <div className="space-y-2">
                    <Label htmlFor="testDate">
                      {editingTest.type === 'drug' ? 'Collection Date' : 'Test Date'}
                    </Label>
                    <Input
                      id="testDate"
                      type="date"
                      value={
                        editingTest.type === 'drug' 
                          ? (testEditForm.collectionDate || '') 
                          : (testEditForm.testDate || '')
                      }
                      onChange={(e) => {
                        const field = editingTest.type === 'drug' ? 'collectionDate' : 'testDate';
                        setTestEditForm((prev: any) => ({ ...prev, [field]: e.target.value }));
                      }}
                    />
                  </div>

                  {/* Actual Test Time */}
                  <div className="space-y-2">
                    <Label htmlFor="testTime">
                      {editingTest.type === 'drug' ? 'Collection Time' : 'Test Time'}
                    </Label>
                    <Input
                      id="testTime"
                      type="time"
                      value={
                        editingTest.type === 'drug' 
                          ? (testEditForm.collectionTime || '') 
                          : (testEditForm.testTime || '')
                      }
                      onChange={(e) => {
                        const field = editingTest.type === 'drug' ? 'collectionTime' : 'testTime';
                        setTestEditForm((prev: any) => ({ ...prev, [field]: e.target.value }));
                      }}
                    />
                  </div>
                </>
              )}

              {/* Drug Test Specific Fields */}
              {editingTest.type === 'drug' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="specimenType">Specimen Type</Label>
                    <Select 
                      value={testEditForm.specimenType || 'urine'} 
                      onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, specimenType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specimen type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urine">Urine</SelectItem>
                        <SelectItem value="saliva">Saliva</SelectItem>
                        <SelectItem value="blood">Blood</SelectItem>
                        <SelectItem value="hair">Hair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testingDevice">Testing Device</Label>
                    <Select 
                      value={testEditForm.testingDevice || 'drugcheck_3000'} 
                      onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, testingDevice: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drugcheck_3000">DrugCheck 3000</SelectItem>
                        <SelectItem value="comprehensive_lab">Comprehensive Lab</SelectItem>
                        <SelectItem value="field_test">Field Test</SelectItem>
                        <SelectItem value="instant_test">Instant Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drug Test Results - Show when completing a test */}
                  {testEditForm.status && (testEditForm.status === 'completed' || testEditForm.status === 'results_pending' || testEditForm.status === 'in_lab' || testEditForm.status === 'collected') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="drugResult">Overall Test Result</Label>
                        <Select 
                          value={testEditForm.drugResult || testEditForm.testResult || 'pending'} 
                          onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, drugResult: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="non-negative">Non-Negative</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="dilute">Dilute</SelectItem>
                            <SelectItem value="invalid">Invalid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inconclusive">Inconclusive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Individual Drug Panel Results */}
                      <div className="border-t pt-4 mt-4">
                        <Label className="text-sm font-semibold mb-3 block">Individual Drug Panel Results</Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="cocResult" className="text-xs">Cocaine (COC)</Label>
                            <Select 
                              value={testEditForm.cocResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, cocResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="opiResult" className="text-xs">Opioids (OPI)</Label>
                            <Select 
                              value={testEditForm.opiResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, opiResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="thcResult" className="text-xs">Cannabis (THC)</Label>
                            <Select 
                              value={testEditForm.thcResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, thcResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ampResult" className="text-xs">Amphetamines (AMP)</Label>
                            <Select 
                              value={testEditForm.ampResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, ampResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="metResult" className="text-xs">Methamphetamines (MET)</Label>
                            <Select 
                              value={testEditForm.metResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, metResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bzoResult" className="text-xs">Benzodiazepines (BZO)</Label>
                            <Select 
                              value={testEditForm.bzoResult || 'negative'} 
                              onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, bzoResult: value }))}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="negative">Negative</SelectItem>
                                <SelectItem value="non-negative">Non-Negative</SelectItem>
                                <SelectItem value="positive">Positive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                                <SelectItem value="invalid">Invalid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Alcohol Test Specific Fields */}
              {editingTest.type === 'alcohol' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="testingDevice">Testing Device</Label>
                    <Select 
                      value={testEditForm.testingDevice || 'breathalyzer'} 
                      onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, testingDevice: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breathalyzer">Breathalyzer</SelectItem>
                        <SelectItem value="comprehensive_lab">Comprehensive Lab</SelectItem>
                        <SelectItem value="field_test">Field Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alcohol Test Results - Show when completing a test */}
                  {testEditForm.status && (testEditForm.status === 'completed' || testEditForm.status === 'results_pending' || testEditForm.status === 'in_lab' || testEditForm.status === 'collected') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="alcoholResult">Test Result</Label>
                        <Select 
                          value={testEditForm.alcoholResult || testEditForm.testResult || 'pending'} 
                          onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, alcoholResult: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="invalid">Invalid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inconclusive">Inconclusive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="alcoholLevel">Alcohol Level (BAC %)</Label>
                        <Input
                          id="alcoholLevel"
                          type="number"
                          step="0.001"
                          min="0"
                          max="1"
                          placeholder="e.g., 0.02"
                          value={testEditForm.alcoholLevel !== undefined && testEditForm.alcoholLevel !== null ? testEditForm.alcoholLevel : ''}
                          onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, alcoholLevel: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="breathalyzerReading">Breathalyzer Reading (mg/L)</Label>
                        <Input
                          id="breathalyzerReading"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g., 0.10"
                          value={testEditForm.breathalyzerReading !== undefined && testEditForm.breathalyzerReading !== null ? testEditForm.breathalyzerReading : ''}
                          onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, breathalyzerReading: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Hydration Test Specific Fields */}
              {editingTest.type === 'hydration' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="testLocation">Test Location</Label>
                    <Select 
                      value={testEditForm.testLocation || 'underground'} 
                      onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, testLocation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="underground">Underground</SelectItem>
                        <SelectItem value="surface">Surface</SelectItem>
                        <SelectItem value="medical_station">Medical Station</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hydration Test Results - Show when completing a test */}
                  {testEditForm.status && (testEditForm.status === 'completed' || testEditForm.status === 'results_pending') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="hydrationLevel">Hydration Level</Label>
                        <Select 
                          value={testEditForm.hydrationLevel || 'adequate'} 
                          onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, hydrationLevel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select hydration level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adequate">Adequate</SelectItem>
                            <SelectItem value="mild_dehydration">Mild Dehydration</SelectItem>
                            <SelectItem value="moderate_dehydration">Moderate Dehydration</SelectItem>
                            <SelectItem value="severe_dehydration">Severe Dehydration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="urineSpecificGravity">Urine Specific Gravity</Label>
                        <Input
                          id="urineSpecificGravity"
                          type="number"
                          step="0.001"
                          min="1.000"
                          max="1.040"
                          placeholder="e.g., 1.020"
                          value={(() => {
                            const value = testEditForm.urineSpecificGravity ?? testEditForm.specificGravity;
                            return value !== undefined && value !== null ? value : '';
                          })()}
                          onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, urineSpecificGravity: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recommendedAction">Recommended Action</Label>
                        <Select 
                          value={testEditForm.recommendedAction || 'continue_work'} 
                          onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, recommendedAction: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="continue_work">Continue Work</SelectItem>
                            <SelectItem value="rest_hydrate">Rest & Hydrate</SelectItem>
                            <SelectItem value="medical_evaluation">Medical Evaluation</SelectItem>
                            <SelectItem value="immediate_treatment">Immediate Treatment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Instant Test Specific Fields */}
              {editingTest.type === 'instant' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="testType">Test Type (Read-only)</Label>
                    <Input 
                      id="testType"
                      value={testEditForm.testType === 'hb' ? 'Hemoglobin' : testEditForm.testType === 'pregnancy' ? 'Pregnancy' : testEditForm.testType === 'malaria' ? 'Malaria' : 'Typhoid'}
                      disabled 
                      className="bg-gray-50 capitalize" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locationId">Care Location</Label>
                    <Select 
                      value={testEditForm.locationId || ''} 
                      onValueChange={(value) => {
                        const selectedLocation = careLocations.find((location: any) => location.id === value);
                        setTestEditForm((prev: any) => ({
                          ...prev,
                          locationId: value,
                          locationName: selectedLocation?.locationName || prev.locationName,
                          locationCode: selectedLocation?.locationCode || prev.locationCode,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select care location" />
                      </SelectTrigger>
                      <SelectContent>
                        {careLocations.map((location: any) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.locationName} ({location.locationCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Adjust if the instant test was performed in another care location.</p>
                  </div>

                  {/* HB Test Result */}
                  {testEditForm.testType === 'hb' && (
                    <div className="space-y-2">
                      <Label htmlFor="hbLevel">Hemoglobin Level (g/dL)</Label>
                      <Input
                        id="hbLevel"
                        type="number"
                        step="0.1"
                        min="0"
                        max="25"
                        placeholder="e.g., 14.5"
                        value={testEditForm.hbLevel || ''}
                        onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, hbLevel: e.target.value }))}
                      />
                      <p className="text-xs text-gray-500">
                        Normal ranges: Male 13.5-17.5 g/dL, Female 12.0-15.5 g/dL
                      </p>
                    </div>
                  )}

                  {/* Other Test Results */}
                  {testEditForm.testType !== 'hb' && (
                    <div className="space-y-2">
                      <Label htmlFor="testResult">Test Result</Label>
                      <Select 
                        value={testEditForm.testResult || 'negative'} 
                        onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, testResult: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="negative">Negative</SelectItem>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="invalid">Invalid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Test Reason - Not for instant tests */}
              {editingTest.type !== 'instant' && (
                <div className="space-y-2">
                  <Label htmlFor="testReason">Test Reason</Label>
                  <Select 
                    value={testEditForm.testReason || 'random'} 
                    onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, testReason: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_employment">Pre-Employment</SelectItem>
                      <SelectItem value="random">Random Testing</SelectItem>
                      <SelectItem value="post_incident">Post-Incident</SelectItem>
                      <SelectItem value="reasonable_suspicion">Reasonable Suspicion</SelectItem>
                      <SelectItem value="return_to_duty">Return to Duty</SelectItem>
                      <SelectItem value="follow_up">Follow-Up Testing</SelectItem>
                      <SelectItem value="routine_screening">Routine Screening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status - Not for instant tests */}
              {editingTest.type !== 'instant' && (
                <div className="space-y-2">
                  <Label htmlFor="status">Test Status</Label>
                  <Select 
                    value={testEditForm.status || 'scheduled'} 
                    onValueChange={(value) => setTestEditForm((prev: any) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="in_lab">In Lab</SelectItem>
                      <SelectItem value="results_pending">Results Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                  {testEditForm.status === 'scheduled' && editingTest?.type && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                      💡 Change status to "Collected", "Results Pending", or "Completed" to enter test results
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={testEditForm.notes || ''}
                  onChange={(e) => setTestEditForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditTestDialogOpen(false);
              setEditingTest(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTestEdit}>
              Update Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}