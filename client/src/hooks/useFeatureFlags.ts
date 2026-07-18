import { useQuery } from "@tanstack/react-query";

export type FeatureFlagMap = Record<string, boolean>;

/**
 * Platform feature flags (super-admin managed). Public endpoint — safe to call
 * before login, from both the staff app and the portal.
 */
export function useFeatureFlags() {
  const { data, isLoading } = useQuery<FeatureFlagMap>({
    queryKey: ["/api/feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load feature flags");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return { flags: data ?? {}, isLoading };
}

/**
 * Whether a single platform feature is enabled.
 * Returns false while flags are loading so disabled features never flash on.
 */
export function useFeatureEnabled(key: string): boolean {
  const { flags, isLoading } = useFeatureFlags();
  if (isLoading) return false;
  return flags[key] ?? true;
}
