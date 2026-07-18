import { Clock, Stethoscope, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/portal/portalUi";
import type {
  TelecareAudience,
  TelecareParticipantSummary,
  TelecareSessionDetailResponse,
} from "@shared/telecare";
import { minutesUntilScheduledEnd } from "@shared/telecare";

function ParticipantChip({
  label,
  person,
}: {
  label: string;
  person?: TelecareParticipantSummary | null;
}) {
  if (!person) return null;
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200/80 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{person.name}</p>
      <p className="text-xs text-gray-600 truncate">
        {person.employeeNumber ? `ID ${person.employeeNumber}` : null}
        {person.employeeNumber && person.dateOfBirth ? " · " : null}
        {person.dateOfBirth
          ? `DOB ${new Date(String(person.dateOfBirth)).toLocaleDateString()}`
          : null}
      </p>
      {(person.phone || person.email) && (
        <p className="text-xs text-gray-500 truncate">{person.phone ?? person.email}</p>
      )}
    </div>
  );
}

type TelecareVisitMetaProps = {
  detail: TelecareSessionDetailResponse;
  audience: TelecareAudience;
  scheduledEnd: Date;
  connectionBadge: React.ReactNode;
};

export default function TelecareVisitMeta({
  detail,
  audience,
  scheduledEnd,
  connectionBadge,
}: TelecareVisitMetaProps) {
  const remaining = minutesUntilScheduledEnd(scheduledEnd);
  const endLabel = formatDateTime(scheduledEnd.toISOString());
  const counterparty = audience === "staff" ? detail.patient : detail.provider;

  return (
    <div className="space-y-3 pb-3 border-b border-gray-100">
      <div className="flex flex-wrap items-center gap-2">
        {connectionBadge}
        {remaining !== null && remaining > 0 ? (
          <Badge variant="outline" className="gap-1 border-gray-200 bg-gray-50 text-gray-700">
            <Clock className="h-3 w-3" />
            {Math.ceil(remaining)}m left
          </Badge>
        ) : null}
        <Badge variant="outline" className="gap-1 border-gray-200 bg-gray-50 text-gray-700">
          Ends {endLabel}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {audience === "staff" ? (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200/80">
              <Stethoscope className="h-4 w-4 shrink-0 text-[#0a4f6e]" />
              <span>You (clinician)</span>
            </div>
            <ParticipantChip label="Patient" person={detail.patient} />
          </>
        ) : (
          <>
            <ParticipantChip label="Your clinician" person={counterparty} />
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200/80">
              <User className="h-4 w-4 shrink-0 text-[#0a4f6e]" />
              <span>You</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
