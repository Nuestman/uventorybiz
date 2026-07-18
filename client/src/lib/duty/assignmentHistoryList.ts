export type PaginatedAssignmentHistory = {
  rows: any[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function isPaginatedAssignmentHistory(data: unknown): data is PaginatedAssignmentHistory {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as PaginatedAssignmentHistory).rows) &&
    typeof (data as PaginatedAssignmentHistory).totalCount === "number"
  );
}

export function parseAssignmentHistoryResponse(data: unknown): PaginatedAssignmentHistory {
  if (isPaginatedAssignmentHistory(data)) {
    return data;
  }
  const rows = Array.isArray(data) ? data : [];
  return { rows, page: 1, pageSize: rows.length, totalCount: rows.length };
}

export function buildAssignmentHistoryQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
