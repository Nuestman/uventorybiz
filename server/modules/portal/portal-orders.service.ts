import type { IStorage } from "../../storage";
import { createAndSendNotifications, sendEmail } from "../../notificationService";
import { getEmailTemplate } from "../../emailTemplates";
import { logError } from "../../logger";
import {
  allowedOrderTransitions,
  CUSTOMER_RECEIPT_STATUSES,
  ORDER_RECEIPT_GRACE_DAYS,
  orderGraceEndsAt,
  PORTAL_ORDER_STATUS_LABELS,
  type PortalOrderFulfillment,
  type PortalOrderStatus,
  type SupplierInvoiceStatus,
} from "@shared/portalOrders";
import * as repo from "./portal-orders.repository";
import * as portalRepo from "./portal.repository";
import { insertPortalNotification } from "./portal-notifications.repository";
import { isPortalNotificationEnabledForUser } from "./portal-notification-preferences.service";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Money helpers — prices are stored as decimal strings; do arithmetic in integer cents. */
function toCents(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centsToString(cents: number): string {
  return (cents / 100).toFixed(2);
}

// --- Shop ---

export async function listShopLocations(tenantId: string) {
  return repo.listActiveLocations(tenantId);
}

export async function listShopProducts(
  tenantId: string,
  locationId: string | undefined,
  search: string | undefined,
): Promise<ServiceResult<{ locationId: string; products: Awaited<ReturnType<typeof repo.listSellableProducts>> }>> {
  let resolvedLocationId = locationId;
  if (!resolvedLocationId) {
    const primary = await repo.getPrimaryLocation(tenantId);
    if (!primary) return { ok: false, error: "No active store location available", code: "NO_LOCATION" };
    resolvedLocationId = primary.id;
  }
  const products = await repo.listSellableProducts(tenantId, resolvedLocationId, search);
  return { ok: true, data: { locationId: resolvedLocationId, products } };
}

// --- Customer orders ---

export type CreateOrderInput = {
  fulfillmentType: PortalOrderFulfillment;
  locationId?: string | null;
  deliveryAddress?: string | null;
  customerNotes?: string | null;
  items: Array<{ itemId: string; quantity: number }>;
};

async function generateOrderNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const seq = (await repo.countOrdersForTenantToday(tenantId)) + 1;
  return `ORD-${datePart}-${String(seq).padStart(3, "0")}`;
}

export async function createPortalOrder(params: {
  storage: IStorage;
  tenantId: string;
  customerId: string;
  portalUserId: string;
  input: CreateOrderInput;
}): Promise<ServiceResult<{ orderId: string; orderNumber: string }>> {
  const { storage, tenantId, customerId, portalUserId, input } = params;

  if (input.items.length === 0) return { ok: false, error: "Order must contain at least one item" };
  if (input.fulfillmentType === "delivery" && !input.deliveryAddress?.trim()) {
    return { ok: false, error: "Delivery address is required for delivery orders" };
  }

  // Stock source: chosen pickup location, or the primary location for delivery orders.
  let locationId = input.locationId ?? null;
  if (input.fulfillmentType === "pickup" && !locationId) {
    return { ok: false, error: "Pickup location is required for pickup orders" };
  }
  if (!locationId) {
    const primary = await repo.getPrimaryLocation(tenantId);
    if (!primary) return { ok: false, error: "No active store location available" };
    locationId = primary.id;
  }

  const itemIds = input.items.map((i) => i.itemId);
  const stockRows = await repo.getStockRowsForItems(tenantId, locationId, itemIds);
  const stockByItem = new Map(stockRows.map((r) => [r.item.id, r]));

  const lines: Array<{
    itemId: string;
    itemNameSnapshot: string;
    itemCodeSnapshot: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }> = [];
  let subtotalCents = 0;

  for (const requested of input.items) {
    if (!Number.isInteger(requested.quantity) || requested.quantity < 1) {
      return { ok: false, error: "Item quantities must be whole numbers of at least 1" };
    }
    const row = stockByItem.get(requested.itemId);
    if (!row || row.item.status !== "active") {
      return { ok: false, error: "One of the items is no longer available at this location" };
    }
    const available = row.stock.currentStock ?? 0;
    if (requested.quantity > available) {
      return {
        ok: false,
        error: `Only ${available} of "${row.item.itemName}" available at this location`,
      };
    }
    const unitCents = toCents(row.stock.unitCost);
    if (unitCents == null) {
      return { ok: false, error: `"${row.item.itemName}" has no price set — contact the business` };
    }
    const lineCents = unitCents * requested.quantity;
    subtotalCents += lineCents;
    lines.push({
      itemId: row.item.id,
      itemNameSnapshot: row.item.itemName,
      itemCodeSnapshot: row.item.itemCode ?? null,
      quantity: requested.quantity,
      unitPrice: centsToString(unitCents),
      lineTotal: centsToString(lineCents),
    });
  }

  const orderNumber = await generateOrderNumber(tenantId);
  const { order } = await repo.createOrderWithItems(
    {
      tenantId,
      customerId,
      portalUserId,
      orderNumber,
      fulfillmentType: input.fulfillmentType,
      locationId,
      deliveryAddress: input.fulfillmentType === "delivery" ? input.deliveryAddress?.trim() ?? null : null,
      customerNotes: input.customerNotes?.trim() || null,
      subtotal: centsToString(subtotalCents),
      total: centsToString(subtotalCents),
    },
    lines,
  );

  // Notify staff (event-driven, preference-based). Never block the request on it.
  void createAndSendNotifications(storage, {
    tenantId,
    notificationTypeKey: "portal_order_placed",
    title: `New portal order ${order.orderNumber}`,
    message: `A customer placed order ${order.orderNumber} (${input.fulfillmentType === "pickup" ? "pickup" : "delivery"}, total ${order.total}). Review it in Orders.`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  }).catch((err) => logError("portal order staff notification failed", err));

  return { ok: true, data: { orderId: order.id, orderNumber: order.orderNumber } };
}

export async function listMyOrders(tenantId: string, customerId: string) {
  return repo.listOrdersForCustomer(tenantId, customerId);
}

export async function cancelMyOrder(params: {
  tenantId: string;
  customerId: string;
  orderId: string;
}): Promise<ServiceResult<{ status: PortalOrderStatus }>> {
  const order = await repo.getOrderById(params.tenantId, params.orderId);
  if (!order || order.customerId !== params.customerId) {
    return { ok: false, error: "Order not found", code: "NOT_FOUND" };
  }
  if (order.status !== "pending") {
    return { ok: false, error: "Only pending orders can be cancelled — contact the business", code: "INVALID_STATE" };
  }
  const updated = await repo.updateOrder(params.tenantId, params.orderId, {
    status: "cancelled",
    cancelledAt: new Date(),
  });
  return { ok: true, data: { status: updated.status } };
}

// --- Customer receipt confirmation / not-received ---

export async function confirmOrderReceipt(params: {
  tenantId: string;
  customerId: string;
  orderId: string;
}): Promise<ServiceResult<{ status: PortalOrderStatus }>> {
  const order = await repo.getOrderById(params.tenantId, params.orderId);
  if (!order || order.customerId !== params.customerId) {
    return { ok: false, error: "Order not found", code: "NOT_FOUND" };
  }
  if (!CUSTOMER_RECEIPT_STATUSES.includes(order.status as PortalOrderStatus)) {
    return {
      ok: false,
      error: "Receipt can only be confirmed once the order is ready for pickup or out for delivery",
      code: "INVALID_STATE",
    };
  }
  const now = new Date();
  const updated = await repo.updateOrder(params.tenantId, params.orderId, {
    status: "completed",
    receiptConfirmedAt: now,
    completedAt: now,
  });
  return { ok: true, data: { status: updated.status } };
}

export async function reportOrderNotReceived(params: {
  storage: IStorage;
  tenantId: string;
  customerId: string;
  orderId: string;
  reason?: string | null;
}): Promise<ServiceResult<{ status: PortalOrderStatus }>> {
  const order = await repo.getOrderById(params.tenantId, params.orderId);
  if (!order || order.customerId !== params.customerId) {
    return { ok: false, error: "Order not found", code: "NOT_FOUND" };
  }
  if (!CUSTOMER_RECEIPT_STATUSES.includes(order.status as PortalOrderStatus)) {
    return {
      ok: false,
      error: "A problem can only be reported once the order is ready for pickup or out for delivery",
      code: "INVALID_STATE",
    };
  }
  const now = new Date();
  const reason = params.reason?.trim() || null;
  const updated = await repo.updateOrder(params.tenantId, params.orderId, {
    status: "not_received",
    notReceivedAt: now,
    notReceivedReason: reason,
  });

  void createAndSendNotifications(params.storage, {
    tenantId: params.tenantId,
    notificationTypeKey: "portal_order_issue",
    title: `Order ${order.orderNumber} reported as not received`,
    message: `The customer reported order ${order.orderNumber} as not received${reason ? `: "${reason}"` : ""}. Review it in Orders.`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  }).catch((err) => logError("portal order issue staff notification failed", err));

  return { ok: true, data: { status: updated.status } };
}

/** Customer asks to return a completed order (gated by the tenant's returns toggle). */
export async function requestOrderReturn(params: {
  storage: IStorage;
  tenantId: string;
  customerId: string;
  orderId: string;
  reason?: string | null;
}): Promise<ServiceResult<{ status: PortalOrderStatus }>> {
  const order = await repo.getOrderById(params.tenantId, params.orderId);
  if (!order || order.customerId !== params.customerId) {
    return { ok: false, error: "Order not found", code: "NOT_FOUND" };
  }
  if (order.status !== "completed") {
    return { ok: false, error: "Only completed orders can be returned", code: "INVALID_STATE" };
  }
  if (!(await repo.isReturnsEnabled(params.tenantId))) {
    return { ok: false, error: "This business does not accept returns", code: "RETURNS_DISABLED" };
  }
  const now = new Date();
  const reason = params.reason?.trim() || null;
  const updated = await repo.updateOrder(params.tenantId, params.orderId, {
    status: "return_requested",
    returnRequestedAt: now,
    returnReason: reason,
  });

  void createAndSendNotifications(params.storage, {
    tenantId: params.tenantId,
    notificationTypeKey: "portal_order_issue",
    title: `Return requested for order ${order.orderNumber}`,
    message: `The customer requested a return for order ${order.orderNumber}${reason ? `: "${reason}"` : ""}. Review it in Orders.`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  }).catch((err) => logError("portal order return-request staff notification failed", err));

  return { ok: true, data: { status: updated.status } };
}

// --- Staff order management ---

export async function listTenantOrders(tenantId: string, status?: PortalOrderStatus) {
  return repo.listOrdersForTenant(tenantId, status);
}

/** Badge counts for the staff sidebar: orders/invoices awaiting staff action. */
export async function getOrdersAttentionCounts(tenantId: string) {
  const counts = await repo.countOrdersNeedingAttention(tenantId);
  return {
    ...counts,
    total:
      counts.pendingOrders +
      counts.notReceivedOrders +
      counts.returnRequestedOrders +
      counts.submittedInvoices,
  };
}

export async function updateOrderStatus(params: {
  tenantId: string;
  orderId: string;
  status: PortalOrderStatus;
  staffNotes?: string | null;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
  reviewerUserId: string;
}): Promise<ServiceResult<{ status: PortalOrderStatus }>> {
  const order = await repo.getOrderById(params.tenantId, params.orderId);
  if (!order) return { ok: false, error: "Order not found", code: "NOT_FOUND" };

  const currentStatus = order.status as PortalOrderStatus;
  const allowed = allowedOrderTransitions(currentStatus, order.fulfillmentType as PortalOrderFulfillment);
  if (!allowed.includes(params.status)) {
    return {
      ok: false,
      error: `Cannot move order from "${PORTAL_ORDER_STATUS_LABELS[currentStatus]}" to "${PORTAL_ORDER_STATUS_LABELS[params.status]}"`,
      code: "INVALID_STATE",
    };
  }

  // Completion from ready/out-for-delivery belongs to the customer (receipt confirmation)
  // for the grace window; staff can complete only after it passes.
  if (params.status === "completed" && CUSTOMER_RECEIPT_STATUSES.includes(currentStatus)) {
    const graceEnd = orderGraceEndsAt(order.readyAt);
    if (graceEnd && graceEnd > new Date()) {
      return {
        ok: false,
        error: `The customer has ${ORDER_RECEIPT_GRACE_DAYS} days to confirm receipt. You can mark this order complete after ${graceEnd.toLocaleDateString()}.`,
        code: "GRACE_PERIOD",
      };
    }
  }

  // Recording a return (even a phone-in one) requires the returns toggle.
  if (params.status === "return_requested" && !(await repo.isReturnsEnabled(params.tenantId))) {
    return { ok: false, error: "Returns/refunds are disabled in your business settings", code: "RETURNS_DISABLED" };
  }

  const now = new Date();
  const startsReceiptWindow = params.status === "ready_for_pickup" || params.status === "out_for_delivery";
  const updated = await repo.updateOrder(params.tenantId, params.orderId, {
    status: params.status,
    staffNotes: params.staffNotes !== undefined ? params.staffNotes : undefined,
    reviewedByUserId: params.reviewerUserId,
    deliveryContactName:
      params.status === "out_for_delivery" && params.deliveryContactName !== undefined
        ? params.deliveryContactName?.trim() || null
        : undefined,
    deliveryContactPhone:
      params.status === "out_for_delivery" && params.deliveryContactPhone !== undefined
        ? params.deliveryContactPhone?.trim() || null
        : undefined,
    confirmedAt: params.status === "confirmed" ? now : undefined,
    // (Re)starts the grace window, including re-dispatch after a not-received report.
    readyAt: startsReceiptWindow ? now : undefined,
    returnRequestedAt: params.status === "return_requested" ? now : undefined,
    returnedAt: params.status === "returned" ? now : undefined,
    // Declining a return request keeps the original completion timestamp.
    completedAt: params.status === "completed" && currentStatus !== "return_requested" ? now : undefined,
    cancelledAt: params.status === "cancelled" || params.status === "rejected" ? now : undefined,
  });

  void notifyCustomerOrderUpdate(updated).catch((err) =>
    logError("portal order customer notification failed", err),
  );

  return { ok: true, data: { status: updated.status } };
}

/**
 * Cron: auto-complete orders still awaiting customer receipt after the grace window.
 * Runs across all tenants; notifies the customer of the completion.
 */
export async function processPortalOrderAutoCompletion(): Promise<{ completed: number; errors: number }> {
  const cutoff = new Date(Date.now() - ORDER_RECEIPT_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const overdue = await repo.listOrdersPastReceiptGrace(cutoff);
  let completed = 0;
  let errors = 0;
  for (const order of overdue) {
    try {
      const updated = await repo.updateOrder(order.tenantId, order.id, {
        status: "completed",
        completedAt: new Date(),
      });
      completed += 1;
      void notifyCustomerOrderUpdate(updated).catch((err) =>
        logError("portal order auto-complete customer notification failed", err),
      );
    } catch (err) {
      errors += 1;
      logError(`portal order auto-complete failed for order ${order.id}`, err);
    }
  }
  return { completed, errors };
}

/** In-app + email notification to the portal user, respecting their order_updates preferences. */
async function notifyCustomerOrderUpdate(order: {
  id: string;
  tenantId: string;
  portalUserId: string | null;
  orderNumber: string;
  status: PortalOrderStatus | string;
  fulfillmentType: string;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
}) {
  if (!order.portalUserId) return;
  const statusLabel = PORTAL_ORDER_STATUS_LABELS[order.status as PortalOrderStatus] ?? order.status;
  const title = `Order ${order.orderNumber}: ${statusLabel}`;
  const courier =
    order.status === "out_for_delivery" && (order.deliveryContactName || order.deliveryContactPhone)
      ? ` Courier: ${[order.deliveryContactName, order.deliveryContactPhone].filter(Boolean).join(", ")}.`
      : "";
  const message =
    order.status === "ready_for_pickup"
      ? `Your order ${order.orderNumber} is ready for pickup. Please confirm receipt in the portal once you have collected it.`
      : order.status === "out_for_delivery"
        ? `Your order ${order.orderNumber} is out for delivery.${courier} Please confirm receipt in the portal once it arrives.`
        : order.status === "returned"
          ? `Your return for order ${order.orderNumber} has been processed.`
          : `Your order ${order.orderNumber} is now "${statusLabel}".`;

  const inAppEnabled = await isPortalNotificationEnabledForUser(
    order.tenantId,
    order.portalUserId,
    "order_updates",
    "in_app",
  );
  if (inAppEnabled) {
    await insertPortalNotification({
      tenantId: order.tenantId,
      portalUserId: order.portalUserId,
      notificationType: "order_update",
      title,
      message,
      metadata: { orderId: order.id, deepLink: "/portal/orders" },
    });
  }

  const emailEnabled = await isPortalNotificationEnabledForUser(
    order.tenantId,
    order.portalUserId,
    "order_updates",
    "email",
  );
  if (emailEnabled) {
    const pu = await portalRepo.findPortalUserById(order.portalUserId);
    const tenant = await portalRepo.getTenantById(order.tenantId);
    if (pu) {
      const html = getEmailTemplate(`
        <h1>${title}</h1>
        <p>${message}</p>
        <p>Sign in to the ${tenant?.name ?? "customer"} portal to see the details.</p>
      `);
      await sendEmail({ to: pu.email, subject: title, html, text: message });
    }
  }
}

// --- Supplier purchase orders + invoices ---

export async function listSupplierPurchaseOrders(tenantId: string, supplierId: string) {
  return repo.listPurchaseOrdersForSupplier(tenantId, supplierId);
}

export async function getSupplierPurchaseOrder(tenantId: string, supplierId: string, poId: string) {
  return repo.getPurchaseOrderForSupplier(tenantId, supplierId, poId);
}

export async function submitSupplierInvoice(params: {
  storage: IStorage;
  tenantId: string;
  supplierId: string;
  portalUserId: string;
  input: {
    purchaseOrderId?: string | null;
    invoiceNumber: string;
    amount: string;
    invoiceDate?: string | null;
    notes?: string | null;
  };
}): Promise<ServiceResult<{ invoiceId: string }>> {
  const { storage, tenantId, supplierId, portalUserId, input } = params;

  const amountCents = toCents(input.amount);
  if (amountCents == null || amountCents <= 0) {
    return { ok: false, error: "Invoice amount must be a positive number" };
  }

  const invoiceNumber = input.invoiceNumber.trim();
  if (!invoiceNumber) return { ok: false, error: "Invoice number is required" };

  const duplicate = await repo.findSupplierInvoiceByNumber(tenantId, supplierId, invoiceNumber);
  if (duplicate) return { ok: false, error: `Invoice ${invoiceNumber} has already been submitted` };

  let poNumber: string | null = null;
  if (input.purchaseOrderId) {
    const po = await repo.getPurchaseOrderForSupplier(tenantId, supplierId, input.purchaseOrderId);
    if (!po) return { ok: false, error: "Purchase order not found for your account" };
    poNumber = po.po.poNumber;
  }

  const invoice = await repo.createSupplierInvoice({
    tenantId,
    supplierId,
    purchaseOrderId: input.purchaseOrderId ?? null,
    portalUserId,
    invoiceNumber,
    amount: centsToString(amountCents),
    invoiceDate: input.invoiceDate ?? null,
    notes: input.notes?.trim() || null,
  });

  void createAndSendNotifications(storage, {
    tenantId,
    notificationTypeKey: "supplier_invoice_submitted",
    title: `Supplier invoice ${invoiceNumber} submitted`,
    message: `A supplier submitted invoice ${invoiceNumber} for ${invoice.amount}${poNumber ? ` against PO ${poNumber}` : ""}.`,
    metadata: { invoiceId: invoice.id, purchaseOrderId: input.purchaseOrderId ?? null },
  }).catch((err) => logError("supplier invoice staff notification failed", err));

  return { ok: true, data: { invoiceId: invoice.id } };
}

export async function listSupplierInvoices(tenantId: string, supplierId: string) {
  return repo.listInvoicesForSupplier(tenantId, supplierId);
}

// --- Staff invoice management ---

export async function listTenantSupplierInvoices(tenantId: string, status?: SupplierInvoiceStatus) {
  return repo.listInvoicesForTenant(tenantId, status);
}

export async function updateSupplierInvoiceStatus(params: {
  tenantId: string;
  invoiceId: string;
  status: SupplierInvoiceStatus;
  reviewerUserId: string;
}): Promise<ServiceResult<{ status: SupplierInvoiceStatus }>> {
  const updated = await repo.updateSupplierInvoice(params.tenantId, params.invoiceId, {
    status: params.status,
    reviewedByUserId: params.reviewerUserId,
    reviewedAt: new Date(),
  });
  if (!updated) return { ok: false, error: "Invoice not found", code: "NOT_FOUND" };
  return { ok: true, data: { status: updated.status } };
}
