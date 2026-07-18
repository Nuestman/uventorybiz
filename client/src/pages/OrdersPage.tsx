import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  allowedOrderTransitions,
  ORDER_RECEIPT_GRACE_DAYS,
  orderGraceEndsAt,
  PORTAL_ORDER_STATUSES,
  PORTAL_ORDER_STATUS_LABELS,
  SUPPLIER_INVOICE_STATUS_LABELS,
  type PortalOrderStatus,
  type SupplierInvoiceStatus,
} from "@shared/portalOrders";

type OrdersAttentionCounts = {
  pendingOrders: number;
  notReceivedOrders: number;
  returnRequestedOrders: number;
  submittedInvoices: number;
  total: number;
};

type OrderItem = {
  id: string;
  itemNameSnapshot: string;
  itemCodeSnapshot: string | null;
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
    subtotal: string;
    total: string;
    currencyCode: string;
    createdAt: string | null;
  };
  locationName: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    customerNumber: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  items: OrderItem[];
};

type InvoiceRow = {
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: string;
    invoiceDate: string | null;
    status: SupplierInvoiceStatus;
    notes: string | null;
    createdAt: string | null;
  };
  poNumber: string | null;
  supplierName: string | null;
};

function orderStatusVariant(status: PortalOrderStatus): "default" | "secondary" | "destructive" | "outline" {
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

function invoiceStatusVariant(status: SupplierInvoiceStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "submitted":
      return "secondary";
    case "accepted":
      return "default";
    case "paid":
      return "outline";
    case "rejected":
      return "destructive";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const INVOICE_TRANSITIONS: Record<SupplierInvoiceStatus, SupplierInvoiceStatus[]> = {
  submitted: ["accepted", "rejected"],
  accepted: ["paid", "rejected"],
  rejected: [],
  paid: [],
};

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useTenantSettings();
  const returnsEnabled = settings?.returnsEnabled !== false;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [nextStatus, setNextStatus] = useState<PortalOrderStatus | "">("");
  const [staffNotes, setStaffNotes] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryContactPhone, setDeliveryContactPhone] = useState("");

  const ordersUrl = statusFilter === "all" ? "/api/orders" : `/api/orders?status=${statusFilter}`;
  // Poll so customer-driven changes (receipt confirmations, not-received reports) show up live.
  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderRow[]>({
    queryKey: [ordersUrl],
    queryFn: getQueryFn<OrderRow[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceRow[]>({
    queryKey: ["/api/supplier-invoices"],
    queryFn: getQueryFn<InvoiceRow[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  // Same source as the sidebar badge — updates when orders/invoices are actioned.
  const { data: attention } = useQuery<OrdersAttentionCounts>({
    queryKey: ["/api/orders/attention-count"],
    queryFn: getQueryFn<OrdersAttentionCounts>({ on401: "throw" }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const pendingCount = orders.filter((row) => row.order.status === "pending").length;
  const notReceivedCount = orders.filter((row) => row.order.status === "not_received").length;
  const returnRequestedCount = orders.filter((row) => row.order.status === "return_requested").length;
  const attentionTotal = attention?.total ?? pendingCount + notReceivedCount + returnRequestedCount;
  const allClear = attention != null && attention.total === 0;

  const updateOrderMutation = useMutation({
    mutationFn: async (params: {
      orderId: string;
      status: PortalOrderStatus;
      staffNotes?: string | null;
      deliveryContactName?: string | null;
      deliveryContactPhone?: string | null;
    }) => {
      const res = await apiRequest("PATCH", `/api/orders/${params.orderId}/status`, {
        status: params.status,
        staffNotes: params.staffNotes,
        deliveryContactName: params.deliveryContactName,
        deliveryContactPhone: params.deliveryContactPhone,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order updated" });
      setDetailOrder(null);
      setNextStatus("");
      setStaffNotes("");
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/orders") });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/attention-count"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update order", description: err.message, variant: "destructive" });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (params: { invoiceId: string; status: SupplierInvoiceStatus }) => {
      const res = await apiRequest("PATCH", `/api/supplier-invoices/${params.invoiceId}/status`, {
        status: params.status,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/attention-count"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update invoice", description: err.message, variant: "destructive" });
    },
  });

  // Fulfillment-aware transitions; "completed" is hidden while the customer's
  // receipt-confirmation grace window is still open (server enforces it too).
  const detailGraceEnd =
    detailOrder &&
    (detailOrder.order.status === "ready_for_pickup" || detailOrder.order.status === "out_for_delivery")
      ? orderGraceEndsAt(detailOrder.order.readyAt)
      : null;
  const detailGraceOpen = !!detailGraceEnd && detailGraceEnd > new Date();
  const detailTransitions = detailOrder
    ? allowedOrderTransitions(detailOrder.order.status, detailOrder.order.fulfillmentType).filter(
        (status) =>
          !(status === "completed" && detailGraceOpen) &&
          !(status === "return_requested" && !returnsEnabled),
      )
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Portal orders
        </h1>
        <p className="text-sm text-muted-foreground">
          Customer orders placed through the portal, and invoices submitted by suppliers.
        </p>
      </div>

      {allClear ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium">All portal work is up to date</p>
            <p className="text-sm text-emerald-800/90">
              No pending orders, not-received reports, return requests, or supplier invoices waiting for review.
            </p>
          </div>
        </div>
      ) : attentionTotal > 0 ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
          role="status"
          aria-live="polite"
        >
          <ClipboardList className="h-5 w-5 shrink-0 text-amber-700 mt-1" aria-hidden />
          <div className="space-y-1">
            <p className="text-lg font-medium">
              {attentionTotal} item{attentionTotal === 1 ? "" : "s"} need{attentionTotal === 1 ? "s" : ""} attention
            </p>
            <p className="text-sm text-amber-900/90">
              {[
                (attention?.pendingOrders ?? pendingCount) > 0
                  ? `${attention?.pendingOrders ?? pendingCount} pending order${(attention?.pendingOrders ?? pendingCount) === 1 ? "" : "s"}`
                  : null,
                (attention?.notReceivedOrders ?? notReceivedCount) > 0
                  ? `${attention?.notReceivedOrders ?? notReceivedCount} not received`
                  : null,
                (attention?.returnRequestedOrders ?? returnRequestedCount) > 0
                  ? `${attention?.returnRequestedOrders ?? returnRequestedCount} return request${(attention?.returnRequestedOrders ?? returnRequestedCount) === 1 ? "" : "s"}`
                  : null,
                (attention?.submittedInvoices ?? 0) > 0
                  ? `${attention?.submittedInvoices} submitted invoice${attention?.submittedInvoices === 1 ? "" : "s"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            Customer orders
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
            {notReceivedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {notReceivedCount} not received
              </Badge>
            )}
            {returnRequestedCount > 0 && (
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-500 text-white">
                {returnRequestedCount} return{returnRequestedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">Supplier invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PORTAL_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {PORTAL_ORDER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {ordersLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading orders…
                </div>
              ) : orders.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No portal orders{statusFilter !== "all" ? " with this status" : " yet"}.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((row) => (
                      <TableRow
                        key={row.order.id}
                        className={
                          row.order.status === "not_received"
                            ? "bg-red-50/80 hover:bg-red-100/70 border-l-4 border-l-red-500"
                            : row.order.status === "return_requested"
                              ? "bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-l-amber-500"
                              : undefined
                        }
                      >
                        <TableCell className="font-medium">{row.order.orderNumber}</TableCell>
                        <TableCell>
                          {row.customer
                            ? `${row.customer.firstName} ${row.customer.lastName}`.trim()
                            : "—"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {row.order.fulfillmentType === "pickup"
                            ? `Pickup${row.locationName ? ` · ${row.locationName}` : ""}`
                            : "Delivery"}
                        </TableCell>
                        <TableCell>{row.items.length}</TableCell>
                        <TableCell>
                          {row.order.currencyCode} {row.order.total}
                        </TableCell>
                        <TableCell>
                          {row.order.createdAt ? new Date(row.order.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={orderStatusVariant(row.order.status)}>
                            {PORTAL_ORDER_STATUS_LABELS[row.order.status]}
                          </Badge>
                          {row.order.status === "not_received" && row.order.notReceivedReason ? (
                            <p className="mt-1 max-w-[16rem] truncate text-xs text-red-700">
                              “{row.order.notReceivedReason}”
                            </p>
                          ) : null}
                          {row.order.status === "return_requested" && row.order.returnReason ? (
                            <p className="mt-1 max-w-[16rem] truncate text-xs text-amber-700">
                              “{row.order.returnReason}”
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDetailOrder(row);
                              setNextStatus("");
                              setStaffNotes(row.order.staffNotes ?? "");
                              setDeliveryContactName(row.order.deliveryContactName ?? "");
                              setDeliveryContactPhone(row.order.deliveryContactPhone ?? "");
                            }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {invoicesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading invoices…
                </div>
              ) : invoices.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No supplier invoices yet. Suppliers submit invoices through the portal.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(({ invoice, poNumber, supplierName }) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{supplierName ?? "—"}</TableCell>
                        <TableCell>{poNumber ?? "—"}</TableCell>
                        <TableCell>{invoice.amount}</TableCell>
                        <TableCell>
                          {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoiceStatusVariant(invoice.status)}>
                            {SUPPLIER_INVOICE_STATUS_LABELS[invoice.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          {INVOICE_TRANSITIONS[invoice.status].map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === "rejected" ? "outline" : "default"}
                              className={status === "rejected" ? "text-red-600 border-red-200 hover:bg-red-50" : ""}
                              disabled={updateInvoiceMutation.isPending}
                              onClick={() => updateInvoiceMutation.mutate({ invoiceId: invoice.id, status })}
                            >
                              {status === "accepted" ? "Accept" : status === "rejected" ? "Reject" : "Mark paid"}
                            </Button>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order detail / manage dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detailOrder?.order.orderNumber}</DialogTitle>
            <DialogDescription>
              {detailOrder?.customer
                ? `${detailOrder.customer.firstName} ${detailOrder.customer.lastName}`.trim()
                : "Unknown customer"}
              {detailOrder?.customer?.phone ? ` · ${detailOrder.customer.phone}` : ""}
              {detailOrder?.customer?.email ? ` · ${detailOrder.customer.email}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailOrder && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={orderStatusVariant(detailOrder.order.status)}>
                  {PORTAL_ORDER_STATUS_LABELS[detailOrder.order.status]}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {detailOrder.order.fulfillmentType === "pickup"
                    ? `Pickup${detailOrder.locationName ? ` · ${detailOrder.locationName}` : ""}`
                    : "Delivery"}
                </Badge>
              </div>

              {detailOrder.order.fulfillmentType === "delivery" && detailOrder.order.deliveryAddress ? (
                <p className="text-sm">
                  <span className="font-medium">Deliver to:</span> {detailOrder.order.deliveryAddress}
                </p>
              ) : null}

              {detailOrder.order.customerNotes ? (
                <p className="text-sm">
                  <span className="font-medium">Customer notes:</span> {detailOrder.order.customerNotes}
                </p>
              ) : null}

              {detailOrder.order.status === "not_received" ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  Customer reported this order as not received
                  {detailOrder.order.notReceivedAt
                    ? ` on ${new Date(detailOrder.order.notReceivedAt).toLocaleString()}`
                    : ""}
                  {detailOrder.order.notReceivedReason ? `: "${detailOrder.order.notReceivedReason}"` : "."}
                </p>
              ) : null}

              {detailOrder.order.receiptConfirmedAt ? (
                <p className="text-sm text-green-700">
                  Customer confirmed receipt on{" "}
                  {new Date(detailOrder.order.receiptConfirmedAt).toLocaleString()}.
                </p>
              ) : null}

              {detailOrder.order.status === "return_requested" ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Customer requested a return
                  {detailOrder.order.returnRequestedAt
                    ? ` on ${new Date(detailOrder.order.returnRequestedAt).toLocaleString()}`
                    : ""}
                  {detailOrder.order.returnReason ? `: "${detailOrder.order.returnReason}"` : "."} Process
                  the refund through the POS (look up the receipt under Returns), then mark this order
                  Returned — or move it back to Completed to decline.
                </p>
              ) : null}

              {detailOrder.order.status === "returned" && detailOrder.order.returnedAt ? (
                <p className="text-sm text-muted-foreground">
                  Returned on {new Date(detailOrder.order.returnedAt).toLocaleString()}.
                </p>
              ) : null}

              <ul className="text-sm divide-y rounded-lg border">
                {detailOrder.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {item.quantity} × {item.itemNameSnapshot}
                      {item.itemCodeSnapshot ? (
                        <span className="text-xs text-muted-foreground ml-1">({item.itemCodeSnapshot})</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium">{item.lineTotal}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between px-3 py-2 bg-muted/50 font-semibold">
                  <span>Total</span>
                  <span>
                    {detailOrder.order.currencyCode} {detailOrder.order.total}
                  </span>
                </li>
              </ul>

              {detailGraceOpen && !detailOrder.order.receiptConfirmedAt ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Waiting for the customer to confirm receipt. If they don't, you can mark it complete
                  after {detailGraceEnd!.toLocaleDateString()} ({ORDER_RECEIPT_GRACE_DAYS}-day grace
                  period) — or it will auto-complete.
                </p>
              ) : null}

              {detailTransitions.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Move to status</Label>
                    <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as PortalOrderStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose next status" />
                      </SelectTrigger>
                      <SelectContent>
                        {detailTransitions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {PORTAL_ORDER_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {nextStatus === "out_for_delivery" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="courier-name">Delivery person</Label>
                        <Input
                          id="courier-name"
                          value={deliveryContactName}
                          onChange={(e) => setDeliveryContactName(e.target.value)}
                          placeholder="Courier name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="courier-phone">Courier phone</Label>
                        <Input
                          id="courier-phone"
                          value={deliveryContactPhone}
                          onChange={(e) => setDeliveryContactPhone(e.target.value)}
                          placeholder="Shown to the customer"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-notes">Note to customer (optional)</Label>
                    <Textarea
                      id="staff-notes"
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="Visible to the customer on their order"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This order is in a final state and cannot be changed.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>
              Close
            </Button>
            {detailOrder && detailTransitions.length > 0 && (
              <Button
                disabled={!nextStatus || updateOrderMutation.isPending}
                onClick={() =>
                  nextStatus &&
                  updateOrderMutation.mutate({
                    orderId: detailOrder.order.id,
                    status: nextStatus,
                    staffNotes: staffNotes.trim() || null,
                    ...(nextStatus === "out_for_delivery"
                      ? {
                          deliveryContactName: deliveryContactName.trim() || null,
                          deliveryContactPhone: deliveryContactPhone.trim() || null,
                        }
                      : {}),
                  })
                }
              >
                {updateOrderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
