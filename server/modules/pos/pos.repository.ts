import { and, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import {
  careLocations,
  customers,
  inventoryItems,
  inventoryStock,
  inventoryTransactions,
  posPayments,
  posRegisters,
  posReturns,
  posSaleLines,
  posSales,
  posShifts,
  tenants,
  users,
} from "@shared/schema";
import type { PosPaymentMethod, PosSaleStatus } from "./pos.types";

export function money(n: number): string {
  return n.toFixed(2);
}

export function parseMoney(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0;
}

export async function getTenantDefaultTaxRate(tenantId: string): Promise<number> {
  const [row] = await db.select({ defaultTaxRate: tenants.defaultTaxRate }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.defaultTaxRate ?? 0;
}

export async function listRegisters(tenantId: string, locationId?: string) {
  const conditions = [eq(posRegisters.tenantId, tenantId)];
  if (locationId) conditions.push(eq(posRegisters.locationId, locationId));
  return db
    .select({
      register: posRegisters,
      locationName: careLocations.locationName,
    })
    .from(posRegisters)
    .leftJoin(careLocations, eq(posRegisters.locationId, careLocations.id))
    .where(and(...conditions))
    .orderBy(posRegisters.name);
}

export async function getRegisterById(id: string, tenantId: string) {
  const [row] = await db
    .select({
      register: posRegisters,
      locationName: careLocations.locationName,
    })
    .from(posRegisters)
    .leftJoin(careLocations, eq(posRegisters.locationId, careLocations.id))
    .where(and(eq(posRegisters.id, id), eq(posRegisters.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function createRegister(tenantId: string, data: { locationId: string; name: string; isActive?: boolean }) {
  const [row] = await db
    .insert(posRegisters)
    .values({
      tenantId,
      locationId: data.locationId,
      name: data.name,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function getOpenShiftForRegister(registerId: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(posShifts)
    .where(and(eq(posShifts.registerId, registerId), eq(posShifts.tenantId, tenantId), eq(posShifts.status, "open")))
    .limit(1);
  return row;
}

export async function createShift(
  tenantId: string,
  data: { registerId: string; openedByUserId: string; openingFloat: string; notes?: string },
) {
  const [row] = await db
    .insert(posShifts)
    .values({
      tenantId,
      registerId: data.registerId,
      openedByUserId: data.openedByUserId,
      openingFloat: data.openingFloat,
      notes: data.notes ?? null,
      status: "open",
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function closeShift(
  id: string,
  tenantId: string,
  data: { closedByUserId: string; closingFloat: string; notes?: string },
) {
  const [row] = await db
    .update(posShifts)
    .set({
      closedByUserId: data.closedByUserId,
      closingFloat: data.closingFloat,
      notes: data.notes ?? null,
      closedAt: new Date(),
      status: "closed",
      updatedAt: new Date(),
    })
    .where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId)))
    .returning();
  return row;
}

export async function getShiftById(id: string, tenantId: string) {
  const [row] = await db.select().from(posShifts).where(and(eq(posShifts.id, id), eq(posShifts.tenantId, tenantId))).limit(1);
  return row;
}

/**
 * Count-based daily sequence. Concurrent completions on the same tenant could
 * collide (no unique index); acceptable for MVP — move to a sequence table
 * (like ticket_number_sequences) if multi-register volume grows.
 */
export async function nextReceiptNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const prefix = `RCP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posSales)
    .where(and(eq(posSales.tenantId, tenantId), ilike(posSales.receiptNumber, `${prefix}-%`)));
  const seq = (row?.count ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

export async function createSale(
  tenantId: string,
  data: {
    registerId: string;
    shiftId: string;
    locationId: string;
    cashierUserId: string;
    customerId?: string | null;
    portalOrderId?: string | null;
    currencyCode: string;
    notes?: string;
  },
) {
  const [row] = await db
    .insert(posSales)
    .values({
      tenantId,
      registerId: data.registerId,
      shiftId: data.shiftId,
      locationId: data.locationId,
      cashierUserId: data.cashierUserId,
      customerId: data.customerId ?? null,
      portalOrderId: data.portalOrderId ?? null,
      currencyCode: data.currencyCode,
      notes: data.notes ?? null,
      status: "draft",
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function replaceSaleLines(
  tenantId: string,
  saleId: string,
  lines: Array<{
    inventoryItemId: string;
    quantity: number;
    unitPrice: string;
    taxRate: number;
    taxAmount: string;
    lineTotal: string;
    barcodeSnapshot?: string | null;
  }>,
) {
  await db.delete(posSaleLines).where(and(eq(posSaleLines.saleId, saleId), eq(posSaleLines.tenantId, tenantId)));
  if (lines.length === 0) return [];
  return db
    .insert(posSaleLines)
    .values(
      lines.map((line) => ({
        tenantId,
        saleId,
        inventoryItemId: line.inventoryItemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
        barcodeSnapshot: line.barcodeSnapshot ?? null,
      })),
    )
    .returning();
}

export async function updateSaleTotals(
  saleId: string,
  tenantId: string,
  totals: { subtotal: string; taxTotal: string; total: string; notes?: string },
) {
  const [row] = await db
    .update(posSales)
    .set({
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      notes: totals.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(posSales.id, saleId), eq(posSales.tenantId, tenantId)))
    .returning();
  return row;
}

export async function getSaleById(id: string, tenantId: string) {
  const [sale] = await db.select().from(posSales).where(and(eq(posSales.id, id), eq(posSales.tenantId, tenantId))).limit(1);
  if (!sale) return null;
  const lines = await db
    .select({
      line: posSaleLines,
      itemName: inventoryItems.itemName,
      itemCode: inventoryItems.itemCode,
    })
    .from(posSaleLines)
    .innerJoin(inventoryItems, eq(posSaleLines.inventoryItemId, inventoryItems.id))
    .where(and(eq(posSaleLines.saleId, id), eq(posSaleLines.tenantId, tenantId)));
  const payments = await db.select().from(posPayments).where(and(eq(posPayments.saleId, id), eq(posPayments.tenantId, tenantId)));
  const [register] = await db.select().from(posRegisters).where(eq(posRegisters.id, sale.registerId)).limit(1);
  const [location] = await db.select().from(careLocations).where(eq(careLocations.id, sale.locationId)).limit(1);
  const customer = sale.customerId
    ? (await db.select().from(customers).where(and(eq(customers.id, sale.customerId), eq(customers.tenantId, tenantId))).limit(1))[0] ?? null
    : null;
  return { sale, lines, payments, register, location, customer };
}

export interface ListSalesOptions {
  page: number;
  pageSize: number;
  status?: PosSaleStatus;
  search?: string;
}

/**
 * Paginated sales history with customer/store/salesperson names, total item
 * quantity, and the distinct payment methods used. Drafts (in-progress carts)
 * are excluded unless explicitly filtered for.
 */
export async function listSales(tenantId: string, opts: ListSalesOptions) {
  const conditions = [eq(posSales.tenantId, tenantId)];
  if (opts.status) {
    conditions.push(eq(posSales.status, opts.status));
  } else {
    conditions.push(sql`${posSales.status} <> 'draft'`);
  }
  const term = opts.search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      sql`(${posSales.receiptNumber} ILIKE ${pattern} OR (${customers.firstName} || ' ' || ${customers.lastName}) ILIKE ${pattern})`,
    );
  }
  const where = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posSales)
    .leftJoin(customers, eq(posSales.customerId, customers.id))
    .where(where);

  const rows = await db
    .select({
      id: posSales.id,
      receiptNumber: posSales.receiptNumber,
      status: posSales.status,
      total: posSales.total,
      currencyCode: posSales.currencyCode,
      completedAt: posSales.completedAt,
      createdAt: posSales.createdAt,
      customerId: posSales.customerId,
      portalOrderId: posSales.portalOrderId,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      locationName: careLocations.locationName,
      cashierFirstName: users.firstName,
      cashierLastName: users.lastName,
      itemCount: sql<number>`(select coalesce(sum(l.quantity), 0) from pos_sale_lines l where l.sale_id = ${posSales.id})`.mapWith(Number),
      paymentMethods: sql<string | null>`(select string_agg(distinct p.method::text, ', ') from pos_payments p where p.sale_id = ${posSales.id})`,
    })
    .from(posSales)
    .leftJoin(customers, eq(posSales.customerId, customers.id))
    .leftJoin(careLocations, eq(posSales.locationId, careLocations.id))
    .leftJoin(users, eq(posSales.cashierUserId, users.id))
    .where(where)
    .orderBy(desc(posSales.createdAt))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize);

  return { rows, total: countRow?.count ?? 0 };
}

/** Find a completed (or returned) sale by its receipt number. */
export async function findSaleByReceiptNumber(tenantId: string, receiptNumber: string) {
  const [sale] = await db
    .select()
    .from(posSales)
    .where(and(eq(posSales.tenantId, tenantId), eq(posSales.receiptNumber, receiptNumber)))
    .orderBy(desc(posSales.completedAt))
    .limit(1);
  return sale ?? null;
}

export interface StockMove {
  inventoryItemId: string;
  quantity: number;
  direction: "out" | "in";
}

/** Thrown for business-rule failures inside the finalize transaction (mapped to 400s). */
export class PosStockError extends Error {}

/**
 * Atomically applies stock movements, finalizes the sale, and records payments.
 * Stock rows are locked (SELECT ... FOR UPDATE) so concurrent sales cannot oversell.
 * Any failure rolls back everything — the sale stays draft and stock is untouched.
 */
export async function finalizeSaleWithStock(
  tenantId: string,
  saleId: string,
  receiptNumber: string,
  payments: Array<{ method: PosPaymentMethod; amount: string }>,
  moves: StockMove[],
  meta: { userId: string; locationId: string; documentType: string; reason?: string },
  status: PosSaleStatus = "completed",
) {
  return db.transaction(async (tx) => {
    for (const move of moves) {
      const [stock] = await tx
        .select()
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.tenantId, tenantId),
            eq(inventoryStock.itemId, move.inventoryItemId),
            eq(inventoryStock.locationId, meta.locationId),
          ),
        )
        .for("update")
        .limit(1);
      if (!stock) throw new PosStockError("No stock record for item at this location");

      const previousStock = stock.currentStock ?? 0;
      const newStock = move.direction === "out" ? previousStock - move.quantity : previousStock + move.quantity;
      if (newStock < 0) throw new PosStockError("Insufficient stock for this transaction");

      await tx.insert(inventoryTransactions).values({
        tenantId,
        // inventory_transactions.item_id references inventory_stock.id (per-location stock row)
        itemId: stock.id,
        transactionType: move.direction === "out" ? "issue_internal" : "return_from_client",
        quantity: move.quantity,
        previousStock,
        newStock,
        locationId: meta.locationId,
        documentType: meta.documentType,
        documentId: saleId,
        reference: receiptNumber,
        reason: meta.reason ?? null,
        createdBy: meta.userId,
      });

      await tx
        .update(inventoryStock)
        .set({ currentStock: newStock, updatedAt: new Date() })
        .where(eq(inventoryStock.id, stock.id));
    }

    const now = new Date();
    const [sale] = await tx
      .update(posSales)
      .set({ status, receiptNumber, completedAt: now, updatedAt: now })
      .where(and(eq(posSales.id, saleId), eq(posSales.tenantId, tenantId)))
      .returning();
    if (!sale) throw new PosStockError("Sale not found during completion");

    if (payments.length > 0) {
      await tx.insert(posPayments).values(
        payments.map((p) => ({
          tenantId,
          saleId,
          method: p.method,
          amount: p.amount,
        })),
      );
    }
    return sale;
  });
}

/** Quantities already returned against a sale, keyed by inventory item id. */
export async function getReturnedQuantitiesForSale(tenantId: string, originalSaleId: string) {
  const rows = await db
    .select({
      inventoryItemId: posSaleLines.inventoryItemId,
      quantity: sql<number>`sum(${posSaleLines.quantity})::int`,
    })
    .from(posReturns)
    .innerJoin(posSaleLines, eq(posSaleLines.saleId, posReturns.saleId))
    .where(and(eq(posReturns.tenantId, tenantId), eq(posReturns.originalSaleId, originalSaleId)))
    .groupBy(posSaleLines.inventoryItemId);
  return new Map(rows.map((r) => [r.inventoryItemId, r.quantity]));
}

export async function voidSaleRecord(saleId: string, tenantId: string) {
  const [row] = await db
    .update(posSales)
    .set({ status: "voided", voidedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(posSales.id, saleId), eq(posSales.tenantId, tenantId)))
    .returning();
  return row;
}

export async function createReturnRecord(
  tenantId: string,
  data: { originalSaleId: string; saleId: string; reason?: string; createdByUserId: string },
) {
  const [row] = await db
    .insert(posReturns)
    .values({
      tenantId,
      originalSaleId: data.originalSaleId,
      saleId: data.saleId,
      reason: data.reason ?? null,
      createdByUserId: data.createdByUserId,
    })
    .returning();
  return row;
}

export async function searchInventoryItems(tenantId: string, locationId: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  const pattern = `%${q}%`;
  return db
    .select({
      item: inventoryItems,
      stock: inventoryStock,
    })
    .from(inventoryItems)
    .innerJoin(
      inventoryStock,
      and(
        eq(inventoryStock.itemId, inventoryItems.id),
        eq(inventoryStock.tenantId, tenantId),
        eq(inventoryStock.locationId, locationId),
      ),
    )
    .where(
      and(
        eq(inventoryItems.tenantId, tenantId),
        or(
          ilike(inventoryItems.itemName, pattern),
          ilike(inventoryItems.itemCode, pattern),
          ilike(inventoryItems.barcode, pattern),
        ),
      ),
    )
    .limit(25);
}

export async function findItemByBarcode(tenantId: string, locationId: string, barcode: string) {
  const [row] = await db
    .select({
      item: inventoryItems,
      stock: inventoryStock,
    })
    .from(inventoryItems)
    .innerJoin(
      inventoryStock,
      and(
        eq(inventoryStock.itemId, inventoryItems.id),
        eq(inventoryStock.tenantId, tenantId),
        eq(inventoryStock.locationId, locationId),
      ),
    )
    .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.barcode, barcode)))
    .limit(1);
  return row;
}

export async function getDailySalesReport(tenantId: string, date: string, registerId?: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const conditions = [
    eq(posSales.tenantId, tenantId),
    eq(posSales.status, "completed" as PosSaleStatus),
    gte(posSales.completedAt, start),
    lt(posSales.completedAt, end),
  ];
  if (registerId) conditions.push(eq(posSales.registerId, registerId));

  const sales = await db
    .select({
      sale: posSales,
      registerName: posRegisters.name,
      shiftId: posSales.shiftId,
    })
    .from(posSales)
    .innerJoin(posRegisters, eq(posSales.registerId, posRegisters.id))
    .where(and(...conditions))
    .orderBy(desc(posSales.completedAt));

  const returns = await db
    .select({ sale: posSales, registerName: posRegisters.name })
    .from(posSales)
    .innerJoin(posRegisters, eq(posSales.registerId, posRegisters.id))
    .where(
      and(
        eq(posSales.tenantId, tenantId),
        eq(posSales.status, "returned"),
        gte(posSales.completedAt, start),
        lt(posSales.completedAt, end),
        registerId ? eq(posSales.registerId, registerId) : sql`true`,
      ),
    );

  const grossTotal = sales.reduce((sum, row) => sum + parseMoney(row.sale.total), 0);
  const returnTotal = returns.reduce((sum, row) => sum + parseMoney(row.sale.total), 0);

  const byRegister = new Map<string, { registerId: string; registerName: string; saleCount: number; total: number }>();
  for (const row of sales) {
    const key = row.sale.registerId;
    const existing = byRegister.get(key) ?? {
      registerId: key,
      registerName: row.registerName ?? "Register",
      saleCount: 0,
      total: 0,
    };
    existing.saleCount += 1;
    existing.total += parseMoney(row.sale.total);
    byRegister.set(key, existing);
  }

  return {
    date,
    registerId: registerId ?? null,
    saleCount: sales.length,
    returnCount: returns.length,
    grossTotal: money(grossTotal),
    returnTotal: money(returnTotal),
    netTotal: money(grossTotal - returnTotal),
    byRegister: Array.from(byRegister.values()).map((r) => ({
      ...r,
      total: money(r.total),
    })),
    sales: sales.map((s) => ({
      id: s.sale.id,
      receiptNumber: s.sale.receiptNumber,
      total: s.sale.total,
      completedAt: s.sale.completedAt,
      registerId: s.sale.registerId,
      registerName: s.registerName,
      shiftId: s.shiftId,
    })),
  };
}
