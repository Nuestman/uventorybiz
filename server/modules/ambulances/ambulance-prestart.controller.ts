import type { IStorage } from "../../storage";
import type { CreateAmbulancePrestartInput, UpdateAmbulancePrestartInput } from "@shared/schema";

export type PrestartResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createAmbulancePrestartController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      query: { ambulanceLocationId?: string; fromShiftDate?: string; toShiftDate?: string }
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["listAmbulancePrestartChecks"]>>>> {
      try {
        const data = await storage.listAmbulancePrestartChecks(tenantId, {
          ambulanceLocationId: query.ambulanceLocationId,
          fromShiftDate: query.fromShiftDate,
          toShiftDate: query.toShiftDate,
        });
        return { ok: true, data };
      } catch (err) {
        console.error("Prestart list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to list pre-start checks",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<
      PrestartResult<NonNullable<Awaited<ReturnType<IStorage["getAmbulancePrestartCheckEnriched"]>>>>
    > {
      try {
        const row = await storage.getAmbulancePrestartCheckEnriched(id, tenantId);
        if (!row) return { ok: false, error: "Not found", code: "NOT_FOUND" };
        return { ok: true, data: row };
      } catch (err) {
        console.error("Prestart getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load pre-start check",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      body: CreateAmbulancePrestartInput
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["createAmbulancePrestartCheck"]>>>> {
      try {
        const data = await storage.createAmbulancePrestartCheck(tenantId, userId, body);
        return { ok: true, data };
      } catch (err) {
        console.error("Prestart create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create pre-start check",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      role: string,
      body: UpdateAmbulancePrestartInput
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["updateAmbulancePrestartCheck"]>>>> {
      try {
        const data = await storage.updateAmbulancePrestartCheck(id, tenantId, userId, role, body);
        return { ok: true, data };
      } catch (err) {
        console.error("Prestart update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update pre-start check",
        };
      }
    },
  };
}
