import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  Filter,
  History,
  Info,
  Loader2,
  Send,
  Share2,
  KeyRound,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";

type Partner = {
  id: string;
  name: string;
  referralFacilityId?: string | null;
  fhirBaseUrl?: string | null;
  deliveryUrl?: string | null;
  status: string;
  inboundKeyPrefix: string;
  hasDeliveryToken: boolean;
};

type TransferRow = {
  id: string;
  patientId: string;
  partnerId?: string | null;
  bundleId: string;
  status: string;
  deliveryMethod: string;
  errorMessage?: string | null;
  createdAt?: string;
};

type PatientOption = {
  patient: { id: string };
  employee: { firstName?: string; lastName?: string; employeeNumber?: string } | null;
};

type VisitRow = {
  id: string;
  visitDate: string;
  chiefComplaint: string;
  disposition: string;
};

function patientDisplayName(row: PatientOption | undefined, fallbackId?: string): string {
  if (!row?.employee) return fallbackId ?? "—";
  const name = `${row.employee.firstName ?? ""} ${row.employee.lastName ?? ""}`.trim();
  const num = row.employee.employeeNumber;
  return name ? (num ? `${name} (${num})` : name) : (fallbackId ?? row.patient.id);
}

function transferStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "delivered" || status === "received") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

export default function InteroperabilityPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("transfer");
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [historyPatientFilter, setHistoryPatientFilter] = useState("all");
  const [partnerId, setPartnerId] = useState<string>("none");
  const [selectedEncounters, setSelectedEncounters] = useState<string[]>([]);
  const [referringEncounterId, setReferringEncounterId] = useState<string>("none");
  const [lastTransferId, setLastTransferId] = useState<string | null>(null);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "",
    deliveryUrl: "",
    referralFacilityId: "",
    fhirBaseUrl: "",
  });
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);

  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ["/api/interop/partners"],
  });

  const { data: transfers = [] } = useQuery<TransferRow[]>({
    queryKey: ["/api/interop/transfers", historyPatientFilter === "all" ? "all" : historyPatientFilter],
    queryFn: async () => {
      const url =
        historyPatientFilter !== "all"
          ? `/api/interop/transfers?patientId=${encodeURIComponent(historyPatientFilter)}`
          : "/api/interop/transfers";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: patients = [] } = useQuery<PatientOption[]>({
    queryKey: ["/api/patients"],
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery<VisitRow[]>({
    queryKey: ["/api/medical-visits", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await fetch(`/api/medical-visits?patientId=${encodeURIComponent(patientId)}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!patientId,
  });

  const { data: referralFacilities = [] } = useQuery<any[]>({
    queryKey: ["/api/referral-facilities"],
  });

  const patientById = useMemo(() => {
    const map = new Map<string, PatientOption>();
    for (const p of patients) map.set(p.patient.id, p);
    return map;
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const emp = p.employee;
      const hay = [
        emp?.firstName,
        emp?.lastName,
        emp?.employeeNumber,
        p.patient.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [patients, patientSearch]);

  const patientLabel = patientDisplayName(patientById.get(patientId), patientId);

  const stats = useMemo(() => {
    const activePartners = partners.filter((p) => p.status === "active").length;
    const delivered = transfers.filter((t) => t.status === "delivered" || t.status === "received").length;
    const failed = transfers.filter((t) => t.status === "failed").length;
    const prepared = transfers.filter((t) => t.status === "prepared").length;
    return { activePartners, total: transfers.length, delivered, failed, prepared };
  }, [partners, transfers]);

  const prepare = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/interop/transfers/prepare", {
        patientId,
        partnerId: partnerId === "none" ? null : partnerId,
        encounterIds: selectedEncounters,
        referringEncounterId: referringEncounterId === "none" ? null : referringEncounterId,
      });
      return (await res.json()) as { transferId: string };
    },
    onSuccess: (data) => {
      setLastTransferId(data.transferId);
      qc.invalidateQueries({ queryKey: ["/api/interop/transfers"] });
      toast({ title: "Transfer bundle prepared", description: "You can download or push to the partner." });
    },
    onError: (e: Error) =>
      toast({ title: "Prepare failed", description: e.message, variant: "destructive" }),
  });

  const deliver = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await apiRequest("POST", `/api/interop/transfers/${transferId}/deliver`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/interop/transfers"] });
      toast({ title: "Bundle delivered", description: "Partner endpoint accepted the FHIR bundle." });
    },
    onError: (e: Error) =>
      toast({ title: "Delivery failed", description: e.message, variant: "destructive" }),
  });

  const createPartner = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/interop/partners", {
        name: newPartner.name,
        deliveryUrl: newPartner.deliveryUrl || null,
        fhirBaseUrl: newPartner.fhirBaseUrl || null,
        referralFacilityId: newPartner.referralFacilityId || null,
        status: "active",
      });
      return (await res.json()) as { inboundApiKey: string };
    },
    onSuccess: (data) => {
      setRevealedApiKey(data.inboundApiKey);
      setPartnerDialogOpen(false);
      setNewPartner({ name: "", deliveryUrl: "", referralFacilityId: "", fhirBaseUrl: "" });
      qc.invalidateQueries({ queryKey: ["/api/interop/partners"] });
      toast({ title: "Partner created", description: "Copy the inbound API key now — it won't be shown again." });
    },
    onError: (e: Error) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const toggleEncounter = (id: string, checked: boolean) => {
    setSelectedEncounters((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const downloadBundle = async (transferId: string) => {
    const res = await fetch(`/api/interop/transfers/${transferId}/bundle`, { credentials: "include" });
    if (!res.ok) {
      toast({ title: "Download failed", description: await res.text(), variant: "destructive" });
      return;
    }
    const bundle = await res.json();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mineaid-transfer-${transferId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="h-7 w-7 text-mineaid-navy" />
            FHIR interoperability
          </h2>
          <p className="text-mineaid-gray mt-1">
            HL7 FHIR R4 care-transfer bundles when a patient moves to another facility
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-mineaid-navy/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-mineaid-navy" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.activePartners}</p>
                <p className="text-xs text-mineaid-gray">Active partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                <p className="text-xs text-mineaid-gray">Delivered / received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <History className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.prepared}</p>
                <p className="text-xs text-mineaid-gray">Prepared (pending)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                <p className="text-xs text-mineaid-gray">Failed transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="transfer" className="tab-trigger-custom text-xs sm:text-sm">
              <Share2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
              Care transfer
            </TabsTrigger>
            <TabsTrigger value="partners" className="tab-trigger-custom text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="history" className="tab-trigger-custom text-xs sm:text-sm">
              <History className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
              History
            </TabsTrigger>
            <TabsTrigger value="reference" className="tab-trigger-custom text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
              Reference
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transfer" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Prepare transfer bundle</h3>
            {lastTransferId && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadBundle(lastTransferId)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download latest
                </Button>
                {partnerId !== "none" && (
                  <Button
                    size="sm"
                    className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
                    disabled={deliver.isPending}
                    onClick={() => deliver.mutate(lastTransferId)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Push to partner
                  </Button>
                )}
              </div>
            )}
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="h-5 w-5 mr-2 text-mineaid-navy" />
                Select patient & partner
              </CardTitle>
              <CardDescription>
                Bundle includes Patient, Encounters, Observations (vitals), Organizations, and a Composition summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Search patients</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Name or employee number…"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select
                    value={patientId || "none"}
                    onValueChange={(v) => {
                      setPatientId(v === "none" ? "" : v);
                      setSelectedEncounters([]);
                      setReferringEncounterId("none");
                      setLastTransferId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select patient…</SelectItem>
                      {filteredPatients.map((p) => (
                        <SelectItem key={p.patient.id} value={p.patient.id}>
                          {patientDisplayName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2 md:max-w-md">
                  <Label>Receiving partner (optional)</Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Download only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Download only (no push)</SelectItem>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {patientId && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Encounters to include</CardTitle>
                <CardDescription>
                  Leave unchecked to include the five most recent visits automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {visitsLoading ? (
                  <p className="text-sm text-mineaid-gray flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading visits…
                  </p>
                ) : visits.length === 0 ? (
                  <p className="text-sm text-mineaid-gray">
                    No encounters on file — recent visits will be included when the bundle is built.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto bg-white">
                    {visits.map((v) => (
                      <label
                        key={v.id}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedEncounters.includes(v.id)}
                          onCheckedChange={(c) => toggleEncounter(v.id, !!c)}
                        />
                        <span className="text-sm">
                          <span className="font-medium">{new Date(v.visitDate).toLocaleString()}</span>
                          <span className="text-mineaid-gray"> — {v.chiefComplaint}</span>
                          <Badge variant="secondary" className="ml-2 capitalize text-xs">
                            {v.disposition?.replace(/_/g, " ")}
                          </Badge>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {visits.length > 0 && (
                  <div className="space-y-2 max-w-md">
                    <Label>Referring encounter (optional)</Label>
                    <Select value={referringEncounterId} onValueChange={setReferringEncounterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-select most recent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Auto-select</SelectItem>
                        {visits.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {new Date(v.visitDate).toLocaleDateString()} — {v.chiefComplaint.slice(0, 40)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
                  disabled={!patientId || prepare.isPending}
                  onClick={() => prepare.mutate()}
                >
                  {prepare.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Prepare bundle
                </Button>

                <p className="text-xs text-mineaid-gray">
                  Staff read API: <code className="bg-gray-100 px-1 rounded">/api/fhir/Patient/:id/$everything</code>
                  {patientLabel ? ` — ${patientLabel}` : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="partners" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Partner facilities</h3>
            <Button
              className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
              onClick={() => setPartnerDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add partner
            </Button>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Registered partners</CardTitle>
              <CardDescription>
                Hospitals or facilities that receive pushed bundles or pull patient data with an API key.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {partners.length === 0 ? (
                <div className="py-10 text-center">
                  <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">No partners configured</p>
                  <p className="text-sm text-mineaid-gray mt-1">Add a receiving facility to enable push delivery.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Delivery URL</TableHead>
                        <TableHead>API key prefix</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs truncate max-w-[220px]">{p.deliveryUrl || "—"}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.inboundKeyPrefix}…</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
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

        <TabsContent value="history" className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Transfer history</h3>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="h-5 w-5 mr-2 text-mineaid-navy" />
                Filter history
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label>Patient</Label>
                <Select value={historyPatientFilter} onValueChange={setHistoryPatientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All patients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All patients</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p.patient.id} value={p.patient.id}>
                        {patientDisplayName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              {transfers.length === 0 ? (
                <div className="py-10 text-center">
                  <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">No transfers yet</p>
                  <p className="text-sm text-mineaid-gray mt-1">Prepared bundles appear here with delivery status.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {patientDisplayName(patientById.get(t.patientId), t.patientId)}
                          </TableCell>
                          <TableCell className="text-xs capitalize text-mineaid-gray">
                            {t.deliveryMethod?.replace(/_/g, " ") ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transferStatusVariant(t.status)} className="capitalize">
                              {t.status}
                            </Badge>
                            {t.errorMessage && (
                              <p
                                className="text-xs text-destructive mt-1 truncate max-w-[200px]"
                                title={t.errorMessage}
                              >
                                {t.errorMessage}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" onClick={() => downloadBundle(t.id)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {t.partnerId && t.status !== "delivered" && t.status !== "received" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={deliver.isPending}
                                onClick={() => deliver.mutate(t.id)}
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
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

        <TabsContent value="reference" className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">FHIR scope & APIs</h3>

          <Alert className="border-amber-200 bg-amber-50/80">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-900">Incidents are not in FHIR bundles today</AlertTitle>
            <AlertDescription className="text-amber-800 text-sm space-y-2">
              <p>
                <strong>Incident reports</strong> (workplace safety / HSE module) are stored separately from{" "}
                <strong>clinical encounters</strong>. FHIR export/import currently maps encounters, vitals, patient
                demographics, and care-transfer composition — not incident investigation records.
              </p>
              <p>
                When an injury leads to a clinic visit, the <strong>medical encounter</strong> (chief complaint,
                assessment, disposition, transfer facility) is what travels in the bundle. The parallel incident report
                (severity, site location, HSE notifications) remains in MineAid for compliance unless you add a future{" "}
                <code className="bg-amber-100 px-1 rounded">AdverseEvent</code> or{" "}
                <code className="bg-amber-100 px-1 rounded">Condition</code> mapping.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-mineaid-navy" />
                  Included in bundles
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-mineaid-gray space-y-1.5">
                <p>Patient (demographics, allergies, meds extensions)</p>
                <p>Encounter (visit type, modality, disposition, clinical extensions)</p>
                <p>Observation (LOINC vitals from encounter + vital_signs rows)</p>
                <p>Organization (sending tenant + destination referral facility)</p>
                <p>Composition (care-transfer summary note)</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-mineaid-navy" />
                  Not included (yet)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-mineaid-gray space-y-1.5">
                <p>Incident reports (HSE investigations)</p>
                <p>Drug/alcohol test results</p>
                <p>PDF attachments / DocumentReference</p>
                <p>Appointments & telecare session metadata</p>
                <p>Inventory / dispensed items</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Staff & partner endpoints</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 font-mono text-xs sm:text-sm">
              <p>
                <span className="text-mineaid-gray">GET</span> /api/fhir/metadata
              </p>
              <p>
                <span className="text-mineaid-gray">GET</span> /api/fhir/Patient/:id/$everything
              </p>
              <p>
                <span className="text-mineaid-gray">POST</span> /api/interop/transfers/prepare
              </p>
              <p>
                <span className="text-mineaid-gray">POST</span> /api/interop/fhir/Bundle{" "}
                <span className="text-mineaid-gray font-sans">(partner inbound, API key)</span>
              </p>
              <p className="text-mineaid-gray font-sans pt-2">
                Full documentation: <code>docs/FHIR_INTEROPERABILITY_FLOWS.md</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add interop partner</DialogTitle>
            <DialogDescription>
              Configure a receiving facility. An inbound API key is generated for the partner to pull FHIR data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newPartner.name} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} />
            </div>
            <div>
              <Label>Linked referral facility</Label>
              <Select
                value={newPartner.referralFacilityId || "none"}
                onValueChange={(v) =>
                  setNewPartner({ ...newPartner, referralFacilityId: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {referralFacilities.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery URL (POST bundle)</Label>
              <Input
                placeholder="https://partner.example/fhir/Bundle"
                value={newPartner.deliveryUrl}
                onChange={(e) => setNewPartner({ ...newPartner, deliveryUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Partner FHIR base URL (reference)</Label>
              <Input
                placeholder="https://partner.example/fhir/R4"
                value={newPartner.fhirBaseUrl}
                onChange={(e) => setNewPartner({ ...newPartner, fhirBaseUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
              disabled={!newPartner.name.trim() || createPartner.isPending}
              onClick={() => createPartner.mutate()}
            >
              Create partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealedApiKey} onOpenChange={() => setRevealedApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Partner inbound API key
            </DialogTitle>
            <DialogDescription>Copy this key now. Share it securely with the receiving facility.</DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto break-all">{revealedApiKey}</pre>
          <DialogFooter>
            <Button
              onClick={() => {
                if (revealedApiKey) navigator.clipboard.writeText(revealedApiKey);
                toast({ title: "Copied to clipboard" });
              }}
            >
              Copy key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
