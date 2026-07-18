import type { IStorage } from "../../storage";

export type AuditLogResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface AuditLogFilters {
  resourceType?: string;
  action?: string;
  userId?: string;
  limit?: number;
}

/**
 * Audit logs controller: list with filters. No req/res; returns result objects.
 */
export function createAuditLogsController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      filters: AuditLogFilters
    ): Promise<AuditLogResult<Awaited<ReturnType<IStorage["getAuditLogs"]>>>> {
      try {
        const limit = filters.limit ?? 100;
        const data = await storage.getAuditLogs(tenantId, {
          resourceType: filters.resourceType,
          action: filters.action,
          userId: filters.userId,
          limit,
        });
        return { ok: true, data };
      } catch (err) {
        console.error("Audit logs controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch audit logs",
        };
      }
    },
  };
}

export type AuditLogsController = ReturnType<typeof createAuditLogsController>;
