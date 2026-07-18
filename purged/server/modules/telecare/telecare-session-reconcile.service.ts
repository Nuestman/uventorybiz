import type { Appointment, TelecareSession } from "@shared/schema";
import {
  computeScheduledEnd,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  isPastScheduledEnd,
  SCHEDULED_END_SERVER_RECONCILE_GRACE_MINUTES,
} from "@shared/telecare";
import {
  DEFAULT_APPOINTMENT_MINUTES,
  getNoShowGraceMinutes,
} from "../appointments/appointment-management.service";
import * as repo from "./telecare.repository";
import { completeTelecareSession } from "./telecare-join.service";
import { syncPortalRequestFromTelecareSessionOutcome } from "./telecare-appointment-sync.service";

const ACTIVE_SESSION_STATUSES = new Set(["scheduled", "waiting_room", "in_progress"]);

export function resolveSessionScheduledEnd(
  session: TelecareSession,
  appointment?: Appointment | null,
): Date {
  if (session.scheduledEnd) {
    return session.scheduledEnd instanceof Date
      ? session.scheduledEnd
      : new Date(session.scheduledEnd);
  }
  const start =
    session.scheduledStart instanceof Date
      ? session.scheduledStart
      : new Date(session.scheduledStart);
  const durationMinutes = appointment?.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  return computeScheduledEnd(start, durationMinutes);
}

/** Same deadline as appointment auto no-show: slot end + grace. */
export function resolveVisitNoShowDeadline(
  session: TelecareSession,
  appointment?: Appointment | null,
): Date {
  const durationMinutes = appointment?.durationMinutes ?? DEFAULT_APPOINTMENT_MINUTES;
  const start =
    session.scheduledStart instanceof Date
      ? session.scheduledStart
      : new Date(session.scheduledStart);
  const endMs =
    appointment?.appointmentDate != null
      ? new Date(appointment.appointmentDate).getTime() + durationMinutes * 60_000
      : resolveSessionScheduledEnd(session, appointment).getTime();
  return new Date(endMs + getNoShowGraceMinutes() * 60_000);
}

export function visitWasClinicallyStarted(session: TelecareSession): boolean {
  return !!session.actualStart || session.status === "in_progress";
}

/**
 * When the in-memory expiry timer (or a delayed reconcile) should run for this session.
 * - Not clinically started → appointment no-show deadline (slot end + grace)
 * - Clinically started → scheduled end + server reconcile grace
 */
export function resolveTelecareReconcileAt(
  session: TelecareSession,
  appointment?: Appointment | null,
): Date {
  if (visitWasClinicallyStarted(session)) {
    const scheduledEnd = resolveSessionScheduledEnd(session, appointment);
    return new Date(
      scheduledEnd.getTime() + SCHEDULED_END_SERVER_RECONCILE_GRACE_MINUTES * 60_000,
    );
  }
  return resolveVisitNoShowDeadline(session, appointment);
}

type ReconcileOutcome = "none" | "no_show" | "completed";

async function resolveExpiredTelecareSession(
  tenantId: string,
  session: TelecareSession,
  appointment?: Appointment | null,
): Promise<ReconcileOutcome> {
  if (!ACTIVE_SESSION_STATUSES.has(session.status)) return "none";

  const now = new Date();

  if (!visitWasClinicallyStarted(session)) {
    if (resolveVisitNoShowDeadline(session, appointment).getTime() > now.getTime()) {
      return "none";
    }
    await syncPortalRequestFromTelecareSessionOutcome(tenantId, session.id, "no_show");
    return "no_show";
  }

  const scheduledEnd = resolveSessionScheduledEnd(session, appointment);
  if (!isPastScheduledEnd(scheduledEnd, now, SCHEDULED_END_SERVER_RECONCILE_GRACE_MINUTES)) {
    return "none";
  }

  const result = await completeTelecareSession(tenantId, session.id, "provider");
  return result.ok ? "completed" : "none";
}

/**
 * Reconcile an active telecare session after its scheduled slot:
 * - Never started → no_show (after appointment no-show grace)
 * - Clinically started → completed (after short server reconcile grace)
 */
export async function reconcileExpiredTelecareSession(
  tenantId: string,
  sessionId: string,
): Promise<{ reconciled: boolean; outcome?: Exclude<ReconcileOutcome, "none"> }> {
  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  if (!session) return { reconciled: false };

  const { appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
  const outcome = await resolveExpiredTelecareSession(tenantId, session, appointment ?? null);
  if (outcome === "none") return { reconciled: false };
  return { reconciled: true, outcome };
}

/** Hourly backup cron: reconcile active sessions whose slot has ended (in-memory timers are primary). */
export async function reconcileAllExpiredTelecareSessions(): Promise<{
  reconciled: number;
  noShow: number;
  completed: number;
}> {
  const rows = await repo.listNonTerminalTelecareSessions();
  let reconciled = 0;
  let noShow = 0;
  let completed = 0;

  for (const session of rows) {
    const { appointment } = await repo.getAppointmentForSession(session.tenantId, session.id);
    const outcome = await resolveExpiredTelecareSession(session.tenantId, session, appointment ?? null);
    if (outcome === "none") continue;
    reconciled += 1;
    if (outcome === "no_show") noShow += 1;
    if (outcome === "completed") completed += 1;
  }

  return { reconciled, noShow, completed };
}
