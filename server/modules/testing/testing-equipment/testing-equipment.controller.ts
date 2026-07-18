import type { IStorage } from "../../../storage";

export type TestingEquipmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createTestingEquipmentController(storage: IStorage) {
  return {
    async getCalibrationDue(tenantId: string) {
      try {
        const data = await storage.getEquipmentDueForCalibration(tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Testing equipment controller getCalibrationDue:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch equipment due for calibration" };
      }
    },

    async list(
      tenantId: string,
      filters?: { deviceType?: string; status?: string; location?: string; calibrationDue?: boolean }
    ) {
      try {
        const data = await storage.getTestingEquipmentList(tenantId, filters);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Testing equipment controller list:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch testing equipment" };
      }
    },

    async create(tenantId: string, body: Parameters<IStorage["createTestingEquipment"]>[0]) {
      try {
        const data = await storage.createTestingEquipment(body, tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Testing equipment controller create:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to create testing equipment" };
      }
    },

    async getById(id: string, tenantId: string) {
      try {
        const data = await storage.getTestingEquipment(id, tenantId);
        return { ok: true as const, data: data ?? null };
      } catch (err) {
        console.error("Testing equipment controller getById:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch testing equipment" };
      }
    },

    async update(id: string, tenantId: string, body: Parameters<IStorage["updateTestingEquipment"]>[1]) {
      try {
        const data = await storage.updateTestingEquipment(id, body, tenantId);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Testing equipment controller update:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update testing equipment" };
      }
    },

    async delete(id: string, tenantId: string) {
      try {
        await storage.deleteTestingEquipment(id, tenantId);
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Testing equipment controller delete:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete testing equipment" };
      }
    },
  };
}

export type TestingEquipmentController = ReturnType<typeof createTestingEquipmentController>;
