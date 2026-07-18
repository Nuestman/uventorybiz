import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PORTAL_NOTIFICATION_PREFERENCE_KEYS,
  PORTAL_NOTIFICATION_PREFERENCE_META,
  type PortalNotificationPreferenceKey,
  type PortalNotificationPreferenceRow,
} from "@shared/portalNotificationPreferences";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PREFS_KEY = ["/api/portal/notification-preferences"] as const;

export function usePortalNotificationPreferences() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery<{ preferences: PortalNotificationPreferenceRow[] }>({
    queryKey: PREFS_KEY,
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const save = useMutation({
    mutationFn: async (preferences: PortalNotificationPreferenceRow[]) => {
      const res = await apiRequest("PUT", "/api/portal/notification-preferences", { preferences });
      return res.json() as Promise<{ preferences: PortalNotificationPreferenceRow[] }>;
    },
    onSuccess: (data) => {
      qc.setQueryData(PREFS_KEY, data);
    },
    onError: (e: Error) =>
      toast({
        title: "Could not save preferences",
        description: e.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      }),
  });

  return { ...query, save };
}

export function isPreferenceKeyEnabled(
  preferences: PortalNotificationPreferenceRow[],
  key: PortalNotificationPreferenceKey,
): boolean {
  const rows = preferences.filter((p) => p.key === key);
  if (rows.length === 0) return true;
  return rows.some((r) => r.enabled);
}

export function setPreferenceKeyEnabled(
  preferences: PortalNotificationPreferenceRow[],
  key: PortalNotificationPreferenceKey,
  enabled: boolean,
): PortalNotificationPreferenceRow[] {
  return preferences.map((p) => (p.key === key ? { ...p, enabled } : p));
}

export { PORTAL_NOTIFICATION_PREFERENCE_KEYS, PORTAL_NOTIFICATION_PREFERENCE_META };
