/** Shared portal order + supplier invoice types (server + staff UI + portal UI). */

export const PORTAL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "not_received",
  "completed",
  "return_requested",
  "returned",
  "cancelled",
  "rejected",
] as const;

export type PortalOrderStatus = (typeof PORTAL_ORDER_STATUSES)[number];

export type PortalOrderFulfillment = "pickup" | "delivery";

export const PORTAL_ORDER_STATUS_LABELS: Record<PortalOrderStatus, string> = {
  pending: "Pending review",
  confirmed: "Confirmed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  not_received: "Not received",
  completed: "Completed",
  return_requested: "Return requested",
  returned: "Returned",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

/**
 * Days after shipping (out for delivery) or ready-for-pickup during which completion
 * belongs to the customer (receipt confirmation). After the grace period the business
 * may mark the order complete, and the daily cron auto-completes it.
 */
export const ORDER_RECEIPT_GRACE_DAYS = 3;

/**
 * Default days after receipt/completion during which a portal customer may request a return.
 * Overridable per tenant via `tenants.return_window_days`.
 */
export const DEFAULT_RETURN_WINDOW_DAYS = 3;

/** Statuses from which the customer can confirm receipt or report the order as not received. */
export const CUSTOMER_RECEIPT_STATUSES: PortalOrderStatus[] = ["ready_for_pickup", "out_for_delivery"];

/**
 * Staff-side transitions, fulfillment-aware: pickup orders never go out for delivery,
 * delivery orders never become ready for pickup. Customers may only self-cancel while
 * pending; from ready/out-for-delivery they confirm receipt or report not received.
 * Completing from ready/out-for-delivery is additionally gated by the grace period
 * (server-enforced) unless the customer confirmed receipt.
 */
export function allowedOrderTransitions(
  status: PortalOrderStatus,
  fulfillment: PortalOrderFulfillment,
): PortalOrderStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "rejected", "cancelled"];
    case "confirmed":
      return fulfillment === "pickup" ? ["ready_for_pickup", "cancelled"] : ["out_for_delivery", "cancelled"];
    case "ready_for_pickup":
      return ["completed", "not_received", "cancelled"];
    case "out_for_delivery":
      return ["completed", "not_received", "cancelled"];
    case "not_received":
      // Staff resolve a report by re-staging/re-dispatching, completing, or cancelling.
      return fulfillment === "pickup"
        ? ["ready_for_pickup", "completed", "cancelled"]
        : ["out_for_delivery", "completed", "cancelled"];
    case "completed":
      // Customers request returns from the portal; staff can record one for phone-in requests.
      // Gated by the tenant's returns_enabled setting and return_window_days (server-enforced).
      return ["return_requested"];
    case "return_requested":
      // Staff process the refund (POS return against the receipt), then mark returned —
      // or decline the request, putting the order back to completed.
      return ["returned", "completed"];
    case "returned":
    case "cancelled":
    case "rejected":
      return [];
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isTerminalOrderStatus(status: PortalOrderStatus): boolean {
  return status === "returned" || status === "cancelled" || status === "rejected";
}

/** End of the customer-confirmation grace window (readyAt + grace days), or null if not started. */
export function orderGraceEndsAt(readyAt: Date | string | null | undefined): Date | null {
  if (!readyAt) return null;
  const start = typeof readyAt === "string" ? new Date(readyAt) : readyAt;
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + ORDER_RECEIPT_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Start of the return window: when the customer confirmed receipt, else when the order completed.
 */
export function orderReturnWindowStart(
  receiptConfirmedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined,
): Date | null {
  const raw = receiptConfirmedAt ?? completedAt;
  if (!raw) return null;
  const start = typeof raw === "string" ? new Date(raw) : raw;
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

/** Deadline for a portal customer return request, or null if the order has no completion/receipt timestamp. */
export function orderReturnDeadline(
  receiptConfirmedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined,
  windowDays: number = DEFAULT_RETURN_WINDOW_DAYS,
): Date | null {
  const start = orderReturnWindowStart(receiptConfirmedAt, completedAt);
  if (!start) return null;
  const days = Number.isFinite(windowDays) ? Math.max(0, Math.floor(windowDays)) : DEFAULT_RETURN_WINDOW_DAYS;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isWithinReturnWindow(
  receiptConfirmedAt: Date | string | null | undefined,
  completedAt: Date | string | null | undefined,
  windowDays: number = DEFAULT_RETURN_WINDOW_DAYS,
  now: Date = new Date(),
): boolean {
  const deadline = orderReturnDeadline(receiptConfirmedAt, completedAt, windowDays);
  if (!deadline) return false;
  return now.getTime() <= deadline.getTime();
}

export const SUPPLIER_INVOICE_STATUSES = ["submitted", "accepted", "rejected", "paid"] as const;

export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number];

export const SUPPLIER_INVOICE_STATUS_LABELS: Record<SupplierInvoiceStatus, string> = {
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  paid: "Paid",
};

/** PO statuses suppliers are allowed to see in the portal (never drafts/pending approval). */
export const SUPPLIER_VISIBLE_PO_STATUSES = [
  "approved",
  "ordered",
  "shipped",
  "partially_received",
  "completed",
] as const;

export type SupplierVisiblePoStatus = (typeof SUPPLIER_VISIBLE_PO_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Awaiting supplier confirmation",
  ordered: "Confirmed by supplier",
  shipped: "Shipped",
  partially_received: "Partially received",
  completed: "Completed",
  cancelled: "Cancelled",
};
