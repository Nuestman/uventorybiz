import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import MobileNav from "@/components/MobileNav";
import { Package, Truck, Inbox, Send, CheckCircle, Clock, MapPin, Plus, Trash2, MoreHorizontal, Eye, Pencil, XCircle, PackageCheck, X, Save } from "lucide-react";

interface CareLocation {
  id: string;
  locationName: string;
  locationCode: string;
  isPrimary?: boolean;
}

interface StockRequisitionItem {
  id: string;
  itemId: string;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  unitOfMeasure?: string | null;
}

interface StockRequisition {
  id: string;
  requestingLocationId: string;
  fulfillingLocationId: string;
  status: string;
  requestedAt: string;
  notes?: string | null;
  items?: StockRequisitionItem[];
}

interface StockTransferItem {
  id: string;
  itemId: string;
  quantityPlanned: number;
  quantityDispatched?: number | null;
  quantityReceived?: number | null;
}

interface StockTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  requisitionId?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  items?: StockTransferItem[];
}

type RequisitionLine = { itemId: string; requestedQuantity: number };
type TransferLine = { itemId: string; quantityPlanned: number };
type ApproveLine = { itemId: string; requestedQuantity: number; approvedQuantity: number };

export default function StockTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeLocation, isMultiLocation } = useActiveLocation();
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reqFulfillingId, setReqFulfillingId] = useState("");
  const [reqLines, setReqLines] = useState<RequisitionLine[]>([{ itemId: "", requestedQuantity: 0 }]);
  const [reqNotes, setReqNotes] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferLines, setTransferLines] = useState<TransferLine[]>([{ itemId: "", quantityPlanned: 0 }]);
  const [transferNotes, setTransferNotes] = useState("");
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveReq, setApproveReq] = useState<StockRequisition | null>(null);
  const [approveLines, setApproveLines] = useState<ApproveLine[]>([]);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveTransferTarget, setReceiveTransferTarget] = useState<StockTransfer | null>(null);
  const [viewTransferModalOpen, setViewTransferModalOpen] = useState(false);
  const [viewTransferTarget, setViewTransferTarget] = useState<StockTransfer | null>(null);
  const [viewRequisitionModalOpen, setViewRequisitionModalOpen] = useState(false);
  const [viewRequisitionTarget, setViewRequisitionTarget] = useState<StockRequisition | null>(null);
  const [editRequisitionModalOpen, setEditRequisitionModalOpen] = useState(false);
  const [editRequisitionTarget, setEditRequisitionTarget] = useState<StockRequisition | null>(null);
  const [editReqLines, setEditReqLines] = useState<RequisitionLine[]>([]);
  const [editReqNotes, setEditReqNotes] = useState("");

  const { data: locations = [] } = useQuery<CareLocation[]>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: requisitions = [], isLoading: reqLoading } = useQuery<StockRequisition[]>({
    queryKey: ["/api/stock-requisitions"],
    queryFn: async () => {
      const res = await fetch("/api/stock-requisitions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requisitions");
      return res.json();
    },
  });

  const { data: transfers = [], isLoading: transLoading } = useQuery<StockTransfer[]>({
    queryKey: ["/api/stock-transfers"],
    queryFn: async () => {
      const res = await fetch("/api/stock-transfers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transfers");
      return res.json();
    },
  });

  const myId = activeLocation?.id;

  const { data: inventoryItems = [] } = useQuery<{ id: string; itemId?: string; itemCode: string; itemName: string }[]>({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Requisition modal: only items at the selected supplying (fulfilling) location
  const { data: requisitionInventory = [] } = useQuery<{ id: string; itemId?: string; itemCode: string; itemName: string; currentStock: number; unitOfMeasure: string }[]>({
    queryKey: ["/api/inventory", "requisition", reqFulfillingId],
    queryFn: async () => {
      if (!reqFulfillingId) return [];
      const res = await fetch(`/api/inventory?${new URLSearchParams({ locationId: reqFulfillingId })}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory for supplying location");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!reqFulfillingId,
  });

  // Requisition modal: inventory at requesting location (your store) for "Current at your store"
  const { data: requestingLocationInventory = [] } = useQuery<{ id: string; itemId?: string; itemCode: string; itemName: string; currentStock: number; unitOfMeasure: string }[]>({
    queryKey: ["/api/inventory", "requesting", myId],
    queryFn: async () => {
      if (!myId) return [];
      const res = await fetch(`/api/inventory?${new URLSearchParams({ locationId: myId })}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory at your location");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: requisitionModalOpen && !!myId,
  });

  const getItemName = (itemId: string) => {
    // itemId is the master item id (inventory_items.id).
    // inventoryItems entries are stock rows with optional itemId pointing to master.
    const inv = inventoryItems.find((i) => (i.itemId ?? i.id) === itemId);
    return inv ? `${inv.itemName} (${inv.itemCode})` : itemId;
  };

  const primaryLocation = locations.find((l) => l.isPrimary) || locations[0];
  const isCentral = !!myId && !!primaryLocation && myId === primaryLocation.id;

  const createTransferFromRequisition = useMutation({
    mutationFn: async (payload: { requisitionId: string; items: { itemId: string; approvedQuantity: number }[] }) => {
      const res = await fetch(`/api/stock-transfers/from-requisition/${payload.requisitionId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload.items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      setApproveModalOpen(false);
      setApproveReq(null);
      setApproveLines([]);
      toast({ title: "Transfer created", description: "Requisition approved and transfer created." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const dispatchTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await fetch(`/api/stock-transfers/${transferId}/dispatch`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to dispatch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Dispatched", description: "Transfer marked in transit; stock deducted." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const receiveTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await fetch(`/api/stock-transfers/${transferId}/receive`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to receive");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Received", description: "Transfer received; stock updated." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const createRequisition = useMutation({
    mutationFn: async (payload: { requestingLocationId: string; fulfillingLocationId: string; notes?: string; items: { itemId: string; requestedQuantity: number }[] }) => {
      const res = await fetch("/api/stock-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-requisitions"] });
      setRequisitionModalOpen(false);
      setReqLines([{ itemId: "", requestedQuantity: 0 }]);
      setReqNotes("");
      toast({ title: "Requisition submitted", description: "Your request has been sent." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRequisition = useMutation({
    mutationFn: async (payload: { id: string; notes?: string; items: { itemId: string; requestedQuantity: number }[]; locationId: string }) => {
      const res = await fetch(`/api/stock-requisitions/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: payload.notes, items: payload.items, locationId: payload.locationId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-requisitions"] });
      setEditRequisitionModalOpen(false);
      setEditRequisitionTarget(null);
      toast({ title: "Requisition updated", description: "Your changes have been saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectRequisition = useMutation({
    mutationFn: async (payload: { id: string; locationId: string }) => {
      const res = await fetch(`/api/stock-requisitions/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected", locationId: payload.locationId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-requisitions"] });
      toast({ title: "Requisition rejected", description: "The requisition has been rejected." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createTransfer = useMutation({
    mutationFn: async (payload: { fromLocationId: string; toLocationId: string; notes?: string; items: { itemId: string; quantityPlanned: number }[] }) => {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      setTransferModalOpen(false);
      setTransferToId("");
      setTransferLines([{ itemId: "", quantityPlanned: 0 }]);
      setTransferNotes("");
      toast({ title: "Transfer created", description: "Dispatch when stock is ready to send." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const loc = (id: string) => locations.find((l) => l.id === id);

  const requisitionsForMyLocation = myId
    ? requisitions.filter((r) => r.fulfillingLocationId === myId || r.requestingLocationId === myId)
    : [];
  const transfersOut = myId ? transfers.filter((t) => t.fromLocationId === myId) : [];
  const transfersIn = myId ? transfers.filter((t) => t.toLocationId === myId) : [];

  const statusBadge = (status: string) => {
    const v: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      submitted: "secondary",
      approved: "default",
      pending_dispatch: "outline",
      in_transit: "default",
      received: "secondary",
    };
    return <Badge variant={v[status] ?? "outline"}>{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Transfers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Requisitions and transfers between locations. Create a requisition or send a transfer from central.
          </p>
        </div>
        {myId && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setReqFulfillingId(primaryLocation?.id ?? ""); setRequisitionModalOpen(true); }}>
              <Inbox className="h-4 w-4 mr-2" />
              Create requisition
            </Button>
            {isCentral && (
              <Button variant="default" size="sm" onClick={() => { setTransferToId(""); setTransferModalOpen(true); }}>
                <Send className="h-4 w-4 mr-2" />
                Send transfer
              </Button>
            )}
          </div>
        )}
      </div>

      {isMultiLocation && !myId && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              Select your working location to see requisitions and transfers for your site.
            </p>
          </CardContent>
        </Card>
      )}

      {myId && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="pt-6 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {activeLocation?.code} – {activeLocation?.name}
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="requisitions" className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="requisitions" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Inbox className="h-4 w-4 mr-1 sm:mr-2" />
              Requisitions
              {requisitionsForMyLocation.filter((r) => r.status === "submitted").length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {requisitionsForMyLocation.filter((r) => r.status === "submitted").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Send className="h-4 w-4 mr-1 sm:mr-2" />
              Outgoing
            </TabsTrigger>
            <TabsTrigger value="incoming" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Truck className="h-4 w-4 mr-1 sm:mr-2" />
              Incoming
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requisitions</CardTitle>
              <CardDescription>Requisitions you requested or that your location fulfills. View, edit (as requester), or approve/reject (as fulfiller).</CardDescription>
            </CardHeader>
            <CardContent>
              {reqLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : requisitionsForMyLocation.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requisitions for your location.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitionsForMyLocation.map((r, index) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{loc(r.requestingLocationId)?.locationCode ?? r.requestingLocationId}</TableCell>
                        <TableCell className="text-xs">{loc(r.fulfillingLocationId)?.locationCode ?? r.fulfillingLocationId}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs">
                          {r.items?.length ?? 0} line(s)
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setViewRequisitionTarget(r); setViewRequisitionModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {r.status === "submitted" && r.requestingLocationId === myId && (
                                <DropdownMenuItem onClick={() => {
                                  setEditRequisitionTarget(r);
                                  setEditReqLines((r.items || []).map((it) => ({ itemId: it.itemId, requestedQuantity: it.requestedQuantity })));
                                  setEditReqNotes(r.notes ?? "");
                                  setEditRequisitionModalOpen(true);
                                }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {r.status === "submitted" && r.fulfillingLocationId === myId && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    setApproveReq(r);
                                    setApproveLines((r.items || []).map((it) => ({ itemId: it.itemId, requestedQuantity: it.requestedQuantity, approvedQuantity: it.approvedQuantity ?? it.requestedQuantity })));
                                    setApproveModalOpen(true);
                                  }} disabled={createTransferFromRequisition.isPending}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => myId && rejectRequisition.mutate({ id: r.id, locationId: myId })} disabled={rejectRequisition.isPending}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outgoing transfers</CardTitle>
              <CardDescription>Dispatch when stock leaves your location.</CardDescription>
            </CardHeader>
            <CardContent>
              {transLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : transfersOut.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outgoing transfers.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfersOut.map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{loc(t.toLocationId)?.locationCode ?? t.toLocationId}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-xs">{t.items?.length ?? 0} line(s)</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setViewTransferTarget(t); setViewTransferModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {t.status === "pending_dispatch" && (
                                <DropdownMenuItem onClick={() => dispatchTransfer.mutate(t.id)} disabled={dispatchTransfer.isPending}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Dispatch
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incoming transfers</CardTitle>
              <CardDescription>Mark as received when stock arrives at your location.</CardDescription>
            </CardHeader>
            <CardContent>
              {transLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : transfersIn.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incoming transfers.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfersIn.map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{loc(t.fromLocationId)?.locationCode ?? t.fromLocationId}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-xs">{t.items?.length ?? 0} line(s)</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setViewTransferTarget(t); setViewTransferModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {t.status === "in_transit" && (
                                <DropdownMenuItem onClick={() => { setReceiveTransferTarget(t); setReceiveModalOpen(true); }} disabled={receiveTransfer.isPending}>
                                  <PackageCheck className="mr-2 h-4 w-4" />
                                  Mark received
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create requisition modal */}
      <Dialog open={requisitionModalOpen} onOpenChange={(open) => { setRequisitionModalOpen(open); if (!open) setReqLines([{ itemId: "", requestedQuantity: 0 }]); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create requisition</DialogTitle>
            <DialogDescription className="text-sm">Request stock for your location from the central warehouse or another store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center text-sm">
              <span className="text-muted-foreground">From (your location):</span>
              <span className="font-medium">{activeLocation?.code} – {activeLocation?.name}</span>
              <span className="text-muted-foreground hidden sm:inline">→ To (supplying location):</span>
              <span className="text-muted-foreground sm:hidden">To (supplying location):</span>
              <Select
                value={reqFulfillingId}
                onValueChange={(value) => {
                  setReqFulfillingId(value);
                  setReqLines([{ itemId: "", requestedQuantity: 0 }]);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select supplying location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter((l) => l.id !== myId).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.locationCode} – {l.locationName}{l.isPrimary ? " (Central store)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Items</Label>
              {reqLines.map((line, idx) => {
                const supplyingItem = requisitionInventory.find((inv) => inv.id === line.itemId);
                const maxQty = supplyingItem?.currentStock;
                const requestingItem = supplyingItem
                  ? requestingLocationInventory.find((inv) => inv.itemCode === supplyingItem.itemCode)
                  : undefined;
                const supplyingLocationName = loc(reqFulfillingId)?.locationName || loc(reqFulfillingId)?.locationCode || "Supplying store";
                return (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:flex-1 min-w-0">
                      <Select value={line.itemId} onValueChange={(v) => setReqLines((p) => p.map((r, i) => (i === idx ? { ...r, itemId: v } : r)))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={reqFulfillingId ? "Select item" : "Select supplying location first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {requisitionInventory.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.itemName} ({item.itemCode}) — {item.currentStock} {item.unitOfMeasure}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {supplyingItem && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Available at {supplyingLocationName}: <span className="font-medium text-foreground">{supplyingItem.currentStock ?? 0} {supplyingItem.unitOfMeasure}</span></span>
                          <span>Current at your store: <span className="font-medium text-foreground">{requestingItem != null ? `${requestingItem.currentStock ?? 0} ${requestingItem.unitOfMeasure}` : "—"}</span></span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 min-w-0 sm:w-32 sm:flex-none">
                        <Input
                          type="number"
                          min={0}
                          className="flex-1 min-w-0 sm:w-24"
                          placeholder="Qty"
                          value={line.requestedQuantity || ""}
                          onChange={(e) => {
                            const raw = Number(e.target.value) || 0;
                            const clamped = typeof maxQty === "number" ? Math.min(raw, maxQty) : raw;
                            setReqLines((p) => p.map((r, i) => (i === idx ? { ...r, requestedQuantity: clamped } : r)));
                          }}
                          disabled={!line.itemId || typeof maxQty !== "number"}
                        />
                        {typeof maxQty === "number" && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Max available: {maxQty}</p>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setReqLines((p) => p.filter((_, i) => i !== idx))} disabled={reqLines.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" size="sm" onClick={() => setReqLines((p) => [...p, { itemId: "", requestedQuantity: 0 }])}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="Reason, urgency…" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setRequisitionModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={!reqFulfillingId || createRequisition.isPending || !reqLines.some((l) => l.itemId && l.requestedQuantity > 0)}
              onClick={() => {
                if (!myId) return;
                const validItems = reqLines.filter((l) => l.itemId && l.requestedQuantity > 0);
                const overRequested = validItems.find((item) => {
                  const stockItem = requisitionInventory.find((inv) => inv.id === item.itemId);
                  return stockItem && item.requestedQuantity > stockItem.currentStock;
                });
                if (overRequested) {
                  const stockItem = requisitionInventory.find((inv) => inv.id === overRequested.itemId);
                  toast({
                    title: "Quantity too high",
                    description: stockItem
                      ? `You requested ${overRequested.requestedQuantity} but only ${stockItem.currentStock} is available at the supplying location.`
                      : "Requested quantity exceeds available stock at the supplying location.",
                    variant: "destructive",
                  });
                  return;
                }
                // Map stock row id to master item id for API payload
                const itemsForApi = validItems.map((line) => {
                  const stock = requisitionInventory.find((inv) => inv.id === line.itemId) as any;
                  return {
                    ...line,
                    itemId: (stock?.itemId as string) ?? line.itemId,
                  };
                });
                createRequisition.mutate({
                  requestingLocationId: myId,
                  fulfillingLocationId: reqFulfillingId,
                  notes: reqNotes || undefined,
                  items: itemsForApi,
                });
              }}
              className="w-full sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              {createRequisition.isPending ? "Submitting…" : "Submit requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send transfer modal (central only) */}
      <Dialog open={transferModalOpen} onOpenChange={(open) => { setTransferModalOpen(open); if (!open) setTransferLines([{ itemId: "", quantityPlanned: 0 }]); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Send transfer</DialogTitle>
            <DialogDescription className="text-sm">Send stock from the central warehouse to a store. No requisition required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center text-sm">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium">{primaryLocation?.locationCode} – {primaryLocation?.locationName} (Central store)</span>
              <span className="text-muted-foreground hidden sm:inline">→ To:</span>
              <span className="text-muted-foreground sm:hidden">To:</span>
              <Select value={transferToId} onValueChange={setTransferToId}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter((l) => l.id !== myId).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.locationCode} – {l.locationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Items</Label>
              {transferLines.map((line, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={line.itemId} onValueChange={(v) => setTransferLines((p) => p.map((r, i) => (i === idx ? { ...r, itemId: v } : r)))}>
                    <SelectTrigger className="w-full sm:flex-1 min-w-0">
                      <SelectValue placeholder="Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.itemName} ({item.itemCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 items-center">
                    <Input type="number" min={1} className="flex-1 min-w-0 sm:w-24" placeholder="Qty" value={line.quantityPlanned || ""} onChange={(e) => setTransferLines((p) => p.map((r, i) => (i === idx ? { ...r, quantityPlanned: parseInt(e.target.value, 10) || 0 } : r)))} />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setTransferLines((p) => p.filter((_, i) => i !== idx))} disabled={transferLines.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setTransferLines((p) => [...p, { itemId: "", quantityPlanned: 0 }])}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="Delivery notes…" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTransferModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={
                !transferToId ||
                createTransfer.isPending ||
                !transferLines.some((l) => l.itemId && l.quantityPlanned > 0)
              }
              onClick={() => {
                if (!myId) return;
                const validLines = transferLines.filter((l) => l.itemId && l.quantityPlanned > 0);
                // Map stock row id to master item id for API payload
                const itemsForApi = validLines.map((line) => {
                  const stock = inventoryItems.find((i) => i.id === line.itemId) as any;
                  return {
                    ...line,
                    itemId: (stock?.itemId as string) ?? line.itemId,
                  };
                });
                createTransfer.mutate({
                  fromLocationId: myId,
                  toLocationId: transferToId,
                  notes: transferNotes || undefined,
                  items: itemsForApi,
                });
              }}
              className="w-full sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              {createTransfer.isPending ? "Creating…" : "Create transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve requisition modal */}
      <Dialog open={approveModalOpen} onOpenChange={(open) => { setApproveModalOpen(open); if (!open) { setApproveReq(null); setApproveLines([]); } }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Requisition details</DialogTitle>
            <DialogDescription className="text-sm">Review requested items and adjust approved quantities before creating a transfer.</DialogDescription>
          </DialogHeader>
          {approveReq && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                <span>
                  From (your location):{" "}
                  <span className="font-medium">
                    {loc(approveReq.fulfillingLocationId)?.locationCode ?? approveReq.fulfillingLocationId}
                  </span>
                </span>
                <span>
                  To (requesting location):{" "}
                  <span className="font-medium">
                    {loc(approveReq.requestingLocationId)?.locationCode ?? approveReq.requestingLocationId}
                  </span>
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Approved to send</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approveLines.map((line, idx) => (
                      <TableRow key={line.itemId || idx}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                        <TableCell className="text-xs">
                          {getItemName(line.itemId) || "Unknown item"}
                        </TableCell>
                        <TableCell className="text-xs">{line.requestedQuantity}</TableCell>
                        <TableCell className="w-40">
                          <Input
                            type="number"
                            min={0}
                            value={line.approvedQuantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              const qty = Number.isNaN(value) ? 0 : value;
                              setApproveLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, approvedQuantity: qty } : l,
                                ),
                              );
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setApproveModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={
                !approveReq ||
                createTransferFromRequisition.isPending ||
                approveLines.every((l) => !l.itemId || l.approvedQuantity <= 0)
              }
              onClick={() => {
                if (!approveReq) return;
                const items = approveLines
                  .filter((l) => l.itemId && l.approvedQuantity > 0)
                  .map((l) => ({ itemId: l.itemId, approvedQuantity: l.approvedQuantity }));
                createTransferFromRequisition.mutate({ requisitionId: approveReq.id, items });
              }}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {createTransferFromRequisition.isPending ? "Creating…" : "Approve & Create Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View requisition modal (read-only) */}
      <Dialog open={viewRequisitionModalOpen} onOpenChange={(open) => { setViewRequisitionModalOpen(open); if (!open) setViewRequisitionTarget(null); }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-x-hidden overflow-y-auto p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Requisition details</DialogTitle>
            <DialogDescription className="text-sm">View requisition summary and requested items.</DialogDescription>
          </DialogHeader>
          {viewRequisitionTarget && (
            <div className="space-y-4 min-w-0 flex-1">
              <div className="text-sm text-muted-foreground flex gap-4">
                <span>
                  From (fulfilling):{" "}
                  <span className="font-bold">{loc(viewRequisitionTarget.fulfillingLocationId)?.locationCode ?? viewRequisitionTarget.fulfillingLocationId}</span>
                </span>
                <span>
                  To (requesting):{" "}
                  <span className="font-bold">{loc(viewRequisitionTarget.requestingLocationId)?.locationCode ?? viewRequisitionTarget.requestingLocationId}</span>
                </span>
                <span>
                  Status: <span className="font-bold">{viewRequisitionTarget.status.replace(/_/g, " ")}</span>
                </span>
              </div>
              {viewRequisitionTarget.notes && (
                <p className="text-sm text-muted-foreground"><span className="font-medium">Notes:</span> {viewRequisitionTarget.notes}</p>
              )}
              <div className="overflow-x-auto rounded-md border min-w-0">
                <Table className="min-w-[320px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-28">Requested</TableHead>
                      <TableHead className="w-28">Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewRequisitionTarget.items || []).map((it, index) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{getItemName(it.itemId)}</TableCell>
                        <TableCell className="text-xs">{it.requestedQuantity}</TableCell>
                        <TableCell className="text-xs">{it.approvedQuantity ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRequisitionModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit requisition modal (requester only, when status is submitted) */}
      <Dialog open={editRequisitionModalOpen} onOpenChange={(open) => { setEditRequisitionModalOpen(open); if (!open) { setEditRequisitionTarget(null); setEditReqLines([]); setEditReqNotes(""); } }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit requisition</DialogTitle>
            <DialogDescription className="text-sm">Update items and notes. Only the requesting location can edit before approval.</DialogDescription>
          </DialogHeader>
          {editRequisitionTarget && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                <span>To (supplying): <span className="font-medium">{loc(editRequisitionTarget.fulfillingLocationId)?.locationCode ?? editRequisitionTarget.fulfillingLocationId}</span></span>
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                {editReqLines.map((line, idx) => (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={line.itemId} onValueChange={(v) => setEditReqLines((p) => p.map((r, i) => (i === idx ? { ...r, itemId: v } : r)))}>
                      <SelectTrigger className="w-full sm:flex-1 min-w-0">
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{getItemName(item.id)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 items-center">
                      <Input type="number" min={0} className="flex-1 min-w-0 sm:w-24" placeholder="Qty" value={line.requestedQuantity || ""} onChange={(e) => setEditReqLines((p) => p.map((r, i) => (i === idx ? { ...r, requestedQuantity: parseInt(e.target.value, 10) || 0 } : r)))} />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setEditReqLines((p) => p.filter((_, i) => i !== idx))} disabled={editReqLines.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setEditReqLines((p) => [...p, { itemId: "", requestedQuantity: 0 }])}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea placeholder="Notes…" value={editReqNotes} onChange={(e) => setEditReqNotes(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditRequisitionModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={!editRequisitionTarget || updateRequisition.isPending || !editReqLines.some((l) => l.itemId && l.requestedQuantity > 0)}
              onClick={() => {
                if (!editRequisitionTarget || !myId) return;
                updateRequisition.mutate({
                  id: editRequisitionTarget.id,
                  notes: editReqNotes || undefined,
                  items: editReqLines.filter((l) => l.itemId && l.requestedQuantity > 0),
                  locationId: myId,
                });
              }}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateRequisition.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive transfer confirmation modal */}
      <Dialog open={receiveModalOpen} onOpenChange={(open) => { setReceiveModalOpen(open); if (!open) setReceiveTransferTarget(null); }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-x-hidden overflow-y-auto p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirm received transfer</DialogTitle>
            <DialogDescription className="text-sm">Review items and reconcile with your physical count before confirming receipt.</DialogDescription>
          </DialogHeader>
          {receiveTransferTarget && (
            <div className="space-y-4 min-w-0">
              <div className="text-sm text-muted-foreground flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-4">
                <span>
                  From:{" "}
                  <span className="font-medium">
                    {loc(receiveTransferTarget.fromLocationId)?.locationCode ?? receiveTransferTarget.fromLocationId}
                  </span>
                </span>
                <span>
                  To (your location):{" "}
                  <span className="font-medium">
                    {loc(receiveTransferTarget.toLocationId)?.locationCode ?? receiveTransferTarget.toLocationId}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto rounded-md border min-w-0">
                <Table className="min-w-[320px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-32">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(receiveTransferTarget.items || []).map((it, index) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{getItemName(it.itemId)}</TableCell>
                        <TableCell className="text-xs">{it.quantityDispatched ?? it.quantityPlanned}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setReceiveModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={!receiveTransferTarget || receiveTransfer.isPending}
              onClick={() => {
                if (!receiveTransferTarget) return;
                receiveTransfer.mutate(receiveTransferTarget.id, {
                  onSuccess: () => {
                    setReceiveModalOpen(false);
                    setReceiveTransferTarget(null);
                  },
                } as any);
              }}
              className="w-full sm:w-auto"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              {receiveTransfer.isPending ? "Confirming…" : "Confirm received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View transfer modal (read-only, used from outgoing/incoming tabs) */}
      <Dialog open={viewTransferModalOpen} onOpenChange={(open) => { setViewTransferModalOpen(open); if (!open) setViewTransferTarget(null); }}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-x-hidden overflow-y-auto p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Transfer details</DialogTitle>
            <DialogDescription className="text-sm">View items and locations for this stock transfer.</DialogDescription>
          </DialogHeader>
          {viewTransferTarget && (
            <div className="space-y-4 min-w-0 flex-1">
              <div className="text-sm text-muted-foreground flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-4">
                <span>
                  From:{" "}
                  <span className="font-bold">
                    {loc(viewTransferTarget.fromLocationId)?.locationCode ?? viewTransferTarget.fromLocationId}
                  </span>
                </span>
                <span>
                  To:{" "}
                  <span className="font-bold">
                    {loc(viewTransferTarget.toLocationId)?.locationCode ?? viewTransferTarget.toLocationId}
                  </span>
                </span>
                <span>
                  Status: <span className="font-bold">{viewTransferTarget.status.replace(/_/g, " ")}</span>
                </span>
              </div>
              <div className="overflow-x-auto rounded-md border min-w-0">
                <Table className="min-w-[400px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-32">Planned</TableHead>
                      <TableHead className="w-32">Dispatched</TableHead>
                      <TableHead className="w-32">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewTransferTarget.items || []).map((it, index) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-xs">{getItemName(it.itemId)}</TableCell>
                        <TableCell className="text-xs">{it.quantityPlanned ?? "-"}</TableCell>
                        <TableCell className="text-xs">{it.quantityDispatched ?? "-"}</TableCell>
                        <TableCell className="text-xs">{it.quantityReceived ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTransferModalOpen(false)} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
