import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bookmark,
  ChevronDown,
  Download,
  ExternalLink,
  Filter,
  Info,
  Printer,
  Trash2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClinicalReportsPrintStyles } from "@/components/ClinicalReportsPrintStyles";
import { CLINICAL_REPORTS_PRINT_BODY_CLASS } from "@/lib/clinicalReportsPrint";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MobileNav from "@/components/MobileNav";

type GroupBy = "day" | "week" | "month";

type OperationsReportsKpis = {
  ticketsOpen: number;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsClosed: number;
  meanOpenTicketAgeHours: number | null;
  dutyAssignmentsTotal: number;
  dutyAssignmentsCompleted: number;
  dutyAssignmentsOverdue: number;
  dutyCompletionRate: number | null;
  shiftReportsSubmitted: number;
  shiftReportsWithIssues: number;
  shiftReportsWithIssuesRate: number | null;
  shiftReportAcknowledgmentCount: number;
  shiftReportAckRate: number | null;
};

type OperationsReportsPayload = {
  meta: {
    from: string;
    to: string;
    groupBy: GroupBy;
    generatedAt: string;
    priorPeriod?: { from: string; to: string };
  };
  kpis: OperationsReportsKpis;
  kpisPriorPeriod: OperationsReportsKpis | null;
  series: {
    ticketsOverTime: Array<{ period: string; total: number }>;
    dutiesOverTime: Array<{ period: string; total: number; completed: number }>;
    shiftReportsOverTime: Array<{ period: string; total: number }>;
  };
  tables: {
    ticketsByStatus: Array<{ status: string; count: number }>;
    ticketsByPriority: Array<{ priority: string; count: number }>;
    ticketsByCategory: Array<{ categoryId: string | null; categoryName: string; count: number }>;
    ticketsAgingBuckets: Array<{ bucket: string; count: number }>;
    dutiesByLocation: Array<{
      locationId: string | null;
      locationName: string;
      total: number;
      completed: number;
      completionRate: number | null;
    }>;
    shiftReportLinkCounts: Array<{ linkedType: string; count: number }>;
    ticketsByAssignee: Array<{
      assigneeUserId: string | null;
      open: number;
      resolvedInWindow: number;
    }>;
    dutiesByDuty: Array<{
      dutyId: string;
      dutyTitle: string;
      dutyCategory: string;
      total: number;
      completed: number;
      completionRate: number | null;
    }>;
    dutiesByCategory: Array<{
      category: string;
      total: number;
      completed: number;
      completionRate: number | null;
    }>;
  };
};

const VIEWS_KEY = "uventorybiz-operations-report-views-v1";

type FilterSnapshot = {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  ticketCategoryIds: string[];
  ticketStatuses: string[];
  ticketPriorities: string[];
  assigneeUserIds: string[];
  requesterUserIds: string[];
  dutyIds: string[];
  dutyAssignmentStatuses: string[];
  shifts: string[];
  shiftReportShifts: string[];
  onlyWithIssues: boolean;
  comparePriorPeriod: boolean;
};

type SavedView = { id: string; name: string; snapshot: FilterSnapshot };

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedView =>
        Boolean(x) &&
        typeof x === "object" &&
        typeof (x as SavedView).id === "string" &&
        typeof (x as SavedView).name === "string" &&
        typeof (x as SavedView).snapshot === "object" &&
        (x as SavedView).snapshot != null,
    );
  } catch {
    return [];
  }
}

function persistViews(views: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
}

function priorDeltaLine(current: number, prior: number | null | undefined): string | null {
  if (prior == null || Number.isNaN(prior)) return null;
  const d = current - prior;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (d === 0) return `same as prior (${fmt(prior)})`;
  const sign = d > 0 ? "+" : "";
  return `${sign}${fmt(d)} vs prior (${fmt(prior)})`;
}

function userDisplayName(
  users: Array<{ id: string; firstName?: string; lastName?: string; email?: string }>,
  userId: string | null,
): string {
  if (userId == null) return "Unassigned";
  const u = users.find((x) => x.id === userId);
  if (!u) return userId;
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return name || u.email || u.id;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const TICKET_STATUS_OPTIONS = ["open", "triaged", "in_progress", "resolved", "closed", "cancelled"];
const TICKET_PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const DUTY_STATUS_OPTIONS = ["pending", "in_progress", "completed", "cancelled", "overdue"];
const SHIFT_OPTIONS = ["day", "night"];
const LINKED_TYPE_LABELS: Record<string, string> = {
  ticket: "Tickets",
  incident: "Incidents",
  duty: "Duties",
};

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function hours(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}h`;
}

function periodTick(v: string): string {
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s.slice(0, 10);
}

function csvEscape(v: string | number | boolean): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]) {
  const body = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toggleId(list: string[], id: string, set: (v: string[]) => void) {
  if (list.includes(id)) set(list.filter((x) => x !== id));
  else set([...list, id]);
}

function buildQuery(params: {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  ticketCategoryIds: string[];
  ticketStatuses: string[];
  ticketPriorities: string[];
  assigneeUserIds: string[];
  requesterUserIds: string[];
  dutyIds: string[];
  dutyAssignmentStatuses: string[];
  shifts: string[];
  shiftReportShifts: string[];
  onlyWithIssues: boolean;
  comparePriorPeriod: boolean;
}): string {
  const sp = new URLSearchParams();
  sp.set("from", params.from);
  sp.set("to", params.to);
  sp.set("groupBy", params.groupBy);
  if (params.locationIds.length) sp.set("locationIds", params.locationIds.join(","));
  if (params.ticketCategoryIds.length) sp.set("ticketCategoryIds", params.ticketCategoryIds.join(","));
  if (params.ticketStatuses.length) sp.set("ticketStatuses", params.ticketStatuses.join(","));
  if (params.ticketPriorities.length) sp.set("ticketPriorities", params.ticketPriorities.join(","));
  if (params.assigneeUserIds.length) sp.set("assigneeUserIds", params.assigneeUserIds.join(","));
  if (params.requesterUserIds.length) sp.set("requesterUserIds", params.requesterUserIds.join(","));
  if (params.dutyIds.length) sp.set("dutyIds", params.dutyIds.join(","));
  if (params.dutyAssignmentStatuses.length) sp.set("dutyAssignmentStatuses", params.dutyAssignmentStatuses.join(","));
  if (params.shifts.length) sp.set("shifts", params.shifts.join(","));
  if (params.shiftReportShifts.length) sp.set("shiftReportShifts", params.shiftReportShifts.join(","));
  if (params.onlyWithIssues) sp.set("onlyWithIssues", "true");
  if (params.comparePriorPeriod) sp.set("comparePriorPeriod", "true");
  return sp.toString();
}

export default function OperationsReportsPage() {
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [ticketCategoryIds, setTicketCategoryIds] = useState<string[]>([]);
  const [ticketStatuses, setTicketStatuses] = useState<string[]>([]);
  const [ticketPriorities, setTicketPriorities] = useState<string[]>([]);
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [requesterUserIds, setRequesterUserIds] = useState<string[]>([]);
  const [dutyIds, setDutyIds] = useState<string[]>([]);
  const [dutyAssignmentStatuses, setDutyAssignmentStatuses] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [shiftReportShifts, setShiftReportShifts] = useState<string[]>([]);
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);
  const [comparePriorPeriod, setComparePriorPeriod] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [savedViewPicker, setSavedViewPicker] = useState("_none");

  useEffect(() => {
    setSavedViews(loadViews());
  }, []);

  const queryString = useMemo(
    () =>
      buildQuery({
        from,
        to,
        groupBy,
        locationIds,
        ticketCategoryIds,
        ticketStatuses,
        ticketPriorities,
        assigneeUserIds,
        requesterUserIds,
        dutyIds,
        dutyAssignmentStatuses,
        shifts,
        shiftReportShifts,
        onlyWithIssues,
        comparePriorPeriod,
      }),
    [
      from,
      to,
      groupBy,
      locationIds,
      ticketCategoryIds,
      ticketStatuses,
      ticketPriorities,
      assigneeUserIds,
      requesterUserIds,
      dutyIds,
      dutyAssignmentStatuses,
      shifts,
      shiftReportShifts,
      onlyWithIssues,
      comparePriorPeriod,
    ],
  );

  const snapshotFilters = (): FilterSnapshot => ({
    from,
    to,
    groupBy,
    locationIds,
    ticketCategoryIds,
    ticketStatuses,
    ticketPriorities,
    assigneeUserIds,
    requesterUserIds,
    dutyIds,
    dutyAssignmentStatuses,
    shifts,
    shiftReportShifts,
    onlyWithIssues,
    comparePriorPeriod,
  });

  const applySnapshot = (s: FilterSnapshot) => {
    setFrom(s.from);
    setTo(s.to);
    setGroupBy(s.groupBy);
    setLocationIds(s.locationIds);
    setTicketCategoryIds(s.ticketCategoryIds);
    setTicketStatuses(s.ticketStatuses);
    setTicketPriorities(s.ticketPriorities);
    setAssigneeUserIds(s.assigneeUserIds);
    setRequesterUserIds(s.requesterUserIds);
    setDutyIds(s.dutyIds);
    setDutyAssignmentStatuses(s.dutyAssignmentStatuses);
    setShifts(s.shifts);
    setShiftReportShifts(s.shiftReportShifts);
    setOnlyWithIssues(s.onlyWithIssues);
    setComparePriorPeriod(s.comparePriorPeriod);
  };

  const onSaveNamedView = () => {
    const name = saveViewName.trim();
    if (!name) return;
    const next: SavedView = { id: crypto.randomUUID(), name, snapshot: snapshotFilters() };
    const merged = [...savedViews, next];
    setSavedViews(merged);
    persistViews(merged);
    setSaveViewName("");
    setSaveDialogOpen(false);
  };

  const onDeleteSavedView = (id: string) => {
    const merged = savedViews.filter((v) => v.id !== id);
    setSavedViews(merged);
    persistViews(merged);
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<OperationsReportsPayload>({
    queryKey: ["/api/reports/operations", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reports/operations?${queryString}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || "Failed to load operations reports");
      }
      return res.json();
    },
  });

  const { data: careLocations = [] } = useQuery<Array<{ id: string; locationName: string }>>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/ticket-categories"],
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: users = [] } = useQuery<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: duties = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ["/api/operational-duties"],
    queryFn: async () => {
      const res = await fetch("/api/operational-duties", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const lineTickets = data?.series.ticketsOverTime ?? [];
  const lineDuties = data?.series.dutiesOverTime ?? [];
  const lineShiftReports = data?.series.shiftReportsOverTime ?? [];
  const statusPie = data?.tables.ticketsByStatus ?? [];
  const priorityBar = data?.tables.ticketsByPriority ?? [];
  const agingBar = data?.tables.ticketsAgingBuckets ?? [];
  const categoryChartRows = useMemo(
    () =>
      (data?.tables.ticketsByCategory ?? []).map((r) => {
        const name = r.categoryName;
        return {
          label: name.length > 30 ? `${name.slice(0, 30)}…` : name,
          categoryName: name,
          count: r.count,
        };
      }),
    [data?.tables.ticketsByCategory],
  );

  const assigneeChartRows = useMemo(() => {
    const rows = data?.tables.ticketsByAssignee ?? [];
    return rows.slice(0, 20).map((r) => {
      const full = userDisplayName(users, r.assigneeUserId);
      return {
        label: full.length > 22 ? `${full.slice(0, 22)}…` : full,
        fullLabel: full,
        open: r.open,
        resolved: r.resolvedInWindow,
      };
    });
  }, [data?.tables.ticketsByAssignee, users]);

  const linkPieLabeled = useMemo(
    () =>
      (data?.tables.shiftReportLinkCounts ?? []).map((r) => ({
        name: LINKED_TYPE_LABELS[r.linkedType] ?? r.linkedType,
        count: Number(r.count) || 0,
        linkedType: r.linkedType,
      })),
    [data?.tables.shiftReportLinkCounts],
  );

  const linkPieTotal = linkPieLabeled.reduce((s, r) => s + r.count, 0);

  const printFilterSummary = [
    `Window: ${from} → ${to} · Group by: ${groupBy}`,
    `Compare prior period (KPIs): ${comparePriorPeriod ? "yes" : "no"}`,
    `Locations: ${locationIds.length ? locationIds.length : "all"}`,
    `Ticket categories: ${ticketCategoryIds.length ? ticketCategoryIds.length : "all"}`,
    `Ticket statuses: ${ticketStatuses.length ? ticketStatuses.join(", ") : "all"}`,
    `Ticket priorities: ${ticketPriorities.length ? ticketPriorities.join(", ") : "all"}`,
    `Assignees: ${assigneeUserIds.length ? assigneeUserIds.length : "all"}`,
    `Requesters: ${requesterUserIds.length ? requesterUserIds.length : "all"}`,
    `Duties: ${dutyIds.length ? dutyIds.length : "all"} · Duty statuses: ${
      dutyAssignmentStatuses.length ? dutyAssignmentStatuses.join(", ") : "all"
    }`,
    `Duty shifts: ${shifts.length ? shifts.join(", ") : "all"} · Shift-report shifts: ${
      shiftReportShifts.length ? shiftReportShifts.join(", ") : "all"
    }`,
    `Only shift reports with issues: ${onlyWithIssues ? "yes" : "no"}`,
  ];

  const exportAging = () => {
    const rows = (data?.tables.ticketsAgingBuckets ?? []).map((r) => [r.bucket, r.count]);
    downloadCsv(`operations-ticket-aging-${from}-to-${to}.csv`, ["bucket", "count"], rows);
  };

  const exportCategoryStatus = () => {
    const rows: (string | number)[][] = [];
    for (const r of data?.tables.ticketsByCategory ?? []) rows.push(["category", r.categoryName, r.count]);
    for (const r of data?.tables.ticketsByStatus ?? []) rows.push(["status", r.status, r.count]);
    for (const r of data?.tables.ticketsByPriority ?? []) rows.push(["priority", r.priority, r.count]);
    downloadCsv(`operations-ticket-breakdowns-${from}-to-${to}.csv`, ["dimension", "value", "count"], rows);
  };

  const exportDutySummary = () => {
    const rows = (data?.tables.dutiesByLocation ?? []).map((r) => [
      r.locationName,
      r.total,
      r.completed,
      r.completionRate != null ? (r.completionRate * 100).toFixed(2) : "",
    ]);
    downloadCsv(
      `operations-duty-summary-${from}-to-${to}.csv`,
      ["locationName", "assignmentsTotal", "completed", "completionRatePct"],
      rows,
    );
  };

  const exportAssigneeWorkload = () => {
    const rows = (data?.tables.ticketsByAssignee ?? []).map((r) => [
      userDisplayName(users, r.assigneeUserId),
      r.open,
      r.resolvedInWindow,
    ]);
    downloadCsv(`operations-ticket-assignee-workload-${from}-to-${to}.csv`, ["assignee", "open", "resolvedInWindow"], rows);
  };

  const exportDutiesByDuty = () => {
    const rows = (data?.tables.dutiesByDuty ?? []).map((r) => [
      r.dutyTitle,
      r.dutyCategory,
      r.total,
      r.completed,
      r.completionRate != null ? (r.completionRate * 100).toFixed(2) : "",
    ]);
    downloadCsv(
      `operations-duties-by-duty-${from}-to-${to}.csv`,
      ["dutyTitle", "dutyCategory", "assignmentsTotal", "completed", "completionRatePct"],
      rows,
    );
  };

  const exportDutiesByCategory = () => {
    const rows = (data?.tables.dutiesByCategory ?? []).map((r) => [
      r.category,
      r.total,
      r.completed,
      r.completionRate != null ? (r.completionRate * 100).toFixed(2) : "",
    ]);
    downloadCsv(
      `operations-duties-by-category-${from}-to-${to}.csv`,
      ["category", "assignmentsTotal", "completed", "completionRatePct"],
      rows,
    );
  };

  useEffect(() => {
    document.body.classList.add(CLINICAL_REPORTS_PRINT_BODY_CLASS);
    return () => document.body.classList.remove(CLINICAL_REPORTS_PRINT_BODY_CLASS);
  }, []);

  return (
    <>
      <ClinicalReportsPrintStyles />
      <div
        className="space-y-6 p-4 pt-6 sm:p-6 sm:pt-7 pb-24 md:pb-8 bg-uventorybiz-light-gray min-h-[60vh] print:bg-white print:pb-6"
        data-testid="operations-reports-page"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 print:hidden">
              <Link href="/reports" className="hover:text-uventorybiz-navy underline-offset-4 hover:underline">
                Reports
              </Link>
              <span aria-hidden>/</span>
              <span>Operations</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 print:text-black">
              <Activity className="h-8 w-8 text-uventorybiz-navy shrink-0" />
              Operations reports
            </h1>
            <p className="text-uventorybiz-gray mt-1 max-w-2xl">
              Day-to-day operational analytics for ticket pipeline health, duty completion, and ShiftOver reporting
              signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden lg:self-start">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tickets">
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
                Manage tickets
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/operational-duties">
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
                Manage duties
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={isLoading}>
              <Printer className="h-4 w-4 mr-2" />
              Print / Save as PDF
            </Button>
          </div>
        </div>

        <div className="hidden print:block rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground space-y-1 mb-4">
          <p className="font-semibold text-[#142F5C]">Report parameters</p>
          {printFilterSummary.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {data?.meta?.priorPeriod ? (
            <p>
              KPI prior window: {data.meta.priorPeriod.from} → {data.meta.priorPeriod.to}
            </p>
          ) : null}
        </div>

        <Collapsible defaultOpen={false} className="print:hidden">
          <Card className="border-muted">
            <CardHeader className="p-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-t-lg px-6 py-4 text-left outline-none hover:bg-muted/40"
                >
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-base font-semibold leading-none">How to use this page</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="text-sm text-muted-foreground space-y-3 px-6 py-6 border-t border-border">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Set date window and grouping grain first.</li>
                  <li>Apply optional ticket, duty, and shift-report filters for drill-down.</li>
                  <li>Use KPI row to monitor backlog, completion, and shift acknowledgment quality.</li>
                  <li>Use CSV buttons for aging, breakdown, and duty summary exports.</li>
                </ol>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <CardDescription>Standard reporting window plus ticket, duty, and shift-report filters.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ops-from">From</Label>
              <Input id="ops-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ops-to">To</Label>
              <Input id="ops-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Group by</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Locations ({locationIds.length === 0 ? "all" : locationIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {careLocations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={locationIds.includes(loc.id)}
                          onCheckedChange={() => toggleId(locationIds, loc.id, setLocationIds)}
                        />
                        <span className="truncate">{loc.locationName}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ticket statuses</Label>
              <div className="flex flex-wrap gap-2">
                {TICKET_STATUS_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={ticketStatuses.includes(v)} onCheckedChange={() => toggleId(ticketStatuses, v, setTicketStatuses)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ticket priorities</Label>
              <div className="flex flex-wrap gap-2">
                {TICKET_PRIORITY_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={ticketPriorities.includes(v)} onCheckedChange={() => toggleId(ticketPriorities, v, setTicketPriorities)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duty statuses</Label>
              <div className="flex flex-wrap gap-2">
                {DUTY_STATUS_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={dutyAssignmentStatuses.includes(v)}
                      onCheckedChange={() => toggleId(dutyAssignmentStatuses, v, setDutyAssignmentStatuses)}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duty shifts</Label>
              <div className="flex flex-wrap gap-2">
                {SHIFT_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={shifts.includes(v)} onCheckedChange={() => toggleId(shifts, v, setShifts)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Shift-report shifts</Label>
              <div className="flex flex-wrap gap-2">
                {SHIFT_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={shiftReportShifts.includes(v)}
                      onCheckedChange={() => toggleId(shiftReportShifts, v, setShiftReportShifts)}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Additional flags</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={onlyWithIssues} onCheckedChange={(v) => setOnlyWithIssues(v === true)} />
                only shift reports with issues
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={comparePriorPeriod} onCheckedChange={(v) => setComparePriorPeriod(v === true)} />
                compare KPIs to prior period (same number of days)
              </label>
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Ticket categories ({ticketCategoryIds.length === 0 ? "all" : ticketCategoryIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={ticketCategoryIds.includes(cat.id)}
                          onCheckedChange={() => toggleId(ticketCategoryIds, cat.id, setTicketCategoryIds)}
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Assignees ({assigneeUserIds.length === 0 ? "all" : assigneeUserIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {users.map((u) => {
                      const label = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={assigneeUserIds.includes(u.id)}
                            onCheckedChange={() => toggleId(assigneeUserIds, u.id, setAssigneeUserIds)}
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Requesters ({requesterUserIds.length === 0 ? "all" : requesterUserIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {users.map((u) => {
                      const label = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={requesterUserIds.includes(u.id)}
                            onCheckedChange={() => toggleId(requesterUserIds, u.id, setRequesterUserIds)}
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Duties ({dutyIds.length === 0 ? "all" : dutyIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {duties.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={dutyIds.includes(d.id)} onCheckedChange={() => toggleId(dutyIds, d.id, setDutyIds)} />
                        <span className="truncate">{d.title}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 items-end border-t border-border pt-4">
              <div className="flex-1 min-w-[200px] max-w-sm space-y-1">
                <Label className="text-xs text-muted-foreground">Saved views</Label>
                <Select
                  value={savedViewPicker}
                  onValueChange={(v) => {
                    if (v === "_none") return;
                    const sv = savedViews.find((x) => x.id === v);
                    if (sv) applySnapshot(sv.snapshot);
                    setSavedViewPicker("_none");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load a saved view…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Choose a saved view…</SelectItem>
                    {savedViews.map((sv) => (
                      <SelectItem key={sv.id} value={sv.id}>
                        {sv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
                <Bookmark className="h-4 w-4 mr-2" />
                Save current as…
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={savedViews.length === 0}>
                    Manage ({savedViews.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <p className="text-xs text-muted-foreground mb-2">Remove presets from this browser.</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {savedViews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No saved views.</p>
                    ) : (
                      savedViews.map((sv) => (
                        <div key={sv.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium" title={sv.name}>
                            {sv.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            aria-label={`Delete ${sv.name}`}
                            onClick={() => onDeleteSavedView(sv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" onClick={exportAging} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                CSV: ticket aging
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportCategoryStatus} disabled={isLoading}>
                CSV: ticket breakdowns
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportDutySummary} disabled={isLoading}>
                CSV: duty by location
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportAssigneeWorkload} disabled={isLoading}>
                CSV: assignee workload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportDutiesByDuty} disabled={isLoading}>
                CSV: duties by duty
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportDutiesByCategory} disabled={isLoading}>
                CSV: duties by category
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save filter preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="ops-save-view-name">Name</Label>
              <Input
                id="ops-save-view-name"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="e.g. Monthly ops review"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveNamedView();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={onSaveNamedView} disabled={!saveViewName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Could not load reports</CardTitle>
              <CardDescription>{error instanceof Error ? error.message : "Unknown error"}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!error && isLoading ? <p className="text-sm text-muted-foreground">Loading operations analytics…</p> : null}

        {!error && !isLoading && data ? (
          <>
            {(() => {
              const p = data.kpisPriorPeriod;
              const showPrior = Boolean(comparePriorPeriod && p && data.meta.priorPeriod);
              return (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tickets open</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">{data.kpis.ticketsOpen}</p>
                  {showPrior && p ? (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {priorDeltaLine(data.kpis.ticketsOpen, p.ticketsOpen)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tickets created/resolved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.kpis.ticketsCreated} / {data.kpis.ticketsResolved}
                  </p>
                  {showPrior && p ? (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      Prior: {p.ticketsCreated} / {p.ticketsResolved}
                      {(() => {
                        const dc = priorDeltaLine(data.kpis.ticketsCreated, p.ticketsCreated);
                        const dr = priorDeltaLine(data.kpis.ticketsResolved, p.ticketsResolved);
                        const bits = [
                          dc ? `created ${dc}` : null,
                          dr ? `resolved ${dr}` : null,
                        ].filter(Boolean);
                        return bits.length ? ` · ${bits.join(" · ")}` : "";
                      })()}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Mean open ticket age</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">{hours(data.kpis.meanOpenTicketAgeHours)}</p>
                  {showPrior && p && p.meanOpenTicketAgeHours != null ? (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {data.kpis.meanOpenTicketAgeHours != null
                        ? priorDeltaLine(data.kpis.meanOpenTicketAgeHours, p.meanOpenTicketAgeHours)
                        : `Prior: ${hours(p.meanOpenTicketAgeHours)}`}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Duty completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.kpis.dutyAssignmentsCompleted} / {data.kpis.dutyAssignmentsTotal}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pct(data.kpis.dutyCompletionRate)} · overdue {data.kpis.dutyAssignmentsOverdue}
                  </p>
                  {showPrior && p ? (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      Prior: {p.dutyAssignmentsCompleted}/{p.dutyAssignmentsTotal} ({pct(p.dutyCompletionRate)}) · overdue{" "}
                      {p.dutyAssignmentsOverdue}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Shift report acknowledgment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.kpis.shiftReportAcknowledgmentCount} / {data.kpis.shiftReportsSubmitted}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(data.kpis.shiftReportAckRate)}</p>
                  {showPrior && p ? (
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      Prior: {p.shiftReportAcknowledgmentCount}/{p.shiftReportsSubmitted} ({pct(p.shiftReportAckRate)})
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
              );
            })()}

            <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
              <Card>
                <CardHeader><CardTitle className="text-base">Tickets over time</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineTickets}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tickFormatter={periodTick} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(v) => periodTick(String(v))} />
                      <Line type="monotone" dataKey="total" stroke="#142f5c" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Duties over time</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lineDuties}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" tickFormatter={periodTick} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={(v) => periodTick(String(v))} />
                      <Legend />
                      <Bar dataKey="total" name="Assignments" fill={CHART_COLORS[1]} />
                      <Bar dataKey="completed" name="Completed" fill={CHART_COLORS[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Ticket status mix</CardTitle></CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: number) => [value, "Count"]} />
                      <Legend />
                      <Pie data={statusPie} dataKey="count" nameKey="status" outerRadius={90} label>
                        {statusPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Ticket aging buckets</CardTitle></CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingBar}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS[3]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Ticket priority mix</CardTitle></CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityBar} layout="vertical" margin={{ left: 4, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="priority" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {priorityBar.map((entry, i) => (
                          <Cell key={entry.priority} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Shift report link types</CardTitle></CardHeader>
                <CardContent className="h-[260px]">
                  {linkPieTotal === 0 ? (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md px-4 text-center">
                      No shift report links (tickets, incidents, or duties) in this date range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip formatter={(value: number) => [value, "Links"]} />
                        <Legend />
                        <Pie
                          data={linkPieLabeled}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {linkPieLabeled.map((_, i) => (
                            <Cell key={`${linkPieLabeled[i]?.linkedType ?? i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={1} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets by category</CardTitle>
                <CardDescription>Table and volume by category for tickets created in this window.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
                  <div className="overflow-x-auto min-w-0 order-2 lg:order-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.tables.ticketsByCategory.map((r, index) => (
                          <TableRow key={`${r.categoryId ?? "unknown"}-${r.categoryName}`}>
                            <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                            <TableCell>{r.categoryName}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="h-[280px] min-h-[240px] min-w-0 order-1 lg:order-2">
                    {categoryChartRows.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                        No tickets in this window.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartRows} layout="vertical" margin={{ left: 4, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => [value, "Tickets"]}
                            labelFormatter={(_, payload) =>
                              (payload?.[0]?.payload as { categoryName?: string })?.categoryName ?? "Category"
                            }
                          />
                          <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]}>
                            {categoryChartRows.map((_, i) => (
                              <Cell key={`${categoryChartRows[i]?.categoryName ?? i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignee workload</CardTitle>
                <CardDescription>
                  Open backlog and tickets resolved in this window (among tickets created in window). Chart: bars = open
                  tickets, line = resolved in window (top 20 assignees by table order).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1">
                  <div className="h-[340px] min-h-[280px] min-w-0">
                    {assigneeChartRows.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                        No assignee rows for this filter window.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={assigneeChartRows} margin={{ top: 8, right: 8, left: 4, bottom: 56 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="label"
                            type="category"
                            tick={{ fontSize: 10 }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={72}
                          />
                          <YAxis allowDecimals={false} width={36} />
                          <Tooltip
                            formatter={(value: number, name: string) => [value, name]}
                            labelFormatter={(_, payload) =>
                              (payload?.[0]?.payload as { fullLabel?: string })?.fullLabel ?? "Assignee"
                            }
                          />
                          <Legend />
                          <Bar dataKey="open" name="Open" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Line
                            type="monotone"
                            dataKey="resolved"
                            name="Resolved (window)"
                            stroke={CHART_COLORS[3]}
                            strokeWidth={2}
                            dot={{ r: 4, fill: CHART_COLORS[3], strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="overflow-x-auto min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead className="text-right">Open</TableHead>
                          <TableHead className="text-right">Resolved (window)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.tables.ticketsByAssignee ?? []).map((r, index) => (
                          <TableRow key={r.assigneeUserId ?? "unassigned"}>
                            <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                            <TableCell>{userDisplayName(users, r.assigneeUserId)}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.open}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.resolvedInWindow}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Duty assignments by catalog duty</CardTitle>
                <CardDescription>Volume and completion for each duty in the catalog (for the filtered assignment window).</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Duty</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Assignments</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables.dutiesByDuty ?? []).map((r, index) => (
                      <TableRow key={r.dutyId}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>{r.dutyTitle}</TableCell>
                        <TableCell className="capitalize">{r.dutyCategory}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(r.completionRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Duty assignments by catalog category</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Assignments</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables.dutiesByCategory ?? []).map((r, index) => (
                      <TableRow key={r.category}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="capitalize">{r.category}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(r.completionRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Duty completion by location</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Assignments</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Completion rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tables.dutiesByLocation.map((r, index) => (
                      <TableRow key={`${r.locationId ?? "unknown"}-${r.locationName}`}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>{r.locationName}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(r.completionRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Shift reports over time</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineShiftReports}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tickFormatter={periodTick} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(v) => periodTick(String(v))} />
                    <Line type="monotone" dataKey="total" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : null}

        <MobileNav />
      </div>
    </>
  );
}
