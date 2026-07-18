import type { IStorage } from "../../../storage";
import type { StockRequisition, StockRequisitionItem } from "@shared/schema";

export type StockRequisitionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface CreateRequisitionInput {
  requestingLocationId: string;
  fulfillingLocationId: string;
  notes?: string;
  items: Array<{ itemId: string; requestedQuantity: number; unitOfMeasure?: string; unitCost?: string }>;
}

export interface UpdateRequisitionInput {
  status?: string;
  notes?: string;
  items?: Array<{ itemId: string; requestedQuantity: number }>;
  locationId?: string;
}

export function createStockRequisitionsController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters?: { status?: string; requestingLocationId?: string; fulfillingLocationId?: string }
    ): Promise<StockRequisitionResult<(StockRequisition & { items?: StockRequisitionItem[] })[]>> {
      try {
        const data = await storage.getStockRequisitions(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Stock requisitions controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch stock requisitions",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      input: CreateRequisitionInput
    ): Promise<StockRequisitionResult<StockRequisition & { items: StockRequisitionItem[] }>> {
      try {
        if (!input.requestingLocationId || !input.fulfillingLocationId || !input.items?.length) {
          return {
            ok: false,
            error: "requestingLocationId, fulfillingLocationId and at least one item are required",
          };
        }
        const requisition = await storage.createStockRequisition(
          {
            requestingLocationId: input.requestingLocationId,
            fulfillingLocationId: input.fulfillingLocationId,
            requestedById: userId,
            notes: input.notes,
          },
          input.items.map((item) => ({
            itemId: item.itemId,
            requestedQuantity: item.requestedQuantity,
            unitOfMeasure: item.unitOfMeasure,
            unitCost: item.unitCost,
          })),
          tenantId
        );
        return { ok: true, data: requisition };
      } catch (err) {
        console.error("Stock requisitions controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create stock requisition",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      input: UpdateRequisitionInput
    ): Promise<
      | StockRequisitionResult<StockRequisition | (StockRequisition & { items: StockRequisitionItem[] })>
      | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" }
    > {
      try {
        const existing = await storage.getStockRequisitionById(id, tenantId);
        if (!existing) return { ok: false, error: "Requisition not found", code: "NOT_FOUND" };

        const userLocationId = input.locationId;

        if (input.status === "rejected") {
          if (userLocationId && existing.fulfillingLocationId !== userLocationId) {
            return {
              ok: false,
              error: "Only the fulfilling location can reject this requisition",
              code: "FORBIDDEN",
            };
          }
          const updated = await storage.updateStockRequisition(id, { status: "rejected" }, tenantId);
          return updated ? { ok: true, data: updated } : { ok: false, error: "Requisition not found", code: "NOT_FOUND" };
        }

        if (existing.status !== "submitted") {
          return {
            ok: false,
            error: "Requisition can only be edited or rejected when status is submitted",
            code: "BAD_REQUEST",
          };
        }

        if (input.notes !== undefined || (input.items && Array.isArray(input.items))) {
          if (userLocationId && existing.requestingLocationId !== userLocationId) {
            return {
              ok: false,
              error: "Only the requesting location can edit this requisition",
              code: "FORBIDDEN",
            };
          }
          const updates: { notes?: string } = {};
          if (input.notes !== undefined) updates.notes = input.notes;
          if (Object.keys(updates).length) {
            await storage.updateStockRequisition(id, updates, tenantId);
          }
          if (input.items?.length) {
            await storage.updateStockRequisitionItems(
              id,
              tenantId,
              input.items.map((it) => ({ itemId: it.itemId, requestedQuantity: it.requestedQuantity }))
            );
          }
          const updated = await storage.getStockRequisitionById(id, tenantId);
          return updated ? { ok: true, data: updated } : { ok: false, error: "Requisition not found", code: "NOT_FOUND" };
        }

        const updated = await storage.updateStockRequisition(id, input as Record<string, unknown>, tenantId);
        if (!updated) return { ok: false, error: "Requisition not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Stock requisitions controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update stock requisition",
        };
      }
    },
  };
}

export type StockRequisitionsController = ReturnType<typeof createStockRequisitionsController>;
