import { z } from "zod";

export const glucoseContextSchema = z.enum(["fbs", "rbs"]);
export type GlucoseContext = z.infer<typeof glucoseContextSchema>;

export const GLUCOSE_CONTEXT_OPTIONS = [
  { value: "fbs" as const, label: "Fasting (FBS)", short: "FBS", hint: "No food for ~8 hours before the test" },
  { value: "rbs" as const, label: "Random (RBS)", short: "RBS", hint: "Taken without fasting requirement" },
];

export function parseGlucoseLevelInput(raw: string | null | undefined): number | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function formatGlucoseMmol(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

export function glucoseContextShort(context: GlucoseContext | null | undefined): string | null {
  if (!context) return null;
  return GLUCOSE_CONTEXT_OPTIONS.find((o) => o.value === context)?.short ?? null;
}

export function formatGlucoseDisplay(
  value: number | null | undefined,
  context?: GlucoseContext | null,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const base = `${formatGlucoseMmol(value)} mmol/L`;
  const short = glucoseContextShort(context ?? null);
  return short ? `${base} (${short})` : base;
}

/** Convert mg/dL (common US / FHIR LOINC 2339-0) to mmol/L stored in uventorybiz. */
export function mgDlToMmolL(mgDl: number): number {
  return Math.round((mgDl / 18) * 10) / 10;
}

export function mmolLToMgDl(mmol: number): number {
  return Math.round(mmol * 18);
}

export function isGlucoseContext(value: string | null | undefined): value is GlucoseContext {
  return value === "fbs" || value === "rbs";
}
