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
  AlertTriangle,
  BarChart3,
  Bookmark,
  Building2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MobileNav from "@/components/MobileNav";
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { ClinicalReportsPrintStyles } from "@/components/ClinicalReportsPrintStyles";
import { CLINICAL_REPORTS_PRINT_BODY_CLASS } from "@/lib/clinicalReportsPrint";
import {
  formatIncidentSeverityLabel,
  formatIncidentTypeLabel,
  INCIDENT_SEVERITY_FILTERS,
  INCIDENT_STATUS_FILTERS,
  INCIDENT_TYPE_FILTERS,
} from "@/lib/incidentReportFilters";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

type GroupBy = "day" | "week" | "month";

export type IncidentReportsKpis = {
  totalIncidents: number;
  realIncidents: number;
  drillOrSimulationIncidents: number;
  openIncidents: number;
  closedIncidents: number;
  severeIncidents: number;
  severeShare: number | null;
  incidentsWithAmbulance: number;
  ambulanceRate: number | null;
  detainedAtFapCount: number;
  detainedAtFapRate: number | null;
  treatedOnSiteCount: number;
  treatedOnSiteRate: number | null;
};

export type IncidentReportsPayload = {
  meta: {
    from: string;
    to: string;
    groupBy: GroupBy;
    generatedAt: string;
    priorPeriod?: { from: string; to: string } | null;
    filters: {
      locationIds: string[];
      companyIds: string[];
      companyTypes: string[];
      severities: string[];
      incidentTypes: string[];
      statuses: string[];
    };
  };
  kpis: IncidentReportsKpis;
  kpisPriorPeriod?: IncidentReportsKpis | null;
  series: {
    incidentsOverTime: Array<{ period: string; total: number }>;
    incidentsOverTimeByCompany: Array<{
      period: string;
      companyId: string;
      companyName: string;
      companyType: string | null;
      count: number;
    }>;
    severityMix: Array<{ severity: string; count: number }>;
    incidentTypeMix: Array<{ incidentType: string; count: number }>;
    statusMix: Array<{ status: string; count: number }>;
  };
  tables: {
    byCompany: Array<{
      companyId: string | null;
      companyName: string;
      companyType: string | null;
      incidentCount: number;
      openIncidents: number;
      closedIncidents: number;
      incidentsWithAmbulance: number;
      ambulanceRate: number | null;
      detainedAtFapCount: number;
      treatedOnSiteCount: number;
    }>;
    companyByLocation: Array<{
      companyId: string | null;
      companyName: string;
      companyType: string | null;
      locationId: string | null;
      locationName: string;
      count: number;
    }>;
    incidentsByDayByPost: {
      dates: string[];
      columns: Array<{ key: string; locationId: string | null; locationName: string }>;
      rows: Array<{ date: string; cells: number[]; rowTotal: number }>;
      columnTotals: number[];
      grandTotal: number;
    };
    topCareLocations: Array<{
      locationId: string | null;
      locationName: string;
      count: number;
      detainedCount: number;
      detainedRate: number | null;
    }>;
    topIncidentSites: Array<{ siteLabel: string; count: number }>;
    typeBySeverity: Array<{ incidentType: string; severity: string; count: number }>;
  };
  detail: {
    rows: Array<{
      incidentId: string;
      incidentDate: string;
      severity: string;
      incidentType: string;
      status: string | null;
      companyId: string | null;
      companyName: string;
      locationId: string | null;
      locationName: string;
      ambulanceUsed: boolean;
      detainedAtFap: boolean;
      treatedOnSite: boolean;
    }>;
    page: number;
    pageSize: number;
    totalCount: number;
  } | null;
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const LINE_STROKE = "#142f5c";

const VIEWS_KEY = "uventorybiz-incident-report-views-v1";

type FilterSnapshot = {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  companyIds: string[];
  companyTypes: string[];
  severities: string[];
  incidentTypes: string[];
  statuses: string[];
  comparePriorPeriod?: boolean;
  includeDetail?: boolean;
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

function buildQuery(params: {
  from: string;
  to: string;
  groupBy: GroupBy;
  locationIds: string[];
  companyIds: string[];
  companyTypes: string[];
  severities: string[];
  incidentTypes: string[];
  statuses: string[];
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
  if (params.severities.length) sp.set("severities", params.severities.join(","));
  if (params.incidentTypes.length) sp.set("incidentTypes", params.incidentTypes.join(","));
  if (params.statuses.length) sp.set("statuses", params.statuses.join(","));
  if (params.comparePriorPeriod) sp.set("comparePriorPeriod", "true");
  if (params.includeDetail) {
    sp.set("includeDetail", "true");
    sp.set("detailPage", String(params.detailPage));
    sp.set("detailPageSize", String(params.detailPageSize));
  }
  return sp.toString();
}

function priorDeltaLine(current: number, prior: number | null | undefined): string | null {
  if (prior == null || Number.isNaN(prior)) return null;
  const d = current - prior;
  if (d === 0) return `same as prior (${prior})`;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d} vs prior (${prior})`;
}

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

function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]) {
  const esc = (v: string | number | boolean) => {
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

function matrixPostHeaders(
  columns: IncidentReportsPayload["tables"]["incidentsByDayByPost"]["columns"],
): string[] {
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

function formatMatrixDate(dateStr: string): string {
  try {
    const d = parseISO(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return format(d, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

type CompanySortKey =
  | "companyName"
  | "companyType"
  | "incidentCount"
  | "openIncidents"
  | "ambulanceRate";

export default function IncidentReportsPage() {
  const { user } = useAuth();

  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [comparePriorPeriod, setComparePriorPeriod] = useState(false);
  const [includeDetail, setIncludeDetail] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [savedViewPicker, setSavedViewPicker] = useState("_none");
  const [companySort, setCompanySort] = useState<{ key: CompanySortKey; dir: "asc" | "desc" }>({
    key: "incidentCount",
    dir: "desc",
  });

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
        companyIds,
        companyTypes,
        severities,
        incidentTypes,
        statuses,
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
      severities,
      incidentTypes,
      statuses,
      comparePriorPeriod,
      includeDetail,
      detailPage,
    ],
  );

  const snapshotFilters = (): FilterSnapshot => ({
    from,
    to,
    groupBy,
    locationIds,
    companyIds,
    companyTypes,
    severities,
    incidentTypes,
    statuses,
    comparePriorPeriod,
    includeDetail,
  });

  const applySnapshot = (s: FilterSnapshot) => {
    setFrom(s.from);
    setTo(s.to);
    setGroupBy(s.groupBy);
    setLocationIds(s.locationIds);
    setCompanyIds(s.companyIds);
    setCompanyTypes(s.companyTypes);
    setSeverities(s.severities);
    setIncidentTypes(s.incidentTypes);
    setStatuses(s.statuses);
    setComparePriorPeriod(s.comparePriorPeriod ?? false);
    setIncludeDetail(s.includeDetail ?? false);
    setDetailPage(1);
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

  const { data, isLoading, error, refetch, isFetching } = useQuery<IncidentReportsPayload>({
    queryKey: ["/api/reports/incidents", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reports/incidents?${queryString}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || "Failed to load incident reports");
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

  const { data: companiesList = [] } = useQuery<Array<{ id: string; name: string; companyType?: string | null }>>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const incidentsOverTimeChart = useMemo(
    () => (data?.series?.incidentsOverTime ?? []).map((d) => ({ period: d.period, total: Math.max(0, Number(d.total)) })),
    [data?.series?.incidentsOverTime],
  );

  const stackedByCompany = useMemo(() => {
    const rows = data?.series?.incidentsOverTimeByCompany ?? [];
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
  }, [data?.series?.incidentsOverTimeByCompany]);

  const stackChartConfig: ChartConfig = useMemo(() => {
    const c: ChartConfig = {
      other: { label: "Other companies", color: "var(--uventorybiz-gray)" },
    };
    stackedByCompany.companyKeys.forEach((k, i) => {
      c[k.key] = { label: k.label, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
    return c;
  }, [stackedByCompany.companyKeys]);

  const severityBarData = useMemo(
    () =>
      (data?.series?.severityMix ?? []).map((r) => ({
        name: formatIncidentSeverityLabel(r.severity),
        count: r.count,
      })),
    [data?.series?.severityMix],
  );

  const typeBarData = useMemo(() => {
    const rows = [...(data?.series?.incidentTypeMix ?? [])].sort((a, b) => b.count - a.count).slice(0, 12);
    return rows.map((r) => ({ name: formatIncidentTypeLabel(r.incidentType), count: r.count }));
  }, [data?.series?.incidentTypeMix]);

  const statusBarData = useMemo(
    () =>
      (data?.series?.statusMix ?? []).map((r) => ({
        name: r.status,
        count: r.count,
      })),
    [data?.series?.statusMix],
  );

  const sortedByCompany = useMemo(() => {
    const rows = [...(data?.tables?.byCompany ?? [])];
    const { key, dir } = companySort;
    const m = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (key === "incidentCount" || key === "openIncidents") {
        return m * (Number(a[key]) - Number(b[key]));
      }
      if (key === "ambulanceRate") {
        const ar = a.ambulanceRate ?? -1;
        const br = b.ambulanceRate ?? -1;
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
        : locationIds.map((id) => careLocations.find((l) => l.id === id)?.locationName ?? id).join("; ");
    const coLabel =
      companyIds.length === 0
        ? "All companies"
        : companyIds.map((id) => companiesList.find((c) => c.id === id)?.name ?? id).join("; ");
    const typesLabel =
      companyTypes.length === 0 ? "All company types" : companyTypes.map((t) => t.replace(/_/g, " ")).join(", ");
    return [
      `Window: ${from} → ${to} · Group by: ${groupBy}`,
      `Locations: ${locLabel}`,
      `Companies: ${coLabel}`,
      `Company types: ${typesLabel}`,
      `Severities: ${severities.length ? severities.map(formatIncidentSeverityLabel).join(", ") : "all"}`,
      `Incident types: ${incidentTypes.length ? incidentTypes.map(formatIncidentTypeLabel).join(", ") : "all"}`,
      `Statuses: ${statuses.length ? statuses.join(", ") : "all"}`,
      `Compare prior period (KPIs): ${comparePriorPeriod ? "yes" : "no"}`,
      `Incident detail table: ${includeDetail ? `yes (page ${detailPage})` : "no"}`,
    ];
  }, [
    from,
    to,
    groupBy,
    locationIds,
    companyIds,
    companyTypes,
    severities,
    incidentTypes,
    statuses,
    comparePriorPeriod,
    includeDetail,
    detailPage,
    careLocations,
    companiesList,
  ]);

  const sortIndicator = (key: CompanySortKey) =>
    companySort.key === key ? (companySort.dir === "asc" ? " ↑" : " ↓") : "";

  const kpis = data?.kpis;
  const priorK = data?.kpisPriorPeriod;

  const pct = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(n)) return "—";
    return `${(n * 100).toFixed(1)}%`;
  };

  const toggleId = (list: string[], id: string, set: (v: string[]) => void) => {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else set([...list, id]);
  };

  const onExportByCompany = () => {
    const rows = data?.tables?.byCompany ?? [];
    downloadCsv(
      `incidents-by-company-${from}-to-${to}.csv`,
      [
        "companyName",
        "companyType",
        "incidentCount",
        "openIncidents",
        "closedIncidents",
        "incidentsWithAmbulance",
        "ambulanceRatePct",
        "detainedAtFapCount",
        "treatedOnSiteCount",
      ],
      rows.map((r) => [
        r.companyName,
        r.companyType ?? "",
        r.incidentCount,
        r.openIncidents,
        r.closedIncidents,
        r.incidentsWithAmbulance,
        r.ambulanceRate != null ? (r.ambulanceRate * 100).toFixed(2) : "",
        r.detainedAtFapCount,
        r.treatedOnSiteCount,
      ]),
    );
  };

  const onExportMix = () => {
    const rows: (string | number)[][] = [];
    for (const r of data?.series?.severityMix ?? []) {
      rows.push(["severity", r.severity, r.count]);
    }
    for (const r of data?.series?.incidentTypeMix ?? []) {
      rows.push(["incident_type", r.incidentType, r.count]);
    }
    for (const r of data?.series?.statusMix ?? []) {
      rows.push(["status", r.status, r.count]);
    }
    downloadCsv(`incidents-mix-${from}-to-${to}.csv`, ["dimension", "value", "count"], rows);
  };

  const onExportCompanyLocation = () => {
    const rows = data?.tables?.companyByLocation ?? [];
    downloadCsv(
      `incidents-company-by-location-${from}-to-${to}.csv`,
      ["companyName", "companyType", "locationName", "count"],
      rows.map((r) => [r.companyName, r.companyType ?? "", r.locationName, r.count]),
    );
  };

  const onExportMatrix = () => {
    const m = data?.tables?.incidentsByDayByPost;
    const cols = m?.columns ?? [];
    if (!cols.length) return;
    const postHeaders = matrixPostHeaders(cols);
    const headers = ["date", ...postHeaders, "row_total"];
    const bodyRows = (m?.rows ?? []).map((row) => [row.date, ...(row.cells ?? []), row.rowTotal]);
    const totalsRow: (string | number)[] = ["Total", ...(m?.columnTotals ?? []), m?.grandTotal ?? 0];
    downloadCsv(`incidents-by-day-post-${from}-to-${to}.csv`, headers, [...bodyRows, totalsRow]);
  };

  const onExportDetail = () => {
    const d = data?.detail;
    if (!d?.rows.length) return;
    downloadCsv(
      `incidents-detail-${from}-to-${to}-p${d.page}.csv`,
      [
        "incidentId",
        "incidentDate",
        "severity",
        "incidentType",
        "status",
        "companyName",
        "locationName",
        "ambulanceUsed",
        "detainedAtFap",
        "treatedOnSite",
      ],
      d.rows.map((r) => [
        r.incidentId,
        r.incidentDate,
        r.severity,
        r.incidentType,
        r.status ?? "",
        r.companyName,
        r.locationName,
        r.ambulanceUsed,
        r.detainedAtFap,
        r.treatedOnSite,
      ]),
    );
  };

  return (
    <>
      <ClinicalReportsPrintStyles />
      <div
        className="space-y-6 p-4 pt-6 sm:p-6 sm:pt-7 pb-24 md:pb-8 bg-uventorybiz-light-gray min-h-[60vh] print:bg-white print:pb-6"
        data-testid="incident-reports-page"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 print:hidden">
              <Link href="/reports" className="hover:text-uventorybiz-navy underline-offset-4 hover:underline">
                Reports
              </Link>
              <span aria-hidden>/</span>
              <span>Incidents</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 print:text-black">
              <AlertTriangle className="h-8 w-8 text-uventorybiz-navy shrink-0 print:text-uventorybiz-navy" />
              Incident &amp; safety reports
            </h1>
            <p className="text-uventorybiz-gray mt-1 max-w-2xl print:text-gray-700">
              HSE-focused aggregates: severity and type mix, status pipeline, employer and care-post cuts, ambulance and
              detention flags. Summaries exclude casualty names.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden lg:self-start">
            <Button variant="outline" size="sm" asChild>
              <Link href="/incidents">
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
                Manage incidents
              </Link>
            </Button>
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
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="text-sm text-muted-foreground space-y-3 px-6 py-6 border-t border-border">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Set <strong className="text-foreground">From</strong>, <strong className="text-foreground">To</strong>, and{" "}
                    <strong className="text-foreground">Group by</strong> for the time axis.
                  </li>
                  <li>
                    Narrow by care <strong className="text-foreground">locations</strong>, employer{" "}
                    <strong className="text-foreground">companies</strong>, and optional severity, type, and status.
                  </li>
                  <li>
                    Enable <strong className="text-foreground">Compare prior period</strong> for KPI deltas over the previous
                    window of equal length.
                  </li>
                  <li>
                    <strong className="text-foreground">Incident-level detail</strong> loads paginated rows without personal
                    identifiers; export CSV from the toolbar when enabled.
                  </li>
                  <li>
                    Use <strong className="text-foreground">Saved views</strong> to store filter presets in this browser.
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
            <CardDescription>Date range, grouping, locations, employers, and incident dimensions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ir-from">From</Label>
              <Input id="ir-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ir-to">To</Label>
              <Input id="ir-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                  <p className="text-xs text-muted-foreground mb-2">Store / site locations. None checked = all.</p>
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
                  <p className="text-xs text-muted-foreground mb-2">Employers via employee → company.</p>
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

            <div className="space-y-2 sm:col-span-2 lg:col-span-4 border-t border-border pt-4 grid gap-3 sm:grid-cols-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">Severity ({severities.length === 0 ? "all" : severities.length})</span>
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {[...INCIDENT_SEVERITY_FILTERS].map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={severities.includes(s)}
                          onCheckedChange={() => toggleId(severities, s, setSeverities)}
                        />
                        <span>{formatIncidentSeverityLabel(s)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">Type ({incidentTypes.length === 0 ? "all" : incidentTypes.length})</span>
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {[...INCIDENT_TYPE_FILTERS].map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={incidentTypes.includes(t)}
                          onCheckedChange={() => toggleId(incidentTypes, t, setIncidentTypes)}
                        />
                        <span>{formatIncidentTypeLabel(t)}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    <span className="truncate">Status ({statuses.length === 0 ? "all" : statuses.length})</span>
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    {[...INCIDENT_STATUS_FILTERS].map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={statuses.includes(s)}
                          onCheckedChange={() => toggleId(statuses, s, setStatuses)}
                        />
                        <span className="capitalize">{s.replace(/_/g, " ")}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={comparePriorPeriod}
                  onCheckedChange={(v) => setComparePriorPeriod(v === true)}
                />
                <span>
                  Compare KPIs to the <span className="font-medium">prior period</span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer max-w-xl">
                <Checkbox checked={includeDetail} onCheckedChange={(v) => setIncludeDetail(v === true)} />
                <span>
                  Load <span className="font-medium">incident detail</span> (no personal identifiers)
                </span>
              </label>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 items-end border-t border-border pt-4">
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
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {savedViews.map((sv) => (
                      <div key={sv.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{sv.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          onClick={() => onDeleteSavedView(sv.id)}
                          aria-label={`Delete ${sv.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onExportByCompany} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                CSV: by company
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onExportMix} disabled={isLoading}>
                CSV: mix (severity / type / status)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onExportCompanyLocation} disabled={isLoading}>
                CSV: company × location
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onExportMatrix} disabled={isLoading}>
                CSV: day × post
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportDetail}
                disabled={isLoading || !data?.detail?.rows.length}
              >
                CSV: detail page
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save filter preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="ir-view-name">Name</Label>
              <Input
                id="ir-view-name"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="e.g. Q1 contractors + major+"
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
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Could not load reports</CardTitle>
              <CardDescription>{error instanceof Error ? error.message : "Unknown error"}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!error && isLoading ? (
          <p className="text-sm text-muted-foreground">Loading incident analytics…</p>
        ) : null}

        {!error && !isLoading && data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Real incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">{kpis?.realIncidents ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excludes {kpis?.drillOrSimulationIncidents ?? 0} drill(s)/simulation(s)
                  </p>
                  {comparePriorPeriod ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {priorDeltaLine(kpis?.realIncidents ?? 0, priorK?.realIncidents)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Drills / simulations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">{kpis?.drillOrSimulationIncidents ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Marked at close — tracked for compliance, not operational KPIs
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Open / closed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {kpis?.openIncidents ?? 0} <span className="text-muted-foreground font-normal">/</span>{" "}
                    {kpis?.closedIncidents ?? 0}
                  </p>
                  {comparePriorPeriod ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Open: {priorDeltaLine(kpis?.openIncidents ?? 0, priorK?.openIncidents)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Severe share</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {kpis?.severeIncidents ?? 0}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      ({pct(kpis?.severeShare)})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Major, critical, catastrophic, high</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ambulance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {kpis?.incidentsWithAmbulance ?? 0}{" "}
                    <span className="text-base font-normal text-muted-foreground">({pct(kpis?.ambulanceRate)})</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Held at site</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {kpis?.detainedAtFapCount ?? 0}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      ({pct(kpis?.detainedAtFapRate)})
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Treated on site</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {kpis?.treatedOnSiteCount ?? 0}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      ({pct(kpis?.treatedOnSiteRate)})
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
              <Card className="print:break-inside-avoid">
                <CardHeader>
                  <CardTitle className="text-base">Incidents over time</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={incidentsOverTimeChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatPeriodTick(String(v), groupBy)}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v) => formatPeriodTick(String(v), groupBy)}
                        formatter={(value: number) => [value, "Incidents"]}
                      />
                      <Line type="monotone" dataKey="total" stroke={LINE_STROKE} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="print:break-inside-avoid">
                <CardHeader>
                  <CardTitle className="text-base">Incidents over time by company</CardTitle>
                  <CardDescription>Top ten employers by volume; remainder grouped as other.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ChartContainer config={stackChartConfig} className="h-full w-full">
                    <BarChart data={stackedByCompany.chartRows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => formatPeriodTick(String(v), groupBy)}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(v) => formatPeriodTick(String(v), groupBy)}
                        formatter={(value: number, name) => {
                          const label =
                            name === "other"
                              ? "Other companies"
                              : stackChartConfig[name as string]?.label ?? name;
                          return [value, label];
                        }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {stackedByCompany.companyKeys.map((k) => (
                        <Bar key={k.key} dataKey={k.key} stackId="a" fill={`var(--color-${k.key})`} />
                      ))}
                      {stackedByCompany.hasOther ? (
                        <Bar dataKey="other" stackId="a" fill="var(--color-other)" />
                      ) : null}
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Severity mix</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: number) => [value, "Count"]} />
                      <Legend />
                      <Pie
                        data={severityBarData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {severityBarData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Incident type (top 12)</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [value, "Count"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {typeBarData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status mix</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [value, "Count"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {statusBarData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top care locations</CardTitle>
                  <CardDescription>Donut view of incident share by care location.</CardDescription>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: number) => [value, "Incidents"]} />
                      <Legend />
                      <Pie
                        data={(data.tables.topCareLocations ?? []).map((r) => ({
                          locationName: r.locationName,
                        name: r.locationName.length > 28 ? `${r.locationName.slice(0, 26)}…` : r.locationName,
                        count: r.count,
                      }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={92}
                      >
                        {(data.tables.topCareLocations ?? []).map((_, i) => (
                          <Cell key={`loc-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Detained incidents at care locations</CardTitle>
                  <CardDescription>Held-at-site incidents against total incidents by location.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...(data.tables.topCareLocations ?? [])]
                          .sort((a, b) => b.detainedCount - a.detainedCount)
                          .slice(0, 15)
                          .map((r) => ({
                            name: r.locationName.length > 28 ? `${r.locationName.slice(0, 26)}…` : r.locationName,
                            totalCount: r.count,
                            detainedCount: r.detainedCount,
                            detainedRate: r.detainedRate,
                          }))}
                        layout="vertical"
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: number, key: string, payload) => {
                            if (key === "detainedCount") {
                              return [
                                value,
                                `Held at site (${payload?.payload?.detainedRate != null ? `${(Number(payload.payload.detainedRate) * 100).toFixed(1)}%` : "—"})`,
                              ];
                            }
                            return [value, "Total incidents"];
                          }}
                        />
                        <Legend
                          formatter={(value: string) =>
                            value === "detainedCount" ? "Held at site" : "Total incidents"
                          }
                        />
                        <Bar dataKey="totalCount" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="detainedCount" fill="#B91C1C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Detained</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...(data.tables.topCareLocations ?? [])]
                          .sort((a, b) => b.detainedCount - a.detainedCount)
                          .slice(0, 15)
                          .map((r, index) => (
                            <TableRow key={`${r.locationId ?? "loc"}-${index}`}>
                              <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={r.locationName}>
                                {r.locationName}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                              <TableCell className="text-right tabular-nums">{r.detainedCount}</TableCell>
                              <TableCell className="text-right tabular-nums">{pct(r.detainedRate)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Top incident sites (work site text)</CardTitle>
                  <CardDescription>Grouped by raw `incident_location` value (top 25 in period).</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(data.tables.topIncidentSites ?? []).map((r) => ({
                        name: r.siteLabel.length > 36 ? `${r.siteLabel.slice(0, 34)}…` : r.siteLabel,
                        count: r.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [value, "Incidents"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(data.tables.topIncidentSites ?? []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Metrics by company</CardTitle>
                  <CardDescription>Sort columns; export CSV from filters.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={onExportByCompany}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>
                        <button type="button" className="font-medium hover:underline" onClick={() => toggleCompanySort("companyName")}>
                          Company{sortIndicator("companyName")}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="font-medium hover:underline" onClick={() => toggleCompanySort("companyType")}>
                          Type{sortIndicator("companyType")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button type="button" className="font-medium hover:underline" onClick={() => toggleCompanySort("incidentCount")}>
                          Incidents{sortIndicator("incidentCount")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button type="button" className="font-medium hover:underline" onClick={() => toggleCompanySort("openIncidents")}>
                          Open{sortIndicator("openIncidents")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Closed</TableHead>
                      <TableHead className="text-right">
                        <button type="button" className="font-medium hover:underline" onClick={() => toggleCompanySort("ambulanceRate")}>
                          Amb. rate{sortIndicator("ambulanceRate")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Detained</TableHead>
                      <TableHead className="text-right">On site</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByCompany.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-muted-foreground text-center py-8">
                          No incidents in this window for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedByCompany.map((r, index) => (
                        <TableRow key={`${r.companyId ?? "unk"}-${r.companyName}`}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                          <TableCell className="font-medium">{r.companyName}</TableCell>
                          <TableCell>{r.companyType ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.incidentCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.openIncidents}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.closedIncidents}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(r.ambulanceRate)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.detainedAtFapCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.treatedOnSiteCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company × care location</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables.companyByLocation ?? []).map((r, index) => (
                      <TableRow key={`${r.companyId ?? "c"}-${r.locationId ?? "l"}-${index}`}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>{r.companyName}</TableCell>
                        <TableCell>{r.locationName}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Incidents by day × care post</CardTitle>
                  <CardDescription>Incident-only matrix (not merged with visits).</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={onExportMatrix}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {data.tables.incidentsByDayByPost.columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No rows in this window.</p>
                ) : (
                  <Table
                    containerClassName="max-h-[min(56vh,520px)] overflow-auto rounded-md border border-border bg-card shadow-sm print:max-h-none print:overflow-visible print:shadow-none"
                    className="border-collapse"
                  >
                    <TableHeader className="sticky top-0 z-[4] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.12)]">
                      <TableRow className="hover:bg-transparent border-0">
                        <TableHead className="w-12 !bg-[#142F5C] !text-white">#</TableHead>
                        <TableHead className="sticky left-0 top-0 z-[6] min-w-[108px] border-r border-white/15 !bg-[#142F5C] !text-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          Date
                        </TableHead>
                        {matrixPostHeaders(data.tables.incidentsByDayByPost.columns).map((h) => (
                          <TableHead
                            key={h}
                            className="sticky top-0 z-[5] min-w-[76px] whitespace-nowrap text-right !bg-[#142F5C] !text-white text-xs font-semibold"
                          >
                            {h}
                          </TableHead>
                        ))}
                        <TableHead className="sticky right-0 top-0 z-[6] min-w-[76px] border-l border-white/15 text-right !bg-[#142F5C] !text-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tables.incidentsByDayByPost.rows.map((row, index) => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                          <TableCell className="sticky left-0 z-[1] border-r border-border bg-background font-medium whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {formatMatrixDate(row.date)}
                          </TableCell>
                          {row.cells.map((c, i) => (
                            <TableCell key={i} className="text-right tabular-nums">
                              {c}
                            </TableCell>
                          ))}
                          <TableCell className="sticky right-0 z-[1] border-l border-border bg-background text-right font-medium tabular-nums shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {row.rowTotal}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="!border-t !border-white/25 !bg-[#142F5C]">
                      <TableRow className="border-0 !bg-[#142F5C] hover:!bg-[#142F5C]">
                        <TableCell className="bg-[#142F5C] text-white" />
                        <TableCell className="sticky left-0 z-[3] border-r border-white/20 bg-[#142F5C] text-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                          Total
                        </TableCell>
                        {data.tables.incidentsByDayByPost.columnTotals.map((c, i) => (
                          <TableCell key={i} className="border-white/10 bg-[#142F5C] text-right tabular-nums text-white">
                            {c}
                          </TableCell>
                        ))}
                        <TableCell className="sticky right-0 z-[3] border-l border-white/20 bg-[#142F5C] text-right font-semibold tabular-nums text-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                          {data.tables.incidentsByDayByPost.grandTotal}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incident type × severity</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables.typeBySeverity ?? []).map((r, index) => (
                      <TableRow key={`${r.incidentType}-${r.severity}-${index}`}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>{formatIncidentTypeLabel(r.incidentType)}</TableCell>
                        <TableCell>{formatIncidentSeverityLabel(r.severity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {includeDetail && data.detail ? (
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Incident detail</CardTitle>
                    <CardDescription>
                      Page {data.detail.page} — {data.detail.totalCount} total rows (no personal identifiers).
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={detailPage <= 1}
                      onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={detailPage * data.detail.pageSize >= data.detail.totalCount}
                      onClick={() => setDetailPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={onExportDetail}>
                      <Download className="h-4 w-4 mr-2" />
                      CSV page
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Care post</TableHead>
                        <TableHead>Amb.</TableHead>
                        <TableHead>Det.</TableHead>
                        <TableHead>OS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.detail.rows.map((r, index) => (
                        <TableRow key={r.incidentId}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(parseISO(r.incidentDate), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">{formatIncidentTypeLabel(r.incidentType)}</TableCell>
                          <TableCell className="text-sm">{formatIncidentSeverityLabel(r.severity)}</TableCell>
                          <TableCell className="text-sm capitalize">{r.status ?? "—"}</TableCell>
                          <TableCell className="text-sm max-w-[160px] truncate">{r.companyName}</TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">{r.locationName}</TableCell>
                          <TableCell>{r.ambulanceUsed ? "Y" : ""}</TableCell>
                          <TableCell>{r.detainedAtFap ? "Y" : ""}</TableCell>
                          <TableCell>{r.treatedOnSite ? "Y" : ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}

        <MobileNav />
      </div>
    </>
  );
}
