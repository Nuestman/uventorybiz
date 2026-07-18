import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SymptomLogRow } from "@/lib/symptoms/symptomCatalog";
import { severityBadgeClass } from "@/lib/symptoms/symptomCatalog";
import {
  deletePortalSymptomLogOfflineFirst,
  fetchPortalSymptomLogsOfflineFirst,
  PORTAL_SYMPTOM_LOGS_QUERY_KEY,
} from "@/lib/offlineSymptoms";
import { PortalLogSymptomModal } from "./components/PortalLogSymptomModal";
import { PortalSymptomLogCard } from "./components/PortalSymptomLogCard";
import { PortalSymptomsInfoSection } from "./components/PortalSymptomsInfoSection";
import {
  PortalEmptyState,
  PortalLoadingBlock,
  PortalPageHeader,
  PORTAL_PRIMARY_BTN_CLASS,
} from "./portalUi";
import { usePortalSession } from "./usePortalSession";
import { PORTAL_SYMPTOMS } from "./portalRoutes";

type TimeFilter = "7d" | "30d" | "all";

function withinFilter(dateIso: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(dateIso);
  const cutoff = filter === "7d" ? subDays(new Date(), 7) : subDays(new Date(), 30);
  return d >= cutoff;
}

export default function PortalSymptomsPage() {
  const { session } = usePortalSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<SymptomLogRow | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");

  const patientId = session?.user.patientId ?? "";

  const { data = [], isLoading } = useQuery<SymptomLogRow[]>({
    queryKey: PORTAL_SYMPTOM_LOGS_QUERY_KEY,
    queryFn: () => fetchPortalSymptomLogsOfflineFirst(patientId),
    enabled: !!session?.features.symptoms && !!patientId,
  });

  const filtered = useMemo(
    () => data.filter((row) => withinFilter(row.recordedAt, timeFilter)),
    [data, timeFilter],
  );

  const summary = useMemo(() => {
    const last7 = data.filter((row) => withinFilter(row.recordedAt, "7d"));
    const severe = last7.filter((row) => row.severity >= 4).length;
    return { total: last7.length, severe };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePortalSymptomLogOfflineFirst(patientId, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PORTAL_SYMPTOM_LOGS_QUERY_KEY });
      toast({ title: "Entry deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not delete", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: SymptomLogRow) => {
    setEditRow(row);
    setModalOpen(true);
  };

  if (!session?.features.symptoms) {
    return (
      <PortalEmptyState
        title="Symptoms unavailable"
        description="Your organization has not enabled symptom tracking in the portal."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon={Stethoscope}
        title="Symptoms Tracker"
        description="Track how you feel over time and save for your next visit. Logs are shared with your care team."
        action={
          <Button className={PORTAL_PRIMARY_BTN_CLASS} onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Log symptom
          </Button>
        }
      />

      <PortalSymptomsInfoSection />

      {summary.total > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-700">
            <strong>{summary.total}</strong> log{summary.total === 1 ? "" : "s"} in the last 7 days
          </span>
          {summary.severe > 0 ? (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${severityBadgeClass(4)}`}>
              {summary.severe} moderate–severe or higher
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-mineaid-gray">
          View trends by symptom from each card&apos;s detail link.
        </p>
      </div>

      {isLoading ? (
        <PortalLoadingBlock />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <PortalEmptyState
              title="No symptom logs yet"
              description="Log symptoms when they occur so your care team can follow your health over time."
            />
            <div className="flex justify-center pb-4">
              <Button className={PORTAL_PRIMARY_BTN_CLASS} onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Log your first symptom
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="space-y-2">
              <div className="flex justify-end">
                <Link
                  href={`${PORTAL_SYMPTOMS}/${row.symptomCode}`}
                  className="text-xs font-medium text-[var(--portal-primary,#0d9488)] hover:underline"
                >
                  View {row.symptomLabel} trend
                </Link>
              </div>
              <PortalSymptomLogCard
                row={row}
                onEdit={row.canEdit ? openEdit : undefined}
                onDelete={row.canEdit ? (r) => deleteMutation.mutate(r.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      <PortalLogSymptomModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditRow(null);
        }}
        editRow={editRow}
      />
    </div>
  );
}
