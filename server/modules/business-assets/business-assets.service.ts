import { and, asc, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../config/db";
import {
  businessAssets,
  careLocations,
  tenantAssetTagCounters,
  type BusinessAsset,
  type CreateBusinessAssetInput,
  type UpdateBusinessAssetInput,
} from "@shared/schema";
import { allocateNextFleetCallSign } from "../fleet/nextFleetCallSign";

export type BusinessAssetListRow = BusinessAsset & {
  assignedLocationName: string | null;
  stockLocationName: string | null;
  /** Display location: stock site for vehicles, otherwise assigned location. */
  locationName: string | null;
  /** Home base (fixed site) for vehicles — from linked fleet location. */
  stationedAtLocationId: string | null;
  stationedAtLocationName: string | null;
};

export type BusinessAssetResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function formatAssetTag(n: number): string {
  return `AST-${String(n).padStart(6, "0")}`;
}

function slugCode(raw: string): string {
  const base = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "FLEET";
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
  const code =
    (cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code: unknown }).code)
      : null) ??
    ("code" in err ? String((err as { code: unknown }).code) : null);
  return code === "23505";
}

/**
 * Allocate the next AST-###### for a tenant.
 * Counter stores last issued. Always align to MAX(existing tags) first so
 * backfilled assets (or a stale counter at 0/1) cannot collide.
 */
async function nextAssetTag(
  tenantId: string,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string> {
  await tx.execute(sql`
    INSERT INTO tenant_asset_tag_counters (tenant_id, next_value, updated_at)
    SELECT ${tenantId}, COALESCE(MAX(SUBSTRING(asset_tag FROM 5)::int), 0), now()
    FROM business_assets
    WHERE tenant_id = ${tenantId} AND asset_tag ~ '^AST-[0-9]+$'
    ON CONFLICT (tenant_id) DO UPDATE
    SET next_value = GREATEST(
      tenant_asset_tag_counters.next_value,
      EXCLUDED.next_value
    ),
    updated_at = now()
  `);

  const [seq] = await tx
    .update(tenantAssetTagCounters)
    .set({
      nextValue: sql`${tenantAssetTagCounters.nextValue} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(tenantAssetTagCounters.tenantId, tenantId))
    .returning();

  // Race: counter row missing after sync (should be rare) — seed at 1.
  if (!seq) {
    const [created] = await tx
      .insert(tenantAssetTagCounters)
      .values({ tenantId, nextValue: 1, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: tenantAssetTagCounters.tenantId,
        set: {
          nextValue: sql`${tenantAssetTagCounters.nextValue} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return formatAssetTag(created?.nextValue ?? 1);
  }

  return formatAssetTag(seq.nextValue);
}

/** Ensure counter reflects max existing AST-###### for this tenant (last issued). */
export async function syncAssetTagCounter(tenantId: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO tenant_asset_tag_counters (tenant_id, next_value, updated_at)
    SELECT ${tenantId}, COALESCE(MAX(SUBSTRING(asset_tag FROM 5)::int), 0), now()
    FROM business_assets
    WHERE tenant_id = ${tenantId} AND asset_tag ~ '^AST-[0-9]+$'
    ON CONFLICT (tenant_id) DO UPDATE
    SET next_value = GREATEST(
      tenant_asset_tag_counters.next_value,
      EXCLUDED.next_value
    ),
    updated_at = now()
  `);
}

async function assertAssignedLocation(tenantId: string, locationId: string | null | undefined) {
  if (!locationId) return;
  const [loc] = await db
    .select({ id: careLocations.id })
    .from(careLocations)
    .where(and(eq(careLocations.id, locationId), eq(careLocations.tenantId, tenantId)))
    .limit(1);
  if (!loc) throw new Error("Assigned location was not found in your organization.");
}

/** Stationed-at must be a fixed store/site (not another fleet unit). */
async function assertStationedAtStore(tenantId: string, locationId: string | null | undefined) {
  if (!locationId) return;
  const [loc] = await db
    .select({ id: careLocations.id, locationKind: careLocations.locationKind })
    .from(careLocations)
    .where(and(eq(careLocations.id, locationId), eq(careLocations.tenantId, tenantId)))
    .limit(1);
  if (!loc) throw new Error("Stationed-at store was not found in your organization.");
  if (loc.locationKind === "fleet") {
    throw new Error("Stationed at must be a fixed store or warehouse, not a fleet unit.");
  }
}

export type ListBusinessAssetsFilters = {
  q?: string;
  status?: string;
  assetType?: string;
  assignedLocationId?: string;
  stockLocationId?: string;
  /** Match assigned location OR stock (fleet) location. */
  locationId?: string;
  /** Include decommissioned assets (legacy query name: includeRetired). */
  includeRetired?: boolean;
};

const OUT_OF_REGISTER = sql`${businessAssets.status} NOT IN ('decommissioned', 'sold')`;

export async function listBusinessAssets(
  tenantId: string,
  filters: ListBusinessAssetsFilters = {},
): Promise<BusinessAssetListRow[]> {
  const assignedLoc = alias(careLocations, "ba_assigned_loc");
  const stockLoc = alias(careLocations, "ba_stock_loc");
  const stationedLoc = alias(careLocations, "ba_stationed_loc");
  const conditions = [eq(businessAssets.tenantId, tenantId)];
  if (filters.status) {
    conditions.push(eq(businessAssets.status, filters.status as BusinessAsset["status"]));
  } else if (!filters.includeRetired) {
    conditions.push(OUT_OF_REGISTER);
  }
  if (filters.assetType) {
    conditions.push(eq(businessAssets.assetType, filters.assetType as BusinessAsset["assetType"]));
  }
  if (filters.locationId) {
    conditions.push(
      or(
        eq(businessAssets.assignedLocationId, filters.locationId),
        eq(businessAssets.stockLocationId, filters.locationId),
      )!,
    );
  } else {
    if (filters.assignedLocationId) {
      conditions.push(eq(businessAssets.assignedLocationId, filters.assignedLocationId));
    }
    if (filters.stockLocationId) {
      conditions.push(eq(businessAssets.stockLocationId, filters.stockLocationId));
    }
  }
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(businessAssets.name, q),
        ilike(businessAssets.assetTag, q),
        ilike(businessAssets.serialNumber, q),
        ilike(businessAssets.callSign, q),
        ilike(businessAssets.fleetNumber, q),
        ilike(businessAssets.registrationPlate, q),
        ilike(assignedLoc.locationName, q),
        ilike(stockLoc.locationName, q),
      )!,
    );
  }

  const rows = await db
    .select({
      ...getTableColumns(businessAssets),
      assignedLocationName: assignedLoc.locationName,
      stockLocationName: stockLoc.locationName,
      stationedAtLocationId: stockLoc.stationedAtLocationId,
      stationedAtLocationName: stationedLoc.locationName,
    })
    .from(businessAssets)
    .leftJoin(assignedLoc, eq(businessAssets.assignedLocationId, assignedLoc.id))
    .leftJoin(stockLoc, eq(businessAssets.stockLocationId, stockLoc.id))
    .leftJoin(stationedLoc, eq(stockLoc.stationedAtLocationId, stationedLoc.id))
    .where(and(...conditions))
    .orderBy(asc(businessAssets.assetTag));

  return rows.map((row) => ({
    ...row,
    stationedAtLocationId: row.assetType === "vehicle" ? row.stationedAtLocationId ?? null : null,
    stationedAtLocationName: row.assetType === "vehicle" ? row.stationedAtLocationName ?? null : null,
    locationName:
      row.assetType === "vehicle"
        ? row.stockLocationName ?? row.assignedLocationName
        : row.assignedLocationName ?? row.stockLocationName,
  }));
}

export async function listBusinessAssetOptions(tenantId: string, includeId?: string) {
  const conditions = [
    eq(businessAssets.tenantId, tenantId),
    includeId
      ? or(OUT_OF_REGISTER, eq(businessAssets.id, includeId))!
      : OUT_OF_REGISTER,
  ];
  const rows = await db
    .select({
      id: businessAssets.id,
      assetTag: businessAssets.assetTag,
      name: businessAssets.name,
      assetType: businessAssets.assetType,
      status: businessAssets.status,
    })
    .from(businessAssets)
    .where(and(...conditions))
    .orderBy(asc(businessAssets.assetTag));
  return rows;
}

export async function getBusinessAsset(
  id: string,
  tenantId: string,
): Promise<BusinessAsset | undefined> {
  const [row] = await db
    .select()
    .from(businessAssets)
    .where(and(eq(businessAssets.id, id), eq(businessAssets.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function createBusinessAsset(
  tenantId: string,
  input: CreateBusinessAssetInput,
): Promise<BusinessAsset> {
  await assertAssignedLocation(tenantId, input.assignedLocationId);
  if (input.assetType === "vehicle") {
    await assertStationedAtStore(tenantId, input.stationedAtLocationId);
  }

  const attemptInsert = async (): Promise<BusinessAsset> =>
    db.transaction(async (tx) => {
      const assetTag = await nextAssetTag(tenantId, tx);
      let stockLocationId: string | null = null;

      if (input.assetType === "vehicle") {
        const locationName = input.name.trim();
        const callSign =
          input.callSign?.trim() || (await allocateNextFleetCallSign(tenantId, tx));
        const locationCode =
          input.locationCode?.trim() ||
          slugCode(input.fleetNumber || callSign || input.name) +
            "-" +
            assetTag.replace("AST-", "");
        const vehicleKind = input.vehicleKind === "mobile_store" ? "mobile_store" : "commute";
        const [loc] = await tx
          .insert(careLocations)
          .values({
            tenantId,
            locationName,
            locationCode,
            description: input.description ?? null,
            locationKind: "fleet",
            stationedAtLocationId: input.stationedAtLocationId ?? null,
            callSign,
            registrationPlate: input.registrationPlate ?? null,
            fleetNumber: input.fleetNumber ?? null,
            fleetOpsStatus: input.opsStatus ?? "available",
            status: "active",
            isPrimary: false,
          })
          .returning();
        stockLocationId = loc.id;

        const [row] = await tx
          .insert(businessAssets)
          .values({
            tenantId,
            assetTag,
            name: input.name.trim(),
            description: input.description ?? null,
            assetType: input.assetType,
            status: input.status ?? "functional",
            serialNumber: input.serialNumber ?? null,
            brand: input.brand ?? null,
            model: input.model ?? null,
            callSign,
            registrationPlate: input.registrationPlate ?? null,
            fleetNumber: input.fleetNumber ?? null,
            opsStatus: input.opsStatus ?? "available",
            vehicleKind,
            stockLocationId,
            assignedLocationId: null,
            purchaseDate: input.purchaseDate || null,
            warrantyExpiry: input.warrantyExpiry || null,
            lastMaintenanceDate: input.lastMaintenanceDate || null,
            nextMaintenanceDate: input.nextMaintenanceDate || null,
            notes: input.notes ?? null,
          })
          .returning();
        return row;
      }

      const [row] = await tx
        .insert(businessAssets)
        .values({
          tenantId,
          assetTag,
          name: input.name.trim(),
          description: input.description ?? null,
          assetType: input.assetType,
          status: input.status ?? "functional",
          serialNumber: input.serialNumber ?? null,
          brand: input.brand ?? null,
          model: input.model ?? null,
          callSign: input.callSign ?? null,
          registrationPlate: input.registrationPlate ?? null,
          fleetNumber: input.fleetNumber ?? null,
          opsStatus: null,
          vehicleKind: null,
          stockLocationId: null,
          assignedLocationId: input.assignedLocationId ?? null,
          purchaseDate: input.purchaseDate || null,
          warrantyExpiry: input.warrantyExpiry || null,
          lastMaintenanceDate: input.lastMaintenanceDate || null,
          nextMaintenanceDate: input.nextMaintenanceDate || null,
          notes: input.notes ?? null,
        })
        .returning();
      return row;
    });

  try {
    return await attemptInsert();
  } catch (err) {
    // Stale counter race — resync via nextAssetTag and retry once.
    if (isUniqueViolation(err)) {
      try {
        return await attemptInsert();
      } catch (retryErr) {
        if (isUniqueViolation(retryErr)) {
          throw new Error(
            "Could not assign a unique asset tag. Refresh and try again, or contact support if this persists.",
          );
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

export async function updateBusinessAsset(
  id: string,
  tenantId: string,
  input: UpdateBusinessAssetInput,
): Promise<BusinessAsset | undefined> {
  const existing = await getBusinessAsset(id, tenantId);
  if (!existing) return undefined;

  if (
    input.assetType !== undefined &&
    input.assetType !== existing.assetType &&
    (existing.assetType === "vehicle" || input.assetType === "vehicle")
  ) {
    throw new Error(
      "Cannot change asset type to or from vehicle. Retire this asset and create a new one instead.",
    );
  }

  if (input.assignedLocationId !== undefined) {
    await assertAssignedLocation(tenantId, input.assignedLocationId);
  }
  if (input.stationedAtLocationId !== undefined) {
    await assertStationedAtStore(tenantId, input.stationedAtLocationId);
  }

  const nextType = input.assetType ?? existing.assetType;
  const patch: Partial<typeof businessAssets.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.assetType !== undefined) patch.assetType = input.assetType;
  if (input.status !== undefined) patch.status = input.status;
  if (input.serialNumber !== undefined) patch.serialNumber = input.serialNumber;
  if (input.brand !== undefined) patch.brand = input.brand;
  if (input.model !== undefined) patch.model = input.model;
  if (input.callSign !== undefined) patch.callSign = input.callSign;
  if (input.registrationPlate !== undefined) patch.registrationPlate = input.registrationPlate;
  if (input.fleetNumber !== undefined) patch.fleetNumber = input.fleetNumber;
  if (input.opsStatus !== undefined) patch.opsStatus = nextType === "vehicle" ? input.opsStatus : null;
  if (input.vehicleKind !== undefined) {
    patch.vehicleKind =
      nextType === "vehicle"
        ? input.vehicleKind === "mobile_store"
          ? "mobile_store"
          : "commute"
        : null;
  }
  if (input.assignedLocationId !== undefined) {
    patch.assignedLocationId = nextType === "vehicle" ? null : input.assignedLocationId;
  }
  if (input.purchaseDate !== undefined) patch.purchaseDate = input.purchaseDate || null;
  if (input.warrantyExpiry !== undefined) patch.warrantyExpiry = input.warrantyExpiry || null;
  if (input.lastMaintenanceDate !== undefined) {
    patch.lastMaintenanceDate = input.lastMaintenanceDate || null;
  }
  if (input.nextMaintenanceDate !== undefined) {
    patch.nextMaintenanceDate = input.nextMaintenanceDate || null;
  }
  if (input.notes !== undefined) patch.notes = input.notes;

  // Bidirectional link: asset condition ↔ vehicle ops status
  if (nextType === "vehicle") {
    const nextStatus = (input.status ?? existing.status) as BusinessAsset["status"];
    const nextOps =
      input.opsStatus !== undefined
        ? input.opsStatus
        : (existing.opsStatus as BusinessAsset["opsStatus"]);

    if (input.status !== undefined) {
      if (nextStatus === "faulty" || nextStatus === "maintenance") {
        patch.opsStatus = "out_of_service";
      } else if (nextStatus === "decommissioned" || nextStatus === "lost" || nextStatus === "sold") {
        patch.opsStatus = "out_of_service";
      } else if (nextStatus === "functional" && existing.opsStatus === "out_of_service") {
        patch.opsStatus = "available";
      }
    } else if (input.opsStatus !== undefined && nextOps) {
      if (nextOps === "out_of_service") {
        if (nextStatus === "functional") patch.status = "maintenance";
      } else if (
        nextOps === "available" ||
        nextOps === "deployed" ||
        nextOps === "standby"
      ) {
        if (nextStatus === "faulty" || nextStatus === "maintenance") {
          patch.status = "functional";
        }
      }
    }
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(businessAssets)
      .set(patch)
      .where(and(eq(businessAssets.id, id), eq(businessAssets.tenantId, tenantId)))
      .returning();

    if (updated?.stockLocationId && nextType === "vehicle") {
      const locPatch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) locPatch.locationName = input.name.trim();
      if (input.description !== undefined) locPatch.description = input.description;
      if (input.callSign !== undefined) locPatch.callSign = input.callSign;
      if (input.registrationPlate !== undefined) locPatch.registrationPlate = input.registrationPlate;
      if (input.fleetNumber !== undefined) locPatch.fleetNumber = input.fleetNumber;
      if (updated.opsStatus != null) locPatch.fleetOpsStatus = updated.opsStatus;
      if (input.stationedAtLocationId !== undefined) {
        locPatch.stationedAtLocationId = input.stationedAtLocationId;
      }
      if (
        updated.status === "decommissioned" ||
        updated.status === "lost" ||
        updated.status === "sold"
      ) {
        locPatch.status = "inactive";
        locPatch.fleetOpsStatus = "out_of_service";
      } else if (
        updated.status === "functional" ||
        updated.status === "faulty" ||
        updated.status === "maintenance"
      ) {
        locPatch.status = "active";
      }
      await tx
        .update(careLocations)
        .set(locPatch)
        .where(
          and(
            eq(careLocations.id, updated.stockLocationId),
            eq(careLocations.tenantId, tenantId),
            eq(careLocations.locationKind, "fleet"),
          ),
        );
    }
    return updated;
  });
}

/**
 * Sync vehicle business_asset from fleet location ops (e.g. after pre-start completion).
 * Does not override sold / lost / decommissioned assets.
 */
export async function syncVehicleAssetFromFleetOps(
  tenantId: string,
  stockLocationId: string,
  opts: {
    opsStatus: "available" | "deployed" | "standby" | "out_of_service";
    hasFaultyItems?: boolean;
  },
): Promise<BusinessAsset | undefined> {
  const existing = await getBusinessAssetByStockLocation(stockLocationId, tenantId);
  if (!existing || existing.assetType !== "vehicle") return undefined;
  if (
    existing.status === "sold" ||
    existing.status === "lost" ||
    existing.status === "decommissioned"
  ) {
    // Still mirror ops on the asset row for display, without changing condition status
    const [row] = await db
      .update(businessAssets)
      .set({ opsStatus: opts.opsStatus, updatedAt: new Date() })
      .where(and(eq(businessAssets.id, existing.id), eq(businessAssets.tenantId, tenantId)))
      .returning();
    return row;
  }

  let nextStatus: BusinessAsset["status"] = existing.status;
  if (opts.opsStatus === "out_of_service") {
    nextStatus = opts.hasFaultyItems ? "faulty" : "maintenance";
  } else {
    nextStatus = "functional";
  }

  return updateBusinessAsset(existing.id, tenantId, {
    opsStatus: opts.opsStatus,
    status: nextStatus,
  });
}

/** Soft-retire: status=decommissioned; deactivate linked fleet location when present. */
export async function retireBusinessAsset(
  id: string,
  tenantId: string,
): Promise<BusinessAsset | undefined> {
  return updateBusinessAsset(id, tenantId, { status: "decommissioned" });
}

export async function getBusinessAssetByStockLocation(
  stockLocationId: string,
  tenantId: string,
): Promise<BusinessAsset | undefined> {
  const [row] = await db
    .select()
    .from(businessAssets)
    .where(
      and(
        eq(businessAssets.stockLocationId, stockLocationId),
        eq(businessAssets.tenantId, tenantId),
      ),
    )
    .orderBy(desc(businessAssets.createdAt))
    .limit(1);
  return row;
}

/**
 * Ensure a vehicle business_asset exists for a fleet care_locations row (idempotent).
 * Used when fleet units are created via legacy /api/fleet.
 */
export async function ensureVehicleAssetForFleetLocation(
  tenantId: string,
  location: {
    id: string;
    locationName: string;
    description?: string | null;
    callSign?: string | null;
    registrationPlate?: string | null;
    fleetNumber?: string | null;
    fleetOpsStatus?: string | null;
    status?: string | null;
  },
  opts?: { vehicleKind?: "commute" | "mobile_store" | null },
): Promise<BusinessAsset> {
  const existing = await getBusinessAssetByStockLocation(location.id, tenantId);
  if (existing) {
    if (opts?.vehicleKind && existing.vehicleKind !== opts.vehicleKind) {
      const updated = await updateBusinessAsset(existing.id, tenantId, {
        vehicleKind: opts.vehicleKind,
      });
      return updated ?? existing;
    }
    return existing;
  }

  try {
    return await db.transaction(async (tx) => {
      const assetTag = await nextAssetTag(tenantId, tx);
      const vehicleKind = opts?.vehicleKind === "mobile_store" ? "mobile_store" : "commute";
      const [row] = await tx
        .insert(businessAssets)
        .values({
          tenantId,
          assetTag,
          name: location.locationName.trim() || location.callSign || "Fleet vehicle",
          description: location.description ?? null,
          assetType: "vehicle",
          status: location.status === "inactive" ? "decommissioned" : "functional",
          callSign: location.callSign ?? null,
          registrationPlate: location.registrationPlate ?? null,
          fleetNumber: location.fleetNumber ?? null,
          opsStatus: (location.fleetOpsStatus as BusinessAsset["opsStatus"]) ?? "available",
          vehicleKind,
          stockLocationId: location.id,
          assignedLocationId: null,
        })
        .returning();
      return row;
    });
  } catch (err) {
    // Concurrent create: unique stock_location_id — return the winner.
    const raced = await getBusinessAssetByStockLocation(location.id, tenantId);
    if (raced) return raced;
    throw err;
  }
}
