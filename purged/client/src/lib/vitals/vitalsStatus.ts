import type { VitalMetricKey, VitalSignRow } from "./vitalsConfig";
import { computeGlucoseContextStats, getVitalValue } from "./vitalsTrends";

export type VitalStatusLabel = "normal" | "review" | null;

function latestRowWith(
  rows: VitalSignRow[],
  hasValue: (row: VitalSignRow) => boolean,
): VitalSignRow | null {
  const sorted = [...rows]
    .filter((r) => hasValue(r) && r.recordedAt)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  return sorted[0] ?? null;
}

export function getVitalStatusLabel(metricKey: VitalMetricKey, rows: VitalSignRow[]): VitalStatusLabel {
  switch (metricKey) {
    case "heartRate": {
      const row = latestRowWith(rows, (r) => r.heartRate != null);
      if (!row?.heartRate) return null;
      return row.heartRate >= 60 && row.heartRate <= 100 ? "normal" : "review";
    }
    case "temperature": {
      const row = latestRowWith(rows, (r) => r.temperature != null && r.temperature !== "");
      const v = row ? Number.parseFloat(String(row.temperature)) : NaN;
      if (!Number.isFinite(v)) return null;
      return v >= 36.1 && v <= 37.2 ? "normal" : "review";
    }
    case "respiratoryRate": {
      const row = latestRowWith(rows, (r) => r.respiratoryRate != null);
      if (!row?.respiratoryRate) return null;
      return row.respiratoryRate >= 12 && row.respiratoryRate <= 20 ? "normal" : "review";
    }
    case "bloodPressure": {
      const row = latestRowWith(
        rows,
        (r) => r.bloodPressureSystolic != null || r.bloodPressureDiastolic != null,
      );
      if (!row) return null;
      const sys = row.bloodPressureSystolic;
      const dia = row.bloodPressureDiastolic;
      if (sys == null && dia == null) return null;
      const sysOk = sys == null || sys < 120;
      const diaOk = dia == null || dia < 80;
      return sysOk && diaOk ? "normal" : "review";
    }
    case "oxygenSaturation": {
      const row = latestRowWith(rows, (r) => r.oxygenSaturation != null);
      if (!row?.oxygenSaturation) return null;
      return row.oxygenSaturation >= 95 && row.oxygenSaturation <= 100 ? "normal" : "review";
    }
    case "glucoseLevel": {
      const fbs = computeGlucoseContextStats(rows, "fbs");
      if (fbs.latest != null) {
        return fbs.latest >= 3.9 && fbs.latest <= 5.5 ? "normal" : "review";
      }
      const rbs = computeGlucoseContextStats(rows, "rbs");
      if (rbs.latest != null) return "review";
      return null;
    }
    case "painScore": {
      const row = latestRowWith(rows, (r) => r.painScore != null);
      if (row?.painScore == null) return null;
      return row.painScore <= 3 ? "normal" : "review";
    }
    case "bmi": {
      const row = latestRowWith(rows, (r) => getVitalValue(r, "bmi") != null);
      const bmi = row ? getVitalValue(row, "bmi") : null;
      if (bmi == null) return null;
      return bmi >= 18.5 && bmi <= 24.9 ? "normal" : "review";
    }
    case "weight":
    case "height":
      return latestRowWith(rows, (r) => getVitalValue(r, metricKey) != null) ? "normal" : null;
    default:
      return null;
  }
}

export function vitalStatusBadgeText(status: VitalStatusLabel): string | null {
  if (status === "normal") return "Normal";
  if (status === "review") return "Review";
  return null;
}
