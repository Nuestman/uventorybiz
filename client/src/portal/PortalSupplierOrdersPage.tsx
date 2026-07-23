import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, Receipt, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  SUPPLIER_INVOICE_STATUS_LABELS,
  type SupplierInvoiceStatus,
} from "@shared/portalOrders";
import { PORTAL_PRIMARY_BTN_CLASS, PortalEmptyState, PortalLoadingBlock } from "./portalUi";

type SupplierPo = {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  totalAmount: string;
  status: string;
  notes: string | null;
  createdAt: string | null;
};

type SupplierPoDetail = {
  po: SupplierPo;
  items: Array<{
    id: string;
    itemName: string | null;
    itemCode: string | null;
    itemDescription: string | null;
    quantityOrdered: number;
    quantityReceived: number | null;
    unitCost: string;
    totalCost: string;
  }>;
  activeInvoice: { id: string; invoiceNumber: string; status: SupplierInvoiceStatus } | null;
  invoicePrefill: {
    invoiceNumber: string;
    amount: string;
    invoiceDate: string;
  };
};

type SupplierInvoiceRow = {
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
};

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

function poStatusLabel(status: string): string {
  return PURCHASE_ORDER_STATUS_LABELS[status] ?? status;
}

export default function PortalSupplierOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [detailPoId, setDetailPoId] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoicePoId, setInvoicePoId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const { data: pos = [], isLoading: posLoading } = useQuery<SupplierPo[]>({
    queryKey: ["/api/portal/supplier/purchase-orders"],
    queryFn: getQueryFn<SupplierPo[]>({ on401: "throw" }),
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<SupplierInvoiceRow[]>({
    queryKey: ["/api/portal/supplier/invoices"],
    queryFn: getQueryFn<SupplierInvoiceRow[]>({ on401: "throw" }),
  });

  const { data: poDetail, isLoading: detailLoading } = useQuery<SupplierPoDetail>({
    queryKey: [detailPoId ? `/api/portal/supplier/purchase-orders/${detailPoId}` : null],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!detailPoId,
  });

  const invalidatePo = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/portal/supplier/purchase-orders"] });
    if (detailPoId) {
      queryClient.invalidateQueries({
        queryKey: [`/api/portal/supplier/purchase-orders/${detailPoId}`],
      });
    }
  };

  const confirmMutation = useMutation({
    mutationFn: async (poId: string) => {
      const res = await apiRequest("POST", `/api/portal/supplier/purchase-orders/${poId}/confirm`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order confirmed", description: "The buyer can expect shipment next." });
      invalidatePo();
    },
    onError: (err: Error) => {
      toast({ title: "Could not confirm", description: err.message, variant: "destructive" });
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (poId: string) => {
      const res = await apiRequest("POST", `/api/portal/supplier/purchase-orders/${poId}/ship`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as shipped", description: "Waiting for the buyer to receive the goods." });
      invalidatePo();
    },
    onError: (err: Error) => {
      toast({ title: "Could not mark shipped", description: err.message, variant: "destructive" });
    },
  });

  const openInvoiceDialog = () => {
    if (!poDetail || !detailPoId) return;
    if (poDetail.activeInvoice) {
      toast({
        title: "Invoice already submitted",
        description: `Invoice ${poDetail.activeInvoice.invoiceNumber} is ${poDetail.activeInvoice.status}.`,
      });
      return;
    }
    setInvoicePoId(detailPoId);
    setInvoiceNumber(poDetail.invoicePrefill.invoiceNumber);
    setInvoiceAmount(poDetail.invoicePrefill.amount);
    setInvoiceDate(poDetail.invoicePrefill.invoiceDate);
    setInvoiceNotes("");
    setInvoiceOpen(true);
  };

  const submitInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/supplier/invoices", {
        purchaseOrderId: invoicePoId,
        amount: invoiceAmount.trim(),
        invoiceDate: invoiceDate || null,
        notes: invoiceNotes.trim() || null,
      });
      return res.json() as Promise<{ invoiceId: string; invoiceNumber: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice submitted",
        description: `Invoice ${data.invoiceNumber} sent to the business.`,
      });
      setInvoiceOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/supplier/invoices"] });
      invalidatePo();
    },
    onError: (err: Error) => {
      toast({ title: "Could not submit invoice", description: err.message, variant: "destructive" });
    },
  });

  const canInvoice =
    poDetail &&
    (poDetail.po.status === "partially_received" || poDetail.po.status === "completed") &&
    !poDetail.activeInvoice;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Purchase orders & invoices</h2>
        <p className="text-sm text-uventorybiz-gray">
          Confirm POs, mark them shipped, then invoice after the buyer receives the goods.
        </p>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos">Purchase orders</TabsTrigger>
          <TabsTrigger value="invoices">My invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-4">
          {posLoading ? (
            <PortalLoadingBlock label="Loading purchase orders…" />
          ) : pos.length === 0 ? (
            <PortalEmptyState
              icon={FileText}
              title="No purchase orders"
              description="Purchase orders issued to you by the business will appear here."
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{poStatusLabel(po.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{po.totalAmount}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setDetailPoId(po.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {invoicesLoading ? (
            <PortalLoadingBlock label="Loading invoices…" />
          ) : invoices.length === 0 ? (
            <PortalEmptyState
              icon={Receipt}
              title="No invoices yet"
              description="After the buyer receives a PO, submit your invoice from the purchase order detail."
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>PO</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(({ invoice, poNumber }) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{poNumber ?? "—"}</TableCell>
                      <TableCell>{invoice.amount}</TableCell>
                      <TableCell>
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusVariant(invoice.status)}>
                          {SUPPLIER_INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailPoId} onOpenChange={(open) => !open && setDetailPoId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{poDetail?.po.poNumber ?? "Purchase order"}</DialogTitle>
            <DialogDescription>
              {poDetail
                ? `Ordered ${new Date(poDetail.po.orderDate).toLocaleDateString()} · ${poStatusLabel(poDetail.po.status)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <PortalLoadingBlock label="Loading purchase order…" />
          ) : poDetail ? (
            <div className="space-y-3">
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poDetail.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <span className="font-medium">{item.itemName ?? item.itemDescription ?? "Item"}</span>
                          {item.itemCode ? (
                            <span className="text-xs text-uventorybiz-gray ml-1.5">({item.itemCode})</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                        <TableCell className="text-right">{item.quantityReceived ?? 0}</TableCell>
                        <TableCell className="text-right">{item.unitCost}</TableCell>
                        <TableCell className="text-right">{item.totalCost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Total: {poDetail.po.totalAmount}</p>
                <div className="flex flex-wrap gap-2">
                  {poDetail.po.status === "approved" ? (
                    <Button
                      size="sm"
                      className={PORTAL_PRIMARY_BTN_CLASS}
                      disabled={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(poDetail.po.id)}
                    >
                      {confirmMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Confirm purchase order
                    </Button>
                  ) : null}
                  {poDetail.po.status === "ordered" ? (
                    <Button
                      size="sm"
                      className={PORTAL_PRIMARY_BTN_CLASS}
                      disabled={shipMutation.isPending}
                      onClick={() => shipMutation.mutate(poDetail.po.id)}
                    >
                      {shipMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Truck className="h-3.5 w-3.5 mr-1" />
                      )}
                      Mark as shipped
                    </Button>
                  ) : null}
                  {poDetail.po.status === "shipped" ? (
                    <p className="text-sm text-uventorybiz-gray">Waiting for the buyer to receive.</p>
                  ) : null}
                  {canInvoice ? (
                    <Button size="sm" variant="outline" onClick={openInvoiceDialog}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Submit invoice
                    </Button>
                  ) : null}
                  {poDetail.activeInvoice ? (
                    <Badge variant="secondary">
                      Invoice {poDetail.activeInvoice.invoiceNumber} · {poDetail.activeInvoice.status}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {poDetail.po.notes ? (
                <p className="text-sm text-uventorybiz-gray">
                  <span className="font-medium text-gray-700">Notes:</span> {poDetail.po.notes}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit invoice</DialogTitle>
            <DialogDescription>
              {invoicePoId
                ? `Against PO ${pos.find((po) => po.id === invoicePoId)?.poNumber ?? poDetail?.po.poNumber ?? ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number">Invoice number</Label>
              <Input id="inv-number" value={invoiceNumber} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Assigned automatically.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-amount">Amount</Label>
                <Input
                  id="inv-amount"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-date">Invoice date</Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-notes">Notes (optional)</Label>
              <Textarea
                id="inv-notes"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              className={PORTAL_PRIMARY_BTN_CLASS}
              disabled={submitInvoiceMutation.isPending || !invoiceAmount.trim() || !invoicePoId}
              onClick={() => submitInvoiceMutation.mutate()}
            >
              {submitInvoiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
