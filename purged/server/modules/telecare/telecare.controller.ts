import { insertTelecareSessionSchema } from "@shared/schema";
import { inferPathwayFromAppointmentModality } from "@shared/encounterPathways";
import * as repo from "./telecare.repository";
import { syncTelecareSessionExpirySchedule } from "./telecare-session-expiry.scheduler";

type TelecareResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export function createTelecareController() {
  return {
    async list(
      tenantId: string,
      filters?: { patientId?: string; status?: string },
    ): Promise<TelecareResult<ReturnType<typeof repo.sanitizeTelecareSession>[]>> {
      try {
        const rows = await repo.listTelecareSessionsForTenant(tenantId, filters);
        return { ok: true, data: rows.map(repo.sanitizeTelecareSession) };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to list telecare sessions",
        };
      }
    },

    async getById(tenantId: string, id: string): Promise<TelecareResult<ReturnType<typeof repo.sanitizeTelecareSession>>> {
      try {
        const row = await repo.getTelecareSessionById(tenantId, id);
        if (!row) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };
        return { ok: true, data: repo.sanitizeTelecareSession(row) };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch telecare session",
        };
      }
    },

    async create(
      tenantId: string,
      providerId: string,
      body: unknown,
    ): Promise<TelecareResult<Awaited<ReturnType<typeof repo.createTelecareSession>>>> {
      try {
        const parsed = insertTelecareSessionSchema.parse({
          ...(body as Record<string, unknown>),
          providerId,
        });
        const row = await repo.createTelecareSession(tenantId, parsed);
        if (parsed.appointmentId) {
          await repo.linkAppointmentToTelecareSession(tenantId, parsed.appointmentId, row.id);
        }
        const { appointment } = await repo.getAppointmentForSession(tenantId, row.id);
        syncTelecareSessionExpirySchedule(tenantId, row.id, row, appointment);
        return { ok: true, data: row };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create telecare session",
        };
      }
    },

    async updateStatus(
      tenantId: string,
      id: string,
      status: string,
      extras?: Parameters<typeof repo.updateTelecareSessionStatus>[3],
    ): Promise<TelecareResult<NonNullable<Awaited<ReturnType<typeof repo.updateTelecareSessionStatus>>>>> {
      try {
        const row = await repo.updateTelecareSessionStatus(tenantId, id, status, extras);
        if (!row) return { ok: false, error: "Telecare session not found", code: "NOT_FOUND" };
        const { appointment } = await repo.getAppointmentForSession(tenantId, id);
        syncTelecareSessionExpirySchedule(tenantId, id, row, appointment);
        return { ok: true, data: row };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update telecare session",
        };
      }
    },

    /** Metadata for staff when confirming a portal telehealth request */
    suggestPathwayForModality(modality: "in_person" | "telehealth" | "phone", appointmentType?: string) {
      return inferPathwayFromAppointmentModality(modality, appointmentType);
    },
  };
}

export type TelecareController = ReturnType<typeof createTelecareController>;
