import type { IStorage } from "../../../storage";

export type InventoryTransactionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface CreateTransactionInput {
  itemId: string;
  transactionType: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  reason?: string;
  notes?: string;
  locationId?: string;
  counterpartyLocationId?: string;
  patientId?: string;
  documentType?: string;
  documentId?: string;
}

export function createInventoryTransactionsController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters?: { itemId?: string; documentType?: string; documentId?: string }
    ): Promise<InventoryTransactionResult<Awaited<ReturnType<IStorage["getInventoryTransactions"]>>>> {
      try {
        const data = await storage.getInventoryTransactions(
          tenantId,
          filters?.itemId,
          filters?.documentType,
          filters?.documentId
        );
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory transactions controller list:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch inventory transactions" };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      input: CreateTransactionInput
    ): Promise<InventoryTransactionResult<Awaited<ReturnType<IStorage["createInventoryTransaction"]>>>> {
      try {
        if (!input.itemId || !input.transactionType || input.quantity === undefined) {
          return { ok: false, error: "itemId, transactionType, and quantity are required" };
        }
        let resolvedPatientId = input.patientId ? String(input.patientId).trim() || undefined : undefined;
        let resolvedDocumentType = input.documentType ? String(input.documentType).trim() || undefined : undefined;
        let resolvedDocumentId = input.documentId ? String(input.documentId).trim() || undefined : undefined;
        let resolvedLocationId = input.locationId ? String(input.locationId).trim() || undefined : undefined;

        if (input.transactionType === "issue_to_client") {
          if (resolvedDocumentType === "incident" && resolvedDocumentId) {
            const incident = await storage.getIncidentReport(resolvedDocumentId, tenantId);
            if (!incident) return { ok: false, error: "Incident report not found or access denied", code: "NOT_FOUND" };
            const incidentPatient = incident.employeeId
              ? await storage.getPatientByEmployeeId(incident.employeeId, tenantId)
              : undefined;
            const incidentPatientId = incidentPatient?.id;
            if (resolvedPatientId && incidentPatientId && incidentPatientId !== resolvedPatientId) {
              return { ok: false, error: "Patient does not match the incident report" };
            }
            resolvedPatientId = incidentPatientId;
            resolvedDocumentType = "incident";
            resolvedDocumentId = incident.id;
            resolvedLocationId = resolvedLocationId || incident.locationId || undefined;
          }
          if (!resolvedPatientId) {
            return { ok: false, error: "patientId is required for issue_to_client transactions" };
          }
        }

        const transaction = await storage.createInventoryTransaction(
          {
            itemId: input.itemId,
            transactionType: input.transactionType as Parameters<IStorage["createInventoryTransaction"]>[0]["transactionType"],
            quantity: input.quantity,
            unitCost: input.unitCost != null ? input.unitCost.toString() : undefined,
            totalCost: input.unitCost != null ? (input.quantity * input.unitCost).toFixed(2) : undefined,
            reference: input.reference || undefined,
            reason: input.reason || undefined,
            notes: input.notes || undefined,
            locationId: resolvedLocationId || input.locationId || undefined,
            counterpartyLocationId: input.counterpartyLocationId || undefined,
            patientId: resolvedPatientId ?? input.patientId ?? undefined,
            documentType: resolvedDocumentType ?? input.documentType ?? undefined,
            documentId: resolvedDocumentId ?? input.documentId ?? undefined,
            createdBy: userId,
          },
          tenantId
        );
        return { ok: true, data: transaction };
      } catch (err) {
        console.error("Inventory transactions controller create:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to create inventory transaction" };
      }
    },

    async update(
      id: string,
      tenantId: string,
      updates: Record<string, unknown>
    ): Promise<InventoryTransactionResult<Awaited<ReturnType<IStorage["updateInventoryTransaction"]>>>> {
      try {
        // unit_cost/total_cost are varchar columns; clients send numbers
        const normalized = { ...updates };
        if (typeof normalized.unitCost === "number") normalized.unitCost = String(normalized.unitCost);
        if (typeof normalized.totalCost === "number") normalized.totalCost = String(normalized.totalCost);
        const data = await storage.updateInventoryTransaction(id, normalized as any, tenantId);
        return { ok: true, data: data! };
      } catch (err) {
        console.error("Inventory transactions controller update:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to update inventory transaction" };
      }
    },

    async delete(id: string, tenantId: string): Promise<InventoryTransactionResult<{ success: true }>> {
      try {
        await storage.deleteInventoryTransaction(id, tenantId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Inventory transactions controller delete:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to delete inventory transaction" };
      }
    },
  };
}

export type InventoryTransactionsController = ReturnType<typeof createInventoryTransactionsController>;
