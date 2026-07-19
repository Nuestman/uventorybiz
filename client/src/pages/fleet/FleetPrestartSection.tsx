import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AMBULANCE_PRESTART_CHECKLIST_ITEMS,
  allPrestartItemsDecided,
  countFaultyPrestartItems,
  emptyPrestartResponses,
  faultyPrestartLabels,
  hasFaultyPrestartItems,
  migrateLegacyResponses,
  type PrestartResponseValue,
  type PrestartResponses,
} from "@shared/fleetPrestartChecklist";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, ClipboardCheck, Eye, Filter, Loader2, Pencil, Plus, XCircle } from "lucide-react";
import type { FleetOpsStatus, FleetPrestartRow, FleetUnitRow } from "./types";
import { OpsBadge } from "./fleetUi";
import { LodgeFleetTicketDialog } from "./LodgeFleetTicketDialog";
import { cn } from "@/lib/utils";

export function FleetPrestartSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewRow, setViewRow] = useState<FleetPrestartRow | null>(null);
  const [editRow, setEditRow] = useState<FleetPrestartRow | null>(null);

  const { data: units = [] } = useQuery<FleetUnitRow[]>({
    queryKey: ["/api/fleet", { includeInactive: true }],
    queryFn: async () => {
      const res = await fetch("/api/fleet?includeInactive=true", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const listQueryKey = ["/api/fleet-prestart-checks", { vehicleFilter, fromDate, toDate }] as const;

  const { data: rawChecks = [], isLoading } = useQuery<FleetPrestartRow[]>({
    queryKey: listQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vehicleFilter !== "all") params.set("fleetLocationId", vehicleFilter);
      if (fromDate.trim()) params.set("fromShiftDate", fromDate.trim());
      if (toDate.trim()) params.set("toShiftDate", toDate.trim());
      const q = params.toString();
      const res = await fetch(`/api/fleet-prestart-checks${q ? `?${q}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const checks = useMemo(() => {
    if (statusFilter === "all") return rawChecks;
    return rawChecks.filter((r) => r.status === statusFilter);
  }, [rawChecks, statusFilter]);

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ["/api/fleet-prestart-checks"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vehicle pre-start checks</h3>
          <p className="text-uventorybiz-gray text-sm mt-1 max-w-2xl">
            Complete a checklist before taking a fleet vehicle into service. Drafts can be saved and finished later;
            submitted forms lock for crew (admins may still correct). Faulty items require notes and a repair ticket.
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
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {units.map((a) => (
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Shift date</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Ops status</TableHead>
                    <TableHead>Faulty</TableHead>
                    <TableHead>Completed by</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead>Check status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((row, index) => {
                    const responses = migrateLegacyResponses(row.responses);
                    const faultyCount = countFaultyPrestartItems(responses);
                    const canEditNonAdmin =
                      row.status === "draft" && user?.id && row.completedByUserId === user.id;
                    const canEdit = isAdmin || canEditNonAdmin;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {(() => {
                            try {
                              return format(parseISO(String(row.shiftDate)), "MMM d, yyyy");
                            } catch {
                              return String(row.shiftDate);
                            }
                          })()}
                        </TableCell>
                        <TableCell>{row.fleetName}</TableCell>
                        <TableCell>
                          <OpsBadge status={row.fleetOpsStatus} />
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {faultyCount > 0 ? (
                            <span className="text-amber-800 font-medium">{faultyCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {[row.completedByFirstName, row.completedByLastName].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{row.mileageReading?.trim() || "—"}</TableCell>
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
        units={units}
        onSaved={() => {
          invalidateList();
          queryClient.invalidateQueries({ queryKey: ["/api/fleet"] });
          setCreateOpen(false);
          toast({ title: "Pre-start check saved" });
        }}
      />

      {viewRow && <PrestartViewDialog row={viewRow} onClose={() => setViewRow(null)} />}

      {editRow && (
        <PrestartFormDialog
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          mode="edit"
          units={units}
          initial={editRow}
          onSaved={() => {
            invalidateList();
            queryClient.invalidateQueries({ queryKey: ["/api/fleet"] });
            setEditRow(null);
            toast({ title: "Pre-start check updated" });
          }}
        />
      )}
    </div>
  );
}

function PrestartViewDialog({ row, onClose }: { row: FleetPrestartRow; onClose: () => void }) {
  const responses = migrateLegacyResponses(row.responses);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-start check</DialogTitle>
          <DialogDescription>
            {row.fleetName} — shift {String(row.shiftDate)} —{" "}
            {[row.completedByFirstName, row.completedByLastName].filter(Boolean).join(" ") || "Staff"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {AMBULANCE_PRESTART_CHECKLIST_ITEMS.map((item) => {
            const v = responses[item.key];
            return (
              <div key={item.key} className="flex gap-2 text-sm">
                {v === "pass" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                ) : v === "faulty" ? (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                ) : (
                  <span className="h-4 w-4 shrink-0 mt-0.5 rounded-full border border-muted-foreground/40" />
                )}
                <span>
                  {item.label}
                  {v === "faulty" && (
                    <Badge variant="outline" className="ml-2 text-amber-800 border-amber-300">
                      Faulty
                    </Badge>
                  )}
                </span>
              </div>
            );
          })}
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

function ResponseToggle({
  value,
  onChange,
}: {
  value: PrestartResponseValue;
  onChange: (v: PrestartResponseValue) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5 shrink-0">
      <button
        type="button"
        className={cn(
          "px-2 py-1 text-xs rounded-sm",
          value === "pass" ? "bg-green-100 text-green-800 font-medium" : "text-muted-foreground hover:bg-muted"
        )}
        onClick={() => onChange(value === "pass" ? "unchecked" : "pass")}
      >
        Pass
      </button>
      <button
        type="button"
        className={cn(
          "px-2 py-1 text-xs rounded-sm",
          value === "faulty" ? "bg-amber-100 text-amber-900 font-medium" : "text-muted-foreground hover:bg-muted"
        )}
        onClick={() => onChange(value === "faulty" ? "unchecked" : "faulty")}
      >
        Faulty
      </button>
    </div>
  );
}

function PrestartFormDialog({
  open,
  onOpenChange,
  mode,
  units,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  units: FleetUnitRow[];
  initial?: FleetPrestartRow;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const defaultShift = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [fleetLocationId, setFleetLocationId] = useState("");
  const [shiftDate, setShiftDate] = useState(defaultShift);
  const [responses, setResponses] = useState<PrestartResponses>(() => emptyPrestartResponses());
  const [deficienciesNotes, setDeficienciesNotes] = useState("");
  const [mileageReading, setMileageReading] = useState("");
  const [opsStatus, setOpsStatus] = useState<FleetOpsStatus>("available");
  const [ticketOpen, setTicketOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setFleetLocationId(initial.fleetLocationId);
      setShiftDate(String(initial.shiftDate).slice(0, 10));
      setResponses(migrateLegacyResponses(initial.responses));
      setDeficienciesNotes(initial.deficienciesNotes ?? "");
      setMileageReading(initial.mileageReading ?? "");
      const unit = units.find((u) => u.id === initial.fleetLocationId);
      setOpsStatus((unit?.fleetOpsStatus as FleetOpsStatus) || "available");
    } else {
      setFleetLocationId("");
      setShiftDate(defaultShift);
      setResponses(emptyPrestartResponses());
      setDeficienciesNotes("");
      setMileageReading("");
      setOpsStatus("available");
    }
    setTicketOpen(false);
  }, [open, mode, initial, defaultShift, units]);

  useEffect(() => {
    if (!open || !fleetLocationId) return;
    const unit = units.find((u) => u.id === fleetLocationId);
    if (unit?.fleetOpsStatus) {
      setOpsStatus(unit.fleetOpsStatus as FleetOpsStatus);
    }
  }, [fleetLocationId, units, open]);

  const anyFaulty = hasFaultyPrestartItems(responses);
  const selectedUnit = units.find((u) => u.id === fleetLocationId);

  const saveMutation = useMutation({
    mutationFn: async (payload: { status: "draft" | "completed" }) => {
      const body = {
        fleetLocationId,
        shiftDate,
        responses,
        deficienciesNotes: deficienciesNotes.trim() || null,
        mileageReading: mileageReading.trim() || null,
        status: payload.status,
        ...(payload.status === "completed" ? { opsStatus } : {}),
      };
      if (mode === "create") {
        const res = await apiRequest("POST", "/api/fleet-prestart-checks", body);
        return res.json();
      }
      if (!initial) throw new Error("Missing record");
      const patch: Record<string, unknown> = {
        shiftDate,
        responses,
        deficienciesNotes: deficienciesNotes.trim() || null,
        mileageReading: mileageReading.trim() || null,
        status: payload.status,
        ...(payload.status === "completed" ? { opsStatus } : {}),
      };
      const res = await apiRequest("PATCH", `/api/fleet-prestart-checks/${initial.id}`, patch);
      return res.json();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Could not save", description: message, variant: "destructive" });
    },
    onSuccess: () => onSaved(),
  });

  const pending = saveMutation.isPending;

  const validateForComplete = (): boolean => {
    if (!fleetLocationId) {
      toast({ title: "Select a vehicle", variant: "destructive" });
      return false;
    }
    if (!allPrestartItemsDecided(responses)) {
      toast({
        title: "Checklist incomplete",
        description: "Mark every item Pass or Faulty before completing.",
        variant: "destructive",
      });
      return false;
    }
    if (anyFaulty && !deficienciesNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Document deficiencies when any item is Faulty.",
        variant: "destructive",
      });
      return false;
    }
    if (!opsStatus) {
      toast({ title: "Select vehicle ops status", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submit = (status: "draft" | "completed") => {
    if (status === "draft") {
      if (!fleetLocationId) {
        toast({ title: "Select a vehicle", variant: "destructive" });
        return;
      }
      saveMutation.mutate({ status: "draft" });
      return;
    }
    if (!validateForComplete()) return;
    if (anyFaulty) {
      setTicketOpen(true);
      return;
    }
    saveMutation.mutate({ status: "completed" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New pre-start check" : "Edit pre-start check"}</DialogTitle>
            <DialogDescription>
              Record shift-date vehicle checks. Mark items Pass or Faulty. Faulty items require notes and a repair
              ticket before completion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Vehicle</Label>
              <Select
                value={fleetLocationId || undefined}
                onValueChange={setFleetLocationId}
                disabled={mode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((a) => (
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
                <div key={item.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="pt-0.5">{item.label}</span>
                  <ResponseToggle
                    value={responses[item.key] ?? "unchecked"}
                    onChange={(v) => setResponses((prev) => ({ ...prev, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pre-ops">
                Vehicle ops status {anyFaulty ? "" : "(on complete)"}
              </Label>
              <Select value={opsStatus} onValueChange={(v) => setOpsStatus(v as FleetOpsStatus)}>
                <SelectTrigger id="pre-ops">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="standby">Standby</SelectItem>
                  <SelectItem value="out_of_service">Out of service</SelectItem>
                </SelectContent>
              </Select>
              {anyFaulty && (
                <p className="text-xs text-amber-800">
                  Faulty items found — consider Standby or Out of service if the vehicle should not run.
                </p>
              )}
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
              <Label htmlFor="pre-notes">
                Deficiencies / notes{anyFaulty ? " (required)" : " (optional)"}
              </Label>
              <Textarea
                id="pre-notes"
                value={deficienciesNotes}
                onChange={(e) => setDeficienciesNotes(e.target.value)}
                rows={3}
                placeholder="Document anything that needs follow-up or supervisor awareness"
                className={anyFaulty && !deficienciesNotes.trim() ? "border-amber-400" : undefined}
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

      <LodgeFleetTicketDialog
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        locationId={fleetLocationId}
        unitName={selectedUnit?.locationName ?? "Fleet vehicle"}
        shiftDate={shiftDate}
        faultyLabels={faultyPrestartLabels(responses)}
        deficienciesNotes={deficienciesNotes}
        onTicketCreated={() => {
          saveMutation.mutate({ status: "completed" });
        }}
      />
    </>
  );
}
