import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import MobileNav from "@/components/MobileNav";
import {
  Ambulance,
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  ClipboardList,
  Loader2,
  Activity,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
} from "lucide-react";
import type { AmbulanceRow, AmbulanceStockLine, AmbulanceInventoryActivityRow, AmbulanceStockTransferRow } from "./types";
import { OpsBadge, formatInventoryTransactionType } from "./ambulanceUi";
import { useToast } from "@/hooks/use-toast";

function safeFormatDate(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return format(parseISO(String(v)), "MMM d, yyyy HH:mm");
  } catch {
    return String(v);
  }
}

function activityCounterpartyLabel(row: AmbulanceInventoryActivityRow, ambulanceId: string): string {
  if (row.locationId === ambulanceId && row.counterpartyLocationName) {
    return `↔ ${row.counterpartyLocationName}`;
  }
  if (row.counterpartyLocationId === ambulanceId && row.locationName) {
    return `↔ ${row.locationName}`;
  }
  return row.counterpartyLocationName || row.locationName || "—";
}

export default function AmbulanceUnitDetail() {
  const [, params] = useRoute("/fleet/units/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [stockSearch, setStockSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const { data: row, isLoading, isError } = useQuery<
    AmbulanceRow & { stationedAtLocationName?: string | null }
  >({
    queryKey: ["/api/ambulances", id],
    queryFn: async () => {
      const res = await fetch(`/api/ambulances/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: Boolean(id),
  });

  const { data: stockSummary } = useQuery({
    queryKey: ["/api/ambulances", id, "stock-summary"],
    queryFn: async (): Promise<{
      lineCount: number;
      totalUnits: number;
      lowStockLineCount: number;
    }> => {
      const res = await fetch(`/api/ambulances/${id}/stock-summary`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: Boolean(id) && Boolean(row),
  });

  const { data: stockLines = [], isLoading: stockLoading } = useQuery<AmbulanceStockLine[]>({
    queryKey: ["/api/ambulances", id, "stock-on-board"],
    queryFn: async () => {
      const res = await fetch(`/api/ambulances/${id}/stock-on-board`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: Boolean(id) && Boolean(row),
  });

  const { data: activityRows = [], isLoading: activityLoading } = useQuery<AmbulanceInventoryActivityRow[]>({
    queryKey: ["/api/ambulances", id, "inventory-activity"],
    queryFn: async () => {
      const res = await fetch(`/api/ambulances/${id}/inventory-activity?limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: Boolean(id) && Boolean(row),
  });

  const { data: transferRows = [], isLoading: transfersLoading } = useQuery<AmbulanceStockTransferRow[]>({
    queryKey: ["/api/ambulances", id, "stock-transfers"],
    queryFn: async () => {
      const res = await fetch(`/api/ambulances/${id}/stock-transfers?limit=25`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: Boolean(id) && Boolean(row),
  });

  const receiveTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await fetch(`/api/stock-transfers/${transferId}/receive`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || "Failed to receive transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ambulances", id, "stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulances", id, "stock-on-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulances", id, "stock-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulances", id, "inventory-activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Transfer received",
        description: "Stock has been added to this fleet unit.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Receive failed",
        description: error.message || "Could not receive transfer.",
        variant: "destructive",
      });
    },
  });

  const filteredStock = stockLines.filter((line) => {
    if (lowOnly && !line.lowStock) return false;
    const q = stockSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      line.itemName.toLowerCase().includes(q) ||
      line.itemCode.toLowerCase().includes(q) ||
      (line.category && line.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-uventorybiz-light-gray pb-20 md:pb-8">
      <MobileNav />
      <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/fleet#fleet">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fleet list
          </Link>
        </Button>

        {isLoading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {isError && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle not found</CardTitle>
              <CardDescription>Check the link or return to the fleet list.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {row && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Ambulance className="h-8 w-8 text-uventorybiz-navy" />
                <h1 className="text-2xl font-semibold tracking-tight">{row.locationName}</h1>
                <span className="text-sm text-muted-foreground font-mono">{row.locationCode}</span>
                <OpsBadge status={row.ambulanceOpsStatus} />
                <span className="text-xs uppercase text-muted-foreground border rounded px-2 py-0.5">{row.status}</span>
              </div>
              {row.description && <p className="text-muted-foreground">{row.description}</p>}
              {stockSummary && (
                <div className="flex flex-wrap gap-2 text-sm pt-1">
                  <Badge variant="secondary" className="font-normal">
                    {stockSummary.lineCount} stock line{stockSummary.lineCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    {stockSummary.totalUnits} units on board
                  </Badge>
                  {stockSummary.lowStockLineCount > 0 && (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200 font-normal">
                      {stockSummary.lowStockLineCount} at/below minimum
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="tabs-list-custom mb-4">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-transparent h-auto p-1 gap-1 lg:gap-2">
                  <TabsTrigger value="overview" className="tab-trigger-custom text-xs sm:text-sm">
                    <MapPin className="h-4 w-4 mr-1 sm:mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="stock" className="tab-trigger-custom text-xs sm:text-sm">
                    <Package className="h-4 w-4 mr-1 sm:mr-2" />
                    On-board stock
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="tab-trigger-custom text-xs sm:text-sm">
                    <Activity className="h-4 w-4 mr-1 sm:mr-2" />
                    Movements
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="tab-trigger-custom text-xs sm:text-sm">
                    <Truck className="h-4 w-4 mr-1 sm:mr-2" />
                    Transfers
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Stationing
                      </CardTitle>
                      <CardDescription>Home post, clinic, or pooled coverage</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {row.stationedAtLocationName ? (
                        <p>
                          <span className="text-muted-foreground">Stationed at </span>
                          <span className="font-medium">{row.stationedAtLocationName}</span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not tied to a single post (multi-post / pooled)</p>
                      )}
                      {row.coverageNotes && (
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Coverage notes</p>
                          <p className="whitespace-pre-wrap">{row.coverageNotes}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                        {[row.callSign, row.fleetNumber, row.registrationPlate].some(Boolean) && (
                          <ul className="space-y-1">
                            {row.callSign && (
                              <li>
                                <span className="text-muted-foreground">Call sign: </span>
                                {row.callSign}
                              </li>
                            )}
                            {row.fleetNumber && (
                              <li>
                                <span className="text-muted-foreground">Fleet #: </span>
                                {row.fleetNumber}
                              </li>
                            )}
                            {row.registrationPlate && (
                              <li>
                                <span className="text-muted-foreground">Registration: </span>
                                {row.registrationPlate}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Inventory snapshot
                      </CardTitle>
                      <CardDescription>Same catalog and ledger as clinics and the central store</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {stockSummary ? (
                        <ul className="text-sm space-y-2">
                          <li>
                            <span className="text-muted-foreground">Stock lines: </span>
                            <span className="font-medium">{stockSummary.lineCount}</span>
                          </li>
                          <li>
                            <span className="text-muted-foreground">Total units on board: </span>
                            <span className="font-medium">{stockSummary.totalUnits}</span>
                          </li>
                          {stockSummary.lowStockLineCount > 0 && (
                            <li className="text-amber-700 dark:text-amber-400">
                              {stockSummary.lowStockLineCount} line(s) at or below minimum — review the On-board stock tab.
                            </li>
                          )}
                        </ul>
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90">
                          <Link href={`/inventory?locationId=${encodeURIComponent(id)}`}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Full inventory UI
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/stock-transfers">
                            <Truck className="h-4 w-4 mr-2" />
                            Stock transfers
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/transaction-history">
                            <Activity className="h-4 w-4 mr-2" />
                            All transactions
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <CardTitle>On-board stock check</CardTitle>
                      <CardDescription>
                        Lines with quantity at this fleet unit. Use the main Inventory app to adjust, transfer, or
                        receive stock.
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search item or code…"
                          className="pl-8"
                          value={stockSearch}
                          onChange={(e) => setStockSearch(e.target.value)}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lowOnly}
                          onChange={(e) => setLowOnly(e.target.checked)}
                          className="rounded border-input"
                        />
                        Low / min only
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stockLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredStock.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">
                        {stockLines.length === 0
                          ? "No stock lines at this location yet. Receive or transfer items to this unit from Inventory or Stock transfers."
                          : "No lines match your filters."}
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Min</TableHead>
                              <TableHead>UoM</TableHead>
                              <TableHead>Expiry</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStock.map((line) => (
                              <TableRow key={line.stockLineId}>
                                <TableCell>
                                  <div className="font-medium">{line.itemName}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{line.itemCode}</div>
                                </TableCell>
                                <TableCell className="text-sm capitalize">{line.category ?? "—"}</TableCell>
                                <TableCell className="text-right font-medium">
                                  <span className={line.lowStock ? "text-amber-700 font-semibold" : ""}>
                                    {line.currentStock}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{line.minimumStock}</TableCell>
                                <TableCell className="text-sm">{line.unitOfMeasure ?? "—"}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {line.expiryDate
                                    ? (() => {
                                        try {
                                          return format(parseISO(String(line.expiryDate)), "MMM d, yyyy");
                                        } catch {
                                          return String(line.expiryDate);
                                        }
                                      })()
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {line.lowStock ? (
                                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Low</Badge>
                                  ) : (
                                    <Badge variant="outline" className="capitalize">
                                      {line.status ?? "active"}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory movements</CardTitle>
                    <CardDescription>
                      Transactions where this unit is the location or the counterparty (issues, transfers, adjustments).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activityLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : activityRows.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">No inventory transactions recorded yet.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>When</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">Δ</TableHead>
                              <TableHead>Other location</TableHead>
                              <TableHead>By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activityRows.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {safeFormatDate(r.createdAt ?? r.transactionDate)}
                                </TableCell>
                                <TableCell className="text-sm">{formatInventoryTransactionType(r.transactionType)}</TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm">{r.itemName ?? "—"}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{r.itemCode ?? ""}</div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</TableCell>
                                <TableCell className="text-sm max-w-[200px]">{activityCounterpartyLabel(r, id)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{r.createdByName?.trim() || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock transfer documents</CardTitle>
                    <CardDescription>
                      Recent transfers to or from this unit. Complete dispatch and receive workflows in Stock transfers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transfersLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : transferRows.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">No stock transfers involve this unit yet.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Direction</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Route</TableHead>
                              <TableHead className="text-right">Lines</TableHead>
                              <TableHead>Updated</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transferRows.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  {t.direction === "out" && (
                                    <Badge variant="secondary" className="gap-1">
                                      <ArrowUpRight className="h-3 w-3" />
                                      Out
                                    </Badge>
                                  )}
                                  {t.direction === "in" && (
                                    <Badge variant="secondary" className="gap-1">
                                      <ArrowDownLeft className="h-3 w-3" />
                                      In
                                    </Badge>
                                  )}
                                  {t.direction === "both" && <Badge variant="outline">—</Badge>}
                                </TableCell>
                                <TableCell className="capitalize text-sm">{t.status.replace(/_/g, " ")}</TableCell>
                                <TableCell className="text-sm">
                                  <span className="text-muted-foreground">{t.fromLocationName}</span>
                                  <span className="mx-1">→</span>
                                  <span className="font-medium">{t.toLocationName}</span>
                                </TableCell>
                                <TableCell className="text-right">{t.itemCount}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{safeFormatDate(t.updatedAt)}</TableCell>
                                <TableCell className="text-right">
                                  {t.direction === "in" && t.status === "in_transit" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={receiveTransferMutation.isPending}
                                      onClick={() => receiveTransferMutation.mutate(t.id)}
                                    >
                                      <PackageCheck className="h-4 w-4 mr-1" />
                                      Receive
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="mt-4">
                      <Button variant="outline" asChild>
                        <Link href="/stock-transfers">Open stock transfers</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
