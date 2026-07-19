import type { IStorage } from "../../storage";
import type { CreateFleetPrestartInput, UpdateFleetPrestartInput } from "@shared/schema";

export type PrestartResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createFleetPrestartController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      query: { fleetLocationId?: string; fromShiftDate?: string; toShiftDate?: string }
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["listFleetPrestartChecks"]>>>> {
      try {
        const data = await storage.listFleetPrestartChecks(tenantId, {
          fleetLocationId: query.fleetLocationId,
          fromShiftDate: query.fromShiftDate,
          toShiftDate: query.toShiftDate,
        });
        return { ok: true, data };
      } catch (err) {
        console.error("Fleet prestart list:", err);
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
      PrestartResult<NonNullable<Awaited<ReturnType<IStorage["getFleetPrestartCheckEnriched"]>>>>
    > {
      try {
        const row = await storage.getFleetPrestartCheckEnriched(id, tenantId);
        if (!row) return { ok: false, error: "Not found", code: "NOT_FOUND" };
        return { ok: true, data: row };
      } catch (err) {
        console.error("Fleet prestart getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load pre-start check",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      body: CreateFleetPrestartInput
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["createFleetPrestartCheck"]>>>> {
      try {
        const data = await storage.createFleetPrestartCheck(tenantId, userId, body);
        return { ok: true, data };
      } catch (err) {
        console.error("Fleet prestart create:", err);
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
      body: UpdateFleetPrestartInput
    ): Promise<PrestartResult<Awaited<ReturnType<IStorage["updateFleetPrestartCheck"]>>>> {
      try {
        const data = await storage.updateFleetPrestartCheck(id, tenantId, userId, role, body);
        return { ok: true, data };
      } catch (err) {
        console.error("Fleet prestart update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update pre-start check",
        };
      }
    },
  };
}
