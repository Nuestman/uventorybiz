import type { Appointment, TelecareSession } from "@shared/schema";
import { logError, logInfo } from "../../logger";
import * as repo from "./telecare.repository";
import {
  reconcileExpiredTelecareSession,
  resolveTelecareReconcileAt,
} from "./telecare-session-reconcile.service";

const ACTIVE_SESSION_STATUSES = new Set(["scheduled", "waiting_room", "in_progress"]);

/** node setTimeout max delay (~24.8 days); farther deadlines re-arm via chunking. */
const MAX_TIMEOUT_MS = 2_147_483_647;

type ScheduledExpiry = {
  tenantId: string;
  timer: ReturnType<typeof setTimeout>;
};

const scheduledBySessionId = new Map<string, ScheduledExpiry>();

export function cancelTelecareSessionExpiry(sessionId: string): void {
  const existing = scheduledBySessionId.get(sessionId);
  if (!existing) return;
  clearTimeout(existing.timer);
  scheduledBySessionId.delete(sessionId);
}

/**
 * Arm (or re-arm) an in-process timer for a non-terminal telecare session.
 * Terminal / missing sessions clear any existing timer.
 * Prefers caller-supplied session/appointment to avoid extra DB reads on hot paths.
 */
export function syncTelecareSessionExpirySchedule(
  tenantId: string,
  sessionId: string,
  session?: TelecareSession | null,
  appointment?: Appointment | null,
): void {
  if (session && !ACTIVE_SESSION_STATUSES.has(session.status)) {
    cancelTelecareSessionExpiry(sessionId);
    return;
  }

  if (session && ACTIVE_SESSION_STATUSES.has(session.status)) {
    scheduleAt(tenantId, sessionId, resolveTelecareReconcileAt(session, appointment ?? null));
    return;
  }

  void syncTelecareSessionExpiryScheduleFromDb(tenantId, sessionId);
}

async function syncTelecareSessionExpiryScheduleFromDb(
  tenantId: string,
  sessionId: string,
): Promise<void> {
  try {
    const { session, appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
    if (!session || !ACTIVE_SESSION_STATUSES.has(session.status)) {
      cancelTelecareSessionExpiry(sessionId);
      return;
    }
    scheduleAt(tenantId, sessionId, resolveTelecareReconcileAt(session, appointment));
  } catch (error) {
    logError(`Failed to sync telecare expiry schedule for session ${sessionId}`, error);
  }
}

function scheduleAt(tenantId: string, sessionId: string, fireAt: Date): void {
  cancelTelecareSessionExpiry(sessionId);

  const delayMs = Math.max(0, fireAt.getTime() - Date.now());
  const chunkMs = Math.min(delayMs, MAX_TIMEOUT_MS);

  const timer = setTimeout(() => {
    scheduledBySessionId.delete(sessionId);
    void onExpiryTimerFired(tenantId, sessionId, fireAt);
  }, chunkMs);

  // Don't keep the process up solely for far-future expiry timers in tests/dev exit.
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  scheduledBySessionId.set(sessionId, { tenantId, timer });
}

async function onExpiryTimerFired(
  tenantId: string,
  sessionId: string,
  intendedFireAt: Date,
): Promise<void> {
  // Chunked far-future timer: re-arm until the real deadline.
  if (intendedFireAt.getTime() - Date.now() > 1_000) {
    scheduleAt(tenantId, sessionId, intendedFireAt);
    return;
  }

  try {
    const result = await reconcileExpiredTelecareSession(tenantId, sessionId);
    if (result.reconciled) {
      logInfo(
        `Telecare session ${sessionId} reconciled via in-memory timer (${result.outcome})`,
      );
      return;
    }
    // Still active (extend, status change, grace not reached): re-sync from DB.
    await syncTelecareSessionExpiryScheduleFromDb(tenantId, sessionId);
  } catch (error) {
    logError(`Telecare in-memory expiry failed for session ${sessionId}`, error);
    await syncTelecareSessionExpiryScheduleFromDb(tenantId, sessionId);
  }
}

/** One-shot hydrate after process boot — arms timers for existing active sessions. */
export async function hydrateTelecareSessionExpirySchedules(): Promise<number> {
  const rows = await repo.listNonTerminalTelecareSessions();
  for (const session of rows) {
    try {
      const { appointment } = await repo.getAppointmentForSession(session.tenantId, session.id);
      scheduleAt(
        session.tenantId,
        session.id,
        resolveTelecareReconcileAt(session, appointment),
      );
    } catch (error) {
      logError(`Failed to hydrate telecare expiry for session ${session.id}`, error);
    }
  }
  if (rows.length > 0) {
    logInfo(`Hydrated ${rows.length} telecare session expiry timer(s)`);
  }
  return rows.length;
}

/** Test / diagnostics helper */
export function getScheduledTelecareExpiryCount(): number {
  return scheduledBySessionId.size;
}
