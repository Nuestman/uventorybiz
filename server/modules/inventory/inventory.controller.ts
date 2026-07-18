import type { IStorage } from "../../storage";
import type { MedicalInventory } from "@shared/schema";
import { resolveInventoryCategorySlug } from "@shared/inventoryCategories";

export type InventoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

const EXPORT_HEADERS = [
  "itemCode", "itemName", "category", "brand", "supplier", "model", "description", "unitOfMeasure",
  "dosageForm", "currentStock", "minimumStock", "maximumStock", "unitCost", "expiryDate", "batchNumber",
  "lotNumber", "serialNumber", "status", "equipmentStatus", "lastMaintenanceDate", "nextMaintenanceDate", "warrantyExpiry",
] as const;

export function createInventoryController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters?: {
        category?: string;
        status?: string;
        lowStock?: boolean;
        locationId?: string;
        locationKind?: "fixed_site" | "ambulance";
      }
    ): Promise<InventoryResult<MedicalInventory[]>> {
      try {
        const data = await storage.getMedicalInventoryList(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller list:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch inventory" };
      }
    },

    async getById(id: string, tenantId: string): Promise<InventoryResult<MedicalInventory | null>> {
      try {
        const data = await storage.getMedicalInventory(id, tenantId);
        return { ok: true, data: data ?? null };
      } catch (err) {
        console.error("Inventory controller getById:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch inventory item" };
      }
    },

    async create(
      tenantId: string,
      body: Parameters<IStorage["createMedicalInventory"]>[0]
    ): Promise<InventoryResult<MedicalInventory>> {
      try {
        const data = await storage.createMedicalInventory(body, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller create:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to create inventory item" };
      }
    },

    async update(
      id: string,
      tenantId: string,
      body: Partial<Parameters<IStorage["createMedicalInventory"]>[0]>
    ): Promise<InventoryResult<MedicalInventory>> {
      try {
        const data = await storage.updateMedicalInventory(id, body, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller update:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to update inventory item" };
      }
    },

    async delete(id: string, tenantId: string): Promise<InventoryResult<{ message: string }>> {
      try {
        await storage.deleteMedicalInventory(id, tenantId);
        return { ok: true, data: { message: "Inventory item deleted successfully" } };
      } catch (err) {
        console.error("Inventory controller delete:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to delete inventory item" };
      }
    },

    async exportList(
      tenantId: string,
      filters?: { category?: string }
    ): Promise<InventoryResult<MedicalInventory[]>> {
      try {
        const data = await storage.getMedicalInventoryList(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller exportList:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to export inventory" };
      }
    },

    async exportCsv(
      tenantId: string,
      category?: string
    ): Promise<InventoryResult<{ csv: string; filename: string }>> {
      try {
        const filters = category && category !== "all" ? { category } : undefined;
        const items = await storage.getMedicalInventoryList(tenantId, filters);
        const escape = (v: unknown) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
        const rows = [EXPORT_HEADERS.join(",")];
        for (const item of items) {
          rows.push(EXPORT_HEADERS.map((h) => escape((item as Record<string, unknown>)[h])).join(","));
        }
        const csv = rows.join("\r\n");
        const filename =
          category && category !== "all"
            ? `inventory_${category}_${new Date().toISOString().split("T")[0]}.csv`
            : `inventory_all_${new Date().toISOString().split("T")[0]}.csv`;
        return { ok: true, data: { csv, filename } };
      } catch (err) {
        console.error("Inventory controller exportCsv:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to export inventory" };
      }
    },

    getExportHeaders(): typeof EXPORT_HEADERS {
      return [...EXPORT_HEADERS];
    },

    async analytics(tenantId: string) {
      try {
        const data = await storage.getInventoryAnalytics(tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory controller analytics:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch inventory analytics" };
      }
    },

    async lowStock(tenantId: string): Promise<InventoryResult<MedicalInventory[]>> {
      try {
        const data = await storage.getLowStockItems(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller lowStock:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch low stock items" };
      }
    },

    async expiring(tenantId: string, daysAhead?: number): Promise<InventoryResult<MedicalInventory[]>> {
      try {
        const data = await storage.getExpiringItems(tenantId, daysAhead ?? 30);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory controller expiring:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch expiring items" };
      }
    },

    async import(
      tenantId: string,
      rows: Record<string, unknown>[],
      locationId: string
    ): Promise<InventoryResult<{ created: string[]; total: number; errors: { row: number; error: string }[] }>> {
      // Resolve CSV labels onto tenant category slugs (defaults + custom).
      // Legacy medication/supplies map to pharmaceuticals/medical-supplies (no duplicates).
      const created: string[] = [];
      const errors: { row: number; error: string }[] = [];
      try {
        await storage.ensureDefaultInventoryCategories(tenantId);
        const tenantCats = await storage.listInventoryCategories(tenantId);
        const slugSet = new Set(tenantCats.map((c) => c.slug));
        const catBySlug = new Map(tenantCats.map((c) => [c.slug, c]));

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const itemName = (r.itemName ?? r.item_name ?? "").toString().trim();
          const categoryRaw = (r.category ?? "").toString().trim();
          if (!itemName || !categoryRaw) {
            errors.push({ row: i + 1, error: "itemName and category are required" });
            continue;
          }
          const category = resolveInventoryCategorySlug(categoryRaw);
          if (!slugSet.has(category)) {
            errors.push({
              row: i + 1,
              error: `Unknown category: ${categoryRaw} (use an active category slug for this business)`,
            });
            continue;
          }
          const itemCode = (r.itemCode ?? r.item_code ?? "").toString().trim() || undefined;
          const barcode = (r.barcode ?? "").toString().trim() || undefined;
          const payload: Record<string, unknown> = {
            itemName,
            category,
            // Leave blank so storage generates PREFIX-… matching the category
            itemCode,
            barcode,
            description: (r.description ?? "").toString().trim() || undefined,
            unitOfMeasure: (r.unitOfMeasure ?? r.unit_of_measure ?? "units").toString().trim(),
            currentStock: parseInt(String(r.currentStock ?? r.current_stock ?? "0"), 10) || 0,
            minimumStock: parseInt(String(r.minimumStock ?? r.minimum_stock ?? "0"), 10) || 0,
            maximumStock: parseInt(String(r.maximumStock ?? r.maximum_stock ?? "0"), 10) || undefined,
            reorderPoint: parseInt(String(r.reorderPoint ?? r.reorder_point ?? "0"), 10) || undefined,
            unitCost: (r.unitCost ?? r.unit_cost) != null ? parseFloat(String(r.unitCost ?? r.unit_cost)) : undefined,
            supplier: (r.supplier ?? "").toString().trim() || undefined,
            brand: (r.brand ?? "").toString().trim() || undefined,
            model: (r.model ?? "").toString().trim() || undefined,
            dosageForm: (r.dosageForm ?? r.dosage_form ?? "").toString().trim() || undefined,
            expiryDate: (r.expiryDate ?? r.expiry_date ?? "").toString().trim() || undefined,
            batchNumber: (r.batchNumber ?? r.batch_number ?? "").toString().trim() || undefined,
            lotNumber: (r.lotNumber ?? r.lot_number ?? "").toString().trim() || undefined,
            serialNumber: (r.serialNumber ?? r.serial_number ?? "").toString().trim() || undefined,
            status: (r.status ?? "active").toString().trim() || "active",
            equipmentStatus: (r.equipmentStatus ?? r.equipment_status ?? "").toString().trim() || undefined,
            lastMaintenanceDate: (r.lastMaintenanceDate ?? r.last_maintenance_date ?? "").toString().trim() || undefined,
            nextMaintenanceDate: (r.nextMaintenanceDate ?? r.next_maintenance_date ?? "").toString().trim() || undefined,
            warrantyExpiry: (r.warrantyExpiry ?? r.warranty_expiry ?? "").toString().trim() || undefined,
            locationId,
          };
          if (
            catBySlug.get(category)?.fieldTemplate === "equipment"
            && payload.supplier
            && !payload.brand
          ) {
            payload.brand = payload.supplier;
          }
          try {
            const newItem = await storage.createMedicalInventory(
              payload as Parameters<IStorage["createMedicalInventory"]>[0],
              tenantId
            );
            created.push(newItem.id);
          } catch (err: unknown) {
            errors.push({ row: i + 1, error: err instanceof Error ? err.message : "Create failed" });
          }
        }
        return { ok: true, data: { created, total: rows.length, errors } };
      } catch (err) {
        console.error("Inventory controller import:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to import inventory" };
      }
    },

    async listCatalog(
      tenantId: string,
      filters?: { category?: string; status?: string }
    ) {
      try {
        const data = await storage.listInventoryCatalog(tenantId, filters);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory controller listCatalog:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to fetch inventory catalog",
        };
      }
    },

    async getCatalogItem(id: string, tenantId: string) {
      try {
        const data = await storage.getInventoryCatalogItem(id, tenantId);
        return { ok: true as const, data: data ?? null };
      } catch (err) {
        console.error("Inventory controller getCatalogItem:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to fetch catalog item",
        };
      }
    },

    async createCatalogItem(tenantId: string, body: Parameters<IStorage["createInventoryCatalogItem"]>[0]) {
      try {
        const data = await storage.createInventoryCatalogItem(body, tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory controller createCatalogItem:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to create catalog item",
        };
      }
    },

    async updateCatalogItem(
      id: string,
      tenantId: string,
      body: Partial<Parameters<IStorage["createInventoryCatalogItem"]>[0]>
    ) {
      try {
        const data = await storage.updateInventoryCatalogItem(id, body, tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Inventory controller updateCatalogItem:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to update catalog item",
        };
      }
    },

    async deleteCatalogItem(id: string, tenantId: string) {
      try {
        await storage.deleteInventoryCatalogItem(id, tenantId);
        return { ok: true as const, data: { message: "Catalog item deleted successfully" } };
      } catch (err) {
        console.error("Inventory controller deleteCatalogItem:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to delete catalog item",
        };
      }
    },
  };
}

export type InventoryController = ReturnType<typeof createInventoryController>;
