import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { appointments, telecareSessions, type InsertTelecareSession } from "@shared/schema";
import { ensureTelecareSessionForAppointment } from "./telecare-session.service";

export async function createTelecareSession(
  tenantId: string,
  data: Omit<InsertTelecareSession, "tenantId">,
) {
  const [row] = await db
    .insert(telecareSessions)
    .values({ ...data, tenantId, updatedAt: new Date() })
    .returning();
  return row;
}

export async function getTelecareSessionById(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(telecareSessions)
    .where(and(eq(telecareSessions.id, id), eq(telecareSessions.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function listTelecareSessionsForTenant(
  tenantId: string,
  filters?: { patientId?: string; status?: string },
) {
  const conditions = [eq(telecareSessions.tenantId, tenantId)];
  if (filters?.patientId) conditions.push(eq(telecareSessions.patientId, filters.patientId));
  if (filters?.status) conditions.push(eq(telecareSessions.status, filters.status));

  return db
    .select()
    .from(telecareSessions)
    .where(and(...conditions))
    .orderBy(desc(telecareSessions.scheduledStart));
}

export async function listUpcomingTelecareForPatient(tenantId: string, patientId: string) {
  const now = new Date();
  const rows = await db
    .select({
      session: telecareSessions,
      appointment: appointments,
    })
    .from(appointments)
    .leftJoin(telecareSessions, eq(appointments.telecareSessionId, telecareSessions.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.patientId, patientId),
        eq(appointments.modality, "telehealth"),
        gte(appointments.appointmentDate, now),
        sql`${appointments.status} IN ('scheduled', 'confirmed', 'in_progress')`,
      ),
    )
    .orderBy(appointments.appointmentDate);

  const out: typeof rows = [];
  for (const row of rows) {
    if (!row.session && row.appointment) {
      const sessionId = await ensureTelecareSessionForAppointment(tenantId, row.appointment);
      if (sessionId) {
        const session = await getTelecareSessionById(tenantId, sessionId);
        out.push({ session: session!, appointment: { ...row.appointment, telecareSessionId: sessionId } });
        continue;
      }
    }
    out.push(row);
  }
  return out;
}

/** Staff telehealth queue — today's telehealth appointments with session metadata. */
export async function listTodayTelecareForStaff(tenantId: string) {
  return listTelecareQueueForStaff(tenantId, { view: "today" });
}

export type TelecareQueueView = "today" | "upcoming" | "active" | "recent" | "all";

const TELEHEALTH_ACTIVE_APPOINTMENT_STATUSES = ["scheduled", "confirmed", "in_progress"] as const;
const TELEHEALTH_ACTIVE_SESSION_STATUSES = ["scheduled", "waiting_room", "in_progress"] as const;

function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date = new Date()): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export async function listTelecareQueueForStaff(
  tenantId: string,
  options: {
    view?: TelecareQueueView;
    appointmentStatus?: string;
    sessionStatus?: string;
    limit?: number;
  } = {},
) {
  const view = options.view ?? "today";
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 250);
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const recentStart = new Date(todayStart);
  recentStart.setDate(recentStart.getDate() - 7);
  const historyStart = new Date(todayStart);
  historyStart.setDate(historyStart.getDate() - 90);

  const conditions = [eq(appointments.tenantId, tenantId), eq(appointments.modality, "telehealth")];

  if (view === "today") {
    conditions.push(gte(appointments.appointmentDate, todayStart));
    conditions.push(lt(appointments.appointmentDate, todayEnd));
  } else if (view === "upcoming") {
    conditions.push(gte(appointments.appointmentDate, now));
    conditions.push(inArray(appointments.status, [...TELEHEALTH_ACTIVE_APPOINTMENT_STATUSES]));
  } else if (view === "active") {
    conditions.push(
      or(
        eq(appointments.status, "in_progress"),
        inArray(telecareSessions.status, [...TELEHEALTH_ACTIVE_SESSION_STATUSES.filter((s) => s !== "scheduled")]),
      )!,
    );
  } else if (view === "recent") {
    conditions.push(gte(appointments.appointmentDate, recentStart));
    conditions.push(lt(appointments.appointmentDate, todayEnd));
  } else {
    conditions.push(gte(appointments.appointmentDate, historyStart));
  }

  if (options.appointmentStatus && options.appointmentStatus !== "all") {
    conditions.push(
      eq(
        appointments.status,
        options.appointmentStatus as (typeof TELEHEALTH_ACTIVE_APPOINTMENT_STATUSES)[number] | "completed" | "cancelled" | "no_show",
      ),
    );
  }

  if (options.sessionStatus && options.sessionStatus !== "all") {
    conditions.push(eq(telecareSessions.status, options.sessionStatus));
  }

  return db
    .select({
      session: telecareSessions,
      appointment: appointments,
    })
    .from(appointments)
    .leftJoin(telecareSessions, eq(appointments.telecareSessionId, telecareSessions.id))
    .where(and(...conditions))
    .orderBy(desc(sql`COALESCE(${telecareSessions.createdAt}, ${appointments.createdAt})`))
    .limit(limit);
}

export async function getTelecareQueueSummaryCounts(tenantId: string) {
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [todayRows, upcomingRows, activeRows] = await Promise.all([
    listTelecareQueueForStaff(tenantId, { view: "today", limit: 250 }),
    listTelecareQueueForStaff(tenantId, { view: "upcoming", limit: 250 }),
    listTelecareQueueForStaff(tenantId, { view: "active", limit: 250 }),
  ]);

  const waitingRoom = activeRows.filter((r) => r.session?.status === "waiting_room").length;
  const inProgress = activeRows.filter(
    (r) => r.session?.status === "in_progress" || r.appointment.status === "in_progress",
  ).length;
  const todayRemaining = todayRows.filter((r) =>
    TELEHEALTH_ACTIVE_APPOINTMENT_STATUSES.includes(
      r.appointment.status as (typeof TELEHEALTH_ACTIVE_APPOINTMENT_STATUSES)[number],
    ),
  ).length;
  const upcomingWeek = upcomingRows.filter(
    (r) => new Date(r.appointment.appointmentDate).getTime() <= weekAhead.getTime(),
  ).length;

  return {
    todayTotal: todayRows.length,
    todayRemaining,
    waitingRoom,
    inProgress,
    upcomingWeek,
  };
}

export async function updateTelecareSessionStatus(
  tenantId: string,
  id: string,
  status: string,
  extras?: Partial<{
    actualStart: Date;
    actualEnd: Date;
    cancellationReason: string;
    roomId: string;
    joinUrlPatient: string;
    joinUrlProvider: string;
    videoProvider: string;
    scheduledEnd: Date;
  }>,
) {
  const [row] = await db
    .update(telecareSessions)
    .set({
      status,
      updatedAt: new Date(),
      ...extras,
    })
    .where(and(eq(telecareSessions.id, id), eq(telecareSessions.tenantId, tenantId)))
    .returning();
  return row;
}

export async function linkAppointmentToTelecareSession(
  tenantId: string,
  appointmentId: string,
  telecareSessionId: string,
) {
  const now = new Date();
  await db
    .update(appointments)
    .set({ telecareSessionId, updatedAt: now })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));
  await db
    .update(telecareSessions)
    .set({ appointmentId, updatedAt: now })
    .where(and(eq(telecareSessions.id, telecareSessionId), eq(telecareSessions.tenantId, tenantId)));
}

export async function getAppointmentForSession(tenantId: string, sessionId: string) {
  const session = await getTelecareSessionById(tenantId, sessionId);
  if (!session) return { session: null, appointment: null as typeof appointments.$inferSelect | null };

  if (session.appointmentId) {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, session.appointmentId), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (appointment) return { session, appointment };
  }

  const [appointmentByRef] = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.telecareSessionId, sessionId), eq(appointments.tenantId, tenantId)),
    )
    .limit(1);

  return { session, appointment: appointmentByRef ?? null };
}

export async function listNonTerminalTelecareSessions() {
  return db
    .select()
    .from(telecareSessions)
    .where(
      inArray(telecareSessions.status, ["scheduled", "waiting_room", "in_progress"]),
    );
}

export function sanitizeTelecareSession<T extends { joinUrlPatient?: string | null; joinUrlProvider?: string | null; roomId?: string | null; patientTelehealthConsentAt?: Date | null }>(
  session: T,
  durationMinutes?: number,
): Omit<T, "joinUrlPatient" | "joinUrlProvider"> & { hasJoinLinks: boolean; durationMinutes?: number } {
  const { joinUrlPatient, joinUrlProvider, ...rest } = session;
  return {
    ...rest,
    hasJoinLinks: !!(joinUrlPatient || joinUrlProvider || session.roomId),
    durationMinutes,
  };
}

export async function recordPatientTelehealthConsent(tenantId: string, sessionId: string) {
  const [row] = await db
    .update(telecareSessions)
    .set({
      patientTelehealthConsentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(telecareSessions.id, sessionId), eq(telecareSessions.tenantId, tenantId)))
    .returning();
  return row;
}
