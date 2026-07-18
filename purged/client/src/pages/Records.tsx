import { useState, useEffect } from "react";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient, Appointment } from "@shared/schema";
import { formatGlucoseDisplay } from "@shared/glucose";

import MobileNav from "@/components/MobileNav";
import NewPatientModal from "@/components/modals/NewPatientModal";
import MedicalVisitDetailsModal from "@/components/modals/MedicalVisitDetailsModal";
import { EditEncounterModal } from "@/components/modals/EditEncounterModal";
import { DischargeEncounterModal } from "@/components/modals/DischargeEncounterModal";
import VisitDispensedItemsModal from "@/components/modals/VisitDispensedItemsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  FileText, 
  Plus, 
  Eye, 
  Calendar, 
  Clock, 
  User, 
  Trash2, 
  Edit, 
  MoreVertical, 
  CheckCircle, 
  XCircle,
  X,
  Users,
  History,
  Filter,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Activity,
  Hospital,
  LayoutGrid,
  List,
  Package,
  ChevronDown,
  LogOut,
  PhoneOff,
} from "lucide-react";
import { formatVisitType, formatWorkDisposition, formatRole, formatDepartment, formatStatus, formatEncounterStatus } from "@/lib/formatters";
import { isEncounterWritable, ENCOUNTER_TYPES } from "@shared/encounterPathways";
import { buildMedicalVisitsQuery, parseMedicalVisitsListResponse } from "@/lib/encounter/medicalVisitsList";
import { buildAssignmentHistoryQuery, parseAssignmentHistoryResponse } from "@/lib/duty/assignmentHistoryList";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import {
  canEndTelecareSessionFromEncounter,
  completeTelecareSessionById,
} from "@/lib/telecare/completeSession";

const VISIT_PAGE_SIZE = 25;
const ASSIGNMENT_PAGE_SIZE = 25;

export default function Records() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicalVisit, setSelectedMedicalVisit] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dischargingVisit, setDischargingVisit] = useState<any>(null);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dispensedItemsVisit, setDispensedItemsVisit] = useState<any>(null);
  const [endSessionVisit, setEndSessionVisit] = useState<any>(null);
  const [endSessionConfirmOpen, setEndSessionConfirmOpen] = useState(false);
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("encounters");

  // Assignment History filters
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const assignmentLocationDefaultSet = React.useRef(false);
  
  // Appointment filters
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("all");
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState("");
  
  // Medical visit filters
  const [visitStatusFilter, setVisitStatusFilter] = useState("all");
  const [visitTypeFilter, setVisitTypeFilter] = useState("all");
  const [visitLocationFilter, setVisitLocationFilter] = useState("all");
  const [visitCompanyFilter, setVisitCompanyFilter] = useState("all");
  const [visitSearchTerm, setVisitSearchTerm] = useState("");
  const [visitPage, setVisitPage] = useState(1);
  
  // View modes for each tab
  const [medicalVisitsViewMode, setMedicalVisitsViewMode] = useState<'cards' | 'table'>('table');
  const [patientsViewMode, setPatientsViewMode] = useState<'cards' | 'table'>('table');
  const [appointmentsViewMode, setAppointmentsViewMode] = useState<'cards' | 'table'>('table');
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'cards' | 'table'>('table');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMultiLocation, activeLocation } = useActiveLocation();

  // Fetch care locations for filtering (assignments + visit location when multi-location)
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: true,
  });

  // Default assignment location filter to logged-in user's location (once)
  React.useEffect(() => {
    if (assignmentLocationDefaultSet.current || !activeLocation?.id) return;
    setLocationFilter(activeLocation.id);
    assignmentLocationDefaultSet.current = true;
  }, [activeLocation?.id]);

  // Fetch patients data
  const { data: patients = [], isLoading: patientsLoading, isError: patientsError, error: patientsErrorObj } = useQuery<Patient[]>({
    queryKey: searchQuery ? ["/api/patients", { search: searchQuery }] : ["/api/patients"],
    queryFn: async () => {
      try {
        const url = searchQuery ? `/api/patients?search=${encodeURIComponent(searchQuery)}` : '/api/patients';
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch patients' }));
          throw new Error(errorData.message || `Failed to fetch patients: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch patients';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error; // Re-throw to let React Query handle it
      }
    },
    retry: false,
  });

  // Show error toast for patients
  useEffect(() => {
    if (patientsError && patientsErrorObj) {
      const errorMessage = patientsErrorObj instanceof Error ? patientsErrorObj.message : 'Failed to fetch patients';
      toast({
        title: "Error Loading Patients",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [patientsError, patientsErrorObj, toast]);

  // Fetch medical visits data (server-paginated)
  const visitListQueryKey = {
    page: visitPage,
    pageSize: VISIT_PAGE_SIZE,
    search: visitSearchTerm,
    statusGroup: visitStatusFilter,
    visitType: visitTypeFilter,
    locationId: visitLocationFilter,
    companyName: visitCompanyFilter,
  };

  const { data: visitsListData, isLoading: visitsLoading, isError: visitsError, error: visitsErrorObj } = useQuery({
    queryKey: ["/api/medical-visits", visitListQueryKey],
    queryFn: async () => {
      try {
        const qs = buildMedicalVisitsQuery(visitListQueryKey);
        const response = await fetch(`/api/medical-visits${qs}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch medical visits' }));
          throw new Error(errorData.message || `Failed to fetch medical visits: ${response.status}`);
        }
        const data = await response.json();
        return parseMedicalVisitsListResponse(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch medical visits';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: false,
  });

  useEffect(() => {
    setVisitPage(1);
  }, [visitSearchTerm, visitStatusFilter, visitTypeFilter, visitLocationFilter, visitCompanyFilter]);

  // Show error toast for medical visits
  useEffect(() => {
    if (visitsError && visitsErrorObj) {
      const errorMessage = visitsErrorObj instanceof Error ? visitsErrorObj.message : 'Failed to fetch medical visits';
      toast({
        title: "Error Loading Encounters",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [visitsError, visitsErrorObj, toast]);

  // Fetch appointments data
  const { data: appointments = [], isLoading: appointmentsLoading, isError: appointmentsError, error: appointmentsErrorObj } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/appointments');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch appointments' }));
          throw new Error(errorData.message || `Failed to fetch appointments: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch appointments';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: false,
  });

  // Show error toast for appointments
  useEffect(() => {
    if (appointmentsError && appointmentsErrorObj) {
      const errorMessage = appointmentsErrorObj instanceof Error ? appointmentsErrorObj.message : 'Failed to fetch appointments';
      toast({
        title: "Error Loading Appointments",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [appointmentsError, appointmentsErrorObj, toast]);

  // Fetch assignment history (server-paginated)
  const assignmentListQueryKey = {
    page: assignmentPage,
    pageSize: ASSIGNMENT_PAGE_SIZE,
    date: dateFilter,
    status: statusFilter,
    userId: userFilter,
    locationId: locationFilter,
    search: searchFilter,
  };

  const { data: assignmentsListData, isLoading: assignmentsLoading, isError: assignmentsError, error: assignmentsErrorObj } = useQuery({
    queryKey: ['/api/duty-assignments/history', assignmentListQueryKey],
    queryFn: async () => {
      try {
        const qs = buildAssignmentHistoryQuery(assignmentListQueryKey);
        const res = await fetch(`/api/duty-assignments/history${qs}`);
        if (!res.ok) {
          console.warn('Failed to fetch assignment history:', res.status);
          return parseAssignmentHistoryResponse([]);
        }
        return parseAssignmentHistoryResponse(await res.json());
      } catch (error) {
        console.warn('Error fetching assignments:', error);
        return parseAssignmentHistoryResponse([]);
      }
    },
    retry: false,
  });

  useEffect(() => {
    setAssignmentPage(1);
  }, [dateFilter, statusFilter, userFilter, locationFilter, searchFilter]);

  // Show error toast for assignments
  useEffect(() => {
    if (assignmentsError && assignmentsErrorObj) {
      const errorMessage = assignmentsErrorObj instanceof Error ? assignmentsErrorObj.message : 'Failed to fetch assignment history';
      toast({
        title: "Error Loading Assignment History",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [assignmentsError, assignmentsErrorObj, toast]);

  // Triage & vitals for Records tab
  const { data: triageRecords = [] } = useQuery({
    queryKey: ['/api/triage'],
    retry: false,
  });
  const { data: vitalsRecords = [] } = useQuery({
    queryKey: ['/api/vital-signs'],
    retry: false,
  });

  // Fetch analytics for assignment history
  const { data: analytics } = useQuery({
    queryKey: ['/api/duty-assignments/analytics', dateFilter, locationFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (locationFilter && locationFilter !== 'all') params.append('locationId', locationFilter);
      
      return fetch(`/api/duty-assignments/analytics?${params.toString()}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
      });
    },
  });

  // Fetch users for filter dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch users' }));
          throw new Error(errorData.message || `Failed to fetch users: ${res.status}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        // Don't show toast for users - it's just for a filter dropdown
        // Silent failure is acceptable here
        console.warn('Error fetching users:', error);
        return [];
      }
    },
    retry: false,
  });

  const handleViewDetails = (visit: any) => {
    setSelectedMedicalVisit(visit);
    setDetailsModalOpen(true);
  };

  const handleEditVisit = (visit: any) => {
    setEditingVisit(visit);
    setEditModalOpen(true);
  };

  const handleDischargeVisit = (visit: any) => {
    setDischargingVisit(visit);
    setDischargeModalOpen(true);
  };

  const endTelecareSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await completeTelecareSessionById(sessionId);
    },
    onSuccess: () => {
      setEndSessionConfirmOpen(false);
      setEndSessionVisit(null);
      void queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/telecare/queue"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Video session ended",
        description: "The telehealth visit was marked complete.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not end session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRequestEndTelecareSession = (visit: any) => {
    setEndSessionVisit(visit);
    setEndSessionConfirmOpen(true);
  };

  // Delete medical visit mutation
  const deleteMedicalVisitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const response = await apiRequest("DELETE", `/api/medical-visits/${visitId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      setDeleteConfirmOpen(false);
      setVisitToDelete(null);
      toast({
        title: "Success",
        description: "Medical visit deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete medical visit: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update appointment status mutation  
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });



  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'cleared': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'restricted': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEncounterStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'arrived':
      case 'triaged':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'finished':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'planned':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'entered_in_error':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return getStatusColor(status);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    overdue: "bg-orange-100 text-orange-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const safePatientsArray = Array.isArray(patients) ? patients : [];
  const filteredPatients = safePatientsArray.filter((patientData: any) => {
    if (!patientData) return false;
    if (!searchQuery) return true;
    const { patient, employee } = patientData;
    if (!patient && !employee) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      employee?.firstName?.toLowerCase().includes(searchLower) ||
      employee?.lastName?.toLowerCase().includes(searchLower) ||
      employee?.employeeNumber?.toLowerCase().includes(searchLower) ||
      patient?.id?.toLowerCase().includes(searchLower)
    );
  });
  const safeFilteredPatients = Array.isArray(filteredPatients) ? filteredPatients : [];

  const safeFilteredMedicalVisits = visitsListData?.rows ?? [];
  const visitTotalCount = visitsListData?.totalCount ?? 0;
  const visitTotalPages = Math.max(1, Math.ceil(visitTotalCount / VISIT_PAGE_SIZE));

  // Filter appointments
  const filteredAppointments = (Array.isArray(appointments) ? appointments : []).filter((appointment: any) => {
    if (!appointment) return false;
    const matchesSearch = !appointmentSearchTerm || 
      appointment.patient?.employee?.firstName?.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.patient?.employee?.lastName?.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.patient?.employee?.employeeNumber?.toLowerCase().includes(appointmentSearchTerm.toLowerCase());
    
    const matchesStatus = appointmentStatusFilter === 'all' || appointment.status === appointmentStatusFilter;
    const matchesType = appointmentTypeFilter === 'all' || appointment.appointmentType === appointmentTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const safeFilteredAppointments = Array.isArray(filteredAppointments) ? filteredAppointments : [];

  const safeFilteredAssignments = assignmentsListData?.rows ?? [];
  const assignmentTotalCount = assignmentsListData?.totalCount ?? 0;
  const assignmentTotalPages = Math.max(1, Math.ceil(assignmentTotalCount / ASSIGNMENT_PAGE_SIZE));

  // Distinct companies for encounter filters (from patients list)
  const visitCompanyOptions = Array.from(
    new Set(
      safePatientsArray
        .map((p: any) => p?.company?.name as string | undefined)
        .filter((name): name is string => !!name),
    ),
  ).sort();

  // Group assignments by date (current page)
  const groupedAssignments = (safeFilteredAssignments as any[]).reduce((acc: Record<string, any[]>, assignment: any) => {
    if (!assignment || !assignment.assignmentDate) return acc;
    const date = format(parseISO(String(assignment.assignmentDate)), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, any[]>);

  // Patient id -> display name for Triage & Vitals tab
  const patientIdToName: Record<string, string> = {};
  (safePatientsArray || []).forEach((p: any) => {
    const id = p?.patient?.id;
    if (id) patientIdToName[id] = [p?.employee?.firstName, p?.employee?.lastName].filter(Boolean).join(' ') || 'Patient';
  });

  // Listen for sidebar tab navigation
  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail.tabValue);
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    
    // Check URL hash on mount
    const hash = window.location.hash.replace('#', '');
    if (hash && ['encounters', 'medical-visits', 'patients', 'appointments', 'assignments', 'triage-vitals'].includes(hash)) {
      setActiveTab(hash === 'medical-visits' ? 'encounters' : hash);
    }

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    };
  }, []);

  // Show error messages if any queries failed
  const hasErrors = patientsError || visitsError || appointmentsError || assignmentsError;
  const errorMessages: string[] = [];
  if (patientsErrorObj) errorMessages.push(`Patients: ${patientsErrorObj instanceof Error ? patientsErrorObj.message : 'Failed to load'}`);
  if (visitsErrorObj) errorMessages.push(`Encounters: ${visitsErrorObj instanceof Error ? visitsErrorObj.message : 'Failed to load'}`);
  if (appointmentsErrorObj) errorMessages.push(`Appointments: ${appointmentsErrorObj instanceof Error ? appointmentsErrorObj.message : 'Failed to load'}`);
  if (assignmentsErrorObj) errorMessages.push(`Assignments: ${assignmentsErrorObj instanceof Error ? assignmentsErrorObj.message : 'Failed to load'}`);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Records Management</h2>
            <p className="text-mineaid-gray mt-1">Comprehensive view of all medical and operational records</p>
          </div>
        </div>

        {/* Error Messages */}
        {hasErrors && errorMessages.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {errorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Custom Styled Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="tabs-list-custom mb-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-transparent h-auto p-1 gap-1 lg:gap-2">
              <TabsTrigger 
                value="encounters" 
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                Encounters
              </TabsTrigger>
              <TabsTrigger 
                value="patients" 
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <Users className="h-4 w-4 mr-1 sm:mr-2" />
                Patients
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Appointment</span> History
              </TabsTrigger>
              <TabsTrigger 
                value="assignments" 
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <History className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Assignment</span> History
              </TabsTrigger>
              <TabsTrigger 
                value="triage-vitals" 
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <Activity className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Triage &</span> Vitals
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Encounters Tab */}
          <TabsContent value="encounters" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Encounters</h3>
              <Link href="/encounter">
                <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90 mt-4 sm:mt-0">
                  <Plus className="h-4 w-4 mr-2" />
                  New Encounter
                </Button>
              </Link>
            </div>

            {/* Encounter Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filter Encounters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by patient name..."
                      value={visitSearchTerm}
                      onChange={(e) => setVisitSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={visitStatusFilter} onValueChange={setVisitStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="discharged">Discharged</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ENCOUNTER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatVisitType(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={visitCompanyFilter} onValueChange={setVisitCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {visitCompanyOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {isMultiLocation && careLocations.length > 0 && (
                    <Select value={visitLocationFilter} onValueChange={setVisitLocationFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {careLocations.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <div className="flex items-center gap-2">
                              <Hospital className="h-3 w-3" />
                              <span>{loc.locationCode}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setVisitStatusFilter("all");
                        setVisitTypeFilter("all");
                        setVisitLocationFilter("all");
                        setVisitCompanyFilter("all");
                        setVisitSearchTerm("");
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                    
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant={medicalVisitsViewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMedicalVisitsViewMode('cards')}
                        className="rounded-r-none"
                        title="Card view"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={medicalVisitsViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMedicalVisitsViewMode('table')}
                        className="rounded-l-none"
                        title="Table view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                {visitsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600">Error loading encounters. Please try again.</p>
                  </div>
                ) : visitsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 w-24 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : safeFilteredMedicalVisits.length > 0 ? (
                  medicalVisitsViewMode === 'cards' ? (
                    <div className="space-y-4">
                      {safeFilteredMedicalVisits.map((visit: any) => {
                        if (!visit || !visit.id) return null;
                        return (
                      <div key={visit.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0 card-hover-accent">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-mineaid-navy rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            <User className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {visit.patient?.employee?.firstName || 'Unknown'} {visit.patient?.employee?.lastName || 'Patient'}
                            </p>
                            <p className="text-sm text-mineaid-gray truncate">
                              Encounter: {visit.visitType ? formatVisitType(visit.visitType) : 'N/A'}
                            </p>
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-mineaid-gray">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{visit.visitDate ? format(new Date(visit.visitDate), 'MMM dd, yyyy') : 'N/A'}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{visit.visitDate ? format(new Date(visit.visitDate), 'HH:mm') : 'N/A'}</span>
                              </span>
                              {visit.location && (
                                <span className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3 text-primary" />
                                  <span className="text-primary font-medium">{(visit.location as any)?.locationCode || (visit.location as any)?.code || visit.location?.id || 'N/A'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                          {visit.location && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {(visit.location as any)?.locationName || (visit.location as any)?.name || 'Unknown Location'}
                            </Badge>
                          )}
                          <Badge className={getEncounterStatusColor(visit.status || '')} variant="outline">
                            {formatEncounterStatus(visit.status)}
                          </Badge>
                          <Badge 
                            variant={visit.disposition === 'return_to_work' ? 'secondary' : 
                                   visit.disposition === 'off_duty' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {visit.disposition ? formatWorkDisposition(visit.disposition) : 'N/A'}
                          </Badge>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDetails(visit)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View details"
                              data-testid={`view-visit-${visit.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" data-testid={`dropdown-visit-${visit.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditVisit(visit)}
                                  data-testid={`edit-visit-${visit.id}`}
                                  disabled={visit.status === 'finished'}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit encounter
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDispensedItemsVisit(visit);
                                  }}
                                  data-testid={`dispensed-items-visit-${visit.id}`}
                                >
                                  <Package className="h-4 w-4 mr-2" />
                                  Items used / dispensed
                                </DropdownMenuItem>
                                {canEndTelecareSessionFromEncounter(visit) ? (
                                  <DropdownMenuItem
                                    onClick={() => handleRequestEndTelecareSession(visit)}
                                    data-testid={`end-telecare-session-${visit.id}`}
                                  >
                                    <PhoneOff className="h-4 w-4 mr-2" />
                                    End video session
                                  </DropdownMenuItem>
                                ) : null}
                                {isEncounterWritable(visit.status) && (
                                  <DropdownMenuItem
                                    onClick={() => handleDischargeVisit(visit)}
                                    data-testid={`discharge-visit-${visit.id}`}
                                  >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Discharge encounter
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setVisitToDelete(visit);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-red-600"
                                  data-testid={`delete-visit-${visit.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Visit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    </div>
                  ) : (
                    // Table View
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Visit Type</TableHead>
                          <TableHead>Visit Date</TableHead>
                          {isMultiLocation && <TableHead>Location</TableHead>}
                          <TableHead>Status</TableHead>
                          <TableHead>Disposition</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeFilteredMedicalVisits.map((visit: any, index: number) => {
                          if (!visit || !visit.id) return null;
                          return (
                          <TableRow key={visit.id}>
                            <TableCell className="font-medium text-gray-500">{(visitPage - 1) * VISIT_PAGE_SIZE + index + 1}</TableCell>
                            <TableCell>
                              <div className="min-w-[150px]">
                                <p className="font-medium text-sm">
                                  {visit.patient?.employee?.firstName || 'Unknown'} {visit.patient?.employee?.lastName || 'Patient'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {visit.patient?.employee?.employeeNumber || 'N/A'}
                                  {visit.patient?.company?.name ? ` \u2013 ${visit.patient.company.name}` : ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{formatVisitType(visit.visitType)}</TableCell>
                            <TableCell className="text-sm">
                              {visit.visitDate ? format(new Date(visit.visitDate), 'MMM dd, yyyy HH:mm') : 'N/A'}
                            </TableCell>
                            {isMultiLocation && (
                              <TableCell>
                                {visit.location ? (
                                  <div className="flex items-center gap-1">
                                    <Hospital className="h-3 w-3 text-primary" />
                                    <span className="text-xs">{(visit.location as any)?.locationCode || (visit.location as any)?.code || visit.location?.id || 'N/A'}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge className={`${getEncounterStatusColor(visit.status)} text-xs`} variant="outline">
                                {formatEncounterStatus(visit.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={visit.disposition === 'return_to_work' ? 'secondary' : 
                                       visit.disposition === 'off_duty' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {formatWorkDisposition(visit.disposition)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleViewDetails(visit)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditVisit(visit)} disabled={visit.status === 'finished'}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit encounter
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDispensedItemsVisit(visit)}
                                    >
                                      <Package className="h-4 w-4 mr-2" />
                                      Items used / dispensed
                                    </DropdownMenuItem>
                                    {canEndTelecareSessionFromEncounter(visit) ? (
                                      <DropdownMenuItem onClick={() => handleRequestEndTelecareSession(visit)}>
                                        <PhoneOff className="h-4 w-4 mr-2" />
                                        End video session
                                      </DropdownMenuItem>
                                    ) : null}
                                    {isEncounterWritable(visit.status) && (
                                      <DropdownMenuItem onClick={() => handleDischargeVisit(visit)}>
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Discharge encounter
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setVisitToDelete(visit);
                                        setDeleteConfirmOpen(true);
                                      }}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Visit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No encounters found</h3>
                    <p className="text-mineaid-gray mb-4">
                      {visitSearchTerm || visitStatusFilter !== 'all' || visitTypeFilter !== 'all' || visitLocationFilter !== 'all' || visitCompanyFilter !== 'all'
                        ? "No encounters match your filter criteria"
                        : "No encounters have been recorded yet"
                      }
                    </p>
                    <Link href="/encounter">
                      <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Encounter
                      </Button>
                    </Link>
                  </div>
                )}
                {safeFilteredMedicalVisits.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {visitPage} of {visitTotalPages} · {visitTotalCount.toLocaleString()} encounters
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={visitPage <= 1}
                        onClick={() => setVisitPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={visitPage >= visitTotalPages}
                        onClick={() => setVisitPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Patient Management</h3>
              <Button 
                className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90 mt-4 sm:mt-0"
                onClick={() => setNewPatientModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Patient
              </Button>
            </div>

            {/* Search Bar with View Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-mineaid-gray" />
                <Input
                  placeholder="Search patients by name or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={patientsViewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPatientsViewMode('cards')}
                  className="rounded-r-none"
                  title="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={patientsViewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPatientsViewMode('table')}
                  className="rounded-l-none"
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {patientsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                          <div className="h-6 w-16 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : safeFilteredPatients.length > 0 ? (
                  patientsViewMode === 'cards' ? (
                    <div className="space-y-4">
                      {safeFilteredPatients.map((patientData: any) => {
                        if (!patientData) return null;
                        const { patient, employee } = patientData;
                        if (!patient || !patient.id) return null;
                        return (
                        <div key={patient.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 lg:space-y-0 card-hover-accent">
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className="w-12 h-12 bg-mineaid-navy rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {employee?.firstName?.[0]?.toUpperCase()}{employee?.lastName?.[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">
                                {employee?.firstName} {employee?.lastName}
                              </p>
                              <p className="text-sm text-mineaid-gray truncate">
                                Employee ID: {employee?.employeeNumber || 'N/A'}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-mineaid-gray mt-1">
                                <span className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{employee?.department || 'No Department'}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Activity className="h-3 w-3" />
                                  <span>{employee?.position || 'No Position'}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                            <Badge className={getStatusColor(patient?.status || '')} variant="outline">
                              {formatStatus(patient?.status)}
                            </Badge>
                            <div className="flex items-center space-x-2">
                              <Link href={`/patient/${patient.id}`}>
                                <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" data-testid={`dropdown-patient-${patient.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/patient/${patient.id}`} className="flex items-center w-full">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/encounter?patientId=${patient.id}`} className="flex items-center w-full">
                                      <Plus className="h-4 w-4 mr-2" />
                                      New Encounter
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/appointments?patientId=${patient.id}`} className="flex items-center w-full">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Schedule Appointment
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Table View
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Patient Name</TableHead>
                          <TableHead>Employee #</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeFilteredPatients.map((patientData: any, index: number) => {
                          if (!patientData) return null;
                          const { patient, employee } = patientData;
                          if (!patient || !patient.id) return null;
                          return (
                            <TableRow key={patient.id}>
                              <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-mineaid-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {employee?.firstName?.[0]?.toUpperCase()}{employee?.lastName?.[0]?.toUpperCase()}
                                  </div>
                                  <span className="font-medium">
                                    {employee?.firstName} {employee?.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{employee?.employeeNumber || 'N/A'}</TableCell>
                              <TableCell>{employee?.department || 'No Department'}</TableCell>
                              <TableCell>{employee?.position || 'No Position'}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(patient?.status || '')} variant="outline">
                                  {formatStatus(patient?.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Link href={`/patient/${patient.id}`}>
                                    <Button size="sm" variant="ghost">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/patient/${patient.id}`} className="flex items-center w-full">
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/encounter?patientId=${patient.id}`} className="flex items-center w-full">
                                          <Plus className="h-4 w-4 mr-2" />
                                          New Encounter
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/appointments?patientId=${patient.id}`} className="flex items-center w-full">
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Schedule Appointment
                                        </Link>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                    <p className="text-mineaid-gray mb-4">
                      {searchQuery ? "No patients match your search criteria" : "No patients have been registered yet"}
                    </p>
                    <Button 
                      className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
                      onClick={() => setNewPatientModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Patient
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Appointment  History</h3>
              <Link href="/appointments">
                <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90 mt-4 sm:mt-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              </Link>
            </div>

            {/* Appointment Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filter Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by patient name or ID..."
                      value={appointmentSearchTerm}
                      onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={appointmentStatusFilter} onValueChange={setAppointmentStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={appointmentTypeFilter} onValueChange={setAppointmentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                      <SelectItem value="incident_followup">Incident Follow-up</SelectItem>
                      <SelectItem value="pre_employment">Pre-Employment Medical</SelectItem>
                      <SelectItem value="fitness_for_duty">Fitness for Duty</SelectItem>
                      <SelectItem value="return_to_work">Return to Work</SelectItem>
                      <SelectItem value="injury_assessment">Injury Assessment</SelectItem>
                      <SelectItem value="wellness_check">Wellness Check</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setAppointmentStatusFilter("all");
                        setAppointmentTypeFilter("all");
                        setAppointmentSearchTerm("");
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                    
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant={appointmentsViewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAppointmentsViewMode('cards')}
                        className="rounded-r-none"
                        title="Card view"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={appointmentsViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAppointmentsViewMode('table')}
                        className="rounded-l-none"
                        title="Table view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                {appointmentsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600">Error loading appointments. Please try again.</p>
                  </div>
                ) : appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 w-24 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAppointments && Array.isArray(filteredAppointments) && filteredAppointments.length > 0 ? (
                  appointmentsViewMode === 'cards' ? (
                    <div className="space-y-4">
                      {safeFilteredAppointments.map((appointment: any) => {
                        if (!appointment || !appointment.id) return null;
                        return (
                      <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0 card-hover-accent">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-mineaid-navy rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {appointment.patient?.employee?.firstName || appointment.employee?.firstName || 'Unknown'} {appointment.patient?.employee?.lastName || appointment.employee?.lastName || 'Patient'}
                            </p>
                            <p className="text-sm text-mineaid-gray truncate">
                              {appointment.appointmentType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown Type'} - {appointment.reason || 'No reason provided'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-mineaid-gray">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'MMM dd, yyyy') : 'N/A'}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'HH:mm') : 'N/A'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                          <Badge className={getStatusColor(appointment.status)} variant="outline">
                            {appointment.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'UNKNOWN'}
                          </Badge>
                          <div className="flex items-center space-x-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" data-testid={`dropdown-appointment-${appointment.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {appointment.status === 'scheduled' && (
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'in_progress'
                                    })}
                                    data-testid={`start-appointment-${appointment.id}`}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Start Appointment
                                  </DropdownMenuItem>
                                )}
                                {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'completed'
                                    })}
                                    data-testid={`complete-appointment-${appointment.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Completed
                                  </DropdownMenuItem>
                                )}
                                {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'cancelled'
                                    })}
                                    data-testid={`cancel-appointment-${appointment.id}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Appointment
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => updateAppointmentStatusMutation.mutate({
                                    appointmentId: appointment.id,
                                    status: 'no_show'
                                  })}
                                  data-testid={`no-show-appointment-${appointment.id}`}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Mark as No Show
                                </DropdownMenuItem>
                                {appointment.status === 'completed' && (
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'scheduled'
                                    })}
                                    data-testid={`reschedule-appointment-${appointment.id}`}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Reschedule Appointment
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                                  className="text-red-600"
                                  data-testid={`delete-appointment-${appointment.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Appointment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      );
                      })}
                    </div>
                  ) : (
                    // Table View
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Appointment Type</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeFilteredAppointments.map((appointment: any, index: number) => {
                          if (!appointment || !appointment.id) return null;
                          return (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                            <TableCell>
                              <div className="min-w-[150px]">
                                <p className="font-medium text-sm">
                                  {appointment.patient?.employee?.firstName || appointment.employee?.firstName || 'Unknown'} {appointment.patient?.employee?.lastName || appointment.employee?.lastName || 'Patient'}
                                </p>
                                <p className="text-xs text-gray-500">{appointment.patient?.employee?.employeeNumber || appointment.employee?.employeeNumber}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{appointment.appointmentType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</TableCell>
                            <TableCell className="text-sm">
                              {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'MMM dd, yyyy HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{appointment.reason || 'No reason'}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(appointment.status)} text-xs`} variant="outline">
                                {appointment.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {appointment.status === 'scheduled' && (
                                    <DropdownMenuItem
                                      onClick={() => updateAppointmentStatusMutation.mutate({
                                        appointmentId: appointment.id,
                                        status: 'in_progress'
                                      })}
                                    >
                                      <Clock className="h-4 w-4 mr-2" />
                                      Start Appointment
                                    </DropdownMenuItem>
                                  )}
                                  {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                                    <DropdownMenuItem
                                      onClick={() => updateAppointmentStatusMutation.mutate({
                                        appointmentId: appointment.id,
                                        status: 'completed'
                                      })}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark Completed
                                    </DropdownMenuItem>
                                  )}
                                  {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
                                    <DropdownMenuItem
                                      onClick={() => updateAppointmentStatusMutation.mutate({
                                        appointmentId: appointment.id,
                                        status: 'cancelled'
                                      })}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Appointment
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => updateAppointmentStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'no_show'
                                    })}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Mark as No Show
                                  </DropdownMenuItem>
                                  {appointment.status === 'completed' && (
                                    <DropdownMenuItem
                                      onClick={() => updateAppointmentStatusMutation.mutate({
                                        appointmentId: appointment.id,
                                        status: 'scheduled'
                                      })}
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Reschedule Appointment
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Appointment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                    <p className="text-mineaid-gray mb-4">
                      {appointmentSearchTerm || appointmentStatusFilter !== 'all' || appointmentTypeFilter !== 'all'
                        ? "No appointments match your filter criteria"
                        : "No appointments have been scheduled yet"
                      }
                    </p>
                    <Link href="/appointments">
                      <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule First Appointment
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignment History Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assignment History & Analytics</h3>
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalAssignments}</div>
                    <p className="text-xs text-muted-foreground">All assignments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.completionRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.completedCount} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{analytics.cancelledCount}</div>
                    <p className="text-xs text-muted-foreground">
                      {((analytics.cancelledCount / analytics.totalAssignments) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{analytics.pendingCount}</div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      data-testid="filter-date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="filter-status">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">User</label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger data-testid="filter-user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="h-10 w-full justify-between font-normal"
                          data-testid="filter-location"
                        >
                          <span className="truncate">
                            {locationFilter === "all"
                              ? "All locations"
                              : (() => {
                                  const loc = Array.isArray(careLocations)
                                    ? careLocations.find((l: any) => l.id === locationFilter)
                                    : null;
                                  return loc
                                    ? `${loc.locationCode || loc.code || ""} – ${loc.locationName || loc.name || ""}`.trim() || "Location"
                                    : "Location";
                                })()}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[var(--radix-popper-anchor-width)] overflow-y-auto">
                        <DropdownMenuItem onClick={() => setLocationFilter("all")}>
                          All locations
                        </DropdownMenuItem>
                        {Array.isArray(careLocations) &&
                          careLocations.map((loc: any) => (
                            <DropdownMenuItem
                              key={loc.id}
                              onClick={() => setLocationFilter(loc.id)}
                            >
                              {loc.locationCode != null && loc.locationName != null
                                ? `${loc.locationCode} – ${loc.locationName}`
                                : (loc.code != null && loc.name != null ? `${loc.code} – ${loc.name}` : loc.locationName || loc.name || loc.id)}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search duties or users..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      data-testid="filter-search"
                    />
                  </div>
                </div>
                
                {/* View Toggle */}
                <div className="flex justify-end mt-4">
                  <div className="flex items-center border rounded-md">
                    <Button
                      type="button"
                      variant={assignmentsViewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAssignmentsViewMode('cards')}
                      className="rounded-r-none"
                      title="Card view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={assignmentsViewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAssignmentsViewMode('table')}
                      className="rounded-l-none"
                      title="Table view"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment History */}
            {assignmentsLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500">Loading assignments…</div>
                </CardContent>
              </Card>
            ) : Object.keys(groupedAssignments).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500">No assignments found for the selected filters</div>
                </CardContent>
              </Card>
            ) : assignmentsViewMode === 'cards' ? (
              <div className="space-y-6">
                {Object.entries(groupedAssignments)
                  .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                  .map(([date, dayAssignments]: [string, any[]]) => (
                    <Card key={date}>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>{format(parseISO(date), 'EEEE, MMMM do, yyyy')}</span>
                          <Badge variant="outline" className="ml-auto">
                            {dayAssignments.length} assignments
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {dayAssignments.map((assignment: any) => (
                            <div
                              key={assignment.id}
                              className="flex items-start justify-between p-4 border rounded-lg"
                              data-testid={`assignment-${assignment.id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  {getStatusIcon(assignment.status)}
                                  <h3 className="font-medium">{assignment.duty?.title || 'Unknown Duty'}</h3>
                                  <Badge className={priorityColors[assignment.duty?.priority as keyof typeof priorityColors] || priorityColors.normal}>
                                    {assignment.duty?.priority || 'normal'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.shift}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2">
                                  {assignment.duty?.category || 'Unknown'} — {assignment.duty?.title || 'Unknown duty'}
                                </p>
                                
                                <div className="text-xs text-gray-500 space-y-1">
                                  <div>
                                    Assigned to: {assignment.assignedTo ? 
                                      `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}` : 
                                      'Unassigned'}
                                  </div>
                                  
                                  {assignment.status === 'completed' && assignment.completedAt && (
                                    <div className="text-green-600">
                                      ✓ Completed {formatDistanceToNow(parseISO(assignment.completedAt))} ago
                                      {assignment.completedBy && ` by ${assignment.completedBy.firstName} ${assignment.completedBy.lastName}`}
                                    </div>
                                  )}
                                  
                                  {assignment.status === 'cancelled' && assignment.cancelledAt && (
                                    <div className="text-red-600">
                                      ✗ Cancelled {formatDistanceToNow(parseISO(assignment.cancelledAt))} ago
                                      {assignment.cancelledBy && ` by ${assignment.cancelledBy.firstName} ${assignment.cancelledBy.lastName}`}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge className={statusColors[assignment.status as keyof typeof statusColors] || statusColors.pending}>
                                {assignment.status?.replace('_', ' ') || 'unknown'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              // Table View - Flatten all assignments
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Duty</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedAssignments)
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                        .flatMap(([date, dayAssignments]: [string, any[]]) => 
                          dayAssignments.map((assignment: any, idx: number) => ({
                            ...assignment,
                            date,
                            _index: idx
                          }))
                        )
                        .map((assignment: any, index: number) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium text-gray-500">{(assignmentPage - 1) * ASSIGNMENT_PAGE_SIZE + index + 1}</TableCell>
                            <TableCell>
                              <div className="min-w-[150px]">
                                <p className="font-medium text-sm">{assignment.duty?.title || 'Unknown Duty'}</p>
                                <p className="text-xs text-gray-500">{assignment.duty?.title}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{assignment.duty?.category || 'Unknown'}</TableCell>
                            <TableCell className="text-sm">
                              {assignment.assignedTo ? 
                                `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}` : 
                                'Unassigned'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(assignment.date ?? assignment.assignmentDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {assignment.shift}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${priorityColors[assignment.duty?.priority as keyof typeof priorityColors] || priorityColors.normal} text-xs`}>
                                {assignment.duty?.priority || 'normal'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[assignment.status as keyof typeof statusColors] || statusColors.pending} text-xs`}>
                                {assignment.status?.replace('_', ' ') || 'unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {!assignmentsLoading && assignmentTotalCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {assignmentPage} of {assignmentTotalPages} · {assignmentTotalCount.toLocaleString()} assignments
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={assignmentPage <= 1}
                    onClick={() => setAssignmentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={assignmentPage >= assignmentTotalPages}
                    onClick={() => setAssignmentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Triage & Vitals Tab */}
          <TabsContent value="triage-vitals" className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Triage & Vitals</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Triage history</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(triageRecords) && triageRecords.length > 0 ? (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date / Time</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Acuity</TableHead>
                            <TableHead>TEWS</TableHead>
                            <TableHead className="max-w-[140px]">Presenting complaint</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {triageRecords.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap">
                                {row.triageAt ? new Date(row.triageAt).toLocaleString() : "—"}
                              </TableCell>
                              <TableCell>
                                <Link href={`/patient/${row.patientId}`}>
                                  <span className="text-blue-600 hover:underline">
                                    {patientIdToName[row.patientId] || `Patient`}
                                  </span>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={row.acuity === "red" ? "destructive" : row.acuity === "orange" ? "default" : "secondary"}>
                                  {row.acuity || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell>{row.tewsScore ?? "—"}</TableCell>
                              <TableCell className="max-w-[140px] truncate" title={row.presentingComplaint || ""}>
                                {row.presentingComplaint || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-mineaid-gray py-4 text-center">No triage records.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vitals history</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(vitalsRecords) && vitalsRecords.length > 0 ? (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recorded</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>HR</TableHead>
                            <TableHead>BP</TableHead>
                            <TableHead>Temp</TableHead>
                            <TableHead>SpO2</TableHead>
                            <TableHead>Glucose</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vitalsRecords.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap">
                                {row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}
                              </TableCell>
                              <TableCell>
                                <Link href={`/patient/${row.patientId}`}>
                                  <span className="text-blue-600 hover:underline">
                                    {patientIdToName[row.patientId] || `Patient`}
                                  </span>
                                </Link>
                              </TableCell>
                              <TableCell>{row.heartRate ?? "—"}</TableCell>
                              <TableCell>
                                {row.bloodPressureSystolic != null || row.bloodPressureDiastolic != null
                                  ? `${row.bloodPressureSystolic ?? "—"}/${row.bloodPressureDiastolic ?? "—"}`
                                  : "—"}
                              </TableCell>
                              <TableCell>{row.temperature ?? "—"}</TableCell>
                              <TableCell>{row.oxygenSaturation ?? "—"}</TableCell>
                              <TableCell>{formatGlucoseDisplay(row.glucoseLevel, row.glucoseContext)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-mineaid-gray py-4 text-center">No vital signs recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <NewPatientModal 
          open={newPatientModalOpen}
          onOpenChange={setNewPatientModalOpen}
        />

        <MedicalVisitDetailsModal
          medicalVisit={selectedMedicalVisit}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />

        <VisitDispensedItemsModal
          open={!!dispensedItemsVisit}
          onOpenChange={(open) => { if (!open) setDispensedItemsVisit(null); }}
          visit={dispensedItemsVisit}
        />

        <EditEncounterModal
          encounter={editingVisit}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setEditingVisit(null);
          }}
        />

        <DischargeEncounterModal
          encounter={dischargingVisit}
          open={dischargeModalOpen}
          onOpenChange={(open) => {
            setDischargeModalOpen(open);
            if (!open) setDischargingVisit(null);
          }}
        />

        <AlertDialog open={endSessionConfirmOpen} onOpenChange={setEndSessionConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End video session?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks the linked telehealth visit as complete for everyone. Use this if the
                call is stuck in progress after the scheduled slot ended, or if participants have
                already left.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={endTelecareSessionMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={endTelecareSessionMutation.isPending || !endSessionVisit?.telecareSessionId}
                onClick={() => {
                  if (endSessionVisit?.telecareSessionId) {
                    endTelecareSessionMutation.mutate(endSessionVisit.telecareSessionId);
                  }
                }}
              >
                {endTelecareSessionMutation.isPending ? "Ending…" : "End session"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

                {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Encounter</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this encounter? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => visitToDelete && deleteMedicalVisitMutation.mutate(visitToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      <MobileNav />
      

    </div>
  );
}