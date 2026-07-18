import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Droplet,
  Gauge,
  HeartPulse,
  Ruler,
  Scale,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { VitalMetricKey } from "./vitalsConfig";

const VITAL_METRIC_ICONS: Record<VitalMetricKey, LucideIcon> = {
  heartRate: HeartPulse,
  temperature: Thermometer,
  respiratoryRate: Wind,
  bloodPressure: Gauge,
  bloodPressureSystolic: Gauge,
  bloodPressureDiastolic: Gauge,
  oxygenSaturation: Waves,
  glucoseLevel: Droplet,
  painScore: Zap,
  weight: Scale,
  height: Ruler,
  bmi: Calculator,
};

export function getVitalMetricIcon(key: VitalMetricKey): LucideIcon {
  return VITAL_METRIC_ICONS[key];
}
