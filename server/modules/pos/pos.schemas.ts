import { z } from "zod";
import { insertPosRegisterSchema } from "@shared/schema";

export const openShiftSchema = z.object({
  registerId: z.string().uuid(),
  openingFloat: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const closeShiftSchema = z.object({
  closingFloat: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export const createSaleSchema = z.object({
  registerId: z.string().uuid(),
  shiftId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export const saleLineInputSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).optional(),
  barcodeSnapshot: z.string().optional().nullable(),
});

export const updateSaleSchema = z.object({
  lines: z.array(saleLineInputSchema).min(1),
  notes: z.string().optional(),
});

export const paymentInputSchema = z.object({
  method: z.enum(["cash", "card", "mobile_money", "credit", "other"]),
  amount: z.coerce.number().positive(),
});

export const completeSaleSchema = z.object({
  payments: z.array(paymentInputSchema).min(1),
});

export const returnSaleSchema = z.object({
  lines: z.array(
    z.object({
      inventoryItemId: z.string().uuid(),
      quantity: z.coerce.number().int().positive(),
    }),
  ).min(1),
  reason: z.string().optional(),
  payments: z.array(paymentInputSchema).optional(),
});

export const createRegisterSchema = insertPosRegisterSchema;

export type SaleLineInput = z.infer<typeof saleLineInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
