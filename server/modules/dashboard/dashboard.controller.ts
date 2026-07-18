import type { IStorage } from "../../storage";

export type DashboardResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Dashboard controller: returns metrics for the route to send as JSON.
 * No req/res; takes tenantId and returns result object.
 */
export function createDashboardController(storage: IStorage) {
  return {
    async getMetrics(tenantId: string): Promise<DashboardResult<Awaited<ReturnType<IStorage["getDashboardMetrics"]>>>> {
      try {
        const data = await storage.getDashboardMetrics(tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Dashboard controller getMetrics:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch dashboard metrics",
        };
      }
    },
  };
}

export type DashboardController = ReturnType<typeof createDashboardController>;
