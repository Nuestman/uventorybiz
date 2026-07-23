/**
 * Convert portal customer orders into POS sales + stock movements.
 * Deducts at ready_for_pickup / out_for_delivery; reverses or returns on exception resolve.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { portalOrderItems, portalOrders, posSales, tenants } from "@shared/schema";
import * as posRepo from "../pos/pos.repository";
import type { PosPaymentMethod } from "../pos/pos.types";

const PORTAL_REGISTER_NAME = "Online / Portal";

async function getTenantCurrency(tenantId: string): Promise<string> {
  const [row] = await db
    .select({ currencyCode: tenants.currencyCode })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return row?.currencyCode || "GHS";
}

/** Ensure a portal register + open shift at the fulfillment location. */
export async function ensurePortalPosContext(params: {
  tenantId: string;
  locationId: string;
  openedByUserId: string;
}) {
  const registers = await posRepo.listRegisters(params.tenantId, params.locationId);
  let register = registers.find((r) => r.register.name === PORTAL_REGISTER_NAME)?.register;
  if (!register) {
    register = await posRepo.createRegister(params.tenantId, {
      locationId: params.locationId,
      name: PORTAL_REGISTER_NAME,
      isActive: true,
    });
  }
  let shift = await posRepo.getOpenShiftForRegister(register.id, params.tenantId);
  if (!shift) {
    shift = await posRepo.createShift(params.tenantId, {
      registerId: register.id,
      openedByUserId: params.openedByUserId,
      openingFloat: "0.00",
      notes: "System shift for portal / online orders",
    });
  }
  return { register, shift };
}

export async function findCompletedSaleForPortalOrder(tenantId: string, portalOrderId: string) {
  const [row] = await db
    .select()
    .from(posSales)
    .where(
      and(
        eq(posSales.tenantId, tenantId),
        eq(posSales.portalOrderId, portalOrderId),
        eq(posSales.status, "completed"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Create and finalize a POS sale from a portal order (idempotent if a completed sale already exists).
 */
export async function createSaleFromPortalOrder(params: {
  tenantId: string;
  orderId: string;
  cashierUserId: string;
}): Promise<{ ok: true; saleId: string; created: boolean } | { ok: false; error: string }> {
  const existing = await findCompletedSaleForPortalOrder(params.tenantId, params.orderId);
  if (existing) return { ok: true, saleId: existing.id, created: false };

  const [order] = await db
    .select()
    .from(portalOrders)
    .where(and(eq(portalOrders.id, params.orderId), eq(portalOrders.tenantId, params.tenantId)))
    .limit(1);
  if (!order) return { ok: false, error: "Portal order not found" };
  if (!order.locationId) return { ok: false, error: "Portal order has no fulfillment location" };

  const items = await db
    .select()
    .from(portalOrderItems)
    .where(and(eq(portalOrderItems.orderId, params.orderId), eq(portalOrderItems.tenantId, params.tenantId)));
  if (items.length === 0) return { ok: false, error: "Portal order has no line items" };
  if (items.some((item) => !item.itemId)) {
    return { ok: false, error: "Portal order has a line without a catalog item" };
  }

  const { register, shift } = await ensurePortalPosContext({
    tenantId: params.tenantId,
    locationId: order.locationId,
    openedByUserId: params.cashierUserId,
  });

  const currencyCode = await getTenantCurrency(params.tenantId);
  const defaultTaxRate = await posRepo.getTenantDefaultTaxRate(params.tenantId);

  let subtotal = 0;
  let taxTotal = 0;
  const lines = items.map((item) => {
    const inventoryItemId = item.itemId as string;
    const unitPrice = posRepo.parseMoney(item.unitPrice);
    const lineSub = unitPrice * item.quantity;
    const taxAmount = lineSub * (defaultTaxRate / 100);
    const lineTotal = lineSub + taxAmount;
    subtotal += lineSub;
    taxTotal += taxAmount;
    return {
      inventoryItemId,
      quantity: item.quantity,
      unitPrice: posRepo.money(unitPrice),
      taxRate: defaultTaxRate,
      taxAmount: posRepo.money(taxAmount),
      lineTotal: posRepo.money(lineTotal),
      barcodeSnapshot: item.itemCodeSnapshot,
    };
  });
  const total = subtotal + taxTotal;

  const sale = await posRepo.createSale(params.tenantId, {
    registerId: register.id,
    shiftId: shift.id,
    locationId: order.locationId,
    cashierUserId: params.cashierUserId,
    customerId: order.customerId,
    portalOrderId: order.id,
    currencyCode,
    notes: `Portal order ${order.orderNumber}`,
  });
  await posRepo.replaceSaleLines(params.tenantId, sale.id, lines);
  await posRepo.updateSaleTotals(sale.id, params.tenantId, {
    subtotal: posRepo.money(subtotal),
    taxTotal: posRepo.money(taxTotal),
    total: posRepo.money(total),
  });

  const receiptNumber = await posRepo.nextReceiptNumber(params.tenantId);
  const payments: Array<{ method: PosPaymentMethod; amount: string }> = [
    { method: "other", amount: posRepo.money(total) },
  ];

  try {
    await posRepo.finalizeSaleWithStock(
      params.tenantId,
      sale.id,
      receiptNumber,
      payments,
      lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        quantity: l.quantity,
        direction: "out" as const,
      })),
      {
        userId: params.cashierUserId,
        locationId: order.locationId,
        documentType: "portal_order",
        reason: `Portal order ${order.orderNumber}`,
      },
      "completed",
    );
  } catch (err) {
    await posRepo.voidSaleRecord(sale.id, params.tenantId);
    if (err instanceof posRepo.PosStockError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  return { ok: true, saleId: sale.id, created: true };
}

/** Void the portal sale and put stock back (investigation resolve: restock). */
export async function reversePortalOrderSale(params: {
  tenantId: string;
  orderId: string;
  userId: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sale = await findCompletedSaleForPortalOrder(params.tenantId, params.orderId);
  if (!sale) return { ok: true }; // nothing to reverse

  const detail = await posRepo.getSaleById(sale.id, params.tenantId);
  if (!detail) return { ok: false, error: "Linked sale not found" };

  const receiptNumber = await posRepo.nextReceiptNumber(params.tenantId);
  const reverseSale = await posRepo.createSale(params.tenantId, {
    registerId: sale.registerId,
    shiftId: sale.shiftId,
    locationId: sale.locationId,
    cashierUserId: params.userId,
    customerId: sale.customerId,
    currencyCode: sale.currencyCode,
    notes: params.reason
      ? `Portal order reverse: ${params.reason}`
      : "Portal order reverse (not received / restock)",
  });

  const lines = detail.lines.map((l) => ({
    inventoryItemId: l.line.inventoryItemId,
    quantity: l.line.quantity,
    unitPrice: l.line.unitPrice,
    taxRate: l.line.taxRate ?? 0,
    taxAmount: l.line.taxAmount,
    lineTotal: l.line.lineTotal,
    barcodeSnapshot: l.line.barcodeSnapshot,
  }));
  await posRepo.replaceSaleLines(params.tenantId, reverseSale.id, lines);
  await posRepo.updateSaleTotals(reverseSale.id, params.tenantId, {
    subtotal: detail.sale.subtotal,
    taxTotal: detail.sale.taxTotal,
    total: detail.sale.total,
  });

  try {
    await posRepo.finalizeSaleWithStock(
      params.tenantId,
      reverseSale.id,
      receiptNumber,
      [{ method: "other", amount: detail.sale.total }],
      lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        quantity: l.quantity,
        direction: "in" as const,
      })),
      {
        userId: params.userId,
        locationId: sale.locationId,
        documentType: "portal_order_reverse",
        reason: params.reason ?? "Portal order restock",
      },
      "voided",
    );
  } catch (err) {
    await posRepo.voidSaleRecord(reverseSale.id, params.tenantId);
    if (err instanceof posRepo.PosStockError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  // Clear link on original so a re-dispatch can create a new completed sale
  await db
    .update(posSales)
    .set({ status: "voided", voidedAt: new Date(), portalOrderId: null, updatedAt: new Date() })
    .where(and(eq(posSales.id, sale.id), eq(posSales.tenantId, params.tenantId)));

  return { ok: true };
}

/** Full return of portal order sale (customer return approved). */
export async function returnPortalOrderSale(params: {
  tenantId: string;
  orderId: string;
  userId: string;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sale = await findCompletedSaleForPortalOrder(params.tenantId, params.orderId);
  if (!sale) return { ok: true }; // nothing left to return (idempotent)

  const alreadyReturned = await posRepo.getReturnedQuantitiesForSale(params.tenantId, sale.id);
  const detail = await posRepo.getSaleById(sale.id, params.tenantId);
  if (!detail) return { ok: false, error: "Linked sale not found" };

  const remainingLines = detail.lines
    .map((l) => ({
      inventoryItemId: l.line.inventoryItemId,
      quantity: l.line.quantity - (alreadyReturned.get(l.line.inventoryItemId) ?? 0),
    }))
    .filter((l) => l.quantity > 0);

  if (remainingLines.length === 0) return { ok: true };

  const lines = remainingLines;

  // Inline return similar to pos.service.returnSale without the returns_enabled gate
  // (portal return already gated by tenant returns + staff approval).
  const defaultTaxRate = await posRepo.getTenantDefaultTaxRate(params.tenantId);
  const returnLineInputs = lines.map((l) => {
    const orig = detail.lines.find((o) => o.line.inventoryItemId === l.inventoryItemId)!;
    return {
      inventoryItemId: l.inventoryItemId,
      quantity: l.quantity,
      unitPrice: posRepo.parseMoney(orig.line.unitPrice),
      taxRate: orig.line.taxRate ?? defaultTaxRate,
    };
  });

  let subtotal = 0;
  let taxTotal = 0;
  const computed = returnLineInputs.map((l) => {
    const lineSub = l.unitPrice * l.quantity;
    const taxAmount = lineSub * (l.taxRate / 100);
    subtotal += lineSub;
    taxTotal += taxAmount;
    return {
      inventoryItemId: l.inventoryItemId,
      quantity: l.quantity,
      unitPrice: posRepo.money(l.unitPrice),
      taxRate: l.taxRate,
      taxAmount: posRepo.money(taxAmount),
      lineTotal: posRepo.money(lineSub + taxAmount),
    };
  });
  const total = subtotal + taxTotal;

  const returnSale = await posRepo.createSale(params.tenantId, {
    registerId: sale.registerId,
    shiftId: sale.shiftId,
    locationId: sale.locationId,
    cashierUserId: params.userId,
    customerId: sale.customerId,
    currencyCode: sale.currencyCode,
    notes: params.reason ? `Portal return: ${params.reason}` : "Portal order return",
  });
  await posRepo.replaceSaleLines(params.tenantId, returnSale.id, computed);
  await posRepo.updateSaleTotals(returnSale.id, params.tenantId, {
    subtotal: posRepo.money(subtotal),
    taxTotal: posRepo.money(taxTotal),
    total: posRepo.money(total),
  });

  const receiptNumber = await posRepo.nextReceiptNumber(params.tenantId);
  try {
    await posRepo.finalizeSaleWithStock(
      params.tenantId,
      returnSale.id,
      receiptNumber,
      [{ method: "other", amount: posRepo.money(total) }],
      computed.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        quantity: l.quantity,
        direction: "in" as const,
      })),
      {
        userId: params.userId,
        locationId: sale.locationId,
        documentType: "pos_return",
        reason: params.reason ?? "Portal order return",
      },
      "returned",
    );
  } catch (err) {
    await posRepo.voidSaleRecord(returnSale.id, params.tenantId);
    if (err instanceof posRepo.PosStockError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  await posRepo.createReturnRecord(params.tenantId, {
    originalSaleId: sale.id,
    saleId: returnSale.id,
    reason: params.reason ?? undefined,
    createdByUserId: params.userId,
  });

  return { ok: true };
}
