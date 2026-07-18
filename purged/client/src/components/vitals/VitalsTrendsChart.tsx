import { useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  VITAL_METRICS,
  type VitalChartDataKey,
  type VitalMetricDef,
  type VitalMetricKey,
  type VitalSignRow,
} from "@/lib/vitals/vitalsConfig";
import { getVitalMetricIcon } from "@/lib/vitals/vitalMetricIcons";
import { getVitalStatusLabel, vitalStatusBadgeText } from "@/lib/vitals/vitalsStatus";
import {
  buildVitalChartData,
  formatChartSeriesValue,
  formatMetricCardValue,
  getChartYAxisDomain,
  metricHasTrendData,
} from "@/lib/vitals/vitalsTrends";

type VitalsTrendsChartProps = {
  rows: VitalSignRow[];
  detailHref: (metric: VitalMetricKey) => string;
  className?: string;
  showDetailLinks?: boolean;
};

function getChartLines(metric: VitalMetricDef): Array<{ dataKey: VitalChartDataKey; color: string; label: string }> {
  if (metric.chartSeries?.length) {
    return metric.chartSeries.map((s) => ({
      dataKey: s.key,
      color: s.color,
      label: s.label,
    }));
  }
  if (metric.key === "bmi") {
    return [{ dataKey: "bmi", color: metric.color, label: metric.label }];
  }
  return [{ dataKey: metric.key as VitalChartDataKey, color: metric.color, label: metric.label }];
}

function VitalStatusBadge({ metricKey, rows }: { metricKey: VitalMetricKey; rows: VitalSignRow[] }) {
  const label = vitalStatusBadgeText(getVitalStatusLabel(metricKey, rows));
  if (!label) return null;
  const isNormal = label === "Normal";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0 shrink-0",
        isNormal ? "bg-sky-100 text-sky-800 hover:bg-sky-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100",
      )}
    >
      {label}
    </Badge>
  );
}

function VitalTrendCard({
  metric,
  rows,
  chartData,
  detailHref,
  showDetailLink,
}: {
  metric: VitalMetricDef;
  rows: VitalSignRow[];
  chartData: ReturnType<typeof buildVitalChartData>;
  detailHref: (metric: VitalMetricKey) => string;
  showDetailLink: boolean;
}) {
  const Icon = getVitalMetricIcon(metric.key);
  const lines = getChartLines(metric);
  const hasData = metricHasTrendData(metric, chartData);
  const seriesData = useMemo(
    () => chartData.filter((p) => lines.some((line) => p[line.dataKey] != null)),
    [chartData, lines],
  );
  const cardValue = useMemo(() => formatMetricCardValue(metric.key, rows), [metric.key, rows]);
  const yDomain = getChartYAxisDomain(metric.key);
  const href = detailHref(metric.key);

  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm border border-gray-100/80">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white"
            style={{ borderColor: `${metric.color}40` }}
          >
            <Icon className="h-4 w-4" style={{ color: metric.color }} strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">{metric.label}</p>
        </div>
        {hasData ? <VitalStatusBadge metricKey={metric.key} rows={rows} /> : null}
      </div>

      <div className="mb-3 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-3xl font-bold tracking-tight" style={{ color: metric.color }}>
          {cardValue.primary}
        </span>
        {cardValue.unit ? (
          <span className="text-sm text-muted-foreground font-medium">{cardValue.unit}</span>
        ) : null}
      </div>

      <div className="h-[72px] w-full mb-3">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={yDomain} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-md border bg-background px-2.5 py-1.5 shadow-md text-xs">
                      <p className="font-medium mb-0.5">{label}</p>
                      {payload.map((entry) => {
                        const key = entry.dataKey as VitalChartDataKey;
                        const val = entry.value as number | null;
                        if (val == null) return null;
                        const line = lines.find((l) => l.dataKey === key);
                        return (
                          <p key={key} style={{ color: entry.color }}>
                            {line?.label ?? key}: {formatChartSeriesValue(key, val)}
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center">
            <p className="text-xs text-muted-foreground">No trend data</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
        <p className="text-xs text-muted-foreground">
          {metric.referenceRangeShort ? `Ref: ${metric.referenceRangeShort}` : null}
        </p>
        {showDetailLink && hasData ? (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-mineaid-navy hover:underline shrink-0"
          >
            Details
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {lines.length > 1 && hasData ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {lines.map((line) => (
            <span key={line.dataKey} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VitalsTrendsChart({
  rows,
  detailHref,
  className,
  showDetailLinks = true,
}: VitalsTrendsChartProps) {
  const chartData = useMemo(() => buildVitalChartData(rows), [rows]);

  if (chartData.length === 0) {
    return null;
  }

  const metricsWithData = VITAL_METRICS.filter((m) => metricHasTrendData(m, chartData));

  if (metricsWithData.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground text-center py-8", className)}>
        No vital readings recorded yet.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {metricsWithData.map((metric) => (
        <VitalTrendCard
          key={metric.key}
          metric={metric}
          rows={rows}
          chartData={chartData}
          detailHref={detailHref}
          showDetailLink={showDetailLinks}
        />
      ))}
    </div>
  );
}
