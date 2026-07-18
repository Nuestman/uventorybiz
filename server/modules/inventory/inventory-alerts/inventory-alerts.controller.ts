import type { IStorage } from "../../../storage";

export type InventoryAlertResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createInventoryAlertsController(storage: IStorage) {
  return {
    async processPending(tenantId: string) {
      try {
        const result = await storage.processPendingInventoryAlerts(tenantId);
        return { ok: true as const, data: result };
      } catch (err) {
        console.error("Inventory alerts controller processPending:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to process pending alerts" };
      }
    },

    async list(tenantId: string, filters?: { isActive?: boolean; alertType?: string; severity?: string }) {
      try {
        const data = await storage.getInventoryAlerts(tenantId, filters);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory alerts controller list:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch inventory alerts" };
      }
    },

    async create(tenantId: string, body: Parameters<IStorage["createInventoryAlert"]>[0]) {
      try {
        const data = await storage.createInventoryAlert(body, tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory alerts controller create:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to create inventory alert" };
      }
    },

    async update(id: string, tenantId: string, body: Parameters<IStorage["updateInventoryAlert"]>[1]) {
      try {
        const data = await storage.updateInventoryAlert(id, body, tenantId);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Inventory alerts controller update:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update inventory alert" };
      }
    },

    async acknowledge(id: string, userId: string, tenantId: string) {
      try {
        const data = await storage.acknowledgeInventoryAlert(id, userId, tenantId);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Inventory alerts controller acknowledge:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to acknowledge inventory alert" };
      }
    },

    async resolve(id: string, userId: string, tenantId: string) {
      try {
        const data = await storage.resolveInventoryAlert(id, userId, tenantId);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Inventory alerts controller resolve:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to resolve inventory alert" };
      }
    },
  };
}

export type InventoryAlertsController = ReturnType<typeof createInventoryAlertsController>;
