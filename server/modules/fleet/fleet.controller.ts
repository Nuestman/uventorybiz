import type { IStorage } from "../../storage";
import type { CareLocation, CreateFleetUnitInput, UpdateFleetUnitInput } from "@shared/schema";
import { ensureVehicleAssetForFleetLocation, getBusinessAssetByStockLocation, syncVehicleAssetFromFleetOps, updateBusinessAsset } from "../business-assets/business-assets.service";

export type FleetResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

async function assertValidStationedStore(
  storage: IStorage,
  tenantId: string,
  stationedAtLocationId: string | null | undefined
): Promise<void> {
  if (stationedAtLocationId == null || stationedAtLocationId === "") return;
  const site = await storage.getCareLocation(stationedAtLocationId, tenantId);
  if (!site) {
    throw new Error("Stationed-at site was not found in your organization.");
  }
  if (site.locationKind !== "fixed_site") {
    throw new Error("A fleet vehicle can only be stationed at a fixed site.");
  }
}

/**
 * Fleet unit CRUD: backed by care_locations with location_kind = fleet (inventory location_id).
 */
export function createFleetController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      options: { includeInactive?: boolean }
    ): Promise<FleetResult<Array<CareLocation & { stationedAtLocationName: string | null }>>> {
      try {
        const data = await storage.listFleetUnitsForTenant(tenantId, options);
        return { ok: true, data };
      } catch (err) {
        console.error("Fleet controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to list fleet units",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<FleetResult<CareLocation & { stationedAtLocationName: string | null }>> {
      try {
        const row = await storage.getCareLocation(id, tenantId);
        if (!row || row.locationKind !== "fleet") {
          return { ok: false, error: "Fleet vehicle not found", code: "NOT_FOUND" };
        }
        let stationedAtLocationName: string | null = null;
        if (row.stationedAtLocationId) {
          const site = await storage.getCareLocation(row.stationedAtLocationId, tenantId);
          stationedAtLocationName = site?.locationName ?? null;
        }
        return { ok: true, data: { ...row, stationedAtLocationName } };
      } catch (err) {
        console.error("Fleet controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load fleet vehicle",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      body: CreateFleetUnitInput,
      performedByLabel: string
    ): Promise<FleetResult<CareLocation>> {
      try {
        await assertValidStationedStore(storage, tenantId, body.stationedAtLocationId ?? null);
        const location = await storage.createFleetCareLocation(tenantId, userId, body);
        await ensureVehicleAssetForFleetLocation(tenantId, location, {
          vehicleKind: body.vehicleKind ?? "commute",
        });
        await storage.auditAdminOperation(
          "create",
          "fleet",
          location.id,
          userId,
          tenantId,
          null,
          { location },
          {
            performedBy: performedByLabel,
            action: "Created fleet vehicle",
            locationName: location.locationName,
            locationCode: location.locationCode,
          }
        );
        return { ok: true, data: location };
      } catch (err) {
        console.error("Fleet controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create fleet vehicle",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      body: UpdateFleetUnitInput,
      performedByLabel: string
    ): Promise<FleetResult<CareLocation>> {
      try {
        const original = await storage.getCareLocation(id, tenantId);
        if (!original || original.locationKind !== "fleet") {
          return { ok: false, error: "Fleet vehicle not found", code: "NOT_FOUND" };
        }
        const nextStationed =
          body.stationedAtLocationId !== undefined
            ? body.stationedAtLocationId
            : original.stationedAtLocationId;
        await assertValidStationedStore(storage, tenantId, nextStationed);
        const updated = await storage.updateFleetCareLocation(id, tenantId, userId, body);
        const linked = await getBusinessAssetByStockLocation(id, tenantId);
        if (linked) {
          await updateBusinessAsset(linked.id, tenantId, {
            name: updated.locationName,
            description: updated.description,
            callSign: updated.callSign,
            registrationPlate: updated.registrationPlate,
            fleetNumber: updated.fleetNumber,
            stationedAtLocationId:
              body.stationedAtLocationId !== undefined
                ? body.stationedAtLocationId
                : undefined,
            vehicleKind: body.vehicleKind !== undefined ? body.vehicleKind : undefined,
            ...(updated.status === "inactive"
              ? { status: "decommissioned" as const }
              : original.status === "inactive" && updated.status === "active"
                ? { status: "functional" as const }
                : {}),
          });
          if (body.fleetOpsStatus !== undefined && updated.fleetOpsStatus) {
            await syncVehicleAssetFromFleetOps(tenantId, id, {
              opsStatus: updated.fleetOpsStatus as
                | "available"
                | "deployed"
                | "standby"
                | "out_of_service",
              hasFaultyItems: linked.status === "faulty",
            });
          } else if (updated.fleetOpsStatus) {
            await updateBusinessAsset(linked.id, tenantId, {
              opsStatus: updated.fleetOpsStatus,
            });
          }
        } else {
          await ensureVehicleAssetForFleetLocation(tenantId, updated, {
            vehicleKind: body.vehicleKind ?? "commute",
          });
        }
        await storage.auditAdminOperation(
          "update",
          "fleet",
          id,
          userId,
          tenantId,
          original,
          { updatedLocation: updated },
          { performedBy: performedByLabel, action: "Updated fleet vehicle", locationName: updated.locationName }
        );
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Fleet controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update fleet vehicle",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string,
      performedByLabel: string
    ): Promise<
      FleetResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" | "HAS_STOCK" }
    > {
      try {
        const original = await storage.getCareLocation(id, tenantId);
        if (!original || original.locationKind !== "fleet") {
          return { ok: false, error: "Fleet vehicle not found", code: "NOT_FOUND" };
        }
        const units = await storage.getTotalStockUnitsAtCareLocation(tenantId, id);
        if (units > 0) {
          return {
            ok: false,
            error: `Cannot delete this fleet vehicle while it still holds inventory (${units} total units). Transfer or adjust stock to zero first.`,
            code: "HAS_STOCK",
          };
        }
        const linked = await getBusinessAssetByStockLocation(id, tenantId);
        if (linked && linked.status !== "decommissioned") {
          await updateBusinessAsset(linked.id, tenantId, { status: "decommissioned" });
        }
        await storage.deleteCareLocation(id, tenantId, userId);
        await storage.auditAdminOperation(
          "delete",
          "fleet",
          id,
          userId,
          tenantId,
          original,
          null,
          { performedBy: performedByLabel, action: "Deleted fleet vehicle", locationName: original.locationName }
        );
        return { ok: true, data: { message: "Fleet vehicle removed successfully" } };
      } catch (err) {
        console.error("Fleet controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete fleet vehicle",
        };
      }
    },

    async stockSummary(
      id: string,
      tenantId: string
    ): Promise<
      FleetResult<{
        lineCount: number;
        totalUnits: number;
        lowStockLineCount: number;
      }>
    > {
      try {
        const row = await storage.getCareLocation(id, tenantId);
        if (!row || row.locationKind !== "fleet") {
          return { ok: false, error: "Fleet vehicle not found", code: "NOT_FOUND" };
        }
        const lines = await storage.getMedicalInventoryList(tenantId, { locationId: id });
        let totalUnits = 0;
        let lowStockLineCount = 0;
        for (const line of lines) {
          const stock = line.currentStock ?? 0;
          const min = line.minimumStock ?? 0;
          totalUnits += Number(stock) || 0;
          if (min > 0 && stock <= min) lowStockLineCount += 1;
        }
        return {
          ok: true,
          data: { lineCount: lines.length, totalUnits, lowStockLineCount },
        };
      } catch (err) {
        console.error("Fleet controller stockSummary:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load stock summary",
        };
      }
    },

    async stockOnBoard(id: string, tenantId: string) {
      try {
        const row = await storage.getCareLocation(id, tenantId);
        if (!row || row.locationKind !== "fleet") {
          return { ok: false as const, error: "Fleet vehicle not found", code: "NOT_FOUND" as const };
        }
        const lines = await storage.getMedicalInventoryList(tenantId, { locationId: id });
        const data = lines.map((line) => {
          const stock = Number(line.currentStock) || 0;
          const min = Number(line.minimumStock) || 0;
          return {
            stockLineId: line.id,
            itemName: line.itemName,
            itemCode: line.itemCode,
            category: line.category,
            currentStock: stock,
            minimumStock: min,
            unitOfMeasure: line.unitOfMeasure,
            expiryDate: line.expiryDate,
            status: line.status,
            lowStock: min > 0 && stock <= min,
          };
        });
        return { ok: true as const, data };
      } catch (err) {
        console.error("Fleet controller stockOnBoard:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load vehicle stock",
        };
      }
    },

    async inventoryActivity(id: string, tenantId: string, query: { limit?: number }) {
      try {
        const row = await storage.getCareLocation(id, tenantId);
        if (!row || row.locationKind !== "fleet") {
          return { ok: false as const, error: "Fleet vehicle not found", code: "NOT_FOUND" as const };
        }
        const rows = await storage.listInventoryTransactionsInvolvingLocation(tenantId, id, {
          limit: query.limit,
        });
        return { ok: true as const, data: rows };
      } catch (err) {
        console.error("Fleet controller inventoryActivity:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load inventory activity",
        };
      }
    },

    async recentStockTransfers(id: string, tenantId: string, query: { limit?: number }) {
      try {
        const row = await storage.getCareLocation(id, tenantId);
        if (!row || row.locationKind !== "fleet") {
          return { ok: false as const, error: "Fleet vehicle not found", code: "NOT_FOUND" as const };
        }
        const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
        const [fromList, toList] = await Promise.all([
          storage.getStockTransfers(tenantId, { fromLocationId: id }),
          storage.getStockTransfers(tenantId, { toLocationId: id }),
        ]);
        const byId = new Map<string, (typeof fromList)[number]>();
        for (const t of fromList) byId.set(t.id, t);
        for (const t of toList) byId.set(t.id, t);
        const merged = Array.from(byId.values()).sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
        const slice = merged.slice(0, limit);
        const locIds = Array.from(
          new Set(slice.flatMap((t) => [t.fromLocationId, t.toLocationId]))
        );
        const nameById: Record<string, string> = {};
        await Promise.all(
          locIds.map(async (locId) => {
            const loc = await storage.getCareLocation(locId, tenantId);
            if (loc) nameById[locId] = loc.locationName;
          })
        );
        const data = slice.map((t) => ({
          id: t.id,
          status: t.status,
          type: t.type,
          fromLocationId: t.fromLocationId,
          toLocationId: t.toLocationId,
          fromLocationName: nameById[t.fromLocationId] ?? t.fromLocationId,
          toLocationName: nameById[t.toLocationId] ?? t.toLocationId,
          direction:
            t.fromLocationId === id
              ? ("out" as const)
              : t.toLocationId === id
                ? ("in" as const)
                : ("both" as const),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          dispatchedAt: t.dispatchedAt,
          receivedAt: t.receivedAt,
          itemCount: t.items?.length ?? 0,
        }));
        return { ok: true as const, data };
      } catch (err) {
        console.error("Fleet controller recentStockTransfers:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load stock transfers",
        };
      }
    },
  };
}

export type FleetController = ReturnType<typeof createFleetController>;
