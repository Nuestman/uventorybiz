import { useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { VITAL_METRICS, type VitalMetricKey, type VitalSignRow } from "@/lib/vitals/vitalsConfig";
import { getVitalMetricIcon } from "@/lib/vitals/vitalMetricIcons";
import { getVitalStatusLabel, vitalStatusBadgeText } from "@/lib/vitals/vitalsStatus";
import { buildVitalChartData, formatMetricCardValue, metricHasTrendData } from "@/lib/vitals/vitalsTrends";

type VitalsLatestSummaryTableProps = {
  rows: VitalSignRow[];
  detailHref: (metric: VitalMetricKey) => string;
  className?: string;
};

export function VitalsLatestSummaryTable({ rows, detailHref, className }: VitalsLatestSummaryTableProps) {
  const chartData = useMemo(() => buildVitalChartData(rows), [rows]);
  const metricsWithData = useMemo(
    () => VITAL_METRICS.filter((m) => metricHasTrendData(m, chartData)),
    [chartData],
  );

  if (metricsWithData.length === 0) return null;

  return (
    <section className={cn("rounded-xl bg-white shadow-sm border border-gray-100/80 overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Latest readings summary</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-muted-foreground">Vital</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Current value</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Reference range</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricsWithData.map((metric) => {
              const Icon = getVitalMetricIcon(metric.key);
              const cardValue = formatMetricCardValue(metric.key, rows);
              const status = getVitalStatusLabel(metric.key, rows);
              const statusText = vitalStatusBadgeText(status);
              const displayValue =
                cardValue.primary === "—"
                  ? "—"
                  : `${cardValue.primary}${cardValue.unit ? ` ${cardValue.unit}` : ""}`;

              return (
                <TableRow key={metric.key}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white"
                        style={{ borderColor: `${metric.color}40` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: metric.color }} strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold" style={{ color: metric.color }}>
                      {displayValue}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {metric.referenceRangeShort ?? "—"}
                  </TableCell>
                  <TableCell>
                    {statusText ? (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          statusText === "Normal"
                            ? "bg-sky-100 text-sky-800 hover:bg-sky-100"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100",
                        )}
                      >
                        {statusText}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={detailHref(metric.key)}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-mineaid-navy hover:underline"
                    >
                      Details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
