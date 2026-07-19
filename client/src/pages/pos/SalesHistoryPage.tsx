import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import MobileNav from "@/components/MobileNav";

type SaleStatus = "draft" | "completed" | "voided" | "returned";

interface SalesListRow {
  id: string;
  receiptNumber: string | null;
  status: SaleStatus;
  total: string;
  currencyCode: string;
  completedAt: string | null;
  createdAt: string | null;
  customerId: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  locationName: string | null;
  cashierFirstName: string | null;
  cashierLastName: string | null;
  itemCount: number;
  paymentMethods: string | null;
}

interface SalesListResponse {
  rows: SalesListRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface SaleReceipt {
  sale: {
    id: string;
    receiptNumber: string | null;
    status: string;
    subtotal: string;
    taxTotal: string;
    total: string;
    currencyCode: string;
    completedAt?: string | null;
  };
  lines: Array<{
    line: { quantity: number; unitPrice: string; taxAmount: string; lineTotal: string };
    itemName: string;
    itemCode: string;
  }>;
  payments: Array<{ method: string; amount: string }>;
  register?: { name: string } | null;
  location?: { locationName: string } | null;
  customer?: { firstName: string; lastName: string } | null;
}

interface ReturnableSale {
  sale: {
    id: string;
    receiptNumber: string | null;
    status: string;
    total: string;
    currencyCode: string;
    completedAt?: string | null;
  };
  lines: Array<{
    line: { inventoryItemId: string; quantity: number; unitPrice: string; taxRate: number };
    itemName: string;
    itemCode: string;
  }>;
  customer?: { firstName: string; lastName: string } | null;
  returnedQuantities: Record<string, number>;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function formatMoney(value: string | number, currency = "GHS") {
  const n = typeof value === "number" ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  draft: "Draft",
  completed: "Completed",
  voided: "Voided",
  returned: "Return",
};

function statusVariant(status: SaleStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "returned":
      return "secondary";
    case "voided":
      return "destructive";
    case "draft":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const PAGE_SIZE = 20;

export default function SalesHistoryPage() {
  const { toast } = useToast();
  const { settings } = useTenantSettings();
  const returnsEnabled = settings?.returnsEnabled !== false;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Receipt/view dialog
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  // Return dialog
  const [returnSale, setReturnSale] = useState<ReturnableSale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const [returnRefundMethod, setReturnRefundMethod] = useState<"cash" | "card" | "other">("cash");

  // POS redirects here with ?view=<saleId> after completing a sale so the
  // cashier lands on history with the receipt open, ready to print.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("view");
    if (id) {
      setViewSaleId(id);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    return `/api/pos/sales?${params.toString()}`;
  }, [page, statusFilter, search]);

  const { data, isLoading, refetch } = useQuery<SalesListResponse>({
    queryKey: [listUrl],
    queryFn: () => apiFetch(listUrl),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: viewReceipt, isLoading: viewLoading } = useQuery<SaleReceipt>({
    queryKey: [`/api/pos/sales/${viewSaleId}`],
    queryFn: () => apiFetch(`/api/pos/sales/${viewSaleId}`),
    enabled: !!viewSaleId,
  });

  // Print once the receipt has loaded when the Print action was used.
  useEffect(() => {
    if (autoPrint && viewSaleId && viewReceipt) {
      const timer = setTimeout(() => {
        window.print();
        setAutoPrint(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, viewSaleId, viewReceipt]);

  const openReturnMutation = useMutation({
    mutationFn: (receiptNumber: string) =>
      apiFetch<ReturnableSale>(`/api/pos/sales/by-receipt/${encodeURIComponent(receiptNumber)}`),
    onSuccess: (data) => {
      setReturnSale(data);
      setReturnQuantities({});
      setReturnReason("");
      setReturnRefundMethod("cash");
    },
    onError: (e: Error) =>
      toast({ title: "Could not load sale for return", description: e.message, variant: "destructive" }),
  });

  const returnRefundTotal = useMemo(() => {
    if (!returnSale) return 0;
    return returnSale.lines.reduce((sum, row) => {
      const qty = returnQuantities[row.line.inventoryItemId] ?? 0;
      const sub = qty * (parseFloat(row.line.unitPrice) || 0);
      return sum + sub + sub * (row.line.taxRate ?? 0);
    }, 0);
  }, [returnSale, returnQuantities]);

  const submitReturnMutation = useMutation({
    mutationFn: async () => {
      if (!returnSale) throw new Error("No sale selected");
      const lines = returnSale.lines
        .map((row) => ({
          inventoryItemId: row.line.inventoryItemId,
          quantity: returnQuantities[row.line.inventoryItemId] ?? 0,
        }))
        .filter((l) => l.quantity > 0);
      if (!lines.length) throw new Error("Enter a return quantity for at least one item");
      return apiFetch<SaleReceipt>(`/api/pos/sales/${returnSale.sale.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          lines,
          reason: returnReason.trim() || undefined,
          payments: [{ method: returnRefundMethod, amount: Number(returnRefundTotal.toFixed(2)) }],
        }),
      });
    },
    onSuccess: (receipt) => {
      setReturnSale(null);
      refetch();
      toast({ title: "Return processed", description: "Stock restored and a return receipt created." });
      setViewSaleId(receipt.sale.id);
    },
    onError: (e: Error) => toast({ title: "Return failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="container mx-auto p-4 pb-24 max-w-7xl space-y-4">
      <MobileNav />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ReceiptText className="h-6 w-6" />
            Sales history
          </h1>
          <p className="text-sm text-muted-foreground">
            All POS sales, returns, and voided transactions.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/pos">
            <Store className="h-4 w-4 mr-1" /> Open POS
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="relative flex-1 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search receipt # or customer"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value.trim()) {
                setPage(1);
                setSearch("");
              }
            }}
          />
        </form>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="returned">Returns</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sales…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No sales found{statusFilter !== "all" || search ? " for this filter" : " yet"}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const customerName = row.customerFirstName || row.customerLastName
                    ? `${row.customerFirstName ?? ""} ${row.customerLastName ?? ""}`.trim()
                    : null;
                  const salesperson = row.cashierFirstName || row.cashierLastName
                    ? `${row.cashierFirstName ?? ""} ${row.cashierLastName ?? ""}`.trim()
                    : "—";
                  const date = row.completedAt ?? row.createdAt;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground" title={row.id}>
                        {row.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.receiptNumber ?? "—"}
                      </TableCell>
                      <TableCell>{customerName ?? "Walk-in"}</TableCell>
                      <TableCell>{row.locationName ?? "—"}</TableCell>
                      <TableCell>{salesperson}</TableCell>
                      <TableCell className="text-right">{row.itemCount}</TableCell>
                      <TableCell className="capitalize">{row.paymentMethods ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatMoney(row.total, row.currencyCode)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{STATUS_LABELS[row.status]}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {date ? new Date(date).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="View"
                          onClick={() => setViewSaleId(row.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Print receipt"
                          disabled={!row.receiptNumber}
                          onClick={() => {
                            setAutoPrint(true);
                            setViewSaleId(row.id);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {returnsEnabled && row.status === "completed" && row.receiptNumber ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Return"
                            disabled={openReturnMutation.isPending}
                            onClick={() => openReturnMutation.mutate(row.receiptNumber!)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} sale{total === 1 ? "" : "s"}
          {total > 0 ? ` · page ${page} of ${pageCount}` : ""}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isLoading}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* View / print receipt dialog */}
      <Dialog
        open={!!viewSaleId}
        onOpenChange={(open) => {
          if (!open) {
            setViewSaleId(null);
            setAutoPrint(false);
          }
        }}
      >
        <DialogContent className="max-w-lg print:shadow-none" id="pos-receipt">
          <DialogHeader>
            <DialogTitle>Receipt {viewReceipt?.sale.receiptNumber ?? ""}</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading receipt…
            </div>
          ) : viewReceipt ? (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                {viewReceipt.sale.status === "returned" && <Badge variant="secondary">Return</Badge>}
                {viewReceipt.sale.status === "voided" && <Badge variant="destructive">Voided</Badge>}
                {viewReceipt.location?.locationName && <div>{viewReceipt.location.locationName}</div>}
                {viewReceipt.register?.name && <div>Register: {viewReceipt.register.name}</div>}
                {viewReceipt.customer && (
                  <div>
                    Customer: {viewReceipt.customer.firstName} {viewReceipt.customer.lastName}
                  </div>
                )}
                {viewReceipt.sale.completedAt && (
                  <div>{new Date(viewReceipt.sale.completedAt).toLocaleString()}</div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewReceipt.lines.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell>{row.itemName}</TableCell>
                      <TableCell className="text-right">{row.line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.line.lineTotal, viewReceipt.sale.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(viewReceipt.sale.subtotal, viewReceipt.sale.currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatMoney(viewReceipt.sale.taxTotal, viewReceipt.sale.currencyCode)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(viewReceipt.sale.total, viewReceipt.sale.currencyCode)}</span>
                </div>
              </div>
              {viewReceipt.payments.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="font-medium">Payments</div>
                  {viewReceipt.payments.map((p, i) => (
                    <div key={i} className="flex justify-between capitalize">
                      <span>{p.method}</span>
                      <span>{formatMoney(p.amount, viewReceipt.sale.currencyCode)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setViewSaleId(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()} disabled={!viewReceipt}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return dialog (pre-loaded from the selected sale) */}
      <Dialog open={!!returnSale} onOpenChange={(open) => !open && setReturnSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process a return</DialogTitle>
          </DialogHeader>
          {returnSale && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{returnSale.sale.receiptNumber}</span>
                {returnSale.sale.completedAt && (
                  <> · {new Date(returnSale.sale.completedAt).toLocaleString()}</>
                )}
                {returnSale.customer && (
                  <>
                    {" "}
                    · {returnSale.customer.firstName} {returnSale.customer.lastName}
                  </>
                )}
                <> · Total {formatMoney(returnSale.sale.total, returnSale.sale.currencyCode)}</>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right w-28">Return qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnSale.lines.map((row, index) => {
                    const itemId = row.line.inventoryItemId;
                    const alreadyReturned = returnSale.returnedQuantities[itemId] ?? 0;
                    const remaining = Math.max(row.line.quantity - alreadyReturned, 0);
                    return (
                      <TableRow key={itemId}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.itemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.itemCode} · {formatMoney(row.line.unitPrice, returnSale.sale.currencyCode)} each
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.line.quantity}</TableCell>
                        <TableCell className="text-right">{alreadyReturned}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            disabled={remaining === 0}
                            className="w-24 h-8 ml-auto"
                            value={returnQuantities[itemId] ?? 0}
                            onChange={(e) => {
                              const qty = Math.min(
                                Math.max(0, parseInt(e.target.value, 10) || 0),
                                remaining,
                              );
                              setReturnQuantities((prev) => ({ ...prev, [itemId]: qty }));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Refund method</Label>
                  <Select
                    value={returnRefundMethod}
                    onValueChange={(v: "cash" | "card" | "other") => setReturnRefundMethod(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Input
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. damaged, wrong item"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm font-medium">Refund total</span>
                <span className="font-semibold">
                  {formatMoney(returnRefundTotal, returnSale.sale.currencyCode)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnSale(null)}>
              Cancel
            </Button>
            <Button
              disabled={!returnSale || returnRefundTotal <= 0 || submitReturnMutation.isPending}
              onClick={() => submitReturnMutation.mutate()}
            >
              {submitReturnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
