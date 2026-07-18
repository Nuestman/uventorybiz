import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PortalLogVitalsModal } from "./components/PortalLogVitalsModal";
import { Activity, AlertTriangle, Plus } from "lucide-react";
import { VitalsTrendsChart } from "@/components/vitals/VitalsTrendsChart";
import { VitalsLatestSummaryTable } from "@/components/vitals/VitalsLatestSummaryTable";
import { VITAL_METRICS, type VitalSignRow } from "@/lib/vitals/vitalsConfig";
import { calculateBmi, formatMetricCellValue } from "@/lib/vitals/vitalsTrends";
import { formatGlucoseDisplay } from "@shared/glucose";
import { getQueryFn } from "@/lib/queryClient";
import { PortalEmptyState, PortalLoadingBlock, PortalPageHeader, PORTAL_PRIMARY_BTN_CLASS, formatDateTime } from "./portalUi";
import { usePortalSession } from "./usePortalSession";

const VITALS_QUERY_KEY = ["/api/portal/vital-signs"] as const;

function vitalSourceLabel(source?: string | null): string {
  if (source === "patient_self") return "Self-reported";
  return "Clinic";
}

function VitalMetric({
  label,
  value,
  unit,
  href,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  href?: string;
}) {
  if (value == null || value === "") return null;
  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-wide text-mineaid-gray">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {value}
        {unit ? <span className="text-xs font-normal text-mineaid-gray ml-0.5">{unit}</span> : null}
      </p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-md bg-gray-50 px-3 py-2 text-center min-w-[4.5rem] hover:bg-gray-100 transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-md bg-gray-50 px-3 py-2 text-center min-w-[4.5rem]">{inner}</div>;
}

function VitalCard({ row }: { row: VitalSignRow }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{formatDateTime(row.recordedAt)}</p>
        <Badge variant={row.source === "patient_self" ? "secondary" : "outline"} className="text-[10px]">
          {vitalSourceLabel(row.source)}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <VitalMetric label="HR" value={row.heartRate} unit="bpm" href="/portal/vitals/heartRate" />
        <VitalMetric label="Temp" value={row.temperature} unit="°C" href="/portal/vitals/temperature" />
        <VitalMetric label="RR" value={row.respiratoryRate} unit="/min" href="/portal/vitals/respiratoryRate" />
        <VitalMetric
          label="BP"
          value={
            row.bloodPressureSystolic != null || row.bloodPressureDiastolic != null
              ? `${row.bloodPressureSystolic ?? "—"}/${row.bloodPressureDiastolic ?? "—"}`
              : null
          }
          unit="mmHg"
          href="/portal/vitals/bloodPressure"
        />
        <VitalMetric label="SpO₂" value={row.oxygenSaturation} unit="%" href="/portal/vitals/oxygenSaturation" />
        <VitalMetric label="Glucose" value={formatGlucoseDisplay(row.glucoseLevel, row.glucoseContext)} href="/portal/vitals/glucoseLevel" />
        <VitalMetric label="Pain" value={row.painScore} unit="/10" href="/portal/vitals/painScore" />
        <VitalMetric label="Wt" value={row.weight} unit="kg" href="/portal/vitals/weight" />
        <VitalMetric label="Ht" value={row.height} unit="cm" href="/portal/vitals/height" />
        <VitalMetric
          label="BMI"
          value={calculateBmi(
            row.weight != null ? Number.parseFloat(String(row.weight)) : null,
            row.height != null ? Number.parseFloat(String(row.height)) : null,
          )}
          href="/portal/vitals/bmi"
        />
      </div>
    </div>
  );
}

export default function PortalVitalsPage() {
  const { session } = usePortalSession();
  const [recordOpen, setRecordOpen] = useState(false);

  const { data = [], isLoading } = useQuery<VitalSignRow[]>({
    queryKey: VITALS_QUERY_KEY,
    queryFn: getQueryFn<VitalSignRow[]>({ on401: "throw" }),
  });

  const lastRecordedSubtitle = useMemo(() => {
    if (data.length === 0) return null;
    const latest = [...data].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0];
    if (!latest?.recordedAt) return null;
    const datePart = format(new Date(latest.recordedAt), "MMMM d, yyyy");
    const site = session?.tenant.name?.trim();
    return site ? `Last recorded ${datePart} · ${site}` : `Last recorded ${datePart}`;
  }, [data, session?.tenant.name]);

  const recordButton = (
    <Button onClick={() => setRecordOpen(true)} className={PORTAL_PRIMARY_BTN_CLASS}>
      <Plus className="h-4 w-4 mr-2" />
      Log reading
    </Button>
  );

  const detailHref = (metric: string) => `/portal/vitals/${metric}`;

  return (
    <div className="space-y-6">
      {/* Desktop page header — matches Figma main area */}
      <div className="hidden md:flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Vital signs</h1>
          {lastRecordedSubtitle ? (
            <p className="text-sm text-muted-foreground mt-1">{lastRecordedSubtitle}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">No readings recorded yet</p>
          )}
        </div>
        {recordButton}
      </div>

      {/* Mobile page header */}
      <div className="md:hidden">
        <PortalPageHeader
          icon={Activity}
          title="Vital signs"
          description="View clinic readings and record your own measurements for self-checks."
          action={recordButton}
        />
      </div>

      <Alert className="md:hidden">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Self-check readings are not urgent care</AlertTitle>
        <AlertDescription>
          Home or personal-device readings help you and your occupational health team spot trends. They do not replace
          an examination at the clinic or FAP.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <PortalLoadingBlock />
      ) : data.length === 0 ? (
        <PortalEmptyState
          icon={Activity}
          title="No vital signs on file"
          description="Clinic readings and any you record yourself will appear here."
        />
      ) : (
        <>
          <VitalsTrendsChart rows={data} detailHref={detailHref} />

          <VitalsLatestSummaryTable rows={data} detailHref={detailHref} className="hidden md:block" />

          <Card className="md:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.map((row) => (
                  <VitalCard key={row.id} row={row} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="hidden md:block">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">All readings</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorded</TableHead>
                    <TableHead>Source</TableHead>
                    {VITAL_METRICS.map((m) => (
                      <TableHead key={m.key}>
                        <Link href={`/portal/vitals/${m.key}`} className="hover:text-[var(--portal-teal)] hover:underline">
                          {m.shortLabel}
                        </Link>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {row.recordedAt ? formatDateTime(row.recordedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.source === "patient_self" ? "secondary" : "outline"}>
                          {vitalSourceLabel(row.source)}
                        </Badge>
                      </TableCell>
                      {VITAL_METRICS.map((m) => (
                        <TableCell key={m.key}>{formatMetricCellValue(m.key, row)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <PortalLogVitalsModal open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}
