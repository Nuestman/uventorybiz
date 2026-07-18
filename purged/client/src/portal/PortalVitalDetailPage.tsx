import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VitalHealthEducation } from "@/components/vitals/VitalHealthEducation";
import { VitalMetricDetail } from "@/components/vitals/VitalMetricDetail";
import { resolveVitalMetricKey, VITAL_METRIC_MAP, type VitalSignRow } from "@/lib/vitals/vitalsConfig";
import { getQueryFn } from "@/lib/queryClient";
import { PortalLoadingBlock, PortalPageHeader } from "./portalUi";

export default function PortalVitalDetailPage() {
  const [, params] = useRoute("/portal/vitals/:metric");
  const metricParam = params?.metric ?? "";
  const metricKey = resolveVitalMetricKey(metricParam);

  const { data = [], isLoading } = useQuery<VitalSignRow[]>({
    queryKey: ["/api/portal/vital-signs"],
    queryFn: getQueryFn<VitalSignRow[]>({ on401: "throw" }),
  });

  if (!metricKey) {
    return (
      <div className="space-y-4">
        <Link href="/portal/vitals">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to vitals
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">Unknown vital type.</p>
      </div>
    );
  }

  const def = VITAL_METRIC_MAP[metricKey];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <PortalPageHeader
            icon={Activity}
            title={def.label}
            description={`Trends and readings for ${def.label.toLowerCase()} from clinic visits and your self-reported entries.`}
          />
          {def.referenceRangeShort ? (
            <p className="text-sm text-muted-foreground max-w-2xl">
              <span className="font-medium text-gray-700">Ref: </span>
              {def.referenceRangeShort}
            </p>
          ) : def.education.normalRange ? (
            <p className="text-sm text-muted-foreground max-w-2xl">
              <span className="font-medium text-gray-700">Reference range: </span>
              {def.education.normalRange}
            </p>
          ) : null}
        </div>
        <Link href="/portal/vitals">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            All vitals
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PortalLoadingBlock />
      ) : (
        <>
          <VitalMetricDetail rows={data} metricKey={metricKey} />
          <VitalHealthEducation metricKey={metricKey} />
        </>
      )}
    </div>
  );
}
