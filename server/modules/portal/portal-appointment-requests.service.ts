import { and, desc, eq } from "drizzle-orm";
import { db } from "../../config/db";
import {
  appointments,
  employees,
  patients,
  portalAppointmentRequests,
} from "@shared/schema";
import { inferPathwayFromAppointmentModality, type EncounterModality } from "@shared/encounterPathways";
import { findAppointmentConflicts } from "../appointments/appointment-management.service";
import { notifyAppointmentPortalRequestApproved } from "../appointments/appointment-notifications.service";
import { storage } from "../../storage";

export async function getPortalAppointmentRequest(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(portalAppointmentRequests)
    .where(and(eq(portalAppointmentRequests.id, id), eq(portalAppointmentRequests.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function listPortalAppointmentRequestsForTenant(
  tenantId: string,
  status?: string,
) {
  const conditions = [eq(portalAppointmentRequests.tenantId, tenantId)];
  if (status) conditions.push(eq(portalAppointmentRequests.status, status));

  return db
    .select({
      request: portalAppointmentRequests,
      patient: patients,
      employee: employees,
    })
    .from(portalAppointmentRequests)
    .innerJoin(patients, eq(portalAppointmentRequests.patientId, patients.id))
    .innerJoin(employees, eq(patients.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(desc(portalAppointmentRequests.createdAt));
}

export async function confirmPortalAppointmentRequest(input: {
  tenantId: string;
  staffUserId: string;
  requestId: string;
  appointmentDate: Date;
  medicalStaffId: string;
  appointmentType?: string;
  staffNotes?: string | null;
  locationId?: string | null;
}) {
  const request = await getPortalAppointmentRequest(input.tenantId, input.requestId);
  if (!request) return { ok: false as const, error: "Request not found", code: "NOT_FOUND" };
  if (request.status !== "pending") {
    return { ok: false as const, error: "Request is no longer pending", code: "INVALID_STATE" };
  }

  const modality = (request.preferredModality ?? "in_person") as EncounterModality;
  const appointmentType = input.appointmentType?.trim() || (modality === "telehealth" ? "telehealth" : "routine_checkup");
  const resolvedLocationId = input.locationId ?? request.preferredLocationId ?? null;

  if (modality === "in_person" && !resolvedLocationId) {
    return {
      ok: false as const,
      error: "Care location is required for in-person visits",
      code: "VALIDATION",
    };
  }

  const [patientRow] = await db
    .select({ employeeId: patients.employeeId })
    .from(patients)
    .where(and(eq(patients.id, request.patientId), eq(patients.tenantId, input.tenantId)))
    .limit(1);
  const employeeId = patientRow?.employeeId;
  if (!employeeId) {
    return { ok: false as const, error: "Employee record not found", code: "NOT_FOUND" };
  }

  const conflicts = await findAppointmentConflicts(input.tenantId, {
    appointmentDate: input.appointmentDate,
    medicalStaffId: input.medicalStaffId,
    employeeId,
  });
  if (conflicts.length > 0) {
    return { ok: false as const, error: "This time overlaps another appointment", code: "CONFLICT" };
  }

  const [appointment] = await db
    .insert(appointments)
    .values({
      tenantId: input.tenantId,
      employeeId,
      medicalStaffId: input.medicalStaffId,
      locationId: resolvedLocationId,
      appointmentDate: input.appointmentDate,
      appointmentType,
      modality,
      status: "confirmed",
      notes: input.staffNotes ?? request.reason ?? null,
      updatedAt: new Date(),
    })
    .returning();

  const [updatedRequest] = await db
    .update(portalAppointmentRequests)
    .set({
      status: "confirmed",
      linkedAppointmentId: appointment.id,
      staffNotes: input.staffNotes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(portalAppointmentRequests.id, input.requestId),
        eq(portalAppointmentRequests.tenantId, input.tenantId),
      ),
    )
    .returning();

  notifyAppointmentPortalRequestApproved(storage, input.tenantId, appointment, input.staffUserId);

  return {
    ok: true as const,
    data: {
      request: updatedRequest,
      appointment,
      suggestedPathway: inferPathwayFromAppointmentModality(modality, appointmentType),
    },
  };
}

export async function declinePortalAppointmentRequest(input: {
  tenantId: string;
  requestId: string;
  staffNotes?: string | null;
}) {
  const request = await getPortalAppointmentRequest(input.tenantId, input.requestId);
  if (!request) return { ok: false as const, error: "Request not found", code: "NOT_FOUND" };
  if (request.status !== "pending") {
    return { ok: false as const, error: "Request is no longer pending", code: "INVALID_STATE" };
  }

  const [updated] = await db
    .update(portalAppointmentRequests)
    .set({
      status: "declined",
      staffNotes: input.staffNotes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(portalAppointmentRequests.id, input.requestId),
        eq(portalAppointmentRequests.tenantId, input.tenantId),
      ),
    )
    .returning();

  return { ok: true as const, data: updated };
}
