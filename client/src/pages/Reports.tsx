import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, subDays } from "date-fns";
import { ClipboardList, Filter, MoreVertical, Plus, ChevronDown, Paperclip, Link2, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import { ShiftReportLinkPicker } from "@/components/shiftover/ShiftReportLinkPicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const SHIFTS = ["day", "night"] as const;

const SUMMARY_OPTIONS: { value: string; label: string }[] = [
  { value: "Shift was routine with no major events.", label: "Shift was routine with no major events." },
  { value: "Shift was busy with high customer/staff activity.", label: "Shift was busy with high customer/staff activity." },
  { value: "One or more incidents occurred during the shift.", label: "One or more incidents occurred during the shift." },
  { value: "Shift was quiet with low activity.", label: "Shift was quiet with low activity." },
  { value: "Equipment or facility issues were encountered.", label: "Equipment or facility issues were encountered." },
  { value: "Shift was short-staffed; workload was affected.", label: "Shift was short-staffed; workload was affected." },
  { value: "Other (describe in report details).", label: "Other (describe in report details)." },
];

const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");
const defaultTo = format(new Date(), "yyyy-MM-dd");

const formSchema = z.object({
  reportDate: z.string().min(1, "Report date is required"),
  shift: z.enum(SHIFTS, { required_error: "Shift is required" }),
  summary: z.string().min(1, "Summary is required"),
  details: z.string().min(1, "Report details are required"),
  hasIssues: z.boolean().optional(),
  issuesNotes: z.string().optional(),
  completed: z.string().optional(),
  inProgress: z.string().optional(),
  blocked: z.string().optional(),
  risksWatch: z.string().optional(),
  forNextShift: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type HandoverStructured = {
  completed?: string;
  inProgress?: string;
  blocked?: string;
  risksWatch?: string;
  forNextShift?: string;
};

type ShiftReportRow = {
  id: string;
  reportDate: string;
  shift: string;
  summary: string;
  notes?: string | null;
  activitiesNotes?: string | null;
  handoverNotes?: string | null;
  hasIssues?: boolean | null;
  issuesNotes?: string | null;
  handoverStructured?: HandoverStructured | null;
  locationId?: string;
  locationName?: string;
  reportedById?: string;
  reportedByName?: string;
  createdAt: string;
  ackCount?: number;
  acknowledgedByMe?: boolean;
};

type AckRow = {
  id: string;
  userId: string;
  note?: string | null;
  acknowledgedAt: string;
  userName?: string;
};

type ShiftReportDetail = ShiftReportRow & {
  acknowledgments?: AckRow[];
  links?: Array<{ id: string; linkedType: string; linkedId: string; note?: string | null }>;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    originalName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }>;
  revisionHistory?: Array<{ id: string; editedByUserId: string; createdAt: string; previousSnapshot: Record<string, unknown> }>;
};

function buildHandoverPayload(values: FormValues): HandoverStructured | null {
  const h: HandoverStructured = {};
  if (values.completed?.trim()) h.completed = values.completed.trim();
  if (values.inProgress?.trim()) h.inProgress = values.inProgress.trim();
  if (values.blocked?.trim()) h.blocked = values.blocked.trim();
  if (values.risksWatch?.trim()) h.risksWatch = values.risksWatch.trim();
  if (values.forNextShift?.trim()) h.forNextShift = values.forNextShift.trim();
  return Object.keys(h).length > 0 ? h : null;
}

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeLocation } = useActiveLocation();
  const { user } = useAuth();
  const highlightHandled = useRef(false);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [unacknowledgedOnly, setUnacknowledgedOnly] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ShiftReportRow | null>(null);
  const [editingReport, setEditingReport] = useState<ShiftReportRow | null>(null);
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<ShiftReportRow | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportDate: format(new Date(), "yyyy-MM-dd"),
      shift: "day",
      summary: "",
      details: "",
      hasIssues: false,
      issuesNotes: "",
      completed: "",
      inProgress: "",
      blocked: "",
      risksWatch: "",
      forNextShift: "",
    },
  });

  const reportDate = form.watch("reportDate");
  const shift = form.watch("shift");

  const { data: careLocations = [] } = useQuery({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const reportsQueryKey = [
    "/api/shift-reports",
    fromDate,
    toDate,
    locationFilter === "all" ? undefined : locationFilter,
    shiftFilter === "all" ? undefined : shiftFilter,
    unacknowledgedOnly,
    "enrich",
  ];
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: reportsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
      if (locationFilter && locationFilter !== "all") params.set("locationId", locationFilter);
      if (shiftFilter && shiftFilter !== "all") params.set("shift", shiftFilter);
      params.set("limit", "50");
      params.set("enrich", "1");
      if (unacknowledgedOnly) params.set("unacknowledgedOnly", "1");
      const res = await fetch(`/api/shift-reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const detailQuery = useQuery({
    queryKey: ["/api/shift-reports", selectedReport?.id, "detail"],
    queryFn: async (): Promise<ShiftReportDetail> => {
      const id = selectedReport!.id;
      const res = await fetch(`/api/shift-reports/${id}?detail=1`);
      if (!res.ok) throw new Error("Failed to load report details");
      const data: unknown = await res.json();
      return data as unknown as ShiftReportDetail;
    },
    enabled: viewModalOpen && !!selectedReport?.id,
  });
  const detail = detailQuery.data;

  const editDetailQuery = useQuery({
    queryKey: ["/api/shift-reports", editingReport?.id, "detail"],
    queryFn: async (): Promise<ShiftReportDetail> => {
      const id = editingReport!.id;
      const res = await fetch(`/api/shift-reports/${id}?detail=1`);
      if (!res.ok) throw new Error("Failed to load report details");
      const data: unknown = await res.json();
      return data as unknown as ShiftReportDetail;
    },
    enabled: formModalOpen && !!editingReport?.id,
  });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("highlight");
    if (!id || highlightHandled.current) return;
    highlightHandled.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/shift-reports/${id}?detail=1`);
        if (!res.ok) return;
        const d = (await res.json()) as ShiftReportDetail;
        setSelectedReport(d);
        setViewModalOpen(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function buildAutoActivitiesNote(dateStr: string, locationId: string, shiftValue: string) {
    try {
      const params = new URLSearchParams();
      params.set("date", dateStr);
      params.set("locationId", locationId);
      params.set("status", "completed");
      const res = await fetch(`/api/duty-assignments/history?${params.toString()}`);
      if (!res.ok) return "";
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return "";
      const completedForShift = data.filter((a: { shift?: string }) => a.shift === shiftValue);
      if (completedForShift.length === 0) return "";
      const lines = (completedForShift as { duty?: { title: string }; completedAt?: string }[]).map((a) => {
        const time = a.completedAt ? format(new Date(a.completedAt), "HH:mm") : "";
        const title = a.duty?.title ?? "Duty";
        return `- ${title}${time ? ` — ${time}` : ""}`;
      });
      return `\n\n--- Completed duties for this shift ---\n${lines.join("\n")}`;
    } catch {
      return "";
    }
  }

  const createReport = useMutation({
    mutationFn: async (body: FormValues & { locationId: string }) => {
      const handoverStructured = buildHandoverPayload(body);
      const res = await fetch("/api/shift-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: body.locationId,
          reportDate: body.reportDate,
          shift: body.shift,
          summary: body.summary,
          notes: body.details || undefined,
          activitiesNotes: undefined,
          handoverNotes: undefined,
          hasIssues: body.hasIssues ?? false,
          issuesNotes: body.issuesNotes || undefined,
          handoverStructured: handoverStructured ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      toast({
        title: "Report submitted",
        description:
          "Your shift report has been saved. Open View or Edit to add linked tickets, incidents, or duties for Open handover items.",
      });
      setFormModalOpen(false);
      setEditingReport(null);
      form.reset({
        reportDate: format(new Date(), "yyyy-MM-dd"),
        shift: "day",
        summary: "",
        details: "",
        hasIssues: false,
        issuesNotes: "",
        completed: "",
        inProgress: "",
        blocked: "",
        risksWatch: "",
        forNextShift: "",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateReport = useMutation({
    mutationFn: async (payload: { id: string } & FormValues & { locationId: string }) => {
      const { id, ...body } = payload;
      const handoverStructured = buildHandoverPayload(body);
      const res = await fetch(`/api/shift-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: body.reportDate,
          shift: body.shift,
          summary: body.summary,
          notes: body.details || undefined,
          activitiesNotes: undefined,
          handoverNotes: undefined,
          hasIssues: body.hasIssues ?? false,
          issuesNotes: body.issuesNotes || undefined,
          handoverStructured: handoverStructured ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update report");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      toast({ title: "Report updated", description: "Your shift report has been updated." });
      setFormModalOpen(false);
      setEditingReport(null);
      form.reset({
        reportDate: format(new Date(), "yyyy-MM-dd"),
        shift: "day",
        summary: "",
        details: "",
        hasIssues: false,
        issuesNotes: "",
        completed: "",
        inProgress: "",
        blocked: "",
        risksWatch: "",
        forNextShift: "",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shift-reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete report");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      toast({ title: "Report deleted", description: "The report has been removed." });
      setViewModalOpen(false);
      setSelectedReport(null);
      setDeleteConfirmReport(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const acknowledgeReport = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await fetch(`/api/shift-reports/${id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to acknowledge");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports", variables.id, "detail"] });
      toast({ title: "Acknowledged", description: "You have acknowledged this shift handover." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async (payload: { reportId: string; linkedType: string; linkedId: string; note?: string }) => {
      const res = await fetch(`/api/shift-reports/${payload.reportId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedType: payload.linkedType,
          linkedId: payload.linkedId,
          note: payload.note || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add link");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports", variables.reportId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shiftover/open-items"] });
      toast({ title: "Link added" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async ({ reportId, linkId }: { reportId: string; linkId: string }) => {
      const res = await fetch(`/api/shift-reports/${reportId}/links/${linkId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to remove link");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-reports", variables.reportId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shiftover/open-items"] });
      toast({ title: "Link removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: async ({ reportId, attachmentId }: { reportId: string; attachmentId: string }) => {
      const res = await fetch(`/api/shift-reports/${reportId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to remove attachment");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/shift-reports", variables.reportId, "detail"],
      });
      toast({ title: "Attachment removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const [linkType, setLinkType] = useState<"ticket" | "incident" | "duty">("ticket");

  async function onSubmit(values: FormValues) {
    if (!activeLocation?.id) {
      toast({ title: "Select location", description: "Select your working location to submit a report.", variant: "destructive" });
      return;
    }
    const baseDetails = values.details || "";
    const autoActivities = await buildAutoActivitiesNote(values.reportDate, activeLocation.id, values.shift);
    const mergedNotes = `${baseDetails}${autoActivities}`;
    const payload = { ...values, details: mergedNotes };
    if (editingReport) {
      const locationId = editingReport.locationId || activeLocation.id;
      updateReport.mutate({ id: editingReport.id, ...payload, locationId });
    } else {
      createReport.mutate({ ...payload, locationId: activeLocation.id });
    }
  }

  const canSubmit = !!activeLocation?.id;

  useEffect(() => {
    if (formModalOpen) {
      if (editingReport) {
        const detailsParts = [
          editingReport.notes,
          editingReport.activitiesNotes,
          editingReport.handoverNotes,
        ].filter(Boolean);
        const details = detailsParts.length > 0 ? detailsParts.join("\n\n") : "";
        const hs = editingReport.handoverStructured;
        form.reset({
          reportDate: format(new Date(editingReport.reportDate), "yyyy-MM-dd"),
          shift: editingReport.shift === "night" ? "night" : "day",
          summary: editingReport.summary,
          details,
          hasIssues: editingReport.hasIssues ?? false,
          issuesNotes: editingReport.issuesNotes || "",
          completed: hs?.completed ?? "",
          inProgress: hs?.inProgress ?? "",
          blocked: hs?.blocked ?? "",
          risksWatch: hs?.risksWatch ?? "",
          forNextShift: hs?.forNextShift ?? "",
        });
      } else {
        form.reset({
          reportDate: format(new Date(), "yyyy-MM-dd"),
          shift: "day",
          summary: "",
          details: "",
          hasIssues: false,
          issuesNotes: "",
          completed: "",
          inProgress: "",
          blocked: "",
          risksWatch: "",
          forNextShift: "",
        });
      }
    }
  }, [formModalOpen, form, editingReport]);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Reports
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            Shift handovers and site activity summaries; filter by date, location, and shift.
          </p>
        </div>
        <Button onClick={() => setFormModalOpen(true)} data-testid="new-shift-report-btn">
          <Plus className="h-4 w-4 mr-2" />
          New shift report
        </Button>
      </div>

      {/* Top-level filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter the list of reports below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {(careLocations as { id: string; locationName: string }[]).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Shift</label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shifts</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="unack-only"
              checked={unacknowledgedOnly}
              onCheckedChange={(c) => setUnacknowledgedOnly(c === true)}
            />
            <label htmlFor="unack-only" className="text-sm font-medium leading-none cursor-pointer">
              Awaiting my acknowledgment
            </label>
          </div>
        </CardContent>
      </Card>

      {/* New shift report modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent
          className={`max-h-[90vh] overflow-y-auto ${editingReport ? "max-w-2xl" : "max-w-lg"}`}
        >
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit shift report" : "New shift report"}</DialogTitle>
            <DialogDescription>
              {activeLocation ? (
                <>Reporting for: <strong>{activeLocation.name}</strong></>
              ) : (
                <span className="text-amber-700">Select your working location (header) to submit a shift report.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {!activeLocation && (
            <p className="text-sm text-amber-700">Select your working location to submit a report.</p>
          )}
          <Form {...form}>
            <form id="shift-report-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reportDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a summary" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUMMARY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Condensed account of what happened during the shift: activities, handover, notable events..."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Collapsible className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-gray-900 py-2">
                  Structured handover (optional)
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pb-2 pt-1">
                  <FormField
                    control={form.control}
                    name="completed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Completed</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What was finished this shift..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inProgress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">In progress</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Work continuing into next shift..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="blocked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Blocked</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Blocked items or dependencies..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="risksWatch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Risks / watch</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Risks to monitor..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="forNextShift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">For next shift</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explicit actions for incoming team..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              <Collapsible
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
                defaultOpen={!!editingReport}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-gray-900 py-2">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 shrink-0" />
                    Linked records (handover)
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pb-2 pt-1 text-sm">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Link tickets, incidents, or duty assignments so still-open items can appear on{" "}
                    <Link href="/shiftover/open-items" className="text-uventorybiz-navy underline">
                      Open handover items
                    </Link>
                    . Nothing is linked automatically — search and attach records here (when editing) or under{" "}
                    <strong>View</strong>.
                  </p>
                  {!editingReport ? (
                    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-2">
                      <strong>Submit this report first.</strong> Then use <strong>View</strong> or open{" "}
                      <strong>Edit</strong> again to attach links.
                    </p>
                  ) : editDetailQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading links…</p>
                  ) : (
                    (() => {
                      const editDisplay = (editDetailQuery.data ?? editingReport) as ShiftReportDetail;
                      const canManageLinks =
                        !!user &&
                        (editDisplay.reportedById === user.id ||
                          user.role === "admin" ||
                          user.role === "super_admin");
                      return (
                        <>
                          <ul className="space-y-2">
                            {(editDisplay.links ?? []).length === 0 ? (
                              <li className="text-muted-foreground text-xs">No links yet.</li>
                            ) : (
                              (editDisplay.links ?? []).map((ln) => (
                                <li
                                  key={ln.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs"
                                >
                                  <span className="capitalize">
                                    {ln.linkedType}: {ln.linkedId.slice(0, 8)}…
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {ln.linkedType === "ticket" ? (
                                      <Link
                                        href={`/tickets/${ln.linkedId}`}
                                        className="text-uventorybiz-navy underline"
                                      >
                                        Open
                                      </Link>
                                    ) : null}
                                    {canManageLinks ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-destructive"
                                        onClick={() =>
                                          removeLinkMutation.mutate({
                                            reportId: editDisplay.id,
                                            linkId: ln.id,
                                          })
                                        }
                                      >
                                        Remove
                                      </Button>
                                    ) : null}
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                          {canManageLinks ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="flex-1 w-full">
                                  <label className="text-xs text-muted-foreground">Type</label>
                                  <Select
                                    value={linkType}
                                    onValueChange={(v) => setLinkType(v as typeof linkType)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ticket">Ticket</SelectItem>
                                      <SelectItem value="incident">Incident</SelectItem>
                                      <SelectItem value="duty">Duty assignment</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <ShiftReportLinkPicker
                                  linkType={linkType}
                                  reportDate={
                                    typeof editDisplay.reportDate === "string"
                                      ? editDisplay.reportDate.split("T")[0]
                                      : format(new Date(editDisplay.reportDate), "yyyy-MM-dd")
                                  }
                                  reportLocationId={editDisplay.locationId}
                                  excludeLinkedIds={(editDisplay.links ?? [])
                                    .filter((l) => l.linkedType === linkType)
                                    .map((l) => l.linkedId)}
                                  disabled={addLinkMutation.isPending}
                                  className="w-full sm:w-auto shrink-0"
                                  onPickMany={(linkedIds) => {
                                    linkedIds.forEach((linkedId) => {
                                      addLinkMutation.mutate({
                                        reportId: editDisplay.id,
                                        linkedType: linkType,
                                        linkedId,
                                      });
                                    });
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Tickets: your requests, assignments, and (for admins) all tenant tickets.
                                Duties: assignments ±14 days around this report date
                                {editDisplay.locationId ? " at this report’s location" : ""}.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Only the author or an admin can change links.
                            </p>
                          )}
                        </>
                      );
                    })()
                  )}
                </CollapsibleContent>
              </Collapsible>

              <FormField
                control={form.control}
                name="hasIssues"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Any issues during the shift?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {form.watch("hasIssues") && (
                <FormField
                  control={form.control}
                  name="issuesNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="shift-report-form"
              disabled={!canSubmit || createReport.isPending || updateReport.isPending}
            >
              {editingReport
                ? updateReport.isPending
                  ? "Saving..."
                  : "Save changes"
                : createReport.isPending
                  ? "Submitting..."
                  : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports list */}
      <Card>
        <CardHeader>
          <CardTitle>Recent reports</CardTitle>
          <CardDescription>Filtered by the criteria above</CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (reports as ShiftReportRow[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead className="whitespace-nowrap">Ack</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports as ShiftReportRow[]).map((r, index) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell>{format(new Date(r.reportDate), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="capitalize">{r.shift}</TableCell>
                    <TableCell>{r.locationName ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={r.summary}>{r.summary}</TableCell>
                    <TableCell>{r.reportedByName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {r.ackCount ?? 0}
                        </Badge>
                        {r.acknowledgedByMe === false ? (
                          <Badge variant="outline" className="text-xs text-amber-800 border-amber-300">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open report actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(r);
                              setViewModalOpen(true);
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingReport(r);
                              setFormModalOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmReport(r)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View report details modal */}
      <Dialog
        open={viewModalOpen}
        onOpenChange={(open) => {
          setViewModalOpen(open);
          if (!open) {
            setSelectedReport(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shift report details</DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <>
                  {format(new Date(selectedReport.reportDate), "yyyy-MM-dd")} ·{" "}
                  <span className="capitalize">{selectedReport.shift}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (() => {
            const display = (detail ?? selectedReport) as ShiftReportDetail;
            const canManage =
              !!user &&
              (display.reportedById === user.id ||
                user.role === "admin" ||
                user.role === "super_admin");
            const iAcked =
              !!user &&
              (display.acknowledgments?.some((a) => a.userId === user.id) ?? false);
            const hs = display.handoverStructured;

            async function onAttachFile(e: ChangeEvent<HTMLInputElement>) {
              const file = e.target.files?.[0];
              if (!file || !display.id) return;
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch(`/api/shift-reports/${display.id}/attachments`, {
                method: "POST",
                body: fd,
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast({ title: "Upload failed", description: err.message || "Could not upload", variant: "destructive" });
              } else {
                queryClient.invalidateQueries({ queryKey: ["/api/shift-reports", display.id, "detail"] });
                toast({ title: "File attached" });
              }
              e.target.value = "";
            }

            return (
              <div className="space-y-4 text-sm">
                {detailQuery.isLoading ? (
                  <p className="text-muted-foreground">Loading details…</p>
                ) : null}
                <div>
                  <span className="font-medium">Location:</span>{" "}
                  <span>{display.locationName ?? "—"}</span>
                </div>
                <div>
                  <span className="font-medium">Summary:</span>
                  <p className="mt-1">{display.summary}</p>
                </div>
                {(display.notes || display.activitiesNotes || display.handoverNotes) && (
                  <div>
                    <span className="font-medium">Report details:</span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {[display.notes, display.activitiesNotes, display.handoverNotes]
                        .filter(Boolean)
                        .join("\n\n")}
                    </p>
                  </div>
                )}
                {hs &&
                  (hs.completed || hs.inProgress || hs.blocked || hs.risksWatch || hs.forNextShift) && (
                    <div className="rounded-md border border-border p-3 bg-muted/20 space-y-2">
                      <span className="font-medium">Structured handover</span>
                      {hs.completed ? (
                        <p>
                          <span className="text-xs font-semibold text-muted-foreground">Completed</span>
                          <span className="block whitespace-pre-wrap mt-0.5">{hs.completed}</span>
                        </p>
                      ) : null}
                      {hs.inProgress ? (
                        <p>
                          <span className="text-xs font-semibold text-muted-foreground">In progress</span>
                          <span className="block whitespace-pre-wrap mt-0.5">{hs.inProgress}</span>
                        </p>
                      ) : null}
                      {hs.blocked ? (
                        <p>
                          <span className="text-xs font-semibold text-muted-foreground">Blocked</span>
                          <span className="block whitespace-pre-wrap mt-0.5">{hs.blocked}</span>
                        </p>
                      ) : null}
                      {hs.risksWatch ? (
                        <p>
                          <span className="text-xs font-semibold text-muted-foreground">Risks / watch</span>
                          <span className="block whitespace-pre-wrap mt-0.5">{hs.risksWatch}</span>
                        </p>
                      ) : null}
                      {hs.forNextShift ? (
                        <p>
                          <span className="text-xs font-semibold text-muted-foreground">For next shift</span>
                          <span className="block whitespace-pre-wrap mt-0.5">{hs.forNextShift}</span>
                        </p>
                      ) : null}
                    </div>
                  )}
                {display.hasIssues && (
                  <div>
                    <span className="font-medium">Issues during shift:</span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {display.issuesNotes || "Yes (no details provided)."}
                    </p>
                  </div>
                )}
                <div>
                  <span className="font-medium">Reporter:</span>{" "}
                  <span>{display.reportedByName ?? "—"}</span>
                </div>

                {user && !iAcked ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={acknowledgeReport.isPending}
                    onClick={() => acknowledgeReport.mutate({ id: display.id })}
                  >
                    Acknowledge handover
                  </Button>
                ) : user && iAcked ? (
                  <Badge variant="outline" className="text-green-800 border-green-300">
                    You acknowledged this report
                  </Badge>
                ) : null}

                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Link2 className="h-4 w-4" />
                    Linked records
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Search and attach tickets, incidents, or duty assignments. Open items appear on{" "}
                    <Link href="/shiftover/open-items" className="text-uventorybiz-navy underline">
                      Open handover items
                    </Link>{" "}
                    when the linked record is still open (see ShiftOver docs).
                  </p>
                  <ul className="space-y-2 mb-3">
                    {(display.links ?? []).length === 0 ? (
                      <li className="text-muted-foreground text-xs">No links yet.</li>
                    ) : (
                      (display.links ?? []).map((ln) => (
                        <li
                          key={ln.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-2 py-1.5"
                        >
                          <span className="capitalize">
                            {ln.linkedType}: {ln.linkedId.slice(0, 8)}…
                          </span>
                          <div className="flex items-center gap-2">
                            {ln.linkedType === "ticket" ? (
                              <Link href={`/tickets/${ln.linkedId}`} className="text-uventorybiz-navy text-xs underline">
                                Open
                              </Link>
                            ) : null}
                            {canManage ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive"
                                onClick={() =>
                                  removeLinkMutation.mutate({ reportId: display.id, linkId: ln.id })
                                }
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                  {canManage ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1 w-full">
                          <label className="text-xs text-muted-foreground">Type</label>
                          <Select value={linkType} onValueChange={(v) => setLinkType(v as typeof linkType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ticket">Ticket</SelectItem>
                              <SelectItem value="incident">Incident</SelectItem>
                              <SelectItem value="duty">Duty assignment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <ShiftReportLinkPicker
                          linkType={linkType}
                          reportDate={
                            typeof display.reportDate === "string"
                              ? display.reportDate.split("T")[0]
                              : format(new Date(display.reportDate), "yyyy-MM-dd")
                          }
                          reportLocationId={display.locationId}
                          excludeLinkedIds={(display.links ?? [])
                            .filter((l) => l.linkedType === linkType)
                            .map((l) => l.linkedId)}
                          disabled={addLinkMutation.isPending}
                          className="w-full sm:w-auto shrink-0"
                          onPickMany={(linkedIds) => {
                            linkedIds.forEach((linkedId) => {
                              addLinkMutation.mutate({
                                reportId: display.id,
                                linkedType: linkType,
                                linkedId,
                              });
                            });
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tickets: your requests, assignments, and (for admins) all tenant tickets. Duties: ±14 days
                        around this report date
                        {display.locationId ? " at this report’s location" : ""}.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </div>
                  <ul className="space-y-1 mb-2">
                    {(display.attachments ?? []).length === 0 ? (
                      <li className="text-muted-foreground text-xs">No files.</li>
                    ) : (
                      (display.attachments ?? []).map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-uventorybiz-navy underline truncate"
                          >
                            {a.originalName}
                          </a>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive shrink-0"
                              onClick={() =>
                                removeAttachmentMutation.mutate({
                                  reportId: display.id,
                                  attachmentId: a.id,
                                })
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                  {canManage ? (
                    <div>
                      <Input type="file" className="text-xs" onChange={onAttachFile} />
                    </div>
                  ) : null}
                </div>

                {(display.acknowledgments ?? []).length > 0 ? (
                  <div className="border-t border-border pt-3">
                    <span className="font-medium">Acknowledgments ({display.acknowledgments!.length})</span>
                    <ul className="mt-2 space-y-1 text-xs">
                      {display.acknowledgments!.map((a) => (
                        <li key={a.id}>
                          {a.userName ?? a.userId} ·{" "}
                          {format(new Date(a.acknowledgedAt), "yyyy-MM-dd HH:mm")}
                          {a.note ? ` — ${a.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {(display.revisionHistory ?? []).length > 0 ? (
                  <Collapsible className="border-t border-border pt-3">
                    <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium">
                      <History className="h-4 w-4" />
                      Edit history
                      <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 text-xs text-muted-foreground">
                      {display.revisionHistory!.map((rev) => (
                        <div key={rev.id} className="rounded border border-border p-2">
                          {format(new Date(rev.createdAt), "yyyy-MM-dd HH:mm")} · editor{" "}
                          {rev.editedByUserId.slice(0, 8)}…
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}
              </div>
            );
          })()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedReport && (
              <>
                {(() => {
                  const display = (detail ?? selectedReport) as ShiftReportDetail;
                  const canManage =
                    !!user &&
                    (display.reportedById === user.id ||
                      user.role === "admin" ||
                      user.role === "super_admin");
                  return canManage ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setViewModalOpen(false);
                          setEditingReport(selectedReport);
                          setFormModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleteReport.isPending}
                        onClick={() => {
                          setViewModalOpen(false);
                          setDeleteConfirmReport(selectedReport);
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null;
                })()}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmReport} onOpenChange={(open) => { if (!open) setDeleteConfirmReport(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shift report?</AlertDialogTitle>
            <AlertDialogDescription>
              This report will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmReport) {
                  deleteReport.mutate(deleteConfirmReport.id);
                }
              }}
              disabled={deleteReport.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReport.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
