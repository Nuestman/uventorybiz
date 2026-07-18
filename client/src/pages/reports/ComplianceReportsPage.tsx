import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Link } from "wouter";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ChevronDown, ClipboardCheck, Download, ExternalLink, Info, Printer } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClinicalReportsPrintStyles } from "@/components/ClinicalReportsPrintStyles";
import { CLINICAL_REPORTS_PRINT_BODY_CLASS } from "@/lib/clinicalReportsPrint";
import MobileNav from "@/components/MobileNav";

type GroupBy = "day" | "week" | "month";

type CompliancePayload = {
  meta: {
    from: string;
    to: string;
    groupBy: GroupBy;
    generatedAt: string;
    filters: {
      locationIds: string[];
      auditActions: string[];
      auditResourceTypes: string[];
    };
  };
  kpis: {
    auditEventsTotal: number;
    auditUniqueActiveUsers: number;
    auditDeleteActions: number;
    auditFailedAuthCount: number;
    auditEventsWithImpersonationContext: number;
    sopVersionsPendingApproval: number;
    sopVersionsPublished: number;
    sopVersionsDraft: number;
    sopVersionsRejected: number;
    sopVersionsArchived: number;
    signedLegalUploadsInWindow: number;
    realIncidentsInWindow: number;
    drillOrSimulationIncidentsInWindow: number;
  };
  series: {
    auditEventsOverTime: Array<{ period: string; total: number }>;
  };
  tables: {
    auditByResourceType: Array<{ resourceType: string; count: number }>;
    auditByAction: Array<{ action: string; count: number }>;
    auditHighRiskByAction: Array<{ action: string; count: number }>;
    sopVersionStatusMix: Array<{ status: string; count: number }>;
    topAuditActors: Array<{ userId: string; eventCount: number; displayName: string }>;
  };
  shiftHandoverAckSummary: {
    shiftReportsSubmitted: number;
    shiftReportAcknowledgmentCount: number;
    shiftReportAckRate: number | null;
  };
  exceptions: Array<{
    ruleId: string;
    severity: string;
    message: string;
    value: number;
    threshold: number;
  }>;
};

function periodTick(v: string): string {
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s.slice(0, 10);
}

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
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

function splitComma(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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
  auditActions: string[];
  auditResourceTypes: string[];
}): string {
  const sp = new URLSearchParams();
  sp.set("from", params.from);
  sp.set("to", params.to);
  sp.set("groupBy", params.groupBy);
  if (params.locationIds.length) sp.set("locationIds", params.locationIds.join(","));
  if (params.auditActions.length) sp.set("auditActions", params.auditActions.join(","));
  if (params.auditResourceTypes.length) sp.set("auditResourceTypes", params.auditResourceTypes.join(","));
  return sp.toString();
}

export default function ComplianceReportsPage() {
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [auditActionsText, setAuditActionsText] = useState("");
  const [auditResourceTypesText, setAuditResourceTypesText] = useState("");

  const auditActions = useMemo(() => splitComma(auditActionsText), [auditActionsText]);
  const auditResourceTypes = useMemo(() => splitComma(auditResourceTypesText), [auditResourceTypesText]);

  const queryString = useMemo(
    () =>
      buildQuery({
        from,
        to,
        groupBy,
        locationIds,
        auditActions,
        auditResourceTypes,
      }),
    [from, to, groupBy, locationIds, auditActions, auditResourceTypes],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery<CompliancePayload>({
    queryKey: ["/api/reports/compliance", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reports/compliance?${queryString}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || "Failed to load compliance reports");
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

  const lineAudit = data?.series.auditEventsOverTime ?? [];

  const printFilterSummary = [
    `Window: ${from} → ${to} · Group by: ${groupBy}`,
    `Locations (shift handover): ${locationIds.length ? locationIds.length : "all"}`,
    `Audit actions filter: ${auditActions.length ? auditActions.join(", ") : "none"}`,
    `Audit resource types filter: ${auditResourceTypes.length ? auditResourceTypes.join(", ") : "none"}`,
  ];

  const exportAuditByResource = () => {
    const rows = (data?.tables.auditByResourceType ?? []).map((r) => [r.resourceType, r.count]);
    downloadCsv(`compliance-audit-by-resource-${from}-to-${to}.csv`, ["resourceType", "count"], rows);
  };

  const exportAuditByAction = () => {
    const rows = (data?.tables.auditByAction ?? []).map((r) => [r.action, r.count]);
    downloadCsv(`compliance-audit-by-action-${from}-to-${to}.csv`, ["action", "count"], rows);
  };

  const exportSopStatus = () => {
    const rows = (data?.tables.sopVersionStatusMix ?? []).map((r) => [r.status, r.count]);
    downloadCsv(`compliance-sop-version-status-${from}-to-${to}.csv`, ["status", "count"], rows);
  };

  const exportTopActors = () => {
    const rows = (data?.tables.topAuditActors ?? []).map((r) => [r.displayName, r.userId, r.eventCount]);
    downloadCsv(`compliance-top-audit-actors-${from}-to-${to}.csv`, ["displayName", "userId", "eventCount"], rows);
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
        data-testid="compliance-reports-page"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 print:hidden">
              <Link href="/reports" className="hover:text-uventorybiz-navy underline-offset-4 hover:underline">
                Reports
              </Link>
              <span aria-hidden>/</span>
              <span>Compliance</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 print:text-black">
              <ClipboardCheck className="h-8 w-8 text-uventorybiz-navy shrink-0" />
              Compliance &amp; audit reports
            </h1>
            <p className="text-uventorybiz-gray mt-1 max-w-2xl">
              Tenant-scoped governance summaries: audit activity, SOP workflow posture, signed legal uploads, and shift
              handover acknowledgment coverage. Raw audit payloads are not exported here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden lg:self-start">
            <Button variant="outline" size="sm" asChild>
              <Link href="/audit-trail">
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
                Audit trail
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sops">
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
                SOP administration
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
                  <li>Set the reporting window and time grain; audit aggregates always respect these bounds.</li>
                  <li>
                    Optionally narrow audit rows by action or resource type (comma-separated exact values). Shift handover
                    KPIs can be scoped by care location.
                  </li>
                  <li>Use CSV exports for auditor-ready tables; use Print for a snapshot including charts.</li>
                  <li>Review exceptions for unusual delete or failed-auth rates relative to a 7-day equivalent.</li>
                </ol>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Date window, grouping, optional audit narrowing, and shift-report locations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="comp-from">From</Label>
              <Input id="comp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-to">To</Label>
              <Input id="comp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                    Shift locations ({locationIds.length === 0 ? "all" : locationIds.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3">
                  <p className="text-xs text-muted-foreground mb-2">Scopes shift handover acknowledgment KPIs only.</p>
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
              <Label htmlFor="comp-audit-actions">Audit actions (comma-separated, exact match)</Label>
              <Input
                id="comp-audit-actions"
                value={auditActionsText}
                onChange={(e) => setAuditActionsText(e.target.value)}
                placeholder="e.g. delete, update, login_failed"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="comp-audit-resources">Audit resource types (comma-separated, exact match)</Label>
              <Input
                id="comp-audit-resources"
                value={auditResourceTypesText}
                onChange={(e) => setAuditResourceTypesText(e.target.value)}
                placeholder="e.g. incident_report, medical_visit"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" onClick={exportAuditByResource} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                CSV: audit by resource
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportAuditByAction} disabled={isLoading}>
                CSV: audit by action
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportSopStatus} disabled={isLoading}>
                CSV: SOP version status
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportTopActors} disabled={isLoading}>
                CSV: top actors
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive text-base">Could not load reports</CardTitle>
              <CardDescription>{error instanceof Error ? error.message : "Unknown error"}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!error && isLoading ? <p className="text-sm text-muted-foreground">Loading compliance analytics…</p> : null}

        {!error && !isLoading && data ? (
          <>
            {data.exceptions.length > 0 ? (
              <div className="space-y-2">
                {data.exceptions.map((ex) => (
                  <Alert key={ex.ruleId} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="capitalize">{ex.ruleId.replace(/_/g, " ")}</AlertTitle>
                    <AlertDescription>
                      {ex.message} (observed weekly-rate equivalent: {ex.value}, threshold: {ex.threshold})
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Audit events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">{data.kpis.auditEventsTotal}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.kpis.auditUniqueActiveUsers} distinct users · {data.kpis.auditEventsWithImpersonationContext}{" "}
                    with impersonation metadata
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Delete-related / failed auth</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.kpis.auditDeleteActions} / {data.kpis.auditFailedAuthCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">delete-pattern actions · failed login attempts (audit)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">SOP versions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.kpis.sopVersionsPublished} pub · {data.kpis.sopVersionsPendingApproval} pending
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    draft {data.kpis.sopVersionsDraft} · rejected {data.kpis.sopVersionsRejected} · archived{" "}
                    {data.kpis.sopVersionsArchived}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Signed legal uploads</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">{data.kpis.signedLegalUploadsInWindow}</p>
                  <p className="text-xs text-muted-foreground mt-1">In selected window (tenant uploads)</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Incidents — real vs drills/simulations</CardTitle>
                <CardDescription>
                  Operational incident counts exclude exercises marked at close. See{" "}
                  <Link href="/reports/incidents" className="text-primary underline">
                    incident reports
                  </Link>{" "}
                  for detail.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-8 items-baseline">
                <div>
                  <p className="text-3xl font-bold tabular-nums">{data.kpis.realIncidentsInWindow}</p>
                  <p className="text-sm text-muted-foreground">Real incidents in window</p>
                </div>
                <div>
                  <p className="text-3xl font-bold tabular-nums">{data.kpis.drillOrSimulationIncidentsInWindow}</p>
                  <p className="text-sm text-muted-foreground">Drills / simulations</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Shift handover acknowledgments</CardTitle>
                <CardDescription>
                  Same acknowledgment KPI as operations reports, scoped by date range and selected locations.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6 items-baseline">
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {data.shiftHandoverAckSummary.shiftReportAcknowledgmentCount} /{" "}
                    {data.shiftHandoverAckSummary.shiftReportsSubmitted}
                  </p>
                  <p className="text-sm text-muted-foreground">Acknowledgments / shift reports submitted</p>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums">{pct(data.shiftHandoverAckSummary.shiftReportAckRate)}</p>
                  <p className="text-sm text-muted-foreground">Acknowledgment rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit volume over time</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineAudit}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tickFormatter={periodTick} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(v) => periodTick(String(v))} />
                    <Line type="monotone" dataKey="total" stroke="#142f5c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit events by resource type</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource type</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tables.auditByResourceType.map((r) => (
                        <TableRow key={r.resourceType}>
                          <TableCell className="font-mono text-xs">{r.resourceType}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit events by action</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto max-h-[360px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tables.auditByAction.map((r) => (
                        <TableRow key={`${r.action}-${r.count}`}>
                          <TableCell className="font-mono text-xs">{r.action}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">High-signal audit actions</CardTitle>
                <CardDescription>Subset aligned to deletes, authentication failures, and credential lifecycle events.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables.auditHighRiskByAction.length ? data.tables.auditHighRiskByAction : []).map((r) => (
                      <TableRow key={r.action}>
                        <TableCell className="font-mono text-xs">{r.action}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.tables.auditHighRiskByAction.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No matching events in this window.</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top audit actors</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tables.topAuditActors.map((r) => (
                        <TableRow key={r.userId}>
                          <TableCell>{r.displayName}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.eventCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SOP version status mix</CardTitle>
                  <CardDescription>Non-archived SOP documents only.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Versions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tables.sopVersionStatusMix.map((r) => (
                        <TableRow key={r.status}>
                          <TableCell className="capitalize">{r.status.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        <MobileNav />
      </div>
    </>
  );
}
