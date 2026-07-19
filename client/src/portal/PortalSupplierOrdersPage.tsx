import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Receipt } from "lucide-react";
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

const PO_STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  ordered: "Ordered",
  partially_received: "Partially received",
  completed: "Completed",
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

  const openInvoiceDialog = (poId: string | null) => {
    setInvoicePoId(poId);
    setInvoiceNumber("");
    setInvoiceAmount("");
    setInvoiceDate("");
    setInvoiceNotes("");
    setInvoiceOpen(true);
  };

  const submitInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/supplier/invoices", {
        purchaseOrderId: invoicePoId,
        invoiceNumber: invoiceNumber.trim(),
        amount: invoiceAmount.trim(),
        invoiceDate: invoiceDate || null,
        notes: invoiceNotes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice submitted", description: "The business has been notified." });
      setInvoiceOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/supplier/invoices"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not submit invoice", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Purchase orders & invoices</h2>
        <p className="text-sm text-uventorybiz-gray">
          Purchase orders issued to you, and the invoices you have submitted.
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
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>PO number</TableHead>
                      <TableHead>Order date</TableHead>
                      <TableHead>Expected delivery</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pos.map((po, index) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>{po.totalAmount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {PO_STATUS_LABELS[po.status] ?? po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => setDetailPoId(po.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openInvoiceDialog(po.id)}>
                            <Receipt className="h-3.5 w-3.5 mr-1" />
                            Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button className={PORTAL_PRIMARY_BTN_CLASS} onClick={() => openInvoiceDialog(null)}>
              <Receipt className="h-4 w-4 mr-2" />
              Submit invoice
            </Button>
          </div>
          {invoicesLoading ? (
            <PortalLoadingBlock label="Loading invoices…" />
          ) : invoices.length === 0 ? (
            <PortalEmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoices you submit will appear here with their review status."
            />
          ) : (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(({ invoice, poNumber }, index) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* PO detail dialog */}
      <Dialog open={!!detailPoId} onOpenChange={(open) => !open && setDetailPoId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{poDetail?.po.poNumber ?? "Purchase order"}</DialogTitle>
            <DialogDescription>
              {poDetail
                ? `Ordered ${new Date(poDetail.po.orderDate).toLocaleDateString()} · ${
                    PO_STATUS_LABELS[poDetail.po.status] ?? poDetail.po.status
                  }`
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Total: {poDetail.po.totalAmount}</p>
                <Button size="sm" variant="outline" onClick={() => openInvoiceDialog(poDetail.po.id)}>
                  <Receipt className="h-3.5 w-3.5 mr-1" />
                  Submit invoice for this PO
                </Button>
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

      {/* Submit invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit invoice</DialogTitle>
            <DialogDescription>
              {invoicePoId
                ? `Against PO ${pos.find((po) => po.id === invoicePoId)?.poNumber ?? ""}`
                : "Not linked to a purchase order (you can link one from the PO list instead)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number">Invoice number</Label>
              <Input
                id="inv-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-amount">Amount</Label>
                <Input
                  id="inv-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
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
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              className={PORTAL_PRIMARY_BTN_CLASS}
              disabled={
                submitInvoiceMutation.isPending || !invoiceNumber.trim() || !invoiceAmount.trim()
              }
              onClick={() => submitInvoiceMutation.mutate()}
            >
              {submitInvoiceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
