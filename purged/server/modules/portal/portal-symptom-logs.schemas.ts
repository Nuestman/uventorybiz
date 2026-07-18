import { z } from "zod";

export const portalSymptomLogCreateSchema = z
  .object({
    symptomTypeId: z.string().min(1),
    recordedAt: z.coerce.date().optional(),
    severity: z.number().int().min(1).max(5),
    bodyLocation: z.string().max(120).optional().nullable(),
    durationMinutes: z.number().int().min(1).max(60 * 24 * 30).optional().nullable(),
    symptomQuality: z.string().max(120).optional().nullable(),
    provocation: z.string().max(2000).optional().nullable(),
    palliation: z.string().max(2000).optional().nullable(),
    radiation: z.string().max(120).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  });

export const portalSymptomLogUpdateSchema = portalSymptomLogCreateSchema.partial();

export type PortalSymptomLogCreate = z.infer<typeof portalSymptomLogCreateSchema>;
export type PortalSymptomLogUpdate = z.infer<typeof portalSymptomLogUpdateSchema>;

export type PortalSymptomTypeDto = {
  id: string;
  code: string;
  label: string;
  category: string;
  sortOrder: number;
  isTenantSpecific: boolean;
};

export type PortalSymptomLogDto = {
  id: string;
  symptomTypeId: string;
  symptomCode: string;
  symptomLabel: string;
  recordedAt: Date;
  severity: number;
  bodyLocation: string | null;
  durationMinutes: number | null;
  symptomQuality: string | null;
  provocation: string | null;
  palliation: string | null;
  radiation: string | null;
  notes: string | null;
  source: string;
  createdAt: Date | null;
  canEdit: boolean;
};

export const adminSymptomTypeCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().min(1).max(120),
  category: z.string().min(1).max(64).default("general"),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const adminSymptomTypeUpdateSchema = adminSymptomTypeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
