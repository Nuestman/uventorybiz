import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PortalNotificationDto } from "@shared/messaging";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

const LIST_KEY = ["/api/portal/notifications"] as const;
const UNREAD_KEY = ["/api/portal/notifications/unread-count"] as const;

export function usePortalNotifications(enabled = true) {
  return useQuery<PortalNotificationDto[]>({
    queryKey: LIST_KEY,
    queryFn: getQueryFn<PortalNotificationDto[]>({ on401: "throw" }),
    enabled,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });
}

/** Unread order-update notifications — drives the "My orders" sidebar badge. */
export function useUnreadOrderUpdatesCount(enabled = true): number {
  const { data } = usePortalNotifications(enabled);
  return (data ?? []).filter((n) => n.type === "order_update" && !n.readAt).length;
}

export function usePortalNotificationsUnreadCount(enabled = true) {
  return useQuery<{ count: number }>({
    queryKey: UNREAD_KEY,
    queryFn: getQueryFn<{ count: number }>({ on401: "throw" }),
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkPortalNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("POST", `/api/portal/notifications/${notificationId}/read`);
      return (await res.json()) as PortalNotificationDto;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useMarkAllPortalNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/notifications/read-all");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}
