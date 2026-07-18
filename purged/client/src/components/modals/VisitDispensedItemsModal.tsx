import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  unitOfMeasure: string;
}

interface VisitDispensedItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: {
    id: string;
    patientId: string;
    locationId?: string | null;
    patient?: { employee?: { firstName?: string; lastName?: string } };
  } | null;
}

// Group transactions by itemId and sum quantities
function groupByItem(transactions: any[]): { itemId: string; quantity: number; label: string; unitOfMeasure?: string }[] {
  const map = new Map<string, { quantity: number; label: string; unitOfMeasure?: string }>();
  for (const t of transactions) {
    const id = t.itemId;
    const label = (t as any).itemName ?? t.itemCode ?? id;
    const unit = (t as any).unitOfMeasure ?? "";
    const existing = map.get(id);
    if (existing) {
      existing.quantity += Number((t as any).quantity ?? 0);
    } else {
      map.set(id, { quantity: Number((t as any).quantity ?? 0), label, unitOfMeasure: unit });
    }
  }
  return Array.from(map.entries()).map(([itemId, { quantity, label, unitOfMeasure }]) => ({
    itemId,
    quantity,
    label,
    unitOfMeasure,
  }));
}

export default function VisitDispensedItemsModal({
  open,
  onOpenChange,
  visit,
}: VisitDispensedItemsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newLines, setNewLines] = useState<{ itemId: string; quantity: number; search: string }[]>([]);
  const [addMore, setAddMore] = useState<Record<string, number>>({});
  const [focusedSearchIdx, setFocusedSearchIdx] = useState<number | null>(null);
  const searchInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const visitId = visit?.id ?? "";
  const patientId = visit?.patientId ?? "";
  const locationId = visit?.locationId ?? undefined;

  const { data: existingTransactions = [], isLoading: loadingExisting } = useQuery({
    queryKey: ["/api/inventory-transactions", { medicalVisitId: visitId }],
    queryFn: async () => {
      const params = new URLSearchParams({ medicalVisitId: visitId });
      const res = await fetch(`/api/inventory-transactions?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const list = await res.json();
      return Array.isArray(list) ? list.filter((t: any) => t.transactionType === "issue_to_client") : [];
    },
    enabled: open && !!visitId,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory", locationId ? { locationId } : ""],
    queryFn: async () => {
      const url = locationId ? `/api/inventory?locationId=${encodeURIComponent(locationId)}` : "/api/inventory";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: open,
  });

  const existingGrouped = useMemo(() => groupByItem(existingTransactions), [existingTransactions]);

  const alreadyUsedItemIds = useMemo(() => {
    const used = new Set(existingGrouped.map((e) => e.itemId));
    newLines.forEach((l) => {
      if (l.itemId) used.add(l.itemId);
    });
    return used;
  }, [existingGrouped, newLines]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<void>[] = [];

      for (const itemId of Object.keys(addMore)) {
        const qty = Number(addMore[itemId]) || 0;
        if (qty <= 0) continue;
        promises.push(
          (async () => {
            const res = await fetch("/api/inventory-transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                itemId,
                quantity: qty,
                transactionType: "issue_to_client",
                patientId,
                medicalVisitId: visitId,
                documentType: "visit",
                documentId: visitId,
                ...(locationId ? { locationId } : {}),
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error((err as any)?.message || "Failed to record item");
            }
          })()
        );
      }

      const validNew = newLines.filter((l) => l.itemId && l.quantity > 0);
      for (const line of validNew) {
        promises.push(
          (async () => {
            const res = await fetch("/api/inventory-transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                itemId: line.itemId,
                quantity: line.quantity,
                transactionType: "issue_to_client",
                patientId,
                medicalVisitId: visitId,
                documentType: "visit",
                documentId: visitId,
                ...(locationId ? { locationId } : {}),
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error((err as any)?.message || "Failed to record item");
            }
          })()
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Items recorded successfully" });
      setNewLines([]);
      setAddMore({});
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleAddLine = () => {
    setNewLines((prev) => [...prev, { itemId: "", quantity: 1, search: "" }]);
    setTimeout(() => {
      const idx = newLines.length;
      setFocusedSearchIdx(idx);
      searchInputRefs.current[idx]?.focus();
    }, 0);
  };

  const handleRemoveLine = (idx: number) => {
    setNewLines((prev) => prev.filter((_, i) => i !== idx));
    setFocusedSearchIdx(null);
  };

  const handleLineChange = (idx: number, field: "itemId" | "quantity" | "search", value: string | number) => {
    setNewLines((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: field === "quantity" ? Number(value) || 0 : value } : r
      )
    );
    if (field === "itemId") setFocusedSearchIdx(null);
  };

  const setAddMoreQty = (itemId: string, value: number) => {
    setAddMore((prev) => ({ ...prev, [itemId]: value }));
  };

  const hasSaveableData =
    Object.values(addMore).some((q) => Number(q) > 0) || newLines.some((l) => l.itemId && l.quantity > 0);

  const patientName = visit?.patient?.employee
    ? `${visit.patient.employee.firstName || ""} ${visit.patient.employee.lastName || ""}`.trim() || "Patient"
    : "Patient";

  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items used / dispensed
          </DialogTitle>
          <DialogDescription>
            Record supplies or medications given for this visit. Visit: {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loadingExisting ? (
            <p className="text-sm text-muted-foreground">Loading existing items...</p>
          ) : existingGrouped.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-2">Already recorded for this visit</h4>
              <p className="text-xs text-muted-foreground mb-2">Add more quantity below if more was used later.</p>
              <ul className="text-sm space-y-3 border rounded-md p-3 bg-muted/50">
                {existingGrouped.map((row) => (
                  <li key={row.itemId} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-[140px]">
                      {row.label} — <strong>{row.quantity}</strong> {row.unitOfMeasure ?? ""} recorded
                    </span>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Add more:</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="w-20 h-8"
                        value={addMore[row.itemId] ?? ""}
                        onChange={(e) => setAddMoreQty(row.itemId, Number(e.target.value) || 0)}
                        aria-label={`Additional quantity for ${row.label}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h4 className="text-sm font-medium mb-2">Add new items</h4>
            <p className="text-xs text-muted-foreground mb-2">Type to search by name or code; pick from the list to avoid duplicates.</p>
            <div className="space-y-2">
              {newLines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    {line.itemId ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
                        <span className="truncate">
                          {inventoryItems.find((i) => i.id === line.itemId)?.itemName ?? inventoryItems.find((i) => i.id === line.itemId)?.itemCode ?? line.itemId}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleLineChange(idx, "itemId", "")}
                          aria-label="Change item"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          ref={(el) => { searchInputRefs.current[idx] = el; }}
                          placeholder="Search by name or code..."
                          className="pr-8"
                          value={line.search}
                          onChange={(e) => handleLineChange(idx, "search", e.target.value)}
                          onFocus={() => setFocusedSearchIdx(idx)}
                          onBlur={() => setTimeout(() => setFocusedSearchIdx(null), 150)}
                          aria-label="Search item"
                          aria-autocomplete="list"
                          aria-expanded={focusedSearchIdx === idx && line.search.length > 0}
                        />
                        {focusedSearchIdx === idx && line.search.trim().length > 0 && (
                          <ul
                            className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover py-1 shadow-md"
                            role="listbox"
                            aria-label="Matching items"
                          >
                            {(() => {
                              const term = line.search.trim().toLowerCase();
                              const excludeIds = new Set(alreadyUsedItemIds);
                              const otherNewItemIds = newLines.filter((_, i) => i !== idx).map((l) => l.itemId).filter(Boolean);
                              otherNewItemIds.forEach((id) => excludeIds.add(id));
                              const matches = inventoryItems.filter(
                                (item) =>
                                  !excludeIds.has(item.id) &&
                                  (item.itemName?.toLowerCase().includes(term) || item.itemCode?.toLowerCase().includes(term))
                              ).slice(0, 12);
                              if (matches.length === 0) {
                                return (
                                  <li className="px-3 py-2 text-sm text-muted-foreground" role="option">
                                    No matching items
                                  </li>
                                );
                              }
                              return matches.map((item) => (
                                <li
                                  key={item.id}
                                  role="option"
                                  className="cursor-pointer px-3 py-2 text-sm hover:bg-muted focus:bg-muted outline-none"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleLineChange(idx, "itemId", item.id);
                                    handleLineChange(idx, "search", "");
                                  }}
                                >
                                  {item.itemName} ({item.itemCode}) — {item.currentStock} {item.unitOfMeasure}
                                </li>
                              ));
                            })()}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    className="w-24"
                    value={line.quantity || ""}
                    onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                    aria-label="Quantity"
                    title="Quantity"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(idx)} aria-label="Remove line">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleAddLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasSaveableData}
              className="bg-mineaid-navy hover:bg-mineaid-navy/90"
            >
              {saveMutation.isPending ? "Saving..." : "Save items"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
