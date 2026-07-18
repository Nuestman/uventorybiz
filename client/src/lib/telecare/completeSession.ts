const ACTIVE_TELECARE_SESSION_STATUSES = new Set(["scheduled", "waiting_room", "in_progress"]);

export function canEndTelecareSessionFromEncounter(visit: {
  modality?: string | null;
  telecareSessionId?: string | null;
  telecareSessionStatus?: string | null;
  status?: string | null;
}): boolean {
  if (visit.modality !== "telehealth" || !visit.telecareSessionId) return false;
  if (visit.telecareSessionStatus) {
    return ACTIVE_TELECARE_SESSION_STATUSES.has(visit.telecareSessionStatus);
  }
  return visit.status === "in_progress";
}

export async function completeTelecareSessionById(sessionId: string): Promise<void> {
  const res = await fetch(`/api/telecare/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to end video session");
  }
}
