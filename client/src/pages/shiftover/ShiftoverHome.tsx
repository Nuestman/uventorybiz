import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Handshake, ClipboardList, ListTodo, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileNav from "@/components/MobileNav";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { format } from "date-fns";

type ShiftoverSummary = {
  lastShiftReport: {
    id: string;
    reportDate: string;
    shift: string;
    summary: string;
    locationName?: string;
    createdAt: string;
  } | null;
  pendingAcknowledgmentsCount: number;
  openLinkedItemsCount: number;
};

/**
 * ShiftOver hub — marketing-facing entry for the continuity & handover module.
 * Operational screens (e.g. shift reports) live on sub-routes such as /shiftover/shift-report.
 */
export default function ShiftoverHome() {
  const { activeLocation } = useActiveLocation();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/shiftover/summary", activeLocation?.id ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeLocation?.id) params.set("locationId", activeLocation.id);
      const res = await fetch(`/api/shiftover/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json() as Promise<ShiftoverSummary>;
    },
  });

  return (
    <div
      className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray"
      data-testid="shiftover-home-page"
    >
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Handshake className="h-8 w-8 text-uventorybiz-navy shrink-0" />
          ShiftOver
        </h2>
        <p className="text-uventorybiz-gray mt-1 max-w-3xl">
          Continuity and accountability across shift changes: capture what happened, what is open, and
          what the next team needs to know. Use the tools below for day-to-day workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last handover
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : summary?.lastShiftReport ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-gray-900 line-clamp-2">{summary.lastShiftReport.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(summary.lastShiftReport.reportDate), "yyyy-MM-dd")} ·{" "}
                  <span className="capitalize">{summary.lastShiftReport.shift}</span>
                  {summary.lastShiftReport.locationName ? ` · ${summary.lastShiftReport.locationName}` : ""}
                </p>
                <Button variant="link" className="h-auto p-0 text-uventorybiz-navy" asChild>
                  <Link href={`/shiftover/shift-report?highlight=${summary.lastShiftReport.id}`}>
                    View report
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shift reports in scope yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending your acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <p className="text-3xl font-bold text-uventorybiz-navy">{summary?.pendingAcknowledgmentsCount ?? 0}</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/shiftover/shift-report">Review shift reports</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Open linked items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <p className="text-3xl font-bold text-uventorybiz-navy">{summary?.openLinkedItemsCount ?? 0}</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/shiftover/open-items">Open items register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Shift reports
            </CardTitle>
            <CardDescription>
              End-of-shift narrative reports, structured handover sections, acknowledgments, links, and
              attachments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/shiftover/shift-report">Open shift reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5" />
              Open handover items
            </CardTitle>
            <CardDescription>
              Tickets, incidents, and duties linked from shift reports that are still open.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/shiftover/open-items">View open items</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's new in ShiftOver</CardTitle>
          <CardDescription>Recent updates for handover continuity workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-gray-900">April 2026:</span> Structured handover, acknowledgments,
            linked records with search and multi-select, open items register, attachments, and revision history are
            live.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Use Shift reports to publish handover context and acknowledge incoming coverage.</li>
            <li>Link tickets, incidents, and duties; open items roll up automatically in the register.</li>
            <li>Attach files and track edit history for accountability.</li>
          </ul>
        </CardContent>
      </Card>

      <MobileNav />
    </div>
  );
}
