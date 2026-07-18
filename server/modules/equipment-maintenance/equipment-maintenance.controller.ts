import type { IStorage } from "../../storage";
import type { InsertEquipmentMaintenance, EquipmentMaintenance } from "@shared/schema";

export type EquipmentMaintenanceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface MaintenanceListFilters {
  status?: string;
  equipmentId?: string;
  overdue?: boolean;
}

/**
 * Equipment maintenance controller: getDue, create, list, getById, update, delete.
 * No req/res; returns result objects.
 */
export function createEquipmentMaintenanceController(storage: IStorage) {
  return {
    async getMaintenanceDue(tenantId: string): Promise<EquipmentMaintenanceResult<EquipmentMaintenance[]>> {
      try {
        const data = await storage.getEquipmentDueForMaintenance(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Equipment maintenance controller getMaintenanceDue:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch equipment due for maintenance",
        };
      }
    },

    async create(
      tenantId: string,
      data: InsertEquipmentMaintenance
    ): Promise<EquipmentMaintenanceResult<EquipmentMaintenance>> {
      try {
        const maintenance = await storage.createEquipmentMaintenance(data, tenantId);
        return { ok: true, data: maintenance };
      } catch (err) {
        console.error("Equipment maintenance controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create equipment maintenance",
        };
      }
    },

    async list(
      tenantId: string,
      filters?: MaintenanceListFilters
    ): Promise<EquipmentMaintenanceResult<EquipmentMaintenance[]>> {
      try {
        const data = await storage.getEquipmentMaintenanceList(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Equipment maintenance controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch equipment maintenance",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<EquipmentMaintenanceResult<EquipmentMaintenance> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const maintenance = await storage.getEquipmentMaintenance(id, tenantId);
        if (!maintenance) return { ok: false, error: "Equipment maintenance not found", code: "NOT_FOUND" };
        return { ok: true, data: maintenance };
      } catch (err) {
        console.error("Equipment maintenance controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch equipment maintenance",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertEquipmentMaintenance>
    ): Promise<EquipmentMaintenanceResult<EquipmentMaintenance>> {
      try {
        const maintenance = await storage.updateEquipmentMaintenance(id, data, tenantId);
        return { ok: true, data: maintenance };
      } catch (err) {
        console.error("Equipment maintenance controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update equipment maintenance",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<EquipmentMaintenanceResult<{ message: string }>> {
      try {
        await storage.deleteEquipmentMaintenance(id, tenantId);
        return { ok: true, data: { message: "Equipment maintenance deleted successfully" } };
      } catch (err) {
        console.error("Equipment maintenance controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete equipment maintenance",
        };
      }
    },
  };
}

export type EquipmentMaintenanceController = ReturnType<typeof createEquipmentMaintenanceController>;
