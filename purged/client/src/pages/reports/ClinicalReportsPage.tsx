import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  AlertTriangle,
  BarChart3,
  Bookmark,
  Briefcase,
  Building2,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  DoorClosed,
  Download,
  Filter,
  Info,
  Printer,
  Stethoscope,
  Trash2,
  Truck,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MobileNav from "@/components/MobileNav";
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { ClinicalReportsPrintStyles } from "@/components/ClinicalReportsPrintStyles";
import { CLINICAL_REPORTS_PRINT_BODY_CLASS } from "@/lib/clinicalReportsPrint";
import {
  CLINICAL_DISPOSITIONS,
  CLINICAL_TRIAGE_ACUITIES,
  CLINICAL_VISIT_STATUS,
  CLINICAL_VISIT_TYPES,
} from "@/lib/clinicalReportFilters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GroupBy = "day" | "week" | "month";

export type ClinicalReportsKpis = {
  totalVisits: number;
  triageEvents: number;
  transfers: number;
  transferRate: number | null;
  /** Medical visits with hospital-transfer disposition and ambulance used */
  ambulanceVisits: number;
  /** ambulanceVisits / transfers when transfers > 0 */
  ambulanceTransferRate: number | null;
  detentionVisits: number;
  detentionRate: number | null;
  returnToWorkVisits: number;
  otherDispositionVisits: number;
  /** Return-to-work ÷ (return-to-work + hospital transfer); null if neither outcome occurred. */
  operationalContinuityRate: number | null;
  visitsWithIncidentOverlap: number;
  incidentOverlapRate: number | null;
  totalIncidents: number;
  incidentsWithAmbulance: number;
  incidentAmbulanceRate: number | null;
};

export type ClinicalReportsPayload = {
  meta: {
    from: string;
    to: string;
    groupBy: GroupBy;
    generatedAt: string;
    /** Present when `comparePriorPeriod=true`: contiguous window of equal length ending the day before `from`. */
    priorPeriod?: { from: string; to: string };
    filters?: {
      includeIncidents: boolean;
      locationIds: string[];
      visitTypes: string[];
      dispositions: string[];
      visitStatus: string[];
      triageAcuities: string[];
      companyIds: string[];
      companyTypes: string[];
    };
  };
  kpis: ClinicalReportsKpis;
  /** Same shape as `kpis` for the prior comparison window; omitted or null when comparison is off. */
  kpisPriorPeriod?: ClinicalReportsKpis | null;
  series: {
    visitsOverTime: Array<{ period: string; total: number }>;
    visitsOverTimeByCompany: Array<{
      period: string;
      companyId: string;
      companyName: string;
      companyType: string | null;
      count: number;
    }>;
    dispositionMix: Array<{ disposition: string; count: number }>;
    detentionDispositionMix: Array<{ disposition: string; count: number }>;
    visitTypeMix: Array<{ visitType: string; count: number }>;
    triageAcuityMix: Array<{ acuity: string; count: number }>;
    triageAcuityOverTime: Array<{
      period: string;
      red: number;
      orange: number;
      yellow: number;
      green: number;
      other: number;
    }>;
  };
  tables: {
    byCompany: Array<{
      companyId: string;
      companyName: string;
      companyType: string | null;
      visitCount: number;
      transferCount: number;
      transferRate: number | null;
      triageEventCount: number;
    }>;
    visitTypeByDisposition: Array<{ visitType: string; disposition: string; count: number }>;
    topLocations: Array<{ locationId: string | null; locationName: string; count: number }>;
    /** Occupational incident counts by care location (same tenant/date/location/company filters as incidents in cases matrix). */
    incidentsPerPost: Array<{ locationId: string | null; locationName: string; count: number }>;
    casesByDayByPost: {
      dates: string[];
      columns: Array<{ key: string; locationId: string | null; locationName: string }>;
      rows: Array<{ date: string; cells: number[]; rowTotal: number }>;
      columnTotals: number[];
      grandTotal: number;
    };
    companyByLocation: Array<{
      companyId: string | null;
      companyName: string;
      companyType: string | null;
      locationId: string | null;
      locationName: string;
      visitCount: number;
    }>;
    ambulanceByClinic: Array<{
      locationId: string | null;
      locationName: string;
      visitCaseCount: number;
      visitTransfers: number;
      visitAmbulanceOnTransfers: number;
      visitAmbulanceShareOfTransfers: number | null;
      incidentTotal: number;
      incidentsWithAmbulance: number;
      incidentAmbulanceShare: number | null;
      /** Medical visits + incidents at this care location (cases volume like the merged matrix). */
      totalCasesAtPost: number;
      /** Sum of ambulance-on-transfer visits and ambulance-flagged incidents at this post. */
      totalAmbulanceUsage: number;
      ambulancePerOverallCaseVolume: number | null;
    }>;
  };
  detail: {
    rows: Array<{
      visitId: string;
      visitDate: string;
      visitType: string;
      disposition: string;
      status: string | null;
      companyId: string | null;
      companyName: string;
      locationId: string | null;
      locationName: string;
      providerDisplay: string;
    }>;
    page: number;
    pageSize: number;
    totalCount: number;
  } | null;
};

const DISPO_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function buildQuery(params: {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  companyIds: string[];
  companyTypes: string[];
  visitTypes: string[];
  dispositions: string[];
  visitStatus: string[];
  triageAcuities: string[];
  includeIncidents: boolean;
  comparePriorPeriod: boolean;
  includeDetail: boolean;
  detailPage: number;
  detailPageSize: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("from", params.from);
  sp.set("to", params.to);
  sp.set("groupBy", params.groupBy);
  if (params.locationIds.length) sp.set("locationIds", params.locationIds.join(","));
  if (params.companyIds.length) sp.set("companyIds", params.companyIds.join(","));
  if (params.companyTypes.length) sp.set("companyTypes", params.companyTypes.join(","));
  if (params.visitTypes.length) sp.set("visitTypes", params.visitTypes.join(","));
  if (params.dispositions.length) sp.set("dispositions", params.dispositions.join(","));
  if (params.visitStatus.length) sp.set("visitStatus", params.visitStatus.join(","));
  if (params.triageAcuities.length) sp.set("triageAcuities", params.triageAcuities.join(","));
  if (!params.includeIncidents) sp.set("includeIncidents", "false");
  if (params.comparePriorPeriod) sp.set("comparePriorPeriod", "true");
  if (params.includeDetail) {
    sp.set("includeDetail", "true");
    sp.set("detailPage", String(params.detailPage));
    sp.set("detailPageSize", String(params.detailPageSize));
  }
  return sp.toString();
}

function priorCountDeltaLine(current: number, prior: number | null | undefined): string | null {
  if (prior == null || Number.isNaN(prior)) return null;
  const d = current - prior;
  if (d === 0) return `same as prior (${prior})`;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d} vs prior (${prior})`;
}

function formatDispositionLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatVisitTypeLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatVisitStatusLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTriageAcuityLabel(raw: string): string {
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
}

const CLINICAL_VIEWS_STORAGE_KEY = "mineaid-clinical-report-views-v1";

export type ClinicalReportFilterSnapshot = {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  companyIds: string[];
  companyTypes: string[];
  visitTypes: string[];
  dispositions: string[];
  visitStatus: string[];
  triageAcuities: string[];
  includeIncidents: boolean;
  comparePriorPeriod?: boolean;
  includeDetail?: boolean;
};

type SavedClinicalView = { id: string; name: string; snapshot: ClinicalReportFilterSnapshot };

function loadSavedClinicalViews(): SavedClinicalView[] {
  try {
    const raw = localStorage.getItem(CLINICAL_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedClinicalView =>
        Boolean(x) &&
        typeof x === "object" &&
        typeof (x as SavedClinicalView).id === "string" &&
        typeof (x as SavedClinicalView).name === "string" &&
        typeof (x as SavedClinicalView).snapshot === "object" &&
        (x as SavedClinicalView).snapshot != null,
    );
  } catch {
    return [];
  }
}

function persistSavedClinicalViews(views: SavedClinicalView[]) {
  localStorage.setItem(CLINICAL_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

function formatCaseMatrixDate(dateStr: string): string {
  try {
    const d = parseISO(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return format(d, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

/** Axis / tooltip labels for period strings (YYYY-MM-DD, YYYY-MM, or ISO datetimes). */
function formatPeriodTick(value: string, grain: GroupBy): string {
  const trimmed = String(value ?? "").trim();
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    if (grain === "month") return format(d, "MMM yyyy");
    return format(d, "MMM d, yyyy");
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}-01`);
    return Number.isNaN(d.getTime()) ? trimmed : format(d, "MMM yyyy");
  }
  return trimmed.slice(0, 16);
}

const LINE_STROKE = "#142f5c";

/** Work continuity pie — RTW vs transfer vs legacy/other dispositions. */
const WORK_CONTINUITY_COLORS = {
  rtw: "#15803d",
  transfer: "#b91c1c",
  other: "#64748b",
} as const;

/** Stacked triage chart — explicit fills for SVG (matches SATS colors). */
const TRIAGE_STACK_CONFIG = {
  red: { label: "Red", color: "#b91c1c" },
  orange: { label: "Orange", color: "#ea580c" },
  yellow: { label: "Yellow", color: "#ca8a04" },
  green: { label: "Green", color: "#15803d" },
  other: { label: "Other / unknown", color: "#64748b" },
} as const;

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function downloadBreakdownMetricsCsv(
  filename: string,
  rows: Array<{ metric_type: string; dim_a: string; dim_b: string; count: number }>,
) {
  downloadCsv(filename, ["metric_type", "dim_a", "dim_b", "count"], rows.map((r) => [r.metric_type, r.dim_a, r.dim_b, r.count]));
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** CSV column titles for care-location columns — duplicate display names get a stable `(key)` suffix. */
function casesMatrixPostHeaders(columns: ClinicalReportsPayload["tables"]["casesByDayByPost"]["columns"]): string[] {
  const display = (c: (typeof columns)[number]) => c.locationName.trim() || "Unknown location";
  const nameCounts = new Map<string, number>();
  for (const c of columns) {
    const base = display(c);
    nameCounts.set(base, (nameCounts.get(base) ?? 0) + 1);
  }
  return columns.map((c) => {
    const base = display(c);
    const dup = (nameCounts.get(base) ?? 0) > 1;
    return dup ? `${base} (${c.key})` : base;
  });
}

type CompanySortKey =
  | "companyName"
  | "companyType"
  | "visitCount"
  | "transferCount"
  | "transferRate"
  | "triageEventCount";

export default function ClinicalReportsPage() {
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [visitTypes, setVisitTypes] = useState<string[]>([]);
  const [dispositions, setDispositions] = useState<string[]>([]);
  const [visitStatus, setVisitStatus] = useState<string[]>([]);
  const [triageAcuities, setTriageAcuities] = useState<string[]>([]);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [comparePriorPeriod, setComparePriorPeriod] = useState(false);
  const [includeDetail, setIncludeDetail] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [savedViews, setSavedViews] = useState<SavedClinicalView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [savedViewPicker, setSavedViewPicker] = useState("_none");
  const [companySort, setCompanySort] = useState<{ key: CompanySortKey; dir: "asc" | "desc" }>({
    key: "visitCount",
    dir: "desc",
  });

  useEffect(() => {
    setSavedViews(loadSavedClinicalViews());
  }, []);

  const queryString = useMemo(
    () =>
      buildQuery({
        from,
        to,
        groupBy,
        locationIds,
        companyIds,
        companyTypes,
        visitTypes,
        dispositions,
        visitStatus,
        triageAcuities,
        includeIncidents,
        comparePriorPeriod,
        includeDetail,
        detailPage,
        detailPageSize: 25,
      }),
    [
      from,
      to,
      groupBy,
      locationIds,
      companyIds,
      companyTypes,
      visitTypes,
      dispositions,
      visitStatus,
      triageAcuities,
      includeIncidents,
      comparePriorPeriod,
      includeDetail,
      detailPage,
    ],
  );

  const snapshotFilters = (): ClinicalReportFilterSnapshot => ({
    from,
    to,
    groupBy,
    locationIds,
    companyIds,
    companyTypes,
    visitTypes,
    dispositions,
    visitStatus,
    triageAcuities,
    includeIncidents,
    comparePriorPeriod,
    includeDetail,
  });

  const applySnapshot = (s: ClinicalReportFilterSnapshot) => {
    setFrom(s.from);
    setTo(s.to);
    setGroupBy(s.groupBy);
    setLocationIds(s.locationIds);
    setCompanyIds(s.companyIds);
    setCompanyTypes(s.companyTypes);
    setVisitTypes(s.visitTypes);
    setDispositions(s.dispositions);
    setVisitStatus(s.visitStatus);
    setTriageAcuities(s.triageAcuities);
    setIncludeIncidents(s.includeIncidents);
    setComparePriorPeriod(s.comparePriorPeriod ?? false);
    setIncludeDetail(s.includeDetail ?? false);
    setDetailPage(1);
  };

  const onSaveNamedView = () => {
    const name = saveViewName.trim();
    if (!name) return;
    const next: SavedClinicalView = {
      id: crypto.randomUUID(),
      name,
      snapshot: snapshotFilters(),
    };
    const merged = [...savedViews, next];
    setSavedViews(merged);
    persistSavedClinicalViews(merged);
    setSaveViewName("");
    setSaveDialogOpen(false);
  };

  const onDeleteSavedView = (id: string) => {
    const merged = savedViews.filter((v) => v.id !== id);
    setSavedViews(merged);
    persistSavedClinicalViews(merged);
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<ClinicalReportsPayload>({
    queryKey: ["/api/reports/clinical", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reports/clinical?${queryString}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || "Failed to load clinical reports");
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

  const { data: companiesList = [] } = useQuery<
    Array<{ id: string; name: string; companyType?: string | null }>
  >({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const visitsOverTimeChartData = useMemo(() => {
    return (data?.series?.visitsOverTime ?? []).map((d) => ({
      period: d.period,
      total: Math.max(0, Number(d.total)),
    }));
  }, [data?.series?.visitsOverTime]);

  const detentionPieData = useMemo(
    () =>
      (data?.series?.detentionDispositionMix ?? []).map((r) => ({
        ...r,
        name: formatDispositionLabel(r.disposition),
      })),
    [data?.series?.detentionDispositionMix],
  );

  const workContinuityPieData = useMemo(() => {
    const rtw = data?.kpis?.returnToWorkVisits ?? 0;
    const xfer = data?.kpis?.transfers ?? 0;
    const other = data?.kpis?.otherDispositionVisits ?? 0;
    const out: Array<{ name: string; count: number; fill: string }> = [];
    if (rtw > 0) out.push({ name: "Return to work", count: rtw, fill: WORK_CONTINUITY_COLORS.rtw });
    if (xfer > 0) out.push({ name: "Hospital transfer", count: xfer, fill: WORK_CONTINUITY_COLORS.transfer });
    if (other > 0) out.push({ name: "Other disposition", count: other, fill: WORK_CONTINUITY_COLORS.other });
    return out;
  }, [data?.kpis?.returnToWorkVisits, data?.kpis?.transfers, data?.kpis?.otherDispositionVisits]);

  const incidentsPerPostPieData = useMemo(() => {
    const rows = data?.tables?.incidentsPerPost ?? [];
    return rows.map((r, i) => ({
      name: r.locationName,
      count: r.count,
      fill: DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length],
    }));
  }, [data?.tables?.incidentsPerPost]);

  const incidentsPerPostTotal = useMemo(
    () => (data?.tables?.incidentsPerPost ?? []).reduce((s, r) => s + r.count, 0),
    [data?.tables?.incidentsPerPost],
  );

  const stackedByCompany = useMemo(() => {
    const rows = data?.series?.visitsOverTimeByCompany ?? [];
    const totals = new Map<string, { name: string; total: number }>();
    for (const r of rows) {
      const prev = totals.get(r.companyId) ?? { name: r.companyName, total: 0 };
      prev.total += Math.max(0, Number(r.count));
      prev.name = r.companyName;
      totals.set(r.companyId, prev);
    }
    const topEntries = [...totals.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    const topIds = new Set(topEntries.map(([id]) => id));
    const periods = [...new Set(rows.map((r) => r.period))].sort();
    const chartRows = periods.map((period) => {
      const row: Record<string, number | string> = { period };
      let other = 0;
      const byTopId = new Map<string, number>();
      for (const r of rows) {
        if (r.period !== period) continue;
        if (topIds.has(r.companyId)) {
          byTopId.set(r.companyId, (byTopId.get(r.companyId) ?? 0) + Math.max(0, Number(r.count)));
        } else {
          other += Math.max(0, Number(r.count));
        }
      }
      topEntries.forEach(([id], idx) => {
        row[`co_${idx}`] = byTopId.get(id) ?? 0;
      });
      if (other > 0) row.other = other;
      return row;
    });
    const companyKeys = topEntries.map(([id], idx) => ({
      key: `co_${idx}`,
      label: totals.get(id)?.name ?? id,
      id,
    }));
    const hasOther = rows.some((r) => !topIds.has(r.companyId));
    return { chartRows, companyKeys, hasOther };
  }, [data?.series?.visitsOverTimeByCompany]);

  const stackChartConfig: ChartConfig = useMemo(() => {
    const c: ChartConfig = {
      other: { label: "Other companies", color: "var(--mineaid-gray)" },
    };
    stackedByCompany.companyKeys.forEach((k, i) => {
      c[k.key] = { label: k.label, color: DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length] };
    });
    return c;
  }, [stackedByCompany.companyKeys]);

  const triageStackChartConfig: ChartConfig = useMemo(() => {
    const c: ChartConfig = {};
    (Object.keys(TRIAGE_STACK_CONFIG) as Array<keyof typeof TRIAGE_STACK_CONFIG>).forEach((k) => {
      c[k] = { label: TRIAGE_STACK_CONFIG[k].label, color: TRIAGE_STACK_CONFIG[k].color };
    });
    return c;
  }, []);

  const AMBULANCE_CLINIC_CHART_LIMIT = 15;

  const ambulanceByClinicTotalChartRows = useMemo(() => {
    const rows = data?.tables?.ambulanceByClinic ?? [];
    return rows.slice(0, AMBULANCE_CLINIC_CHART_LIMIT).map((r) => ({
      label: r.locationName.length > 26 ? `${r.locationName.slice(0, 24)}…` : r.locationName,
      fullName: r.locationName,
      totalAmbulance: r.totalAmbulanceUsage,
      casesAtPost: r.totalCasesAtPost,
    }));
  }, [data?.tables?.ambulanceByClinic]);

  const ambulanceByClinicChartRows = useMemo(() => {
    const rows = data?.tables?.ambulanceByClinic ?? [];
    return rows.slice(0, AMBULANCE_CLINIC_CHART_LIMIT).map((r) => ({
      label: r.locationName.length > 26 ? `${r.locationName.slice(0, 24)}…` : r.locationName,
      fullName: r.locationName,
      visitAmb: r.visitAmbulanceOnTransfers,
      incidentAmb: r.incidentsWithAmbulance,
    }));
  }, [data?.tables?.ambulanceByClinic]);

  function formatAmbulancePerCase(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return "—";
    return n.toFixed(3);
  }

  const sortedByCompany = useMemo(() => {
    const rows = [...(data?.tables?.byCompany ?? [])];
    const { key, dir } = companySort;
    const m = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (key === "visitCount" || key === "transferCount" || key === "triageEventCount") {
        return m * (Number(a[key]) - Number(b[key]));
      }
      if (key === "transferRate") {
        const ar = a.transferRate ?? -1;
        const br = b.transferRate ?? -1;
        return m * (ar - br);
      }
      if (key === "companyType") {
        return m * String(a.companyType ?? "").localeCompare(String(b.companyType ?? ""));
      }
      return m * a.companyName.localeCompare(b.companyName);
    });
    return rows;
  }, [data?.tables?.byCompany, companySort]);

  const toggleCompanySort = (key: CompanySortKey) => {
    setCompanySort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };

  useEffect(() => {
    document.body.classList.add(CLINICAL_REPORTS_PRINT_BODY_CLASS);
    return () => document.body.classList.remove(CLINICAL_REPORTS_PRINT_BODY_CLASS);
  }, []);

  useEffect(() => {
    if (!includeDetail) setDetailPage(1);
  }, [includeDetail]);

  const printFilterSummaryLines = useMemo(() => {
    const locLabel =
      locationIds.length === 0
        ? "All locations"
        : locationIds
            .map((id) => careLocations.find((l) => l.id === id)?.locationName ?? id)
            .join("; ");
    const coLabel =
      companyIds.length === 0
        ? "All companies"
        : companyIds.map((id) => companiesList.find((c) => c.id === id)?.name ?? id).join("; ");
    const typesLabel =
      companyTypes.length === 0 ? "All company types" : companyTypes.map((t) => t.replace(/_/g, " ")).join(", ");
    const vtLabel =
      visitTypes.length === 0 ? "All visit types" : visitTypes.map(formatVisitTypeLabel).join(", ");
    const dispLabel =
      dispositions.length === 0 ? "All dispositions" : dispositions.map(formatDispositionLabel).join(", ");
    const stLabel =
      visitStatus.length === 0 ? "All statuses" : visitStatus.map(formatVisitStatusLabel).join(", ");
    const triLabel =
      triageAcuities.length === 0
        ? "All triage acuities"
        : triageAcuities.map(formatTriageAcuityLabel).join(", ");
    return [
      `Window: ${from} → ${to} · Group by: ${groupBy}`,
      `Locations: ${locLabel}`,
      `Companies: ${coLabel}`,
      `Company types: ${typesLabel}`,
      `Visit types: ${vtLabel}`,
      `Dispositions: ${dispLabel}`,
      `Visit status: ${stLabel}`,
      `Triage acuity: ${triLabel}`,
      `Include incidents (matrix, incidents per post, ambulance metrics): ${includeIncidents ? "yes" : "no"}`,
      `Compare prior period (KPIs): ${comparePriorPeriod ? "yes" : "no"}`,
      `Visit-level detail table: ${includeDetail ? `yes (page ${detailPage})` : "no"}`,
    ];
  }, [
    from,
    to,
    groupBy,
    locationIds,
    companyIds,
    companyTypes,
    visitTypes,
    dispositions,
    visitStatus,
    triageAcuities,
    includeIncidents,
    comparePriorPeriod,
    includeDetail,
    detailPage,
    careLocations,
    companiesList,
  ]);

  const sortIndicator = (key: CompanySortKey) =>
    companySort.key === key ? (companySort.dir === "asc" ? " ↑" : " ↓") : "";

  const onExportByCompany = () => {
    const rows = data?.tables?.byCompany ?? [];
    downloadCsv(
      `clinical-by-company-${from}-to-${to}.csv`,
      ["companyName", "companyType", "visitCount", "transferCount", "transferRate", "triageEventCount"],
      rows.map((r) => [
        r.companyName,
        r.companyType ?? "",
        r.visitCount,
        r.transferCount,
        r.transferRate != null ? (r.transferRate * 100).toFixed(2) + "%" : "",
        r.triageEventCount,
      ]),
    );
  };

  const onExportBreakdowns = () => {
    const visitTypes = data?.series?.visitTypeMix ?? [];
    const locs = data?.tables?.topLocations ?? [];
    const acuity = data?.series?.triageAcuityMix ?? [];
    const vtd = data?.tables?.visitTypeByDisposition ?? [];
    const rows: Array<{ metric_type: string; dim_a: string; dim_b: string; count: number }> = [];
    for (const r of visitTypes) {
      rows.push({ metric_type: "visit_type", dim_a: r.visitType, dim_b: "", count: r.count });
    }
    for (const r of locs) {
      rows.push({ metric_type: "location", dim_a: r.locationName, dim_b: "", count: r.count });
    }
    for (const r of acuity) {
      rows.push({ metric_type: "triage_acuity", dim_a: r.acuity, dim_b: "", count: r.count });
    }
    for (const r of vtd) {
      rows.push({
        metric_type: "visit_type_disposition",
        dim_a: r.visitType,
        dim_b: r.disposition,
        count: r.count,
      });
    }
    for (const r of data?.series?.detentionDispositionMix ?? []) {
      rows.push({
        metric_type: "detention_disposition",
        dim_a: r.disposition,
        dim_b: "",
        count: r.count,
      });
    }
    rows.push({
      metric_type: "work_continuity",
      dim_a: "return_to_work",
      dim_b: "",
      count: data?.kpis?.returnToWorkVisits ?? 0,
    });
    rows.push({
      metric_type: "work_continuity",
      dim_a: "hospital_transfer",
      dim_b: "",
      count: data?.kpis?.transfers ?? 0,
    });
    rows.push({
      metric_type: "work_continuity",
      dim_a: "other_disposition",
      dim_b: "",
      count: data?.kpis?.otherDispositionVisits ?? 0,
    });
    downloadBreakdownMetricsCsv(`clinical-breakdowns-${from}-to-${to}.csv`, rows);
  };

  const onExportCasesMatrix = () => {
    const m = data?.tables?.casesByDayByPost;
    const cols = m?.columns ?? [];
    if (!cols.length) return;
    const postHeaders = casesMatrixPostHeaders(cols);
    const headers = ["date", ...postHeaders, "row_total"];
    const bodyRows = (m?.rows ?? []).map((row) => [row.date, ...(row.cells ?? []), row.rowTotal]);
    const totalsRow: (string | number)[] = ["Total", ...(m?.columnTotals ?? []), m?.grandTotal ?? 0];
    downloadCsv(`clinical-cases-by-day-post-${from}-to-${to}.csv`, headers, [...bodyRows, totalsRow]);
  };

  const onExportVisitDetail = () => {
    const d = data?.detail;
    if (!d?.rows.length) return;
    downloadCsv(
      `clinical-visit-detail-${from}-to-${to}-page-${d.page}.csv`,
      [
        "visitId",
        "visitDate",
        "visitType",
        "disposition",
        "status",
        "companyName",
        "locationName",
        "providerDisplay",
      ],
      d.rows.map((r) => [
        r.visitId,
        r.visitDate,
        r.visitType,
        r.disposition,
        r.status ?? "",
        r.companyName,
        r.locationName,
        r.providerDisplay,
      ]),
    );
  };

  const toggleId = (list: string[], id: string, set: (v: string[]) => void) => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else set([...list, id]);
  };

  return (
    <>
      <ClinicalReportsPrintStyles />
      <div
        className="space-y-6 p-4 sm:p-6 pb-24 md:pb-8 bg-mineaid-light-gray min-h-[60vh] print:bg-white print:pb-6"
        data-testid="clinical-reports-page"
      >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 print:hidden">
            <Link href="/reports" className="hover:text-mineaid-navy underline-offset-4 hover:underline">
              Reports
            </Link>
            <span aria-hidden>/</span>
            <span>Clinical</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 print:text-black">
            <Stethoscope className="h-8 w-8 text-mineaid-navy shrink-0 print:text-mineaid-navy" />
            Clinical reports
          </h1>
          <p className="text-mineaid-gray mt-1 max-w-2xl print:text-gray-700">
            Aggregate visit activity, dispositions, transfers, triage, and employer-company workload for the selected
            window.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => window.print()} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-2" aria-hidden />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="hidden print:block rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground space-y-1 mb-4">
        <p className="font-semibold text-[#142F5C]">Report parameters</p>
        {printFilterSummaryLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {data?.meta?.generatedAt ? (
          <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
            Generated {format(new Date(data.meta.generatedAt), "yyyy-MM-dd HH:mm")}
          </p>
        ) : null}
      </div>

      <Collapsible defaultOpen={false} className="print:hidden">
        <Card className="border-muted">
          <CardHeader className="p-0">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-t-lg px-6 py-4 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Toggle how-to guide for this page"
              >
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-base font-semibold leading-none">How to use this page</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0 max-sm:hidden">
                  <span className="group-data-[state=open]:hidden">Show</span>
                  <span className="hidden group-data-[state=open]:inline">Hide</span>
                </span>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="text-sm text-muted-foreground space-y-3 pt-0 px-6 pb-6 border-t border-border">
              <CardDescription className="text-sm pt-4">
                Short workflow for filters, exports, and the ambulance section. A fuller operator guide lives in the clinical
                reports module plan (§4.0).
              </CardDescription>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Set <strong className="text-foreground">From</strong>, <strong className="text-foreground">To</strong>, and{" "}
                  <strong className="text-foreground">Group by</strong> — charts follow the grouping you choose.
                </li>
                <li>
                  Narrow by <strong className="text-foreground">Locations</strong> and employer{" "}
                  <strong className="text-foreground">Companies</strong> (optional visit type, disposition, status, triage
                  acuity).
                </li>
                <li>
                  <strong className="text-foreground">Include occupational incidents</strong> — when on, incidents feed the
                  cases matrix, incidents-per-post, and incident-side ambulance metrics; when off, those incident slices are
                  empty.
                </li>
                <li>
                  <strong className="text-foreground">Compare prior period</strong> — adds a prior window of equal length and
                  KPI comparison lines.
                </li>
                <li>
                  <strong className="text-foreground">Visit-level detail</strong> — optional paginated table (no patient
                  identifiers) plus CSV for the current page.
                </li>
                <li>
                  <strong className="text-foreground">Saved views</strong> — store and reload named filter presets in this
                  browser.
                </li>
                <li>
                  Use toolbar and card <strong className="text-foreground">Export</strong> actions;{" "}
                  <strong className="text-foreground">Print / Save as PDF</strong> uses the browser print dialog.
                </li>
                <li>
                  <strong className="text-foreground">Ambulance usage</strong> — summary KPIs; bar + table for{" "}
                  <em>total</em> ambulance per clinic; second chart + table for visit vs incident breakdown.
                </li>
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
          <CardDescription>
            Date range, grouping, care locations, companies, clinical dimensions, and saved view presets (stored in this
            browser).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="cr-from">From</Label>
            <Input id="cr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-to">To</Label>
            <Input id="cr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <div className="space-y-2 flex flex-col justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-full">
                  <span className="truncate">
                    Locations ({locationIds.length === 0 ? "all" : locationIds.length})
                  </span>
                  <Building2 className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <p className="text-xs text-muted-foreground mb-2">Leave none checked for all locations.</p>
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
          <div className="space-y-2 sm:col-span-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-full max-w-md">
                  <span className="truncate">
                    Companies ({companyIds.length === 0 ? "all" : companyIds.length})
                  </span>
                  <Building2 className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <p className="text-xs text-muted-foreground mb-2">Employers (contractors). None = all companies.</p>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {companiesList.map((co) => (
                    <label key={co.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={companyIds.includes(co.id)}
                        onCheckedChange={() => toggleId(companyIds, co.id, setCompanyIds)}
                      />
                      <span className="truncate">{co.name}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2 sm:col-span-2 flex flex-wrap gap-3 items-end">
            <span className="text-xs text-muted-foreground">Company type:</span>
            {(["mother_company", "contractor", "subcontractor"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox
                  checked={companyTypes.includes(t)}
                  onCheckedChange={() => toggleId(companyTypes, t, setCompanyTypes)}
                />
                {t.replace(/_/g, " ")}
              </label>
            ))}
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-4 border-t border-border pt-4 mt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clinical dimensions</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">
                      Visit types ({visitTypes.length === 0 ? "all" : visitTypes.length})
                    </span>
                    <Briefcase className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <p className="text-xs text-muted-foreground mb-2">None checked = all types.</p>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {[...CLINICAL_VISIT_TYPES].map((vt) => (
                      <label key={vt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={visitTypes.includes(vt)}
                          onCheckedChange={() => toggleId(visitTypes, vt, setVisitTypes)}
                        />
                        <span>{formatVisitTypeLabel(vt)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">
                      Dispositions ({dispositions.length === 0 ? "all" : dispositions.length})
                    </span>
                    <DoorClosed className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <p className="text-xs text-muted-foreground mb-2">Primary outcomes; legacy DB values may appear in charts.</p>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {[...CLINICAL_DISPOSITIONS].map((d) => (
                      <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={dispositions.includes(d)}
                          onCheckedChange={() => toggleId(dispositions, d, setDispositions)}
                        />
                        <span>{formatDispositionLabel(d)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">
                      Visit status ({visitStatus.length === 0 ? "all" : visitStatus.length})
                    </span>
                    <ClipboardList className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    {[...CLINICAL_VISIT_STATUS].map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={visitStatus.includes(s)}
                          onCheckedChange={() => toggleId(visitStatus, s, setVisitStatus)}
                        />
                        <span>{formatVisitStatusLabel(s)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">
                      Triage acuity ({triageAcuities.length === 0 ? "all" : triageAcuities.length})
                    </span>
                    <Activity className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <p className="text-xs text-muted-foreground mb-2">SATS bands on triage rows.</p>
                  <div className="space-y-2">
                    {[...CLINICAL_TRIAGE_ACUITIES].map((a) => (
                      <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={triageAcuities.includes(a)}
                          onCheckedChange={() => toggleId(triageAcuities, a, setTriageAcuities)}
                        />
                        <span>{formatTriageAcuityLabel(a)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-10 gap-y-3 items-start border-t border-border pt-4 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer max-w-xl mt-2">
              <Checkbox
                checked={includeIncidents}
                onCheckedChange={(v) => setIncludeIncidents(v === true)}
              />
              <span>
                Include occupational incidents in <span className="font-medium">cases matrix</span>,{" "}
                <span className="font-medium">incidents per post</span>, and{" "}
                <span className="font-medium">incident ambulance metrics</span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={comparePriorPeriod}
                onCheckedChange={(v) => setComparePriorPeriod(v === true)}
              />
              <span>
                Compare KPIs to the <span className="font-medium">prior period</span> (same number of days)
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer max-w-xl">
              <Checkbox
                checked={includeDetail}
                onCheckedChange={(v) => setIncludeDetail(v === true)}
              />
              <span>
                Load <span className="font-medium">visit-level detail</span> (paginated rows: company, location,
                provider — no patient names)
              </span>
            </label>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 items-end border-t border-border pt-4 mt-1">
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
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save filter preset</DialogTitle>
            <DialogDescription>
              Stores the current date range, grouping, locations, companies, clinical filters, and incident inclusion in
              this browser&apos;s storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="clinical-save-view-name">Name</Label>
            <Input
              id="clinical-save-view-name"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              placeholder="e.g. Injury follow-ups — last 90 days"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveNamedView();
                }
              }}
            />
          </div>
          <DialogFooter>
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
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Could not load reports</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Total visits</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {isLoading ? "—" : data?.kpis?.totalVisits ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Each visit row counted once.</p>
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">{priorCountDeltaLine(data.kpis.totalVisits, data.kpisPriorPeriod.totalVisits)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              Triage events
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {isLoading ? "—" : data?.kpis?.triageEvents ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Same filters (date, location, company).</p>
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">{priorCountDeltaLine(data.kpis.triageEvents, data.kpisPriorPeriod.triageEvents)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Transfers</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{isLoading ? "—" : data?.kpis?.transfers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>
              Rate {isLoading ? "—" : pct(data?.kpis?.transferRate)}
              {!isLoading && data?.kpisPriorPeriod?.transferRate != null ? (
                <span className="block text-[11px] mt-0.5 tabular-nums">
                  Prior {pct(data.kpisPriorPeriod.transferRate)}
                </span>
              ) : null}
            </p>
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">{priorCountDeltaLine(data.kpis.transfers, data.kpisPriorPeriod.transfers)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              Ambulance on transfers (visits)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {isLoading ? "—" : data?.kpis?.ambulanceVisits ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>
              Share of hospital-transfer outcomes {isLoading ? "—" : pct(data?.kpis?.ambulanceTransferRate)}
              {!isLoading && data?.kpisPriorPeriod?.ambulanceTransferRate != null ? (
                <span className="block text-[11px] mt-0.5 tabular-nums">
                  Prior {pct(data.kpisPriorPeriod.ambulanceTransferRate)}
                </span>
              ) : null}
            </p>
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">{priorCountDeltaLine(data.kpis.ambulanceVisits, data.kpisPriorPeriod.ambulanceVisits)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DoorClosed className="h-3.5 w-3.5" />
              Detained at facility
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {isLoading ? "—" : data?.kpis?.detentionVisits ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>
              Share of visits {isLoading ? "—" : pct(data?.kpis?.detentionRate)} — patient kept at clinic / FAP.
            </p>
            {!isLoading && data?.kpisPriorPeriod?.detentionRate != null ? (
              <p className="text-[11px] tabular-nums">Prior share {pct(data.kpisPriorPeriod.detentionRate)}</p>
            ) : null}
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">{priorCountDeltaLine(data.kpis.detentionVisits, data.kpisPriorPeriod.detentionVisits)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Visits with patient incident in window</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {isLoading ? "—" : data?.kpis?.visitsWithIncidentOverlap ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>
              Share of visits {isLoading ? "—" : pct(data?.kpis?.incidentOverlapRate)} — patient had ≥1 occupational
              incident dated in the same range (aggregate only).
            </p>
            {!isLoading && data?.kpisPriorPeriod?.incidentOverlapRate != null ? (
              <p className="text-[11px] tabular-nums">Prior share {pct(data.kpisPriorPeriod.incidentOverlapRate)}</p>
            ) : null}
            {!isLoading && data?.kpisPriorPeriod ? (
              <p className="tabular-nums text-[11px]">
                {priorCountDeltaLine(data.kpis.visitsWithIncidentOverlap, data.kpisPriorPeriod.visitsWithIncidentOverlap)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            Ambulance usage (transfers & incidents)
          </CardTitle>
          <CardDescription>
            Medical visits count ambulance only when disposition is a hospital transfer. Incidents use the occupational
            incident ambulance flag (same date, location, and company filters).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Medical visits — hospital transfers</p>
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "—"
                ) : (
                  <>
                    <span className="font-semibold text-foreground tabular-nums">{data?.kpis?.ambulanceVisits ?? 0}</span>{" "}
                    of{" "}
                    <span className="tabular-nums">{data?.kpis?.transfers ?? 0}</span> transfer outcomes recorded ambulance (
                    {pct(data?.kpis?.ambulanceTransferRate)} of transfers).
                  </>
                )}
              </p>
              {!isLoading && data?.kpisPriorPeriod && data.meta?.priorPeriod ? (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Prior window: {data.kpisPriorPeriod.ambulanceVisits} of {data.kpisPriorPeriod.transfers} transfers (
                  {pct(data.kpisPriorPeriod.ambulanceTransferRate)}).
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Occupational incidents</p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : data?.meta?.filters?.includeIncidents ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">{data?.kpis?.incidentsWithAmbulance ?? 0}</span>{" "}
                    of <span className="tabular-nums">{data?.kpis?.totalIncidents ?? 0}</span> incidents flagged ambulance (
                    {pct(data?.kpis?.incidentAmbulanceRate)} of incidents).
                  </p>
                  {!isLoading && data?.kpisPriorPeriod && data.meta?.priorPeriod ? (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Prior window: {data.kpisPriorPeriod.incidentsWithAmbulance} of {data.kpisPriorPeriod.totalIncidents}{" "}
                      ({pct(data.kpisPriorPeriod.incidentAmbulanceRate)}).
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Turn on <span className="font-medium text-foreground">Include occupational incidents</span> above to load
                  incident totals and ambulance counts for this date range.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6 border-t border-border pt-6">
            <div>
              <p className="text-sm font-medium text-foreground">By care location (clinic)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Medical visits grouped by visit location; incidents grouped by incident care location (post). Charts use the top{" "}
                {AMBULANCE_CLINIC_CHART_LIMIT} clinics by combined ambulance counts; the table lists every location in this
                filter window.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Total ambulance usage by clinic</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bar chart shows the top {AMBULANCE_CLINIC_CHART_LIMIT} clinics by combined ambulance count (same order as the
                  API). Table lists every clinic with totals.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2 items-start">
                <div className="min-h-[260px] h-72 flex flex-col">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                  ) : (data?.tables?.ambulanceByClinic ?? []).length === 0 ||
                    (data?.tables?.ambulanceByClinic ?? []).every((r) => r.totalAmbulanceUsage === 0) ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed">
                      No ambulance usage recorded at any clinic in this range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ambulanceByClinicTotalChartRows} layout="vertical" margin={{ left: 4, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={132}
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Total ambulance"]}
                          labelFormatter={(label, payload) => {
                            const row = payload?.[0]?.payload as
                              | { fullName?: string; casesAtPost?: number }
                              | undefined;
                            const name = row?.fullName ?? String(label ?? "");
                            const cases = row?.casesAtPost;
                            return cases != null ? `${name} (${cases} cases at post)` : name;
                          }}
                        />
                        <Bar dataKey="totalAmbulance" name="totalAmbulance" radius={[0, 4, 4, 0]}>
                          {ambulanceByClinicTotalChartRows.map((_, i) => (
                            <Cell key={i} fill={DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="max-h-96 overflow-auto rounded-lg border">
                  <Table>
                    <TableCaption className="caption-bottom px-2 py-2 text-xs text-muted-foreground">
                      Combined ambulance counts (transfer visits + incidents) per care location.
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clinic</TableHead>
                        <TableHead className="text-right tabular-nums">Total amb.</TableHead>
                        <TableHead className="text-right tabular-nums">Cases</TableHead>
                        <TableHead className="text-right tabular-nums">Amb./case</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : (data?.tables?.ambulanceByClinic ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No rows for this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (data?.tables?.ambulanceByClinic ?? []).map((r, i) => (
                          <TableRow key={`total-amb-${r.locationId ?? "unk"}-${i}`}>
                            <TableCell className="font-medium max-w-[220px]">{r.locationName}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{r.totalAmbulanceUsage}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.totalCasesAtPost}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatAmbulancePerCase(r.ambulancePerOverallCaseVolume)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Ambulance by source (detail)</p>
              <p className="text-xs text-muted-foreground">Visit transfer ambulance vs incident ambulance at the same posts.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="min-h-[240px] h-80">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                ) : ambulanceByClinicChartRows.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed">
                    No ambulance-linked visits or incidents by clinic in this range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ambulanceByClinicChartRows} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={132}
                        tick={{ fontSize: 10 }}
                        interval={0}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          value,
                          name === "visitAmb" ? "Ambulance on transfer (visits)" : "Ambulance (incidents)",
                        ]}
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                          return row?.fullName ?? String(label ?? "");
                        }}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "visitAmb" ? "Ambulance on transfer (visits)" : "Ambulance (incidents)"
                        }
                      />
                      <Bar dataKey="visitAmb" name="visitAmb" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="incidentAmb" name="incidentAmb" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead className="text-right tabular-nums">Transfers</TableHead>
                      <TableHead className="text-right tabular-nums">Amb. (visit)</TableHead>
                      <TableHead className="text-right tabular-nums">Share</TableHead>
                      <TableHead className="text-right tabular-nums">Incidents</TableHead>
                      <TableHead className="text-right tabular-nums">Amb. (inc.)</TableHead>
                      <TableHead className="text-right tabular-nums">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : (data?.tables?.ambulanceByClinic ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No rows for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data?.tables?.ambulanceByClinic ?? []).map((r, i) => (
                        <TableRow key={`${r.locationId ?? "unk"}-${i}`}>
                          <TableCell className="font-medium max-w-[200px]">{r.locationName}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.visitTransfers}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.visitAmbulanceOnTransfers}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.visitTransfers > 0 ? pct(r.visitAmbulanceShareOfTransfers ?? null) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.incidentTotal}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.incidentsWithAmbulance}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.incidentTotal > 0 ? pct(r.incidentAmbulanceShare ?? null) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.meta?.priorPeriod ? (
        <p className="text-xs text-muted-foreground -mt-2 mb-2 px-1 print:hidden">
          Prior comparison window:{" "}
          <span className="font-medium tabular-nums">
            {data.meta.priorPeriod.from} → {data.meta.priorPeriod.to}
          </span>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visits over time</CardTitle>
            <CardDescription>Total visits per {groupBy}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : visitsOverTimeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No visits in this date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <LineChart data={visitsOverTimeChartData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => formatPeriodTick(v, groupBy)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={44} domain={[0, "auto"]} />
                  <Tooltip
                    labelFormatter={(label) => formatPeriodTick(String(label), groupBy)}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={LINE_STROKE}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={{ r: 4, fill: LINE_STROKE, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disposition mix</CardTitle>
            <CardDescription>Visit counts by disposition</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series?.dispositionMix ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="disposition"
                    width={120}
                    tickFormatter={formatDispositionLabel}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => [v, "Visits"]} labelFormatter={formatDispositionLabel} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.series?.dispositionMix ?? []).map((_, i) => (
                      <Cell key={i} fill={DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-mineaid-navy shrink-0" />
            Detentions at facility — disposition after detention
          </CardTitle>
          <CardDescription>
            Visits where the patient was kept at the medical facility (detained at facility), broken down by final
            disposition on that visit. Same date, location, company, and visit filters as the rest of this report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (data?.kpis?.detentionVisits ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No detained-at-facility visits in this window for the current filters.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={detentionPieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={100}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="var(--card)"
                    >
                      {detentionPieData.map((entry, i) => (
                        <Cell
                          key={`${entry.disposition}-${i}`}
                          fill={DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} visits`, "Visits"]} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto lg:max-h-72 lg:overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disposition</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Of detentions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.series?.detentionDispositionMix ?? []).map((r, i) => {
                      const total = data?.kpis?.detentionVisits ?? 0;
                      const share = total > 0 ? r.count / total : null;
                      return (
                        <TableRow key={`${r.disposition}-${i}`}>
                          <TableCell className="font-medium">{formatDispositionLabel(r.disposition)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {share != null ? pct(share) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-mineaid-navy shrink-0" />
            Operational continuity — return to work vs hospital transfer
          </CardTitle>
          <CardDescription>
            A simple operations-facing view of visit outcomes: employees cleared to stay on duty (return to work)
            versus those escalated off-site (hospital transfer). This is a coarse indicator of how often on-site care
            resolves cases without acute referral — not a full financial ROI. Visits with neither outcome (legacy or
            non-standard disposition codes) appear as &quot;Other&quot; when present.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (data?.kpis?.totalVisits ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No visits in this window for the current filters.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 min-h-[280px]">
                {workContinuityPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-4">
                    No return-to-work or transfer outcomes to chart (check disposition data).
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workContinuityPieData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="48%"
                        outerRadius={100}
                        paddingAngle={2}
                        strokeWidth={2}
                        stroke="var(--card)"
                      >
                        {workContinuityPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} visits`, "Visits"]} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Continuity rate (RTW vs transfer paths)
                  </p>
                  <p className="text-3xl font-semibold tabular-nums text-mineaid-navy">
                    {data?.kpis?.operationalContinuityRate != null
                      ? pct(data.kpis.operationalContinuityRate)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Share of visits that ended in return to work out of those that ended in either return-to-work or
                    hospital transfer. Other dispositions are excluded from this percentage.
                  </p>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: WORK_CONTINUITY_COLORS.rtw }} />
                      Return to work
                    </span>
                    <span className="tabular-nums font-medium text-foreground">{data?.kpis?.returnToWorkVisits ?? 0}</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: WORK_CONTINUITY_COLORS.transfer }} />
                      Hospital transfer
                    </span>
                    <span className="tabular-nums font-medium text-foreground">{data?.kpis?.transfers ?? 0}</span>
                  </li>
                  {(data?.kpis?.otherDispositionVisits ?? 0) > 0 ? (
                    <li className="flex justify-between gap-4">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: WORK_CONTINUITY_COLORS.other }} />
                        Other disposition
                      </span>
                      <span className="tabular-nums font-medium text-foreground">{data?.kpis?.otherDispositionVisits}</span>
                    </li>
                  ) : null}
                  <li className="flex justify-between gap-4 pt-1 border-t text-xs">
                    <span>Total visits (filtered)</span>
                    <span className="tabular-nums">{data?.kpis?.totalVisits ?? 0}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit type mix</CardTitle>
            <CardDescription>Visits in this window by visit type</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series?.visitTypeMix ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="visitType"
                    width={140}
                    tickFormatter={formatVisitTypeLabel}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number) => [v, "Visits"]}
                    labelFormatter={(l) => formatVisitTypeLabel(String(l))}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.series?.visitTypeMix ?? []).map((_, i) => (
                      <Cell key={i} fill={DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Triage acuity (period)</CardTitle>
            <CardDescription>SATS distribution for triage events matching filters</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.series?.triageAcuityMix ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="acuity" width={72} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, "Events"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.series?.triageAcuityMix ?? []).map((entry, i) => {
                      const band = String(entry.acuity ?? "").toLowerCase();
                      const fill =
                        band in TRIAGE_STACK_CONFIG
                          ? TRIAGE_STACK_CONFIG[band as keyof typeof TRIAGE_STACK_CONFIG].color
                          : TRIAGE_STACK_CONFIG.other.color;
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triage acuity over time</CardTitle>
          <CardDescription>Events per {groupBy} by acuity band</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[280px]">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (data?.series?.triageAcuityOverTime ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No triage events in this range.</p>
          ) : (
            <ChartContainer config={triageStackChartConfig} className="h-[280px] w-full">
              <BarChart data={data?.series?.triageAcuityOverTime ?? []} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  tickFormatter={(v: string) => formatPeriodTick(v, groupBy)}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(l) => formatPeriodTick(String(l), groupBy)}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {(Object.keys(TRIAGE_STACK_CONFIG) as Array<keyof typeof TRIAGE_STACK_CONFIG>).map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="acuity"
                    fill={`var(--color-${k})`}
                    name={TRIAGE_STACK_CONFIG[k].label}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top care locations</CardTitle>
            <CardDescription>Visit volume by location (unknown if not set)</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.tables?.topLocations ?? []} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="locationName"
                    width={130}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => (v.length > 22 ? `${v.slice(0, 20)}…` : v)}
                  />
                  <Tooltip formatter={(v: number) => [v, "Visits"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.tables?.topLocations ?? []).map((_, i) => (
                      <Cell key={i} fill={DISPO_CHART_COLORS[i % DISPO_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit type × disposition</CardTitle>
            <CardDescription>Counts for combinations in this window</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visit type</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.tables?.visitTypeByDisposition ?? []).length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No rows for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.tables?.visitTypeByDisposition ?? []).map((r, i) => (
                    <TableRow key={`${r.visitType}-${r.disposition}-${i}`}>
                      <TableCell className="font-medium">{formatVisitTypeLabel(r.visitType)}</TableCell>
                      <TableCell>{formatDispositionLabel(r.disposition)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-mineaid-navy shrink-0" />
            Incidents per post
          </CardTitle>
          <CardDescription>
            {includeIncidents ? (
              <>
                Occupational incident report counts by care location (post) for the selected window. Uses the same tenant,
                date range, location, and company filters as elsewhere on this page. Counts only — a dedicated{" "}
                <span className="font-medium text-foreground">/reports/incidents</span> hub is planned later.
                {incidentsPerPostTotal > 0 ? (
                  <span className="block mt-1 tabular-nums">
                    Total incidents (filtered): {incidentsPerPostTotal}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">
                Occupational incidents are turned off for this report (see Filters). Enable &quot;Include occupational
                incidents&quot; to load this section.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Care location</TableHead>
                    <TableHead className="text-right">Incidents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : (data?.tables?.incidentsPerPost ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                        No incidents in this window for the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.tables?.incidentsPerPost ?? []).map((r, idx) => (
                      <TableRow key={`${r.locationId ?? "unknown"}-${idx}`}>
                        <TableCell className="font-medium max-w-[220px] truncate" title={r.locationName}>
                          {r.locationName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="h-72 min-h-[260px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              ) : incidentsPerPostPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-4">
                  No incidents to chart for this filter.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentsPerPostPieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={56}
                      outerRadius={96}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="var(--card)"
                    >
                      {incidentsPerPostPieData.map((entry, i) => (
                        <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} incidents`, "Count"]} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visits over time by company</CardTitle>
          <CardDescription>Top ten employers by volume in this filter (remainder stacked as Other)</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[280px]">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : stackedByCompany.chartRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data for this range.</p>
          ) : (
            <ChartContainer config={stackChartConfig} className="h-[300px] w-full">
              <BarChart data={stackedByCompany.chartRows} accessibilityLayer margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} tickMargin={8} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} />
                <ChartLegend content={<ChartLegendContent />} />
                {stackedByCompany.companyKeys.map((k) => (
                  <Bar
                    key={k.key}
                    dataKey={k.key}
                    name={k.label}
                    stackId="a"
                    fill={`var(--color-${k.key})`}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
                {stackedByCompany.hasOther ? (
                  <Bar dataKey="other" stackId="a" fill="var(--color-other)" name="Other companies" />
                ) : null}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics by company
            </CardTitle>
            <CardDescription>Sortable exports for leadership (counts only in v1).</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
            <Button variant="outline" size="sm" onClick={onExportByCompany} disabled={!data?.tables?.byCompany?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export by company
            </Button>
            <Button variant="outline" size="sm" onClick={onExportBreakdowns} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export breakdowns
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline text-left"
                    onClick={() => toggleCompanySort("companyName")}
                  >
                    Company{sortIndicator("companyName")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline text-left"
                    onClick={() => toggleCompanySort("companyType")}
                  >
                    Type{sortIndicator("companyType")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline ml-auto w-full justify-end"
                    onClick={() => toggleCompanySort("visitCount")}
                  >
                    Visits{sortIndicator("visitCount")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline ml-auto w-full justify-end"
                    onClick={() => toggleCompanySort("transferCount")}
                  >
                    Transfers{sortIndicator("transferCount")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline ml-auto w-full justify-end"
                    onClick={() => toggleCompanySort("transferRate")}
                  >
                    Transfer rate{sortIndicator("transferRate")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium hover:underline ml-auto w-full justify-end"
                    onClick={() => toggleCompanySort("triageEventCount")}
                  >
                    Triage events{sortIndicator("triageEventCount")}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.tables?.byCompany ?? []).length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No rows for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                sortedByCompany.map((r) => (
                  <TableRow key={r.companyId}>
                    <TableCell className="font-medium">{r.companyName}</TableCell>
                    <TableCell>
                      {r.companyType ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {r.companyType.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.visitCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.transferCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(r.transferRate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.triageEventCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-mineaid-navy shrink-0" />
            Company × care location
          </CardTitle>
          <CardDescription>Visit counts for each employer × post combination (current filters).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[min(52vh,420px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Care location</TableHead>
                <TableHead className="text-right">Visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.tables?.companyByLocation ?? []).length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    No rows for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.tables?.companyByLocation ?? []).map((r, i) => (
                  <TableRow key={`${r.companyId ?? "x"}-${r.locationId ?? "y"}-${i}`}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={r.companyName}>
                      {r.companyName}
                    </TableCell>
                    <TableCell>
                      {r.companyType ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {r.companyType.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={r.locationName}>
                      {r.locationName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.visitCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-mineaid-navy shrink-0" />
              Visit-level detail
            </CardTitle>
            <CardDescription>
              Rows match active filters; no patient identifiers. Turn on in Filters to load (paginated). Export is
              current page only.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onExportVisitDetail}
              disabled={isLoading || !(data?.detail?.rows?.length)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export page (CSV)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!includeDetail ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Enable <span className="font-medium text-foreground">visit-level detail</span> in Filters above.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>
          ) : !(data?.detail?.rows ?? []).length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No visits for this filter.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right font-mono text-xs">Visit ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.detail?.rows ?? []).map((r) => (
                    <TableRow key={r.visitId}>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {(() => {
                          try {
                            return format(parseISO(r.visitDate), "yyyy-MM-dd HH:mm");
                          } catch {
                            return r.visitDate;
                          }
                        })()}
                      </TableCell>
                      <TableCell>{formatVisitTypeLabel(r.visitType)}</TableCell>
                      <TableCell>{formatDispositionLabel(r.disposition)}</TableCell>
                      <TableCell>{r.status ? formatVisitStatusLabel(r.status) : "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate" title={r.companyName}>
                        {r.companyName}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate" title={r.locationName}>
                        {r.locationName}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate" title={r.providerDisplay}>
                        {r.providerDisplay}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground">{r.visitId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  Page {data?.detail?.page ?? 1} of{" "}
                  {Math.max(1, Math.ceil((data?.detail?.totalCount ?? 0) / (data?.detail?.pageSize ?? 25)))} ·{" "}
                  {(data?.detail?.totalCount ?? 0).toLocaleString()} visits
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading || (data?.detail?.page ?? 1) <= 1}
                    onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      isLoading ||
                      (data?.detail?.page ?? 1) >=
                        Math.max(1, Math.ceil((data?.detail?.totalCount ?? 0) / (data?.detail?.pageSize ?? 25)))
                    }
                    onClick={() => setDetailPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-mineaid-navy shrink-0" />
              Cases per post by day
            </CardTitle>
            <CardDescription>
              Raw case counts per calendar day and care location (post). Medical visits use all clinical filters above.
              {includeIncidents ? (
                <>
                  {" "}
                  Occupational incidents are merged into the same cells; they match tenant, date range, locations, and
                  companies—visit type and disposition filters apply only to visits.
                </>
              ) : (
                <>
                  {" "}
                  Occupational incidents are excluded; counts reflect medical visits only.
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCasesMatrix}
              disabled={isLoading || !(data?.tables?.casesByDayByPost?.columns?.length)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export matrix
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="py-16 flex justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <Table
              containerClassName={cn(
                "max-h-[min(56vh,520px)] overflow-auto rounded-md border border-border bg-card shadow-sm print:max-h-none print:overflow-visible print:shadow-none",
                "[&_thead]:!bg-transparent",
                "[&_thead_th]:!bg-[#142F5C] [&_thead_th]:!text-white [&_thead_th]:!font-sans [&_thead_th]:!text-xs [&_thead_th]:!font-semibold [&_thead_th]:!tracking-normal [&_thead_th]:!normal-case",
                "[&_tfoot]:border-t [&_tfoot]:border-white/25 [&_tfoot]:!bg-[#142F5C] [&_tfoot_tr]:!bg-[#142F5C]",
                "[&_tfoot_td]:!bg-[#142F5C] [&_tfoot_td]:!text-white [&_tfoot_td]:!font-sans [&_tfoot_td]:!font-medium [&_tfoot_td]:[color:white]",
              )}
              className="border-collapse"
            >
              <TableHeader className="sticky top-0 z-[4] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.12)]">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="sticky left-0 top-0 z-[6] min-w-[108px] border-r border-white/15 !bg-[#142F5C] !text-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Date
                  </TableHead>
                  {(data?.tables?.casesByDayByPost?.columns ?? []).map((c) => (
                    <TableHead
                      key={c.key}
                      className="sticky top-0 z-[5] min-w-[76px] whitespace-nowrap !bg-[#142F5C] !text-white text-right text-xs font-semibold"
                    >
                      <span className="block max-w-[140px] truncate" title={c.locationName}>
                        {c.locationName}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 top-0 z-[6] min-w-[76px] border-l border-white/15 text-right !bg-[#142F5C] !text-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.tables?.casesByDayByPost?.rows ?? []).map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="sticky left-0 z-[1] border-r border-border bg-background font-medium tabular-nums text-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      {formatCaseMatrixDate(row.date)}
                    </TableCell>
                    {(row.cells ?? []).map((n, i) => (
                      <TableCell key={i} className="text-right tabular-nums text-muted-foreground">
                        {n}
                      </TableCell>
                    ))}
                    <TableCell className="sticky right-0 z-[1] border-l border-border bg-background text-right tabular-nums font-medium text-foreground shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      {row.rowTotal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="!border-t !border-white/25 !bg-[#142F5C]">
                <TableRow className="border-0 !bg-[#142F5C] hover:!bg-[#142F5C]">
                  <TableCell
                    className="sticky left-0 z-[3] border-r border-white/20 bg-[#142F5C] text-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"
                    style={{ backgroundColor: "#142F5C", color: "#ffffff" }}
                  >
                    Total
                  </TableCell>
                  {(data?.tables?.casesByDayByPost?.columnTotals ?? []).map((n, i) => (
                    <TableCell
                      key={i}
                      className="border-white/10 bg-[#142F5C] text-right tabular-nums text-white"
                      style={{ backgroundColor: "#142F5C", color: "#ffffff" }}
                    >
                      {n}
                    </TableCell>
                  ))}
                  <TableCell
                    className="sticky right-0 z-[3] border-l border-white/20 bg-[#142F5C] text-right tabular-nums font-semibold text-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.12)]"
                    style={{ backgroundColor: "#142F5C", color: "#ffffff" }}
                  >
                    {data?.tables?.casesByDayByPost?.grandTotal ?? 0}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 print:hidden">
        <span>
          Last generated:{" "}
          {data?.meta?.generatedAt
            ? format(new Date(data.meta?.generatedAt ?? ""), "yyyy-MM-dd HH:mm")
            : "—"}
        </span>
        <span>
          Window: {data?.meta?.from} → {data?.meta?.to} ({data?.meta?.groupBy})
        </span>
      </p>

      <div className="print:hidden">
        <MobileNav />
      </div>
      </div>
    </>
  );
}
