import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { useEffect } from "react";
import "@livekit/components-styles";
import type { TelecareAudience, TelecareRoomCredentials, TelecareSessionDetailResponse } from "@shared/telecare";
import TelecareInCallShell, { type TelecareEndReason } from "./TelecareInCallShell";

type TelecareCallLayoutProps = {
  credentials: TelecareRoomCredentials;
  audience: TelecareAudience;
  micEnabled: boolean;
  cameraEnabled: boolean;
  detail: TelecareSessionDetailResponse;
  encounterId?: string | null;
  waitingForProvider?: boolean;
  onProviderJoined?: () => void;
  onEndSession: (reason: TelecareEndReason) => void;
  endSessionPending?: boolean;
  onExtendSession?: (additionalMinutes: 15 | 30) => Promise<void>;
  extendSessionPending?: boolean;
  portalLight?: boolean;
};

function LocalMediaBootstrap({
  micEnabled,
  cameraEnabled,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected || !localParticipant) return;

    const syncMedia = async () => {
      await localParticipant.setMicrophoneEnabled(micEnabled);
      await localParticipant.setCameraEnabled(cameraEnabled);
    };

    void syncMedia();
    const retry = window.setTimeout(() => void syncMedia(), 500);
    return () => window.clearTimeout(retry);
  }, [cameraEnabled, connectionState, localParticipant, micEnabled]);

  return null;
}

export default function TelecareCallLayout({
  credentials,
  audience,
  micEnabled,
  cameraEnabled,
  detail,
  encounterId,
  waitingForProvider,
  onProviderJoined,
  onEndSession,
  endSessionPending,
  onExtendSession,
  extendSessionPending,
  portalLight,
}: TelecareCallLayoutProps) {
  return (
    <LiveKitRoom
      token={credentials.token}
      serverUrl={credentials.serverUrl}
      connect
      audio={false}
      video={false}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <RoomAudioRenderer />
      <LocalMediaBootstrap micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
      <TelecareInCallShell
        detail={detail}
        audience={audience}
        waitingForProvider={waitingForProvider}
        onProviderJoined={onProviderJoined}
        onEndSession={onEndSession}
        endSessionPending={endSessionPending}
        onExtendSession={onExtendSession}
        extendSessionPending={extendSessionPending}
        encounterId={encounterId}
        portalLight={portalLight}
      />
    </LiveKitRoom>
  );
}
