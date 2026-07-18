import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlucoseInputFields } from "@/components/vitals/GlucoseInputFields";
import type { GlucoseContext } from "@shared/glucose";

export type VitalSignEntryFormValues = {
  recordedAt: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  glucoseLevel: string;
  glucoseContext: GlucoseContext | "";
  painScore: string;
  weight: string;
  height: string;
  notes: string;
};

export function emptyVitalSignEntryForm(): VitalSignEntryFormValues {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    recordedAt: local,
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    glucoseLevel: "",
    glucoseContext: "",
    painScore: "",
    weight: "",
    height: "",
    notes: "",
  };
}

function parseOptionalInt(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalFloat(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

export function buildVitalSignEntryPayload(values: VitalSignEntryFormValues) {
  return {
    recordedAt: values.recordedAt ? new Date(values.recordedAt).toISOString() : new Date().toISOString(),
    bloodPressureSystolic: parseOptionalInt(values.bloodPressureSystolic),
    bloodPressureDiastolic: parseOptionalInt(values.bloodPressureDiastolic),
    heartRate: parseOptionalInt(values.heartRate),
    temperature: values.temperature.trim() || null,
    respiratoryRate: parseOptionalInt(values.respiratoryRate),
    oxygenSaturation: parseOptionalInt(values.oxygenSaturation),
    glucoseLevel: parseOptionalFloat(values.glucoseLevel),
    glucoseContext: values.glucoseContext || null,
    painScore: parseOptionalInt(values.painScore),
    weight: values.weight.trim() || null,
    height: values.height.trim() || null,
    notes: values.notes.trim() || null,
  };
}

export function vitalSignEntryHasReading(values: VitalSignEntryFormValues): boolean {
  const payload = buildVitalSignEntryPayload(values);
  return (
    payload.bloodPressureSystolic != null ||
    payload.bloodPressureDiastolic != null ||
    payload.heartRate != null ||
    payload.temperature != null ||
    payload.respiratoryRate != null ||
    payload.oxygenSaturation != null ||
    payload.glucoseLevel != null ||
    payload.painScore != null ||
    payload.weight != null ||
    payload.height != null ||
    payload.notes != null
  );
}

export function VitalSignEntryFormFields({
  values,
  onChange,
}: {
  values: VitalSignEntryFormValues;
  onChange: Dispatch<SetStateAction<VitalSignEntryFormValues>>;
}) {
  const patch = (p: Partial<VitalSignEntryFormValues>) => onChange((v) => ({ ...v, ...p }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="vital-recorded-at">When were these readings taken?</Label>
        <Input
          id="vital-recorded-at"
          type="datetime-local"
          value={values.recordedAt}
          onChange={(e) => patch({ recordedAt: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Blood pressure (sys / dia mmHg)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="120"
              value={values.bloodPressureSystolic}
              onChange={(e) => patch({ bloodPressureSystolic: e.target.value })}
            />
            <Input
              type="number"
              placeholder="80"
              value={values.bloodPressureDiastolic}
              onChange={(e) => patch({ bloodPressureDiastolic: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-hr">Heart rate (bpm)</Label>
          <Input
            id="vital-hr"
            type="number"
            value={values.heartRate}
            onChange={(e) => patch({ heartRate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-temp">Temperature (°C)</Label>
          <Input
            id="vital-temp"
            value={values.temperature}
            onChange={(e) => patch({ temperature: e.target.value })}
            placeholder="e.g. 36.8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-rr">Resp. Rate (/min)</Label>
          <Input
            id="vital-rr"
            type="number"
            value={values.respiratoryRate}
            onChange={(e) => patch({ respiratoryRate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-spo2">SpO₂ (%)</Label>
          <Input
            id="vital-spo2"
            type="number"
            value={values.oxygenSaturation}
            onChange={(e) => patch({ oxygenSaturation: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <GlucoseInputFields
            compact
            levelValue={values.glucoseLevel}
            contextValue={values.glucoseContext}
            onLevelChange={(v) => patch({ glucoseLevel: v == null ? "" : String(v) })}
            onContextChange={(v) => patch({ glucoseContext: v })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-pain">Pain score (0–10)</Label>
          <Input
            id="vital-pain"
            type="number"
            min={0}
            max={10}
            value={values.painScore}
            onChange={(e) => patch({ painScore: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-weight">Weight (kg)</Label>
          <Input
            id="vital-weight"
            value={values.weight}
            onChange={(e) => patch({ weight: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vital-height">Height (cm)</Label>
          <Input
            id="vital-height"
            value={values.height}
            onChange={(e) => patch({ height: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="vital-notes">Notes (optional)</Label>
        <Textarea
          id="vital-notes"
          rows={2}
          value={values.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="How you were feeling, device used, fasting before glucose, etc."
        />
      </div>
    </div>
  );
}
