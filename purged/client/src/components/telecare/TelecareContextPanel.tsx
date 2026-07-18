import { CalendarDays, HeartPulse, MessageSquare } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/portal/portalUi";
import type { TelecareAudience, TelecareSessionDetailResponse } from "@shared/telecare";
import TelecareHealthPanel from "./TelecareHealthPanel";
import TelecareMessagingPanel from "./TelecareMessagingPanel";
import TelecareVisitMeta from "./TelecareVisitMeta";
import { TelecareSessionTabTrigger, TelecareSessionTabsList } from "./TelecareSessionTabs";

type TelecareContextPanelProps = {
  detail: TelecareSessionDetailResponse;
  audience: TelecareAudience;
  scheduledEnd: Date;
  connectionBadge: React.ReactNode;
  messagingEnabled?: boolean;
  messagesUnread?: number;
  onMessagesUnreadChange?: (count: number) => void;
  defaultClinicianId?: string | null;
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export default function TelecareContextPanel({
  detail,
  audience,
  scheduledEnd,
  connectionBadge,
  messagingEnabled = false,
  messagesUnread = 0,
  onMessagesUnreadChange,
  defaultClinicianId,
}: TelecareContextPanelProps) {
  const appt = detail.appointment;
  const appointmentId = appt?.id ?? null;
  const patientId = detail.patient?.patientId ?? null;
  const encounterId = detail.encounterId ?? null;
  const showMessagingTab =
    messagingEnabled &&
    !!(appointmentId || encounterId) &&
    (audience === "staff" ? !!patientId : true);

  return (
    <Tabs defaultValue="appointment" className="h-full flex flex-col min-h-0 min-w-0 overflow-hidden">
      <TelecareSessionTabsList columns={showMessagingTab ? 3 : 2}>
        <TelecareSessionTabTrigger value="appointment" className="relative">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Appt</span>
        </TelecareSessionTabTrigger>
        <TelecareSessionTabTrigger value="health">
          <HeartPulse className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Health</span>
        </TelecareSessionTabTrigger>
        {showMessagingTab ? (
          <TelecareSessionTabTrigger value="messages" className="relative">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Messages</span>
            {messagesUnread > 0 ? (
              <Badge className="absolute -top-1 -right-0.5 h-4 min-w-[1rem] px-1 text-[9px]">
                {messagesUnread > 9 ? "9+" : messagesUnread}
              </Badge>
            ) : null}
          </TelecareSessionTabTrigger>
        ) : null}
      </TelecareSessionTabsList>

      <TabsContent
        value="appointment"
        className="flex-1 overflow-y-auto overscroll-contain mt-0 space-y-3 text-sm data-[state=inactive]:hidden min-h-0 min-w-0"
        forceMount
      >
        <TelecareVisitMeta
          detail={detail}
          audience={audience}
          scheduledEnd={scheduledEnd}
          connectionBadge={connectionBadge}
        />
        {appt ? (
          <>
            <DetailRow label="Scheduled" value={formatDateTime(String(appt.appointmentDate))} />
            <DetailRow label="Type" value={appt.appointmentType?.replace(/_/g, " ")} />
            <DetailRow label="Status" value={appt.status} />
            <DetailRow label="Duration" value={appt.durationMinutes ? `${appt.durationMinutes} minutes` : null} />
            <DetailRow label="Notes" value={appt.notes} />
          </>
        ) : (
          <p className="text-slate-500 text-sm">No appointment details.</p>
        )}
      </TabsContent>

      <TabsContent
        value="health"
        className="flex-1 overflow-y-auto overscroll-contain mt-0 text-sm data-[state=inactive]:hidden min-h-0 min-w-0"
        forceMount
      >
        <TelecareHealthPanel audience={audience} staffHealth={detail.health} />
      </TabsContent>

      {showMessagingTab ? (
        <TabsContent
          value="messages"
          className="flex-1 min-h-0 min-w-0 mt-0 text-sm data-[state=inactive]:hidden flex flex-col overflow-hidden"
          forceMount
        >
          <TelecareMessagingPanel
            audience={audience}
            appointmentId={appointmentId}
            patientId={patientId}
            encounterId={encounterId}
            messagingEnabled={messagingEnabled}
            defaultClinicianId={defaultClinicianId}
            defaultClinicianName={detail.provider?.name}
            onUnreadChange={onMessagesUnreadChange}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
