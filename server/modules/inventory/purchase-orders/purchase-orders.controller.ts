import type { IStorage } from "../../../storage";
import type { PurchaseOrder, PurchaseOrderItem, InsertPurchaseOrder, InsertPurchaseOrderItem } from "@shared/schema";

export type PurchaseOrderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Create PO request shape (from route body) */
export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDelivery?: string;
  notes?: string;
  items: Array<{ itemId: string; quantityOrdered: number; unitCost: number }>;
}

/** Receive PO input */
export interface ReceivePurchaseOrderInput {
  items: Array<{ itemId: string; quantityReceived: number }>;
  locationId?: string;
}

/** Reverse previously received quantities */
export interface ReversePurchaseOrderReceiveInput {
  locationId: string;
  items: Array<{ itemId: string; quantityReversed: number }>;
  notes?: string;
}

/**
 * Purchase orders controller: create (with items), list, getById, getItems, receive, update, delete;
 * purchase-order-items: create, update, delete.
 * No req/res; returns result objects.
 */
export function createPurchaseOrdersController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      input: CreatePurchaseOrderInput
    ): Promise<PurchaseOrderResult<PurchaseOrder>> {
      try {
        if (!input.supplierId || !input.items?.length) {
          return { ok: false, error: "supplierId and items are required" };
        }
        const poNumber = `PO-${Date.now()}`;
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.quantityOrdered * item.unitCost,
          0
        );
        const poData: InsertPurchaseOrder = {
          poNumber,
          supplierId: input.supplierId,
          totalAmount: totalAmount.toFixed(2),
          orderDate: new Date(),
          expectedDelivery: input.expectedDelivery ? new Date(input.expectedDelivery) : undefined,
          notes: input.notes,
          createdBy: userId,
        };
        const purchaseOrder = await storage.createPurchaseOrder(poData, tenantId);
        for (const item of input.items) {
          await storage.createPurchaseOrderItem(
            {
              poId: purchaseOrder.id,
              itemId: item.itemId,
              quantityOrdered: item.quantityOrdered,
              quantityReceived: 0,
              unitCost: item.unitCost.toString(),
              totalCost: (item.quantityOrdered * item.unitCost).toFixed(2),
            },
            tenantId
          );
        }
        return { ok: true, data: purchaseOrder };
      } catch (err) {
        console.error("Purchase orders controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create purchase order",
        };
      }
    },

    async list(
      tenantId: string,
      filters?: { status?: string; supplierId?: string }
    ): Promise<PurchaseOrderResult<(PurchaseOrder & { supplierName?: string })[]>> {
      try {
        const data = await storage.getPurchaseOrders(tenantId, filters);
        return { ok: true, data: data.map((po) => ({ ...po, supplier: (po as any).supplierName ?? "" })) };
      } catch (err) {
        console.error("Purchase orders controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch purchase orders",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<
      PurchaseOrderResult<PurchaseOrder & { supplier?: string }> | { ok: false; error: string; code: "NOT_FOUND" }
    > {
      try {
        const po = await storage.getPurchaseOrder(id, tenantId);
        if (!po) return { ok: false, error: "Purchase order not found", code: "NOT_FOUND" };
        return { ok: true, data: { ...po, supplier: (po as any).supplierName ?? "" } };
      } catch (err) {
        console.error("Purchase orders controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch purchase order",
        };
      }
    },

    async getItems(
      poId: string,
      tenantId: string
    ): Promise<PurchaseOrderResult<PurchaseOrderItem[]>> {
      try {
        const data = await storage.getPurchaseOrderItems(poId, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Purchase orders controller getItems:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch purchase order items",
        };
      }
    },

    async receive(
      id: string,
      userId: string,
      tenantId: string,
      input: ReceivePurchaseOrderInput
    ): Promise<PurchaseOrderResult<PurchaseOrder> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        if (!input.items?.length) return { ok: false, error: "items array is required" };
        const updated = await storage.receivePurchaseOrder(id, userId, tenantId, {
          items: input.items,
          locationId: input.locationId,
        });
        if (!updated) return { ok: false, error: "Purchase order not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Purchase orders controller receive:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to receive purchase order",
        };
      }
    },

    async reverseReceive(
      id: string,
      userId: string,
      tenantId: string,
      input: ReversePurchaseOrderReceiveInput
    ): Promise<PurchaseOrderResult<PurchaseOrder> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        if (!input.locationId) return { ok: false, error: "locationId is required" };
        if (!input.items?.length) return { ok: false, error: "items array is required" };
        const updated = await storage.reversePurchaseOrderReceive(id, userId, tenantId, {
          locationId: input.locationId,
          items: input.items,
          notes: input.notes,
        });
        if (!updated) return { ok: false, error: "Purchase order not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Purchase orders controller reverseReceive:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to reverse purchase order receipt",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertPurchaseOrder>
    ): Promise<PurchaseOrderResult<PurchaseOrder>> {
      try {
        const po = await storage.updatePurchaseOrder(id, data, tenantId);
        return { ok: true, data: po };
      } catch (err) {
        console.error("Purchase orders controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update purchase order",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<PurchaseOrderResult<{ message: string }>> {
      try {
        await storage.deletePurchaseOrder(id, tenantId);
        return { ok: true, data: { message: "Purchase order deleted successfully" } };
      } catch (err) {
        console.error("Purchase orders controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete purchase order",
        };
      }
    },

    async createItem(
      tenantId: string,
      data: InsertPurchaseOrderItem
    ): Promise<PurchaseOrderResult<PurchaseOrderItem>> {
      try {
        const item = await storage.createPurchaseOrderItem(data, tenantId);
        return { ok: true, data: item };
      } catch (err) {
        console.error("Purchase orders controller createItem:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create purchase order item",
        };
      }
    },

    async updateItem(
      id: string,
      tenantId: string,
      data: Partial<InsertPurchaseOrderItem>
    ): Promise<PurchaseOrderResult<PurchaseOrderItem>> {
      try {
        const item = await storage.updatePurchaseOrderItem(id, data, tenantId);
        return { ok: true, data: item };
      } catch (err) {
        console.error("Purchase orders controller updateItem:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update purchase order item",
        };
      }
    },

    async deleteItem(
      id: string,
      tenantId: string
    ): Promise<PurchaseOrderResult<{ message: string }>> {
      try {
        await storage.deletePurchaseOrderItem(id, tenantId);
        return { ok: true, data: { message: "Purchase order item deleted successfully" } };
      } catch (err) {
        console.error("Purchase orders controller deleteItem:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete purchase order item",
        };
      }
    },
  };
}

export type PurchaseOrdersController = ReturnType<typeof createPurchaseOrdersController>;
