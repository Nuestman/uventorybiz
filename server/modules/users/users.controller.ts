import type { IStorage } from "../../storage";

export type UserResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** GET /users/:id response: user fields plus employee and company */
export type UserDetailResponse = NonNullable<Awaited<ReturnType<IStorage["getUserById"]>>> & {
  employee: Awaited<ReturnType<IStorage["getEmployee"]>> | null;
  company: Awaited<ReturnType<IStorage["getCompany"]>> | null;
};

export interface ExportUsersResult {
  csvContent: string;
  filename: string;
}

/**
 * Users controller: list, export CSV, get by id (with employee/company).
 * No req/res; returns result objects.
 */
export function createUsersController(storage: IStorage) {
  return {
    async list(tenantId: string): Promise<UserResult<Awaited<ReturnType<IStorage["getAllUsers"]>>>> {
      try {
        const data = await storage.getAllUsers(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Users controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch users",
        };
      }
    },

    async export(tenantId: string): Promise<UserResult<ExportUsersResult>> {
      try {
        const [tenant, users] = await Promise.all([
          storage.getTenant(tenantId),
          storage.getAllUsers(tenantId),
        ]);
        const tenantName = tenant?.name || "Unknown Tenant";
        const headers = ["tenantName", "email", "firstName", "lastName", "role", "status", "employeeId", "createdAt"];
        const csvRows = [headers.join(",")];
        for (const user of users) {
          const row = [
            tenantName,
            user.email || "",
            user.firstName || "",
            user.lastName || "",
            user.role || "",
            user.status || "",
            user.employeeId || "",
            user.createdAt ? new Date(user.createdAt).toISOString().split("T")[0] : "",
          ];
          csvRows.push(row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","));
        }
        const csvContent = csvRows.join("\n");
        const safeTenantName = tenantName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `users_${safeTenantName}_${new Date().toISOString().split("T")[0]}.csv`;
        return { ok: true, data: { csvContent, filename } };
      } catch (err) {
        console.error("Users controller export:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to export users",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<UserResult<UserDetailResponse> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const user = await storage.getUserById(id);
        if (!user) return { ok: false, error: "User not found", code: "NOT_FOUND" };
        if (user.tenantId !== tenantId) return { ok: false, error: "Access denied", code: "FORBIDDEN" };
        let employee: Awaited<ReturnType<IStorage["getEmployee"]>> | null = null;
        let company: Awaited<ReturnType<IStorage["getCompany"]>> | null = null;
        if (user.employeeId) {
          employee = await storage.getEmployee(user.employeeId, tenantId);
        } else if (user.email) {
          employee = await storage.getEmployeeByEmail(user.email, tenantId);
        }
        if (employee?.companyId) {
          company = await storage.getCompany(employee.companyId, tenantId);
        }
        return { ok: true, data: { ...user, employee, company } };
      } catch (err) {
        console.error("Users controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch user",
        };
      }
    },
  };
}

export type UsersController = ReturnType<typeof createUsersController>;
