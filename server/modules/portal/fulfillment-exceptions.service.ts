import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import {
  fulfillmentExceptions,
  portalOrders,
  supplierInvoices,
  type FulfillmentException,
} from "@shared/schema";
import * as portalSale from "./portal-order-sale.service";
import * as orderRepo from "./portal-orders.repository";

export type ExceptionKind = "order_not_received" | "order_return" | "invoice_dispute";
export type ExceptionResolution =
  | "restock_reverse_sale"
  | "keep_sale_complete"
  | "approve_return"
  | "decline_return"
  | "accept_invoice"
  | "reject_invoice";

export async function openException(params: {
  tenantId: string;
  kind: ExceptionKind;
  portalOrderId?: string | null;
  supplierInvoiceId?: string | null;
  notes?: string | null;
}): Promise<FulfillmentException> {
  // Avoid duplicate open rows for the same order+kind
  if (params.portalOrderId) {
    const [existing] = await db
      .select()
      .from(fulfillmentExceptions)
      .where(
        and(
          eq(fulfillmentExceptions.tenantId, params.tenantId),
          eq(fulfillmentExceptions.kind, params.kind),
          eq(fulfillmentExceptions.portalOrderId, params.portalOrderId),
          eq(fulfillmentExceptions.status, "open"),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }

  const [row] = await db
    .insert(fulfillmentExceptions)
    .values({
      tenantId: params.tenantId,
      kind: params.kind,
      status: "open",
      portalOrderId: params.portalOrderId ?? null,
      supplierInvoiceId: params.supplierInvoiceId ?? null,
      notes: params.notes ?? null,
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function resolveOpenForOrder(params: {
  tenantId: string;
  portalOrderId: string;
  kind: ExceptionKind;
  resolution: ExceptionResolution;
  resolvedByUserId: string;
  notes?: string | null;
}) {
  await db
    .update(fulfillmentExceptions)
    .set({
      status: "resolved",
      resolution: params.resolution,
      resolvedByUserId: params.resolvedByUserId,
      resolvedAt: new Date(),
      notes: params.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fulfillmentExceptions.tenantId, params.tenantId),
        eq(fulfillmentExceptions.portalOrderId, params.portalOrderId),
        eq(fulfillmentExceptions.kind, params.kind),
        eq(fulfillmentExceptions.status, "open"),
      ),
    );
}

export async function listExceptions(
  tenantId: string,
  opts: { status?: "open" | "resolved" } = {},
) {
  // Backfill open exceptions for orders already in issue states (pre-feature or missed opens).
  if (!opts.status || opts.status === "open") {
    await backfillOpenExceptionsFromOrders(tenantId);
  }

  const conditions = [eq(fulfillmentExceptions.tenantId, tenantId)];
  if (opts.status) conditions.push(eq(fulfillmentExceptions.status, opts.status));

  return db
    .select({
      exception: fulfillmentExceptions,
      orderNumber: portalOrders.orderNumber,
      orderStatus: portalOrders.status,
      invoiceNumber: supplierInvoices.invoiceNumber,
    })
    .from(fulfillmentExceptions)
    .leftJoin(portalOrders, eq(fulfillmentExceptions.portalOrderId, portalOrders.id))
    .leftJoin(supplierInvoices, eq(fulfillmentExceptions.supplierInvoiceId, supplierInvoices.id))
    .where(and(...conditions))
    .orderBy(desc(fulfillmentExceptions.createdAt));
}

/** Create missing open exception rows for current not_received / return_requested orders. */
async function backfillOpenExceptionsFromOrders(tenantId: string) {
  const issueOrders = await db
    .select({
      id: portalOrders.id,
      status: portalOrders.status,
      notReceivedReason: portalOrders.notReceivedReason,
      returnReason: portalOrders.returnReason,
    })
    .from(portalOrders)
    .where(
      and(
        eq(portalOrders.tenantId, tenantId),
        or(eq(portalOrders.status, "not_received"), eq(portalOrders.status, "return_requested")),
      ),
    );

  for (const order of issueOrders) {
    const kind = order.status === "not_received" ? "order_not_received" : "order_return";
    await openException({
      tenantId,
      kind,
      portalOrderId: order.id,
      notes: order.status === "not_received" ? order.notReceivedReason : order.returnReason,
    });
  }
}

export async function countOpenExceptions(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fulfillmentExceptions)
    .where(and(eq(fulfillmentExceptions.tenantId, tenantId), eq(fulfillmentExceptions.status, "open")));
  return row?.count ?? 0;
}

/**
 * Staff resolves an exception from the exceptions UI.
 * Applies stock/order side-effects for restock / approve return / keep sale.
 */
export async function resolveException(params: {
  tenantId: string;
  exceptionId: string;
  resolution: ExceptionResolution;
  resolvedByUserId: string;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const [ex] = await db
    .select()
    .from(fulfillmentExceptions)
    .where(
      and(eq(fulfillmentExceptions.id, params.exceptionId), eq(fulfillmentExceptions.tenantId, params.tenantId)),
    )
    .limit(1);
  if (!ex) return { ok: false, error: "Exception not found", code: "NOT_FOUND" };
  if (ex.status !== "open") return { ok: false, error: "Exception is already resolved", code: "CONFLICT" };

  if (ex.kind === "order_not_received" && ex.portalOrderId) {
    if (params.resolution === "restock_reverse_sale") {
      const rev = await portalSale.reversePortalOrderSale({
        tenantId: params.tenantId,
        orderId: ex.portalOrderId,
        userId: params.resolvedByUserId,
        reason: params.notes ?? "Resolved: restock after not-received report",
      });
      if (!rev.ok) return { ok: false, error: rev.error, code: "STOCK" };
      // Leave order in not_received so staff can re-dispatch or cancel via Orders.
    } else if (params.resolution === "keep_sale_complete") {
      await orderRepo.updateOrder(params.tenantId, ex.portalOrderId, {
        status: "completed",
        completedAt: new Date(),
        reviewedByUserId: params.resolvedByUserId,
      });
    } else {
      return { ok: false, error: "Invalid resolution for not-received exception", code: "VALIDATION" };
    }
  } else if (ex.kind === "order_return" && ex.portalOrderId) {
    if (params.resolution === "approve_return") {
      const ret = await portalSale.returnPortalOrderSale({
        tenantId: params.tenantId,
        orderId: ex.portalOrderId,
        userId: params.resolvedByUserId,
        reason: params.notes,
      });
      if (!ret.ok) return { ok: false, error: ret.error, code: "STOCK" };
      await orderRepo.updateOrder(params.tenantId, ex.portalOrderId, {
        status: "returned",
        returnedAt: new Date(),
        reviewedByUserId: params.resolvedByUserId,
      });
    } else if (params.resolution === "decline_return") {
      await orderRepo.updateOrder(params.tenantId, ex.portalOrderId, {
        status: "completed",
        reviewedByUserId: params.resolvedByUserId,
      });
    } else {
      return { ok: false, error: "Invalid resolution for return exception", code: "VALIDATION" };
    }
  } else if (ex.kind === "invoice_dispute" && ex.supplierInvoiceId) {
    if (params.resolution === "accept_invoice" || params.resolution === "reject_invoice") {
      await db
        .update(supplierInvoices)
        .set({
          status: params.resolution === "accept_invoice" ? "accepted" : "rejected",
          reviewedByUserId: params.resolvedByUserId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(supplierInvoices.id, ex.supplierInvoiceId), eq(supplierInvoices.tenantId, params.tenantId)),
        );
    } else {
      return { ok: false, error: "Invalid resolution for invoice dispute", code: "VALIDATION" };
    }
  }

  await db
    .update(fulfillmentExceptions)
    .set({
      status: "resolved",
      resolution: params.resolution,
      resolvedByUserId: params.resolvedByUserId,
      resolvedAt: new Date(),
      notes: params.notes ?? ex.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(fulfillmentExceptions.id, ex.id), eq(fulfillmentExceptions.tenantId, params.tenantId)));

  return { ok: true };
}

/** True when the order has an open not_received / return exception (portal “Under review”). */
export async function orderHasOpenException(tenantId: string, portalOrderId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: fulfillmentExceptions.id })
    .from(fulfillmentExceptions)
    .where(
      and(
        eq(fulfillmentExceptions.tenantId, tenantId),
        eq(fulfillmentExceptions.portalOrderId, portalOrderId),
        eq(fulfillmentExceptions.status, "open"),
      ),
    )
    .limit(1);
  return !!row;
}
