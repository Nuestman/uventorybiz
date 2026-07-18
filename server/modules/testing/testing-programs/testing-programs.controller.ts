import type { IStorage } from "../../../storage";

export type TestingProgramResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createTestingProgramsController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters?: { programType?: string; status?: string }
    ) {
      try {
        const data = await storage.getTestingPrograms(tenantId, filters);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Testing programs controller list:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch testing programs" };
      }
    },

    async create(tenantId: string, body: Parameters<IStorage["createTestingProgram"]>[0]) {
      try {
        const data = await storage.createTestingProgram(body, tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Testing programs controller create:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to create testing program" };
      }
    },

    async getById(id: string, tenantId: string) {
      try {
        const data = await storage.getTestingProgram(id, tenantId);
        return { ok: true as const, data: data ?? null };
      } catch (err) {
        console.error("Testing programs controller getById:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch testing program" };
      }
    },

    async update(id: string, tenantId: string, body: Parameters<IStorage["updateTestingProgram"]>[1]) {
      try {
        const data = await storage.updateTestingProgram(id, body, tenantId);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Testing programs controller update:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update testing program" };
      }
    },

    async delete(id: string, tenantId: string) {
      try {
        await storage.deleteTestingProgram(id, tenantId);
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Testing programs controller delete:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete testing program" };
      }
    },
  };
}

export type TestingProgramsController = ReturnType<typeof createTestingProgramsController>;
