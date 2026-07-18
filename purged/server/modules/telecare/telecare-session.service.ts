import type { Appointment } from "@shared/schema";
import type { IStorage } from "../../storage";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES, computeScheduledEnd } from "@shared/telecare";
import { provisionTelecareForAppointment } from "./telecare-provisioning.service";
import { getDefaultVideoProviderId } from "./video-providers";
import * as telecareRepo from "./telecare.repository";
import { syncTelecareSessionExpirySchedule } from "./telecare-session-expiry.scheduler";
import { storage } from "../../storage";

export async function ensureTelecareSessionForAppointment(
  tenantId: string,
  appointment: Appointment,
): Promise<string | null> {
  if (appointment.modality !== "telehealth") return null;

  const durationMinutes = appointment.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  const scheduledEnd = computeScheduledEnd(appointment.appointmentDate, durationMinutes);

  if (appointment.telecareSessionId) {
    const existing = await telecareRepo.getTelecareSessionById(tenantId, appointment.telecareSessionId);
    if (existing) {
      let sessionForSchedule = existing;
      if (!existing.scheduledEnd) {
        const updated = await telecareRepo.updateTelecareSessionStatus(tenantId, existing.id, existing.status, {
          scheduledEnd,
        } as Parameters<typeof telecareRepo.updateTelecareSessionStatus>[3]);
        if (updated) sessionForSchedule = updated;
      }
      syncTelecareSessionExpirySchedule(tenantId, sessionForSchedule.id, sessionForSchedule, appointment);
      void provisionTelecareForAppointment(storage, tenantId, appointment).catch(() => undefined);
      return existing.id;
    }
  }

  const session = await telecareRepo.createTelecareSession(tenantId, {
    patientId: appointment.patientId,
    providerId: appointment.medicalStaffId,
    appointmentId: appointment.id,
    scheduledStart: appointment.appointmentDate,
    scheduledEnd,
    status: "scheduled",
    videoProvider: getDefaultVideoProviderId(),
  });
  await telecareRepo.linkAppointmentToTelecareSession(tenantId, appointment.id, session.id);
  syncTelecareSessionExpirySchedule(tenantId, session.id, session, appointment);
  const linked = { ...appointment, telecareSessionId: session.id };
  void provisionTelecareForAppointment(storage, tenantId, linked).catch(() => undefined);
  return session.id;
}
