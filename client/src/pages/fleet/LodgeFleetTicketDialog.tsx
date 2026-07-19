import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetTagSelect } from "@/components/assets/AssetTagSelect";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { titleCaseUi } from "@/lib/titleCaseUi";

type TicketCategory = { id: string; name: string; slug?: string };
type AssetRow = { id: string; assetTag: string; name: string };

type ActiveTicketHit = {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  categoryName: string;
};

const priorities = ["low", "normal", "high", "urgent"] as const;

export function LodgeFleetTicketDialog({
  open,
  onOpenChange,
  locationId,
  unitName,
  shiftDate,
  faultyLabels,
  deficienciesNotes,
  onTicketCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  unitName: string;
  shiftDate: string;
  faultyLabels: string[];
  deficienciesNotes: string;
  onTicketCreated: (ticketId: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [descriptionPlain, setDescriptionPlain] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("high");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateHits, setDuplicateHits] = useState<ActiveTicketHit[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/ticket-categories"],
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json() as Promise<TicketCategory[]>;
    },
    enabled: open,
  });

  const { data: linkedAssets = [] } = useQuery({
    queryKey: ["/api/business-assets", { stockLocationId: locationId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        stockLocationId: locationId,
        includeRetired: "1",
      });
      const res = await fetch(`/api/business-assets?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<AssetRow[]>;
    },
    enabled: open && Boolean(locationId),
  });

  useEffect(() => {
    if (!open) return;
    setTitle(`Pre-start faults — ${unitName} — ${shiftDate}`);
    const lines = [
      `Fleet pre-start check reported faults for ${unitName} (shift ${shiftDate}).`,
      "",
      "Faulty items:",
      ...faultyLabels.map((l) => `• ${l}`),
    ];
    if (deficienciesNotes.trim()) {
      lines.push("", "Deficiencies / notes:", deficienciesNotes.trim());
    }
    setDescriptionPlain(lines.join("\n"));
    setPriority("high");
    setDuplicateOpen(false);
    setDuplicateHits([]);
  }, [open, unitName, shiftDate, faultyLabels, deficienciesNotes]);

  useEffect(() => {
    if (!open || !categories.length) return;
    const repair = categories.find((c) => c.slug === "repair-maintenance");
    setCategoryId(repair?.id ?? categories[0]?.id ?? "");
  }, [open, categories]);

  useEffect(() => {
    if (!open) return;
    setAssetId(linkedAssets[0]?.id ?? null);
  }, [open, linkedAssets]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const descriptionHtml = `<p>${escapeHtml(descriptionPlain.trim()).replace(/\n/g, "<br/>")}</p>`;
      const res = await apiRequest("POST", "/api/tickets", {
        categoryId,
        title: title.trim(),
        descriptionHtml,
        priority,
        locationId,
        relatedIncidentId: null,
        assetId,
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket lodged" });
      setDuplicateOpen(false);
      onTicketCreated(data.id);
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast({
        title: "Could not lodge ticket",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  async function submitWithDuplicateCheck() {
    if (!categoryId || !title.trim()) return;
    setCheckingDuplicates(true);
    try {
      const res = await fetch(
        `/api/tickets/active-in-category?categoryId=${encodeURIComponent(categoryId)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        createMutation.mutate();
        return;
      }
      const hits = (await res.json()) as ActiveTicketHit[];
      if (hits.length > 0) {
        setDuplicateHits(hits);
        setDuplicateOpen(true);
        return;
      }
      createMutation.mutate();
    } catch {
      createMutation.mutate();
    } finally {
      setCheckingDuplicates(false);
    }
  }

  const pending = createMutation.isPending || checkingDuplicates;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lodge repair ticket</DialogTitle>
            <DialogDescription>
              Faulty pre-start items require a ticket before this check can be marked completed. Review and submit
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Asset</Label>
              <AssetTagSelect value={assetId} onChange={setAssetId} />
              <p className="text-xs text-muted-foreground">
                Prefills the vehicle asset linked to this fleet unit when available.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fleet-ticket-title">Title</Label>
              <Input
                id="fleet-ticket-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as (typeof priorities)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fleet-ticket-desc">Description</Label>
              <Textarea
                id="fleet-ticket-desc"
                value={descriptionPlain}
                onChange={(e) => setDescriptionPlain(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Ticket location is locked to this fleet vehicle.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              className="bg-uventorybiz-navy text-white"
              disabled={pending || !categoryId || !title.trim()}
              onClick={() => void submitWithDuplicateCheck()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lodge ticket & complete check"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Similar Ticket Already Open?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  There {duplicateHits.length === 1 ? "is already an open ticket" : "are already open tickets"}{" "}
                  in this category (open, triaged, or in progress). Do you still want to create another?
                </p>
                <ul className="space-y-1 rounded-md border bg-muted/40 p-2 text-left">
                  {duplicateHits.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-medium text-uventorybiz-navy hover:underline"
                      >
                        {t.ticketNumber}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {titleCaseUi(t.status.replace(/_/g, " "))} · {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
            >
              {createMutation.isPending ? "Submitting…" : "Create Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
