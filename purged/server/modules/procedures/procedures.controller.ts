import type { IStorage } from "../../storage";
import type { InsertProcedure, Procedure } from "@shared/schema";

export type ProcedureResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Procedures controller: list (active or all), create, update, delete.
 */
export function createProceduresController(storage: IStorage) {
  return {
    async list(tenantId: string, activeOnly = true): Promise<ProcedureResult<Procedure[]>> {
      try {
        const data = await storage.getProcedures(tenantId, activeOnly);
        return { ok: true, data };
      } catch (err) {
        console.error("Procedures controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch procedures",
        };
      }
    },

    async create(tenantId: string, body: InsertProcedure): Promise<ProcedureResult<Procedure>> {
      try {
        const row = await storage.createProcedure(body, tenantId);
        return { ok: true, data: row };
      } catch (err) {
        console.error("Procedures controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create procedure",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      body: Partial<InsertProcedure>
    ): Promise<ProcedureResult<Procedure>> {
      try {
        const row = await storage.updateProcedure(id, body, tenantId);
        return { ok: true, data: row };
      } catch (err) {
        console.error("Procedures controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update procedure",
        };
      }
    },

    async delete(id: string, tenantId: string): Promise<ProcedureResult<{ message: string }>> {
      try {
        await storage.deleteProcedure(id, tenantId);
        return { ok: true, data: { message: "Procedure deleted successfully" } };
      } catch (err) {
        console.error("Procedures controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete procedure",
        };
      }
    },
  };
}

export type ProceduresController = ReturnType<typeof createProceduresController>;
