import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartPulse, MapPin, Phone, Video } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import {
  PortalEmptyState,
  PortalLoadingBlock,
  PortalPageHeader,
  encounterStatusLabel,
  formatAppointmentType,
  modalityLabel,
  pathwayLabel,
} from "./portalUi";

type VisitSummary = {
  id: string;
  visitDate: string;
  visitType: string;
  modality?: string | null;
  pathway?: string | null;
  disposition: string;
  status: string | null;
  location: { locationName: string; locationCode: string } | null;
  transferFacility: { name: string } | null;
};

type ModalityTab = "all" | "in_person" | "telehealth" | "phone";
type TimeFilter = "all" | "90d" | "1y";
type StatusFilter = "all" | "finished" | "in_progress" | "planned" | "cancelled";

function dispositionVariant(disposition: string): "default" | "secondary" | "destructive" | "outline" {
  if (disposition?.includes("transfer")) return "destructive";
  if (disposition === "return_to_work") return "default";
  return "secondary";
}

function ModalityIcon({ modality }: { modality?: string | null }) {
  if (modality === "telehealth") return <Video className="h-3.5 w-3.5 shrink-0" />;
  if (modality === "phone") return <Phone className="h-3.5 w-3.5 shrink-0" />;
  return <MapPin className="h-3.5 w-3.5 shrink-0" />;
}

function filterVisits(
  visits: VisitSummary[],
  opts: { modalityTab: ModalityTab; visitType: string; status: StatusFilter; time: TimeFilter },
): VisitSummary[] {
  const now = Date.now();
  const cutoff90 = now - 90 * 24 * 60 * 60 * 1000;
  const cutoff1y = now - 365 * 24 * 60 * 60 * 1000;

  return visits.filter((v) => {
    if (opts.modalityTab !== "all" && (v.modality ?? "in_person") !== opts.modalityTab) return false;
    if (opts.visitType !== "all" && v.visitType !== opts.visitType) return false;
    if (opts.status !== "all" && (v.status ?? "") !== opts.status) return false;
    const t = new Date(v.visitDate).getTime();
    if (opts.time === "90d" && t < cutoff90) return false;
    if (opts.time === "1y" && t < cutoff1y) return false;
    return true;
  });
}

function VisitCard({ v }: { v: VisitSummary }) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {new Date(v.visitDate).toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            <span className="text-mineaid-gray font-normal"> · {formatAppointmentType(v.visitType)}</span>
          </CardTitle>
          <Badge variant={dispositionVariant(v.disposition)} className="capitalize whitespace-nowrap">
            {v.disposition?.replace(/_/g, " ") || "—"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-mineaid-gray space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <ModalityIcon modality={v.modality} />
            {modalityLabel(v.modality)}
          </Badge>
          {v.pathway && (
            <Badge variant="secondary" className="text-xs">
              {pathwayLabel(v.pathway)}
            </Badge>
          )}
          {v.status && (
            <Badge variant="outline" className="text-xs capitalize">
              {encounterStatusLabel(v.status)}
            </Badge>
          )}
        </div>
        {v.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {v.location.locationCode} — {v.location.locationName}
          </p>
        )}
        {v.modality === "telehealth" && !v.location && (
          <p className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 shrink-0" />
            Virtual visit
          </p>
        )}
        {v.transferFacility?.name && (
          <p className="text-amber-800 bg-amber-50/80 rounded px-2 py-1 text-xs inline-block">
            Transferred to {v.transferFacility.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalVisitsPage() {
  const { data = [], isLoading } = useQuery<VisitSummary[]>({
    queryKey: ["/api/portal/visit-summaries"],
    queryFn: getQueryFn<VisitSummary[]>({ on401: "throw" }),
  });

  const [modalityTab, setModalityTab] = useState<ModalityTab>("all");
  const [visitType, setVisitType] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const visitTypes = useMemo(() => {
    const set = new Set(data.map((v) => v.visitType).filter(Boolean));
    return [...set].sort();
  }, [data]);

  const filtered = useMemo(
    () =>
      filterVisits(data, {
        modalityTab,
        visitType,
        status: statusFilter,
        time: timeFilter,
      }),
    [data, modalityTab, visitType, statusFilter, timeFilter],
  );

  const tabCounts = useMemo(
    () => ({
      all: data.length,
      in_person: data.filter((v) => (v.modality ?? "in_person") === "in_person").length,
      telehealth: data.filter((v) => v.modality === "telehealth").length,
      phone: data.filter((v) => v.modality === "phone").length,
    }),
    [data],
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon={HeartPulse}
        title="Visit summaries"
        description="All clinical visits on your record — in-person, telehealth, and phone — with pathway and disposition summaries."
      />

      {isLoading ? (
        <PortalLoadingBlock />
      ) : data.length === 0 ? (
        <Card>
          <CardContent>
            <PortalEmptyState
              icon={HeartPulse}
              title="No visits recorded yet"
              description="After your first clinic visit, a summary will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={modalityTab}
              onValueChange={(v) => setModalityTab(v as ModalityTab)}
              className="w-full"
            >
              <div className="tabs-list-custom mb-4">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-transparent h-auto p-1 gap-1 sm:gap-2">
                  <TabsTrigger value="all" className="tab-trigger-custom text-xs sm:text-sm">
                    All ({tabCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="in_person" className="tab-trigger-custom text-xs sm:text-sm">
                    In person ({tabCounts.in_person})
                  </TabsTrigger>
                  <TabsTrigger value="telehealth" className="tab-trigger-custom text-xs sm:text-sm">
                    Telehealth ({tabCounts.telehealth})
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="tab-trigger-custom text-xs sm:text-sm">
                    Phone ({tabCounts.phone})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={modalityTab} className="mt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-mineaid-gray">Visit type</Label>
                    <Select value={visitType} onValueChange={setVisitType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {visitTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatAppointmentType(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-mineaid-gray">Status</Label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="finished">Finished</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-mineaid-gray">Time period</Label>
                    <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="1y">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <PortalEmptyState
                    title="No visits match filters"
                    description="Try a different modality tab or clear the filters above."
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((v) => (
                      <VisitCard key={v.id} v={v} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
