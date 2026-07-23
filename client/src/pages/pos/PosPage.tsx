import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import MobileNav from "@/components/MobileNav";
import { Loader2, Plus, Printer, RotateCcw, ScanBarcode, Search, Trash2, UserRound, X, XCircle } from "lucide-react";
import {
  POS_PAYMENT_METHODS,
  POS_PAYMENT_METHOD_LABELS,
  type PosPaymentMethod,
} from "@shared/posPayments";

interface PosRegister {
  id: string;
  name: string;
  locationId: string;
  locationName?: string | null;
  isActive: boolean;
}

interface PosShift {
  id: string;
  registerId: string;
  status: "open" | "closed";
  openingFloat: string;
  openedAt: string;
}

interface CartLine {
  inventoryItemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  barcodeSnapshot?: string | null;
  availableStock: number;
}

interface PaymentRow {
  method: PosPaymentMethod;
  amount: string;
}

interface PosCustomer {
  id: string;
  customerNumber?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
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
    line: {
      inventoryItemId: string;
      quantity: number;
      unitPrice: string;
      taxRate: number;
    };
    itemName: string;
    itemCode: string;
  }>;
  customer?: PosCustomer | null;
  returnedQuantities: Record<string, number>;
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
    line: {
      quantity: number;
      unitPrice: string;
      taxAmount: string;
      lineTotal: string;
    };
    itemName: string;
    itemCode: string;
  }>;
  payments: Array<{ method: string; amount: string }>;
  register?: { name: string } | null;
  location?: { locationName: string } | null;
  customer?: PosCustomer | null;
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

function computeCartTotals(cart: CartLine[]) {
  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxTotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice * l.taxRate, 0);
  return { subtotal, taxTotal, total: subtotal + taxTotal };
}

export default function PosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { settings } = useTenantSettings();
  const returnsEnabled = settings?.returnsEnabled !== false;
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draftSaleId, setDraftSaleId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([{ method: "cash", amount: "" }]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<SaleReceipt | null>(null);
  const [openShiftFloat, setOpenShiftFloat] = useState("0");
  const [closeShiftFloat, setCloseShiftFloat] = useState("");
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showNewRegister, setShowNewRegister] = useState(false);
  const [newRegisterName, setNewRegisterName] = useState("");
  const [newRegisterLocationId, setNewRegisterLocationId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showReturns, setShowReturns] = useState(false);
  const [returnReceiptQuery, setReturnReceiptQuery] = useState("");
  const [returnSale, setReturnSale] = useState<ReturnableSale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const [returnRefundMethod, setReturnRefundMethod] = useState<PaymentRow["method"]>("cash");

  const { data: registers = [], isLoading: registersLoading } = useQuery<PosRegister[]>({
    queryKey: ["/api/pos/registers"],
    queryFn: () => apiFetch("/api/pos/registers"),
  });

  const selectedRegister = useMemo(
    () => registers.find((r) => r.id === selectedRegisterId),
    [registers, selectedRegisterId],
  );

  const { data: currentShift, refetch: refetchShift } = useQuery<PosShift | null>({
    queryKey: ["/api/pos/shifts/current", selectedRegisterId],
    queryFn: () => apiFetch(`/api/pos/shifts/current?registerId=${selectedRegisterId}`),
    enabled: !!selectedRegisterId,
  });

  const { data: searchResults = [] } = useQuery<
    Array<{ item: { id: string; itemName: string; itemCode: string; barcode?: string | null }; stock: { currentStock?: number | null; unitCost?: string | null } }>
  >({
    queryKey: ["/api/pos/items/search", selectedRegister?.locationId, searchQuery],
    queryFn: () =>
      apiFetch(
        `/api/pos/items/search?locationId=${selectedRegister!.locationId}&q=${encodeURIComponent(searchQuery)}`,
      ),
    enabled: !!selectedRegister?.locationId && searchQuery.trim().length >= 2,
  });

  const { data: customerResults = [] } = useQuery<PosCustomer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: () => apiFetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`),
    enabled: customerSearch.trim().length >= 2,
  });

  const { data: locations = [] } = useQuery<Array<{ id: string; locationName: string }>>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (registers.length === 1 && !selectedRegisterId) {
      setSelectedRegisterId(registers[0].id);
    }
  }, [registers, selectedRegisterId]);

  const cartTotals = useMemo(() => computeCartTotals(cart), [cart]);

  const addToCart = useCallback(
    (item: { id: string; itemName: string; itemCode: string; barcode?: string | null }, stock?: { currentStock?: number | null; unitCost?: string | null }) => {
      const unitPrice = parseFloat(stock?.unitCost ?? "0") || 0;
      const availableStock = stock?.currentStock ?? 0;
      setCart((prev) => {
        const existing = prev.find((l) => l.inventoryItemId === item.id);
        if (existing) {
          return prev.map((l) =>
            l.inventoryItemId === item.id
              ? { ...l, quantity: Math.min(l.quantity + 1, availableStock || l.quantity + 1) }
              : l,
          );
        }
        return [
          ...prev,
          {
            inventoryItemId: item.id,
            itemName: item.itemName,
            itemCode: item.itemCode,
            quantity: 1,
            unitPrice,
            taxRate: 0,
            barcodeSnapshot: item.barcode ?? null,
            availableStock,
          },
        ];
      });
      setSearchQuery("");
      setBarcodeInput("");
      barcodeRef.current?.focus();
    },
    [],
  );

  const openShiftMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/pos/shifts/open", {
        method: "POST",
        body: JSON.stringify({ registerId: selectedRegisterId, openingFloat: parseFloat(openShiftFloat) || 0 }),
      }),
    onSuccess: () => {
      refetchShift();
      setShowOpenShift(false);
      toast({ title: "Shift opened" });
    },
    onError: (e: Error) => toast({ title: "Failed to open shift", description: e.message, variant: "destructive" }),
  });

  const closeShiftMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/pos/shifts/${currentShift!.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingFloat: parseFloat(closeShiftFloat) || 0 }),
      }),
    onSuccess: () => {
      refetchShift();
      setShowCloseShift(false);
      setCart([]);
      setDraftSaleId(null);
      toast({ title: "Shift closed" });
    },
    onError: (e: Error) => toast({ title: "Failed to close shift", description: e.message, variant: "destructive" }),
  });

  const createRegisterMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/pos/registers", {
        method: "POST",
        body: JSON.stringify({ name: newRegisterName, locationId: newRegisterLocationId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/registers"] });
      setShowNewRegister(false);
      setNewRegisterName("");
      toast({ title: "Register created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create register", description: e.message, variant: "destructive" }),
  });

  const completeSaleMutation = useMutation({
    mutationFn: async () => {
      if (!currentShift || !selectedRegisterId) throw new Error("Open a shift first");
      let saleId = draftSaleId;
      if (!saleId) {
        const sale = await apiFetch<{ id: string }>("/api/pos/sales", {
          method: "POST",
          body: JSON.stringify({
            registerId: selectedRegisterId,
            shiftId: currentShift.id,
            customerId: selectedCustomer?.id ?? null,
          }),
        });
        saleId = sale.id;
        setDraftSaleId(saleId);
      }
      await apiFetch(`/api/pos/sales/${saleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          lines: cart.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            barcodeSnapshot: l.barcodeSnapshot,
          })),
        }),
      });
      const paymentPayload = payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({ method: p.method, amount: parseFloat(p.amount) }));
      const receipt = await apiFetch<SaleReceipt>(`/api/pos/sales/${saleId}/pay`, {
        method: "POST",
        body: JSON.stringify({ payments: paymentPayload }),
      });
      return receipt;
    },
    onSuccess: (receipt) => {
      setCart([]);
      setDraftSaleId(null);
      setPayments([{ method: "cash", amount: "" }]);
      setSelectedCustomer(null);
      setCustomerSearch("");
      toast({ title: "Sale completed" });
      // Land on sales history with the receipt open, ready to print.
      navigate(`/sales?view=${receipt.sale.id}`);
    },
    onError: (e: Error) => toast({ title: "Checkout failed", description: e.message, variant: "destructive" }),
  });

  const voidSaleMutation = useMutation({
    mutationFn: () => apiFetch(`/api/pos/sales/${draftSaleId}/void`, { method: "POST" }),
    onSuccess: () => {
      setDraftSaleId(null);
      setCart([]);
      toast({ title: "Sale voided" });
    },
    onError: (e: Error) => toast({ title: "Void failed", description: e.message, variant: "destructive" }),
  });

  const lookupReturnSaleMutation = useMutation({
    mutationFn: (receiptNumber: string) =>
      apiFetch<ReturnableSale>(`/api/pos/sales/by-receipt/${encodeURIComponent(receiptNumber.trim())}`),
    onSuccess: (data) => {
      if (data.sale.status !== "completed") {
        setReturnSale(null);
        toast({
          title: "Sale is not returnable",
          description: `Receipt ${data.sale.receiptNumber ?? ""} has status "${data.sale.status}". Only completed sales can be returned.`,
          variant: "destructive",
        });
        return;
      }
      setReturnSale(data);
      setReturnQuantities({});
      setReturnReason("");
    },
    onError: (e: Error) => {
      setReturnSale(null);
      toast({ title: "Receipt not found", description: e.message, variant: "destructive" });
    },
  });

  const returnRefundTotal = useMemo(() => {
    if (!returnSale) return 0;
    return returnSale.lines.reduce((sum, row) => {
      const qty = returnQuantities[row.line.inventoryItemId] ?? 0;
      const unitPrice = parseFloat(row.line.unitPrice) || 0;
      const sub = qty * unitPrice;
      return sum + sub + sub * (row.line.taxRate ?? 0);
    }, 0);
  }, [returnSale, returnQuantities]);

  const submitReturnMutation = useMutation({
    mutationFn: async () => {
      if (!returnSale) throw new Error("Look up a receipt first");
      const lines = returnSale.lines
        .map((row) => ({ inventoryItemId: row.line.inventoryItemId, quantity: returnQuantities[row.line.inventoryItemId] ?? 0 }))
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
      setShowReturns(false);
      setReturnSale(null);
      setReturnReceiptQuery("");
      setReturnQuantities({});
      setReturnReason("");
      setReceiptData(receipt);
      setReceiptOpen(true);
      toast({ title: "Return processed", description: "Stock has been restored and a return receipt created." });
    },
    onError: (e: Error) => toast({ title: "Return failed", description: e.message, variant: "destructive" }),
  });

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegister?.locationId || !barcodeInput.trim()) return;
    try {
      const result = await apiFetch<{ item: { id: string; itemName: string; itemCode: string; barcode?: string | null }; stock: { currentStock?: number | null; unitCost?: string | null } }>(
        `/api/pos/items/barcode/${encodeURIComponent(barcodeInput.trim())}?locationId=${selectedRegister.locationId}`,
      );
      addToCart(result.item, result.stock);
    } catch (err) {
      toast({
        title: "Barcode not found",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const paymentTotal = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4 pb-24 max-w-6xl space-y-4">
      <MobileNav />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Register terminal — scan, sell, and print receipts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnsEnabled ? (
            <Button variant="outline" size="sm" onClick={() => setShowReturns(true)}>
              <RotateCcw className="h-4 w-4 mr-1" /> Returns
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setShowNewRegister(true)}>
            <Plus className="h-4 w-4 mr-1" /> New register
          </Button>
          {currentShift?.status === "open" ? (
            <Button variant="outline" size="sm" onClick={() => setShowCloseShift(true)}>
              Close shift
            </Button>
          ) : (
            <Button size="sm" disabled={!selectedRegisterId} onClick={() => setShowOpenShift(true)}>
              Open shift
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Register & products</CardTitle>
            <CardDescription>Select a till, scan barcodes, or search inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Register</Label>
                <Select value={selectedRegisterId} onValueChange={setSelectedRegisterId}>
                  <SelectTrigger>
                    <SelectValue placeholder={registersLoading ? "Loading..." : "Select register"} />
                  </SelectTrigger>
                  <SelectContent>
                    {registers.filter((r) => r.isActive).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} {r.locationName ? `· ${r.locationName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                  {currentShift?.status === "open" ? (
                    <>
                      <Badge>Open</Badge>
                      <span className="text-muted-foreground">Float {formatMoney(currentShift.openingFloat)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No open shift</span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={barcodeRef}
                  className="pl-9"
                  placeholder="Scan or enter barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  disabled={!currentShift || currentShift.status !== "open"}
                />
              </div>
              <Button type="submit" disabled={!barcodeInput.trim() || !currentShift}>Add</Button>
            </form>

            <div className="space-y-2">
              <Label>Search products</Label>
              <Input
                placeholder="Search by name, code, or barcode"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!currentShift || currentShift.status !== "open"}
              />
              {searchResults.length > 0 && (
                <div className="rounded-md border divide-y max-h-48 overflow-auto">
                  {searchResults.map(({ item, stock }) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                      onClick={() => addToCart(item, stock)}
                    >
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-muted-foreground">{item.itemCode} · Stock {stock.currentStock ?? 0}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
            <CardDescription>{cart.length} line{cart.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </span>
                    {selectedCustomer.customerNumber && (
                      <span className="text-xs text-muted-foreground truncate">{selectedCustomer.customerNumber}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedCustomer(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search customers by name, phone, or number"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      disabled={!!draftSaleId}
                    />
                  </div>
                  {customerSearch.trim().length >= 2 && customerResults.length > 0 && (
                    <div className="rounded-md border divide-y max-h-36 overflow-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch("");
                          }}
                        >
                          <div className="font-medium">{c.firstName} {c.lastName}</div>
                          <div className="text-muted-foreground text-xs">
                            {[c.customerNumber, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {draftSaleId && (
                    <p className="text-xs text-muted-foreground">Customer is locked once a draft sale exists. Void the draft to change it.</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Scan or search to add items.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-auto">
                {cart.map((line) => (
                  <div key={line.inventoryItemId} className="flex items-start justify-between gap-2 text-sm border rounded-md p-2">
                    <div>
                      <div className="font-medium">{line.itemName}</div>
                      <div className="text-muted-foreground">{formatMoney(line.unitPrice)} × {line.quantity}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        className="w-16 h-8"
                        value={line.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setCart((prev) =>
                            prev.map((l) => (l.inventoryItemId === line.inventoryItemId ? { ...l, quantity: qty } : l)),
                          );
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCart((prev) => prev.filter((l) => l.inventoryItemId !== line.inventoryItemId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(cartTotals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatMoney(cartTotals.taxTotal)}</span></div>
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatMoney(cartTotals.total)}</span></div>
            </div>

            <div className="space-y-2">
              <Label>Payments (split tender OK)</Label>
              {payments.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select
                    value={p.method}
                    onValueChange={(v: PaymentRow["method"]) =>
                      setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, method: v } : row)))
                    }
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POS_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {POS_PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Amount"
                    value={p.amount}
                    onChange={(e) =>
                      setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, amount: e.target.value } : row)))
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayments((prev) => [...prev, { method: "cash", amount: "" }])}
              >
                Add payment
              </Button>
              <p className="text-xs text-muted-foreground">
                Paid {formatMoney(paymentTotal)} / {formatMoney(cartTotals.total)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                disabled={!cart.length || !currentShift || completeSaleMutation.isPending || paymentTotal + 0.001 < cartTotals.total}
                onClick={() => completeSaleMutation.mutate()}
              >
                {completeSaleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete sale
              </Button>
              {draftSaleId && (
                <Button variant="outline" disabled={voidSaleMutation.isPending} onClick={() => voidSaleMutation.mutate()}>
                  <XCircle className="h-4 w-4 mr-1" /> Void draft
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showOpenShift} onOpenChange={setShowOpenShift}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open shift</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Opening float</Label>
            <Input type="number" min={0} step="0.01" value={openShiftFloat} onChange={(e) => setOpenShiftFloat(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenShift(false)}>Cancel</Button>
            <Button onClick={() => openShiftMutation.mutate()} disabled={openShiftMutation.isPending}>Open shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseShift} onOpenChange={setShowCloseShift}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close shift</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Closing float (cash in drawer)</Label>
            <Input type="number" min={0} step="0.01" value={closeShiftFloat} onChange={(e) => setCloseShiftFloat(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseShift(false)}>Cancel</Button>
            <Button onClick={() => closeShiftMutation.mutate()} disabled={closeShiftMutation.isPending}>Close shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewRegister} onOpenChange={setShowNewRegister}>
        <DialogContent>
          <DialogHeader><DialogTitle>New register</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newRegisterName} onChange={(e) => setNewRegisterName(e.target.value)} placeholder="Front counter" />
            </div>
            <div className="space-y-2">
              <Label>Store location</Label>
              <Select value={newRegisterLocationId} onValueChange={setNewRegisterLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRegister(false)}>Cancel</Button>
            <Button
              onClick={() => createRegisterMutation.mutate()}
              disabled={!newRegisterName.trim() || !newRegisterLocationId || createRegisterMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReturns}
        onOpenChange={(open) => {
          setShowReturns(open);
          if (!open) {
            setReturnSale(null);
            setReturnReceiptQuery("");
            setReturnQuantities({});
            setReturnReason("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process a return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (returnReceiptQuery.trim()) lookupReturnSaleMutation.mutate(returnReceiptQuery);
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Receipt number (e.g. RCP-20260716-0001)"
                  value={returnReceiptQuery}
                  onChange={(e) => setReturnReceiptQuery(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!returnReceiptQuery.trim() || lookupReturnSaleMutation.isPending}>
                {lookupReturnSaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
              </Button>
            </form>

            {returnSale && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{returnSale.sale.receiptNumber}</span>
                  {returnSale.sale.completedAt && <> · {new Date(returnSale.sale.completedAt).toLocaleString()}</>}
                  {returnSale.customer && (
                    <> · {returnSale.customer.firstName} {returnSale.customer.lastName}</>
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
                            <div className="text-xs text-muted-foreground">{row.itemCode} · {formatMoney(row.line.unitPrice, returnSale.sale.currencyCode)} each</div>
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
                                const qty = Math.min(Math.max(0, parseInt(e.target.value, 10) || 0), remaining);
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
                    <Select value={returnRefundMethod} onValueChange={(v: PaymentRow["method"]) => setReturnRefundMethod(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POS_PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {POS_PAYMENT_METHOD_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (optional)</Label>
                    <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="e.g. damaged, wrong item" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">Refund total</span>
                  <span className="font-semibold">{formatMoney(returnRefundTotal, returnSale.sale.currencyCode)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturns(false)}>Cancel</Button>
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

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg print:shadow-none" id="pos-receipt">
          <DialogHeader>
            <DialogTitle>Receipt {receiptData?.sale.receiptNumber ?? ""}</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                {receiptData.sale.status === "returned" && <Badge variant="secondary">Return</Badge>}
                {receiptData.location?.locationName && <div>{receiptData.location.locationName}</div>}
                {receiptData.register?.name && <div>Register: {receiptData.register.name}</div>}
                {receiptData.customer && (
                  <div>Customer: {receiptData.customer.firstName} {receiptData.customer.lastName}</div>
                )}
                {receiptData.sale.completedAt && <div>{new Date(receiptData.sale.completedAt).toLocaleString()}</div>}
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
                  {receiptData.lines.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell>{row.itemName}</TableCell>
                      <TableCell className="text-right">{row.line.quantity}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.line.lineTotal, receiptData.sale.currencyCode)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(receiptData.sale.subtotal, receiptData.sale.currencyCode)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{formatMoney(receiptData.sale.taxTotal, receiptData.sale.currencyCode)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(receiptData.sale.total, receiptData.sale.currencyCode)}</span></div>
              </div>
              {receiptData.payments.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="font-medium">Payments</div>
                  {receiptData.payments.map((p, i) => (
                    <div key={i} className="flex justify-between capitalize">
                      <span>{p.method}</span>
                      <span>{formatMoney(p.amount, receiptData.sale.currencyCode)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>Close</Button>
            <Button onClick={printReceipt}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
