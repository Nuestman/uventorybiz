import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { PORTAL_ORDER_STATUSES, SUPPLIER_INVOICE_STATUSES } from "@shared/portalOrders";
import {
  getOrdersAttentionCounts,
  listTenantOrders,
  listTenantSupplierInvoices,
  updateOrderStatus,
  updateSupplierInvoiceStatus,
} from "../portal/portal-orders.service";
import {
  countOpenExceptions,
  listExceptions,
  resolveException,
} from "../portal/fulfillment-exceptions.service";

const updateOrderStatusSchema = z.object({
  status: z.enum(PORTAL_ORDER_STATUSES),
  staffNotes: z.string().max(4000).optional().nullable(),
  /** Courier contact shown to the customer; only applied when moving to out_for_delivery. */
  deliveryContactName: z.string().max(200).optional().nullable(),
  deliveryContactPhone: z.string().max(64).optional().nullable(),
});

const updateInvoiceStatusSchema = z.object({
  status: z.enum(SUPPLIER_INVOICE_STATUSES),
});

const resolveExceptionSchema = z.object({
  resolution: z.enum([
    "restock_reverse_sale",
    "keep_sale_complete",
    "approve_return",
    "decline_return",
    "accept_invoice",
    "reject_invoice",
  ]),
  notes: z.string().max(4000).optional().nullable(),
});

export interface OrdersRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Staff-facing router for portal orders and supplier invoices. Mount at /api.
 * Routes: GET /orders, PATCH /orders/:id/status, GET /supplier-invoices, PATCH /supplier-invoices/:id/status
 */
export function createOrdersRouter(deps: OrdersRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();

  router.get("/orders", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = PORTAL_ORDER_STATUSES.find((s) => s === statusParam);
    const rows = await listTenantOrders(tenantId, status);
    res.json(rows);
  });

  // Sidebar badge: counts of pending / not-received orders and submitted invoices.
  router.get("/orders/attention-count", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const counts = await getOrdersAttentionCounts(tenantId);
    const openExceptions = await countOpenExceptions(tenantId);
    res.json({ ...counts, openExceptions, total: counts.total + openExceptions });
  });

  router.get("/orders/exceptions", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const statusParam = typeof req.query.status === "string" ? req.query.status : "open";
    const status = statusParam === "resolved" || statusParam === "open" ? statusParam : "open";
    res.json(await listExceptions(tenantId, { status }));
  });

  router.post(
    "/orders/exceptions/:id/resolve",
    authMiddleware,
    validateBody(resolveExceptionSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof resolveExceptionSchema>;
      const result = await resolveException({
        tenantId,
        exceptionId: req.params.id,
        resolution: body.resolution,
        resolvedByUserId: req.user.id,
        notes: body.notes,
      });
      if (!result.ok) {
        const code =
          result.code === "NOT_FOUND" ? 404 : result.code === "CONFLICT" ? 409 : 400;
        return sendError(res, code, result.error);
      }
      res.json({ ok: true });
    },
  );

  router.patch(
    "/orders/:id/status",
    authMiddleware,
    validateBody(updateOrderStatusSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof updateOrderStatusSchema>;
      const result = await updateOrderStatus({
        tenantId,
        orderId: req.params.id,
        status: body.status,
        staffNotes: body.staffNotes,
        deliveryContactName: body.deliveryContactName,
        deliveryContactPhone: body.deliveryContactPhone,
        reviewerUserId: req.user.id,
      });
      if (!result.ok) {
        const code =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "INVALID_STATE" || result.code === "GRACE_PERIOD" || result.code === "STOCK"
              ? 409
              : 400;
        return sendError(res, code, result.error);
      }
      res.json(result.data);
    },
  );

  router.get("/supplier-invoices", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = SUPPLIER_INVOICE_STATUSES.find((s) => s === statusParam);
    const rows = await listTenantSupplierInvoices(tenantId, status);
    res.json(rows);
  });

  router.patch(
    "/supplier-invoices/:id/status",
    authMiddleware,
    validateBody(updateInvoiceStatusSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof updateInvoiceStatusSchema>;
      const result = await updateSupplierInvoiceStatus({
        tenantId,
        invoiceId: req.params.id,
        status: body.status,
        reviewerUserId: req.user.id,
      });
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : 400;
        return sendError(res, code, result.error);
      }
      res.json(result.data);
    },
  );

  return router;
}
