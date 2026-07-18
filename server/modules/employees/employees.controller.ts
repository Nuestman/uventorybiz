import type { IStorage } from "../../storage";
import type { Employee, InsertEmployee } from "@shared/schema";

export type EmployeeResult<T> =
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
 * Employees controller: search, searchByNumber, list, create, update, bulkImport, export, getTestHistory, delete.
 * No req/res; returns result objects.
 */
export function createEmployeesController(storage: IStorage) {
  return {
    async search(tenantId: string, q: string): Promise<EmployeeResult<Employee[]>> {
      try {
        if (!q || typeof q !== "string") return { ok: true, data: [] };
        const data = await storage.searchEmployees(q, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Employees controller search:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to search employees",
        };
      }
    },

    async searchByNumber(
      employeeNumber: string,
      tenantId: string
    ): Promise<EmployeeResult<Employee> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const employee = await storage.getEmployeeByNumber(employeeNumber, tenantId);
        if (!employee) return { ok: false, error: "Employee not found", code: "NOT_FOUND" };
        return { ok: true, data: employee };
      } catch (err) {
        console.error("Employees controller searchByNumber:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch employee",
        };
      }
    },

    async list(tenantId: string): Promise<EmployeeResult<Employee[]>> {
      try {
        const data = await storage.getEmployees(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Employees controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch employees",
        };
      }
    },

    async create(
      tenantId: string,
      data: InsertEmployee & { position?: string; status?: string }
    ): Promise<EmployeeResult<Employee>> {
      try {
        const employeeData = {
          ...data,
          position: data.jobTitle ?? data.position,
          tenantId,
          status: "active",
        };
        const employee = await storage.createEmployee(employeeData as InsertEmployee, tenantId);
        return { ok: true, data: employee };
      } catch (err) {
        console.error("Employees controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create employee",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertEmployee> & Record<string, unknown>
    ): Promise<EmployeeResult<Employee> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const updateData = { ...data };
        if (updateData.dateOfBirth && typeof updateData.dateOfBirth === "string")
          updateData.dateOfBirth = new Date(updateData.dateOfBirth as string);
        if (updateData.hireDate && typeof updateData.hireDate === "string")
          updateData.hireDate = new Date(updateData.hireDate as string);
        delete (updateData as any).createdAt;
        delete (updateData as any).updatedAt;
        if (updateData.jobTitle) (updateData as any).position = updateData.jobTitle;
        const updated = await storage.updateEmployee(id, updateData as Partial<InsertEmployee>, tenantId);
        if (!updated) return { ok: false, error: "Employee not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Employees controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update employee",
        };
      }
    },

    async bulkImport(tenantId: string, csvData: string): Promise<EmployeeResult<BulkImportResult>> {
      try {
        const lines = csvData.trim().split(/\r?\n/).filter((line: string) => line.trim().length > 0);
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        const startIndex =
          lines[0]?.toLowerCase().includes("employee") || lines[0]?.toLowerCase().includes("firstname") ? 1 : 0;
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const fields = line.split(",").map((field: string) => field.trim());
          const [employeeNumber, firstName, lastName, email, department, position, companyId] = fields;
          if (!employeeNumber || !firstName || !lastName || !companyId) {
            skipped++;
            errors.push(
              `Line ${i + 1}: Missing required fields (employeeNumber, firstName, lastName, or companyId)`
            );
            continue;
          }
          try {
            const employeeData: InsertEmployee = {
              employeeNumber,
              firstName,
              lastName,
              email: email || null,
              department: (department || "warehouse") as "sales" | "warehouse" | "operations" | "maintenance" | "administration",
              jobTitle: position || "",
              position: position || "",
              companyId,
              status: "active",
              dateOfBirth: new Date("1990-01-01"),
              hireDate: new Date(),
            };
            await storage.createEmployee(employeeData, tenantId);
            imported++;
          } catch (error: unknown) {
            skipped++;
            errors.push(
              `Line ${i + 1}: ${error instanceof Error ? error.message : "Failed to create employee"}`
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
        console.error("Employees controller bulkImport:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to bulk import employees",
        };
      }
    },

    async export(tenantId: string): Promise<EmployeeResult<ExportResult>> {
      try {
        const [tenant, employees] = await Promise.all([
          storage.getTenant(tenantId),
          storage.getEmployees(tenantId),
        ]);
        const tenantName = tenant?.name || "Unknown Tenant";
        const headers = [
          "tenantName",
          "employeeNumber",
          "firstName",
          "lastName",
          "email",
          "department",
          "position",
          "companyId",
          "status",
          "phoneNumber",
          "dateOfBirth",
          "hireDate",
        ];
        const csvRows = [headers.join(",")];
        for (const emp of employees) {
          const row = [
            tenantName,
            emp.employeeNumber || "",
            emp.firstName || "",
            emp.lastName || "",
            emp.email || "",
            emp.department || "",
            emp.jobTitle || emp.position || "",
            emp.companyId || "",
            emp.status || "",
            emp.phoneNumber || "",
            emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split("T")[0] : "",
            emp.hireDate ? new Date(emp.hireDate).toISOString().split("T")[0] : "",
          ];
          csvRows.push(row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));
        }
        const csvContent = csvRows.join("\n");
        const safeTenantName = tenantName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `employees_${safeTenantName}_${new Date().toISOString().split("T")[0]}.csv`;
        return { ok: true, data: { csvContent, filename } };
      } catch (err) {
        console.error("Employees controller export:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to export employees",
        };
      }
    },

    async getTestHistory(
      employeeId: string,
      tenantId: string
    ): Promise<EmployeeResult<Awaited<ReturnType<IStorage["getEmployeeTestHistory"]>>>> {
      try {
        const data = await storage.getEmployeeTestHistory(employeeId, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Employees controller getTestHistory:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch employee test history",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<EmployeeResult<{ success: true }> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const employee = await storage.getEmployee(id, tenantId);
        if (!employee)
          return {
            ok: false,
            error: "Employee not found or does not belong to your tenant",
            code: "NOT_FOUND",
          };
        await storage.deleteEmployee(id, tenantId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Employees controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete employee",
        };
      }
    },
  };
}

export type EmployeesController = ReturnType<typeof createEmployeesController>;
