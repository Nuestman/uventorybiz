import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const ASSET_TYPES = ["equipment", "vehicle", "it", "tool", "other"] as const;
const STATUSES = ["functional", "faulty", "maintenance", "decommissioned", "lost", "sold"] as const;
const OPS = ["available", "deployed", "standby", "out_of_service"] as const;
const VEHICLE_KINDS = ["commute", "mobile_store"] as const;

const TYPE_LABELS: Record<(typeof ASSET_TYPES)[number], string> = {
  equipment: "Equipment",
  vehicle: "Vehicle",
  it: "IT",
  tool: "Tool",
  other: "Other",
};

const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  functional: "Functional",
  faulty: "Faulty",
  maintenance: "Under Maintenance",
  decommissioned: "Decommissioned",
  lost: "Lost / Missing",
  sold: "Sold",
};

const OPS_LABELS: Record<(typeof OPS)[number], string> = {
  available: "Available",
  deployed: "Deployed",
  standby: "Standby",
  out_of_service: "Out of service",
};

const VEHICLE_KIND_LABELS: Record<(typeof VEHICLE_KINDS)[number], string> = {
  commute: "Commute / transport",
  mobile_store: "Mobile store",
};

function opsStatusSubtextClass(opsStatus: string | null | undefined): string {
  switch (opsStatus) {
    case "available":
      return "text-emerald-700";
    case "deployed":
      return "text-sky-700";
    case "standby":
      return "text-amber-700";
    case "out_of_service":
      return "text-red-700";
    default:
      return "text-muted-foreground";
  }
}

type CareLocationOption = {
  id: string;
  locationName: string;
  locationKind?: string;
};

type BusinessAsset = {
  id: string;
  assetTag: string;
  name: string;
  description: string | null;
  assetType: (typeof ASSET_TYPES)[number];
  status: (typeof STATUSES)[number];
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  callSign: string | null;
  registrationPlate: string | null;
  fleetNumber: string | null;
  opsStatus: string | null;
  vehicleKind: (typeof VEHICLE_KINDS)[number] | null;
  stockLocationId: string | null;
  assignedLocationId: string | null;
  locationName?: string | null;
  assignedLocationName?: string | null;
  stockLocationName?: string | null;
  stationedAtLocationId?: string | null;
  stationedAtLocationName?: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  notes: string | null;
};

type AssetForm = {
  name: string;
  description: string;
  assetType: (typeof ASSET_TYPES)[number];
  status: (typeof STATUSES)[number];
  serialNumber: string;
  brand: string;
  model: string;
  callSign: string;
  registrationPlate: string;
  fleetNumber: string;
  opsStatus: (typeof OPS)[number];
  vehicleKind: (typeof VEHICLE_KINDS)[number];
  assignedLocationId: string;
  stationedAtLocationId: string;
  purchaseDate: string;
  warrantyExpiry: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  notes: string;
};

const emptyForm: AssetForm = {
  name: "",
  description: "",
  assetType: "equipment",
  status: "functional",
  serialNumber: "",
  brand: "",
  model: "",
  callSign: "",
  registrationPlate: "",
  fleetNumber: "",
  opsStatus: "available",
  vehicleKind: "commute",
  assignedLocationId: "",
  stationedAtLocationId: "",
  purchaseDate: "",
  warrantyExpiry: "",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
  notes: "",
};

function toDateInputValue(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.slice(0, 10);
}

function formatShortDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = raw.slice(0, 10);
  return d || "—";
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Days until next maintenance (negative = overdue). Null if no date. */
function daysUntilMaintenance(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const due = new Date(raw.slice(0, 10));
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - startOfToday().getTime()) / (1000 * 60 * 60 * 24));
}

function isMaintenanceAttention(a: BusinessAsset): boolean {
  if (a.status === "decommissioned" || a.status === "lost" || a.status === "sold") return false;
  const days = daysUntilMaintenance(a.nextMaintenanceDate);
  if (days === null) return false;
  return days <= 7;
}

function statusBadgeVariant(
  status: BusinessAsset["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "functional":
      return "default";
    case "faulty":
      return "destructive";
    case "maintenance":
      return "secondary";
    case "decommissioned":
      return "outline";
    case "lost":
      return "destructive";
    case "sold":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function rowHighlightClass(a: BusinessAsset): string | undefined {
  if (a.status === "decommissioned" || a.status === "sold") return "opacity-60";
  if (a.status === "faulty" || a.status === "lost") return "bg-red-50 hover:bg-red-100";
  if (a.status === "maintenance") return "bg-yellow-50 hover:bg-yellow-100";

  const days = daysUntilMaintenance(a.nextMaintenanceDate);
  if (days === null) return undefined;
  if (days < 0) return "bg-red-50 hover:bg-red-100";
  if (days <= 7) return "bg-yellow-50 hover:bg-yellow-100";
  return undefined;
}

function formToBody(form: AssetForm) {
  const base = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    assetType: form.assetType,
    status: form.status,
    notes: form.notes.trim() || null,
    purchaseDate: form.purchaseDate || null,
    warrantyExpiry: form.warrantyExpiry || null,
    lastMaintenanceDate: form.lastMaintenanceDate || null,
    nextMaintenanceDate: form.nextMaintenanceDate || null,
  };
  if (form.assetType === "vehicle") {
    return {
      ...base,
      callSign: form.callSign.trim() || null,
      registrationPlate: form.registrationPlate.trim() || null,
      fleetNumber: form.fleetNumber.trim() || null,
      opsStatus: form.opsStatus,
      vehicleKind: form.vehicleKind,
      serialNumber: null,
      brand: null,
      model: null,
      assignedLocationId: null,
      stationedAtLocationId: form.stationedAtLocationId || null,
    };
  }
  return {
    ...base,
    serialNumber: form.serialNumber.trim() || null,
    brand: form.brand.trim() || null,
    model: form.model.trim() || null,
    callSign: null,
    registrationPlate: null,
    fleetNumber: null,
    opsStatus: null,
    vehicleKind: null,
    assignedLocationId: form.assignedLocationId || null,
    stationedAtLocationId: null,
  };
}

export default function BusinessAssetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const typeFromUrl = useMemo(() => {
    const t = new URLSearchParams(search).get("type");
    return ASSET_TYPES.includes(t as (typeof ASSET_TYPES)[number])
      ? (t as (typeof ASSET_TYPES)[number])
      : "";
  }, [search]);
  const editIdFromUrl = useMemo(() => new URLSearchParams(search).get("edit"), [search]);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState(typeFromUrl);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessAsset | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [retireTarget, setRetireTarget] = useState<BusinessAsset | null>(null);
  /** Prevents ?edit= reopen race when dialog closes before URL updates. */
  const ignoreEditParamRef = useRef(false);

  useEffect(() => {
    setTypeFilter(typeFromUrl);
  }, [typeFromUrl]);

  const queryKey = ["/api/business-assets", { q, typeFilter, locationFilter }] as const;
  const { data: assets = [], isLoading } = useQuery<BusinessAsset[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (typeFilter) params.set("assetType", typeFilter);
      if (locationFilter) params.set("locationId", locationFilter);
      params.set("includeRetired", "1");
      const res = await fetch(`/api/business-assets?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load assets");
      return res.json();
    },
  });

  const { data: careLocations = [] } = useQuery<CareLocationOption[]>({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load locations");
      return res.json();
    },
  });

  const filteredAssets = useMemo(() => {
    if (!statusFilter) return assets;
    return assets.filter((a) => a.status === statusFilter);
  }, [assets, statusFilter]);

  const stats = useMemo(() => {
    const functional = assets.filter((a) => a.status === "functional").length;
    const needsAttention = assets.filter((a) => {
      if (a.status === "faulty" || a.status === "maintenance") return true;
      return isMaintenanceAttention(a);
    }).length;
    const outOfService = assets.filter(
      (a) => a.status === "decommissioned" || a.status === "lost" || a.status === "sold",
    ).length;
    return { total: assets.length, functional, needsAttention, outOfService };
  }, [assets]);

  const clearEditFromUrl = () => {
    const params = new URLSearchParams(search);
    if (!params.has("edit")) return;
    params.delete("edit");
    const qs = params.toString();
    setLocation(qs ? `/assets?${qs}` : "/assets");
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      if (editIdFromUrl) ignoreEditParamRef.current = true;
      clearEditFromUrl();
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = formToBody(form);
      if (!body.name) throw new Error("Name is required");
      if (editing) {
        const res = await apiRequest("PATCH", `/api/business-assets/${editing.id}`, body);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/business-assets", body);
      return res.json();
    },
    onSuccess: (row: BusinessAsset) => {
      const wasEdit = Boolean(editing);
      queryClient.invalidateQueries({ queryKey: ["/api/business-assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-assets/options"] });
      closeDialog(false);
      setForm(emptyForm);
      toast({
        title: wasEdit ? "Asset updated" : "Asset created",
        description: wasEdit ? undefined : `Tag ${row.assetTag} assigned.`,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const retireMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/business-assets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-assets/options"] });
      setRetireTarget(null);
      toast({ title: "Asset marked out of service" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    clearEditFromUrl();
    setEditing(null);
    setForm({
      ...emptyForm,
      assetType: (typeFilter as AssetForm["assetType"]) || "equipment",
    });
    setDialogOpen(true);
  };

  const openEdit = (a: BusinessAsset) => {
    setEditing(a);
    const status = STATUSES.includes(a.status) ? a.status : "functional";
    setForm({
      name: a.name,
      description: a.description ?? "",
      assetType: a.assetType,
      status,
      serialNumber: a.serialNumber ?? "",
      brand: a.brand ?? "",
      model: a.model ?? "",
      callSign: a.callSign ?? "",
      registrationPlate: a.registrationPlate ?? "",
      fleetNumber: a.fleetNumber ?? "",
      opsStatus: (OPS.includes(a.opsStatus as (typeof OPS)[number])
        ? a.opsStatus
        : "available") as (typeof OPS)[number],
      vehicleKind: (VEHICLE_KINDS.includes(a.vehicleKind as (typeof VEHICLE_KINDS)[number])
        ? a.vehicleKind
        : "commute") as (typeof VEHICLE_KINDS)[number],
      assignedLocationId: a.assignedLocationId ?? "",
      stationedAtLocationId: a.stationedAtLocationId ?? "",
      purchaseDate: toDateInputValue(a.purchaseDate),
      warrantyExpiry: toDateInputValue(a.warrantyExpiry),
      lastMaintenanceDate: toDateInputValue(a.lastMaintenanceDate),
      nextMaintenanceDate: toDateInputValue(a.nextMaintenanceDate),
      notes: a.notes ?? "",
    });
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!editIdFromUrl) {
      ignoreEditParamRef.current = false;
      return;
    }
    if (ignoreEditParamRef.current || !assets.length || dialogOpen) return;
    const match = assets.find((a) => a.id === editIdFromUrl);
    if (match) openEdit(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, assets, dialogOpen]);

  const setType = (t: string) => {
    setTypeFilter(t);
    const params = new URLSearchParams(search);
    if (t) params.set("type", t);
    else params.delete("type");
    const qs = params.toString();
    setLocation(qs ? `/assets?${qs}` : "/assets");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <MobileNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Business Assets
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            Tagged fixed assets register. Vehicles get a linked stock location for on-board inventory.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add asset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Functional</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.functional}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.needsAttention}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfService}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Asset register</CardTitle>
          <CardDescription>
            Search by tag, name, serial, call sign, or plate. Filter by type, status, and location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={typeFilter === "" ? "default" : "outline"}
              className={cn(typeFilter === "" && "bg-uventorybiz-navy hover:bg-uventorybiz-navy/90")}
              onClick={() => setType("")}
            >
              All types
            </Button>
            {ASSET_TYPES.map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={typeFilter === t ? "default" : "outline"}
                className={cn(typeFilter === t && "bg-uventorybiz-navy hover:bg-uventorybiz-navy/90")}
                onClick={() => setType(t)}
              >
                {TYPE_LABELS[t]}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 bg-white"
                placeholder="Search tag, name, serial, plate…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter || "__all__"}
              onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="sm:w-48 bg-white">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={locationFilter || "__all__"}
              onValueChange={(v) => setLocationFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="sm:w-56 bg-white">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All locations</SelectItem>
                {careLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.locationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden md:table-cell">Identity</TableHead>
                  <TableHead>Last maintenance</TableHead>
                  <TableHead className="hidden lg:table-cell">Next maintenance</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground py-10 text-center">
                      Loading assets…
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>No assets match this filter.</p>
                        <Button variant="outline" size="sm" onClick={openCreate}>
                          <Plus className="mr-1 h-4 w-4" />
                          Add asset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((a, index) => (
                    <TableRow key={a.id} className={rowHighlightClass(a)}>
                      <TableCell className="font-medium text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">{a.assetTag}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        {a.assetType === "vehicle" && a.opsStatus ? (
                          <div className={cn("text-xs font-bold mt-0.5", opsStatusSubtextClass(a.opsStatus))}>
                            Ops Status:{" "}
                            {OPS_LABELS[a.opsStatus as (typeof OPS)[number]] ??
                              a.opsStatus.replace(/_/g, " ")}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {TYPE_LABELS[a.assetType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(a.status)}>
                          {STATUS_LABELS[a.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.assetType === "vehicle" ? (
                          <div>
                            <div>{a.locationName?.trim() || "—"}</div>
                            {a.stationedAtLocationName ? (
                              <div className="text-xs mt-0.5">Home: {a.stationedAtLocationName}</div>
                            ) : null}
                            {a.vehicleKind ? (
                              <div className="text-xs mt-0.5">
                                {VEHICLE_KIND_LABELS[a.vehicleKind] ?? a.vehicleKind}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          a.locationName?.trim() || "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {a.assetType === "vehicle"
                          ? [a.callSign, a.fleetNumber, a.registrationPlate].filter(Boolean).join(" · ") ||
                            "—"
                          : [a.brand, a.model, a.serialNumber].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatShortDate(a.lastMaintenanceDate)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {formatShortDate(a.nextMaintenanceDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Row actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {a.status !== "decommissioned" && a.status !== "sold" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRetireTarget(a)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Mark out of service
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Tag ${editing.assetTag} cannot be changed.`
                : "An asset tag is assigned automatically on save."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.assetType}
                disabled={!!editing}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, assetType: v as AssetForm["assetType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as AssetForm["status"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    {STATUS_LABELS[form.status]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.assetType === "vehicle" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Call sign</Label>
                    <Input
                      value={form.callSign}
                      onChange={(e) => setForm((f) => ({ ...f, callSign: e.target.value }))}
                      placeholder={!editing ? "Leave blank for Unit 1, Unit 2, …" : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fleet number</Label>
                    <Input
                      value={form.fleetNumber}
                      onChange={(e) => setForm((f) => ({ ...f, fleetNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Registration plate</Label>
                  <Input
                    value={form.registrationPlate}
                    onChange={(e) => setForm((f) => ({ ...f, registrationPlate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ops status</Label>
                  <Select
                    value={form.opsStatus}
                    onValueChange={(v) => setForm((f) => ({ ...f, opsStatus: v as AssetForm["opsStatus"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ops status">
                        {OPS_LABELS[form.opsStatus]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {OPS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {OPS_LABELS[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle kind</Label>
                  <Select
                    value={form.vehicleKind}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, vehicleKind: v as AssetForm["vehicleKind"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{VEHICLE_KIND_LABELS[form.vehicleKind]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {VEHICLE_KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Mobile store = holds sellable / on-board stock as a shop extension. Commute = transport.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Stationed at (home store)</Label>
                  <Select
                    value={form.stationedAtLocationId || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, stationedAtLocationId: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {careLocations
                        .filter((loc) => loc.locationKind !== "fleet")
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.locationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Fixed store or warehouse this unit belongs to. On-board stock still uses this vehicle as its own
                    inventory location.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Serial number</Label>
                  <Input
                    value={form.serialNumber}
                    onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned location</Label>
                  <Select
                    value={form.assignedLocationId || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, assignedLocationId: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {careLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.locationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Purchase date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Warranty expiry</Label>
                <Input
                  type="date"
                  value={form.warrantyExpiry}
                  onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Last maintenance</Label>
                <Input
                  type="date"
                  value={form.lastMaintenanceDate}
                  onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Next maintenance</Label>
                <Input
                  type="date"
                  value={form.nextMaintenanceDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
            >
              {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!retireTarget} onOpenChange={(o) => !o && setRetireTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark out of service?</AlertDialogTitle>
            <AlertDialogDescription>
              {retireTarget
                ? `${retireTarget.assetTag} — ${retireTarget.name} will be marked decommissioned${
                    retireTarget.assetType === "vehicle" ? " and its stock location deactivated" : ""
                  }.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => retireTarget && retireMutation.mutate(retireTarget.id)}
            >
              Mark out of service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
