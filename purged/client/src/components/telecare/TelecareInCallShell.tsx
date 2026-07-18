import { useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { CalendarDays, PhoneOff, Video, Wifi, WifiOff } from "lucide-react";
import type {
  TelecareAudience,
  TelecareSessionDetailResponse,
  TelecareSessionExtendMinutes,
} from "@shared/telecare";
import { usePortalSession } from "@/portal/usePortalSession";
import {
  isFinalScheduledEndWarning,
  isNearingScheduledEnd,
  isPastScheduledEnd,
  minutesUntilScheduledEnd,
  resolveScheduledEnd,
  SCHEDULED_END_AUTO_END_GRACE_MINUTES,
} from "@shared/telecare";
import TelecareControlBar from "./TelecareControlBar";
import TelecareMainWorkspace from "./TelecareMainWorkspace";
import TelecareContextPanel from "./TelecareContextPanel";
import TelecareSessionTimeBanner from "./TelecareSessionTimeBanner";
import { TelecareSessionTabTrigger, TelecareSessionTabsList } from "./TelecareSessionTabs";

export type TelecareEndReason = "user" | "scheduled" | "remote";

const TELEcare_ALERT_LAYER = "z-[110]";

type TelecareInCallShellProps = {
  detail: TelecareSessionDetailResponse;
  audience: TelecareAudience;
  waitingForProvider?: boolean;
  onProviderJoined?: () => void;
  onEndSession: (reason: TelecareEndReason) => void;
  endSessionPending?: boolean;
  onExtendSession?: (additionalMinutes: TelecareSessionExtendMinutes) => Promise<void>;
  extendSessionPending?: boolean;
  encounterId?: string | null;
  portalLight?: boolean;
};

function ConnectionBadge() {
  const state = useConnectionState();

  if (state === ConnectionState.Connected) {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }

  if (state === ConnectionState.Reconnecting) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800">
        <WifiOff className="h-3 w-3" />
        Reconnecting…
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-gray-200 bg-gray-50 text-gray-600">
      <WifiOff className="h-3 w-3" />
      Connecting…
    </Badge>
  );
}

function resolveDetailScheduledEnd(detail: TelecareSessionDetailResponse): Date {
  if (detail.session.scheduledEnd) {
    return new Date(String(detail.session.scheduledEnd));
  }
  return resolveScheduledEnd(
    detail.session.scheduledStart ?? detail.appointment?.appointmentDate ?? new Date(),
    detail.session.scheduledEnd,
    detail.appointment?.durationMinutes,
  );
}

function VideoWorkspace({
  audience,
  detail,
  waitingForProvider,
  onProviderJoined,
  encounterId,
  patientId,
}: {
  audience: TelecareAudience;
  detail: TelecareSessionDetailResponse;
  waitingForProvider?: boolean;
  onProviderJoined?: () => void;
  encounterId?: string | null;
  patientId?: string | null;
}) {
  return (
    <TelecareMainWorkspace
      audience={audience}
      detail={detail}
      waitingForProvider={waitingForProvider}
      onProviderJoined={onProviderJoined}
      encounterId={encounterId}
      patientId={patientId}
    />
  );
}

export default function TelecareInCallShell({
  detail,
  audience,
  waitingForProvider,
  onProviderJoined,
  onEndSession,
  endSessionPending,
  onExtendSession,
  extendSessionPending,
  encounterId,
}: TelecareInCallShellProps) {
  const { session } = usePortalSession();
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [showWarn5, setShowWarn5] = useState(false);
  const [showWarn1, setShowWarn1] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [warn5Dismissed, setWarn5Dismissed] = useState(false);
  const [warn1Dismissed, setWarn1Dismissed] = useState(false);
  const [autoEndAfter, setAutoEndAfter] = useState<Date | null>(null);
  const [autoEndCountdown, setAutoEndCountdown] = useState<number | null>(null);
  const autoEndTriggered = useRef(false);

  const [effectiveScheduledEnd, setEffectiveScheduledEnd] = useState(() =>
    resolveDetailScheduledEnd(detail),
  );

  useEffect(() => {
    setEffectiveScheduledEnd(resolveDetailScheduledEnd(detail));
    setWarn5Dismissed(false);
    setWarn1Dismissed(false);
    setShowWarn5(false);
    setShowWarn1(false);
    setShowTimeUp(false);
    autoEndTriggered.current = false;
    setAutoEndAfter(null);
    setAutoEndCountdown(null);
  }, [
    detail.session.scheduledEnd,
    detail.session.scheduledStart,
    detail.appointment?.appointmentDate,
    detail.appointment?.durationMinutes,
  ]);

  const handleExtend = async (minutes: TelecareSessionExtendMinutes) => {
    if (!onExtendSession) return;
    await onExtendSession(minutes);
    setEffectiveScheduledEnd((prev) => new Date(prev.getTime() + minutes * 60_000));
    setShowWarn1(false);
    setShowTimeUp(false);
    setWarn1Dismissed(false);
    setWarn5Dismissed(false);
    autoEndTriggered.current = false;
    setAutoEndAfter(null);
    setAutoEndCountdown(null);
  };

  const staffCanExtend = audience === "staff" && !!onExtendSession;

  useEffect(() => {
    const tick = () => {
      const endIso = effectiveScheduledEnd.toISOString();

      if (autoEndAfter) {
        const secsLeft = Math.max(0, Math.ceil((autoEndAfter.getTime() - Date.now()) / 1000));
        setAutoEndCountdown(Math.ceil(secsLeft / 60));
        if (secsLeft <= 0 && !autoEndTriggered.current) {
          autoEndTriggered.current = true;
          setShowTimeUp(false);
          onEndSession("scheduled");
          return;
        }
      }

      if (isPastScheduledEnd(endIso) && !autoEndTriggered.current) {
        setShowTimeUp(true);
        setShowWarn5(false);
        setShowWarn1(false);
        if (!autoEndAfter) {
          setAutoEndAfter(new Date(Date.now() + SCHEDULED_END_AUTO_END_GRACE_MINUTES * 60_000));
        }
        return;
      }

      if (!warn1Dismissed && isFinalScheduledEndWarning(endIso)) {
        setShowWarn1(true);
        setShowWarn5(false);
      } else if (!warn5Dismissed && isNearingScheduledEnd(endIso) && !isFinalScheduledEndWarning(endIso)) {
        setShowWarn5(true);
      }
    };

    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, [autoEndAfter, effectiveScheduledEnd, onEndSession, warn1Dismissed, warn5Dismissed]);

  const remaining = minutesUntilScheduledEnd(effectiveScheduledEnd);
  const messagingEnabled = audience === "staff" || !!session?.features.messaging;
  const defaultClinicianId = detail.provider?.staffUserId ?? null;
  const connectionBadge = <ConnectionBadge />;
  const workspaceProps = {
    audience,
    detail,
    waitingForProvider,
    onProviderJoined,
    encounterId: encounterId ?? detail.encounterId,
    patientId: detail.patient?.patientId,
  };
  const contextPanelProps = {
    detail,
    audience,
    scheduledEnd: effectiveScheduledEnd,
    connectionBadge,
    messagingEnabled,
    messagesUnread,
    onMessagesUnreadChange: setMessagesUnread,
    defaultClinicianId,
  };

  const timeBanner = showTimeUp ? (
    <TelecareSessionTimeBanner
      variant="timeup"
      remainingMinutes={remaining}
      autoEndCountdownMinutes={autoEndCountdown}
      staffCanExtend={staffCanExtend}
      extendSessionPending={extendSessionPending}
      endSessionPending={endSessionPending}
      onExtend={(mins) => void handleExtend(mins)}
      onEndNow={() => {
        autoEndTriggered.current = true;
        setShowTimeUp(false);
        onEndSession("scheduled");
      }}
    />
  ) : showWarn1 ? (
    <TelecareSessionTimeBanner
      variant="warn1"
      remainingMinutes={remaining}
      autoEndCountdownMinutes={null}
      staffCanExtend={staffCanExtend}
      extendSessionPending={extendSessionPending}
      onDismiss={() => {
        setShowWarn1(false);
        setWarn1Dismissed(true);
      }}
      onExtend={(mins) => void handleExtend(mins)}
    />
  ) : showWarn5 ? (
    <TelecareSessionTimeBanner
      variant="warn5"
      remainingMinutes={remaining}
      autoEndCountdownMinutes={null}
      staffCanExtend={false}
      onDismiss={() => {
        setShowWarn5(false);
        setWarn5Dismissed(true);
      }}
    />
  ) : null;

  return (
    <div
      className={`${audience === "portal" ? "portal-root " : ""}telecare-session flex h-full min-h-0 flex-1 flex-col bg-[#eef2f6] overflow-hidden ${
        audience === "portal" ? "telecare-session--portal" : "telecare-session--staff"
      }`}
    >
      {timeBanner ? (
        <div className="shrink-0 px-3 pt-3 sm:px-4">{timeBanner}</div>
      ) : null}

      <div className="hidden lg:grid lg:grid-cols-3 gap-3 p-3 sm:p-4 flex-1 min-h-0 min-w-0 overflow-hidden">
        <div className="lg:col-span-2 flex min-h-0 min-w-0 flex-col rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200/70 overflow-hidden">
          <VideoWorkspace {...workspaceProps} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/70">
          <TelecareContextPanel {...contextPanelProps} />
        </div>
      </div>

      {audience === "portal" ? (
        <div className="lg:hidden flex flex-col flex-1 min-h-0 min-w-0 gap-3 p-3 sm:p-4 overflow-hidden">
          <Tabs defaultValue="video" className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
            <TelecareSessionTabsList columns={2} className="mb-1">
              <TelecareSessionTabTrigger value="video">
                <Video className="h-4 w-4 shrink-0" />
                Video
              </TelecareSessionTabTrigger>
              <TelecareSessionTabTrigger value="info">
                <CalendarDays className="h-4 w-4 shrink-0" />
                Visit details
              </TelecareSessionTabTrigger>
            </TelecareSessionTabsList>
            <TabsContent
              value="video"
              forceMount
              className="flex-1 min-h-[280px] mt-0 min-w-0 data-[state=inactive]:hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200/70 overflow-hidden"
            >
              <VideoWorkspace {...workspaceProps} />
            </TabsContent>
            <TabsContent
              value="info"
              className="flex-1 min-h-0 mt-0 min-w-0 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/70 data-[state=inactive]:hidden flex flex-col"
            >
              <TelecareContextPanel {...contextPanelProps} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="lg:hidden flex flex-1 min-h-0 min-w-0 flex-col gap-3 p-3 sm:p-4 overflow-hidden">
          <div className="flex min-h-[45dvh] flex-1 min-w-0 flex-col rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200/70 overflow-hidden">
            <VideoWorkspace {...workspaceProps} />
          </div>
          <div className="flex min-h-[34dvh] min-w-0 flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/70 overflow-hidden">
            <TelecareContextPanel {...contextPanelProps} />
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-gray-200/80 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:px-4">
        <TelecareControlBar onLeave={() => setEndSessionOpen(true)} leaveLabel="End visit" />
      </div>

      <AlertDialog open={endSessionOpen} onOpenChange={setEndSessionOpen}>
        <AlertDialogContent
          overlayClassName={TELEcare_ALERT_LAYER}
          className={TELEcare_ALERT_LAYER}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>End video visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the visit for everyone and mark the session complete. Participants will
              be disconnected and will not be able to rejoin this visit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endSessionPending}>Stay in call</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={endSessionPending}
              onClick={() => {
                setEndSessionOpen(false);
                onEndSession("user");
              }}
            >
              <PhoneOff className="h-4 w-4 mr-1" />
              {endSessionPending ? "Ending…" : "End visit for everyone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div aria-live="polite" className="sr-only">
        {waitingForProvider ? "Waiting for clinician" : "In video visit"}
        {showWarn5 ? " Visit ending soon." : null}
        {showWarn1 ? " One minute remaining." : null}
        {showTimeUp ? " Scheduled time has ended." : null}
      </div>
    </div>
  );
}
