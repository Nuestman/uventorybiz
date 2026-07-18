import { env } from "../../config/env";

/** Patient portal in-app video room (WebRTC). */
export function portalTelecareJoinUrl(sessionId: string): string {
  const base = env.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/portal/visits/${encodeURIComponent(sessionId)}/join`;
}

/** Staff HMS in-app video room (WebRTC). */
export function staffTelecareRoomUrl(sessionId: string): string {
  const base = env.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/telecare/${encodeURIComponent(sessionId)}`;
}
