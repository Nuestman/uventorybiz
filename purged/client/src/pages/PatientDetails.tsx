import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { subDays } from "date-fns";

import { EditEncounterModal } from "@/components/modals/EditEncounterModal";
import { DischargeEncounterModal } from "@/components/modals/DischargeEncounterModal";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  User, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin, 
  Building, 
  Clock,
  Stethoscope,
  Plus,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  ClipboardList,
  Activity,
  HeartPulse,
  Loader2,
  Mail,
  Briefcase,
  UserCheck,
  LogOut,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import MedicalVisitDetailsModal from "@/components/modals/MedicalVisitDetailsModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VitalsTrendsChart } from "@/components/vitals/VitalsTrendsChart";
import { formatSymptomSeverity, severityBadgeClass } from "@/lib/symptoms/symptomCatalog";
import { VITAL_METRICS } from "@/lib/vitals/vitalsConfig";
import { formatMetricCellValue } from "@/lib/vitals/vitalsTrends";
import { GlucoseInputFields } from "@/components/vitals/GlucoseInputFields";
import { formatGlucoseDisplay, isGlucoseContext, parseGlucoseLevelInput } from "@shared/glucose";
import { PRIMARY_SURVEY_LABELS, PRIMARY_SURVEY_OPTIONS } from "@/lib/primarySurvey";
import { parseSampleHistory, SAMPLE_LABELS, SAMPLE_KEYS, type SampleHistoryData } from "@/lib/sampleHistory";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  patientHealthProfilePatchSchema,
  type PatientHealthProfilePatch,
} from "@shared/schema";
import { Form } from "@/components/ui/form";
import { PatientHealthProfileFields } from "@/components/PatientHealthProfileFields";
import { isEncounterWritable } from "@shared/encounterPathways";
import { buildMedicalVisitsQuery, parseMedicalVisitsListResponse } from "@/lib/encounter/medicalVisitsList";

const PATIENT_ENCOUNTER_PAGE_SIZE = 10;

export default function PatientDetails() {
  const [match, params] = useRoute("/patient/:id");
  const patientId = params?.id;
  
  // Modal states
  const [selectedMedicalVisit, setSelectedMedicalVisit] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<any>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [encounterPage, setEncounterPage] = useState(1);
  const [dischargingVisit, setDischargingVisit] = useState<any>(null);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileForm = useForm<PatientHealthProfilePatch>({
    resolver: zodResolver(patientHealthProfilePatchSchema),
    defaultValues: {},
  });

  const updatePatientProfileMutation = useMutation({
    mutationFn: async (body: PatientHealthProfilePatch) => {
      const response = await apiRequest("PUT", `/api/patients/${patientId}`, body);
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          (errBody as { message?: string }).message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      setProfileEditOpen(false);
      toast({
        title: "Saved",
        description: "Patient health profile updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not save health profile.",
        variant: "destructive",
      });
    },
  });

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    retry: false,
    enabled: !!patientId,
  }) as { data: any, isLoading: boolean };

  const { data: visitsListData, isLoading: visitsLoading } = useQuery({
    queryKey: ["/api/medical-visits", { patientId, page: encounterPage, pageSize: PATIENT_ENCOUNTER_PAGE_SIZE }],
    queryFn: async () => {
      const qs = buildMedicalVisitsQuery({
        patientId,
        page: encounterPage,
        pageSize: PATIENT_ENCOUNTER_PAGE_SIZE,
      });
      const res = await fetch(`/api/medical-visits${qs}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch encounters");
      }
      return parseMedicalVisitsListResponse(await res.json());
    },
    retry: false,
    enabled: !!patientId,
  });

  const medicalVisits = visitsListData?.rows ?? [];
  const encounterTotalCount = visitsListData?.totalCount ?? 0;
  const encounterTotalPages = Math.max(1, Math.ceil(encounterTotalCount / PATIENT_ENCOUNTER_PAGE_SIZE));

  const { data: triageList = [], isLoading: triageLoading } = useQuery({
    queryKey: ["/api/triage", { patientId }],
    retry: false,
    enabled: !!patientId,
  });

  const { data: vitalsList = [], isLoading: vitalsLoading } = useQuery({
    queryKey: ["/api/vital-signs", { patientId }],
    retry: false,
    enabled: !!patientId,
  });

  const symptomLogsFrom = useMemo(() => subDays(new Date(), 30).toISOString(), []);

  const { data: symptomLogs = [], isPending: symptomLogsLoading } = useQuery<
    Array<{
      id: string;
      symptomLabel: string;
      recordedAt: string;
      severity: number;
      bodyLocation: string | null;
      symptomQuality: string | null;
      provocation: string | null;
      palliation: string | null;
      radiation: string | null;
      notes: string | null;
    }>
  >({
    queryKey: [`/api/patients/${patientId}/symptom-logs`, { from: symptomLogsFrom }],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!patientId,
  });

  // Fetch care locations for edit modal
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: () => fetch('/api/care-locations').then(res => res.json()),
  });

  const { data: referralFacilitiesList = [] } = useQuery({
    queryKey: ["/api/referral-facilities"],
    queryFn: async () => {
      const res = await fetch("/api/referral-facilities", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const openProfileEdit = () => {
    const row = patient?.patient;
    if (row) {
      profileForm.reset({
        allergies: row.allergies ?? "",
        medicalHistory: row.medicalHistory ?? "",
        medications: row.medications ?? "",
        disability: row.disability ?? "",
        notes: row.notes ?? "",
      });
    }
    setProfileEditOpen(true);
  };

  // Handle modal functions
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


  // Delete medical visit mutation
  const deleteMedicalVisitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      await apiRequest("DELETE", `/api/medical-visits/${visitId}`);
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

  if (!match || !patientId) {
    return (
      <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Patient not found</h2>
          <Link href="/patients">
            <Button className="mt-4 bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
              Back to Patients
            </Button>
          </Link>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
            <p className="text-mineaid-gray mt-1">Comprehensive patient information and medical history</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Link href={`/medical-visit?patientId=${patientId}`}>
              <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
                <Plus className="h-4 w-4 mr-2" />
                New Medical Visit
              </Button>
            </Link>
            <Link href="/patients">
              <Button variant="outline">
                Back to Patients
              </Button>
            </Link>
          </div>
        </div>

        {patientLoading ? (
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-48 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        ) : patient && patient.patient ? (
          <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-stretch">
            {/* Patient Information + health profile */}
            <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {patient.employee?.profileImageUrl ? (
                      <img
                        src={patient.employee.profileImageUrl}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-mineaid-navy rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
                        {patient.employee?.firstName?.charAt(0) || 'U'}{patient.employee?.lastName?.charAt(0) || 'N'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.employee?.firstName || 'Unknown'} {patient.employee?.lastName || 'Employee'}
                      </h3>
                      <p className="text-mineaid-gray">Employee #: {patient.employee?.employeeNumber || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <Phone className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Phone</span>
                        {patient.employee?.phoneNumber?.trim() || 'Not provided'}
                      </span>
                    </div>

                    <div className="flex items-start space-x-3 min-w-0">
                      <Mail className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm break-all min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Work email</span>
                        {patient.employee?.email?.trim() || 'Not provided'}
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-3 min-w-0">
                      <Building className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Department</span>
                        {patient.employee?.department
                          ? String(patient.employee.department).replace(/_/g, ' ')
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-start space-x-3 min-w-0">
                      <Briefcase className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Position</span>
                        {patient.employee?.position || 'N/A'}
                        {patient.employee?.jobTitle ? (
                          <span className="text-mineaid-gray"> · {patient.employee.jobTitle}</span>
                        ) : null}
                      </span>
                    </div>

                    <div className="flex items-start space-x-3 min-w-0">
                      <Calendar className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Hire date</span>
                        {patient.employee?.hireDate
                          ? new Date(patient.employee.hireDate).toLocaleDateString()
                          : 'Not provided'}
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-3 min-w-0">
                      <Calendar className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Date of birth</span>
                        {patient.employee?.dateOfBirth
                          ? new Date(patient.employee.dateOfBirth).toLocaleDateString()
                          : 'Not provided'}
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-3 min-w-0">
                      <User className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Gender</span>
                        {patient.employee?.gender
                          ? patient.employee.gender.charAt(0).toUpperCase() + patient.employee.gender.slice(1)
                          : 'Not provided'}
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-3 min-w-0">
                      <Building className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Company</span>
                        {patient.company?.name || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-start space-x-3 min-w-0 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                      <span className="text-sm min-w-0">
                        <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Emergency contact</span>
                        {patient.employee?.emergencyContactName?.trim() || patient.employee?.emergencyContactPhone?.trim() ? (
                          <>
                            {patient.employee?.emergencyContactName?.trim() || '—'}
                            {patient.employee?.emergencyContactPhone?.trim() ? (
                              <span className="block text-mineaid-gray mt-0.5">
                                {patient.employee.emergencyContactPhone}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          'Not provided'
                        )}
                      </span>
                    </div>

                    {patient.employee?.status ? (
                      <div className="flex items-start space-x-3 min-w-0 sm:col-span-2">
                        <UserCheck className="h-4 w-4 text-mineaid-gray shrink-0 mt-0.5" />
                        <span className="text-sm">
                          <span className="text-xs font-bold text-mineaid-gray uppercase tracking-wide block">Employment status</span>
                          {String(patient.employee.status).replace(/_/g, ' ')}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Medical Clearance</span>
                      <Badge variant={patient.patient?.medicalClearance ? 'secondary' : 'outline'}>
                        {patient.patient?.medicalClearance ? 'Cleared' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium">Status</span>
                      <Badge 
                        variant={patient.patient?.status === 'active' ? 'default' : 
                               patient.patient?.status === 'cleared' ? 'secondary' : 'destructive'}
                      >
                        {patient.patient?.status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <HeartPulse className="h-5 w-5 mr-2" />
                    Health profile
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={openProfileEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const row = patient.patient;
                    const items: { label: string; value?: string | null }[] = [
                      { label: "Allergies", value: row?.allergies },
                      { label: "Medical history", value: row?.medicalHistory },
                      { label: "Current medications", value: row?.medications },
                      { label: "Disability / accessibility", value: row?.disability },
                      { label: "Additional notes", value: row?.notes },
                    ];
                    const filled = items.filter((i) => (i.value ?? "").trim().length > 0);
                    if (filled.length === 0) {
                      return (
                        <p className="text-sm text-mineaid-gray">
                          No health profile details recorded yet. Select Edit to add allergies, medical history,
                          medications, disability, or notes.
                        </p>
                      );
                    }
                    return filled.map((i) => (
                      <div key={i.label}>
                        <p className="text-xs font-bold text-mineaid-gray uppercase tracking-wide">{i.label}</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap mt-0.5">{i.value!.trim()}</p>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Medical Visits History — stretches to match left column height */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <Card className="flex flex-col flex-1 min-h-0 h-full border-gray-200">
                <CardHeader className="shrink-0">
                  <CardTitle className="flex items-center">
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Medical Visits History
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {visitsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                            <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : medicalVisits.length > 0 ? (
                    <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                      {medicalVisits.map((visit: any) => (
                        <div key={visit.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-8 h-8 bg-mineaid-navy rounded-lg flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {visit.chiefComplaint || 'Medical Visit'}
                                  </p>
                                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-mineaid-gray">
                                    <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(visit.visitDate).toLocaleDateString()} at{' '}
                                      {new Date(visit.visitDate).toLocaleTimeString()}
                                    </span>
                                    </span>
                                    {visit.location && (
                                      <span className="flex items-center space-x-1">
                                        <MapPin className="h-3 w-3 text-primary" />
                                        <span className="text-primary font-medium">{visit.location.locationCode}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {visit.assessment && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <strong>Impression / Diagnosis:</strong> {visit.assessment}
                                </p>
                              )}
                              
                              {visit.treatment && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <strong>Treatment:</strong> {visit.treatment}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                {visit.location && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {visit.location.locationName}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={visit.disposition === 'return_to_work' ? 'secondary' : 
                                         visit.disposition === 'light_duty' ? 'default' : 
                                         visit.disposition === 'off_duty' ? 'destructive' : 'outline'}
                                >
                                  {visit.disposition?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                                </Badge>
                                {visit.followUpDate && (
                                  <span className="text-xs text-mineaid-gray">
                                    Follow-up: {new Date(visit.followUpDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleViewDetails(visit)}
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
                                    onClick={() => handleViewDetails(visit)}
                                    data-testid={`view-details-visit-${visit.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditVisit(visit)}
                                    data-testid={`edit-visit-${visit.id}`}
                                    disabled={!isEncounterWritable(visit.status)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Visit
                                  </DropdownMenuItem>
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
                      ))}
                    </div>
                    {encounterTotalCount > PATIENT_ENCOUNTER_PAGE_SIZE && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-2 border-t shrink-0">
                        <p className="text-sm text-muted-foreground">
                          Page {encounterPage} of {encounterTotalPages} · {encounterTotalCount.toLocaleString()} encounters
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={encounterPage <= 1}
                            onClick={() => setEncounterPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={encounterPage >= encounterTotalPages}
                            onClick={() => setEncounterPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 min-h-[12rem]">
                      <Stethoscope className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No medical visits yet</h3>
                      <p className="text-mineaid-gray mb-4">
                        This patient hasn't had any medical visits recorded.
                      </p>
                      <Link href={`/medical-visit?patientId=${patientId}`}>
                        <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Medical Visit
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Vitals trends */}
          {vitalsList && Array.isArray(vitalsList) && vitalsList.length > 0 ? (
            <section className="mt-8 space-y-4" id="vitals-trends">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-mineaid-navy" />
                <h2 className="text-lg font-semibold text-gray-900">Vitals trends</h2>
              </div>
              <VitalsTrendsChart
                rows={vitalsList}
                detailHref={(metric) => `/patient/${patientId}/vitals/${metric}`}
              />
            </section>
          ) : null}

          {/* Patient-reported symptoms */}
          <section className="mt-8 space-y-4" id="patient-symptom-logs">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-mineaid-navy" />
              <h2 className="text-lg font-semibold text-gray-900">Patient-reported symptoms</h2>
              <Badge variant="secondary" className="text-[10px]">
                Self-reported
              </Badge>
            </div>
            <Card>
              <CardContent className="pt-6">
                {symptomLogsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : symptomLogs.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date / time</TableHead>
                          <TableHead>Symptom</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Quality</TableHead>
                          <TableHead className="max-w-[220px]">OPQRST / notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {symptomLogs.map((row) => {
                          const opqrstParts = [
                            row.provocation ? `Worse: ${row.provocation}` : null,
                            row.palliation ? `Better: ${row.palliation}` : null,
                            row.radiation ? `Spreads: ${row.radiation}` : null,
                            row.notes ? `Notes: ${row.notes}` : null,
                          ].filter(Boolean);
                          const opqrstSummary = opqrstParts.join(" · ");
                          return (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">
                              {row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>{row.symptomLabel}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] border ${severityBadgeClass(row.severity)}`}>
                                {formatSymptomSeverity(row.severity)}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.bodyLocation || "—"}</TableCell>
                            <TableCell>{row.symptomQuality || "—"}</TableCell>
                            <TableCell className="max-w-[220px] truncate" title={opqrstSummary}>
                              {opqrstSummary || "—"}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-mineaid-gray py-4 text-center">
                    No symptom logs recorded by patient in the last 30 days.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Triage & Vitals History */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  Triage History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {triageLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : triageList && Array.isArray(triageList) && triageList.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date / Time</TableHead>
                          <TableHead>Acuity</TableHead>
                          <TableHead>TEWS</TableHead>
                          <TableHead>Presenting complaint</TableHead>
                          <TableHead className="max-w-[120px]">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {triageList.map((row: any) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">
                              {row.triageAt ? new Date(row.triageAt).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={row.acuity === "red" ? "destructive" : row.acuity === "orange" ? "default" : "secondary"}>
                                {row.acuity || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.tewsScore ?? "—"}</TableCell>
                            <TableCell className="max-w-[180px] truncate" title={row.presentingComplaint || ""}>
                              {row.presentingComplaint || "—"}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate" title={row.notes || ""}>
                              {row.notes || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-mineaid-gray py-4 text-center">No triage records yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Vitals History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vitalsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : vitalsList && Array.isArray(vitalsList) && vitalsList.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recorded</TableHead>
                          {VITAL_METRICS.map((m) => (
                            <TableHead key={m.key}>
                              <Link
                                href={`/patient/${patientId}/vitals/${m.key}`}
                                className="hover:text-mineaid-navy hover:underline"
                              >
                                {m.shortLabel}
                              </Link>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vitalsList.map((row: any) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">
                              {row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}
                            </TableCell>
                            {VITAL_METRICS.map((m) => (
                              <TableCell key={m.key}>{formatMetricCellValue(m.key, row)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-mineaid-gray py-4 text-center">No vital signs recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Patient not found</h3>
            <p className="text-mineaid-gray mb-4">The requested patient could not be found.</p>
            <Link href="/patients">
              <Button className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90">
                Back to Patients
              </Button>
            </Link>
          </div>
        )}
      <MobileNav />
      
      {/* Modals */}
      <MedicalVisitDetailsModal
        medicalVisit={selectedMedicalVisit}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />

      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Edit health profile</DialogTitle>
            <DialogDescription>
              Allergies, chronic conditions, home medications, disability, and general notes. Stored on the patient
              record for clinical staff.
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit((vals) => updatePatientProfileMutation.mutate(vals))}
              className="space-y-4"
            >
              <PatientHealthProfileFields control={profileForm.control} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setProfileEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePatientProfileMutation.isPending}
                  className="bg-mineaid-navy hover:bg-mineaid-navy/90"
                >
                  {updatePatientProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Visit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical visit? This action cannot be undone.
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
    </div>
  );
}