import type { IStorage } from "../../storage";
import type { Company, InsertCompany } from "@shared/schema";

export type CompanyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface BulkImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

export interface ExportResult {
  csvContent: string;
  filename: string;
}

/**
 * Companies controller: create, list, bulkImport, export, update, delete.
 * No req/res; returns result objects.
 */
export function createCompaniesController(storage: IStorage) {
  return {
    async create(tenantId: string, data: InsertCompany): Promise<CompanyResult<Company>> {
      try {
        const company = await storage.createCompany(data, tenantId);
        return { ok: true, data: company };
      } catch (err) {
        console.error("Companies controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create company",
        };
      }
    },

    async list(tenantId: string): Promise<CompanyResult<Company[]>> {
      try {
        const data = await storage.getCompanies(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Companies controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch companies",
        };
      }
    },

    async bulkImport(tenantId: string, csvData: string): Promise<CompanyResult<BulkImportResult>> {
      try {
        const lines = csvData.trim().split(/\r?\n/).filter((line: string) => line.trim().length > 0);
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        const startIndex =
          lines[0]?.toLowerCase().includes("name") || lines[0]?.toLowerCase().includes("company")
            ? 1
            : 0;
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const fields = line.split(",").map((field: string) => field.trim());
          const [name, companyType, contactEmail, contactPhone, licenseNumber, address] = fields;
          if (!name || !contactEmail) {
            skipped++;
            errors.push(`Line ${i + 1}: Missing required fields (name or contactEmail)`);
            continue;
          }
          try {
            const companyData: InsertCompany = {
              name,
              companyType: (companyType || "contractor") as "mother_company" | "contractor" | "subcontractor",
              contactEmail,
              contactPhone: contactPhone || null,
              licenseNumber: licenseNumber || null,
              address: address || null,
              status: "active",
            };
            await storage.createCompany(companyData, tenantId);
            imported++;
          } catch (error: unknown) {
            skipped++;
            errors.push(
              `Line ${i + 1}: ${error instanceof Error ? error.message : "Failed to create company"}`
            );
          }
        }
        return {
          ok: true,
          data: {
            imported,
            skipped,
            total: lines.length - startIndex,
            errors: errors.slice(0, 10),
          },
        };
      } catch (err) {
        console.error("Companies controller bulkImport:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to bulk import companies",
        };
      }
    },

    async export(tenantId: string): Promise<CompanyResult<ExportResult>> {
      try {
        const [tenant, companies] = await Promise.all([
          storage.getTenant(tenantId),
          storage.getCompanies(tenantId),
        ]);
        const tenantName = tenant?.name || "Unknown Tenant";
        const headers = [
          "tenantName",
          "name",
          "companyType",
          "contactEmail",
          "contactPhone",
          "licenseNumber",
          "address",
          "status",
          "createdAt",
        ];
        const csvRows = [headers.join(",")];
        for (const company of companies) {
          const row = [
            tenantName,
            company.name || "",
            company.companyType || "",
            company.contactEmail || "",
            company.contactPhone || "",
            company.licenseNumber || "",
            company.address || "",
            company.status || "",
            company.createdAt ? new Date(company.createdAt).toISOString().split("T")[0] : "",
          ];
          csvRows.push(row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));
        }
        const csvContent = csvRows.join("\n");
        const safeTenantName = tenantName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `companies_${safeTenantName}_${new Date().toISOString().split("T")[0]}.csv`;
        return { ok: true, data: { csvContent, filename } };
      } catch (err) {
        console.error("Companies controller export:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to export companies",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertCompany>
    ): Promise<CompanyResult<Company> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const existing = await storage.getCompany(id, tenantId);
        if (!existing)
          return {
            ok: false,
            error: "Company not found or does not belong to your tenant",
            code: "NOT_FOUND",
          };
        const updated = await storage.updateCompany(id, data, tenantId);
        if (!updated?.id)
          return { ok: false, error: "Company not found or update failed", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Companies controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update company",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<CompanyResult<{ success: true }> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const company = await storage.getCompany(id, tenantId);
        if (!company)
          return {
            ok: false,
            error: "Company not found or does not belong to your tenant",
            code: "NOT_FOUND",
          };
        await storage.deleteCompany(id, tenantId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Companies controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete company",
        };
      }
    },
  };
}

export type CompaniesController = ReturnType<typeof createCompaniesController>;
