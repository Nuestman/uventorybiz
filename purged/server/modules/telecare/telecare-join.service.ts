import type { Appointment, TelecareSession } from "@shared/schema";
import {
  JOIN_EARLY_MINUTES,
  computeScheduledEnd,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  usesInAppTelecareRoom,
} from "@shared/telecare";
import type { IStorage } from "../../storage";
import * as repo from "./telecare.repository";
import { syncTelecareSessionExpirySchedule } from "./telecare-session-expiry.scheduler";
import { finalizeTelehealthVisitFromSession } from "./telecare-appointment-sync.service";
import { provisionTelecareVideoMeeting } from "./telecare-provisioning.service";
import type { TelecareRoomCredentials } from "@shared/telecare";
import { getDefaultVideoProviderId, getVideoProvider, type VideoProviderId } from "./video-providers";

export { JOIN_EARLY_MINUTES };

export type JoinRole = "patient" | "provider";

export type JoinResult =
  | {
      ok: true;
      session: TelecareSession;
      videoProvider: string | null;
      room?: TelecareRoomCredentials;
      joinUrl?: string;
    }
  | { ok: false; error: string; code: string };

const ACTIVE_JOIN_STATUSES = new Set(["scheduled", "waiting_room", "in_progress"]);

function scheduledStartMs(session: TelecareSession): number {
  const d = session.scheduledStart instanceof Date ? session.scheduledStart : new Date(session.scheduledStart);
  return d.getTime();
}

export function isWithinJoinWindow(
  session: TelecareSession,
  appointment?: Appointment | null,
  now = new Date(),
): boolean {
  const start = scheduledStartMs(session);
  const earliest = start - JOIN_EARLY_MINUTES * 60_000;
  const durationMinutes = appointment?.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  const end = session.scheduledEnd
    ? new Date(
        session.scheduledEnd instanceof Date ? session.scheduledEnd : session.scheduledEnd,
      ).getTime()
    : computeScheduledEnd(session.scheduledStart, durationMinutes).getTime();
  const t = now.getTime();
  return t >= earliest && t <= end;
}

function appointmentAllowsPatientJoin(appointment?: Appointment | null): boolean {
  if (!appointment) return false;
  return appointment.status === "confirmed" || appointment.status === "in_progress";
}

function appointmentAllowsProviderJoin(appointment?: Appointment | null): boolean {
  if (!appointment) return true;
  return ["scheduled", "confirmed", "in_progress"].includes(appointment.status ?? "");
}

function sessionProviderId(session: TelecareSession): VideoProviderId {
  const id = session.videoProvider ?? getDefaultVideoProviderId();
  return id === "teams" ? "teams" : "livekit";
}

async function loadParticipantNames(
  storage: IStorage,
  tenantId: string,
  session: TelecareSession,
): Promise<{ patientName: string; providerName: string }> {
  const patientData = await storage.getPatient(session.patientId, tenantId);
  const employee = patientData?.employee;
  const patientName = employee
    ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Patient"
    : "Patient";
  const staff = await storage.getUser(session.providerId);
  const providerName = staff
    ? `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.email || "Provider"
    : "Provider";
  return { patientName, providerName };
}

export async function joinTelecareSession(
  storage: IStorage,
  tenantId: string,
  sessionId: string,
  role: JoinRole,
  appointment?: Appointment | null,
): Promise<JoinResult> {
  let session = await repo.getTelecareSessionById(tenantId, sessionId);
  if (!session) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };

  if (!ACTIVE_JOIN_STATUSES.has(session.status)) {
    return { ok: false, error: "This visit is no longer available to join", code: "INVALID_STATE" };
  }

  if (role === "patient" && !session.patientTelehealthConsentAt) {
    return {
      ok: false,
      error: "Please accept telehealth consent before joining",
      code: "CONSENT_REQUIRED",
    };
  }

  if (role === "patient" && !appointmentAllowsPatientJoin(appointment)) {
    return {
      ok: false,
      error: "Please confirm your appointment in the portal before joining",
      code: "NOT_CONFIRMED",
    };
  }

  if (role === "provider" && !appointmentAllowsProviderJoin(appointment)) {
    return { ok: false, error: "This appointment cannot be joined in its current state", code: "INVALID_STATE" };
  }

  if (!isWithinJoinWindow(session, appointment)) {
    return {
      ok: false,
      error: `You can join from ${JOIN_EARLY_MINUTES} minutes before the scheduled time until the appointment ends`,
      code: "OUTSIDE_WINDOW",
    };
  }

  const needsProvision =
    !session.roomId ||
    (!usesInAppTelecareRoom(session.videoProvider) &&
      !(session.joinUrlPatient && session.joinUrlProvider));

  if (needsProvision) {
    session =
      (await provisionTelecareVideoMeeting(storage, tenantId, sessionId, appointment ?? null)) ?? session;
  }

  const providerId = sessionProviderId(session);
  const videoProvider = getVideoProvider(providerId);

  if (!videoProvider.isConfigured()) {
    return {
      ok: false,
      error: "Video visits are not configured. Please contact the clinic.",
      code: "NOT_PROVISIONED",
    };
  }

  let nextStatus = session.status;
  if (role === "patient" && session.status === "scheduled") {
    nextStatus = "waiting_room";
  } else if (role === "provider" && (session.status === "scheduled" || session.status === "waiting_room")) {
    nextStatus = "in_progress";
  }

  const extras: Parameters<typeof repo.updateTelecareSessionStatus>[3] = {};
  if (nextStatus === "in_progress" && !session.actualStart) {
    extras.actualStart = new Date();
  }

  if (nextStatus !== session.status) {
    session =
      (await repo.updateTelecareSessionStatus(tenantId, sessionId, nextStatus, extras)) ?? session;
    const { appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
    syncTelecareSessionExpirySchedule(tenantId, sessionId, session, appointment);
  }

  if (providerId === "teams") {
    const joinUrl = role === "patient" ? session.joinUrlPatient : session.joinUrlProvider;
    if (!joinUrl) {
      return {
        ok: false,
        error: "Teams meeting is not ready yet. The clinic is setting up your meeting link.",
        code: "NOT_PROVISIONED",
      };
    }
    return {
      ok: true,
      session,
      videoProvider: "teams",
      joinUrl,
    };
  }

  if (!session.roomId) {
    return {
      ok: false,
      error: "Video room is not ready yet. Please try again shortly or contact the clinic.",
      code: "NOT_PROVISIONED",
    };
  }

  const { patientName, providerName } = await loadParticipantNames(storage, tenantId, session);
  const identity =
    role === "patient" ? `patient_${session.patientId}` : `provider_${session.providerId}`;
  const displayName = role === "patient" ? patientName : providerName;

  const tokenResult = await videoProvider.createParticipantToken({
    roomName: session.roomId,
    identity,
    displayName,
    role,
  });

  if (!tokenResult) {
    return {
      ok: false,
      error: "Video room is not ready yet. Please try again shortly or contact the clinic.",
      code: "NOT_PROVISIONED",
    };
  }

  return {
    ok: true,
    session,
    videoProvider: session.videoProvider ?? "livekit",
    room: {
      roomName: tokenResult.roomName,
      token: tokenResult.token,
      serverUrl: tokenResult.serverUrl,
    },
  };
}

export async function completeTelecareSession(
  tenantId: string,
  sessionId: string,
  _role: JoinRole,
): Promise<{ ok: true; session: TelecareSession } | { ok: false; error: string; code: string }> {
  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  if (!session) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };

  if (["completed", "cancelled", "no_show", "failed"].includes(session.status)) {
    await finalizeTelehealthVisitFromSession(tenantId, sessionId);
    return { ok: true, session };
  }

  const updated =
    (await repo.updateTelecareSessionStatus(tenantId, sessionId, "completed", {
      actualEnd: new Date(),
    })) ?? session;

  syncTelecareSessionExpirySchedule(tenantId, sessionId, updated);

  await finalizeTelehealthVisitFromSession(tenantId, sessionId);

  return { ok: true, session: updated };
}
