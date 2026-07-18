export type VideoProviderId = "livekit" | "teams";

export interface ProvisionedVideoMeeting {
  videoProvider: VideoProviderId;
  roomId: string;
  joinUrlPatient: string;
  joinUrlProvider: string;
}

export interface ProvisionMeetingInput {
  sessionId: string;
  subject: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  patientName: string;
  providerName: string;
}

export interface RoomParticipantTokenInput {
  roomName: string;
  identity: string;
  displayName: string;
  role: "patient" | "provider";
}

export interface RoomParticipantToken {
  token: string;
  serverUrl: string;
  roomName: string;
}

export interface VideoProvider {
  id: VideoProviderId;
  isConfigured(): boolean;
  provisionMeeting(input: ProvisionMeetingInput): Promise<ProvisionedVideoMeeting | null>;
  createParticipantToken(input: RoomParticipantTokenInput): Promise<RoomParticipantToken | null>;
}
