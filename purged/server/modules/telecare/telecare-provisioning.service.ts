import type { Appointment, TelecareSession } from "@shared/schema";
import type { IStorage } from "../../storage";
import { logInfo } from "../../logger";
import {
  getDefaultVideoProviderId,
  getVideoProvider,
  type ProvisionedVideoMeeting,
} from "./video-providers";
import * as repo from "./telecare.repository";

const DEFAULT_SLOT_MINUTES = 30;

function meetingSubject(patientName: string, appointmentType?: string | null): string {
  const typeLabel = (appointmentType ?? "visit").replace(/_/g, " ");
  return `MineAid telehealth — ${patientName} (${typeLabel})`;
}

async function loadNames(
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

function isRoomProvisioned(session: TelecareSession): boolean {
  return !!(session.roomId && session.joinUrlPatient && session.joinUrlProvider);
}

export async function provisionTelecareVideoMeeting(
  storage: IStorage,
  tenantId: string,
  sessionId: string,
  appointment?: Appointment | null,
): Promise<TelecareSession | null> {
  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  if (!session) return null;

  if (isRoomProvisioned(session)) {
    return session;
  }

  const { patientName, providerName } = await loadNames(storage, tenantId, session);
  const provider = getVideoProvider(getDefaultVideoProviderId());
  const scheduledStart =
    session.scheduledStart instanceof Date ? session.scheduledStart : new Date(session.scheduledStart);
  const scheduledEnd = session.scheduledEnd
    ? session.scheduledEnd instanceof Date
      ? session.scheduledEnd
      : new Date(session.scheduledEnd)
    : new Date(scheduledStart.getTime() + DEFAULT_SLOT_MINUTES * 60_000);

  let meeting: ProvisionedVideoMeeting | null = null;
  if (provider.isConfigured()) {
    meeting = await provider.provisionMeeting({
      sessionId,
      subject: meetingSubject(patientName, appointment?.appointmentType),
      scheduledStart,
      scheduledEnd,
      patientName,
      providerName,
    });
  } else {
    logInfo(`Video provider "${provider.id}" not configured for tenant ${tenantId}`);
  }

  if (!meeting) return session;

  return (
    (await repo.updateTelecareSessionStatus(tenantId, sessionId, session.status, {
      roomId: meeting.roomId,
      joinUrlPatient: meeting.joinUrlPatient,
      joinUrlProvider: meeting.joinUrlProvider,
      videoProvider: meeting.videoProvider,
    })) ?? session
  );
}

export async function provisionTelecareForAppointment(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
): Promise<TelecareSession | null> {
  if (appointment.modality !== "telehealth" || !appointment.telecareSessionId) return null;
  return provisionTelecareVideoMeeting(storage, tenantId, appointment.telecareSessionId, appointment);
}
