import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMedicalVisitSchema, insertTriageSchema, insertVitalSignsSchema, type InsertMedicalVisit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PRIMARY_SURVEY_LABELS, PRIMARY_SURVEY_OPTIONS } from "@/lib/primarySurvey";
import { SAMPLE_LABELS, SAMPLE_KEYS } from "@/lib/sampleHistory";
import { GlucoseInputFields } from "@/components/vitals/GlucoseInputFields";
import { formatGlucoseDisplay, parseGlucoseLevelInput, type GlucoseContext } from "@shared/glucose";
import {
  buildVitalsAtTriagePayload,
  triageVitalsHasValues,
} from "@/lib/vitals/triageVitalsPayload";

import MobileNav from "@/components/MobileNav";
import PatientMessagingPanel from "@/components/messaging/PatientMessagingPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stethoscope, Activity, FileText, User, ArrowLeft, ClipboardList, Thermometer, Heart, Search, AlertCircle, MapPin, Package, Plus, Trash2, Pencil, Loader2, ChevronDown, Video } from "lucide-react";
import { Link } from "wouter";
import { fetchPatientsOfflineFirst } from "@/lib/offlinePatients";
import { queueOfflineOperation, queueOfflineTriageWithLocalRow } from "@/lib/syncClient";
import { offlineStore } from "@/lib/offlineStore";
import {
  getEncounterTypeDefinition,
  dispositionOptionsFor,
  defaultTriageRequired,
  type EncounterModality,
  type EncounterType,
} from "@shared/encounterPathways";
import {
  DISPOSITION_LABELS,
  ENCOUNTER_OPEN_TYPES,
  formatEncounterType,
} from "@/lib/encounter/encounterVisitTypes";
import { formatEncounterStatus } from "@/lib/formatters";

const SATS_ACUITY_OPTIONS = [
  { value: "red", label: "Red – Immediate", color: "bg-red-600 text-white" },
  { value: "orange", label: "Orange – Very urgent", color: "bg-orange-500 text-white" },
  { value: "yellow", label: "Yellow – Urgent", color: "bg-yellow-500 text-white" },
  { value: "green", label: "Green – Routine", color: "bg-green-600 text-white" },
] as const;

type Acuity = "red" | "orange" | "yellow" | "green";
const ACUITY_ORDER: Acuity[] = ["red", "orange", "yellow", "green"];
function worstAcuity(a: Acuity | "", b: Acuity | ""): Acuity {
  if (!a) return b || "green";
  if (!b) return a;
  return ACUITY_ORDER.indexOf(a) <= ACUITY_ORDER.indexOf(b) ? a : b;
}

// Part 1 – TEWS: value options and score lookup (simplified; backend can replace)
const TRIAGE_MOBILITY = [
  { value: "walking", label: "Walking", score: 0 },
  { value: "with_help", label: "With help", score: 1 },
  { value: "stretcher_unresponsive", label: "Stretcher / Unresponsive", score: 2 },
] as const;
const TRIAGE_AVPU = [
  { value: "alert", label: "Alert", score: 0 },
  { value: "voice", label: "Reacts to Voice", score: 1 },
  { value: "pain", label: "Reacts to Pain", score: 2 },
  { value: "confused", label: "Confused", score: 2 },
  { value: "unresponsive", label: "Unresponsive", score: 3 },
] as const;
const TRIAGE_TRAUMA = [
  { value: "no", label: "No", score: 0 },
  { value: "yes", label: "Yes", score: 2 },
] as const;

function scoreRR(rr: number | ""): number {
  if (rr === "" || rr == null) return 0;
  if (rr >= 14 && rr <= 20) return 0;
  if ((rr >= 9 && rr <= 13) || (rr >= 21 && rr <= 24)) return 1;
  if ((rr >= 5 && rr <= 8) || (rr >= 25 && rr <= 35)) return 2;
  return 3;
}
function scoreHR(hr: number | ""): number {
  if (hr === "" || hr == null) return 0;
  if (hr >= 51 && hr <= 100) return 0;
  if ((hr >= 41 && hr <= 50) || (hr >= 101 && hr <= 110)) return 1;
  if (hr >= 111 && hr <= 129) return 2;
  return 3;
}
function scoreSystolic(sbp: number | ""): number {
  if (sbp === "" || sbp == null) return 0;
  if (sbp >= 101 && sbp <= 199) return 0;
  if ((sbp >= 81 && sbp <= 100) || (sbp >= 201 && sbp <= 220)) return 1;
  if ((sbp >= 71 && sbp <= 80) || (sbp >= 221 && sbp <= 230)) return 2;
  return 3;
}
function scoreTemp(temp: number | ""): number {
  if (temp === "" || temp == null) return 0;
  if (temp >= 35 && temp <= 38.4) return 0;
  if ((temp >= 34 && temp < 35) || (temp >= 38.5 && temp <= 38.9)) return 1;
  if ((temp >= 33 && temp < 34) || (temp >= 39 && temp <= 39.9)) return 2;
  return 3;
}

// TEWS total → physiology acuity (0–1 green, 2–3 yellow, 4–5 orange, 6+ red)
function tewsToAcuity(tews: number): Acuity {
  if (tews <= 2) return "green";
  if (tews <= 4) return "yellow";
  if (tews <= 6) return "orange";
  return "red";
}

// Part 2 – Discriminators with mapped acuity (final triage from discriminator)
const SATS_DISCRIMINATORS: { id: string; label: string; acuity: Acuity }[] = [
  // RED - Emergency (Immediate)
  { id: "obstructed_airway", label: "Obstructed airway – not breathing", acuity: "red" },
  { id: "seizure_current", label: "Seizures – current", acuity: "red" },
  { id: "burn_facial", label: "Burn – facial / inhalation", acuity: "red" },
  { id: "hypoglycaemia", label: "Hypoglycaemia – glucose less than 3 mmol/L", acuity: "red" },
  { id: "cardiac_arrest", label: "Cardiac arrest", acuity: "red" },

  // ORANGE - Very Urgent (Within 10 mins)
  { id: "high_energy_transfer", label: "High energy transfer (severe mechanism of injury)", acuity: "orange" },
  { id: "shortness_of_breath", label: "Shortness of breath – acute", acuity: "orange" },
  { id: "loc_reduced", label: "Level of consciousness reduced / confused", acuity: "orange" },
  { id: "coughing_blood", label: "Coughing blood", acuity: "orange" },
  { id: "chest_pain", label: "Chest pain", acuity: "orange" },
  { id: "stabbed_neck", label: "Stabbed neck", acuity: "orange" },
  { id: "haemorrhage_uncontrolled", label: "Haemorrhage – uncontrolled (arterial bleed)", acuity: "orange" },
  { id: "focal_neurology", label: "Focal neurology – acute (stroke)", acuity: "orange" },
  { id: "aggression", label: "Aggression", acuity: "orange" },
  { id: "threatened_limb", label: "Threatened limb", acuity: "orange" },
  { id: "eye_injury", label: "Eye injury", acuity: "orange" },
  { id: "dislocation_large_joint", label: "Dislocation of larger joint (not finger or toe)", acuity: "orange" },
  { id: "fracture_compound", label: "Fracture – compound (with a break in skin)", acuity: "orange" },
  { id: "burn_circumferential", label: "Burn – circumferential", acuity: "orange" },
  { id: "burn_chemical", label: "Burn – chemical", acuity: "orange" },
  { id: "burn_over_20", label: "Burn over 20%", acuity: "orange" },
  { id: "burn_electrical", label: "Burn – electrical", acuity: "orange" },
  { id: "seizure_post_ictal", label: "Seizure – post ictal", acuity: "orange" },
  { id: "poisoning_overdose", label: "Poisoning / Overdose", acuity: "orange" },
  { id: "diabetic_ketonuria", label: "Diabetic – glucose over 11 and ketonuria", acuity: "orange" },
  { id: "vomiting_fresh_blood", label: "Vomiting fresh blood", acuity: "orange" },
  { id: "pregnancy_abdominal_trauma", label: "Pregnancy and abdominal trauma", acuity: "orange" },
  { id: "pregnancy_abdominal_pain", label: "Pregnancy and abdominal pain", acuity: "orange" },
  { id: "severe_pain", label: "Severe Pain", acuity: "orange" },

  // YELLOW - Urgent (Within 60 mins)
  { id: "haemorrhage_controlled", label: "Haemorrhage – controlled", acuity: "yellow" },
  { id: "dislocation_small_joint", label: "Dislocation of finger OR toe", acuity: "yellow" },
  { id: "fracture_closed", label: "Fracture – closed (no break in the skin)", acuity: "yellow" },
  { id: "burn_other", label: "Burn – other", acuity: "yellow" },
  { id: "abdominal_pain", label: "Abdominal pain", acuity: "yellow" },
  { id: "diabetic_hyperglycaemia", label: "Diabetic – glucose over 17 (no ketonuria)", acuity: "yellow" },
  { id: "vomiting_persistent", label: "Vomiting persistently", acuity: "yellow" },
  { id: "pregnancy_trauma", label: "Pregnancy & trauma", acuity: "yellow" },
  { id: "pregnancy_pv_bleed", label: "Pregnancy & PV bleed", acuity: "yellow" },
  { id: "moderate_pain", label: "Moderate pain", acuity: "yellow" }
];

function resolveClinicalDiscriminatorLabels(raw: string | null | undefined): string[] {
  if (!raw?.trim() || raw.trim() === "[]") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed
      .map((entry) => {
        if (typeof entry === "string") {
          return SATS_DISCRIMINATORS.find((d) => d.id === entry)?.label ?? entry;
        }
        if (entry && typeof entry === "object" && "label" in entry) {
          return String((entry as { label?: string }).label ?? "");
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return raw.trim() === "[]" ? [] : [raw.trim()];
  }
}

/**
 * Avoid indefinite hangs when `navigator.onLine` is true but the connection is dead (common in Firefox).
 * Also abort when the browser fires `offline` so we can fall back to IndexedDB without waiting for TCP.
 */
const API_FETCH_TIMEOUT_MS = 12_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), API_FETCH_TIMEOUT_MS);
  const { signal: parentSignal, ...rest } = init;
  if (parentSignal) {
    if (parentSignal.aborted) {
      ctrl.abort();
    } else {
      parentSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
  }
  const onOffline = () => ctrl.abort();
  if (typeof window !== "undefined") {
    window.addEventListener("offline", onOffline);
  }
  return fetch(input, { ...rest, signal: ctrl.signal }).finally(() => {
    clearTimeout(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("offline", onOffline);
    }
  });
}

type EncounterDocumentationPayload = {
  visitData: Record<string, unknown>;
  itemsUsed?: { itemId: string; quantity: number }[];
};

async function persistEncounterDocumentation(
  encId: string,
  payload: EncounterDocumentationPayload,
  ctx: { userId?: string; triageId?: string; patientId?: string; locationId?: string | null },
) {
  const { visitData, itemsUsed: dispensedItems } = payload;
  const updateRes = await fetchWithTimeout(`/api/encounters/${encId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      ...visitData,
      medicalStaffId: ctx.userId || visitData.medicalStaffId,
      triageId: ctx.triageId ?? visitData.triageId ?? undefined,
    }),
  });
  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error((err as { message?: string })?.message || "Failed to save encounter");
  }
  const updated = (await updateRes.json()) as { id?: string; patientId?: string };
  const patientId = updated?.patientId ?? ctx.patientId;

  if (dispensedItems?.length && patientId) {
    for (const line of dispensedItems) {
      if (!line.itemId || !line.quantity || line.quantity <= 0) continue;
      const txRes = await fetchWithTimeout("/api/inventory-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemId: line.itemId,
          quantity: line.quantity,
          transactionType: "issue_to_client",
          patientId,
          medicalVisitId: encId,
          documentType: "visit",
          documentId: encId,
          ...(ctx.locationId ? { locationId: ctx.locationId } : {}),
        }),
      });
      if (!txRes.ok) {
        console.warn("Failed to record dispensed item", line, await txRes.text());
      }
    }
  }
  return updated;
}

function isLikelyNetworkFailure(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  if (error instanceof Error) {
    const m = error.message;
    return (
      m.includes("Failed to fetch") ||
      m.includes("NetworkError") ||
      m.includes("Control plane request failed") ||
      m.includes("Load failed")
    );
  }
  return false;
}

function isHospitalTransferDisposition(d: string | undefined | null): boolean {
  return d === "transferred_to_hospital" || d === "transferred_to_hospital_other";
}

export default function MedicalVisit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeLocation, locationId } = useActiveLocation();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [openVisitType, setOpenVisitType] = useState<EncounterType>("clinical");
  const [openModality, setOpenModality] = useState<EncounterModality>("in_person");
  const [openTriageRequired, setOpenTriageRequired] = useState(true);
  const [editEncounterOpen, setEditEncounterOpen] = useState(false);
  const [editVisitType, setEditVisitType] = useState<EncounterType>("clinical");
  const [editModality, setEditModality] = useState<EncounterModality>("in_person");
  const [editTriageRequired, setEditTriageRequired] = useState(true);
  const [monitoringDisposition, setMonitoringDisposition] = useState("return_to_work");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [itemsUsed, setItemsUsed] = useState<{ itemId: string; quantity: number; search: string }[]>([]);
  const [itemsUsedSearchFocusedIdx, setItemsUsedSearchFocusedIdx] = useState<number | null>(null);

  const { data: proceduresList = [] } = useQuery<{ id: string; name: string; sortOrder?: number }[]>({
    queryKey: ["/api/procedures"],
    queryFn: async () => {
      const res = await fetch("/api/procedures");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const procedureNames = proceduresList.map((p) => p.name);

  // Triage Part 1 – vitals (value + score) for TEWS + other vitals (no score). TEWS uses only systolic for BP score.
  const [triageVitals, setTriageVitals] = useState<{
    mobility: string;
    rr: number | "";
    hr: number | "";
    systolicBp: number | "";
    diastolicBp: number | "";
    temp: number | "";
    avpu: string;
    trauma: string;
    oxygenSaturation: number | "";
    glucose: number | "";
    glucoseContext: GlucoseContext | "";
    painScore: number | "";
    weight: string;
    height: string;
  }>({
    mobility: "",
    rr: "",
    hr: "",
    systolicBp: "",
    diastolicBp: "",
    temp: "",
    avpu: "",
    trauma: "",
    oxygenSaturation: "",
    glucose: "",
    glucoseContext: "",
    painScore: "",
    weight: "",
    height: "",
  });
  // Triage Part 2 – selected discriminator ids (sets final acuity)
  const [selectedDiscriminators, setSelectedDiscriminators] = useState<string[]>([]);

  const tewsScore = (() => {
    const m = TRIAGE_MOBILITY.find((o) => o.value === triageVitals.mobility)?.score ?? 0;
    const a = TRIAGE_AVPU.find((o) => o.value === triageVitals.avpu)?.score ?? 0;
    const t = TRIAGE_TRAUMA.find((o) => o.value === triageVitals.trauma)?.score ?? 0;
    return m + scoreRR(triageVitals.rr) + scoreHR(triageVitals.hr) + scoreSystolic(triageVitals.systolicBp) + scoreTemp(triageVitals.temp) + a + t;
  })();
  const tewsAcuity = tewsToAcuity(tewsScore);
  const finalAcuity: Acuity = selectedDiscriminators.length
    ? selectedDiscriminators.reduce<Acuity>((acc, id) => {
        const d = SATS_DISCRIMINATORS.find((x) => x.id === id);
        return d ? worstAcuity(acc, d.acuity) : acc;
      }, "green")
    : tewsAcuity;

  // Tab from URL: triage | vitals | visit (default triage)
  const [activeTab, setActiveTab] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    return p === "vitals" || p === "visit" ? p : "triage";
  });
  const [lastSavedTriage, setLastSavedTriage] = useState<any>(null);
  /** Suppresses tab auto-switch briefly after triage save */
  const skipVisitTriageGuardRef = useRef(false);
  // Physical exam: true = primary/secondary survey (ABCDE, SAMPLE, secondary); false = simple single textarea
  const [useSurveyForm, setUseSurveyForm] = useState(true);
  // Triage details toggle in full visit
  const [showTriageDetails, setShowTriageDetails] = useState(false);
  const { data: triageList = [] } = useQuery<any[]>({
    queryKey: ["/api/triage", { patientId: selectedPatientId }],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const res = await fetch(`/api/triage?patientId=${encodeURIComponent(selectedPatientId)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedPatientId,
  });

  /** Triage rows saved offline (IndexedDB) for this patient — merged with server list for same-day gate + summary */
  const [idbTriageForPatient, setIdbTriageForPatient] = useState<any[]>([]);
  useEffect(() => {
    if (!selectedPatientId) {
      setIdbTriageForPatient([]);
      return;
    }
    void offlineStore.getTriageByPatientId(selectedPatientId).then((rows) =>
      setIdbTriageForPatient(rows as any[]),
    );
  }, [selectedPatientId]);

  const latestTriage = lastSavedTriage?.patientId === selectedPatientId
    ? lastSavedTriage
    : (triageList?.length ? triageList[triageList.length - 1] : null);
  const hasTriage = !!latestTriage;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== activeTab) {
      params.set("tab", activeTab);
      const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", url);
    }
  }, [activeTab]);

  // Get patientId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');
    if (patientId && patientId !== 'undefined') {
      setSelectedPatientId(patientId);
    }
  }, []);

  // Get patient details when patientId is provided (offline-first)
  const { data: selectedPatientData } = useQuery<any>({
    queryKey: [`/api/patients/${selectedPatientId}`],
    enabled: !!selectedPatientId && selectedPatientId !== "undefined",
    retry: false,
    queryFn: async () => {
      if (!selectedPatientId || selectedPatientId === "undefined") return null;

      const isOnline =
        typeof navigator === "undefined" ? true : navigator.onLine;

      if (!isOnline) {
        const local = await offlineStore.getAllPatients();
        const found = local.find(
          (entry: any) => entry?.patient?.id === selectedPatientId,
        );
        return found ?? null;
      }

      const res = await fetch(
        `/api/patients/${encodeURIComponent(selectedPatientId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error("Failed to fetch patient details");
      }
      const data = await res.json();
      if (data?.patient?.id) {
        await offlineStore.putPatient({ id: data.patient.id, ...data });
      }
      return data;
    },
  });

  // Get patients for dropdown (like incident form)
  type PatientData = {
    patient: { id: string; status?: string };
    employee?: {
      firstName?: string;
      lastName?: string;
      employeeNumber?: string;
      jobTitle?: string;
      position?: string;
    };
    company?: { name?: string };
  };
  
  const { data: patients = [] as PatientData[], isLoading: patientsLoading } =
    useQuery<PatientData[]>({
      queryKey: patientSearchQuery
        ? ["/api/patients", { search: patientSearchQuery }]
        : ["/api/patients"],
      retry: false,
      queryFn: () => fetchPatientsOfflineFirst(patientSearchQuery) as Promise<PatientData[]>,
    });

  const filteredPatients = patients.filter((patientData: PatientData) => {
    if (!patientSearchQuery) return true;
    const { patient, employee } = patientData;
    const searchLower = patientSearchQuery.toLowerCase();
    return (
      employee?.firstName?.toLowerCase().includes(searchLower) ||
      employee?.lastName?.toLowerCase().includes(searchLower) ||
      employee?.employeeNumber?.toLowerCase().includes(searchLower) ||
      patient?.id?.toLowerCase().includes(searchLower)
    );
  });

  const { data: inventoryItems = [] } = useQuery<{
    id: string;
    itemCode: string;
    itemName: string;
    currentStock: number;
    unitOfMeasure: string;
  }[]>({
    queryKey: ["/api/inventory", locationId ? { locationId } : "session"],
    queryFn: async () => {
      const url = locationId ? `/api/inventory?locationId=${encodeURIComponent(locationId)}` : "/api/inventory";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }
      return response.json();
    },
    retry: false,
  });

  // Handle patient selection from dropdown
  const handlePatientSelect = async (patientId: string) => {
    if (!patientId) {
      setSelectedPatientId("");
      form.setValue('patientId', "");
      setSelectedEmployee(null);
      return;
    }

    const patientData = patients.find((p) => p.patient.id === patientId);
    if (!patientData) return;

    const { patient, employee } = patientData;
    setSelectedPatientId(patient.id);
    form.setValue('patientId', patient.id);
    setSelectedEmployee(employee);
    
    // Note: Medical visits don't have a jobTitle field, so we just store the employee data
    // The job title/position is available in employee data if needed for display
    
    toast({
      title: "Patient Selected",
      description: `Selected ${employee?.firstName} ${employee?.lastName}${employee?.employeeNumber ? ` - ${employee.employeeNumber}` : ''}`,
    });
  };

  // Omit medicalStaffId (set by server on submit).
  const form = useForm({
    resolver: zodResolver(insertMedicalVisitSchema.omit({ medicalStaffId: true })),
    defaultValues: {
      patientId: selectedPatientId || "",
      medicalStaffId: "",
      locationId: locationId || "",
      visitDate: new Date(),
      visitType: "clinical",
      modality: "in_person" as EncounterModality,
      patientLocationNote: "",
      chiefComplaint: "",
      historyOfPresentIllness: "",
      bloodPressureSystolic: undefined as number | undefined,
      bloodPressureDiastolic: undefined as number | undefined,
      heartRate: undefined as number | undefined,
      temperature: "",
      respiratoryRate: undefined as number | undefined,
      oxygenSaturation: undefined as number | undefined,
      glucoseLevel: undefined as number | undefined,
      glucoseContext: undefined as GlucoseContext | undefined,
      painScore: undefined as number | undefined,
      weight: "",
      height: "",
      primarySurvey: "",
      sampleHistory: JSON.stringify({ A: "None", M: "None", P: "None", L: "about 3 hours ago" }),
      physicalExamination: "",
      assessment: "",
      treatment: "",
      medications: "",
      detainedAtFacility: false,
      procedures: "",
      dispositionDateTime: undefined as string | undefined,
      disposition: "return_to_work",
      transferFacilityId: undefined as string | undefined,
      transferFacilityOther: "",
      ambulanceUsed: false,
      workRestrictions: "",
      followUpDate: undefined,
      followUpInstructions: "",
      followUpRequired: false,
      notes: "",
      lastMenstrualPeriod: undefined,
    },
  });

  // Update form when selectedPatientId or locationId changes
  useEffect(() => {
    if (selectedPatientId) {
      form.setValue('patientId', selectedPatientId);
    }
    if (locationId) {
      form.setValue('locationId', locationId);
    }
  }, [selectedPatientId, locationId, form]);

  const dispositionWatch = form.watch("disposition");
  useEffect(() => {
    if (!isHospitalTransferDisposition(dispositionWatch)) {
      form.setValue("ambulanceUsed", false);
    }
  }, [dispositionWatch, form]);

  const modalityWatch = form.watch("modality") as EncounterModality | undefined;

  const { data: activeEncounter = null } = useQuery<any>({
    queryKey: ["/api/encounters/active", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      const res = await fetch(
        `/api/encounters/active?patientId=${encodeURIComponent(selectedPatientId)}`,
        { credentials: "include" },
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPatientId,
  });

  const { data: encounterDetail = null, isLoading: encounterDetailLoading } = useQuery<any>({
    queryKey: ["/api/encounters", activeEncounter?.id],
    queryFn: async () => {
      const res = await fetch(`/api/encounters/${activeEncounter!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load encounter");
      return res.json();
    },
    enabled: !!activeEncounter?.id,
  });

  const activeEncounterType = (activeEncounter?.visitType ?? "clinical") as EncounterType;
  const encounterTypeDef = getEncounterTypeDefinition(activeEncounterType);
  const triageRequired = activeEncounter?.triageRequired ?? false;
  const showTriageTab = !!activeEncounter?.id && triageRequired;
  const showVitalsTab = !!activeEncounter?.id;
  const showClinicalTab = !!activeEncounter?.id && encounterTypeDef.hasClinicalDocumentation;

  const isEmbedMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("embed") === "1";
  }, []);

  const telecareSessionIdFromUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("telecareSessionId");
  }, []);
  const activeTelecareSessionId =
    telecareSessionIdFromUrl ??
    encounterDetail?.telecareSessionId ??
    activeEncounter?.telecareSessionId ??
    null;
  const showTelehealthVideoLink =
    !isEmbedMode &&
    (modalityWatch === "telehealth" || activeEncounter?.modality === "telehealth") &&
    !!activeTelecareSessionId;

  useEffect(() => {
    if (!isEmbedMode || !activeEncounter?.id) return;
    if (activeEncounter.modality === "telehealth" && showClinicalTab) {
      setActiveTab("visit");
    }
  }, [isEmbedMode, activeEncounter?.id, activeEncounter?.modality, showClinicalTab]);

  useEffect(() => {
    setOpenTriageRequired(defaultTriageRequired(openVisitType, openModality));
  }, [openVisitType, openModality]);

  useEffect(() => {
    if (!editEncounterOpen || !activeEncounter) return;
    setEditVisitType((activeEncounter.visitType ?? "clinical") as EncounterType);
    setEditModality((activeEncounter.modality ?? "in_person") as EncounterModality);
    setEditTriageRequired(!!activeEncounter.triageRequired);
  }, [editEncounterOpen, activeEncounter?.id, activeEncounter?.visitType, activeEncounter?.modality, activeEncounter?.triageRequired]);

  useEffect(() => {
    const modality = (activeEncounter?.modality ?? openModality) as EncounterModality;
    const options = dispositionOptionsFor(modality);
    if (!options.includes(monitoringDisposition)) {
      setMonitoringDisposition(options[0] ?? "return_to_work");
    }
  }, [activeEncounter?.modality, openModality, monitoringDisposition]);

  const latestEncounterTriage = useMemo(() => {
    if (encounterDetail?.latestTriage) return encounterDetail.latestTriage;
    if (lastSavedTriage?.encounterId === activeEncounter?.id) return lastSavedTriage;
    return null;
  }, [encounterDetail?.latestTriage, lastSavedTriage, activeEncounter?.id]);

  const latestTriageVitals = useMemo(() => {
    if (!encounterDetail && lastSavedTriage?.vitalsSnapshot) {
      return lastSavedTriage.vitalsSnapshot;
    }
    const triage = encounterDetail?.latestTriage;
    if (triage?.vitalsSnapshot && triageVitalsHasValues(triage.vitalsSnapshot)) {
      return triage.vitalsSnapshot;
    }
    const list = encounterDetail?.vitalSigns;
    if (!Array.isArray(list) || list.length === 0) return null;
    if (triage?.id) {
      const linked = list.find((v: any) => v.triageId === triage.id);
      if (linked && triageVitalsHasValues(linked)) return linked;
    }
    const latest = [...list].sort(
      (a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0];
    return triageVitalsHasValues(latest) ? latest : null;
  }, [encounterDetail, lastSavedTriage]);

  const clinicalDiscriminatorLabels = useMemo(
    () => resolveClinicalDiscriminatorLabels(latestEncounterTriage?.clinicalDiscriminators),
    [latestEncounterTriage?.clinicalDiscriminators],
  );

  useEffect(() => {
    if (!activeEncounter?.id) return;
    form.setValue("visitType", activeEncounter.visitType);
    form.setValue("modality", activeEncounter.modality);
    if (activeEncounter.visitDate) {
      form.setValue("visitDate", new Date(activeEncounter.visitDate));
    }
  }, [activeEncounter?.id, activeEncounter?.visitType, activeEncounter?.modality, activeEncounter?.visitDate, form]);

  useEffect(() => {
    if (!activeEncounter?.id || skipVisitTriageGuardRef.current) return;
    if (showTriageTab) setActiveTab("triage");
    else if (showVitalsTab) setActiveTab("vitals");
    else if (showClinicalTab) setActiveTab("visit");
  }, [activeEncounter?.id, showTriageTab, showVitalsTab, showClinicalTab]);

  const openEncounterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId) throw new Error("Select a patient first");
      const res = await fetchWithTimeout("/api/encounters/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: selectedPatientId,
          locationId: locationId || null,
          visitType: openVisitType,
          modality: openModality,
          triageRequired: openTriageRequired,
          visitDate: new Date(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Failed to open encounter");
      }
      return res.json();
    },
    onSuccess: (enc) => {
      const def = getEncounterTypeDefinition(enc.visitType as EncounterType);
      toast({
        title: "Encounter opened",
        description: `${def.label} — complete steps then discharge.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters", enc.id] });
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  const editEncounterHeaderMutation = useMutation({
    mutationFn: async (payload: { visitType: EncounterType; modality: EncounterModality; triageRequired: boolean }) => {
      if (!activeEncounter?.id) throw new Error("No active encounter");
      const res = await fetchWithTimeout(`/api/encounters/${activeEncounter.id}/header`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Failed to update encounter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Encounter updated" });
      setEditEncounterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters", activeEncounter?.id] });
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  const cancelEncounterMutation = useMutation({
    mutationFn: async (encounterId: string) => {
      const res = await fetchWithTimeout(`/api/encounters/${encounterId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Failed to cancel encounter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Encounter cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      setLastSavedTriage(null);
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  const handleTabChange = (value: string) => {
    if (!activeEncounter?.id) {
      toast({
        title: "Start encounter first",
        description: "Open an encounter for this patient before documenting care.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab(value);
  };

  // Triage form (SATS) – acuity and tewsScore are set from Part 1+2 before submit. Omit recordedBy (set by server).
  const { data: referralFacilitiesList = [] } = useQuery({
    queryKey: ["/api/referral-facilities"],
    queryFn: async () => {
      const res = await fetch("/api/referral-facilities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referral facilities");
      return res.json();
    },
  });

  const triageVitalsLoading = encounterDetailLoading;

  const triageForm = useForm({
    resolver: zodResolver(insertTriageSchema.omit({ recordedBy: true })),
    defaultValues: {
      patientId: "",
      locationId: locationId || "",
      encounterId: "",
      triageAt: new Date(),
      acuity: "green" as Acuity,
      tewsScore: 0,
      clinicalDiscriminators: "[]",
      presentingComplaint: "",
      notes: "",
    },
  });
  useEffect(() => {
    if (selectedPatientId) triageForm.setValue("patientId", selectedPatientId);
    if (locationId) triageForm.setValue("locationId", locationId);
    if (activeEncounter?.id) triageForm.setValue("encounterId", activeEncounter.id);
  }, [selectedPatientId, locationId, activeEncounter?.id, triageForm]);
  useEffect(() => {
    triageForm.setValue("tewsScore", tewsScore);
    triageForm.setValue("acuity", finalAcuity);
    triageForm.setValue("clinicalDiscriminators", JSON.stringify(selectedDiscriminators));
  }, [tewsScore, finalAcuity, selectedDiscriminators, triageForm]);

  const persistOfflineTriageRecord = useCallback(
    async (triageData: any, vitalsAtTriage?: Record<string, unknown>) => {
      const tenantId =
        (user as any)?.tenantId && typeof (user as any)?.tenantId === "string"
          ? (user as any).tenantId
          : "";
      const userId =
        (user as any)?.id && typeof (user as any)?.id === "string"
          ? (user as any).id
          : "";

      const clientTriageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `triage_${Date.now()}`;

      const offlineTriageRecord = {
        id: clientTriageId,
        ...triageData,
        patientId: triageData.patientId,
        locationId,
        triageAt: triageData.triageAt,
        vitalsSnapshot: vitalsAtTriage ?? null,
        createdOfflineAt: new Date().toISOString(),
        pendingSync: true,
      };

      await queueOfflineTriageWithLocalRow(
        {
          entityType: "triage",
          operationType: "CREATE",
          tenantId,
          userId,
          clientId: clientTriageId,
          payload: {
            triageData: {
              ...triageData,
              recordedBy: (user as any)?.id,
            },
            vitalsAtTriage: vitalsAtTriage
              ? {
                  ...vitalsAtTriage,
                  locationId: locationId,
                  recordedBy: (user as any)?.id,
                }
              : undefined,
          },
        },
        offlineTriageRecord as Record<string, unknown>,
      );

      if (triageData.patientId) {
        setIdbTriageForPatient((prev) => {
          const rest = prev.filter((r: any) => r.id !== clientTriageId);
          return [...rest, offlineTriageRecord];
        });
      }

      return offlineTriageRecord;
    },
    [user, locationId],
  );

  const createTriageMutation = useMutation({
    mutationFn: async (payload: { triageData: any; vitalsAtTriage?: Record<string, unknown> }) => {
      const { triageData, vitalsAtTriage } = payload;
      const online =
        typeof navigator === "undefined" ? true : navigator.onLine;

      // True offline: never call the API (avoids hanging fetches when navigator.onLine is wrong)
      if (!online) {
        return await persistOfflineTriageRecord(triageData, vitalsAtTriage);
      }

      try {
        const vitalsPayload = vitalsAtTriage
          ? {
              ...vitalsAtTriage,
              recordedAt: triageData.triageAt,
            }
          : undefined;

        const res = await fetchWithTimeout("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...triageData,
            recordedBy: (user as any)?.id,
            vitalsAtTriage: vitalsPayload,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.message || "Failed to create triage");
        }
        return await res.json();
      } catch (error) {
        if (!isLikelyNetworkFailure(error)) {
          throw error;
        }
        return await persistOfflineTriageRecord(triageData, vitalsAtTriage);
      }
    },
    onSuccess: (triageRecord, variables) => {
      const isOffline =
        triageRecord?.pendingSync === true ||
        (typeof navigator !== "undefined" && !navigator.onLine);
      toast({
        title: isOffline ? "Saved offline" : "Success",
        description: isOffline
          ? "Triage has been stored locally and will sync when you're back online."
          : "Triage record created",
      });
      skipVisitTriageGuardRef.current = true;
      flushSync(() => {
        setLastSavedTriage({
          ...triageRecord,
          vitalsSnapshot: variables.vitalsAtTriage ?? triageRecord.vitalsSnapshot ?? null,
        });
        if (triageRecord?.presentingComplaint) {
          form.setValue("chiefComplaint", triageRecord.presentingComplaint);
        }
        if (triageRecord?.triageAt) {
          form.setValue("visitDate", new Date(triageRecord.triageAt));
        }
      });
      triageForm.reset();
      setTriageVitals({
        mobility: "",
        rr: "",
        hr: "",
        systolicBp: "",
        diastolicBp: "",
        temp: "",
        avpu: "",
        trauma: "",
        oxygenSaturation: "",
        glucose: "",
        glucoseContext: "",
        painScore: "",
        weight: "",
        height: "",
      });
      setSelectedDiscriminators([]);
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs"] });
      if (activeEncounter?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/encounters", activeEncounter.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      }
      window.setTimeout(() => {
        if (showClinicalTab) setActiveTab("visit");
        window.setTimeout(() => {
          skipVisitTriageGuardRef.current = false;
        }, 0);
      }, 0);
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  // Vitals-only form. Omit recordedBy (set by server).
  const vitalsOnlyForm = useForm({
    resolver: zodResolver(insertVitalSignsSchema.omit({ recordedBy: true })),
    defaultValues: {
      patientId: "",
      locationId: locationId || "",
      encounterId: "",
      recordedAt: new Date(),
      bloodPressureSystolic: undefined as number | undefined,
      bloodPressureDiastolic: undefined as number | undefined,
      heartRate: undefined as number | undefined,
      temperature: "",
      respiratoryRate: undefined as number | undefined,
      oxygenSaturation: undefined as number | undefined,
      glucoseLevel: undefined as number | undefined,
      glucoseContext: undefined as GlucoseContext | undefined,
      painScore: undefined as number | undefined,
      weight: "",
      height: "",
      notes: "",
    },
  });
  useEffect(() => {
    if (selectedPatientId) vitalsOnlyForm.setValue("patientId", selectedPatientId);
    if (locationId) vitalsOnlyForm.setValue("locationId", locationId);
    if (activeEncounter?.id) vitalsOnlyForm.setValue("encounterId", activeEncounter.id);
  }, [selectedPatientId, locationId, activeEncounter?.id, vitalsOnlyForm]);

  const dischargeEncounterMutation = useMutation({
    mutationFn: async (disposition: string) => {
      if (!activeEncounter?.id) throw new Error("No active encounter");
      const res = await fetchWithTimeout(`/api/encounters/${activeEncounter.id}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          disposition,
          dispositionDateTime: new Date(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Failed to discharge encounter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Encounter discharged", description: "Episode closed." });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      if (selectedPatientId) {
        window.location.href = `/patient/${selectedPatientId}`;
      }
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  const createVitalsOnlyMutation = useMutation({
    mutationFn: async (data: any) => {
      const isOnline =
        typeof navigator === "undefined" ? true : navigator.onLine;

      if (isOnline) {
        try {
          const res = await fetchWithTimeout("/api/vital-signs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...data, recordedBy: (user as any)?.id }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any)?.message || "Failed to record vitals");
          }
          return res.json();
        } catch (error) {
          if (!isLikelyNetworkFailure(error)) {
            throw error;
          }
          // fall through to offline queue
        }
      }

      const tenantId =
        (user as any)?.tenantId && typeof (user as any)?.tenantId === "string"
          ? (user as any).tenantId
          : "";
      const userId =
        (user as any)?.id && typeof (user as any)?.id === "string"
          ? (user as any).id
          : "";

      const clientVitalsId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `vitals_${Date.now()}`;

      await queueOfflineOperation({
        entityType: "vitalSigns",
        operationType: "CREATE",
        tenantId,
        userId,
        clientId: clientVitalsId,
        payload: {
          ...data,
          recordedBy: (user as any)?.id,
        },
      });

      return {
        id: clientVitalsId,
        ...data,
        createdOfflineAt: new Date().toISOString(),
        pendingSync: true,
      };
    },
    onSuccess: () => {
      const isOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      toast({
        title: isOffline ? "Saved offline" : "Success",
        description: isOffline
          ? "Vitals have been stored locally and will sync when you're back online."
          : "Vitals recorded",
      });
      vitalsOnlyForm.reset({ ...vitalsOnlyForm.getValues(), recordedAt: new Date() });
      queryClient.invalidateQueries({ queryKey: ["/api/vital-signs"] });
      if (activeEncounter?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/encounters", activeEncounter.id] });
      }
    },
    onError: (e) => {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    },
  });

  const saveEncounterMutation = useMutation({
    mutationFn: async (payload: EncounterDocumentationPayload) => {
      if (!activeEncounter?.id) throw new Error("No active encounter");
      return persistEncounterDocumentation(activeEncounter.id, payload, {
        userId: (user as { id?: string })?.id,
        triageId: latestEncounterTriage?.id,
        patientId: activeEncounter.patientId ?? selectedPatientId ?? undefined,
        locationId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Documentation saved",
        description: "Encounter updated. Discharge when the visit is complete.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters", activeEncounter?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
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
        description: (error as Error).message || "Failed to save encounter.",
        variant: "destructive",
      });
    },
  });

  const saveAndDischargeEncounterMutation = useMutation({
    mutationFn: async (payload: EncounterDocumentationPayload) => {
      if (!activeEncounter?.id) throw new Error("No active encounter");
      const encId = activeEncounter.id;

      await persistEncounterDocumentation(encId, payload, {
        userId: (user as { id?: string })?.id,
        triageId: latestEncounterTriage?.id,
        patientId: activeEncounter.patientId ?? selectedPatientId ?? undefined,
        locationId,
      });

      const { visitData } = payload;
      const dischargeRes = await fetchWithTimeout(`/api/encounters/${encId}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          disposition: visitData.disposition,
          dispositionDateTime: visitData.dispositionDateTime ?? new Date(),
          chiefComplaint: visitData.chiefComplaint,
          workRestrictions: visitData.workRestrictions,
          followUpDate: visitData.followUpDate,
          followUpInstructions: visitData.followUpInstructions,
          followUpRequired: visitData.followUpRequired,
          transferFacilityId: visitData.transferFacilityId,
          transferFacilityOther: visitData.transferFacilityOther,
          ambulanceUsed: visitData.ambulanceUsed,
          notes: visitData.notes,
        }),
      });
      if (!dischargeRes.ok) {
        const err = await dischargeRes.json().catch(() => ({}));
        throw new Error((err as { message?: string })?.message || "Failed to discharge encounter");
      }
      return dischargeRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Encounter complete",
        description: "Clinical documentation saved and encounter discharged.",
      });
      form.reset();
      setItemsUsed([]);
      setLastSavedTriage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/encounters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/encounters/active", selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      if (selectedPatientId) {
        window.location.href = `/patient/${selectedPatientId}`;
      }
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
        description: (error as Error).message || "Failed to save encounter.",
        variant: "destructive",
      });
    },
  });

  const submitEncounterMutation = isEmbedMode
    ? saveEncounterMutation
    : saveAndDischargeEncounterMutation;

  const onSubmit = (data: any) => {
    if (!activeEncounter?.id) {
      toast({
        title: "No active encounter",
        description: "Open an encounter for this patient before saving clinical documentation.",
        variant: "destructive",
      });
      return;
    }

    // Validate patientId
    if (!data.patientId) {
      toast({
        title: "Patient Required",
        description: "Please select a patient before submitting the form.",
        variant: "destructive",
      });
      return;
    }
    
    // When using simple assessment form, do not store primary survey or SAMPLE
    const useSimpleForm = !useSurveyForm;
    let sampleHistory = useSimpleForm ? "" : data.sampleHistory;
    let primarySurvey = useSimpleForm ? "" : data.primarySurvey;

    if (!useSimpleForm && data.chiefComplaint && typeof sampleHistory === "string") {
      try {
        const parsed = JSON.parse(sampleHistory || "{}") as Record<string, string>;
        if (!parsed.S?.trim()) {
          parsed.S = data.chiefComplaint.trim();
          sampleHistory = JSON.stringify(parsed);
        }
      } catch {
        /* leave as-is */
      }
    }

    // Convert string values to numbers for integer fields, keeping undefined for empty strings. Link visit to triage when present.
    const processedData = {
      ...data,
      visitType: activeEncounter.visitType,
      modality: activeEncounter.modality,
      primarySurvey: useSimpleForm ? "" : primarySurvey,
      sampleHistory,
      triageId: latestEncounterTriage?.id ?? undefined,
      bloodPressureSystolic: data.bloodPressureSystolic ? parseInt(String(data.bloodPressureSystolic)) : undefined,
      bloodPressureDiastolic: data.bloodPressureDiastolic ? parseInt(String(data.bloodPressureDiastolic)) : undefined,
      heartRate: data.heartRate ? parseInt(String(data.heartRate)) : undefined,
      respiratoryRate: data.respiratoryRate ? parseInt(String(data.respiratoryRate)) : undefined,
      oxygenSaturation: data.oxygenSaturation ? parseInt(String(data.oxygenSaturation)) : undefined,
      glucoseLevel: data.glucoseLevel ? parseGlucoseLevelInput(String(data.glucoseLevel)) : undefined,
      glucoseContext: data.glucoseContext || undefined,
      painScore: data.painScore ? parseInt(String(data.painScore)) : undefined,
      // Convert followUpDate string to Date object if provided
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      followUpRequired: data.followUpRequired ?? false,
      dispositionDateTime: data.dispositionDateTime ? new Date(data.dispositionDateTime) : undefined,
      transferFacilityId: data.disposition === "transferred_to_hospital" ? data.transferFacilityId || undefined : undefined,
      transferFacilityOther: data.disposition === "transferred_to_hospital_other" ? (data.transferFacilityOther || "").trim() || undefined : undefined,
      ambulanceUsed: isHospitalTransferDisposition(data.disposition) ? !!data.ambulanceUsed : false,
    };

    submitEncounterMutation.mutate({
      visitData: processedData,
      itemsUsed: itemsUsed.filter((l) => l.itemId && l.quantity > 0).map(({ itemId, quantity }) => ({ itemId, quantity })),
    });
  };

  return (
    <div
      className={
        isEmbedMode
          ? "space-y-4 p-2 sm:p-3 bg-white min-h-0"
          : "space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray"
      }
    >
        {!isEmbedMode && (
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <Button variant="outline" size="sm" className="w-fit" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">New Encounter</h2>
            <p className="text-mineaid-gray mt-1 text-sm sm:text-base">Open an encounter, document care, then discharge</p>
          </div>
        </div>
        )}

        <Form {...form}>
          <div className="space-y-8">
            {/* Patient Selection */}
            {!isEmbedMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatientData ? (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Patient</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>Name:</strong> {(selectedPatientData as any)?.employee?.firstName || 'Unknown'} {(selectedPatientData as any)?.employee?.lastName || 'Employee'}</p>
                      <p><strong>Employee ID:</strong> {(selectedPatientData as any)?.employee?.employeeNumber || 'N/A'}</p>
                      <p><strong>Department:</strong> {(selectedPatientData as any)?.employee?.department || 'N/A'}</p>
                      <p><strong>Company:</strong> {(selectedPatientData as any)?.company?.name || 'N/A'}</p>
                    </div>
                  </div>
                ) : null}
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient *</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search patients by name or employee ID..."
                              value={patientSearchQuery}
                              onChange={(e) => setPatientSearchQuery(e.target.value)}
                              className="pl-10 w-full"
                            />
                          </div>
                          <FormControl className="w-full sm:w-64 shrink-0">
                            <Select value={field.value || ""} onValueChange={(value) => {
                              field.onChange(value);
                              handlePatientSelect(value);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select patient...">
                                  {field.value && (() => {
                                    const selectedPatient = patients.find((p) => p.patient.id === field.value);
                                    return selectedPatient ? (
                                      <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4" />
                                        <span>
                                          {selectedPatient.employee?.firstName} {selectedPatient.employee?.lastName}
                                          {selectedPatient.employee?.employeeNumber && ` (${selectedPatient.employee.employeeNumber})`}
                                        </span>
                                      </div>
                                    ) : null;
                                  })()}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {patientsLoading ? (
                                  <div className="p-4 text-center text-mineaid-gray">
                                    <div className="animate-spin h-4 w-4 border-2 border-mineaid-navy border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Loading patients...
                                  </div>
                                ) : filteredPatients.length > 0 ? (
                                  filteredPatients.map((patientData: any) => {
                                    const { patient, employee, company } = patientData;
                                    return (
                                      <SelectItem key={patient.id} value={patient.id}>
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-mineaid-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                              {employee?.firstName?.charAt(0) || 'U'}{employee?.lastName?.charAt(0) || 'N'}
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900">
                                                {employee?.firstName || 'Unknown'} {employee?.lastName || 'Employee'}
                                              </p>
                                              <p className="text-xs text-mineaid-gray">
                                                {employee?.employeeNumber || 'N/A'} • {employee?.jobTitle || employee?.position || 'N/A'}
                                              </p>
                                              {company?.name && (
                                                <p className="text-xs text-mineaid-gray">{company.name}</p>
                                              )}
                                            </div>
                                          </div>
                                          <Badge 
                                            variant={patient.status === 'active' ? 'default' : 
                                                   patient.status === 'cleared' ? 'secondary' : 'destructive'}
                                            className="text-xs"
                                          >
                                            {patient.status}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    );
                                  })
                                ) : (
                                  <div className="p-4 text-center text-mineaid-gray">
                                    {patientSearchQuery ? 'No patients match your search' : 'No patients found'}
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
                </div>
              </CardContent>
            </Card>
            )}

            {!isEmbedMode && selectedPatientId ? (
              <PatientMessagingPanel
                patientId={selectedPatientId}
                encounterId={activeEncounter?.id}
                patientName={
                  selectedPatientData
                    ? `${(selectedPatientData as { employee?: { firstName?: string; lastName?: string } }).employee?.firstName ?? ""} ${(selectedPatientData as { employee?: { firstName?: string; lastName?: string } }).employee?.lastName ?? ""}`.trim()
                    : undefined
                }
              />
            ) : null}

            {isEmbedMode && selectedPatientId && selectedPatientData && (
              <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-mineaid-navy">
                  {(selectedPatientData as any)?.employee?.firstName}{" "}
                  {(selectedPatientData as any)?.employee?.lastName}
                </span>
                {(selectedPatientData as any)?.employee?.employeeNumber ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · ID {(selectedPatientData as any).employee.employeeNumber}
                  </span>
                ) : null}
              </div>
            )}

            {isEmbedMode && selectedPatientId && !activeEncounter?.id && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading encounter documentation…
              </div>
            )}

            {!isEmbedMode && !activeEncounter?.id && selectedPatientId && (
              <Card>
                <CardHeader>
                  <CardTitle>Start encounter</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Open a clinical episode before triage, vitals, or documentation. One encounter = one case.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Encounter type</Label>
                      <select
                        value={openVisitType}
                        onChange={(e) => setOpenVisitType(e.target.value as EncounterType)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {ENCOUNTER_OPEN_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ENCOUNTER_OPEN_TYPES.find((t) => t.value === openVisitType)?.description}
                      </p>
                    </div>
                    <div>
                      <Label>Care modality</Label>
                      <select
                        value={openModality}
                        onChange={(e) => setOpenModality(e.target.value as EncounterModality)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="in_person">In person</option>
                        <option value="telehealth">Telehealth</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="open-triage-required"
                      checked={openTriageRequired}
                      onCheckedChange={(v) => setOpenTriageRequired(v === true)}
                    />
                    <Label htmlFor="open-triage-required" className="text-sm font-normal cursor-pointer">
                      Require triage / baseline assessment (SATS or vitals)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Suggested for this type: {defaultTriageRequired(openVisitType, openModality) ? "Yes" : "No"} — you can override.
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="bg-mineaid-navy hover:bg-mineaid-navy/90"
                      disabled={openEncounterMutation.isPending}
                      onClick={() => openEncounterMutation.mutate()}
                    >
                      {openEncounterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Start encounter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeEncounter?.id && !isEmbedMode && (
              <Card className="border-mineaid-navy/30 bg-white">
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-mineaid-navy">Active encounter</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEncounterType(activeEncounter.visitType)} · {activeEncounter.modality?.replace(/_/g, " ")} ·{" "}
                      {formatEncounterStatus(activeEncounter.status)}
                      {activeEncounter.triageRequired ? " · triage required" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditEncounterOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cancelEncounterMutation.isPending}
                      onClick={() => cancelEncounterMutation.mutate(activeEncounter.id)}
                    >
                      Cancel encounter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showTelehealthVideoLink && (
              <Card className="mb-4 border-blue-200 bg-blue-50/40">
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Video className="h-5 w-5 text-mineaid-navy shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-mineaid-navy">Telehealth visit in progress</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Document the encounter here, then return to the video room when needed.
                      </p>
                    </div>
                  </div>
                  <Link href={`/telecare/${activeTelecareSessionId}`}>
                    <Button type="button" size="sm" variant="default" className="bg-mineaid-navy hover:bg-mineaid-navy/90">
                      <Video className="h-4 w-4 mr-1" />
                      Return to video
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {activeEncounter?.id && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <div className="tabs-list-custom mb-6">
                    <TabsList
                      className={`grid w-full bg-transparent h-auto p-1 gap-1 lg:gap-2`}
                      style={{
                        gridTemplateColumns: `repeat(${[showTriageTab, showVitalsTab, showClinicalTab].filter(Boolean).length || 1}, minmax(0, 1fr))`,
                      }}
                    >
                      {showTriageTab && (
                      <TabsTrigger value="triage" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Triage
                      </TabsTrigger>
                      )}
                      {showVitalsTab && (
                      <TabsTrigger value="vitals" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                        <Thermometer className="h-4 w-4" />
                        Vitals
                      </TabsTrigger>
                      )}
                      {showClinicalTab && (
                      <TabsTrigger value="visit" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                        <Stethoscope className="h-4 w-4" />
                        {modalityWatch === "telehealth" ? "Telehealth" : "Clinical"}
                      </TabsTrigger>
                      )}
                    </TabsList>
                    {!isEmbedMode && (
                    <p className="text-xs text-mineaid-gray mt-2 px-1">
                      {encounterTypeDef.label} — document care, then discharge to close this encounter.
                    </p>
                    )}
                    {isEmbedMode && showClinicalTab ? (
                    <p className="text-xs text-mineaid-gray mt-2 px-1">
                      Document during the video visit. Saving keeps the encounter open — discharge after the call ends.
                    </p>
                    ) : null}
                  </div>

                  <TabsContent value="triage" className="space-y-4 mt-0">
                    <Form {...triageForm}>
                      <form
                        onSubmit={triageForm.handleSubmit(
                          async (data) => {
                            if (!selectedPatientId) {
                              toast({
                                title: "Select patient",
                                description: "Please select a patient first.",
                                variant: "destructive",
                              });
                              return;
                            }

                            if (!activeEncounter?.id) {
                              toast({
                                title: "No active encounter",
                                description: "Start an encounter before recording triage.",
                                variant: "destructive",
                              });
                              return;
                            }

                            const payload = {
                              ...data,
                              patientId: selectedPatientId,
                              locationId: locationId || data.locationId,
                              encounterId: activeEncounter.id,
                              tewsScore,
                              acuity: finalAcuity,
                              clinicalDiscriminators: JSON.stringify(
                                selectedDiscriminators.length
                                  ? selectedDiscriminators
                                  : [],
                              ),
                            };
                            const triageAt =
                              data.triageAt instanceof Date
                                ? data.triageAt
                                : new Date(data.triageAt);
                            const vitalsAtTriage = buildVitalsAtTriagePayload(triageVitals);

                            createTriageMutation.mutate({
                              triageData: { ...payload, triageAt },
                              vitalsAtTriage,
                            });
                          },
                          (errors) => {
                            toast({
                              title: "Validation error",
                              description:
                                Object.values(errors)
                                  .map((e) => e?.message)
                                  .filter(Boolean)
                                  .join(". ") || "Please check the form.",
                              variant: "destructive",
                            });
                          },
                        )}
                        className="space-y-6"
                      >
                        <Card>
                          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={triageForm.control} name="triageAt" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Triage date/time *</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={triageForm.control} name="presentingComplaint" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Presenting complaint</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Chief complaint at triage" rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Part 1 – Vitals & TEWS</CardTitle>
                            <p className="text-sm text-muted-foreground">Enter values; scores auto-calculate and sum to TEWS. TEWS auto-assigns physiology acuity.</p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4">
                              <div className="overflow-x-auto min-w-0 rounded-lg border-2 border-gray-100 bg-white p-5 ">
                                <table className="w-full text-sm border-collapse table-fixed">
                                  <colgroup>
                                    <col className="w-1/3" />
                                    <col className="w-1/3" />
                                    <col className="w-1/3" />
                                  </colgroup>
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2 pr-4">Triage Parameter</th>
                                      <th className="text-left py-2 pr-4">Measured Value</th>
                                      <th className="text-center py-2">TEWS Score</th>
                                    </tr>
                                  </thead>
                                  <tbody className="[&_tr]:border-b">
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Mobility</td>
                                      <td className="py-2 pr-4">
                                        <Select value={triageVitals.mobility} onValueChange={(v) => setTriageVitals((s) => ({ ...s, mobility: v }))}>
                                          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                          <SelectContent>
                                            {TRIAGE_MOBILITY.map((o) => (
                                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="text-center py-2">{TRIAGE_MOBILITY.find((o) => o.value === triageVitals.mobility)?.score ?? "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Respiratory Rate (cpm)</td>
                                      <td className="py-2 pr-4">
                                        <Input type="number" min={0} className="h-9 w-full" placeholder="e.g. 16" value={triageVitals.rr === "" ? "" : triageVitals.rr} onChange={(e) => setTriageVitals((s) => ({ ...s, rr: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                      </td>
                                      <td className="text-center py-2">{triageVitals.rr !== "" ? scoreRR(triageVitals.rr) : "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Heart Rate (bpm)</td>
                                      <td className="py-2 pr-4">
                                        <Input type="number" min={0} className="h-9 w-full" placeholder="e.g. 72" value={triageVitals.hr === "" ? "" : triageVitals.hr} onChange={(e) => setTriageVitals((s) => ({ ...s, hr: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                      </td>
                                      <td className="text-center py-2">{triageVitals.hr !== "" ? scoreHR(triageVitals.hr) : "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Blood pressure (mmHg)</td>
                                      <td className="py-2 pr-4">
                                        <div className="flex gap-2 items-center">
                                          <Input type="number" min={0} className="h-9 flex-1" placeholder="Sys 120" value={triageVitals.systolicBp === "" ? "" : triageVitals.systolicBp} onChange={(e) => setTriageVitals((s) => ({ ...s, systolicBp: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                          <span className="text-muted-foreground">/</span>
                                          <Input type="number" min={0} className="h-9 flex-1" placeholder="Dias 80" value={triageVitals.diastolicBp === "" ? "" : triageVitals.diastolicBp} onChange={(e) => setTriageVitals((s) => ({ ...s, diastolicBp: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                        </div>
                                      </td>
                                      <td className="text-center py-2">{triageVitals.systolicBp !== "" ? scoreSystolic(triageVitals.systolicBp) : "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Temperature (°C)</td>
                                      <td className="py-2 pr-4">
                                        <Input type="number" step={0.1} className="h-9 w-full" placeholder="e.g. 36.5" value={triageVitals.temp === "" ? "" : triageVitals.temp} onChange={(e) => setTriageVitals((s) => ({ ...s, temp: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))} />
                                      </td>
                                      <td className="text-center py-2">{triageVitals.temp !== "" ? scoreTemp(triageVitals.temp) : "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">AVPU</td>
                                      <td className="py-2 pr-4">
                                        <Select value={triageVitals.avpu} onValueChange={(v) => setTriageVitals((s) => ({ ...s, avpu: v }))}>
                                          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                          <SelectContent>
                                            {TRIAGE_AVPU.map((o) => (
                                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="text-center py-2">{TRIAGE_AVPU.find((o) => o.value === triageVitals.avpu)?.score ?? "-"}</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-4 font-medium align-top">Trauma</td>
                                      <td className="py-2 pr-4">
                                        <Select value={triageVitals.trauma} onValueChange={(v) => setTriageVitals((s) => ({ ...s, trauma: v }))}>
                                          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                          <SelectContent>
                                            {TRIAGE_TRAUMA.map((o) => (
                                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="text-center py-2">{TRIAGE_TRAUMA.find((o) => o.value === triageVitals.trauma)?.score ?? "-"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="overflow-x-auto min-w-0 rounded-lg border-2 border-gray-100 bg-white p-5 ">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2 pr-2">Other Vitals</th>
                                      <th className="text-left py-2">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="[&_tr]:border-b">
                                    <tr>
                                      <td className="p-2 pr-2 font-medium align-top">Oxygen saturation (%)</td>
                                      <td className="py-2">
                                        <Input type="number" min={0} max={100} className="h-9 w-full" placeholder="e.g. 98" value={triageVitals.oxygenSaturation === "" ? "" : triageVitals.oxygenSaturation} onChange={(e) => setTriageVitals((s) => ({ ...s, oxygenSaturation: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-2 font-medium align-top">Glucose (mmol/L)</td>
                                      <td className="py-2">
                                        <GlucoseInputFields
                                          compact
                                          levelValue={triageVitals.glucose === "" ? "" : triageVitals.glucose}
                                          contextValue={triageVitals.glucoseContext}
                                          onLevelChange={(v) =>
                                            setTriageVitals((s) => ({
                                              ...s,
                                              glucose: v === undefined ? "" : v,
                                            }))
                                          }
                                          onContextChange={(v) =>
                                            setTriageVitals((s) => ({ ...s, glucoseContext: v }))
                                          }
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-2 font-medium align-top">Pain score (0–10)</td>
                                      <td className="py-2">
                                        <Input type="number" min={0} max={10} className="h-9 w-full" placeholder="0" value={triageVitals.painScore === "" ? "" : triageVitals.painScore} onChange={(e) => setTriageVitals((s) => ({ ...s, painScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-2 font-medium align-top">Weight (kg)</td>
                                      <td className="py-2">
                                        <Input className="h-9 w-full" placeholder="e.g. 70" value={triageVitals.weight} onChange={(e) => setTriageVitals((s) => ({ ...s, weight: e.target.value }))} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 pr-2 font-medium align-top">Height (cm)</td>
                                      <td className="py-2">
                                        <Input className="h-9 w-full" placeholder="e.g. 175" value={triageVitals.height} onChange={(e) => setTriageVitals((s) => ({ ...s, height: e.target.value }))} />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Label className="font-medium">TEWS total</Label>
                                <Input type="text" readOnly className="h-9 w-16 bg-muted" value={tewsScore} />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="font-medium">TEWS acuity</Label>
                                <Badge className={SATS_ACUITY_OPTIONS.find((o) => o.value === tewsAcuity)?.color}>{SATS_ACUITY_OPTIONS.find((o) => o.value === tewsAcuity)?.label ?? tewsAcuity}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Part 2 – Discriminators</CardTitle>
                            <p className="text-sm text-muted-foreground">Select one or more; each maps to an acuity. Final triage (Part 3) is set from the selected discriminator(s).</p>
                          </CardHeader>
                          <CardContent>
                            <Select
                              value={selectedDiscriminators[0] ?? ""}
                              onValueChange={(v) => {
                                if (!v) return;
                                setSelectedDiscriminators((prev) => (prev.includes(v) ? prev : [...prev, v]));
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Add a discriminator..." /></SelectTrigger>
                              <SelectContent>
                                {SATS_DISCRIMINATORS.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.label} → {d.acuity}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedDiscriminators.length > 0 && (
                              <ul className="mt-2 flex flex-wrap gap-2">
                                {selectedDiscriminators.map((id) => {
                                  const d = SATS_DISCRIMINATORS.find((x) => x.id === id);
                                  return d ? (
                                    <li key={id}>
                                      <Badge variant="secondary" className="gap-1">
                                        {d.label}
                                        <button type="button" className="ml-1 rounded hover:bg-muted" onClick={() => setSelectedDiscriminators((prev) => prev.filter((x) => x !== id))} aria-label="Remove">×</button>
                                      </Badge>
                                    </li>
                                  ) : null;
                                })}
                              </ul>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Part 3 – Final triage</CardTitle>
                            <p className="text-sm text-muted-foreground">Auto-assigned from discriminator(s). If none selected, uses TEWS acuity.</p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Label className="font-medium">Final acuity</Label>
                              <Badge className={SATS_ACUITY_OPTIONS.find((o) => o.value === finalAcuity)?.color}>{SATS_ACUITY_OPTIONS.find((o) => o.value === finalAcuity)?.label ?? finalAcuity}</Badge>
                            </div>
                            <FormField control={triageForm.control} name="notes" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Additional notes" rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                              <Button type="submit" disabled={createTriageMutation.isPending} className="bg-mineaid-navy hover:bg-mineaid-navy/90">
                                {createTriageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {createTriageMutation.isPending ? "Saving..." : "Save triage (re-triage allowed)"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="vitals" className="space-y-4 mt-0">
                    <Form {...vitalsOnlyForm}>
                      <form
                        onSubmit={vitalsOnlyForm.handleSubmit(
                        (data) => {
                          if (!selectedPatientId) {
                            toast({ title: "Select patient", description: "Please select a patient first.", variant: "destructive" });
                            return;
                          }
                          if (!activeEncounter?.id) {
                            toast({ title: "No active encounter", description: "Start an encounter first.", variant: "destructive" });
                            return;
                          }
                          createVitalsOnlyMutation.mutate({
                            ...data,
                            patientId: selectedPatientId,
                            locationId: locationId || data.locationId,
                            encounterId: activeEncounter.id,
                            recordedAt: data.recordedAt instanceof Date ? data.recordedAt : new Date(data.recordedAt),
                          });
                        },
                        (errors) => {
                          toast({ title: "Validation error", description: Object.values(errors).map((e) => (e as any)?.message).filter(Boolean).join(". ") || "Please check the form.", variant: "destructive" });
                        }
                        )}
                        className="space-y-4"
                      >
                        <Card>
                          <CardHeader><CardTitle>Vitals</CardTitle><p className="text-sm text-muted-foreground">Record vital signs for this encounter.</p></CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={vitalsOnlyForm.control} name="recordedAt" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recorded at *</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                              <div><Label className="text-xs">BP (Sys/Dias)</Label><div className="flex gap-2"><Input type="number" placeholder="120" {...vitalsOnlyForm.register("bloodPressureSystolic", { valueAsNumber: true })} /><Input type="number" placeholder="80" {...vitalsOnlyForm.register("bloodPressureDiastolic", { valueAsNumber: true })} /></div></div>
                              <FormField control={vitalsOnlyForm.control} name="heartRate" render={({ field }) => (<FormItem><FormLabel>HR (bpm)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={vitalsOnlyForm.control} name="temperature" render={({ field }) => (<FormItem><FormLabel>Temp (°C)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={vitalsOnlyForm.control} name="respiratoryRate" render={({ field }) => (<FormItem><FormLabel>RR</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={vitalsOnlyForm.control} name="oxygenSaturation" render={({ field }) => (<FormItem><FormLabel>SpO2 %</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                              <FormItem className="sm:col-span-2">
                                <GlucoseInputFields
                                  compact
                                  levelValue={vitalsOnlyForm.watch("glucoseLevel") ?? ""}
                                  contextValue={(vitalsOnlyForm.watch("glucoseContext") as GlucoseContext) ?? ""}
                                  onLevelChange={(v) => vitalsOnlyForm.setValue("glucoseLevel", v, { shouldDirty: true })}
                                  onContextChange={(v) =>
                                    vitalsOnlyForm.setValue("glucoseContext", v || undefined, { shouldDirty: true })
                                  }
                                />
                              </FormItem>
                              <FormField control={vitalsOnlyForm.control} name="painScore" render={({ field }) => (<FormItem><FormLabel>Pain (0-10)</FormLabel><FormControl><Input type="number" min={0} max={10} {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={vitalsOnlyForm.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={vitalsOnlyForm.control} name="height" render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={vitalsOnlyForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                              <Button type="submit" disabled={createVitalsOnlyMutation.isPending} className="bg-mineaid-navy hover:bg-mineaid-navy/90">
                                {createVitalsOnlyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {createVitalsOnlyMutation.isPending ? "Saving..." : "Record vitals"}
                              </Button>
                            </div>
                            {!isEmbedMode && !showClinicalTab && (
                              <div className="mt-6 pt-4 border-t space-y-3">
                                <p className="text-sm font-medium">Discharge encounter</p>
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                  <div className="flex-1">
                                    <Label>Disposition</Label>
                                    <select
                                      value={monitoringDisposition}
                                      onChange={(e) => setMonitoringDisposition(e.target.value)}
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                      {dispositionOptionsFor((activeEncounter?.modality ?? "in_person") as EncounterModality).map((d) => (
                                        <option key={d} value={d}>
                                          {DISPOSITION_LABELS[d] ?? d.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Button
                                    type="button"
                                    className="bg-mineaid-navy hover:bg-mineaid-navy/90"
                                    disabled={dischargeEncounterMutation.isPending}
                                    onClick={() => dischargeEncounterMutation.mutate(monitoringDisposition)}
                                  >
                                    {dischargeEncounterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Discharge encounter
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="visit" className="space-y-4 mt-0">
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => toast({ title: "Validation error", description: Object.values(errors).map((e) => (e as any)?.message).filter(Boolean).join(". ") || "Please check the form.", variant: "destructive" }))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="visitDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visit Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <p className="font-medium">{formatEncounterType(activeEncounter?.visitType)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(activeEncounter?.modality ?? "in_person").replace(/_/g, " ")}
                      {activeEncounter?.triageRequired ? " · triage required" : ""}
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setEditEncounterOpen(true)}
                    >
                      Change type or triage setting
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalityWatch === "telehealth" && (
                    <FormField
                      control={form.control}
                      name="patientLocationNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient location (remote)</FormLabel>
                          <FormControl>
                            <Input placeholder="Camp, site, or remote location" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Care Location - Auto-bound, uneditable */}
                {activeLocation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Care Location
                          </FormLabel>
                          <FormControl>
                            <Input
                              value={activeLocation.name || `${activeLocation.code} - ${activeLocation.name}`}
                              disabled
                              className="bg-gray-50 cursor-not-allowed"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

            {/* Triage summary & Chief Complaint – same responsive row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {latestEncounterTriage && (
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Triage summary
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-auto px-3 py-1.5"
                    onClick={() => setShowTriageDetails((prev) => !prev)}
                  >
                    {showTriageDetails ? "Hide details" : "View more"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Acuity:</span>
                    <Badge className={SATS_ACUITY_OPTIONS.find((o) => o.value === latestEncounterTriage.acuity)?.color}>
                      {SATS_ACUITY_OPTIONS.find((o) => o.value === latestEncounterTriage.acuity)?.label ?? latestEncounterTriage.acuity}
                    </Badge>
                  </div>
                  <p><span className="font-medium">TEWS:</span> {latestEncounterTriage.tewsScore ?? "–"}</p>
                  <p><span className="font-medium">Presenting complaint:</span> {latestEncounterTriage.presentingComplaint || "–"}</p>

                  {showTriageDetails && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        Recorded at{" "}
                        {latestEncounterTriage.triageAt
                          ? format(new Date(latestEncounterTriage.triageAt), "MMM dd, yyyy HH:mm")
                          : "–"}
                      </p>

                      {clinicalDiscriminatorLabels.length > 0 ? (
                        <div>
                          <p className="font-medium text-xs text-gray-600 mb-1">Clinical discriminators</p>
                          <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">
                            {clinicalDiscriminatorLabels.map((label) => (
                              <li key={label}>{label}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {latestEncounterTriage.notes && (
                        <div>
                          <p className="font-medium text-xs text-gray-600 mb-1">Triage notes</p>
                          <p className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                            {latestEncounterTriage.notes}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-xs text-gray-600 mb-1">Vitals at triage</p>
                        {triageVitalsLoading && !latestTriageVitals ? (
                          <p className="text-xs text-muted-foreground">Loading vitals…</p>
                        ) : triageVitalsHasValues(latestTriageVitals) ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-gray-800">
                            <div>
                              <p className="font-medium">BP</p>
                              <p>
                                {latestTriageVitals.bloodPressureSystolic ?? "–"}/
                                {latestTriageVitals.bloodPressureDiastolic ?? "–"} mmHg
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">HR</p>
                              <p>{latestTriageVitals.heartRate ?? "–"} bpm</p>
                            </div>
                            <div>
                              <p className="font-medium">Temp</p>
                              <p>{latestTriageVitals.temperature ?? "–"} °C</p>
                            </div>
                            <div>
                              <p className="font-medium">RR</p>
                              <p>{latestTriageVitals.respiratoryRate ?? "–"} breaths/min</p>
                            </div>
                            <div>
                              <p className="font-medium">SpO₂</p>
                              <p>{latestTriageVitals.oxygenSaturation ?? "–"}%</p>
                            </div>
                            <div>
                              <p className="font-medium">Glucose</p>
                              <p>{formatGlucoseDisplay(latestTriageVitals.glucoseLevel, latestTriageVitals.glucoseContext)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Pain</p>
                              <p>
                                {latestTriageVitals.painScore ?? "–"}
                                {latestTriageVitals.painScore != null ? " / 10" : ""}
                              </p>
                            </div>
                            {latestTriageVitals.weight ? (
                              <div>
                                <p className="font-medium">Weight</p>
                                <p>{latestTriageVitals.weight} kg</p>
                              </div>
                            ) : null}
                            {latestTriageVitals.height ? (
                              <div>
                                <p className="font-medium">Height</p>
                                <p>{latestTriageVitals.height} cm</p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No vitals recorded at triage.</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chief Complaint & History */}
            <Card className={!latestEncounterTriage ? "lg:col-span-2" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  Chief Complaint & History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chief Complaint *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Patient's primary reason for visit..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="historyOfPresentIllness"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>History of Present Illness</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Detailed history of current condition..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </div>

            {/* Physical Examination & Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Physical Examination & Assessment
                </CardTitle>
                <div className="flex items-center justify-between rounded-lg border p-3 mt-3 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Use primary/secondary survey</p>
                    <p className="text-xs text-muted-foreground">When off, use a single textarea for assessment findings.</p>
                  </div>
                  <Switch
                    checked={useSurveyForm}
                    onCheckedChange={setUseSurveyForm}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {useSurveyForm ? (
                  <>
                <FormField
                  control={form.control}
                  name="primarySurvey"
                  render={({ field }) => {
                    const findings = (() => {
                      try {
                        const v = (field.value || "").trim();
                        return v ? (JSON.parse(v) as Record<string, string>) : {};
                      } catch {
                        return {};
                      }
                    })();
                    const update = (key: string, value: string) => {
                      const next = { ...findings };
                      if (value) next[key] = value;
                      else delete next[key];
                      field.onChange(JSON.stringify(next));
                    };
                    return (
                      <FormItem>
                        <FormLabel className="font-bold">Primary survey (ABCDE assessment)</FormLabel>
                        <FormDescription>Record findings for each component assessed.</FormDescription>
                        <FormControl>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(["A", "B", "C", "D", "E"] as const).map((k) => (
                              <div key={k} className="space-y-1.5">
                                <Label className="text-sm font-medium">{PRIMARY_SURVEY_LABELS[k]}</Label>
                                <Select
                                  value={findings[k] || ""}
                                  onValueChange={(v) => update(k, v)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select finding..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRIMARY_SURVEY_OPTIONS[k].map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="sampleHistory"
                  render={({ field }) => {
                    const data = (() => {
                      try {
                        const v = (field.value || "").trim();
                        return v ? (JSON.parse(v) as Record<string, string>) : {};
                      } catch {
                        return {};
                      }
                    })();
                    const chiefComplaint = form.watch("chiefComplaint") || "";
                    const update = (key: string, value: string) => {
                      const next = { ...data };
                      if (value.trim()) next[key] = value.trim();
                      else delete next[key];
                      field.onChange(JSON.stringify(next));
                    };
                    return (
                      <FormItem>
                        <FormLabel>SAMPLE history</FormLabel>
                        <FormDescription>Patient history – record each component as applicable.</FormDescription>
                        <FormControl>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SAMPLE_KEYS.map((k) => (
                              <div key={k} className="space-y-1.5">
                                <Label className="text-sm font-medium">{SAMPLE_LABELS[k]}</Label>
                                <Input
                                  value={k === "S" ? (data[k] ?? chiefComplaint ?? "") : (data[k] ?? "")}
                                  onChange={(e) => update(k, e.target.value)}
                                  placeholder="—"
                                  className="w-full"
                                />
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="physicalExamination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Secondary survey</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Document secondary survey / physical examination findings..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </>
                ) : (
                <FormField
                  control={form.control}
                  name="physicalExamination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment findings</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Document physical examination and assessment findings..." rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}
              </CardContent>
            </Card>

            {/* Impression / Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Impression / Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical assessment and diagnosis</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Clinical assessment and diagnosis..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Treatment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Treatment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="treatment"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-1">
                      <FormLabel>Treatment Provided</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Treatment procedures and interventions..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detainedAtFacility"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 lg:col-span-1">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Detained at FAP/Clinic</FormLabel>
                        <FormDescription>Was the patient kept at the medical facility?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Medications given (items used / dispensed) - inside Treatment */}
                <div className="space-y-2 lg:col-span-1">
                  <Label className="text-sm font-medium">Medications given</Label>
                  <p className="text-xs text-muted-foreground">Record supplies or medications given during this visit (optional). Type to search by name or code.</p>
                  {itemsUsed.map((line, idx) => {
                    const usedItemIds = itemsUsed.filter((_, i) => i !== idx).map((l) => l.itemId).filter(Boolean);
                    const term = (line.search || "").trim().toLowerCase();
                    const matches = term.length > 0
                      ? inventoryItems.filter(
                          (item) =>
                            !usedItemIds.includes(item.id) &&
                            (item.itemName?.toLowerCase().includes(term) || item.itemCode?.toLowerCase().includes(term))
                        ).slice(0, 12)
                      : [];
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          {line.itemId ? (
                            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
                              <span className="truncate">
                                {inventoryItems.find((i) => i.id === line.itemId)?.itemName ?? inventoryItems.find((i) => i.id === line.itemId)?.itemCode ?? line.itemId}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: "", search: "" } : r)))}
                                aria-label="Change item"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Input
                                placeholder="Search by name or code..."
                                className="pr-8"
                                value={line.search}
                                onChange={(e) => setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, search: e.target.value } : r)))}
                                onFocus={() => setItemsUsedSearchFocusedIdx(idx)}
                                onBlur={() => setTimeout(() => setItemsUsedSearchFocusedIdx(null), 150)}
                                aria-label="Search item"
                                aria-autocomplete="list"
                                aria-expanded={itemsUsedSearchFocusedIdx === idx && (line.search?.length ?? 0) > 0}
                              />
                              {itemsUsedSearchFocusedIdx === idx && (line.search?.trim().length ?? 0) > 0 && (
                                <ul
                                  className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover py-1 shadow-md"
                                  role="listbox"
                                  aria-label="Matching items"
                                >
                                  {matches.length === 0 ? (
                                    <li className="px-3 py-2 text-sm text-muted-foreground" role="option">No matching items</li>
                                  ) : (
                                    matches.map((item) => (
                                      <li
                                        key={item.id}
                                        role="option"
                                        className="cursor-pointer px-3 py-2 text-sm hover:bg-muted focus:bg-muted outline-none"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: item.id, search: "" } : r)));
                                          setItemsUsedSearchFocusedIdx(null);
                                        }}
                                      >
                                        {item.itemName} ({item.itemCode}) — {item.currentStock} {item.unitOfMeasure}
                                      </li>
                                    ))
                                  )}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          className="w-24"
                          value={line.quantity || ""}
                          onChange={(e) =>
                            setItemsUsed((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantity: parseInt(e.target.value, 10) || 0 } : r))
                            )
                          }
                          aria-label="Quantity"
                          title="Quantity"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemsUsed((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItemsUsed((prev) => [...prev, { itemId: "", quantity: 1, search: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add item
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="procedures"
                  render={({ field }) => {
                    const parseProcedures = (v: string) => {
                      if (!v || !v.trim()) return { selected: [] as string[], otherText: "" };
                      const otherMatch = v.match(/\s*;\s*Other:\s*([\s\S]*)$/);
                      const otherText = otherMatch ? otherMatch[1].trim() : "";
                      const main = otherMatch ? v.slice(0, v.indexOf("; Other:")).trim() : v.trim();
                      const selected = main ? main.split(",").map((s) => s.trim()).filter((s) => procedureNames.includes(s)) : [];
                      return { selected, otherText };
                    };
                    const buildProcedures = (selected: string[], otherText: string) =>
                      [selected.filter(Boolean).join(", "), otherText ? `Other: ${otherText}` : ""].filter(Boolean).join("; ");
                    const { selected, otherText } = parseProcedures(field.value || "");
                    return (
                      <FormItem className="lg:col-span-1">
                        <FormLabel>Procedures Performed</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between font-normal"
                                >
                                  <span className="truncate">
                                    {selected.length > 0 ? selected.join(", ") : "Select procedures..."}
                                  </span>
                                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-h-[280px] overflow-y-auto p-2" align="start">
                                <div className="grid gap-2">
                                  {procedureNames.length === 0 ? (
                                    <p className="text-sm text-muted-foreground px-2 py-2">No procedures configured. Add them in Settings → Procedures.</p>
                                  ) : (
                                    procedureNames.map((proc) => (
                                      <label
                                        key={proc}
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                      >
                                        <Checkbox
                                          checked={selected.includes(proc)}
                                          onCheckedChange={(checked) => {
                                            const next = checked ? [...selected, proc] : selected.filter((p) => p !== proc);
                                            field.onChange(buildProcedures(next, otherText));
                                          }}
                                        />
                                        {proc}
                                      </label>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            {selected.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selected.map((p) => (
                                  <Badge
                                    key={p}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <Textarea
                              placeholder="Other (specify)..."
                              rows={1}
                              value={otherText}
                              onChange={(e) => field.onChange(buildProcedures(selected, e.target.value))}
                              className="resize-none"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Disposition & Follow-up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Disposition & Follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="dispositionDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disposition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="return_to_work">Return to Work</SelectItem>
                            <SelectItem value="transferred_to_hospital">Transferred to Hospital</SelectItem>
                            <SelectItem value="transferred_to_hospital_other">Transferred to Hospital (Other)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("disposition") === "transferred_to_hospital" && (
                  <FormField
                    control={form.control}
                    name="transferFacilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer facility</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select facility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(referralFacilitiesList as { id: string; name: string }[]).map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                            {(!referralFacilitiesList || (referralFacilitiesList as any[]).length === 0) && (
                              <span className="px-2 py-1.5 text-sm text-muted-foreground">No facilities configured. Add them in Settings.</span>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("disposition") === "transferred_to_hospital_other" && (
                  <FormField
                    control={form.control}
                    name="transferFacilityOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other facility name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter hospital or facility name" value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isHospitalTransferDisposition(form.watch("disposition")) && (
                  <FormField
                    control={form.control}
                    name="ambulanceUsed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start justify-between rounded-lg border p-4 space-y-0">
                        <div className="space-y-1 leading-none">
                          <FormLabel>Ambulance used</FormLabel>
                          <FormDescription>
                            Was the patient transported by ambulance for this hospital transfer?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="workRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Restrictions</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Any work restrictions or limitations..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Follow-up required</FormLabel>
                        <FormDescription>
                          Creates an employee wellbeing follow-up and surfaces it in the follow-ups list.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Instructions</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Instructions for follow-up care..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatientData?.employee?.gender === 'female' && (
                  <FormField
                    control={form.control}
                    name="lastMenstrualPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Menstrual Period (LMP)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
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
                      <FormLabel>Clinical Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Any additional clinical notes or observations..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              {!isEmbedMode ? (
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                  Cancel
                </Button>
              ) : null}
              <Button 
                type="submit" 
                disabled={submitEncounterMutation.isPending}
                className="bg-mineaid-navy hover:bg-mineaid-navy/90"
              >
                {submitEncounterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitEncounterMutation.isPending
                  ? "Saving..."
                  : isEmbedMode
                    ? "Save documentation"
                    : "Save & discharge encounter"}
              </Button>
            </div>
                </form>
                  </TabsContent>
                </Tabs>
            )}
          </div>
        </Form>

        <Dialog open={editEncounterOpen} onOpenChange={setEditEncounterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit encounter</DialogTitle>
              <DialogDescription>
                Change encounter type, care modality, or whether triage is required. Does not cancel the encounter.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Encounter type</Label>
                <select
                  value={editVisitType}
                  onChange={(e) => setEditVisitType(e.target.value as EncounterType)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {ENCOUNTER_OPEN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Care modality</Label>
                <select
                  value={editModality}
                  onChange={(e) => setEditModality(e.target.value as EncounterModality)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="in_person">In person</option>
                  <option value="telehealth">Telehealth</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-triage-required"
                  checked={editTriageRequired}
                  onCheckedChange={(v) => setEditTriageRequired(v === true)}
                />
                <Label htmlFor="edit-triage-required" className="text-sm font-normal cursor-pointer">
                  Require triage / baseline assessment
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEncounterOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={editEncounterHeaderMutation.isPending}
                onClick={() =>
                  editEncounterHeaderMutation.mutate({
                    visitType: editVisitType,
                    modality: editModality,
                    triageRequired: editTriageRequired,
                  })
                }
              >
                {editEncounterHeaderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {!isEmbedMode && <MobileNav />}
    </div>
  );
}