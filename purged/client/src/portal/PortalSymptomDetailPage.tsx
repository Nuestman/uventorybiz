import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SymptomFrequencyChart } from "@/lib/symptoms/SymptomFrequencyChart";
import type { SymptomLogRow, SymptomTypeRow } from "@/lib/symptoms/symptomCatalog";
import { formatSymptomSeverity } from "@/lib/symptoms/symptomCatalog";
import {
  fetchPortalSymptomLogsByTypeOfflineFirst,
  fetchPortalSymptomTypesOfflineFirst,
  PORTAL_SYMPTOM_LOGS_QUERY_KEY,
  PORTAL_SYMPTOM_TYPES_QUERY_KEY,
} from "@/lib/offlineSymptoms";
import { PortalSymptomLogCard } from "./components/PortalSymptomLogCard";
import { PortalLoadingBlock, PortalPageHeader, formatDateTime } from "./portalUi";
import { usePortalSession } from "./usePortalSession";
import { PORTAL_SYMPTOMS } from "./portalRoutes";

export default function PortalSymptomDetailPage() {
  const [, params] = useRoute("/portal/symptoms/:code");
  const code = params?.code ?? "";
  const { session } = usePortalSession();
  const patientId = session?.user.patientId ?? "";

  const { data: types = [] } = useQuery<SymptomTypeRow[]>({
    queryKey: PORTAL_SYMPTOM_TYPES_QUERY_KEY,
    queryFn: fetchPortalSymptomTypesOfflineFirst,
    enabled: !!patientId,
  });

  const symptomType = types.find((t) => t.code === code);

  const { data: logs = [], isLoading } = useQuery<SymptomLogRow[]>({
    queryKey: [...PORTAL_SYMPTOM_LOGS_QUERY_KEY, { symptomTypeId: symptomType?.id ?? "" }],
    queryFn: () => fetchPortalSymptomLogsByTypeOfflineFirst(patientId, symptomType!.id),
    enabled: !!symptomType?.id && !!patientId,
  });

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const avgSeverity = logs.reduce((sum, r) => sum + r.severity, 0) / logs.length;
    const last = [...logs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0];
    return { count: logs.length, avgSeverity, last };
  }, [logs]);

  if (!code) {
    return (
      <div className="space-y-4">
        <Link href={PORTAL_SYMPTOMS}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to symptoms
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">Unknown symptom.</p>
      </div>
    );
  }

  if (!symptomType && types.length > 0) {
    return (
      <div className="space-y-4">
        <Link href={PORTAL_SYMPTOMS}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to symptoms
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">Symptom type not found.</p>
      </div>
    );
  }

  const title = symptomType?.label ?? code;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PortalPageHeader
          icon={Stethoscope}
          title={title}
          description={`Frequency and history for ${title.toLowerCase()} from your self-reported logs.`}
        />
        <Link href={PORTAL_SYMPTOMS}>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            All symptoms
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PortalLoadingBlock />
      ) : (
        <>
          {stats ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{stats.count}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{stats.avgSeverity.toFixed(1)}/5</p>
                  <p className="text-xs text-muted-foreground">{formatSymptomSeverity(Math.round(stats.avgSeverity))}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Most recent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold">{formatDateTime(stats.last.recordedAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatSymptomSeverity(stats.last.severity)}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <SymptomFrequencyChart rows={logs} />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">History</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No logs for this symptom yet.</p>
            ) : (
              logs.map((row) => <PortalSymptomLogCard key={row.id} row={row} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
