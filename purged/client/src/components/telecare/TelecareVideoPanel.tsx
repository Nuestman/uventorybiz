import { useEffect } from "react";
import { useConnectionState, useParticipants, VideoTrack, useTracks } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Clock, Loader2, Stethoscope } from "lucide-react";
import type { TelecareAudience } from "@shared/telecare";

type TelecareVideoPanelProps = {
  audience: TelecareAudience;
  waitingForProvider?: boolean;
  onProviderJoined?: () => void;
};

export default function TelecareVideoPanel({
  audience,
  waitingForProvider,
  onProviderJoined,
}: TelecareVideoPanelProps) {
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const providerPresent = remoteParticipants.some((p) => p.identity.startsWith("provider_"));
  const connected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (waitingForProvider && providerPresent) {
      onProviderJoined?.();
    }
  }, [waitingForProvider, providerPresent, onProviderJoined]);

  const remoteTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  }).filter((t) => !t.participant.isLocal);

  const localTracks = useTracks([Track.Source.Camera], { onlySubscribed: true }).filter(
    (t) => t.participant.isLocal,
  );

  const mainTrack = remoteTracks[0];
  const localTrack = localTracks[0];

  return (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden rounded-xl">
      <div className="relative flex-1 min-h-0">
        {waitingForProvider && !providerPresent && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white text-gray-800 p-6 text-center">
            <div className="rounded-full bg-white p-4 mb-4 shadow-sm ring-1 ring-gray-200">
              <Loader2 className="h-8 w-8 animate-spin text-[#0a4f6e]" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Virtual waiting room</p>
            <p className="text-sm text-gray-600 mt-2 max-w-sm">
              You&apos;re checked in. Your clinician will join shortly — please stay on this page with
              your camera and microphone ready.
            </p>
            <ul className="mt-6 text-left text-sm text-gray-600 space-y-2 max-w-xs">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#1ab8a0]" />
                Typical wait: a few minutes
              </li>
              <li className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 shrink-0 text-[#1ab8a0]" />
                Visit starts automatically when clinician joins
              </li>
            </ul>
          </div>
        )}

        {!connected && !waitingForProvider && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 text-gray-600 text-sm">
            Connecting to secure video…
          </div>
        )}

        {mainTrack ? (
          <VideoTrack trackRef={mainTrack} className="h-full w-full object-contain bg-black" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-600 text-sm p-4 text-center">
            {providerPresent || audience === "staff"
              ? "Waiting for video…"
              : "Clinician has not joined yet"}
          </div>
        )}

        {localTrack && (
          <div className="absolute bottom-3 right-3 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-white shadow-lg z-10 ring-1 ring-gray-200/80">
            <VideoTrack trackRef={localTrack} className="h-full w-full object-cover mirror-video" />
          </div>
        )}
      </div>
    </div>
  );
}
