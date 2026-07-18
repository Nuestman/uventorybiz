import type { IStorage } from "../../storage";
import type { ReferralFacility } from "@shared/schema";

export type ReferralFacilityResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Referral facilities controller: list (for forms), getById, create, update, delete.
 * Tenant-isolated; list is used when user selects "transferred to hospital".
 */
export function createReferralFacilitiesController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      options?: { includeInactive?: boolean; status?: string }
    ): Promise<ReferralFacilityResult<ReferralFacility[]>> {
      try {
        const data = await storage.getReferralFacilities(tenantId, options);
        return { ok: true, data };
      } catch (err) {
        console.error("Referral facilities controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch referral facilities",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<ReferralFacilityResult<ReferralFacility> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const data = await storage.getReferralFacility(id, tenantId);
        if (!data) return { ok: false, error: "Referral facility not found", code: "NOT_FOUND" };
        return { ok: true, data };
      } catch (err) {
        console.error("Referral facilities controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch referral facility",
        };
      }
    },

    async create(
      tenantId: string,
      data: Parameters<IStorage["createReferralFacility"]>[0]
    ): Promise<ReferralFacilityResult<ReferralFacility>> {
      try {
        const facility = await storage.createReferralFacility(data, tenantId);
        return { ok: true, data: facility };
      } catch (err) {
        console.error("Referral facilities controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create referral facility",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<Parameters<IStorage["updateReferralFacility"]>[1]>
    ): Promise<ReferralFacilityResult<ReferralFacility> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const updated = await storage.updateReferralFacility(id, data, tenantId);
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Referral facilities controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update referral facility",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<ReferralFacilityResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const existing = await storage.getReferralFacility(id, tenantId);
        if (!existing) return { ok: false, error: "Referral facility not found", code: "NOT_FOUND" };
        await storage.deleteReferralFacility(id, tenantId);
        return { ok: true, data: { message: "Referral facility deleted" } };
      } catch (err) {
        console.error("Referral facilities controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete referral facility",
        };
      }
    },
  };
}

export type ReferralFacilitiesController = ReturnType<typeof createReferralFacilitiesController>;
