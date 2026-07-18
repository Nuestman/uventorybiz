import { useMemo } from "react";
import { format } from "date-fns";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  VITAL_METRIC_MAP,
  type VitalMetricKey,
  type VitalSignRow,
} from "@/lib/vitals/vitalsConfig";
import {
  buildVitalChartData,
  calculateMap,
  computeGlucoseContextStats,
  computeVitalStats,
  formatBloodPressureReading,
  formatGlucoseChartValue,
  formatVitalValue,
  getChartYAxisDomain,
  getGlucoseByContext,
  getVitalValue,
} from "@/lib/vitals/vitalsTrends";

type VitalMetricDetailProps = {
  rows: VitalSignRow[];
  metricKey: VitalMetricKey;
};

export function VitalMetricDetail({ rows, metricKey }: VitalMetricDetailProps) {
  if (metricKey === "bloodPressure") {
    return <BloodPressureMetricDetail rows={rows} />;
  }
  if (metricKey === "glucoseLevel") {
    return <GlucoseMetricDetail rows={rows} />;
  }
  return <SingleMetricDetail rows={rows} metricKey={metricKey} />;
}

function SingleMetricDetail({ rows, metricKey }: VitalMetricDetailProps) {
  const def = VITAL_METRIC_MAP[metricKey];
  const chartData = useMemo(() => buildVitalChartData(rows), [rows]);
  const seriesData = useMemo(
    () => chartData.filter((p) => p[metricKey as keyof typeof p] != null),
    [chartData, metricKey],
  );
  const stats = useMemo(() => computeVitalStats(rows, metricKey), [rows, metricKey]);
  const yDomain = getChartYAxisDomain(metricKey);

  const historyRows = useMemo(
    () =>
      [...rows]
        .filter((r) => getVitalValue(r, metricKey) != null)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [rows, metricKey],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Latest"
          value={formatVitalValue(metricKey, stats.latest)}
          sub={stats.latestAt ? format(new Date(stats.latestAt), "MMM d, yyyy h:mm a") : undefined}
        />
        <StatCard
          label="Average"
          value={formatVitalValue(metricKey, stats.avg)}
          sub={`${stats.count} reading${stats.count === 1 ? "" : "s"}`}
        />
        <StatCard label="Lowest" value={formatVitalValue(metricKey, stats.min)} />
        <StatCard label="Highest" value={formatVitalValue(metricKey, stats.max)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{def.label} trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {seriesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No {def.label.toLowerCase()} readings recorded yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={32} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={yDomain}
                  label={{ value: def.unit, angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                />
                {stats.avg != null ? (
                  <ReferenceLine
                    y={stats.avg}
                    stroke={def.color}
                    strokeDasharray="4 4"
                    label={{ value: "avg", fontSize: 10, fill: def.color }}
                  />
                ) : null}
                <Tooltip
                  formatter={(value: number) => [formatVitalValue(metricKey, value), def.label]}
                  labelFormatter={(label) => String(label)}
                />
                <Line
                  type="monotone"
                  dataKey={metricKey}
                  stroke={def.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: def.color }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reading history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No readings.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded</TableHead>
                  <TableHead>{def.label}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(row.recordedAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatVitalValue(metricKey, getVitalValue(row, metricKey), row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BloodPressureMetricDetail({ rows }: { rows: VitalSignRow[] }) {
  const def = VITAL_METRIC_MAP.bloodPressure;
  const chartSeries = def.chartSeries ?? [];

  const chartData = useMemo(() => buildVitalChartData(rows), [rows]);
  const seriesData = useMemo(
    () =>
      chartData.filter(
        (p) => p.bloodPressureSystolic != null || p.bloodPressureDiastolic != null,
      ),
    [chartData],
  );

  const sysStats = useMemo(() => computeVitalStats(rows, "bloodPressureSystolic"), [rows]);
  const diaStats = useMemo(() => computeVitalStats(rows, "bloodPressureDiastolic"), [rows]);

  const mapStats = useMemo(() => {
    const values: { v: number; at: string }[] = [];
    for (const row of rows) {
      const map = calculateMap(row.bloodPressureSystolic, row.bloodPressureDiastolic);
      if (map != null && row.recordedAt) values.push({ v: map, at: row.recordedAt });
    }
    if (values.length === 0) {
      return { count: 0, latest: null, latestAt: null, min: null, max: null, avg: null };
    }
    const sorted = [...values].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const nums = sorted.map((x) => x.v);
    const sum = nums.reduce((a, b) => a + b, 0);
    const latest = sorted[sorted.length - 1];
    return {
      count: nums.length,
      latest: latest.v,
      latestAt: latest.at,
      min: Math.min(...nums),
      max: Math.max(...nums),
      avg: Math.round((sum / nums.length) * 10) / 10,
    };
  }, [rows]);

  const latestBp = useMemo(() => {
    const withBp = [...rows]
      .filter((r) => r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const latest = withBp[0];
    if (!latest) return null;
    return {
      at: latest.recordedAt,
      text: formatBloodPressureReading(
        latest.bloodPressureSystolic,
        latest.bloodPressureDiastolic,
        calculateMap(latest.bloodPressureSystolic, latest.bloodPressureDiastolic),
      ),
    };
  }, [rows]);

  const historyRows = useMemo(
    () =>
      [...rows]
        .filter((r) => r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Latest"
          value={latestBp?.text ?? "—"}
          sub={latestBp?.at ? format(new Date(latestBp.at), "MMM d, yyyy h:mm a") : undefined}
        />
        <StatCard
          label="Average systolic"
          value={formatVitalValue("bloodPressureSystolic", sysStats.avg)}
          sub={`${sysStats.count} reading${sysStats.count === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Average diastolic"
          value={formatVitalValue("bloodPressureDiastolic", diaStats.avg)}
        />
        <StatCard label="Average MAP" value={mapStats.avg != null ? `${mapStats.avg} mmHg` : "—"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{def.label} trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {seriesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No blood pressure readings recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={32} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={["auto", "auto"]}
                  label={{ value: "mmHg", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 shadow-md text-xs">
                        <p className="font-medium mb-1">{label}</p>
                        {payload.map((entry) => {
                          const key = entry.dataKey as "bloodPressureSystolic" | "bloodPressureDiastolic";
                          const val = entry.value as number | null;
                          if (val == null) return null;
                          const line = chartSeries.find((s) => s.key === key);
                          return (
                            <p key={key} style={{ color: entry.color }}>
                              {line?.label ?? key}: {formatVitalValue(key, val)}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chartSeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: series.color }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reading history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No readings.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Systolic</TableHead>
                  <TableHead>Diastolic</TableHead>
                  <TableHead>MAP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => {
                  const map = calculateMap(row.bloodPressureSystolic, row.bloodPressureDiastolic);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(row.recordedAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatVitalValue("bloodPressureSystolic", row.bloodPressureSystolic)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatVitalValue("bloodPressureDiastolic", row.bloodPressureDiastolic)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {map != null ? formatVitalValue("bloodPressureSystolic", map) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GlucoseMetricDetail({ rows }: { rows: VitalSignRow[] }) {
  const def = VITAL_METRIC_MAP.glucoseLevel;
  const chartSeries = def.chartSeries ?? [];

  const chartData = useMemo(() => buildVitalChartData(rows), [rows]);
  const seriesData = useMemo(
    () => chartData.filter((p) => p.glucoseFbs != null || p.glucoseRbs != null),
    [chartData],
  );

  const fbsStats = useMemo(() => computeGlucoseContextStats(rows, "fbs"), [rows]);
  const rbsStats = useMemo(() => computeGlucoseContextStats(rows, "rbs"), [rows]);

  const historyRows = useMemo(
    () =>
      [...rows]
        .filter((r) => r.glucoseLevel != null)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Latest FBS"
          value={formatGlucoseChartValue(fbsStats.latest)}
          sub={fbsStats.latestAt ? format(new Date(fbsStats.latestAt), "MMM d, yyyy h:mm a") : undefined}
        />
        <StatCard
          label="Latest RBS"
          value={formatGlucoseChartValue(rbsStats.latest)}
          sub={rbsStats.latestAt ? format(new Date(rbsStats.latestAt), "MMM d, yyyy h:mm a") : undefined}
        />
        <StatCard
          label="Average FBS"
          value={formatGlucoseChartValue(fbsStats.avg)}
          sub={`${fbsStats.count} reading${fbsStats.count === 1 ? "" : "s"}`}
        />
        <StatCard label="Average RBS" value={formatGlucoseChartValue(rbsStats.avg)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{def.label} trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {seriesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No blood glucose readings recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={32} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={["auto", "auto"]}
                  label={{ value: "mmol/L", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 shadow-md text-xs">
                        <p className="font-medium mb-1">{label}</p>
                        {payload.map((entry) => {
                          const key = entry.dataKey as "glucoseFbs" | "glucoseRbs";
                          const val = entry.value as number | null;
                          if (val == null) return null;
                          const line = chartSeries.find((s) => s.key === key);
                          return (
                            <p key={key} style={{ color: entry.color }}>
                              {line?.label ?? key}: {formatGlucoseChartValue(val)}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chartSeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: series.color }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reading history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No readings.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded</TableHead>
                  <TableHead>FBS (fasting)</TableHead>
                  <TableHead>RBS (random)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => {
                  const fbs = getGlucoseByContext(row, "fbs");
                  const rbs = getGlucoseByContext(row, "rbs");
                  const typeMissing = row.glucoseContext == null && row.glucoseLevel != null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(row.recordedAt), "MMM d, yyyy h:mm a")}
                        {typeMissing ? (
                          <span className="block text-xs text-muted-foreground">Type not recorded</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">
                        {typeMissing ? formatGlucoseChartValue(row.glucoseLevel) : formatGlucoseChartValue(fbs)}
                      </TableCell>
                      <TableCell className="font-medium">{formatGlucoseChartValue(rbs)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}
