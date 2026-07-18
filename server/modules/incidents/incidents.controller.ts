import type { IStorage } from "../../storage";
import type { InsertIncidentReport, IncidentReport } from "@shared/schema";

/** Result type for controller actions: success with data or error with message/code */
export type IncidentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Incidents controller: orchestrates storage (and notifications via storage).
 * No req/res; takes plain inputs and returns result objects.
 * Route layer is responsible for HTTP (status codes, response body).
 */
export function createIncidentsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      data: InsertIncidentReport
    ): Promise<IncidentResult<IncidentReport>> {
      try {
        const report = await storage.createIncidentReport(data, tenantId, userId);
        return { ok: true, data: report };
      } catch (err) {
        console.error("Incidents controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create incident report",
        };
      }
    },

    async list(tenantId: string): Promise<IncidentResult<IncidentReport[]>> {
      try {
        const reports = await storage.getIncidentReports(tenantId);
        return { ok: true, data: reports };
      } catch (err) {
        console.error("Incidents controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch incident reports",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      data: Partial<InsertIncidentReport>
    ): Promise<IncidentResult<IncidentReport>> {
      try {
        const updated = await storage.updateIncidentReport(id, data, tenantId, userId);
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Incidents controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update incident report",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<IncidentResult<{ success: true }>> {
      try {
        await storage.deleteIncidentReport(id, tenantId, userId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Incidents controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete incident report",
        };
      }
    },
  };
}

export type IncidentsController = ReturnType<typeof createIncidentsController>;
