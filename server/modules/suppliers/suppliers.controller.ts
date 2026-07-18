import type { IStorage } from "../../storage";
import type { InsertSupplier, Supplier } from "@shared/schema";
import { parseCsvTable, type BulkImportResult } from "../../shared/csvParse";

export type SupplierResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

const SUPPLIER_CSV_HEADERS = [
  "name",
  "contactName",
  "email",
  "phone",
  "address",
  "notes",
] as const;

/**
 * Suppliers controller: list, create, getById, update, delete, bulkImport.
 */
export function createSuppliersController(storage: IStorage) {
  return {
    async list(tenantId: string): Promise<SupplierResult<Supplier[]>> {
      try {
        const data = await storage.getSuppliers(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Suppliers controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch suppliers",
        };
      }
    },

    async create(tenantId: string, data: InsertSupplier): Promise<SupplierResult<Supplier>> {
      try {
        const created = await storage.createSupplier(data, tenantId);
        return { ok: true, data: created };
      } catch (err) {
        console.error("Suppliers controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create supplier",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<SupplierResult<Supplier> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const supplier = await storage.getSupplier(id, tenantId);
        if (!supplier) return { ok: false, error: "Supplier not found", code: "NOT_FOUND" };
        return { ok: true, data: supplier };
      } catch (err) {
        console.error("Suppliers controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch supplier",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertSupplier>
    ): Promise<SupplierResult<Supplier>> {
      try {
        const updated = await storage.updateSupplier(id, data, tenantId);
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Suppliers controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update supplier",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<SupplierResult<Record<string, never>>> {
      try {
        await storage.deleteSupplier(id, tenantId);
        return { ok: true, data: {} };
      } catch (err) {
        console.error("Suppliers controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete supplier",
        };
      }
    },

    async bulkImport(tenantId: string, csvData: string): Promise<SupplierResult<BulkImportResult>> {
      try {
        const { rows } = parseCsvTable(csvData, [...SUPPLIER_CSV_HEADERS]);
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const name = row.name?.trim() ?? "";
          if (!name) {
            skipped++;
            errors.push(`Row ${i + 1}: name is required`);
            continue;
          }
          try {
            await storage.createSupplier(
              {
                name,
                contactName: row.contactName?.trim() || null,
                email: row.email?.trim() || null,
                phone: row.phone?.trim() || null,
                address: row.address?.trim() || null,
                notes: row.notes?.trim() || null,
              },
              tenantId,
            );
            imported++;
          } catch (error: unknown) {
            skipped++;
            errors.push(
              `Row ${i + 1}: ${error instanceof Error ? error.message : "Failed to create supplier"}`,
            );
          }
        }

        return {
          ok: true,
          data: {
            imported,
            skipped,
            total: rows.length,
            errors: errors.slice(0, 15),
          },
        };
      } catch (err) {
        console.error("Suppliers controller bulkImport:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to bulk import suppliers",
        };
      }
    },
  };
}

export type SuppliersController = ReturnType<typeof createSuppliersController>;
