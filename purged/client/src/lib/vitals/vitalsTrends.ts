import { format } from "date-fns";
import { formatGlucoseDisplay, formatGlucoseMmol, type GlucoseContext } from "@shared/glucose";
import type { VitalChartDataKey, VitalMetricKey, VitalSignRow, VitalStorageKey } from "./vitalsConfig";
import { VITAL_STORAGE_KEYS } from "./vitalsConfig";

export type VitalChartPoint = {
  recordedAt: string;
  label: string;
  timestamp: number;
} & Partial<Record<VitalStorageKey | "bmi" | "glucoseFbs" | "glucoseRbs", number | null>>;

export function parseVitalNumeric(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export function calculateMap(systolic: number | null, diastolic: number | null): number | null {
  if (systolic == null || diastolic == null) return null;
  return Math.round((diastolic + (systolic - diastolic) / 3) * 10) / 10;
}

export function getGlucoseByContext(row: VitalSignRow, context: GlucoseContext): number | null {
  if (row.glucoseLevel == null || row.glucoseContext !== context) return null;
  return row.glucoseLevel;
}

export function getVitalValue(row: VitalSignRow, key: VitalMetricKey): number | null {
  switch (key) {
    case "heartRate":
      return row.heartRate;
    case "temperature":
      return parseVitalNumeric(row.temperature);
    case "respiratoryRate":
      return row.respiratoryRate;
    case "bloodPressureSystolic":
      return row.bloodPressureSystolic;
    case "bloodPressureDiastolic":
      return row.bloodPressureDiastolic;
    case "bloodPressure":
      return null;
    case "oxygenSaturation":
      return row.oxygenSaturation;
    case "glucoseLevel":
      return row.glucoseLevel;
    case "painScore":
      return row.painScore;
    case "weight":
      return parseVitalNumeric(row.weight);
    case "height":
      return parseVitalNumeric(row.height);
    case "bmi":
      return calculateBmi(parseVitalNumeric(row.weight), parseVitalNumeric(row.height));
    default: {
      const never: never = key;
      return never;
    }
  }
}

export function buildVitalChartData(rows: VitalSignRow[]): VitalChartPoint[] {
  return [...rows]
    .filter((r) => r.recordedAt)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((row) => {
      const timestamp = new Date(row.recordedAt).getTime();
      const point: VitalChartPoint = {
        recordedAt: row.recordedAt,
        label: format(new Date(row.recordedAt), "MMM d, yyyy"),
        timestamp,
      };
      for (const key of VITAL_STORAGE_KEYS) {
        point[key] = getVitalValue(row, key);
      }
      point.bmi = getVitalValue(row, "bmi");
      point.glucoseFbs = getGlucoseByContext(row, "fbs");
      point.glucoseRbs = getGlucoseByContext(row, "rbs");
      return point;
    });
}

export type VitalSeriesStats = {
  count: number;
  latest: number | null;
  latestAt: string | null;
  min: number | null;
  max: number | null;
  avg: number | null;
};

export function computeVitalStats(rows: VitalSignRow[], key: VitalMetricKey): VitalSeriesStats {
  const values: { v: number; at: string }[] = [];
  for (const row of rows) {
    const v = getVitalValue(row, key);
    if (v != null && row.recordedAt) values.push({ v, at: row.recordedAt });
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
}

export function computeGlucoseContextStats(rows: VitalSignRow[], context: GlucoseContext): VitalSeriesStats {
  const values: { v: number; at: string }[] = [];
  for (const row of rows) {
    const v = getGlucoseByContext(row, context);
    if (v != null && row.recordedAt) values.push({ v, at: row.recordedAt });
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
}

export type YAxisDomain = [number | "auto", number | "auto"];

export function getChartYAxisDomain(key: VitalMetricKey): YAxisDomain {
  switch (key) {
    case "oxygenSaturation":
      return [90, 100];
    case "painScore":
      return [0, 10];
    default:
      return ["auto", "auto"];
  }
}

export function formatVitalValue(key: VitalMetricKey, value: number | null, row?: VitalSignRow): string {
  if (value == null) return "—";
  if (key === "glucoseLevel") {
    return formatGlucoseDisplay(value, row?.glucoseContext);
  }
  const decimals =
    key === "temperature" || key === "weight" || key === "height" || key === "bmi" ? 1 : 0;
  const unit =
    key === "bmi"
      ? "kg/m²"
      : key === "bloodPressureSystolic" || key === "bloodPressureDiastolic" || key === "bloodPressure"
        ? "mmHg"
        : key === "heartRate"
          ? "bpm"
          : key === "respiratoryRate"
            ? "/min"
            : key === "oxygenSaturation"
              ? "%"
              : key === "painScore"
                ? "/10"
                : key === "temperature"
                  ? "°C"
                  : key === "weight"
                    ? "kg"
                    : key === "height"
                      ? "cm"
                      : "mmol/L";
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatGlucoseChartValue(value: number | null): string {
  if (value == null) return "—";
  return `${formatGlucoseMmol(value)} mmol/L`;
}

export function formatChartSeriesValue(dataKey: VitalChartDataKey, value: number | null): string {
  if (value == null) return "—";
  if (dataKey === "glucoseFbs" || dataKey === "glucoseRbs") {
    return formatGlucoseChartValue(value);
  }
  if (dataKey === "bmi") {
    return formatVitalValue("bmi", value);
  }
  return formatVitalValue(dataKey as VitalMetricKey, value);
}

export function formatBloodPressureReading(
  systolic: number | null,
  diastolic: number | null,
  map?: number | null,
): string {
  if (systolic == null && diastolic == null) return "—";
  const pair = `${systolic ?? "—"}/${diastolic ?? "—"} mmHg`;
  if (map != null) return `${pair} (MAP ${map})`;
  return pair;
}

export type MetricLatestSummary = {
  value: string;
  recordedAt: string | null;
};

export type MetricCardValue = {
  primary: string;
  unit: string;
  recordedAt: string | null;
};

export function formatMetricCardValue(metricKey: VitalMetricKey, rows: VitalSignRow[]): MetricCardValue {
  switch (metricKey) {
    case "bloodPressure": {
      const sorted = [...rows]
        .filter((r) => r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      const row = sorted[0];
      if (!row) return { primary: "—", unit: "mmHg", recordedAt: null };
      return {
        primary: `${row.bloodPressureSystolic ?? "—"} / ${row.bloodPressureDiastolic ?? "—"}`,
        unit: "mmHg",
        recordedAt: row.recordedAt,
      };
    }
    case "glucoseLevel": {
      const fbs = computeGlucoseContextStats(rows, "fbs");
      const rbs = computeGlucoseContextStats(rows, "rbs");
      if (fbs.latest != null) {
        return {
          primary: formatGlucoseMmol(fbs.latest),
          unit: "mmol/L FBS",
          recordedAt: fbs.latestAt,
        };
      }
      if (rbs.latest != null) {
        return {
          primary: formatGlucoseMmol(rbs.latest),
          unit: "mmol/L RBS",
          recordedAt: rbs.latestAt,
        };
      }
      return { primary: "—", unit: "mmol/L", recordedAt: null };
    }
    case "oxygenSaturation": {
      const stats = computeVitalStats(rows, "oxygenSaturation");
      return {
        primary: stats.latest != null ? String(stats.latest) : "—",
        unit: "% SpO₂",
        recordedAt: stats.latestAt,
      };
    }
    case "respiratoryRate": {
      const stats = computeVitalStats(rows, "respiratoryRate");
      return {
        primary: stats.latest != null ? String(stats.latest) : "—",
        unit: "breaths/min",
        recordedAt: stats.latestAt,
      };
    }
    case "bmi": {
      const stats = computeVitalStats(rows, "bmi");
      return {
        primary: stats.latest != null ? stats.latest.toFixed(1) : "—",
        unit: "kg/m²",
        recordedAt: stats.latestAt,
      };
    }
    default: {
      const stats = computeVitalStats(rows, metricKey);
      const decimals =
        metricKey === "temperature" || metricKey === "weight" || metricKey === "height" ? 1 : 0;
      return {
        primary: stats.latest != null ? stats.latest.toFixed(decimals) : "—",
        unit:
          metricKey === "heartRate"
            ? "bpm"
            : metricKey === "temperature"
              ? "°C"
              : metricKey === "weight"
                ? "kg"
                : metricKey === "height"
                  ? "cm"
                  : metricKey === "painScore"
                    ? "/10"
                    : "",
        recordedAt: stats.latestAt,
      };
    }
  }
}

export function formatMetricLatestSummary(metricKey: VitalMetricKey, rows: VitalSignRow[]): MetricLatestSummary {
  switch (metricKey) {
    case "bloodPressure": {
      const sorted = [...rows]
        .filter((r) => r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      const row = sorted[0];
      if (!row) return { value: "—", recordedAt: null };
      return {
        value: formatBloodPressureReading(row.bloodPressureSystolic, row.bloodPressureDiastolic),
        recordedAt: row.recordedAt,
      };
    }
    case "glucoseLevel": {
      const fbs = computeGlucoseContextStats(rows, "fbs");
      const rbs = computeGlucoseContextStats(rows, "rbs");
      const parts: string[] = [];
      if (fbs.latest != null) parts.push(`FBS ${formatGlucoseMmol(fbs.latest)}`);
      if (rbs.latest != null) parts.push(`RBS ${formatGlucoseMmol(rbs.latest)}`);
      const latestAt = [fbs.latestAt, rbs.latestAt]
        .filter((at): at is string => at != null)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
      return {
        value: parts.length > 0 ? `${parts.join(" · ")} mmol/L` : "—",
        recordedAt: latestAt,
      };
    }
    default: {
      const stats = computeVitalStats(rows, metricKey);
      return {
        value: formatVitalValue(metricKey, stats.latest),
        recordedAt: stats.latestAt,
      };
    }
  }
}

export function metricHasTrendData(
  metric: { key: VitalMetricKey; chartSeries?: { key: VitalChartDataKey }[] },
  chartData: VitalChartPoint[],
): boolean {
  const lines = metric.chartSeries?.length
    ? metric.chartSeries
    : metric.key === "bmi"
      ? [{ key: "bmi" as const }]
      : [{ key: metric.key as VitalChartDataKey }];
  return chartData.some((p) => lines.some((line) => p[line.key] != null));
}

export function formatMetricCellValue(key: VitalMetricKey, row: VitalSignRow): string {
  switch (key) {
    case "bloodPressure": {
      const s = row.bloodPressureSystolic;
      const d = row.bloodPressureDiastolic;
      if (s == null && d == null) return "—";
      return `${s ?? "—"}/${d ?? "—"}`;
    }
    case "bmi": {
      const v = getVitalValue(row, "bmi");
      return v != null ? v.toFixed(1) : "—";
    }
    case "glucoseLevel":
      return formatGlucoseDisplay(row.glucoseLevel, row.glucoseContext);
    case "temperature":
    case "weight":
    case "height": {
      const raw = key === "temperature" ? row.temperature : key === "weight" ? row.weight : row.height;
      return raw != null && raw !== "" ? String(raw) : "—";
    }
    default: {
      const v = getVitalValue(row, key);
      return v != null ? String(v) : "—";
    }
  }
}
