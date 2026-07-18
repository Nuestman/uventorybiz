import type { IStorage } from "../../../storage";
import type { StockTransfer, StockTransferItem } from "@shared/schema";

export type StockTransferResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface CreateTransferInput {
  fromLocationId: string;
  toLocationId: string;
  type?: string;
  requisitionId?: string;
  notes?: string;
  items: Array<{
    itemId: string;
    quantityPlanned: number;
    unitOfMeasure?: string;
    unitCost?: string;
    batchNumber?: string;
    expiryDate?: string;
  }>;
}

/**
 * Stock transfers controller: list, create, createFromRequisition, dispatch, receive.
 * No req/res; returns result objects.
 */
export function createStockTransfersController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters?: { status?: string; fromLocationId?: string; toLocationId?: string; requisitionId?: string }
    ): Promise<StockTransferResult<(StockTransfer & { items?: StockTransferItem[] })[]>> {
      try {
        const data = await storage.getStockTransfers(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Stock transfers controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch stock transfers",
        };
      }
    },

    async create(
      tenantId: string,
      input: CreateTransferInput
    ): Promise<StockTransferResult<StockTransfer & { items: StockTransferItem[] }>> {
      try {
        if (!input.fromLocationId || !input.toLocationId || !input.items?.length) {
          return {
            ok: false,
            error: "fromLocationId, toLocationId and at least one item are required",
          };
        }
        const transfer = await storage.createStockTransfer(
          {
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            type: input.type || "normal",
            requisitionId: input.requisitionId,
            notes: input.notes,
          },
          input.items.map((item) => ({
            itemId: item.itemId,
            quantityPlanned: item.quantityPlanned,
            unitOfMeasure: item.unitOfMeasure,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
          })),
          tenantId
        );
        return { ok: true, data: transfer };
      } catch (err) {
        console.error("Stock transfers controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create stock transfer",
        };
      }
    },

    async createFromRequisition(
      requisitionId: string,
      userId: string,
      tenantId: string,
      items?: Array<{ itemId: string; approvedQuantity: number }>
    ): Promise<StockTransferResult<StockTransfer & { items: StockTransferItem[] }>> {
      try {
        const transfer = await storage.createStockTransferFromRequisition(
          requisitionId,
          userId,
          tenantId,
          items
        );
        return { ok: true, data: transfer };
      } catch (err) {
        console.error("Stock transfers controller createFromRequisition:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create transfer from requisition",
        };
      }
    },

    async dispatch(
      id: string,
      userId: string,
      tenantId: string
    ): Promise<StockTransferResult<StockTransfer> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const updated = await storage.dispatchStockTransfer(id, userId, tenantId);
        if (!updated) return { ok: false, error: "Transfer not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Stock transfers controller dispatch:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to dispatch stock transfer",
        };
      }
    },

    async receive(
      id: string,
      userId: string,
      tenantId: string
    ): Promise<StockTransferResult<StockTransfer> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const updated = await storage.receiveStockTransfer(id, userId, tenantId);
        if (!updated) return { ok: false, error: "Transfer not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Stock transfers controller receive:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to receive stock transfer",
        };
      }
    },
  };
}

export type StockTransfersController = ReturnType<typeof createStockTransfersController>;
