import type { Appointment, TelecareSession } from "@shared/schema";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES, computeScheduledEnd } from "@shared/telecare";
import type { IStorage } from "../../storage";
import * as repo from "./telecare.repository";

function participantFromEmployee(
  employee: { firstName?: string | null; lastName?: string | null; employeeNumber?: string | null; dateOfBirth?: Date | null; phone?: string | null; email?: string | null } | null | undefined,
  fallbackName: string,
  extras?: { patientId?: string },
) {
  const name = employee
    ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || fallbackName
    : fallbackName;
  return {
    name,
    patientId: extras?.patientId,
    employeeNumber: employee?.employeeNumber ?? null,
    dateOfBirth: employee?.dateOfBirth ?? null,
    phone: employee?.phone ?? null,
    email: employee?.email ?? null,
  };
}

export async function buildTelecareSessionDetail(
  storage: IStorage,
  tenantId: string,
  sessionId: string,
  audience: "staff" | "portal",
) {
  const { session, appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
  if (!session) return null;

  const durationMinutes = appointment?.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  const patientData = await storage.getPatient(session.patientId, tenantId);
  const employee = patientData?.employee;
  const patient = patientData?.patient;

  const staff = await storage.getUser(session.providerId);
  const provider = {
    name: staff
      ? `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.email || "Clinician"
      : "Clinician",
    email: staff?.email ?? null,
    phone: staff?.phoneNumber ?? null,
    staffUserId: session.providerId ?? null,
  };

  let encounterId = appointment?.encounterId ?? null;
  if (!encounterId) {
    const active = await storage.getActiveEncounterForPatient(session.patientId, tenantId);
    if (active?.telecareSessionId === sessionId) {
      encounterId = active.id;
    }
  }

  const health =
    audience === "staff" && patient
      ? {
          allergies: patient.allergies ?? null,
          medications: patient.medications ?? null,
          medicalHistory: patient.medicalHistory ?? null,
          chronicConditions: null,
          notes: null,
        }
      : null;

  return {
    session: repo.sanitizeTelecareSession(session, durationMinutes),
    appointment: appointment
      ? {
          id: appointment.id,
          status: appointment.status ?? "scheduled",
          appointmentDate: appointment.appointmentDate,
          appointmentType: appointment.appointmentType,
          modality: appointment.modality,
          durationMinutes,
          notes: appointment.notes ?? null,
        }
      : null,
    encounterId,
    patient: participantFromEmployee(employee, "Patient", { patientId: session.patientId }),
    provider,
    health,
  };
}

export function resolveScheduledEnd(
  session: TelecareSession,
  appointment?: Appointment | null,
): Date {
  if (session.scheduledEnd) {
    return session.scheduledEnd instanceof Date ? session.scheduledEnd : new Date(session.scheduledEnd);
  }
  const start =
    session.scheduledStart instanceof Date ? session.scheduledStart : new Date(session.scheduledStart);
  const duration = appointment?.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  return computeScheduledEnd(start, duration);
}
