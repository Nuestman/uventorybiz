import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { appointments, patients, type Appointment, type UpdateAppointment } from "@shared/schema";
import type { IStorage } from "../../storage";
import { storage } from "../../storage";
import {
  requiresPatientConfirmation,
  requiresStaffConfirmation,
} from "@shared/appointmentConfirmation";
import {
  notifyAppointmentNoShow,
  notifyAppointmentPatientCancelled,
  notifyAppointmentPatientConfirmed,
  notifyAppointmentPatientDeclined,
  notifyAppointmentPatientRescheduled,
  notifyAppointmentRescheduled,
  notifyAppointmentStaffConfirmedReschedule,
} from "./appointment-notifications.service";

const SCHEDULE_CHANGE_KEYS = ["appointmentDate", "medicalStaffId", "locationId", "modality"] as const;

async function employeeIdForPortalPatient(tenantId: string, patientId: string): Promise<string | null> {
  const [row] = await db
    .select({ employeeId: patients.employeeId })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
    .limit(1);
  return row?.employeeId ?? null;
}

export function hasMaterialScheduleChange(
  existing: Appointment,
  patch: UpdateAppointment,
): boolean {
  for (const key of SCHEDULE_CHANGE_KEYS) {
    if (patch[key] === undefined) continue;
    if (key === "appointmentDate") {
      const raw = patch.appointmentDate;
      if (raw === undefined) continue;
      const next = raw instanceof Date ? raw : new Date(raw);
      const prev = new Date(existing.appointmentDate);
      if (Math.abs(next.getTime() - prev.getTime()) > 60_000) return true;
      continue;
    }
    if (patch[key] !== existing[key]) return true;
  }
  return false;
}

export async function applyStaffAppointmentUpdate(
  storage: IStorage,
  tenantId: string,
  userId: string,
  appointmentId: string,
  patch: UpdateAppointment,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const existing = await storage.getAppointment(appointmentId, tenantId);
  if (!existing) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  const scheduleChanged = hasMaterialScheduleChange(existing, patch);
  const updatePayload: UpdateAppointment = { ...patch };

  if (scheduleChanged && existing.status === "confirmed") {
    updatePayload.status = "scheduled";
  }

  if (scheduleChanged) {
    updatePayload.confirmationRequiredFrom = "patient";
  }

  if (
    patch.status === "confirmed" &&
    requiresPatientConfirmation(existing.status, existing.confirmationRequiredFrom)
  ) {
    return {
      ok: false,
      error: "This visit is awaiting confirmation in the portal",
      code: "INVALID_STATE",
    };
  }

  if (
    patch.status === "confirmed" &&
    requiresStaffConfirmation(existing.status, existing.confirmationRequiredFrom)
  ) {
    return {
      ok: false,
      error: "Use confirm reschedule to accept the proposed time",
      code: "INVALID_STATE",
    };
  }

  if (patch.appointmentDate !== undefined) {
    const appointmentDate =
      patch.appointmentDate instanceof Date ? patch.appointmentDate : new Date(patch.appointmentDate);
    const conflicts = await findAppointmentConflicts(tenantId, {
      appointmentDate,
      medicalStaffId: (patch.medicalStaffId ?? existing.medicalStaffId) as string,
      employeeId: existing.employeeId,
      excludeAppointmentId: appointmentId,
    });
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: "This time overlaps another appointment for the provider or attendee",
        code: "CONFLICT",
      };
    }
  }

  const updated = await storage.updateAppointment(appointmentId, updatePayload, tenantId, userId);

  if (scheduleChanged) {
    if (existing.status === "confirmed") {
      notifyAppointmentRescheduled(storage, tenantId, updated, userId);
    } else if (existing.status === "scheduled") {
      notifyAppointmentRescheduled(storage, tenantId, updated, userId);
    }
  }

  return { ok: true, data: updated };
}

const ACTIVE_STATUSES = ["scheduled", "confirmed", "in_progress"] as const;
const AWAITING_VISIT_STATUSES = ["scheduled", "confirmed"] as const;

/** Default duration for overlap checks and no-show window (minutes). */
export const DEFAULT_APPOINTMENT_MINUTES = 30;

/** Grace after slot end before auto no-show (minutes). Override via APPOINTMENT_NO_SHOW_GRACE_MINUTES. */
export function getNoShowGraceMinutes(): number {
  const raw = process.env.APPOINTMENT_NO_SHOW_GRACE_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : 15;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15;
}

function appointmentNoShowDeadline(appointment: {
  appointmentDate: Date;
  durationMinutes?: number | null;
}): Date {
  const durationMinutes = appointment.durationMinutes ?? DEFAULT_APPOINTMENT_MINUTES;
  const endMs = new Date(appointment.appointmentDate).getTime() + durationMinutes * 60 * 1000;
  return new Date(endMs + getNoShowGraceMinutes() * 60 * 1000);
}

function appendPatientNote(existing: string | null | undefined, prefix: string, reason?: string | null): string | null {
  const trimmed = reason?.trim();
  if (trimmed) {
    const suffix = `\n[${prefix}: ${trimmed}]`;
    return existing ? `${existing}${suffix}` : trimmed;
  }
  return existing ?? null;
}

export async function findAppointmentConflicts(
  tenantId: string,
  input: {
    appointmentDate: Date;
    medicalStaffId: string;
    employeeId: string;
    durationMinutes?: number;
    excludeAppointmentId?: string;
  },
): Promise<Appointment[]> {
  const durationMs = (input.durationMinutes ?? DEFAULT_APPOINTMENT_MINUTES) * 60 * 1000;
  const windowStart = new Date(input.appointmentDate.getTime() - durationMs);
  const windowEnd = new Date(input.appointmentDate.getTime() + durationMs);

  const conditions = [
    eq(appointments.tenantId, tenantId),
    gte(appointments.appointmentDate, windowStart),
    lte(appointments.appointmentDate, windowEnd),
    or(
      eq(appointments.medicalStaffId, input.medicalStaffId),
      eq(appointments.employeeId, input.employeeId),
    ),
    sql`${appointments.status} NOT IN ('cancelled', 'no_show', 'completed')`,
  ];

  if (input.excludeAppointmentId) {
    conditions.push(ne(appointments.id, input.excludeAppointmentId));
  }

  return db
    .select()
    .from(appointments)
    .where(and(...conditions));
}

export async function patientConfirmAppointment(
  tenantId: string,
  patientId: string,
  appointmentId: string,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const employeeId = await employeeIdForPortalPatient(tenantId, patientId);
  if (!employeeId) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  const [row] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.employeeId, employeeId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };
  if (row.status !== "scheduled") {
    return { ok: false, error: "This appointment is not awaiting your confirmation", code: "INVALID_STATE" };
  }
  if (!requiresPatientConfirmation(row.status, row.confirmationRequiredFrom)) {
    return {
      ok: false,
      error: "This appointment is awaiting confirmation of your reschedule request",
      code: "INVALID_STATE",
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: "confirmed", confirmationRequiredFrom: null, updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId))
    .returning();

  notifyAppointmentPatientConfirmed(storage, tenantId, updated);
  return { ok: true, data: updated };
}

export async function patientDeclineAppointment(
  tenantId: string,
  patientId: string,
  appointmentId: string,
  reason?: string | null,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const employeeId = await employeeIdForPortalPatient(tenantId, patientId);
  if (!employeeId) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  const [row] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.employeeId, employeeId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };
  if (row.status !== "scheduled") {
    return { ok: false, error: "This appointment cannot be declined", code: "INVALID_STATE" };
  }
  if (!requiresPatientConfirmation(row.status, row.confirmationRequiredFrom)) {
    return {
      ok: false,
      error: "This appointment cannot be declined while awaiting confirmation",
      code: "INVALID_STATE",
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: "cancelled",
      notes: appendPatientNote(row.notes, "Patient declined", reason),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  notifyAppointmentPatientDeclined(storage, tenantId, updated, reason);
  return { ok: true, data: updated };
}

/** Patient cancels a previously confirmed appointment (plans changed). */
export async function patientCancelAppointment(
  tenantId: string,
  patientId: string,
  appointmentId: string,
  reason?: string | null,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const employeeId = await employeeIdForPortalPatient(tenantId, patientId);
  if (!employeeId) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  const [row] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.employeeId, employeeId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };
  if (row.status !== "confirmed") {
    return {
      ok: false,
      error: "Only confirmed appointments can be cancelled. Decline if still awaiting confirmation.",
      code: "INVALID_STATE",
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: "cancelled",
      notes: appendPatientNote(row.notes, "Patient cancelled", reason),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  notifyAppointmentPatientCancelled(storage, tenantId, updated, reason);
  return { ok: true, data: updated };
}

function appendRescheduleNote(
  existing: string | null | undefined,
  prefix: string,
  reason?: string | null,
): string | null {
  const trimmed = reason?.trim();
  const line = trimmed ? `[${prefix}: ${trimmed}]` : `[${prefix}]`;
  return existing ? `${existing}\n${line}` : line;
}

/** Patient proposes a new slot for an upcoming scheduled or confirmed visit. */
export async function patientRescheduleAppointment(
  tenantId: string,
  patientId: string,
  appointmentId: string,
  appointmentDate: Date,
  reason?: string | null,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const employeeId = await employeeIdForPortalPatient(tenantId, patientId);
  if (!employeeId) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  const [row] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.employeeId, employeeId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  if (!AWAITING_VISIT_STATUSES.includes(row.status as (typeof AWAITING_VISIT_STATUSES)[number])) {
    return {
      ok: false,
      error: "Only upcoming scheduled or confirmed visits can be rescheduled",
      code: "INVALID_STATE",
    };
  }

  const now = Date.now();
  if (new Date(row.appointmentDate).getTime() <= now) {
    return { ok: false, error: "Past visits cannot be rescheduled", code: "INVALID_STATE" };
  }

  if (appointmentDate.getTime() <= now) {
    return { ok: false, error: "Choose a date and time in the future", code: "VALIDATION" };
  }

  const conflicts = await findAppointmentConflicts(tenantId, {
    appointmentDate,
    medicalStaffId: row.medicalStaffId,
    employeeId: row.employeeId,
    durationMinutes: row.durationMinutes ?? undefined,
    excludeAppointmentId: appointmentId,
  });
  if (conflicts.length > 0) {
    return {
      ok: false,
      error: "This time overlaps another appointment for the provider or attendee",
      code: "CONFLICT",
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      appointmentDate,
      status: "scheduled",
      confirmationRequiredFrom: "staff",
      notes: appendRescheduleNote(row.notes, "Patient rescheduled", reason),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  notifyAppointmentPatientRescheduled(storage, tenantId, updated, reason);

  return { ok: true, data: updated };
}

/** Staff confirms a patient-proposed reschedule. */
export async function staffConfirmAppointmentReschedule(
  storage: IStorage,
  tenantId: string,
  userId: string,
  appointmentId: string,
): Promise<{ ok: true; data: Appointment } | { ok: false; error: string; code?: string }> {
  const existing = await storage.getAppointment(appointmentId, tenantId);
  if (!existing) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  if (!requiresStaffConfirmation(existing.status, existing.confirmationRequiredFrom)) {
    return {
      ok: false,
      error: "This appointment is not awaiting staff confirmation",
      code: "INVALID_STATE",
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: "confirmed",
      confirmationRequiredFrom: null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  notifyAppointmentStaffConfirmedReschedule(storage, tenantId, updated, userId);
  return { ok: true, data: updated };
}

/**
 * Mark appointments as no-show when the slot ended and grace period elapsed.
 * Only affects scheduled/confirmed rows that were never started.
 */
export async function markStaleAppointmentsAsNoShow(): Promise<{ marked: number }> {
  const candidates = await db
    .select()
    .from(appointments)
    .where(inArray(appointments.status, [...AWAITING_VISIT_STATUSES]));

  const now = Date.now();
  const stale = candidates.filter((row) => appointmentNoShowDeadline(row).getTime() <= now);

  let marked = 0;
  for (const row of stale) {
    const [updated] = await db
      .update(appointments)
      .set({
        status: "no_show",
        notes: appendPatientNote(row.notes, "Auto no-show", "Grace period elapsed without check-in"),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, row.id),
          inArray(appointments.status, [...AWAITING_VISIT_STATUSES]),
        ),
      )
      .returning();

    if (!updated) continue;
    marked += 1;

    notifyAppointmentNoShow(storage, row.tenantId, updated);
  }

  return { marked };
}

export function isActiveAppointmentStatus(status: string | null | undefined): boolean {
  return !!status && (ACTIVE_STATUSES as readonly string[]).includes(status);
}
