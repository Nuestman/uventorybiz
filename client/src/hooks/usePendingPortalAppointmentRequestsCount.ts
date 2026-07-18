import { useQuery } from "@tanstack/react-query";

/**
 * Count of patient portal appointment requests awaiting staff review.
 * Shares query key with PortalAppointmentRequestsPanel for cache invalidation.
 */
const PENDING_PORTAL_REQUESTS_COUNT_KEY = [
  "/api/portal-appointment-requests",
  "pending-count",
] as const;

export function usePendingPortalAppointmentRequestsCount(enabled = true) {
  return useQuery({
    queryKey: PENDING_PORTAL_REQUESTS_COUNT_KEY,
    queryFn: async () => {
      const res = await fetch("/api/portal-appointment-requests?status=pending", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load portal appointment requests");
      const data = (await res.json()) as unknown[];
      return Array.isArray(data) ? data.length : 0;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
