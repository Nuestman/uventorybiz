import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  MoreVertical,
  PhoneCall,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCcw,
  Calendar,
  FileText,
  Building2,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import PatientSearchInput from "@/components/PatientSearchInput";

type FollowUpRow = {
  followUp: {
    id: string;
    patientId: string;
    careContext: string;
    followUpType: string;
    reason: string;
    scheduledDate: string;
    scheduledTime?: string | null;
    status: string;
    externalReferralFacilityId?: string | null;
    externalReferralFacilityOther?: string | null;
    externalDiagnosis?: string | null;
    externalReferralReason?: string | null;
    externalReferralDate?: string | null;
    outcomeNotes?: string | null;
    outcomeCode?: string | null;
    nextFollowUpDate?: string | null;
  };
  patient?: { id: string } | null;
  employee?: {
    firstName?: string | null;
    lastName?: string | null;
    employeeNumber?: string | null;
    department?: string | null;
  } | null;
  company?: { name?: string | null } | null;
  referralFacility?: { name?: string | null } | null;
};

export default function WellbeingFollowUps() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeLocation } = useActiveLocation();
  const canWrite = user?.role !== "operations";

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [careContextFilter, setCareContextFilter] = useState<string>("all");
  const [showOnlyDue, setShowOnlyDue] = useState<boolean>(true);

  const [addOpen, setAddOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<FollowUpRow | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [careContext, setCareContext] = useState<"onsite" | "external">("onsite");
  const [followUpType, setFollowUpType] = useState<string | undefined>();
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [externalFacilityOther, setExternalFacilityOther] = useState<string>("");
  const [externalDiagnosis, setExternalDiagnosis] = useState<string>("");
  const [externalReferralReason, setExternalReferralReason] = useState<string>("");
  const [externalReferralDate, setExternalReferralDate] = useState<string>("");

  const [recordStatus, setRecordStatus] = useState<string | undefined>();
  const [outcomeCode, setOutcomeCode] = useState<string | undefined>();
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>("");
  const [newNote, setNewNote] = useState<string>("");

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<FollowUpRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<FollowUpRow | null>(null);
  const [editCareContext, setEditCareContext] = useState<"onsite" | "external">("onsite");
  const [editFollowUpType, setEditFollowUpType] = useState<string | undefined>();
  const [editScheduledDate, setEditScheduledDate] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [editExternalFacilityOther, setEditExternalFacilityOther] = useState<string>("");
  const [editExternalDiagnosis, setEditExternalDiagnosis] = useState<string>("");
  const [editExternalReferralReason, setEditExternalReferralReason] = useState<string>("");
  const [editExternalReferralDate, setEditExternalReferralDate] = useState<string>("");
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState<string>("");

  const queryKey = [
    "/api/wellbeing/follow-ups",
    {
      statusFilter,
      careContextFilter,
      showOnlyDue,
      locationId: activeLocation?.id ?? null,
    },
  ];

  const { data: rows = [], isLoading } = useQuery<FollowUpRow[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeLocation?.id) params.set("locationId", activeLocation.id);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (careContextFilter !== "all") params.set("careContext", careContextFilter);
      if (showOnlyDue) params.set("dueOnly", "true");

      const basePath = "/api/wellbeing/follow-ups";

      const res = await fetch(
        params.toString() ? `${basePath}?${params.toString()}` : basePath
      );
      if (!res.ok) {
        throw new Error("Failed to load follow-ups");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        careContext,
        followUpType: followUpType || "phone_call",
        scheduledDate,
        reason,
      };

      if (selectedPatient?.id) {
        body.patientId = selectedPatient.id;
      } else if (selectedPatient?.employeeId) {
        body.employeeId = selectedPatient.employeeId;
      }

      if (activeLocation?.id) {
        body.locationId = activeLocation.id;
      }

      if (careContext === "external") {
        body.externalReferralFacilityOther = externalFacilityOther || undefined;
        body.externalDiagnosis = externalDiagnosis || undefined;
        body.externalReferralReason = externalReferralReason || undefined;
        body.externalReferralDate = externalReferralDate || undefined;
      }

      const res = await fetch("/api/wellbeing/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create follow-up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddOpen(false);
      setSelectedPatient(null);
      setCareContext("onsite");
      setFollowUpType(undefined);
      setScheduledDate("");
      setReason("");
      setExternalFacilityOther("");
      setExternalDiagnosis("");
      setExternalReferralReason("");
      setExternalReferralDate("");
      toast({ title: "Follow-up created" });
    },
    onError: (err: any) => {
      toast({
        title: "Error creating follow-up",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openRecordDialog = (row: FollowUpRow) => {
    setActiveRow(row);
    setRecordStatus(row.followUp.status);
    setOutcomeCode(row.followUp.outcomeCode ?? undefined);
    setNextFollowUpDate(row.followUp.nextFollowUpDate ?? "");
    setNewNote("");
    setRecordOpen(true);
  };

  const recordMutation = useMutation({
    mutationFn: async () => {
      if (!activeRow) return;

      const body: any = {
        status: recordStatus,
        outcomeCode,
        nextFollowUpDate: nextFollowUpDate || undefined,
      };

      const existingNotes = activeRow.followUp.outcomeNotes || "";
      const parts = existingNotes
        ? existingNotes.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
        : [];

      const trimmed = newNote.trim();
      if (trimmed) {
        const index = parts.length + 1;
        const newEntry = `${index}) ${trimmed}`;
        body.outcomeNotes = parts.length
          ? `${existingNotes}\n\n${newEntry}`
          : newEntry;
      }

      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(activeRow.followUp.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to record follow-up outcome");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setRecordOpen(false);
      setActiveRow(null);
      toast({ title: "Follow-up outcome recorded" });
    },
    onError: (err: any) => {
      toast({
        title: "Error recording outcome",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(id)}/cancel`,
        { method: "PUT" }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to cancel follow-up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Follow-up cancelled" });
    },
    onError: (err: any) => {
      toast({
        title: "Error cancelling follow-up",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string }) => {
      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(payload.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: payload.status }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Follow-up status updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Error updating status",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const body: any = {
        careContext: editCareContext,
        followUpType: editFollowUpType,
        scheduledDate: editScheduledDate,
        reason: editReason,
        nextFollowUpDate: editNextFollowUpDate || undefined,
      };

      if (editCareContext === "external") {
        body.externalReferralFacilityOther = editExternalFacilityOther || undefined;
        body.externalDiagnosis = editExternalDiagnosis || undefined;
        body.externalReferralReason = editExternalReferralReason || undefined;
        body.externalReferralDate = editExternalReferralDate || undefined;
      } else {
        body.externalReferralFacilityOther = null;
        body.externalDiagnosis = null;
        body.externalReferralReason = null;
        body.externalReferralDate = null;
      }

      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(editRow.followUp.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update follow-up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditOpen(false);
      toast({ title: "Follow-up updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Error updating follow-up",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || "Failed to delete follow-up");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDetailsOpen(false);
      toast({ title: "Follow-up deleted" });
    },
    onError: (err: any) => {
      toast({
        title: "Error deleting follow-up",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openDetails = async (row: FollowUpRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const res = await fetch(
        `/api/wellbeing/follow-ups/${encodeURIComponent(row.followUp.id)}`
      );
      if (res.ok) {
        const full = await res.json();
        setDetailsRow((prev) =>
          prev
            ? {
                ...prev,
                followUp: {
                  ...prev.followUp,
                  ...full,
                },
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    };
  };

  const openEdit = (row: FollowUpRow) => {
    setEditRow(row);
    setEditCareContext((row.followUp.careContext as "onsite" | "external") || "onsite");
    setEditFollowUpType(row.followUp.followUpType);
    setEditScheduledDate(row.followUp.scheduledDate);
    setEditReason(row.followUp.reason);
    setEditExternalFacilityOther(row.followUp.externalReferralFacilityOther || "");
    setEditExternalDiagnosis(row.followUp.externalDiagnosis || "");
    setEditExternalReferralReason(row.followUp.externalReferralReason || "");
    setEditExternalReferralDate(row.followUp.externalReferralDate || "");
    setEditNextFollowUpDate(row.followUp.nextFollowUpDate || "");
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!selectedPatient || !scheduledDate || !reason) {
      toast({
        title: "Missing fields",
        description: "Employee, scheduled date, and reason are required.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/wellbeing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
            <p className="text-uventorybiz-gray text-sm">
              Track follow-ups for in-system employees and external referrals.
            </p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add follow-up
          </Button>
        )}
      </div>

      {/* Simple analytics summary (from current list) */}
      {!isLoading && rows.length > 0 && (() => {
        const today = new Date().toISOString().slice(0, 10);
        const active = rows.filter((r) => {
          const s = r.followUp.status;
          return s !== "completed" && s !== "cancelled";
        });
        const due = active.filter((r) => r.followUp.scheduledDate <= today);
        const overdue = active.filter((r) => r.followUp.scheduledDate < today);
        const completed = rows.filter((r) => r.followUp.status === "completed");
        return (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
            <span className="font-medium text-slate-700">Summary:</span>
            <span className="text-slate-600">
              <span className="font-medium text-slate-800">{due.length}</span> due
            </span>
            <span className="text-slate-600">
              <span className="font-medium text-amber-700">{overdue.length}</span> overdue
            </span>
            <span className="text-slate-600">
              <span className="font-medium text-emerald-700">{completed.length}</span> completed (in list)
            </span>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Scope follow-ups by status, context, and location; optionally show only due/overdue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_answer">No answer</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Context</p>
            <Select value={careContextFilter} onValueChange={setCareContextFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All contexts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-7">
            <Input
              id="due-only"
              type="checkbox"
              className="h-4 w-4"
              checked={showOnlyDue}
              onChange={(e) => setShowOnlyDue(e.target.checked)}
            />
            <label htmlFor="due-only" className="text-sm">
              Show only due / overdue
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Details view */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto border-uventorybiz-navy/20">
          <DialogHeader className="border-b border-uventorybiz-navy/10 pb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Follow-up details
            </DialogTitle>
            <DialogDescription className="text-uventorybiz-gray">
              Full context and plan for this follow-up.
            </DialogDescription>
          </DialogHeader>
          {detailsRow && (
            <div className="space-y-5 py-2">
              {detailsLoading && (
                <p className="text-sm text-uventorybiz-gray">Refreshing details…</p>
              )}
              {/* Patient header */}
              <div className="flex items-center gap-4 rounded-lg bg-uventorybiz-navy/5 border border-uventorybiz-navy/10 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-uventorybiz-navy text-white font-semibold text-lg">
                  {`${detailsRow.employee?.firstName ?? ""} ${detailsRow.employee?.lastName ?? ""}`.trim()
                    ? `${(detailsRow.employee?.firstName ?? "?").charAt(0)}${(detailsRow.employee?.lastName ?? "?").charAt(0)}`
                    : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {`${detailsRow.employee?.firstName ?? ""} ${detailsRow.employee?.lastName ?? ""}`.trim() || "Unknown"}
                  </p>
                  <p className="text-sm text-uventorybiz-gray font-mono">
                    {detailsRow.employee?.employeeNumber ||
                      detailsRow.patient?.id ||
                      detailsRow.followUp.patientId}
                  </p>
                  {detailsRow.company?.name && (
                    <p className="text-xs text-uventorybiz-gray mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {detailsRow.company.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Follow-up plan */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-uventorybiz-navy" />
                  Follow-up plan
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-uventorybiz-gray">Context</span>
                    <Badge
                      variant={detailsRow.followUp.careContext === "external" ? "outline" : "secondary"}
                      className="capitalize shrink-0"
                    >
                      {detailsRow.followUp.careContext === "external" ? "External" : "Onsite"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-uventorybiz-gray">Type</span>
                    <span className="capitalize">{detailsRow.followUp.followUpType?.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-uventorybiz-gray shrink-0" />
                    <span className="text-uventorybiz-gray">Scheduled</span>
                    <span>{detailsRow.followUp.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-uventorybiz-gray shrink-0" />
                    <span className="text-uventorybiz-gray">Next follow-up</span>
                    <span>{detailsRow.followUp.nextFollowUpDate || detailsRow.followUp.scheduledDate}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-uventorybiz-gray mb-1">Reason for follow-up</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap rounded bg-white border border-gray-200 p-3">
                    {detailsRow.followUp.reason}
                  </p>
                </div>
              </div>

              {/* Status & outcome */}
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Status & outcome</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      detailsRow.followUp.status === "completed"
                        ? "default"
                        : detailsRow.followUp.status === "cancelled"
                        ? "destructive"
                        : "outline"
                    }
                    className="capitalize"
                  >
                    {detailsRow.followUp.status}
                  </Badge>
                  {detailsRow.followUp.outcomeCode && (
                    <Badge variant="secondary" className="capitalize">
                      {detailsRow.followUp.outcomeCode}
                    </Badge>
                  )}
                </div>
              </div>

              {/* External care (when applicable) */}
              {detailsRow.followUp.careContext === "external" && (
                <div className="rounded-lg border border-uventorybiz-navy/20 bg-uventorybiz-navy/5 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-uventorybiz-navy" />
                    External care
                  </h4>
                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-uventorybiz-gray font-medium">Facility</dt>
                      <dd className="text-gray-900">
                        {detailsRow.followUp.externalReferralFacilityOther ||
                          detailsRow.referralFacility?.name ||
                          "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-uventorybiz-gray font-medium">Diagnosis</dt>
                      <dd className="text-gray-900">{detailsRow.followUp.externalDiagnosis || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-uventorybiz-gray font-medium">Reason for referral</dt>
                      <dd className="text-gray-900">{detailsRow.followUp.externalReferralReason || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-uventorybiz-gray font-medium">Referral date</dt>
                      <dd className="text-gray-900">{detailsRow.followUp.externalReferralDate || "—"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Outcome notes */}
              {detailsRow.followUp.outcomeNotes && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-uventorybiz-navy" />
                    Outcome notes
                  </h4>
                  <div className="space-y-2 text-sm">
                    {detailsRow.followUp.outcomeNotes
                      .split(/\n\s*\n/)
                      .filter((p) => p.trim().length > 0)
                      .map((note, idx) => (
                        <p key={idx} className="rounded bg-white border border-gray-200 p-2.5 text-gray-900">
                          {note}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="border-t border-gray-200 pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(false)}
              className="border-uventorybiz-navy/20 text-uventorybiz-gray hover:bg-uventorybiz-navy/5"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit follow-up */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit follow-up</DialogTitle>
            <DialogDescription>
              Update the follow-up plan, including next planned follow-up date.
            </DialogDescription>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="font-medium">
                  {`${editRow.employee?.firstName ?? ""} ${
                    editRow.employee?.lastName ?? ""
                  }`.trim() || "Unknown"}
                </div>
                <div className="text-xs font-mono">
                  {editRow.employee?.employeeNumber ||
                    editRow.patient?.id ||
                    editRow.followUp.patientId}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Context</p>
                <Select
                  value={editCareContext}
                  onValueChange={(v: "onsite" | "external") => setEditCareContext(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Context" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Follow-up type</p>
                <Select
                  value={editFollowUpType}
                  onValueChange={setEditFollowUpType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_call">Phone call</SelectItem>
                    <SelectItem value="in_person">In-person</SelectItem>
                    <SelectItem value="telehealth">Telehealth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Scheduled date</p>
                <Input
                  type="date"
                  value={editScheduledDate}
                  onChange={(e) => setEditScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Next follow-up date (optional)</p>
                <Input
                  type="date"
                  value={editNextFollowUpDate}
                  onChange={(e) => setEditNextFollowUpDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Reason</p>
                <Textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={3}
                />
              </div>
              {editCareContext === "external" && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                  <p className="text-sm font-medium">External care details</p>
                  <Input
                    placeholder="Referral facility / hospital (free text)"
                    value={editExternalFacilityOther}
                    onChange={(e) => setEditExternalFacilityOther(e.target.value)}
                  />
                  <Input
                    placeholder="Referring diagnosis"
                    value={editExternalDiagnosis}
                    onChange={(e) => setEditExternalDiagnosis(e.target.value)}
                  />
                  <Input
                    placeholder="Reason for referral / external care"
                    value={editExternalReferralReason}
                    onChange={(e) => setEditExternalReferralReason(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Referral / external visit date"
                    value={editExternalReferralDate}
                    onChange={(e) => setEditExternalReferralDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up list</CardTitle>
          <CardDescription>
            Tenant-scoped follow-ups, defaulted to your current location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading follow-ups...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No follow-ups found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Referral facility</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const f = row.followUp;
                  const name =
                    `${row.employee?.firstName ?? ""} ${row.employee?.lastName ?? ""}`.trim() ||
                    "Unknown";
                  const idLine =
                    row.employee?.employeeNumber ||
                    row.patient?.id ||
                    f.patientId;
                  const contextLabel =
                    f.careContext === "external" ? "External" : "Onsite";
                  const referralFacilityDisplay =
                    f.careContext === "external"
                      ? f.externalReferralFacilityOther ||
                        row.referralFacility?.name ||
                        "—"
                      : "—";
                  const diagnosisDisplay =
                    f.careContext === "external"
                      ? f.externalDiagnosis || "—"
                      : "—";

                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {idLine}
                        </div>
                        {row.company?.name && (
                          <div className="text-xs text-muted-foreground">
                            {row.company.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={f.careContext === "external" ? "outline" : "secondary"}
                          className="capitalize"
                        >
                          {contextLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.scheduledDate}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {f.reason}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {referralFacilityDisplay}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {diagnosisDisplay}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="capitalize"
                          variant={
                            f.status === "completed"
                              ? "default"
                              : f.status === "cancelled"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.nextFollowUpDate || f.scheduledDate}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetails(row)}>
                              <Eye className="h-3 w-3 mr-2" />
                              View details
                            </DropdownMenuItem>
                            {canWrite && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(row)}>
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Edit follow-up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openRecordDialog(row)}
                                  disabled={
                                    f.status === "completed" || f.status === "cancelled"
                                  }
                                >
                                  <PhoneCall className="h-3 w-3 mr-2" />
                                  Record outcome
                                </DropdownMenuItem>
                                {f.status !== "completed" && f.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      statusMutation.mutate({
                                        id: f.id,
                                        status: "completed",
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-2" />
                                    Mark as completed
                                  </DropdownMenuItem>
                                )}
                                {(f.status === "completed" || f.status === "cancelled") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      statusMutation.mutate({
                                        id: f.id,
                                        status: "scheduled",
                                      })
                                    }
                                  >
                                    <RefreshCcw className="h-3 w-3 mr-2" />
                                    Re-open as scheduled
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActiveRow(row);
                                    setCancelConfirmOpen(true);
                                  }}
                                  disabled={
                                    f.status === "completed" || f.status === "cancelled"
                                  }
                                >
                                  Cancel follow-up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetailsRow(row);
                                    setDetailsOpen(true);
                                    deleteMutation.mutate(row.followUp.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete follow-up
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add follow-up */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add follow-up</DialogTitle>
            <DialogDescription>
              Select the employee and schedule an onsite or external follow-up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Employee</p>
              <PatientSearchInput
                selectedPatient={selectedPatient}
                onSelect={setSelectedPatient}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Context</p>
              <Select
                value={careContext}
                onValueChange={(v: "onsite" | "external") => setCareContext(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Onsite</SelectItem>
                  <SelectItem value="external">External (referred out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Follow-up type</p>
              <Select
                value={followUpType}
                onValueChange={setFollowUpType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone call</SelectItem>
                  <SelectItem value="in_person">In-person</SelectItem>
                  <SelectItem value="telehealth">Telehealth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Scheduled date</p>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Reason</p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you following up?"
                rows={3}
              />
            </div>
            {careContext === "external" && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                <p className="text-sm font-medium">External care details</p>
                <Input
                  placeholder="Referral facility / hospital (free text)"
                  value={externalFacilityOther}
                  onChange={(e) => setExternalFacilityOther(e.target.value)}
                />
                <Input
                  placeholder="Referring diagnosis"
                  value={externalDiagnosis}
                  onChange={(e) => setExternalDiagnosis(e.target.value)}
                />
                <Input
                  placeholder="Reason for referral / external care"
                  value={externalReferralReason}
                  onChange={(e) => setExternalReferralReason(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Referral / external visit date"
                  value={externalReferralDate}
                  onChange={(e) => setExternalReferralDate(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Add follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record follow-up outcome */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record follow-up outcome</DialogTitle>
            <DialogDescription>
              Capture what happened when you contacted the employee and whether more follow-up is needed.
            </DialogDescription>
          </DialogHeader>
          {activeRow && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="font-medium">
                  {`${activeRow.employee?.firstName ?? ""} ${
                    activeRow.employee?.lastName ?? ""
                  }`.trim() || "Unknown"}
                </div>
                <div className="font-mono text-xs">
                  {activeRow.employee?.employeeNumber ||
                    activeRow.patient?.id ||
                    activeRow.followUp.patientId}
                </div>
                {activeRow.followUp.outcomeNotes && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Previous notes</p>
                    <ul className="mt-1 space-y-1 text-xs list-disc list-inside">
                      {activeRow.followUp.outcomeNotes
                        .split(/\n\s*\n/)
                        .filter((p) => p.trim().length > 0)
                        .map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Status after this contact</p>
                <Select
                  value={recordStatus}
                  onValueChange={setRecordStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Still scheduled</SelectItem>
                    <SelectItem value="no_answer">No answer</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Outcome</p>
                <Select value={outcomeCode} onValueChange={setOutcomeCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="improved">Improved</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="needs_revisit">Needs revisit</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Next follow-up date (optional)</p>
                <Input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Add new note</p>
                <Textarea
                  placeholder="What was discussed / observed?"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordMutation.mutate()}
              disabled={recordMutation.isPending}
            >
              {recordMutation.isPending ? "Saving..." : "Save outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel follow-up confirmation */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the follow-up as cancelled but keep the record and any notes.
              You can still see it in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep follow-up</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (activeRow) {
                  cancelMutation.mutate(activeRow.followUp.id);
                }
                setCancelConfirmOpen(false);
              }}
            >
              Cancel follow-up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

