import type { IStorage } from "../../../storage";
import type { InsertOperationalDuty, OperationalDuty } from "@shared/schema";

export type OperationalDutyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Operational duties controller: create, list, update, delete. No req/res; returns result objects.
 */
export function createOperationalDutiesController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      data: InsertOperationalDuty
    ): Promise<OperationalDutyResult<OperationalDuty>> {
      try {
        const duty = await storage.createOperationalDuty(data, tenantId, userId);
        return { ok: true, data: duty };
      } catch (err) {
        console.error("Operational duties controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create operational duty",
        };
      }
    },

    async list(tenantId: string): Promise<OperationalDutyResult<OperationalDuty[]>> {
      try {
        const data = await storage.getOperationalDuties(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Operational duties controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch operational duties",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      data: Partial<InsertOperationalDuty>
    ): Promise<OperationalDutyResult<OperationalDuty>> {
      try {
        const duty = await storage.updateOperationalDuty(id, data, tenantId, userId);
        return { ok: true, data: duty };
      } catch (err) {
        console.error("Operational duties controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update operational duty",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<OperationalDutyResult<{ message: string }>> {
      try {
        await storage.deleteOperationalDuty(id, tenantId, userId);
        return { ok: true, data: { message: "Operational duty deleted successfully" } };
      } catch (err) {
        console.error("Operational duties controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete operational duty",
        };
      }
    },
  };
}

export type OperationalDutiesController = ReturnType<typeof createOperationalDutiesController>;
