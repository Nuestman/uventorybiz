import type { IStorage } from "../../storage";
import type { CareLocation, InsertCareLocation } from "@shared/schema";

export type CareLocationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Care locations controller: list, getPrimary, getById, create, update, delete.
 * No req/res; returns result objects. Audit and business rules (primary, only location) inside.
 */
export function createCareLocationsController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      options: { includeInactive?: boolean; status?: string; locationKind?: "fixed_site" | "ambulance" }
    ): Promise<CareLocationResult<CareLocation[]>> {
      try {
        const data = await storage.getCareLocations(tenantId, options);
        return { ok: true, data };
      } catch (err) {
        console.error("Care locations controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch care locations",
        };
      }
    },

    async getPrimary(
      tenantId: string
    ): Promise<CareLocationResult<CareLocation> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const data = await storage.getPrimaryCareLocation(tenantId);
        if (!data) return { ok: false, error: "No primary location found", code: "NOT_FOUND" };
        return { ok: true, data };
      } catch (err) {
        console.error("Care locations controller getPrimary:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch primary location",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<CareLocationResult<CareLocation> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const data = await storage.getCareLocation(id, tenantId);
        if (!data) return { ok: false, error: "Care location not found", code: "NOT_FOUND" };
        return { ok: true, data };
      } catch (err) {
        console.error("Care locations controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch care location",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      data: Parameters<IStorage["createCareLocation"]>[0],
      performedByLabel: string
    ): Promise<CareLocationResult<CareLocation>> {
      try {
        const payload: InsertCareLocation = {
          ...data,
          locationKind: "fixed_site",
          stationedAtLocationId: null,
          callSign: null,
          registrationPlate: null,
          fleetNumber: null,
          coverageNotes: null,
          ambulanceOpsStatus: null,
        };
        if (payload.isPrimary) await storage.unsetPrimaryCareLocation(tenantId);
        const location = await storage.createCareLocation(payload, tenantId, userId);
        await storage.auditAdminOperation(
          "create",
          "care_location",
          location.id,
          userId,
          tenantId,
          null,
          { location },
          {
            performedBy: performedByLabel,
            action: "Created care location",
            locationName: location.locationName,
            locationCode: location.locationCode,
          }
        );
        return { ok: true, data: location };
      } catch (err) {
        console.error("Care locations controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create care location",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      data: Partial<Parameters<IStorage["updateCareLocation"]>[1]>,
      performedByLabel: string
    ): Promise<
      | CareLocationResult<CareLocation>
      | { ok: false; error: string; code: "NOT_FOUND" | "IS_AMBULANCE" }
    > {
      try {
        const original = await storage.getCareLocation(id, tenantId);
        if (!original) return { ok: false, error: "Care location not found", code: "NOT_FOUND" };
        if (original.locationKind === "ambulance") {
          return {
            ok: false,
            error: "Ambulances are updated under Operations → Ambulances.",
            code: "IS_AMBULANCE",
          };
        }
        const {
          locationKind: _lk,
          stationedAtLocationId: _s,
          callSign: _c,
          registrationPlate: _r,
          fleetNumber: _f,
          coverageNotes: _cv,
          ambulanceOpsStatus: _a,
          ...fixedSitePatch
        } = data as Record<string, unknown>;
        if (data.isPrimary && !original.isPrimary) await storage.unsetPrimaryCareLocation(tenantId);
        const updated = await storage.updateCareLocation(id, fixedSitePatch, tenantId, userId);
        await storage.auditAdminOperation(
          "update",
          "care_location",
          id,
          userId,
          tenantId,
          original,
          { updatedLocation: updated },
          { performedBy: performedByLabel, action: "Updated care location", locationName: updated.locationName }
        );
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Care locations controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update care location",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string,
      performedByLabel: string
    ): Promise<
      | CareLocationResult<{ message: string }>
      | {
          ok: false;
          error: string;
          code:
            | "NOT_FOUND"
            | "CANNOT_DELETE_PRIMARY"
            | "CANNOT_DELETE_ONLY"
            | "IS_AMBULANCE"
            | "AMBULANCE_HAS_STOCK";
        }
    > {
      try {
        const original = await storage.getCareLocation(id, tenantId);
        if (!original) return { ok: false, error: "Care location not found", code: "NOT_FOUND" };
        if (original.locationKind === "ambulance") {
          return {
            ok: false,
            error: "Delete ambulances from Operations → Ambulances (after zeroing on-board stock).",
            code: "IS_AMBULANCE",
          };
        }
        if (original.isPrimary) {
          return {
            ok: false,
            error: "Cannot delete primary location. Set another location as primary first.",
            code: "CANNOT_DELETE_PRIMARY",
          };
        }
        const fixedSites = await storage.getCareLocations(tenantId, {
          includeInactive: false,
          locationKind: "fixed_site",
        });
        if (fixedSites.length === 1) {
          return {
            ok: false,
            error: "Cannot delete the only active fixed care site.",
            code: "CANNOT_DELETE_ONLY",
          };
        }
        await storage.deleteCareLocation(id, tenantId, userId);
        await storage.auditAdminOperation(
          "delete",
          "care_location",
          id,
          userId,
          tenantId,
          original,
          null,
          { performedBy: performedByLabel, action: "Deleted care location", locationName: original.locationName }
        );
        return { ok: true, data: { message: "Care location deleted successfully" } };
      } catch (err) {
        console.error("Care locations controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete care location",
        };
      }
    },
  };
}

export type CareLocationsController = ReturnType<typeof createCareLocationsController>;
