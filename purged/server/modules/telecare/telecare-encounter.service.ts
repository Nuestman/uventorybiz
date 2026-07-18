import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { appointments, encounters } from "@shared/schema";
import type { IStorage } from "../../storage";
import { createEncountersController } from "../encounters/encounters.controller";
import * as repo from "./telecare.repository";

export async function openEncounterForTelecareSession(
  storage: IStorage,
  tenantId: string,
  userId: string,
  sessionId: string,
): Promise<
  | { ok: true; encounterId: string; created: boolean }
  | { ok: false; error: string; code: string }
> {
  const { session, appointment } = await repo.getAppointmentForSession(tenantId, sessionId);
  if (!session) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };

  if (appointment?.encounterId) {
    const existing = await storage.getMedicalVisit(appointment.encounterId, tenantId);
    if (existing && !["finished", "cancelled", "entered_in_error"].includes(existing.status ?? "")) {
      return { ok: true, encounterId: existing.id, created: false };
    }
  }

  const active = await storage.getActiveEncounterForPatient(session.patientId, tenantId);
  if (active) {
    if (active.telecareSessionId === sessionId) {
      return { ok: true, encounterId: active.id, created: false };
    }
    return {
      ok: false,
      error: "Patient already has an open encounter. Complete or cancel it before starting this telehealth visit.",
      code: "ACTIVE_ENCOUNTER_EXISTS",
    };
  }

  const controller = createEncountersController(storage);
  const result = await controller.open(tenantId, userId, {
    patientId: session.patientId,
    locationId: appointment?.locationId ?? null,
    visitType: "clinical",
    modality: "telehealth",
    triageRequired: false,
    visitDate: new Date(),
    appointmentId: appointment?.id ?? session.appointmentId ?? null,
    telecareSessionId: sessionId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, code: result.code ?? "OPEN_FAILED" };
  }

  const encounterId = result.data.id;

  if (appointment?.id) {
    await db
      .update(appointments)
      .set({ encounterId, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.tenantId, tenantId)));
  }

  await db
    .update(encounters)
    .set({ telecareSessionId: sessionId, updatedAt: new Date() })
    .where(and(eq(encounters.id, encounterId), eq(encounters.tenantId, tenantId)));

  return { ok: true, encounterId, created: true };
}
