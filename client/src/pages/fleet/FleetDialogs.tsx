import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { FleetUnitRow } from "./types";

function generateFleetCodeFromName(name: string): string {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
  if (!cleaned) return "";

  const tokens = cleaned.split(" ").filter(Boolean);
  const meaningful = tokens.filter((t) => !["VEHICLE", "UNIT", "VAN", "TRUCK", "THE"].includes(t));
  const source = (meaningful.length > 0 ? meaningful : tokens).slice(0, 4);
  const initials = source.map((t) => t[0]).join("").slice(0, 4);

  const explicitNumberToken =
    tokens.find((t) => /^\d+$/.test(t)) ??
    tokens.find((t) => /(VAN|UNIT|TRUCK|FLT)[-_]?\d+/.test(t));
  const digits = explicitNumberToken ? (explicitNumberToken.match(/\d+/)?.[0] ?? "") : "";

  if (initials && digits) return `${initials}-${digits}`;
  if (initials) return initials;
  return "FLT";
}

export function FleetFormDialog({
  open,
  onOpenChange,
  fixedSites,
  mode,
  initial,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fixedSites: { id: string; locationName: string; locationCode: string }[];
  mode: "create" | "edit";
  initial?: FleetUnitRow;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [locationName, setLocationName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [description, setDescription] = useState("");
  const [stationedAtLocationId, setStationedAtLocationId] = useState<string>("");
  const [coverageNotes, setCoverageNotes] = useState("");
  const [callSign, setCallSign] = useState("");
  const [registrationPlate, setRegistrationPlate] = useState("");
  const [fleetNumber, setFleetNumber] = useState("");
  const [fleetOpsStatus, setFleetOpsStatus] = useState<string>("available");
  const [status, setStatus] = useState<string>("active");
  const [vehicleKind, setVehicleKind] = useState<"commute" | "mobile_store">("commute");
  const [locationCodeTouched, setLocationCodeTouched] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setLocationName(initial.locationName);
      setLocationCode(initial.locationCode);
      setDescription(initial.description ?? "");
      setStationedAtLocationId(initial.stationedAtLocationId ?? "");
      setCoverageNotes(initial.coverageNotes ?? "");
      setCallSign(initial.callSign ?? "");
      setRegistrationPlate(initial.registrationPlate ?? "");
      setFleetNumber(initial.fleetNumber ?? "");
      setFleetOpsStatus(initial.fleetOpsStatus ?? "available");
      setStatus(initial.status);
      setVehicleKind(initial.vehicleKind === "mobile_store" ? "mobile_store" : "commute");
      setLocationCodeTouched(true);
      void (async () => {
        try {
          const res = await fetch(
            `/api/business-assets?stockLocationId=${encodeURIComponent(initial.id)}&includeRetired=1`,
            { credentials: "include" },
          );
          if (!res.ok) return;
          const rows = (await res.json()) as Array<{ vehicleKind?: string | null }>;
          const kind = rows[0]?.vehicleKind;
          if (kind === "mobile_store" || kind === "commute") setVehicleKind(kind);
        } catch {
          /* ignore */
        }
      })();
    } else if (mode === "create") {
      setLocationName("");
      setLocationCode("");
      setDescription("");
      setStationedAtLocationId("");
      setCoverageNotes("");
      setCallSign("");
      setRegistrationPlate("");
      setFleetNumber("");
      setFleetOpsStatus("available");
      setStatus("active");
      setVehicleKind("commute");
      setLocationCodeTouched(false);
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open || mode !== "create" || locationCodeTouched) return;
    setLocationCode(generateFleetCodeFromName(locationName));
  }, [open, mode, locationName, locationCodeTouched]);

  const handleSubmit = async () => {
    if (!locationName.trim() || !locationCode.trim()) {
      toast({ title: "Name and code are required", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        locationName: locationName.trim(),
        locationCode: locationCode.trim().toUpperCase(),
        description: description.trim() || null,
        stationedAtLocationId: stationedAtLocationId || null,
        coverageNotes: coverageNotes.trim() || null,
        callSign: callSign.trim() || null,
        registrationPlate: registrationPlate.trim() || null,
        fleetNumber: fleetNumber.trim() || null,
        fleetOpsStatus,
        status,
        vehicleKind,
      };
      if (mode === "create") {
        await apiRequest("POST", "/api/fleet", body);
      } else if (initial) {
        await apiRequest("PATCH", `/api/fleet/${initial.id}`, body);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/care-locations"] });
      onSuccess();
    } catch (e: unknown) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={mode === "create" ? "text-2xl" : "text-xl"}>
            {mode === "create" ? "Register vehicle" : "Edit vehicle"}
          </DialogTitle>
          <DialogDescription>
            Inventory for this unit is tracked by location. Use Stock transfers to move supplies to or from stores and
            sites.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="fleet-name">Display name</Label>
            <Input
              id="fleet-name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Delivery Van 1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fleet-code">Short code</Label>
            <Input
              id="fleet-code"
              value={locationCode}
              onChange={(e) => {
                setLocationCodeTouched(true);
                setLocationCode(e.target.value);
              }}
              placeholder="e.g. VAN-1"
            />
          </div>
          <div className="grid gap-2">
            <Label>Stationed at store / site</Label>
            <Select
              value={stationedAtLocationId || "__none__"}
              onValueChange={(v) => setStationedAtLocationId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not assigned (multi-site / pooled)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not assigned — use coverage notes</SelectItem>
                {fixedSites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.locationName} ({s.locationCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Vehicle kind</Label>
            <Select
              value={vehicleKind}
              onValueChange={(v) => setVehicleKind(v as "commute" | "mobile_store")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commute">Commute / transport</SelectItem>
                <SelectItem value="mobile_store">Mobile store</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mobile store holds sellable stock as a shop extension; commute is primarily transport.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fleet-coverage">Coverage notes (optional)</Label>
            <Textarea
              id="fleet-coverage"
              value={coverageNotes}
              onChange={(e) => setCoverageNotes(e.target.value)}
              placeholder="e.g. Covers all sites when not at the main store"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="fleet-callsign">Unit call sign</Label>
              <Input
                id="fleet-callsign"
                value={callSign}
                onChange={(e) => setCallSign(e.target.value)}
                placeholder={mode === "create" ? "Leave blank for Unit 1, Unit 2, …" : undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fleet-plate">Registration</Label>
              <Input id="fleet-plate" value={registrationPlate} onChange={(e) => setRegistrationPlate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fleet-number">Fleet number</Label>
            <Input id="fleet-number" value={fleetNumber} onChange={(e) => setFleetNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Operational status</Label>
              <Select value={fleetOpsStatus} onValueChange={setFleetOpsStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="standby">Standby</SelectItem>
                  <SelectItem value="out_of_service">Out of service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Record status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fleet-desc">Description</Label>
            <Textarea id="fleet-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFleetDialog({
  row,
  onClose,
  onDone,
}: {
  row: FleetUnitRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await apiRequest("DELETE", `/api/fleet/${row.id}`);
      onDone();
    } catch (e: unknown) {
      toast({
        title: "Cannot delete",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {row.locationName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the vehicle record only after all vehicle inventory quantities are zero (transfer or adjust
            stock first). The location will no longer appear in transfer lists.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground"
          >
            {pending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
