import { eq, and } from "drizzle-orm";
import { appointments } from "@shared/schema";
import {
  TELEcare_SESSION_EXTEND_MINUTES_OPTIONS,
  type TelecareSessionExtendMinutes,
} from "@shared/telecare";
import { db } from "../../config/db";
import * as repo from "./telecare.repository";
import { syncTelecareSessionExpirySchedule } from "./telecare-session-expiry.scheduler";
import { resolveSessionScheduledEnd } from "./telecare-session-reconcile.service";

const EXTENDABLE_STATUSES = new Set(["scheduled", "waiting_room", "in_progress"]);

export async function extendTelecareSession(
  tenantId: string,
  sessionId: string,
  additionalMinutes: TelecareSessionExtendMinutes,
): Promise<
  | { ok: true; scheduledEnd: Date; session: NonNullable<Awaited<ReturnType<typeof repo.getTelecareSessionById>>> }
  | { ok: false; error: string; code?: string }
> {
  if (!TELEcare_SESSION_EXTEND_MINUTES_OPTIONS.includes(additionalMinutes)) {
    return { ok: false, error: "Invalid extension duration", code: "INVALID_INPUT" };
  }

  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  if (!session) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };
  if (!EXTENDABLE_STATUSES.has(session.status)) {
    return { ok: false, error: "Visit is not active", code: "INVALID_STATE" };
  }

  const { appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
  const currentEnd = resolveSessionScheduledEnd(session, appointment);
  const baseMs = Math.max(Date.now(), currentEnd.getTime());
  const newEnd = new Date(baseMs + additionalMinutes * 60_000);

  const updated = await repo.updateTelecareSessionStatus(tenantId, sessionId, session.status, {
    scheduledEnd: newEnd,
  });
  if (!updated) return { ok: false, error: "Failed to extend session", code: "UPDATE_FAILED" };

  let appointmentForSchedule = appointment ?? null;
  if (appointment) {
    const startMs = new Date(appointment.appointmentDate).getTime();
    const newDuration = Math.max(1, Math.ceil((newEnd.getTime() - startMs) / 60_000));
    await db
      .update(appointments)
      .set({ durationMinutes: newDuration, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
    appointmentForSchedule = { ...appointment, durationMinutes: newDuration };
  }

  syncTelecareSessionExpirySchedule(tenantId, sessionId, updated, appointmentForSchedule);
  return { ok: true, scheduledEnd: newEnd, session: updated };
}
