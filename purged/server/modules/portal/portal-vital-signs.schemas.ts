import { z } from "zod";

function optionalNullableNumber(min: number, max: number) {
  return z
    .number({ invalid_type_error: "Must be a number" })
    .int()
    .min(min)
    .max(max)
    .optional()
    .nullable();
}

function optionalNullableFloat(min: number, max: number) {
  return z.number({ invalid_type_error: "Must be a number" }).min(min).max(max).optional().nullable();
}

export const portalVitalSignCreateSchema = z
  .object({
    recordedAt: z.coerce.date().optional(),
    bloodPressureSystolic: optionalNullableNumber(40, 300),
    bloodPressureDiastolic: optionalNullableNumber(20, 200),
    heartRate: optionalNullableNumber(20, 250),
    temperature: z.string().max(20).optional().nullable(),
    respiratoryRate: optionalNullableNumber(4, 80),
    oxygenSaturation: optionalNullableNumber(50, 100),
    glucoseLevel: optionalNullableFloat(1, 50),
    glucoseContext: z.enum(["fbs", "rbs"]).optional().nullable(),
    painScore: optionalNullableNumber(0, 10),
    weight: z.string().max(20).optional().nullable(),
    height: z.string().max(20).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (data) =>
      data.bloodPressureSystolic != null ||
      data.bloodPressureDiastolic != null ||
      data.heartRate != null ||
      (data.temperature != null && data.temperature.trim() !== "") ||
      data.respiratoryRate != null ||
      data.oxygenSaturation != null ||
      data.glucoseLevel != null ||
      data.painScore != null ||
      (data.weight != null && data.weight.trim() !== "") ||
      (data.height != null && data.height.trim() !== "") ||
      (data.notes != null && data.notes.trim() !== ""),
    { message: "Enter at least one measurement or note" },
  );

export type PortalVitalSignCreate = z.infer<typeof portalVitalSignCreateSchema>;

export type PortalVitalSignDto = {
  id: string;
  recordedAt: Date | string;
  source: string;
  heartRate: number | null;
  temperature: string | null;
  respiratoryRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  oxygenSaturation: number | null;
  glucoseLevel: number | null;
  glucoseContext: "fbs" | "rbs" | null;
  painScore: number | null;
  weight: string | null;
  height: string | null;
  notes: string | null;
};
