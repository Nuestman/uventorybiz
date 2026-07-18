import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video } from "lucide-react";
import {
  PortalLoadingBlock,
  PortalPageHeader,
  formatDateTime,
} from "@/portal/portalUi";
import { getQueryFn } from "@/lib/queryClient";
import { usePortalSession } from "@/portal/usePortalSession";
import TelecareCallLayout from "./TelecareCallLayout";
import TelecareConsentModal from "./TelecareConsentModal";
import TelecareExternalJoin from "./TelecareExternalJoin";
import TelecareJoinGate from "./TelecareJoinGate";
import TelecareOpenEncounterModal from "./TelecareOpenEncounterModal";
import TelecarePreJoin from "./TelecarePreJoin";
import { PortalTelecarePreJoin } from "@/portal/telecare/PortalTelecarePreJoin";
import { PortalTelecareWaitingView } from "@/portal/telecare/PortalTelecareWaitingView";
import TelecareSessionEnded from "./TelecareSessionEnded";
import { useTelecareRoom } from "./useTelecareRoom";
import { useTelecareFullscreen } from "./useTelecareFullscreen";
import {
  usesInAppTelecareRoom,
  type TelecareAudience,
  type TelehealthVideoProviderId,
} from "@shared/telecare";

type TelecareRoomProps = {
  sessionId: string;
  audience: TelecareAudience;
  backHref: string;
  primaryColor?: string;
};

type TelecareConfig = {
  videoProvider: TelehealthVideoProviderId;
  configured: boolean;
};

export default function TelecareRoom({
  sessionId,
  audience,
  backHref,
  primaryColor: primaryColorProp,
}: TelecareRoomProps) {
  const { session: portalSession } = usePortalSession();
  const primaryColor =
    primaryColorProp ?? (portalSession?.tenant.primaryColor?.trim() || "#142F5C");

  const configPath =
    audience === "portal" ? "/api/portal/telecare/config" : "/api/telecare/config";

  const { data: config } = useQuery<TelecareConfig>({
    queryKey: [configPath],
    queryFn: getQueryFn<TelecareConfig>({ on401: "throw" }),
    staleTime: 5 * 60_000,
  });

  const [, navigate] = useLocation();
  const room = useTelecareRoom({ sessionId, audience });

  const appointment = room.detailQuery.data?.appointment;
  const scheduledLabel = appointment?.appointmentDate
    ? `Scheduled: ${formatDateTime(String(appointment.appointmentDate))}`
    : undefined;

  const sessionProvider =
    room.detailQuery.data?.session?.videoProvider ?? config?.videoProvider ?? "livekit";
  const inAppRoom = usesInAppTelecareRoom(sessionProvider);
  const isPortal = audience === "portal";
  const detail = room.detailQuery.data;
  const workflowPatientId = room.endedPatientId ?? detail?.patient?.patientId ?? null;
  const appointmentId = detail?.appointment?.id ?? null;
  const portalMessagingEnabled = !!portalSession?.features.messaging;
  const messagingHref =
    workflowPatientId && (audience === "staff" || portalMessagingEnabled)
      ? audience === "staff"
        ? `/messages?patientId=${encodeURIComponent(workflowPatientId)}${
            appointmentId ? `&appointmentId=${encodeURIComponent(appointmentId)}` : ""
          }`
        : `/portal/messages${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ""}`
      : null;

  const providerName =
    (detail?.appointment as { providerName?: string } | undefined)?.providerName?.trim() ||
    (detail?.session as { providerDisplayName?: string } | undefined)?.providerDisplayName?.trim() ||
    "Your clinician";
  const visitLabel = appointment?.appointmentType?.trim() || "Video visit";

  const isLiveSessionPhase =
    inAppRoom && (room.phase === "prejoin" || room.phase === "waiting" || room.phase === "incall");
  useTelecareFullscreen(isLiveSessionPhase);

  const shellClass = isLiveSessionPhase
    ? isPortal
      ? "portal-root fixed inset-0 z-[100] flex flex-col bg-[#eef2f6]"
      : "fixed inset-0 z-[100] flex flex-col bg-[#eef2f6]"
    : isPortal
      ? "portal-root portal-page min-h-screen"
      : "min-h-screen bg-mineaid-light-gray p-4 sm:p-6";

  return (
    <div className={shellClass}>
      {!isPortal && !isLiveSessionPhase ? (
        <div>
          <Link href={backHref}>
            <span className="inline-flex items-center gap-1 text-sm text-mineaid-navy hover:underline mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to telehealth queue
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-7 w-7 text-mineaid-navy" />
            {inAppRoom ? "Telehealth visit" : "Teams visit"}
          </h2>
          {scheduledLabel ? <p className="text-mineaid-gray mt-1">{scheduledLabel}</p> : null}
        </div>
      ) : null}

      {room.phase === "loading" && (
        <div className="flex flex-1 items-center justify-center p-6">
          <PortalLoadingBlock
            label={room.joinPending ? "Opening encounter and joining visit…" : "Loading visit…"}
          />
        </div>
      )}

      {(room.phase === "gate" || room.phase === "error") && room.gateMessage && (
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <TelecareJoinGate audience={audience} message={room.gateMessage} backHref={backHref} primaryColor={primaryColor} />
        </div>
      )}

      {isPortal && room.phase === "consent" && (
        <TelecareConsentModal
          open
          onOpenChange={(open) => {
            if (!open) navigate(backHref);
          }}
          onAccept={() => room.acceptConsent()}
          accepting={room.consentPending}
          primaryColor={primaryColor}
        />
      )}

      {audience === "staff" && room.phase === "encounter_setup" && (
        <TelecareOpenEncounterModal
          sessionId={sessionId}
          open
          patientName={detail?.patient?.name}
          onOpenChange={(open) => {
            if (!open) navigate(backHref);
          }}
          onEncounterReady={room.onEncounterReady}
        />
      )}

      {room.phase === "prejoin" && !inAppRoom && (
        <TelecareExternalJoin
          sessionId={sessionId}
          audience={audience}
          scheduledLabel={scheduledLabel}
          primaryColor={primaryColor}
          onJoined={() => room.markExternalJoinComplete()}
        />
      )}

      {room.phase === "prejoin" && inAppRoom && isPortal ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
          <PortalTelecarePreJoin
            title="Join video visit"
            subtitle={visitLabel}
            scheduledLabel={
              scheduledLabel
                ? `${scheduledLabel.replace(/^Scheduled:\s*/, "")}. You can enter the waiting room early.`
                : undefined
            }
            patientName={portalSession?.user.firstName}
            patientImageUrl={portalSession?.user.profileImageUrl}
            micEnabled={room.micEnabled}
            cameraEnabled={room.cameraEnabled}
            onToggleMic={() => room.setMicEnabled((v) => !v)}
            onToggleCamera={() => room.setCameraEnabled((v) => !v)}
            onJoin={() => room.joinVisit()}
            joining={room.joinPending}
            startPreview={room.startPreview}
            stopPreview={room.stopPreview}
            primaryColor={primaryColor}
          />
        </div>
      ) : null}

      {room.phase === "prejoin" && inAppRoom && !isPortal ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
          <TelecarePreJoin
          title="Connect with patient"
          description="Allow camera and microphone when prompted. You can turn them off before entering."
          micEnabled={room.micEnabled}
          cameraEnabled={room.cameraEnabled}
          onToggleMic={() => room.setMicEnabled((v) => !v)}
          onToggleCamera={() => room.setCameraEnabled((v) => !v)}
          onJoin={() => room.joinVisit()}
          joining={room.joinPending}
          startPreview={room.startPreview}
          stopPreview={room.stopPreview}
          primaryColor={primaryColor}
        />
        </div>
      ) : null}

      {room.phase === "waiting" && isPortal && room.roomCreds && inAppRoom && detail ? (
        <div className="relative flex-1 min-h-0">
          <div className="sr-only" aria-hidden>
            <TelecareCallLayout
              credentials={room.roomCreds}
              audience={audience}
              micEnabled={room.micEnabled}
              cameraEnabled={room.cameraEnabled}
              detail={detail}
              encounterId={room.encounterId}
              waitingForProvider
              onProviderJoined={room.handleProviderJoined}
              onEndSession={(reason) => void room.endSession(reason)}
              endSessionPending={room.endSessionPending}
            />
          </div>
          <PortalTelecareWaitingView
            providerName={providerName}
            visitLabel={visitLabel}
            scheduledLabel={scheduledLabel?.replace(/^Scheduled:\s*/, "")}
            onLeave={() => void room.endSession("user")}
            leavePending={room.endSessionPending}
          />
        </div>
      ) : null}

      {(room.phase === "incall" || (room.phase === "waiting" && !isPortal)) &&
      room.roomCreds &&
      inAppRoom &&
      detail ? (
        <div className="flex flex-1 min-h-0 flex-col">
        <TelecareCallLayout
          credentials={room.roomCreds}
          audience={audience}
          micEnabled={room.micEnabled}
          cameraEnabled={room.cameraEnabled}
          detail={detail}
          encounterId={room.encounterId}
          waitingForProvider={room.phase === "waiting" && !isPortal}
          onProviderJoined={room.handleProviderJoined}
          onEndSession={(reason) => void room.endSession(reason)}
          endSessionPending={room.endSessionPending}
          onExtendSession={
            audience === "staff"
              ? async (minutes) => {
                  await room.extendSession(minutes);
                }
              : undefined
          }
          extendSessionPending={room.extendSessionPending}
        />
        </div>
      ) : null}

      {room.phase === "ended" && (
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-8">
          <TelecareSessionEnded
          audience={audience}
          backHref={backHref}
          endedAt={room.endedAt}
          endReason={room.endReason}
          primaryColor={primaryColor}
          workflowHref={
            audience === "staff" && workflowPatientId
              ? `/encounter?patientId=${encodeURIComponent(workflowPatientId)}`
              : null
          }
          messagingHref={messagingHref}
        />
        </div>
      )}
    </div>
  );
}
