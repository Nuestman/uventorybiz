import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Package, PhoneCall, ShoppingBag, Truck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  ORDER_RECEIPT_GRACE_DAYS,
  orderGraceEndsAt,
  PORTAL_ORDER_STATUS_LABELS,
  type PortalOrderStatus,
} from "@shared/portalOrders";
import { PORTAL_SHOP } from "./portalRoutes";
import { usePortalSession } from "./usePortalSession";
import { PORTAL_PRIMARY_BTN_CLASS, PortalEmptyState, PortalLoadingBlock } from "./portalUi";

type OrderItem = {
  id: string;
  itemNameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type OrderRow = {
  order: {
    id: string;
    orderNumber: string;
    status: PortalOrderStatus;
    fulfillmentType: "pickup" | "delivery";
    deliveryAddress: string | null;
    customerNotes: string | null;
    staffNotes: string | null;
    deliveryContactName: string | null;
    deliveryContactPhone: string | null;
    readyAt: string | null;
    receiptConfirmedAt: string | null;
    notReceivedAt: string | null;
    notReceivedReason: string | null;
    returnRequestedAt: string | null;
    returnReason: string | null;
    returnedAt: string | null;
    total: string;
    currencyCode: string;
    createdAt: string | null;
  };
  locationName: string | null;
  items: OrderItem[];
};

function statusBadgeVariant(status: PortalOrderStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "secondary";
    case "confirmed":
    case "ready_for_pickup":
    case "out_for_delivery":
      return "default";
    case "completed":
    case "returned":
      return "outline";
    case "return_requested":
      return "secondary";
    case "not_received":
    case "cancelled":
    case "rejected":
      return "destructive";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Statuses where the customer confirms receipt (or reports a problem). */
const RECEIPT_STATUSES: PortalOrderStatus[] = ["ready_for_pickup", "out_for_delivery"];

/** Active statuses past pending — cancelling now requires calling the business. */
const CALL_TO_CANCEL_STATUSES: PortalOrderStatus[] = [
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
];

export default function PortalOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = usePortalSession();
  const supportPhone = session?.supportPhone ?? session?.tenantContact?.phone ?? null;
  const returnsEnabled = session?.tenant.returnsEnabled !== false;

  const [reportOrderId, setReportOrderId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["/api/portal/orders"],
    queryFn: getQueryFn<OrderRow[]>({ on401: "throw" }),
  });

  const invalidateOrders = () => queryClient.invalidateQueries({ queryKey: ["/api/portal/orders"] });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/portal/orders/${orderId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order cancelled" });
      invalidateOrders();
    },
    onError: (err: Error) => {
      toast({ title: "Could not cancel order", description: err.message, variant: "destructive" });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/portal/orders/${orderId}/confirm-receipt`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Receipt confirmed", description: "Thank you — the order is now complete." });
      invalidateOrders();
    },
    onError: (err: Error) => {
      toast({ title: "Could not confirm receipt", description: err.message, variant: "destructive" });
    },
  });

  const notReceivedMutation = useMutation({
    mutationFn: async () => {
      if (!reportOrderId) throw new Error("No order selected");
      const res = await apiRequest("POST", `/api/portal/orders/${reportOrderId}/not-received`, {
        reason: reportReason.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report sent",
        description: "The business has been notified and will contact you about this order.",
      });
      setReportOrderId(null);
      setReportReason("");
      invalidateOrders();
    },
    onError: (err: Error) => {
      toast({ title: "Could not send report", description: err.message, variant: "destructive" });
    },
  });

  const requestReturnMutation = useMutation({
    mutationFn: async () => {
      if (!returnOrderId) throw new Error("No order selected");
      const res = await apiRequest("POST", `/api/portal/orders/${returnOrderId}/request-return`, {
        reason: returnReason.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Return requested",
        description: "The business has been notified and will contact you about your return.",
      });
      setReturnOrderId(null);
      setReturnReason("");
      invalidateOrders();
    },
    onError: (err: Error) => {
      toast({ title: "Could not request return", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My orders</h2>
          <p className="text-sm text-uventorybiz-gray">Track the status of your orders.</p>
        </div>
        <Button asChild className={PORTAL_PRIMARY_BTN_CLASS}>
          <Link href={PORTAL_SHOP}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Shop products
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <PortalLoadingBlock label="Loading orders…" />
      ) : orders.length === 0 ? (
        <PortalEmptyState
          icon={Package}
          title="No orders yet"
          description="Products you order will appear here with live status updates."
        />
      ) : (
        <div className="space-y-4">
          {orders.map(({ order, locationName, items }) => {
            const awaitingReceipt = RECEIPT_STATUSES.includes(order.status);
            const graceEnd = awaitingReceipt ? orderGraceEndsAt(order.readyAt) : null;
            return (
              <Card key={order.id} className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                    <span>{order.orderNumber}</span>
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {PORTAL_ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""} ·{" "}
                    {order.fulfillmentType === "pickup"
                      ? `Pickup${locationName ? ` at ${locationName}` : ""}`
                      : "Delivery"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm divide-y rounded-lg border">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 truncate">
                          {item.quantity} × {item.itemNameSnapshot}
                        </span>
                        <span className="shrink-0 font-medium">{item.lineTotal}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between px-3 py-2 bg-gray-50 font-semibold">
                      <span>Total</span>
                      <span>
                        {order.currencyCode} {order.total}
                      </span>
                    </li>
                  </ul>

                  {order.fulfillmentType === "delivery" && order.deliveryAddress ? (
                    <p className="text-sm text-uventorybiz-gray">
                      <span className="font-medium text-gray-700">Deliver to:</span> {order.deliveryAddress}
                    </p>
                  ) : null}

                  {order.status === "out_for_delivery" &&
                  (order.deliveryContactName || order.deliveryContactPhone) ? (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-sm text-blue-900">
                      <Truck className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Your delivery contact</p>
                        <p>
                          {order.deliveryContactName ?? "Courier"}
                          {order.deliveryContactPhone ? (
                            <>
                              {" · "}
                              <a href={`tel:${order.deliveryContactPhone}`} className="font-medium underline">
                                {order.deliveryContactPhone}
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {order.staffNotes ? (
                    <p className="text-sm text-uventorybiz-gray">
                      <span className="font-medium text-gray-700">Note from the business:</span> {order.staffNotes}
                    </p>
                  ) : null}

                  {order.status === "not_received" ? (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      You reported this order as not received
                      {order.notReceivedReason ? ` ("${order.notReceivedReason}")` : ""}. The business has been
                      notified and will contact you to resolve it.
                    </p>
                  ) : null}

                  {awaitingReceipt ? (
                    <div className="space-y-2">
                      <p className="text-sm text-uventorybiz-gray">
                        {order.fulfillmentType === "pickup"
                          ? "Once you have collected your order, confirm receipt to complete it."
                          : "Once your order arrives, confirm receipt to complete it."}
                        {graceEnd
                          ? ` If not confirmed, it completes automatically on ${graceEnd.toLocaleDateString()} (${ORDER_RECEIPT_GRACE_DAYS}-day grace period).`
                          : ""}
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setReportOrderId(order.id);
                            setReportReason("");
                          }}
                        >
                          Not received
                        </Button>
                        <Button
                          size="sm"
                          className={PORTAL_PRIMARY_BTN_CLASS}
                          disabled={confirmReceiptMutation.isPending}
                          onClick={() => confirmReceiptMutation.mutate(order.id)}
                        >
                          {confirmReceiptMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Confirm receipt
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {CALL_TO_CANCEL_STATUSES.includes(order.status) ? (
                    <p className="text-xs text-uventorybiz-gray flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                      This order is confirmed — to cancel it now, please call the business
                      {supportPhone ? (
                        <>
                          {" at "}
                          <a href={`tel:${supportPhone}`} className="font-medium underline">
                            {supportPhone}
                          </a>
                        </>
                      ) : null}
                      .
                    </p>
                  ) : null}

                  {order.status === "completed" && order.receiptConfirmedAt ? (
                    <p className="text-xs text-uventorybiz-gray">
                      Receipt confirmed on {new Date(order.receiptConfirmedAt).toLocaleDateString()}.
                    </p>
                  ) : null}

                  {order.status === "return_requested" ? (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Return requested
                      {order.returnRequestedAt
                        ? ` on ${new Date(order.returnRequestedAt).toLocaleDateString()}`
                        : ""}
                      {order.returnReason ? ` ("${order.returnReason}")` : ""}. The business will contact
                      you to arrange the return and refund.
                    </p>
                  ) : null}

                  {order.status === "returned" ? (
                    <p className="text-xs text-uventorybiz-gray">
                      Returned{order.returnedAt ? ` on ${new Date(order.returnedAt).toLocaleDateString()}` : ""}.
                    </p>
                  ) : null}

                  {order.status === "completed" && returnsEnabled ? (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReturnOrderId(order.id);
                          setReturnReason("");
                        }}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                        Request return
                      </Button>
                    </div>
                  ) : null}

                  {order.status === "pending" && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}
                      >
                        {cancelMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Cancel order
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Return request dialog */}
      <Dialog open={!!returnOrderId} onOpenChange={(open) => !open && setReturnOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a return</DialogTitle>
            <DialogDescription>
              The business will review your request and contact you to arrange the return and refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="return-reason">Reason (optional)</Label>
            <Textarea
              id="return-reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. wrong item, damaged on arrival…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOrderId(null)}>
              Back
            </Button>
            <Button
              className={PORTAL_PRIMARY_BTN_CLASS}
              disabled={requestReturnMutation.isPending}
              onClick={() => requestReturnMutation.mutate()}
            >
              {requestReturnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not received report dialog */}
      <Dialog open={!!reportOrderId} onOpenChange={(open) => !open && setReportOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report order not received</DialogTitle>
            <DialogDescription>
              The business will be notified immediately and will contact you to resolve this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">What happened? (optional)</Label>
            <Textarea
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. courier never arrived, package missing…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOrderId(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={notReceivedMutation.isPending}
              onClick={() => notReceivedMutation.mutate()}
            >
              {notReceivedMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
