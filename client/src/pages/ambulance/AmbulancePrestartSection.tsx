import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AMBULANCE_PRESTART_CHECKLIST_ITEMS } from "@shared/ambulancePrestartChecklist";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Eye, Loader2, Pencil, Plus, Filter, CheckCircle2 } from "lucide-react";
import type { AmbulancePrestartRow, AmbulanceRow } from "./types";

function emptyResponses(): Record<string, boolean> {
  return Object.fromEntries(AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((i) => [i.key, false])) as Record<string, boolean>;
}

function mergeResponses(existing?: Record<string, boolean> | null): Record<string, boolean> {
  const base = emptyResponses();
  if (!existing) return base;
  for (const k of Object.keys(existing)) {
    if (k in base) base[k] = !!existing[k];
  }
  return base;
}

export function AmbulancePrestartSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [ambulanceFilter, setAmbulanceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewRow, setViewRow] = useState<AmbulancePrestartRow | null>(null);
  const [editRow, setEditRow] = useState<AmbulancePrestartRow | null>(null);

  const { data: ambulances = [] } = useQuery<AmbulanceRow[]>({
    queryKey: ["/api/ambulances", { includeInactive: true }],
    queryFn: async () => {
      const res = await fetch("/api/ambulances?includeInactive=true", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const listQueryKey = ["/api/ambulance-prestart-checks", { ambulanceFilter, fromDate, toDate }] as const;

  const { data: rawChecks = [], isLoading } = useQuery<AmbulancePrestartRow[]>({
    queryKey: listQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ambulanceFilter !== "all") params.set("ambulanceLocationId", ambulanceFilter);
      if (fromDate.trim()) params.set("fromShiftDate", fromDate.trim());
      if (toDate.trim()) params.set("toShiftDate", toDate.trim());
      const q = params.toString();
      const res = await fetch(`/api/ambulance-prestart-checks${q ? `?${q}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const checks = useMemo(() => {
    if (statusFilter === "all") return rawChecks;
    return rawChecks.filter((r) => r.status === statusFilter);
  }, [rawChecks, statusFilter]);

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ["/api/ambulance-prestart-checks"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Shift pre-start safety checks</h3>
          <p className="text-uventorybiz-gray text-sm mt-1 max-w-2xl">
            Complete a checklist before taking a fleet vehicle into service. Drafts can be saved and finished later; submitted
            forms lock for crew (admins may still correct).
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New pre-start check
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
          <CardDescription>Narrow by unit, shift date, or status</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label>Vehicle</Label>
            <Select value={ambulanceFilter} onValueChange={setAmbulanceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {ambulances.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pre-from">From shift date</Label>
            <Input id="pre-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pre-to">To shift date</Label>
            <Input id="pre-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Submissions
          </CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : checks.length === 0 ? (
            <p className="text-uventorybiz-gray py-8 text-center">No pre-start checks match the current filters.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift date</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed by</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((row) => {
                    const canEditNonAdmin =
                      row.status === "draft" && user?.id && row.completedByUserId === user.id;
                    const canEdit = isAdmin || canEditNonAdmin;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {(() => {
                            try {
                              return format(parseISO(String(row.shiftDate)), "MMM d, yyyy");
                            } catch {
                              return String(row.shiftDate);
                            }
                          })()}
                        </TableCell>
                        <TableCell>{row.ambulanceName}</TableCell>
                        <TableCell>
                          {row.status === "completed" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {[row.completedByFirstName, row.completedByLastName].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{row.mileageReading?.trim() || "—"}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewRow(row)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => setEditRow(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PrestartFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        ambulances={ambulances}
        onSaved={() => {
          invalidateList();
          setCreateOpen(false);
          toast({ title: "Pre-start check saved" });
        }}
      />

      {viewRow && (
        <PrestartViewDialog row={viewRow} onClose={() => setViewRow(null)} />
      )}

      {editRow && (
        <PrestartFormDialog
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          mode="edit"
          ambulances={ambulances}
          initial={editRow}
          onSaved={() => {
            invalidateList();
            setEditRow(null);
            toast({ title: "Pre-start check updated" });
          }}
        />
      )}
    </div>
  );
}

function PrestartViewDialog({ row, onClose }: { row: AmbulancePrestartRow; onClose: () => void }) {
  const responses = mergeResponses(row.responses);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-start check</DialogTitle>
          <DialogDescription>
            {row.ambulanceName} — shift {String(row.shiftDate)} —{" "}
            {[row.completedByFirstName, row.completedByLastName].filter(Boolean).join(" ") || "Staff"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} className="flex gap-2 text-sm">
              <CheckCircle2
                className={`h-4 w-4 shrink-0 mt-0.5 ${responses[item.key] ? "text-green-600" : "text-muted-foreground"}`}
              />
              <span>{item.label}</span>
            </div>
          ))}
          {(row.deficienciesNotes?.trim() || row.mileageReading?.trim()) && (
            <div className="pt-2 border-t space-y-2 text-sm">
              {row.mileageReading?.trim() && (
                <p>
                  <span className="text-muted-foreground">Mileage: </span>
                  {row.mileageReading}
                </p>
              )}
              {row.deficienciesNotes?.trim() && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Deficiencies / notes</p>
                  <p className="whitespace-pre-wrap">{row.deficienciesNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrestartFormDialog({
  open,
  onOpenChange,
  mode,
  ambulances,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  ambulances: AmbulanceRow[];
  initial?: AmbulancePrestartRow;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const defaultShift = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [ambulanceLocationId, setAmbulanceLocationId] = useState("");
  const [shiftDate, setShiftDate] = useState(defaultShift);
  const [responses, setResponses] = useState<Record<string, boolean>>(() => emptyResponses());
  const [deficienciesNotes, setDeficienciesNotes] = useState("");
  const [mileageReading, setMileageReading] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setAmbulanceLocationId(initial.ambulanceLocationId);
      setShiftDate(String(initial.shiftDate).slice(0, 10));
      setResponses(mergeResponses(initial.responses));
      setDeficienciesNotes(initial.deficienciesNotes ?? "");
      setMileageReading(initial.mileageReading ?? "");
    } else {
      setAmbulanceLocationId("");
      setShiftDate(defaultShift);
      setResponses(emptyResponses());
      setDeficienciesNotes("");
      setMileageReading("");
    }
  }, [open, mode, initial, defaultShift]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { status: "draft" | "completed" }) => {
      const body = {
        ambulanceLocationId,
        shiftDate,
        responses,
        deficienciesNotes: deficienciesNotes.trim() || null,
        mileageReading: mileageReading.trim() || null,
        status: payload.status,
      };
      if (mode === "create") {
        const res = await apiRequest("POST", "/api/ambulance-prestart-checks", body);
        return res.json();
      }
      if (!initial) throw new Error("Missing record");
      const patch: Record<string, unknown> = {
        shiftDate,
        responses,
        deficienciesNotes: deficienciesNotes.trim() || null,
        mileageReading: mileageReading.trim() || null,
        status: payload.status,
      };
      const res = await apiRequest("PATCH", `/api/ambulance-prestart-checks/${initial.id}`, patch);
      return res.json();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Could not save", description: message, variant: "destructive" });
    },
    onSuccess: () => onSaved(),
  });

  const pending = saveMutation.isPending;

  const submit = (status: "draft" | "completed") => {
    if (!ambulanceLocationId) {
      toast({ title: "Select a vehicle", variant: "destructive" });
      return;
    }
    if (status === "completed") {
      const allPass = AMBULANCE_PRESTART_CHECKLIST_ITEMS.every((item) => responses[item.key] === true);
      if (!allPass) {
        toast({
          title: "Checklist incomplete",
          description: "Every safety item must pass before you can mark this form completed.",
          variant: "destructive",
        });
        return;
      }
    }
    saveMutation.mutate({ status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New pre-start check" : "Edit pre-start check"}</DialogTitle>
          <DialogDescription>
            Record shift-date vehicle and equipment checks. Use notes for any deficiency that still allows a controlled
            start.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Vehicle</Label>
            <Select
              value={ambulanceLocationId || undefined}
              onValueChange={setAmbulanceLocationId}
              disabled={mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {ambulances.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.locationName} ({a.locationCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pre-shift-date">Shift date</Label>
            <Input id="pre-shift-date" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
          </div>
          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <p className="text-sm font-medium">Safety checklist</p>
            {AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={!!responses[item.key]}
                  onCheckedChange={(c) =>
                    setResponses((prev) => ({ ...prev, [item.key]: c === true }))
                  }
                  className="mt-0.5"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pre-mileage">Mileage / odometer (optional)</Label>
            <Input
              id="pre-mileage"
              value={mileageReading}
              onChange={(e) => setMileageReading(e.target.value)}
              placeholder="e.g. 45210"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pre-notes">Deficiencies / notes (optional)</Label>
            <Textarea
              id="pre-notes"
              value={deficienciesNotes}
              onChange={(e) => setDeficienciesNotes(e.target.value)}
              rows={3}
              placeholder="Document anything that needs follow-up or supervisor awareness"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => submit("draft")} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
          </Button>
          <Button onClick={() => submit("completed")} disabled={pending} className="bg-uventorybiz-navy text-white">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
