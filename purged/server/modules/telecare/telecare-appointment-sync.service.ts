import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../config/db";
import {
  appointments,
  encounters,
  portalAppointmentRequests,
  telecareSessions,
  type Appointment,
  type Encounter,
  type TelecareSession,
} from "@shared/schema";
import type { IStorage } from "../../storage";
import * as repo from "./telecare.repository";
import { computeScheduledEnd, DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@shared/telecare";

const TERMINAL_APPOINTMENT_STATUSES = new Set(["completed", "cancelled", "no_show"]);
const TERMINAL_SESSION_STATUSES = new Set(["completed", "cancelled", "no_show", "failed"]);
const TERMINAL_PORTAL_REQUEST_STATUSES = new Set(["declined", "completed", "cancelled", "no_show"]);

export type PortalAppointmentRequestOutcome = "completed" | "cancelled" | "no_show";

export function mapVisitOutcomeToPortalRequestStatus(
  appointmentStatus?: string | null,
  sessionStatus?: string | null,
): PortalAppointmentRequestOutcome | null {
  if (appointmentStatus === "no_show" || sessionStatus === "no_show") return "no_show";
  if (appointmentStatus === "cancelled" || sessionStatus === "cancelled") return "cancelled";
  if (appointmentStatus === "completed" || sessionStatus === "completed") return "completed";
  return null;
}

export async function findAppointmentForTelecareSession(
  tenantId: string,
  sessionId: string,
  session?: TelecareSession | null,
): Promise<Appointment | null> {
  const resolvedSession = session ?? (await repo.getTelecareSessionById(tenantId, sessionId));
  if (!resolvedSession) return null;

  if (resolvedSession.appointmentId) {
    const [byId] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, resolvedSession.appointmentId),
          eq(appointments.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (byId) return byId;
  }

  const [bySessionRef] = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.telecareSessionId, sessionId), eq(appointments.tenantId, tenantId)),
    )
    .limit(1);
  return bySessionRef ?? null;
}

export async function findTelecareSessionForAppointment(
  tenantId: string,
  appointment: Pick<Appointment, "id" | "telecareSessionId">,
): Promise<TelecareSession | null> {
  if (appointment.telecareSessionId) {
    const session = await repo.getTelecareSessionById(tenantId, appointment.telecareSessionId);
    if (session) return session;
  }

  const [byAppointmentRef] = await db
    .select()
    .from(telecareSessions)
    .where(
      and(
        eq(telecareSessions.appointmentId, appointment.id),
        eq(telecareSessions.tenantId, tenantId),
      ),
    )
    .limit(1);
  return byAppointmentRef ?? null;
}

/** Keep appointment ↔ telecare session foreign keys aligned when only one side is set. */
export async function repairTelecareAppointmentLinks(
  tenantId: string,
  appointment: Appointment,
  session: TelecareSession | null,
): Promise<void> {
  if (!session) return;
  const now = new Date();

  if (appointment.telecareSessionId !== session.id) {
    await db
      .update(appointments)
      .set({ telecareSessionId: session.id, updatedAt: now })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
  }

  if (session.appointmentId !== appointment.id) {
    await db
      .update(telecareSessions)
      .set({ appointmentId: appointment.id, updatedAt: now })
      .where(and(eq(telecareSessions.id, session.id), eq(telecareSessions.tenantId, tenantId)));
  }
}

export async function syncPortalAppointmentRequestForAppointment(
  tenantId: string,
  appointmentId: string,
  targetStatus: PortalAppointmentRequestOutcome = "completed",
): Promise<void> {
  await db
    .update(portalAppointmentRequests)
    .set({ status: targetStatus, updatedAt: new Date() })
    .where(
      and(
        eq(portalAppointmentRequests.tenantId, tenantId),
        eq(portalAppointmentRequests.linkedAppointmentId, appointmentId),
        inArray(portalAppointmentRequests.status, ["pending", "confirmed"]),
      ),
    );
}

export async function syncPortalAppointmentRequestById(
  tenantId: string,
  requestId: string,
  targetStatus: PortalAppointmentRequestOutcome,
): Promise<void> {
  await db
    .update(portalAppointmentRequests)
    .set({ status: targetStatus, updatedAt: new Date() })
    .where(
      and(
        eq(portalAppointmentRequests.id, requestId),
        eq(portalAppointmentRequests.tenantId, tenantId),
        inArray(portalAppointmentRequests.status, ["pending", "confirmed"]),
      ),
    );
}

async function findEncounterForAppointment(
  tenantId: string,
  appointment: Pick<Appointment, "id" | "encounterId" | "telecareSessionId">,
): Promise<Encounter | null> {
  if (appointment.encounterId) {
    const [byId] = await db
      .select()
      .from(encounters)
      .where(and(eq(encounters.id, appointment.encounterId), eq(encounters.tenantId, tenantId)))
      .limit(1);
    if (byId) return byId;
  }

  const [byAppointmentId] = await db
    .select()
    .from(encounters)
    .where(
      and(eq(encounters.appointmentId, appointment.id), eq(encounters.tenantId, tenantId)),
    )
    .orderBy(desc(encounters.createdAt))
    .limit(1);
  if (byAppointmentId) return byAppointmentId;

  if (appointment.telecareSessionId) {
    const [bySession] = await db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.telecareSessionId, appointment.telecareSessionId),
          eq(encounters.tenantId, tenantId),
        ),
      )
      .orderBy(desc(encounters.createdAt))
      .limit(1);
    if (bySession) return bySession;
  }

  return null;
}

/** Resolve the appointment created from a portal request (backfills missing links). */
async function matchAppointmentByPreferredDate(
  tenantId: string,
  request: typeof portalAppointmentRequests.$inferSelect,
): Promise<Appointment | null> {
  let preferredMs: number | null = null;
  if (request.preferredTimeWindow && /^\d{4}-\d{2}-\d{2}T/.test(request.preferredTimeWindow)) {
    preferredMs = new Date(request.preferredTimeWindow).getTime();
  } else if (request.preferredDate) {
    preferredMs = new Date(request.preferredDate).getTime();
  }
  if (preferredMs == null || Number.isNaN(preferredMs)) return null;

  const dayStart = new Date(preferredMs);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(preferredMs);
  dayEnd.setHours(23, 59, 59, 999);

  const [matched] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.patientId, request.patientId),
        gte(appointments.appointmentDate, dayStart),
        lte(appointments.appointmentDate, dayEnd),
      ),
    )
    .orderBy(desc(appointments.appointmentDate))
    .limit(1);

  return matched ?? null;
}

async function resolveLinkedAppointmentForPortalRequest(
  tenantId: string,
  request: typeof portalAppointmentRequests.$inferSelect,
): Promise<Appointment | null> {
  if (request.linkedAppointmentId) {
    const [linked] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, request.linkedAppointmentId),
          eq(appointments.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (linked) return linked;
  }

  if (request.status !== "confirmed") return null;

  let matched: Appointment | null = null;

  if (request.updatedAt) {
    const approvedAt = request.updatedAt instanceof Date ? request.updatedAt : new Date(request.updatedAt);
    const windowStart = new Date(approvedAt.getTime() - 2 * 60_000);
    const windowEnd = new Date(approvedAt.getTime() + 5 * 60_000);
    const [byApproval] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.patientId, request.patientId),
          gte(appointments.createdAt, windowStart),
          lte(appointments.createdAt, windowEnd),
        ),
      )
      .orderBy(desc(appointments.createdAt))
      .limit(1);
    matched = byApproval ?? null;
  }

  if (!matched) {
    matched = await matchAppointmentByPreferredDate(tenantId, request);
  }

  if (!matched) return null;

  if (!request.linkedAppointmentId) {
    await db
      .update(portalAppointmentRequests)
      .set({ linkedAppointmentId: matched.id, updatedAt: new Date() })
      .where(
        and(
          eq(portalAppointmentRequests.id, request.id),
          eq(portalAppointmentRequests.tenantId, tenantId),
        ),
      );
  }

  return matched;
}

type VisitCompletionSignals = {
  appointment: Appointment | null;
  session: TelecareSession | null;
  encounter: Encounter | null;
};

async function collectVisitCompletionSignals(
  tenantId: string,
  appointment: Appointment,
): Promise<VisitCompletionSignals> {
  const session = await findTelecareSessionForAppointment(tenantId, appointment);
  const encounter = await findEncounterForAppointment(tenantId, {
    id: appointment.id,
    encounterId: appointment.encounterId,
    telecareSessionId: session?.id ?? appointment.telecareSessionId,
  });
  return { appointment, session, encounter };
}

function visitIsComplete(signals: VisitCompletionSignals): boolean {
  const { appointment, session, encounter } = signals;
  if (mapVisitOutcomeToPortalRequestStatus(appointment?.status, session?.status) === "completed") {
    return true;
  }
  if (encounter?.status === "finished") return true;
  return false;
}

function deriveEffectivePortalRequestStatus(
  request: typeof portalAppointmentRequests.$inferSelect,
  signals: VisitCompletionSignals,
): typeof portalAppointmentRequests.$inferSelect["status"] {
  if (request.status === "declined") return "declined";
  if (request.status === "pending") return "pending";

  const outcome = mapVisitOutcomeToPortalRequestStatus(
    signals.appointment?.status,
    signals.session?.status,
  );
  if (outcome) return outcome;

  if (visitIsComplete(signals)) return "completed";

  return request.status;
}

type FinalizeTelehealthVisitInput = {
  tenantId: string;
  telecareSessionId?: string | null;
  appointmentId?: string | null;
  encounter?: Pick<Encounter, "id" | "appointmentId" | "telecareSessionId"> | null;
};

/**
 * Mark linked telehealth appointment + session (+ portal request) as completed (idempotent).
 * Resolves links in either direction (session ↔ appointment ↔ encounter).
 */
export async function finalizeTelehealthVisit(
  input: FinalizeTelehealthVisitInput,
): Promise<{ appointmentId?: string; telecareSessionId?: string }> {
  const { tenantId } = input;
  let appointmentId = input.appointmentId ?? input.encounter?.appointmentId ?? null;
  let telecareSessionId =
    input.telecareSessionId ?? input.encounter?.telecareSessionId ?? null;

  if (!appointmentId && telecareSessionId) {
    const appt = await findAppointmentForTelecareSession(tenantId, telecareSessionId);
    appointmentId = appt?.id ?? null;
  }

  if (!telecareSessionId && appointmentId) {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (appt) {
      telecareSessionId = appt.telecareSessionId ?? null;
      if (!telecareSessionId) {
        const session = await findTelecareSessionForAppointment(tenantId, appt);
        telecareSessionId = session?.id ?? null;
      }
    }
  }

  if (!appointmentId && input.encounter?.id) {
    const [apptByEncounter] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.encounterId, input.encounter.id),
          eq(appointments.tenantId, tenantId),
        ),
      )
      .limit(1);
    appointmentId = apptByEncounter?.id ?? null;
    if (!telecareSessionId) {
      telecareSessionId = apptByEncounter?.telecareSessionId ?? null;
    }
  }

  const now = new Date();
  let appointment: Appointment | null = null;

  if (appointmentId) {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
      .limit(1);
    appointment = appt ?? null;
  }

  let session: TelecareSession | null = null;
  if (telecareSessionId) {
    session = await repo.getTelecareSessionById(tenantId, telecareSessionId);
  }
  if (!session && appointment) {
    session = await findTelecareSessionForAppointment(tenantId, appointment);
    telecareSessionId = session?.id ?? telecareSessionId;
  }
  if (!appointment && session) {
    appointment = await findAppointmentForTelecareSession(tenantId, session.id, session);
    appointmentId = appointment?.id ?? appointmentId;
  }

  if (appointment && session) {
    await repairTelecareAppointmentLinks(tenantId, appointment, session);
  }

  if (telecareSessionId && session && !TERMINAL_SESSION_STATUSES.has(session.status)) {
    await repo.updateTelecareSessionStatus(tenantId, telecareSessionId, "completed", {
      actualEnd: session.actualEnd ?? now,
    });
  }

  if (appointmentId && appointment && !TERMINAL_APPOINTMENT_STATUSES.has(appointment.status ?? "")) {
    await db
      .update(appointments)
      .set({ status: "completed", updatedAt: now })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));
    await syncPortalAppointmentRequestForAppointment(tenantId, appointmentId, "completed");
  } else if (appointmentId && appointment?.status === "completed") {
    await syncPortalAppointmentRequestForAppointment(tenantId, appointmentId, "completed");
  }

  return {
    appointmentId: appointmentId ?? undefined,
    telecareSessionId: telecareSessionId ?? undefined,
  };
}

/**
 * Reconcile schedule-layer appointment status from telecare session + encounter artifacts.
 * Use on portal reads and after clinical/telecare completion events.
 */
export async function reconcileAppointmentVisitStatus(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
): Promise<Appointment> {
  let session = await findTelecareSessionForAppointment(tenantId, appointment);
  if (session && appointment.telecareSessionId !== session.id) {
    await repairTelecareAppointmentLinks(tenantId, appointment, session);
    const [refreshed] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (refreshed) appointment = refreshed;
    session = await findTelecareSessionForAppointment(tenantId, appointment);
  }

  const encounter =
    (await findEncounterForAppointment(tenantId, {
      id: appointment.id,
      encounterId: appointment.encounterId,
      telecareSessionId: session?.id ?? appointment.telecareSessionId,
    })) ?? null;

  if (encounter && !appointment.encounterId) {
    await db
      .update(appointments)
      .set({ encounterId: encounter.id, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
    appointment = { ...appointment, encounterId: encounter.id };
  }

  const sessionCompleted = session?.status === "completed";
  const encounterFinished = encounter?.status === "finished";

  if (sessionCompleted || encounterFinished) {
    await finalizeTelehealthVisit({
      tenantId,
      appointmentId: appointment.id,
      telecareSessionId: session?.id ?? appointment.telecareSessionId,
      encounter: encounter ?? undefined,
    });

    const [updated] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    return updated ?? appointment;
  }

  if (session && session.status === "completed" && appointment.status !== "completed") {
    await syncAppointmentStatusFromTelecareSession(tenantId, session);
    const [updated] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    return updated ?? appointment;
  }

  return appointment;
}

export async function finalizeTelehealthVisitFromEncounter(
  storage: IStorage,
  tenantId: string,
  encounterId: string,
): Promise<void> {
  const encounter = await storage.getMedicalVisit(encounterId, tenantId);
  if (!encounter) return;
  if (encounter.modality !== "telehealth" && !encounter.telecareSessionId && !encounter.appointmentId) {
    const [linkedAppt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.encounterId, encounterId), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (!linkedAppt || linkedAppt.modality !== "telehealth") return;
    await finalizeTelehealthVisit({
      tenantId,
      appointmentId: linkedAppt.id,
      telecareSessionId: linkedAppt.telecareSessionId,
      encounter,
    });
    return;
  }
  await finalizeTelehealthVisit({
    tenantId,
    encounter,
    appointmentId: encounter.appointmentId,
    telecareSessionId: encounter.telecareSessionId,
  });
}

export async function finalizeTelehealthVisitFromSession(
  tenantId: string,
  sessionId: string,
): Promise<void> {
  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  const appointment = await findAppointmentForTelecareSession(tenantId, sessionId, session);
  await finalizeTelehealthVisit({
    tenantId,
    telecareSessionId: sessionId,
    appointmentId: appointment?.id ?? session?.appointmentId ?? null,
  });
}

/** Heal appointments left stale after telecare session reached a terminal state. */
export async function syncAppointmentStatusFromTelecareSession(
  tenantId: string,
  session: TelecareSession,
): Promise<void> {
  if (!TERMINAL_SESSION_STATUSES.has(session.status)) return;

  if (session.status === "no_show" || session.status === "cancelled") {
    await syncPortalRequestFromTelecareSessionOutcome(tenantId, session.id, session.status);
    return;
  }

  if (session.status !== "completed") return;

  const appointment = await findAppointmentForTelecareSession(tenantId, session.id, session);
  if (!appointment) return;

  if (appointment.telecareSessionId !== session.id || session.appointmentId !== appointment.id) {
    await repairTelecareAppointmentLinks(tenantId, appointment, session);
  }

  if (!TERMINAL_APPOINTMENT_STATUSES.has(appointment.status ?? "")) {
    await db
      .update(appointments)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
  }

  await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, "completed");
}

export async function syncPortalRequestFromTelecareSessionOutcome(
  tenantId: string,
  sessionId: string,
  outcome: "no_show" | "cancelled",
): Promise<void> {
  const session = await repo.getTelecareSessionById(tenantId, sessionId);
  const appointment = await findAppointmentForTelecareSession(tenantId, sessionId, session);
  if (!appointment) return;

  if (!TERMINAL_APPOINTMENT_STATUSES.has(appointment.status ?? "")) {
    await db
      .update(appointments)
      .set({ status: outcome, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
  }

  if (session && !TERMINAL_SESSION_STATUSES.has(session.status)) {
    await repo.updateTelecareSessionStatus(tenantId, sessionId, outcome, {
      actualEnd: new Date(),
      cancellationReason: outcome === "no_show" ? "Marked as no show" : "Appointment cancelled",
    });
  }

  await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, outcome);
}

/**
 * Propagate appointment status changes to telecare sessions and portal requests.
 * Call after any write that sets appointments.status.
 */
export async function syncAppointmentAfterStatusChange(
  tenantId: string,
  appointment: Appointment,
  previousStatus?: string | null,
): Promise<void> {
  const status = appointment.status ?? "";
  if (status === previousStatus) return;

  const session = await findTelecareSessionForAppointment(tenantId, appointment);

  if (status === "completed") {
    if (appointment.modality === "telehealth" || session) {
      await finalizeTelehealthVisit({
        tenantId,
        appointmentId: appointment.id,
        telecareSessionId: session?.id ?? appointment.telecareSessionId,
      });
    } else {
      await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, "completed");
    }
    return;
  }

  if (status === "no_show" || status === "cancelled") {
    if (session && !TERMINAL_SESSION_STATUSES.has(session.status)) {
      await repo.updateTelecareSessionStatus(tenantId, session.id, status, {
        actualEnd: new Date(),
        cancellationReason:
          status === "no_show" ? "Marked as no show" : "Appointment cancelled",
      });
    }
    await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, status);
    return;
  }

  if (
    status === "in_progress" &&
    session &&
    !TERMINAL_SESSION_STATUSES.has(session.status) &&
    session.status !== "in_progress"
  ) {
    await repo.updateTelecareSessionStatus(tenantId, session.id, "in_progress", {
      actualStart: session.actualStart ?? new Date(),
    });
  }
}

/** Keep telecare session slot aligned when staff reschedules a telehealth appointment. */
export async function syncTelecareScheduleFromAppointment(
  tenantId: string,
  appointment: Appointment,
): Promise<void> {
  if (appointment.modality !== "telehealth") return;

  const session = await findTelecareSessionForAppointment(tenantId, appointment);
  if (!session || TERMINAL_SESSION_STATUSES.has(session.status)) return;

  const durationMinutes = appointment.durationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  const scheduledEnd = computeScheduledEnd(appointment.appointmentDate, durationMinutes);

  await db
    .update(telecareSessions)
    .set({
      scheduledStart: appointment.appointmentDate,
      scheduledEnd,
      updatedAt: new Date(),
    })
    .where(and(eq(telecareSessions.id, session.id), eq(telecareSessions.tenantId, tenantId)));

  if (appointment.telecareSessionId !== session.id) {
    await repairTelecareAppointmentLinks(tenantId, appointment, session);
  }
}

/** Cancel linked schedule artifacts before an appointment row is deleted. */
export async function syncBeforeAppointmentDelete(
  tenantId: string,
  appointment: Appointment,
): Promise<void> {
  const session = await findTelecareSessionForAppointment(tenantId, appointment);
  if (session && !TERMINAL_SESSION_STATUSES.has(session.status)) {
    await repo.updateTelecareSessionStatus(tenantId, session.id, "cancelled", {
      actualEnd: new Date(),
      cancellationReason: "Appointment removed by staff",
    });
  }
  await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, "cancelled");
}

/** When a clinical encounter is cancelled, align telehealth schedule rows. */
export async function syncTelehealthOutcomeFromEncounterCancel(
  storage: IStorage,
  tenantId: string,
  encounterId: string,
): Promise<void> {
  const encounter = await storage.getMedicalVisit(encounterId, tenantId);
  if (!encounter) return;

  if (encounter.telecareSessionId) {
    await syncPortalRequestFromTelecareSessionOutcome(
      tenantId,
      encounter.telecareSessionId,
      "cancelled",
    );
    return;
  }

  if (!encounter.appointmentId) return;

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.id, encounter.appointmentId), eq(appointments.tenantId, tenantId)),
    )
    .limit(1);
  if (!appointment) return;

  if (!TERMINAL_APPOINTMENT_STATUSES.has(appointment.status ?? "")) {
    const [updated] = await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)))
      .returning();
    if (updated) {
      await syncAppointmentAfterStatusChange(tenantId, updated, appointment.status);
      return;
    }
  }

  await syncPortalAppointmentRequestForAppointment(tenantId, appointment.id, "cancelled");
}

export async function reconcilePortalAppointmentRequestStatus(
  storage: IStorage,
  tenantId: string,
  request: typeof portalAppointmentRequests.$inferSelect,
): Promise<typeof portalAppointmentRequests.$inferSelect> {
  if (TERMINAL_PORTAL_REQUEST_STATUSES.has(request.status)) return request;

  const appointment = await resolveLinkedAppointmentForPortalRequest(tenantId, request);
  if (!appointment) return request;

  const linkedRequest = appointment.id !== request.linkedAppointmentId
    ? { ...request, linkedAppointmentId: appointment.id }
    : request;

  const reconciledAppointment = await reconcileAppointmentVisitStatus(storage, tenantId, appointment);
  const signals = await collectVisitCompletionSignals(tenantId, reconciledAppointment);
  const effectiveStatus = deriveEffectivePortalRequestStatus(linkedRequest, signals);

  if (effectiveStatus === linkedRequest.status) {
    return linkedRequest;
  }

  if (
    effectiveStatus === "completed" ||
    effectiveStatus === "cancelled" ||
    effectiveStatus === "no_show"
  ) {
    await syncPortalAppointmentRequestById(
      tenantId,
      linkedRequest.id,
      effectiveStatus as PortalAppointmentRequestOutcome,
    );
    if (appointment.id) {
      await syncPortalAppointmentRequestForAppointment(
        tenantId,
        appointment.id,
        effectiveStatus as PortalAppointmentRequestOutcome,
      );
    }
    return { ...linkedRequest, status: effectiveStatus, updatedAt: new Date() };
  }

  return linkedRequest;
}
