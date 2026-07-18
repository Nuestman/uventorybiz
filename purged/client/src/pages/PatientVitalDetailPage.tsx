import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VitalMetricDetail } from "@/components/vitals/VitalMetricDetail";
import { resolveVitalMetricKey, VITAL_METRIC_MAP, type VitalSignRow } from "@/lib/vitals/vitalsConfig";

export default function PatientVitalDetailPage() {
  const [, params] = useRoute("/patient/:id/vitals/:metric");
  const patientId = params?.id ?? "";
  const metricParam = params?.metric ?? "";
  const metricKey = resolveVitalMetricKey(metricParam);

  const { data: patient } = useQuery({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId,
    retry: false,
  });

  const { data: vitalsList = [], isLoading } = useQuery<VitalSignRow[]>({
    queryKey: ["/api/vital-signs", { patientId }],
    retry: false,
    enabled: !!patientId,
  });

  const patientName =
    patient && typeof patient === "object" && "firstName" in patient
      ? `${(patient as { firstName?: string }).firstName ?? ""} ${(patient as { lastName?: string }).lastName ?? ""}`.trim()
      : "Patient";

  if (!metricKey) {
    return (
      <div className="space-y-4">
        <Link href={`/patient/${patientId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to patient
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">Unknown vital type.</p>
      </div>
    );
  }

  const def = VITAL_METRIC_MAP[metricKey];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-mineaid-navy mb-1">
            <Activity className="h-5 w-5" />
            <h1 className="text-xl font-semibold text-gray-900">{def.label}</h1>
          </div>
          <p className="text-sm text-mineaid-gray">{patientName} — vital trends and history</p>
          {def.referenceRangeShort ? (
            <p className="text-sm text-mineaid-gray mt-2">
              <span className="font-medium text-gray-700">Ref: </span>
              {def.referenceRangeShort}
            </p>
          ) : def.education.normalRange ? (
            <p className="text-sm text-mineaid-gray mt-2">
              <span className="font-medium text-gray-700">Reference range: </span>
              {def.education.normalRange}
            </p>
          ) : null}
        </div>
        <Link href={`/patient/${patientId}#triage-vitals`}>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Patient record
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <VitalMetricDetail rows={vitalsList} metricKey={metricKey} />
      )}
    </div>
  );
}
