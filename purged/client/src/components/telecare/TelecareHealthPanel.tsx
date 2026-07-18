import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { TelecareAudience, TelecareHealthSummary } from "@shared/telecare";
import { getQueryFn } from "@/lib/queryClient";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

type Props = {
  audience: TelecareAudience;
  staffHealth?: TelecareHealthSummary | null;
};

export default function TelecareHealthPanel({ audience, staffHealth }: Props) {
  const { data: portalHealth, isLoading } = useQuery<{
    allergies?: string | null;
    medications?: string | null;
    medicalHistory?: string | null;
  }>({
    queryKey: ["/api/portal/health-profile"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: audience === "portal",
  });

  const health = audience === "staff" ? staffHealth : portalHealth;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading health information…
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm h-full overflow-auto">
      <p className="text-xs text-slate-500">
        {audience === "staff"
          ? "Patient health summary for this visit."
          : "Your health information on file with the clinic."}
      </p>
      <DetailRow label="Allergies" value={health?.allergies} />
      <DetailRow label="Medications" value={health?.medications} />
      <DetailRow label="Medical history" value={health?.medicalHistory} />
      {audience === "staff" && staffHealth?.chronicConditions ? (
        <DetailRow label="Chronic conditions" value={staffHealth.chronicConditions} />
      ) : null}
      {!health?.allergies && !health?.medications && !health?.medicalHistory ? (
        <p className="text-slate-500 text-sm">No health information on file.</p>
      ) : null}
    </div>
  );
}
