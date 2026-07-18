import type { IStorage } from "../../../storage";
import type { InsertDutyAssignment, DutyAssignment, InsertDutyCompletion, DutyCompletion } from "@shared/schema";

export type DutyAssignmentHistoryFilters = {
  date?: string;
  status?: string;
  userId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

export type PaginatedDutyAssignmentHistory = {
  rows: any[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type DutyAssignmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Duty assignments controller: CRUD, today, history, analytics, complete, cancel, status; duty-completions.
 * No req/res; returns result objects.
 */
export function createDutyAssignmentsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      data: InsertDutyAssignment
    ): Promise<DutyAssignmentResult<DutyAssignment>> {
      try {
        const assignment = await storage.createDutyAssignment(data, tenantId, userId);
        return { ok: true, data: assignment };
      } catch (err) {
        console.error("Duty assignments controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create duty assignment",
        };
      }
    },

    async list(tenantId: string, date?: Date, locationId?: string, status?: string, userId?: string): Promise<DutyAssignmentResult<DutyAssignment[]>> {
      try {
        const data = await storage.getDutyAssignments(tenantId, date, locationId, status, userId);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch duty assignments",
        };
      }
    },

    async listByDateRange(
      tenantId: string,
      fromDate: Date,
      toDate: Date,
      locationId?: string,
      status?: string,
      userId?: string
    ): Promise<DutyAssignmentResult<DutyAssignment[]>> {
      try {
        const data = await storage.getDutyAssignmentsByDateRange(tenantId, fromDate, toDate, locationId, status, userId);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller listByDateRange:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch duty assignments",
        };
      }
    },

    async getToday(tenantId: string, locationId?: string, status?: string, userId?: string): Promise<DutyAssignmentResult<DutyAssignment[]>> {
      try {
        const data = await storage.getTodayDutyAssignments(tenantId, locationId, status, userId);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller getToday:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch today's duty assignments",
        };
      }
    },

    async getHistory(
      tenantId: string,
      filters: DutyAssignmentHistoryFilters = {},
    ): Promise<DutyAssignmentResult<any[] | PaginatedDutyAssignmentHistory>> {
      try {
        const hasPagination = filters.page !== undefined;
        const page = Math.max(1, filters.page ?? 1);
        const pageSize = filters.pageSize ?? (hasPagination ? 25 : undefined);
        const { rows, totalCount } = await storage.getDutyAssignmentHistory(tenantId, {
          ...filters,
          page: hasPagination ? page : undefined,
          pageSize: hasPagination ? pageSize : undefined,
        });
        if (hasPagination) {
          return { ok: true, data: { rows, page, pageSize: pageSize ?? 25, totalCount } };
        }
        return { ok: true, data: rows };
      } catch (err) {
        console.error("Duty assignments controller getHistory:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch assignment history",
        };
      }
    },

    async getAnalytics(
      tenantId: string,
      filters: { date?: string; locationId?: string }
    ): Promise<DutyAssignmentResult<any>> {
      try {
        const data = await storage.getDutyAssignmentAnalytics(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller getAnalytics:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch assignment analytics",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      _userId: string | undefined,
      data: Partial<InsertDutyAssignment> & Record<string, unknown>
    ): Promise<DutyAssignmentResult<DutyAssignment>> {
      try {
        const assignment = await storage.updateDutyAssignment(id, data, tenantId);
        return { ok: true, data: assignment };
      } catch (err) {
        console.error("Duty assignments controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update duty assignment",
        };
      }
    },

    async complete(
      id: string,
      userId: string,
      tenantId: string,
      options: { notes?: string; startedAt?: Date | null; locationId?: string }
    ): Promise<DutyAssignmentResult<DutyAssignment>> {
      try {
        const assignment = await storage.completeDutyAssignment(
          id,
          userId,
          tenantId,
          options.notes,
          options.startedAt ?? undefined,
          options.locationId
        );
        return { ok: true, data: assignment };
      } catch (err) {
        console.error("Duty assignments controller complete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to complete duty assignment",
        };
      }
    },

    async cancel(
      id: string,
      userId: string,
      tenantId: string,
      cancellationReason?: string
    ): Promise<DutyAssignmentResult<DutyAssignment>> {
      try {
        const assignment = await storage.cancelDutyAssignment(id, userId, tenantId, cancellationReason);
        return { ok: true, data: assignment };
      } catch (err) {
        console.error("Duty assignments controller cancel:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to cancel duty assignment",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<DutyAssignmentResult<{ success: true }>> {
      try {
        await storage.deleteDutyAssignment(id, tenantId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Duty assignments controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete duty assignment",
        };
      }
    },

    async createCompletion(
      tenantId: string,
      data: InsertDutyCompletion
    ): Promise<DutyAssignmentResult<DutyCompletion>> {
      try {
        const completion = await storage.createDutyCompletion(data, tenantId);
        return { ok: true, data: completion };
      } catch (err) {
        console.error("Duty assignments controller createCompletion:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create duty completion",
        };
      }
    },

    async listCompletions(
      tenantId: string,
      date?: Date
    ): Promise<DutyAssignmentResult<DutyCompletion[]>> {
      try {
        const data = await storage.getDutyCompletions(tenantId, date);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller listCompletions:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch duty completions",
        };
      }
    },

    async getCompletionsByAssignment(
      assignmentId: string,
      tenantId: string
    ): Promise<DutyAssignmentResult<DutyCompletion[]>> {
      try {
        const data = await storage.getDutyCompletionsByAssignment(assignmentId, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Duty assignments controller getCompletionsByAssignment:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch assignment completions",
        };
      }
    },
  };
}

export type DutyAssignmentsController = ReturnType<typeof createDutyAssignmentsController>;
