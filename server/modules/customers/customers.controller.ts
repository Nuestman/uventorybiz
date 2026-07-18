import type { IStorage } from "../../storage";
import type { InsertCustomer, Customer } from "@shared/schema";
import { parseCsvTable, type BulkImportResult } from "../../shared/csvParse";

export type CustomerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

const CUSTOMER_CSV_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "status",
  "notes",
] as const;

/**
 * Customers controller: list, create, getById, update, delete, bulkImport.
 */
export function createCustomersController(storage: IStorage) {
  return {
    async list(tenantId: string, search?: string): Promise<CustomerResult<Customer[]>> {
      try {
        const data = await storage.getCustomers(tenantId, search);
        return { ok: true, data };
      } catch (err) {
        console.error("Customers controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch customers",
        };
      }
    },

    async create(tenantId: string, data: InsertCustomer): Promise<CustomerResult<Customer>> {
      try {
        const created = await storage.createCustomer(data, tenantId);
        return { ok: true, data: created };
      } catch (err) {
        console.error("Customers controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create customer",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<CustomerResult<Customer> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const customer = await storage.getCustomer(id, tenantId);
        if (!customer) return { ok: false, error: "Customer not found", code: "NOT_FOUND" };
        return { ok: true, data: customer };
      } catch (err) {
        console.error("Customers controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch customer",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertCustomer>
    ): Promise<CustomerResult<Customer>> {
      try {
        const updated = await storage.updateCustomer(id, data, tenantId);
        if (!updated) return { ok: false, error: "Customer not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Customers controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update customer",
        };
      }
    },

    async delete(id: string, tenantId: string): Promise<CustomerResult<Record<string, never>>> {
      try {
        await storage.deleteCustomer(id, tenantId);
        return { ok: true, data: {} };
      } catch (err) {
        console.error("Customers controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete customer",
        };
      }
    },

    async bulkImport(tenantId: string, csvData: string): Promise<CustomerResult<BulkImportResult>> {
      try {
        const { rows } = parseCsvTable(csvData, [...CUSTOMER_CSV_HEADERS]);
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const firstName = row.firstName?.trim() ?? "";
          const lastName = row.lastName?.trim() ?? "";
          if (!firstName || !lastName) {
            skipped++;
            errors.push(`Row ${i + 1}: firstName and lastName are required`);
            continue;
          }
          const statusRaw = (row.status?.trim() || "active").toLowerCase();
          const status = statusRaw === "inactive" ? "inactive" : "active";
          try {
            await storage.createCustomer(
              {
                firstName,
                lastName,
                email: row.email?.trim() || null,
                phone: row.phone?.trim() || null,
                status,
                notes: row.notes?.trim() || null,
              },
              tenantId,
            );
            imported++;
          } catch (error: unknown) {
            skipped++;
            errors.push(
              `Row ${i + 1}: ${error instanceof Error ? error.message : "Failed to create customer"}`,
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
        console.error("Customers controller bulkImport:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to bulk import customers",
        };
      }
    },
  };
}

export type CustomersController = ReturnType<typeof createCustomersController>;
