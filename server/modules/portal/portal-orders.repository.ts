import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../../config/db";
import {
  careLocations,
  customers,
  inventoryItems,
  inventoryStock,
  portalOrderItems,
  portalOrders,
  purchaseOrderItems,
  purchaseOrders,
  supplierInvoices,
  suppliers,
  tenants,
  users,
  type PortalOrder,
  type PortalOrderItem,
} from "@shared/schema";
import type { PortalOrderFulfillment, PortalOrderStatus, SupplierInvoiceStatus } from "@shared/portalOrders";
import { DEFAULT_RETURN_WINDOW_DAYS, SUPPLIER_VISIBLE_PO_STATUSES } from "@shared/portalOrders";

// --- Shop / products ---

export async function listActiveLocations(tenantId: string) {
  return db
    .select({
      id: careLocations.id,
      locationName: careLocations.locationName,
      locationCode: careLocations.locationCode,
      isPrimary: careLocations.isPrimary,
    })
    .from(careLocations)
    .where(and(eq(careLocations.tenantId, tenantId), eq(careLocations.status, "active")))
    .orderBy(desc(careLocations.isPrimary), careLocations.locationName);
}

export async function getPrimaryLocation(tenantId: string) {
  const [row] = await db
    .select()
    .from(careLocations)
    .where(and(eq(careLocations.tenantId, tenantId), eq(careLocations.status, "active")))
    .orderBy(desc(careLocations.isPrimary))
    .limit(1);
  return row;
}

/** Sellable products at a location: active items with stock on hand and a price. */
export async function listSellableProducts(tenantId: string, locationId: string, search?: string) {
  const conditions = [
    eq(inventoryItems.tenantId, tenantId),
    eq(inventoryItems.status, "active"),
    gt(inventoryStock.currentStock, 0),
    sql`${inventoryStock.unitCost} IS NOT NULL`,
  ];
  const term = search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      sql`(${inventoryItems.itemName} ILIKE ${pattern} OR ${inventoryItems.itemCode} ILIKE ${pattern} OR ${inventoryItems.barcode} ILIKE ${pattern})`,
    );
  }
  return db
    .select({
      itemId: inventoryItems.id,
      itemName: inventoryItems.itemName,
      itemCode: inventoryItems.itemCode,
      category: inventoryItems.category,
      unitOfMeasure: inventoryItems.unitOfMeasure,
      imageUrl: inventoryItems.imageUrl,
      unitPrice: inventoryStock.unitCost,
      availableStock: inventoryStock.currentStock,
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
    .where(and(...conditions))
    .orderBy(inventoryItems.itemName)
    .limit(100);
}

export async function getStockRowsForItems(tenantId: string, locationId: string, itemIds: string[]) {
  if (itemIds.length === 0) return [];
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
    .where(and(eq(inventoryItems.tenantId, tenantId), inArray(inventoryItems.id, itemIds)));
}

// --- Orders ---

export async function createOrderWithItems(
  order: {
    tenantId: string;
    customerId: string;
    portalUserId: string | null;
    orderNumber: string;
    fulfillmentType: PortalOrderFulfillment;
    locationId: string | null;
    deliveryAddress: string | null;
    customerNotes: string | null;
    subtotal: string;
    total: string;
  },
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    itemCodeSnapshot: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>,
): Promise<{ order: PortalOrder; items: PortalOrderItem[] }> {
  return db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(portalOrders)
      .values({ ...order, updatedAt: new Date() })
      .returning();
    const itemRows = await tx
      .insert(portalOrderItems)
      .values(
        items.map((item) => ({
          tenantId: order.tenantId,
          orderId: orderRow.id,
          ...item,
          updatedAt: new Date(),
        })),
      )
      .returning();
    return { order: orderRow, items: itemRows };
  });
}

export async function listOrdersForCustomer(tenantId: string, customerId: string) {
  const orders = await db
    .select({
      order: portalOrders,
      locationName: careLocations.locationName,
    })
    .from(portalOrders)
    .leftJoin(careLocations, eq(portalOrders.locationId, careLocations.id))
    .where(and(eq(portalOrders.tenantId, tenantId), eq(portalOrders.customerId, customerId)))
    .orderBy(desc(portalOrders.createdAt));
  return attachOrderItems(tenantId, orders);
}

export async function listOrdersForTenant(tenantId: string, status?: PortalOrderStatus) {
  const conditions = [eq(portalOrders.tenantId, tenantId)];
  if (status) conditions.push(eq(portalOrders.status, status));
  const orders = await db
    .select({
      order: portalOrders,
      locationName: careLocations.locationName,
      customer: customers,
    })
    .from(portalOrders)
    .leftJoin(careLocations, eq(portalOrders.locationId, careLocations.id))
    .leftJoin(customers, eq(portalOrders.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(portalOrders.createdAt));
  return attachOrderItems(tenantId, orders);
}

async function attachOrderItems<T extends { order: PortalOrder }>(tenantId: string, orders: T[]) {
  if (orders.length === 0) return orders.map((o) => ({ ...o, items: [] as PortalOrderItem[] }));
  const orderIds = orders.map((o) => o.order.id);
  const items = await db
    .select()
    .from(portalOrderItems)
    .where(and(eq(portalOrderItems.tenantId, tenantId), inArray(portalOrderItems.orderId, orderIds)));
  const byOrder = new Map<string, PortalOrderItem[]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push(item);
    byOrder.set(item.orderId, list);
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.order.id) ?? [] }));
}

export async function getOrderById(tenantId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(portalOrders)
    .where(and(eq(portalOrders.tenantId, tenantId), eq(portalOrders.id, orderId)))
    .limit(1);
  return row;
}

export async function updateOrder(
  tenantId: string,
  orderId: string,
  patch: Partial<{
    status: PortalOrderStatus;
    staffNotes: string | null;
    reviewedByUserId: string | null;
    deliveryContactName: string | null;
    deliveryContactPhone: string | null;
    confirmedAt: Date | null;
    readyAt: Date | null;
    receiptConfirmedAt: Date | null;
    notReceivedAt: Date | null;
    notReceivedReason: string | null;
    returnRequestedAt: Date | null;
    returnReason: string | null;
    returnedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  }>,
) {
  const [row] = await db
    .update(portalOrders)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(portalOrders.tenantId, tenantId), eq(portalOrders.id, orderId)))
    .returning();
  return row;
}

/** Counts of items needing staff attention — drives the sidebar badge. */
export async function countOrdersNeedingAttention(tenantId: string) {
  const [orderCounts] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${portalOrders.status} = 'pending')`.mapWith(Number),
      notReceived: sql<number>`count(*) filter (where ${portalOrders.status} = 'not_received')`.mapWith(Number),
      returnRequested: sql<number>`count(*) filter (where ${portalOrders.status} = 'return_requested')`.mapWith(Number),
    })
    .from(portalOrders)
    .where(eq(portalOrders.tenantId, tenantId));
  const [invoiceCounts] = await db
    .select({
      submitted: sql<number>`count(*) filter (where ${supplierInvoices.status} = 'submitted')`.mapWith(Number),
      pendingPayment: sql<number>`count(*) filter (where ${supplierInvoices.status} = 'accepted')`.mapWith(Number),
    })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.tenantId, tenantId));
  return {
    pendingOrders: orderCounts?.pending ?? 0,
    notReceivedOrders: orderCounts?.notReceived ?? 0,
    returnRequestedOrders: orderCounts?.returnRequested ?? 0,
    submittedInvoices: invoiceCounts?.submitted ?? 0,
    pendingPaymentInvoices: invoiceCounts?.pendingPayment ?? 0,
  };
}

/** Returns/refunds toggle from the tenant record. */
export async function isReturnsEnabled(tenantId: string): Promise<boolean> {
  const [row] = await db
    .select({ returnsEnabled: tenants.returnsEnabled })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return row?.returnsEnabled !== false;
}

/** Portal customer return window (days after receipt/completion). */
export async function getReturnWindowDays(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ returnWindowDays: tenants.returnWindowDays })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const raw = row?.returnWindowDays;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.min(365, Math.floor(raw));
  }
  return DEFAULT_RETURN_WINDOW_DAYS;
}

/** Orders (all tenants) awaiting customer receipt whose grace window has passed — cron auto-complete. */
export async function listOrdersPastReceiptGrace(cutoff: Date) {
  return db
    .select()
    .from(portalOrders)
    .where(
      and(
        inArray(portalOrders.status, ["ready_for_pickup", "out_for_delivery"]),
        sql`${portalOrders.readyAt} IS NOT NULL AND ${portalOrders.readyAt} <= ${cutoff}`,
      ),
    );
}

export async function countOrdersForTenantToday(tenantId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(portalOrders)
    .where(and(eq(portalOrders.tenantId, tenantId), sql`${portalOrders.createdAt} >= CURRENT_DATE`));
  return row?.count ?? 0;
}

// --- Supplier purchase orders ---

export async function listPurchaseOrdersForSupplier(tenantId: string, supplierId: string) {
  return db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      orderDate: purchaseOrders.orderDate,
      expectedDelivery: purchaseOrders.expectedDelivery,
      actualDelivery: purchaseOrders.actualDelivery,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      notes: purchaseOrders.notes,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.tenantId, tenantId),
        eq(purchaseOrders.supplierId, supplierId),
        inArray(purchaseOrders.status, [...SUPPLIER_VISIBLE_PO_STATUSES]),
      ),
    )
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderForSupplier(tenantId: string, supplierId: string, poId: string) {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.tenantId, tenantId),
        eq(purchaseOrders.supplierId, supplierId),
        eq(purchaseOrders.id, poId),
        inArray(purchaseOrders.status, [...SUPPLIER_VISIBLE_PO_STATUSES]),
      ),
    )
    .limit(1);
  if (!po) return null;
  const items = await db
    .select({
      id: purchaseOrderItems.id,
      itemName: inventoryItems.itemName,
      itemCode: inventoryItems.itemCode,
      itemDescription: purchaseOrderItems.itemDescription,
      quantityOrdered: purchaseOrderItems.quantityOrdered,
      quantityReceived: purchaseOrderItems.quantityReceived,
      unitCost: purchaseOrderItems.unitCost,
      totalCost: purchaseOrderItems.totalCost,
    })
    .from(purchaseOrderItems)
    .leftJoin(inventoryItems, eq(purchaseOrderItems.itemId, inventoryItems.id))
    .where(and(eq(purchaseOrderItems.tenantId, tenantId), eq(purchaseOrderItems.poId, poId)));
  return { po, items };
}

export async function updatePurchaseOrderForSupplier(
  tenantId: string,
  supplierId: string,
  poId: string,
  patch: {
    status?: "ordered" | "shipped";
    supplierConfirmedAt?: Date;
    supplierConfirmedByPortalUserId?: string;
    supplierShippedAt?: Date;
    supplierShippedByPortalUserId?: string;
  },
) {
  const [row] = await db
    .update(purchaseOrders)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(purchaseOrders.tenantId, tenantId),
        eq(purchaseOrders.supplierId, supplierId),
        eq(purchaseOrders.id, poId),
      ),
    )
    .returning();
  return row ?? null;
}

/** Sum of received line totals (qty received × unit cost); falls back to ordered totals if nothing received. */
export function computeInvoicePrefillAmount(
  items: Array<{ quantityOrdered: number; quantityReceived: number | null; unitCost: string; totalCost: string }>,
  poTotalAmount: string,
): string {
  let cents = 0;
  let anyReceived = false;
  for (const item of items) {
    const received = item.quantityReceived ?? 0;
    if (received > 0) {
      anyReceived = true;
      const unit = Math.round(Number.parseFloat(item.unitCost || "0") * 100) || 0;
      cents += unit * received;
    }
  }
  if (anyReceived) return (cents / 100).toFixed(2);
  return poTotalAmount;
}

export async function findActiveInvoiceForPo(tenantId: string, purchaseOrderId: string) {
  const [row] = await db
    .select()
    .from(supplierInvoices)
    .where(
      and(
        eq(supplierInvoices.tenantId, tenantId),
        eq(supplierInvoices.purchaseOrderId, purchaseOrderId),
        sql`${supplierInvoices.status} <> 'rejected'`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function nextSupplierInvoiceNumber(tenantId: string, supplierId: string): Promise<string> {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supplierInvoices)
    .where(
      and(
        eq(supplierInvoices.tenantId, tenantId),
        eq(supplierInvoices.supplierId, supplierId),
        sql`${supplierInvoices.invoiceNumber} LIKE ${prefix + "-%"}`,
      ),
    );
  const seq = (row?.count ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

// --- Supplier invoices ---

export async function createSupplierInvoice(input: {
  tenantId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  portalUserId: string | null;
  invoiceNumber: string;
  amount: string;
  invoiceDate: string | null;
  notes: string | null;
}) {
  const [row] = await db
    .insert(supplierInvoices)
    .values({ ...input, updatedAt: new Date() })
    .returning();
  return row;
}

export async function findSupplierInvoiceByNumber(tenantId: string, supplierId: string, invoiceNumber: string) {
  const [row] = await db
    .select()
    .from(supplierInvoices)
    .where(
      and(
        eq(supplierInvoices.tenantId, tenantId),
        eq(supplierInvoices.supplierId, supplierId),
        eq(supplierInvoices.invoiceNumber, invoiceNumber),
      ),
    )
    .limit(1);
  return row;
}

export async function listInvoicesForSupplier(tenantId: string, supplierId: string) {
  return db
    .select({
      invoice: supplierInvoices,
      poNumber: purchaseOrders.poNumber,
    })
    .from(supplierInvoices)
    .leftJoin(purchaseOrders, eq(supplierInvoices.purchaseOrderId, purchaseOrders.id))
    .where(and(eq(supplierInvoices.tenantId, tenantId), eq(supplierInvoices.supplierId, supplierId)))
    .orderBy(desc(supplierInvoices.createdAt));
}

export async function listInvoicesForTenant(tenantId: string, status?: SupplierInvoiceStatus) {
  const conditions = [eq(supplierInvoices.tenantId, tenantId)];
  if (status) conditions.push(eq(supplierInvoices.status, status));
  return db
    .select({
      invoice: supplierInvoices,
      poNumber: purchaseOrders.poNumber,
      supplierName: suppliers.name,
    })
    .from(supplierInvoices)
    .leftJoin(purchaseOrders, eq(supplierInvoices.purchaseOrderId, purchaseOrders.id))
    .leftJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
    .where(and(...conditions))
    .orderBy(desc(supplierInvoices.createdAt));
}

export async function updateSupplierInvoice(
  tenantId: string,
  invoiceId: string,
  patch: Partial<{
    status: SupplierInvoiceStatus;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
  }>,
) {
  const [row] = await db
    .update(supplierInvoices)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(supplierInvoices.tenantId, tenantId), eq(supplierInvoices.id, invoiceId)))
    .returning();
  return row;
}

export async function getReviewerName(userId: string) {
  const [row] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ? `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() : null;
}
