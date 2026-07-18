import { livekitVideoProvider } from "./livekit.provider";
import { teamsVideoProvider } from "./teams.provider";
import type { VideoProvider, VideoProviderId } from "./types";

export type {
  ProvisionMeetingInput,
  ProvisionedVideoMeeting,
  RoomParticipantToken,
  VideoProviderId,
} from "./types";

function parseProviderId(): VideoProviderId {
  const raw = process.env.TELEHEALTH_PROVIDER?.trim().toLowerCase();
  if (raw === "teams") return "teams";
  return "livekit";
}

export function getDefaultVideoProviderId(): VideoProviderId {
  return parseProviderId();
}

export function getVideoProvider(id: VideoProviderId = getDefaultVideoProviderId()): VideoProvider {
  switch (id) {
    case "livekit":
      return livekitVideoProvider;
    case "teams":
      return teamsVideoProvider;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function isVideoProviderConfigured(id: VideoProviderId = getDefaultVideoProviderId()): boolean {
  return getVideoProvider(id).isConfigured();
}
