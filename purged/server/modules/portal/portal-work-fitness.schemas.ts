import { z } from "zod";
import { WORK_FITNESS_CASE_TYPES } from "@shared/workFitness";

const portalMedicationFields = {
  medicationName: z.string().min(1, "Medication name is required").max(255),
  genericName: z.string().max(255).optional().nullable(),
  strength: z.string().max(120).optional().nullable(),
  dosageForm: z.string().max(120).optional().nullable(),
  route: z.string().max(120).optional().nullable(),
  frequency: z.string().max(255).optional().nullable(),
  prescribedFor: z.string().max(4000).optional().nullable(),
  prescriberName: z.string().max(255).optional().nullable(),
  prescriberFacility: z.string().max(255).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  expectedEndDate: z.coerce.date().optional().nullable(),
  isOngoing: z.boolean().optional(),
  employeeSideEffects: z.string().max(4000).optional().nullable(),
  employeeNoSideEffects: z.boolean().optional(),
  medicationImageUrl: z.string().max(2000).optional().nullable(),
};

const portalCaseFields = {
  caseType: z.enum(WORK_FITNESS_CASE_TYPES).optional(),
  contextNotes: z.string().max(4000).optional().nullable(),
  employeeFeelingNotes: z.string().max(4000).optional().nullable(),
  medications: z.array(z.object(portalMedicationFields)).min(1, "Add at least one medication"),
};

export const portalWorkFitnessCreateSchema = z.object(portalCaseFields);

export const portalWorkFitnessUpdateSchema = z
  .object(portalCaseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export type PortalWorkFitnessCreate = z.infer<typeof portalWorkFitnessCreateSchema>;
export type PortalWorkFitnessUpdate = z.infer<typeof portalWorkFitnessUpdateSchema>;
