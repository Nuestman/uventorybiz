import { env } from "../../../config/env";
import { logError, logInfo } from "../../../logger";
import type {
  ProvisionMeetingInput,
  ProvisionedVideoMeeting,
  RoomParticipantToken,
  RoomParticipantTokenInput,
  VideoProvider,
} from "./types";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const DEFAULT_MEETING_MINUTES = 30;

interface GraphTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GraphOnlineMeeting {
  id?: string;
  joinWebUrl?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function teamsGraphConfig() {
  const tenantId = env.TEAMS_GRAPH_TENANT_ID;
  const clientId = env.TEAMS_GRAPH_CLIENT_ID;
  const clientSecret = env.TEAMS_GRAPH_CLIENT_SECRET;
  const organizerUserId = env.TEAMS_ORGANIZER_USER_ID;
  const organizerEmail = env.TEAMS_ORGANIZER_EMAIL;
  return { tenantId, clientId, clientSecret, organizerUserId, organizerEmail };
}

function hasOrganizer(config: ReturnType<typeof teamsGraphConfig>): boolean {
  return !!(config.organizerUserId || config.organizerEmail);
}

async function fetchGraphAccessToken(): Promise<string | null> {
  const config = teamsGraphConfig();
  if (!config.tenantId || !config.clientId || !config.clientSecret) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: GRAPH_SCOPE,
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const data = (await res.json()) as GraphTokenResponse & { expires_in?: number };
  if (!res.ok || !data.access_token) {
    logError("Teams Graph token request failed", new Error(data.error_description ?? data.error ?? res.statusText));
    return null;
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function resolveOrganizerPath(token: string): Promise<string | null> {
  const config = teamsGraphConfig();
  if (config.organizerUserId) {
    return `users/${encodeURIComponent(config.organizerUserId)}`;
  }
  if (!config.organizerEmail) return null;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.organizerEmail)}?$select=id`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    logError("Teams Graph organizer lookup failed", new Error(await res.text()));
    return null;
  }
  const user = (await res.json()) as { id?: string };
  return user.id ? `users/${encodeURIComponent(user.id)}` : null;
}

export const teamsVideoProvider: VideoProvider = {
  id: "teams",

  isConfigured() {
    const config = teamsGraphConfig();
    return !!(config.tenantId && config.clientId && config.clientSecret && hasOrganizer(config));
  },

  async provisionMeeting(input: ProvisionMeetingInput): Promise<ProvisionedVideoMeeting | null> {
    if (!this.isConfigured()) {
      logInfo("Teams video provider is not configured — skipping meeting creation");
      return null;
    }

    const token = await fetchGraphAccessToken();
    if (!token) return null;

    const organizerPath = await resolveOrganizerPath(token);
    if (!organizerPath) return null;

    const end =
      input.scheduledEnd.getTime() > input.scheduledStart.getTime()
        ? input.scheduledEnd
        : new Date(input.scheduledStart.getTime() + DEFAULT_MEETING_MINUTES * 60_000);

    const payload = {
      startDateTime: input.scheduledStart.toISOString(),
      endDateTime: end.toISOString(),
      subject: input.subject.slice(0, 250),
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/${organizerPath}/onlineMeetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      logError("Teams online meeting creation failed", new Error(await res.text()));
      return null;
    }

    const meeting = (await res.json()) as GraphOnlineMeeting;
    if (!meeting.joinWebUrl || !meeting.id) {
      logError("Teams meeting response missing join URL", new Error(JSON.stringify(meeting)));
      return null;
    }

    return {
      videoProvider: "teams",
      roomId: meeting.id,
      joinUrlPatient: meeting.joinWebUrl,
      joinUrlProvider: meeting.joinWebUrl,
    };
  },

  async createParticipantToken(_input: RoomParticipantTokenInput): Promise<RoomParticipantToken | null> {
    return null;
  },
};
