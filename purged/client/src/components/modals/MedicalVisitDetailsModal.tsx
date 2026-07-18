import { format } from "date-fns";
import { formatGlucoseDisplay } from "@shared/glucose";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Calendar, 
  Clock, 
  Heart, 
  Thermometer, 
  Activity,
  Stethoscope,
  FileText,
  CheckCircle,
  X,
  MapPin,
  ClipboardList
} from "lucide-react";
import { parsePrimarySurvey, PRIMARY_SURVEY_LABELS, getFindingLabel } from "@/lib/primarySurvey";
import { parseSampleHistory, SAMPLE_LABELS, SAMPLE_KEYS } from "@/lib/sampleHistory";

interface MedicalVisitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalVisit: any;
}

export default function MedicalVisitDetailsModal({ 
  open, 
  onOpenChange, 
  medicalVisit 
}: MedicalVisitDetailsModalProps) {
  // Hooks must run unconditionally (before any early return) to avoid React internal warnings
  const { data: patientData } = useQuery({
    queryKey: medicalVisit?.patientId ? [`/api/patients/${medicalVisit.patientId}`] : ['medical-visit-modal-no-patient'],
    enabled: !!(medicalVisit?.patientId && open),
    retry: false,
  });

  const { data: dispensedItems = [] } = useQuery({
    queryKey: ["/api/inventory-transactions", { medicalVisitId: medicalVisit?.id }],
    queryFn: async () => {
      if (!medicalVisit?.id) return [];
      const params = new URLSearchParams({ medicalVisitId: medicalVisit.id });
      const res = await fetch(`/api/inventory-transactions?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list.filter((t: any) => t.transactionType === "issue_to_client") : [];
    },
    enabled: !!(medicalVisit?.id && open),
  });

  // Vital signs: prefer those recorded at triage for this visit (linked via triageId),
  // falling back to the fields stored on the medical_visits row.
  const { data: triageVitals = [] } = useQuery({
    queryKey: medicalVisit?.triageId && open ? ["/api/vital-signs", { triageId: medicalVisit.triageId }] : ["medical-visit-modal-no-vitals"],
    queryFn: async () => {
      if (!medicalVisit?.triageId) return [];
      const params = new URLSearchParams({ triageId: medicalVisit.triageId });
      const res = await fetch(`/api/vital-signs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    enabled: !!(medicalVisit?.triageId && open),
    retry: false,
  });

  const latestVitals = Array.isArray(triageVitals) && triageVitals.length > 0 ? triageVitals[0] : null;
  const vitalsSource: any = latestVitals || medicalVisit;

  if (!medicalVisit) return null;

  // Data structure from /api/medical-visits:
  // { ...visit, patient: { ...patient, employee: {...}, company: {...} }, location: {...} }
  const patient = medicalVisit.patient ?? patientData;
  const employee = patient?.employee;
  const company = patient?.company;

  const getDispositionColor = (disposition: string) => {
    switch (disposition) {
      case 'return_to_work':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'transferred_to_hospital':
      case 'transferred_to_hospital_other':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'light_duty':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'off_duty':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refer_to_specialist':
      case 'emergency':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Stethoscope className="h-6 w-6 mr-2 text-mineaid-navy" />
            Medical Visit Details
          </DialogTitle>
          <DialogDescription>
            Complete medical visit record for {employee?.firstName || 'Unknown'} {employee?.lastName || 'Patient'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-base text-gray-900">
                    {employee?.firstName || 'Unknown'} {employee?.lastName || 'Patient'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Employee Number</p>
                  <p className="text-base text-gray-900">
                    {employee?.employeeNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="text-base text-gray-900">
                    {employee?.department || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="text-base text-gray-900">
                    {employee?.position || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Company</p>
                  <p className="text-base text-gray-900">
                    {company?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Visit Date</p>
                  <p className="text-base text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-mineaid-gray" />
                    {format(new Date(medicalVisit.visitDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Visit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Visit Type</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {medicalVisit.visitType?.replace('_', ' ') || 'Routine'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge 
                    variant={medicalVisit.status === 'completed' ? 'default' : 'secondary'}
                    className={medicalVisit.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {medicalVisit.status?.replace('_', ' ') || 'Open'}
                  </Badge>
                </div>
                {medicalVisit.location && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Care Location
                    </p>
                    <Badge variant="outline" className="mt-1 flex items-center gap-1 w-fit">
                      <MapPin className="h-3 w-3" />
                      {medicalVisit.location.locationCode} - {medicalVisit.location.locationName}
                    </Badge>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Chief Complaint</p>
                  <p className="text-base text-gray-900">{medicalVisit.chiefComplaint || 'N/A'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Disposition</p>
                  <Badge className={getDispositionColor(medicalVisit.disposition)}>
                    {medicalVisit.disposition?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                  </Badge>
                </div>
              </div>
              
              {medicalVisit.historyOfPresentIllness && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">History of Present Illness</p>
                  <p className="text-base text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {medicalVisit.historyOfPresentIllness}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="h-5 w-5 mr-2" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Blood Pressure */}
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Heart className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Blood Pressure</span>
                  </div>
                  <p className="text-lg font-semibold text-red-900">
                    {vitalsSource.bloodPressureSystolic || '--'}/{vitalsSource.bloodPressureDiastolic || '--'}
                  </p>
                  <p className="text-xs text-red-700">mmHg</p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Heart className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Heart Rate</span>
                  </div>
                  <p className="text-lg font-semibold text-blue-900">
                    {vitalsSource.heartRate || '--'}
                  </p>
                  <p className="text-xs text-blue-700">bpm</p>
                </div>
                
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Thermometer className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Temperature</span>
                  </div>
                  <p className="text-lg font-semibold text-orange-900">
                    {vitalsSource.temperature || '--'}
                  </p>
                  <p className="text-xs text-orange-700">°F</p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Respiratory Rate</span>
                  </div>
                  <p className="text-lg font-semibold text-green-900">
                    {vitalsSource.respiratoryRate || '--'}
                  </p>
                  <p className="text-xs text-green-700">breaths/min</p>
                </div>
                
                {/* SpO2 */}
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">SpO2</span>
                  </div>
                  <p className="text-lg font-semibold text-purple-900">
                    {vitalsSource.oxygenSaturation || '--'}
                  </p>
                  <p className="text-xs text-purple-700">%</p>
                </div>
                
                {/* Glucose */}
                <div className="bg-pink-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-medium text-pink-900">Glucose</span>
                  </div>
                  <p className="text-lg font-semibold text-pink-900">
                    {formatGlucoseDisplay(vitalsSource.glucoseLevel, vitalsSource.glucoseContext)}
                  </p>
                </div>
                
                {/* Weight */}
                {vitalsSource.weight && (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">Weight</span>
                    </div>
                    <p className="text-lg font-semibold text-indigo-900">
                      {vitalsSource.weight}
                    </p>
                    <p className="text-xs text-indigo-700">kg</p>
                  </div>
                )}
                
                {/* Height */}
                {vitalsSource.height && (
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium text-teal-900">Height</span>
                    </div>
                    <p className="text-lg font-semibold text-teal-900">
                      {vitalsSource.height}
                    </p>
                    <p className="text-xs text-teal-700">cm</p>
                  </div>
                )}
              </div>
              
              {/* Pain Score - Full width */}
              {(vitalsSource.painScore !== null && vitalsSource.painScore !== undefined) && (
                <div className="mt-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Pain Score</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-red-900">{vitalsSource.painScore}</span>
                        <span className="text-sm text-red-700">/ 10</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Primary survey (ABCDE) */}
          {medicalVisit.primarySurvey && (() => {
            const findings = parsePrimarySurvey(medicalVisit.primarySurvey);
            const entries = Object.entries(findings).filter(([, v]) => v);
            if (entries.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-bold">
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Primary survey (ABCDE assessment)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-base text-gray-700">
                    {entries.map(([key, value]) => (
                      <li key={key} className="flex flex-wrap gap-x-2">
                        <span className="font-medium text-gray-800">{PRIMARY_SURVEY_LABELS[key]}:</span>
                        <span>{getFindingLabel(key, value)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })()}

          {/* SAMPLE history (before secondary survey) */}
          {(medicalVisit as any).sampleHistory && (() => {
            const sample = parseSampleHistory((medicalVisit as any).sampleHistory);
            const entries = SAMPLE_KEYS.filter((k) => sample[k]).map((k) => [k, sample[k]] as const);
            if (entries.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Stethoscope className="h-5 w-5 mr-2" />
                    SAMPLE history
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-base text-gray-700">
                    {entries.map(([key, value]) => (
                      <li key={key} className="flex flex-wrap gap-x-2">
                        <span className="font-medium text-gray-800">{SAMPLE_LABELS[key]}:</span>
                        <span>{value}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })()}

          {/* Secondary survey */}
          {medicalVisit.physicalExamination && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-bold">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Secondary survey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                  {medicalVisit.physicalExamination}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Impression / Diagnosis – independent section */}
          {medicalVisit.assessment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Impression / Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                  {medicalVisit.assessment}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Treatment */}
          {medicalVisit.treatment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="h-5 w-5 mr-2" />
                    Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                    {medicalVisit.treatment}
                  </p>
                  {medicalVisit.detainedAtFacility != null && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-500">Detained at FAP/Clinic</p>
                      <p className="text-base text-gray-700">
                        {medicalVisit.detainedAtFacility ? "Yes — patient was kept at the medical facility." : "No"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Medications given (from items used / dispensed, or legacy text) */}
          {(dispensedItems.length > 0 || medicalVisit.medications) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Medications given
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dispensedItems.length > 0 && (
                  <ul className="text-base text-gray-700 space-y-1 list-disc list-inside">
                    {dispensedItems.map((t: any, i: number) => (
                      <li key={t.id || i}>
                        {(t as any).itemName ?? (t as any).itemCode ?? t.itemId} — {(t as any).quantity} {(t as any).unitOfMeasure ?? "unit(s)"}
                      </li>
                    ))}
                  </ul>
                )}
                {medicalVisit.medications && (
                  <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed mt-2">
                    {medicalVisit.medications}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Procedures Performed */}
          {medicalVisit.procedures && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  Procedures Performed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                  {medicalVisit.procedures}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Disposition & Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="h-5 w-5 mr-2" />
                Disposition & Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                {medicalVisit.dispositionDateTime && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Disposition time: {format(new Date(medicalVisit.dispositionDateTime), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                <Badge className={getDispositionColor(medicalVisit.disposition)} variant="outline">
                  {medicalVisit.disposition?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Not specified'}
                </Badge>
                {(medicalVisit.disposition === "transferred_to_hospital" && (medicalVisit as any).transferFacility?.name) && (
                  <span className="text-sm text-gray-600">
                    Facility: <strong>{(medicalVisit as any).transferFacility.name}</strong>
                  </span>
                )}
                {(medicalVisit.disposition === "transferred_to_hospital_other" && (medicalVisit as any).transferFacilityOther) && (
                  <span className="text-sm text-gray-600">
                    Facility: <strong>{(medicalVisit as any).transferFacilityOther}</strong>
                  </span>
                )}
                {(medicalVisit.disposition === "transferred_to_hospital" ||
                  medicalVisit.disposition === "transferred_to_hospital_other") &&
                  medicalVisit.ambulanceUsed != null && (
                  <span className="text-sm text-gray-600">
                    Ambulance used: <strong>{medicalVisit.ambulanceUsed ? "Yes" : "No"}</strong>
                  </span>
                )}
                {medicalVisit.followUpDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Follow-up: {format(new Date(medicalVisit.followUpDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
              
              {medicalVisit.workRestrictions && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">Work Restrictions</p>
                  <p className="text-base text-gray-700 bg-yellow-50 p-3 rounded-lg">
                    {medicalVisit.workRestrictions}
                  </p>
                </div>
              )}
              
              {medicalVisit.followUpInstructions && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">Follow-up Instructions</p>
                  <p className="text-base text-gray-700 bg-blue-50 p-3 rounded-lg">
                    {medicalVisit.followUpInstructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          {medicalVisit.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                  {medicalVisit.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}