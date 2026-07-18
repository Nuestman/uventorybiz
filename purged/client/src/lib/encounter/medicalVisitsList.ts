export type PaginatedMedicalVisits = {
  rows: any[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function isPaginatedMedicalVisits(data: unknown): data is PaginatedMedicalVisits {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as PaginatedMedicalVisits).rows) &&
    typeof (data as PaginatedMedicalVisits).totalCount === "number"
  );
}

/** Normalise list API response — paginated object or legacy array. */
export function parseMedicalVisitsListResponse(data: unknown): PaginatedMedicalVisits {
  if (isPaginatedMedicalVisits(data)) {
    return data;
  }
  const rows = Array.isArray(data) ? data : [];
  return { rows, page: 1, pageSize: rows.length, totalCount: rows.length };
}

export function buildMedicalVisitsQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
