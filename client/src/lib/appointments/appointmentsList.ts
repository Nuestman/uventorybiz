export type PaginatedAppointments = {
  rows: unknown[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function isPaginatedAppointments(data: unknown): data is PaginatedAppointments {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as PaginatedAppointments).rows) &&
    typeof (data as PaginatedAppointments).totalCount === "number"
  );
}

/** Normalise list API response — paginated object or legacy array. */
export function parseAppointmentsListResponse(data: unknown): PaginatedAppointments {
  if (isPaginatedAppointments(data)) {
    return data;
  }
  const rows = Array.isArray(data) ? data : [];
  return { rows, page: 1, pageSize: rows.length, totalCount: rows.length };
}

export function buildAppointmentsQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
