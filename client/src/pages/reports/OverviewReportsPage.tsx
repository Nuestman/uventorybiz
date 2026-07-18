import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Link } from "wouter";
import { AlertTriangle, ClipboardCheck, ExternalLink, Filter, Info, LayoutDashboard, Wrench } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MobileNav from "@/components/MobileNav";

type OverviewPayload = {
  meta: {
    from: string;
    to: string;
    generatedAt: string;
    locationIds: string[];
    partial: boolean;
    notes: string[];
    omitted: {
      incidents: string | null;
      clinical: string | null;
      operations: string | null;
      compliance: string | null;
    };
  };
  incidents: null | {
    totalInWindow: number;
    openCount: number;
    closedCount: number;
  };
  clinical: null | {
    totalVisits: number;
    triageEvents: number;
  };
  operations: null | {
    ticketsOpen: number;
    ticketsCreatedInWindow: number;
    ticketsResolvedInWindow: number;
    dutyAssignmentsCompletedRate: number | null;
  };
  shiftHandover: null | {
    reportsSubmitted: number;
    reportsAcknowledged: number;
    acknowledgmentRate: number | null;
  };
  compliance: null | {
    auditEventsInWindow: number;
  };
};

function pct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function buildQuery(from: string, to: string, locationIds: string[]): string {
  const sp = new URLSearchParams();
  sp.set("from", from);
  sp.set("to", to);
  if (locationIds.length) sp.set("locationIds", locationIds.join(","));
  return sp.toString();
}

function toggleId(list: string[], id: string, set: (next: string[]) => void) {
  if (list.includes(id)) set(list.filter((x) => x !== id));
  else set([...list, id]);
}

export default function OverviewReportsPage() {
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const queryString = useMemo(() => buildQuery(from, to, locationIds), [from, to, locationIds]);

  const { data: careLocations = [] } = useQuery<Array<{ id: string; locationName: string }>>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading, error, isFetching, refetch } = useQuery<OverviewPayload>({
    queryKey: ["/api/reports/overview", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reports/overview?${queryString}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || "Failed to load reports overview");
      }
      return res.json();
    },
  });

  const deepLinkQuery = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("from", from);
    sp.set("to", to);
    if (locationIds.length) sp.set("locationIds", locationIds.join(","));
    return sp.toString();
  }, [from, to, locationIds]);

  return (
    <div className="space-y-6 p-4 pt-6 sm:p-6 sm:pt-7 pb-24 md:pb-8 bg-uventorybiz-light-gray min-h-[60vh]" data-testid="overview-reports-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/reports" className="hover:text-uventorybiz-navy underline-offset-4 hover:underline">
              Reports
            </Link>
            <span aria-hidden>/</span>
            <span>Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Executive overview
          </h1>
          <p className="text-uventorybiz-gray mt-1 max-w-3xl">
            Snapshot across incidents, operations, shift handover, and key trends for the selected date window.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={isLoading}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <Collapsible defaultOpen={false}>
        <Card className="border-muted">
          <CardHeader className="p-0">
            <CollapsibleTrigger asChild>
              <button type="button" className="group flex w-full items-center gap-3 rounded-t-lg px-6 py-4 text-left outline-none hover:bg-muted/40">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-base font-semibold leading-none">How to use this page</span>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="text-sm text-muted-foreground space-y-3 px-6 py-6 border-t border-border">
              <ol className="list-decimal pl-5 space-y-2">
                <li>Set From/To and optional locations.</li>
                <li>Scan each domain card for top-line signal.</li>
                <li>Use Open full report links to drill into detailed analytics with preserved filters.</li>
              </ol>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Global filter contract shared with domain report pages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="overview-from">From</Label>
            <Input id="overview-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overview-to">To</Label>
            <Input id="overview-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                      <Checkbox checked={locationIds.includes(loc.id)} onCheckedChange={() => toggleId(locationIds, loc.id, setLocationIds)} />
                      <span className="truncate">{loc.locationName}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2 flex items-end">
            <p className="text-xs text-muted-foreground">
              Last generated: {data?.meta.generatedAt ? format(new Date(data.meta.generatedAt), "yyyy-MM-dd HH:mm") : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Could not load overview</CardTitle>
            <CardDescription>{error instanceof Error ? error.message : "Unknown error"}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!error && isLoading ? <p className="text-sm text-muted-foreground">Loading overview analytics…</p> : null}

      {!error && !isLoading && data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Incidents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.incidents ? (
                <>
                  <p className="text-3xl font-bold tabular-nums">{data.incidents.totalInWindow}</p>
                  <p className="text-sm text-muted-foreground">Open {data.incidents.openCount} · Closed {data.incidents.closedCount}</p>
                  <Link href={`/reports/incidents?${deepLinkQuery}`} className="inline-flex items-center text-sm text-[#142F5C] hover:underline">
                    Open full report <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not available for your current role.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.operations ? (
                <>
                  <p className="text-3xl font-bold tabular-nums">{data.operations.ticketsOpen}</p>
                  <p className="text-sm text-muted-foreground">
                    Open tickets · created {data.operations.ticketsCreatedInWindow} · resolved {data.operations.ticketsResolvedInWindow}
                  </p>
                  <p className="text-sm text-muted-foreground">Duty completion rate {pct(data.operations.dutyAssignmentsCompletedRate)}</p>
                  <Link href={`/reports/operations?${deepLinkQuery}`} className="inline-flex items-center text-sm text-[#142F5C] hover:underline">
                    Open full report <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not available for your current role.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Shift handover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.shiftHandover ? (
                <>
                  <p className="text-3xl font-bold tabular-nums">{data.shiftHandover.reportsSubmitted}</p>
                  <p className="text-sm text-muted-foreground">
                    Reports submitted · acknowledged {data.shiftHandover.reportsAcknowledged} ({pct(data.shiftHandover.acknowledgmentRate)})
                  </p>
                  <Link href={`/reports/operations?${deepLinkQuery}`} className="inline-flex items-center text-sm text-[#142F5C] hover:underline">
                    Open full report <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not available for your current role.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.compliance ? (
                <>
                  <p className="text-3xl font-bold tabular-nums">{data.compliance.auditEventsInWindow}</p>
                  <p className="text-sm text-muted-foreground">Audit events in selected window.</p>
                  <Link href={`/reports/compliance?${deepLinkQuery}`} className="inline-flex items-center text-sm text-[#142F5C] hover:underline">
                    Open full report <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not available for your current role.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <MobileNav />
    </div>
  );
}
