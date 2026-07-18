import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "../../../config/env";
import { logError, logInfo } from "../../../logger";
import { portalTelecareJoinUrl, staffTelecareRoomUrl } from "../telecare-urls";
import type {
  ProvisionMeetingInput,
  ProvisionedVideoMeeting,
  RoomParticipantToken,
  RoomParticipantTokenInput,
  VideoProvider,
} from "./types";

const TOKEN_TTL_SECONDS = 2 * 60 * 60; // 2 hours — covers join window + visit
const ROOM_EMPTY_TIMEOUT_SEC = 15 * 60;
const DEFAULT_MEETING_MINUTES = 30;

function livekitConfig() {
  return {
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    wsUrl: env.LIVEKIT_WS_URL,
    httpUrl: env.LIVEKIT_HTTP_URL,
  };
}

function roomNameForSession(sessionId: string): string {
  return `mineaid_tc_${sessionId.replace(/-/g, "")}`;
}

function getRoomServiceClient(): RoomServiceClient | null {
  const { apiKey, apiSecret, httpUrl } = livekitConfig();
  if (!apiKey || !apiSecret || !httpUrl) return null;
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

async function ensureRoomExists(roomName: string, metadata?: string): Promise<boolean> {
  const client = getRoomServiceClient();
  if (!client) return false;

  try {
    await client.createRoom({
      name: roomName,
      emptyTimeout: ROOM_EMPTY_TIMEOUT_SEC,
      maxParticipants: 6,
      metadata: metadata?.slice(0, 500),
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("already exists")) {
      return true;
    }
    logError("LiveKit room creation failed", err instanceof Error ? err : new Error(message));
    return false;
  }
}

async function mintToken(input: RoomParticipantTokenInput): Promise<RoomParticipantToken | null> {
  const { apiKey, apiSecret, wsUrl } = livekitConfig();
  if (!apiKey || !apiSecret || !wsUrl) return null;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: input.identity,
    name: input.displayName.slice(0, 120),
    ttl: TOKEN_TTL_SECONDS,
  });

  at.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    hidden: false,
  });

  const token = await at.toJwt();
  return { token, serverUrl: wsUrl, roomName: input.roomName };
}

export const livekitVideoProvider: VideoProvider = {
  id: "livekit",

  isConfigured() {
    const { apiKey, apiSecret, wsUrl, httpUrl } = livekitConfig();
    return !!(apiKey && apiSecret && wsUrl && httpUrl);
  },

  async provisionMeeting(input: ProvisionMeetingInput): Promise<ProvisionedVideoMeeting | null> {
    if (!this.isConfigured()) {
      logInfo("LiveKit video provider is not configured — skipping room provisioning");
      return null;
    }

    const roomName = roomNameForSession(input.sessionId);
    const metadata = JSON.stringify({
      subject: input.subject.slice(0, 200),
      scheduledStart: input.scheduledStart.toISOString(),
    });

    const created = await ensureRoomExists(roomName, metadata);
    if (!created) return null;

    return {
      videoProvider: "livekit",
      roomId: roomName,
      joinUrlPatient: portalTelecareJoinUrl(input.sessionId),
      joinUrlProvider: staffTelecareRoomUrl(input.sessionId),
    };
  },

  async createParticipantToken(input: RoomParticipantTokenInput): Promise<RoomParticipantToken | null> {
    if (!this.isConfigured()) return null;
    await ensureRoomExists(input.roomName);
    return mintToken(input);
  },
};
