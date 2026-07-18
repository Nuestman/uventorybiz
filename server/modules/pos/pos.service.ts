import { db } from "../../config/db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PaymentInput, SaleLineInput } from "./pos.schemas";
import type { PosPaymentMethod, PosSaleStatus } from "./pos.types";
import * as repo from "./pos.repository";

export type PosResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

function computeLine(line: SaleLineInput, defaultTaxRate: number) {
  const taxRate = line.taxRate ?? defaultTaxRate;
  const sub = line.quantity * line.unitPrice;
  const taxAmount = sub * taxRate;
  const lineTotal = sub + taxAmount;
  return {
    inventoryItemId: line.inventoryItemId,
    quantity: line.quantity,
    unitPrice: repo.money(line.unitPrice),
    taxRate,
    taxAmount: repo.money(taxAmount),
    lineTotal: repo.money(lineTotal),
    barcodeSnapshot: line.barcodeSnapshot ?? null,
  };
}

function computeTotals(lines: ReturnType<typeof computeLine>[]) {
  const subtotal = lines.reduce((s, l) => s + repo.parseMoney(l.unitPrice) * l.quantity, 0);
  const taxTotal = lines.reduce((s, l) => s + repo.parseMoney(l.taxAmount), 0);
  return {
    subtotal: repo.money(subtotal),
    taxTotal: repo.money(taxTotal),
    total: repo.money(subtotal + taxTotal),
  };
}

async function getTenantCurrency(tenantId: string): Promise<string> {
  const [row] = await db.select({ currencyCode: tenants.currencyCode }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.currencyCode ?? "GHS";
}

async function isReturnsEnabled(tenantId: string): Promise<boolean> {
  const [row] = await db.select({ returnsEnabled: tenants.returnsEnabled }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.returnsEnabled !== false;
}

export function createPosService() {
  return {
    async listRegisters(tenantId: string, locationId?: string) {
      const rows = await repo.listRegisters(tenantId, locationId);
      return { ok: true as const, data: rows.map((r) => ({ ...r.register, locationName: r.locationName })) };
    },

    async getRegister(id: string, tenantId: string): Promise<PosResult<Awaited<ReturnType<typeof repo.getRegisterById>>>> {
      const row = await repo.getRegisterById(id, tenantId);
      if (!row) return { ok: false, error: "Register not found", code: "NOT_FOUND" };
      return { ok: true, data: row };
    },

    async createRegister(tenantId: string, data: { locationId: string; name: string; isActive?: boolean }) {
      const row = await repo.createRegister(tenantId, data);
      return { ok: true as const, data: row };
    },

    async openShift(tenantId: string, userId: string, input: { registerId: string; openingFloat: number; notes?: string }) {
      const register = await repo.getRegisterById(input.registerId, tenantId);
      if (!register) return { ok: false as const, error: "Register not found", code: "NOT_FOUND" };
      const existing = await repo.getOpenShiftForRegister(input.registerId, tenantId);
      if (existing) return { ok: false as const, error: "Register already has an open shift", code: "CONFLICT" };
      const shift = await repo.createShift(tenantId, {
        registerId: input.registerId,
        openedByUserId: userId,
        openingFloat: repo.money(input.openingFloat),
        notes: input.notes,
      });
      return { ok: true as const, data: shift };
    },

    async closeShift(tenantId: string, userId: string, shiftId: string, input: { closingFloat: number; notes?: string }) {
      const shift = await repo.getShiftById(shiftId, tenantId);
      if (!shift) return { ok: false as const, error: "Shift not found", code: "NOT_FOUND" };
      if (shift.status !== "open") return { ok: false as const, error: "Shift is already closed", code: "CONFLICT" };
      const updated = await repo.closeShift(shiftId, tenantId, {
        closedByUserId: userId,
        closingFloat: repo.money(input.closingFloat),
        notes: input.notes,
      });
      return { ok: true as const, data: updated };
    },

    async getCurrentShift(tenantId: string, registerId: string) {
      const shift = await repo.getOpenShiftForRegister(registerId, tenantId);
      return { ok: true as const, data: shift ?? null };
    },

    async createDraftSale(
      tenantId: string,
      userId: string,
      input: { registerId: string; shiftId: string; customerId?: string | null; notes?: string },
    ) {
      const register = await repo.getRegisterById(input.registerId, tenantId);
      if (!register) return { ok: false as const, error: "Register not found", code: "NOT_FOUND" };
      const shift = await repo.getShiftById(input.shiftId, tenantId);
      if (!shift || shift.status !== "open") return { ok: false as const, error: "Open shift required", code: "CONFLICT" };
      if (shift.registerId !== input.registerId) return { ok: false as const, error: "Shift does not belong to register", code: "VALIDATION" };
      const currencyCode = await getTenantCurrency(tenantId);
      const sale = await repo.createSale(tenantId, {
        registerId: input.registerId,
        shiftId: input.shiftId,
        locationId: register.register.locationId,
        cashierUserId: userId,
        customerId: input.customerId,
        currencyCode,
        notes: input.notes,
      });
      return { ok: true as const, data: sale };
    },

    async updateSaleLines(tenantId: string, saleId: string, input: { lines: SaleLineInput[]; notes?: string }) {
      const detail = await repo.getSaleById(saleId, tenantId);
      if (!detail) return { ok: false as const, error: "Sale not found", code: "NOT_FOUND" };
      if (detail.sale.status !== "draft") return { ok: false as const, error: "Only draft sales can be edited", code: "CONFLICT" };
      const defaultTaxRate = await repo.getTenantDefaultTaxRate(tenantId);
      const computed = input.lines.map((l) => computeLine(l, defaultTaxRate));
      const totals = computeTotals(computed);
      await repo.replaceSaleLines(tenantId, saleId, computed);
      const sale = await repo.updateSaleTotals(saleId, tenantId, { ...totals, notes: input.notes });
      const refreshed = await repo.getSaleById(saleId, tenantId);
      return { ok: true as const, data: refreshed ?? { sale, lines: computed, payments: [], register: detail.register, location: detail.location } };
    },

    async completeSale(tenantId: string, userId: string, saleId: string, payments: PaymentInput[]) {
      const detail = await repo.getSaleById(saleId, tenantId);
      if (!detail) return { ok: false as const, error: "Sale not found", code: "NOT_FOUND" };
      if (detail.sale.status !== "draft") return { ok: false as const, error: "Sale is not a draft", code: "CONFLICT" };
      if (!detail.lines.length) return { ok: false as const, error: "Sale has no line items", code: "VALIDATION" };

      const saleTotal = repo.parseMoney(detail.sale.total);
      const paid = payments.reduce((s, p) => s + p.amount, 0);
      if (paid + 0.001 < saleTotal) {
        return { ok: false as const, error: `Payment total (${repo.money(paid)}) is less than sale total (${detail.sale.total})`, code: "VALIDATION" };
      }

      const receiptNumber = await repo.nextReceiptNumber(tenantId);
      const paymentRows = payments.map((p) => ({ method: p.method as PosPaymentMethod, amount: repo.money(p.amount) }));

      try {
        await repo.finalizeSaleWithStock(
          tenantId,
          saleId,
          receiptNumber,
          paymentRows,
          detail.lines.map((l) => ({ inventoryItemId: l.line.inventoryItemId, quantity: l.line.quantity, direction: "out" as const })),
          { userId, locationId: detail.sale.locationId, documentType: "pos_sale", reason: "POS sale" },
        );
      } catch (err) {
        if (err instanceof repo.PosStockError) {
          return { ok: false as const, error: err.message, code: "VALIDATION" };
        }
        throw err;
      }

      const refreshed = await repo.getSaleById(saleId, tenantId);
      return { ok: true as const, data: refreshed };
    },

    async voidSale(tenantId: string, saleId: string) {
      const detail = await repo.getSaleById(saleId, tenantId);
      if (!detail) return { ok: false as const, error: "Sale not found", code: "NOT_FOUND" };
      if (detail.sale.status !== "draft") return { ok: false as const, error: "Only draft sales can be voided", code: "CONFLICT" };
      const sale = await repo.voidSaleRecord(saleId, tenantId);
      return { ok: true as const, data: sale };
    },

    async returnSale(
      tenantId: string,
      userId: string,
      originalSaleId: string,
      input: { lines: Array<{ inventoryItemId: string; quantity: number }>; reason?: string; payments?: PaymentInput[] },
    ) {
      if (!(await isReturnsEnabled(tenantId))) {
        return { ok: false as const, error: "Returns/refunds are disabled in your business settings", code: "CONFLICT" };
      }
      const original = await repo.getSaleById(originalSaleId, tenantId);
      if (!original) return { ok: false as const, error: "Original sale not found", code: "NOT_FOUND" };
      if (original.sale.status !== "completed") return { ok: false as const, error: "Can only return completed sales", code: "CONFLICT" };

      const alreadyReturned = await repo.getReturnedQuantitiesForSale(tenantId, originalSaleId);
      for (const retLine of input.lines) {
        const origLine = original.lines.find((l) => l.line.inventoryItemId === retLine.inventoryItemId);
        if (!origLine) return { ok: false as const, error: "Item was not on original sale", code: "VALIDATION" };
        const remaining = origLine.line.quantity - (alreadyReturned.get(retLine.inventoryItemId) ?? 0);
        if (retLine.quantity > remaining) {
          return {
            ok: false as const,
            error: `Return quantity for ${origLine.itemName} exceeds remaining returnable quantity (${Math.max(remaining, 0)})`,
            code: "VALIDATION",
          };
        }
      }

      const defaultTaxRate = await repo.getTenantDefaultTaxRate(tenantId);
      const returnLineInputs: SaleLineInput[] = input.lines.map((l) => {
        const orig = original.lines.find((o) => o.line.inventoryItemId === l.inventoryItemId)!;
        return {
          inventoryItemId: l.inventoryItemId,
          quantity: l.quantity,
          unitPrice: repo.parseMoney(orig.line.unitPrice),
          taxRate: orig.line.taxRate ?? defaultTaxRate,
        };
      });
      const computed = returnLineInputs.map((l) => computeLine(l, defaultTaxRate));
      const totals = computeTotals(computed);

      const currencyCode = await getTenantCurrency(tenantId);
      const returnSale = await repo.createSale(tenantId, {
        registerId: original.sale.registerId,
        shiftId: original.sale.shiftId,
        locationId: original.sale.locationId,
        cashierUserId: userId,
        customerId: original.sale.customerId,
        currencyCode,
        notes: input.reason ? `Return: ${input.reason}` : "Return",
      });
      await repo.replaceSaleLines(tenantId, returnSale.id, computed);
      await repo.updateSaleTotals(returnSale.id, tenantId, totals);

      const receiptNumber = await repo.nextReceiptNumber(tenantId);
      const payments = (input.payments ?? [{ method: "cash" as const, amount: repo.parseMoney(totals.total) }]).map((p) => ({
        method: p.method as PosPaymentMethod,
        amount: repo.money(p.amount),
      }));

      try {
        await repo.finalizeSaleWithStock(
          tenantId,
          returnSale.id,
          receiptNumber,
          payments,
          computed.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: l.quantity, direction: "in" as const })),
          { userId, locationId: original.sale.locationId, documentType: "pos_return", reason: input.reason ?? "POS return" },
          "returned",
        );
      } catch (err) {
        await repo.voidSaleRecord(returnSale.id, tenantId);
        if (err instanceof repo.PosStockError) {
          return { ok: false as const, error: err.message, code: "VALIDATION" };
        }
        throw err;
      }

      await repo.createReturnRecord(tenantId, {
        originalSaleId,
        saleId: returnSale.id,
        reason: input.reason,
        createdByUserId: userId,
      });

      const refreshed = await repo.getSaleById(returnSale.id, tenantId);
      return { ok: true as const, data: refreshed };
    },

    /** Paginated sales history for the /sales page. */
    async listSales(
      tenantId: string,
      input: { page?: number; pageSize?: number; status?: string; search?: string },
    ) {
      const page = Math.max(1, Math.floor(input.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize ?? 20)));
      const validStatuses: PosSaleStatus[] = ["draft", "completed", "voided", "returned"];
      const status = validStatuses.find((s) => s === input.status);
      const { rows, total } = await repo.listSales(tenantId, {
        page,
        pageSize,
        status,
        search: input.search,
      });
      return { ok: true as const, data: { rows, total, page, pageSize } };
    },

    async getSaleReceipt(tenantId: string, saleId: string) {
      const detail = await repo.getSaleById(saleId, tenantId);
      if (!detail) return { ok: false as const, error: "Sale not found", code: "NOT_FOUND" };
      return { ok: true as const, data: detail };
    },

    /** Look up a sale by receipt number, including how much of each line is still returnable. */
    async lookupSaleByReceipt(tenantId: string, receiptNumber: string) {
      const sale = await repo.findSaleByReceiptNumber(tenantId, receiptNumber.trim());
      if (!sale) return { ok: false as const, error: "No sale found with that receipt number", code: "NOT_FOUND" };
      const detail = await repo.getSaleById(sale.id, tenantId);
      if (!detail) return { ok: false as const, error: "Sale not found", code: "NOT_FOUND" };
      const alreadyReturned = await repo.getReturnedQuantitiesForSale(tenantId, sale.id);
      const returnedQuantities: Record<string, number> = {};
      for (const [itemId, qty] of alreadyReturned) returnedQuantities[itemId] = qty;
      return { ok: true as const, data: { ...detail, returnedQuantities } };
    },

    async searchItems(tenantId: string, locationId: string, query: string) {
      const rows = await repo.searchInventoryItems(tenantId, locationId, query);
      return { ok: true as const, data: rows };
    },

    async lookupBarcode(tenantId: string, locationId: string, barcode: string) {
      const row = await repo.findItemByBarcode(tenantId, locationId, barcode);
      if (!row) return { ok: false as const, error: "Item not found", code: "NOT_FOUND" };
      return { ok: true as const, data: row };
    },

    async dailyReport(tenantId: string, date: string, registerId?: string) {
      const report = await repo.getDailySalesReport(tenantId, date, registerId);
      return { ok: true as const, data: report };
    },
  };
}

export type PosService = ReturnType<typeof createPosService>;
