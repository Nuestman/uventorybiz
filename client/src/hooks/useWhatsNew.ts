import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CuratedReleaseNote } from "@shared/curatedReleaseNotes";
import { apiRequest } from "@/lib/queryClient";

export type ReleaseNotesStatus = {
  currentVersion: string;
  lastAcknowledgedVersion: string | null;
  pending: CuratedReleaseNote[];
};

type Audience = "staff" | "portal";

function paths(audience: Audience) {
  if (audience === "staff") {
    return {
      status: "/api/release-notes/status",
      acknowledge: "/api/release-notes/acknowledge",
    };
  }
  return {
    status: "/api/portal/release-notes/status",
    acknowledge: "/api/portal/release-notes/acknowledge",
  };
}

export function useWhatsNew(audience: Audience, enabled: boolean) {
  const queryClient = useQueryClient();
  const { status: statusPath, acknowledge: acknowledgePath } = paths(audience);

  const query = useQuery({
    queryKey: [statusPath],
    enabled,
    queryFn: async () => {
      const res = await fetch(statusPath, { credentials: "include" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return (await res.json()) as ReleaseNotesStatus;
    },
    staleTime: 60_000,
  });

  const acknowledge = useMutation({
    mutationFn: async (version: string) => {
      await apiRequest("POST", acknowledgePath, { version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [statusPath] });
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    pending: query.data?.pending ?? [],
    currentVersion: query.data?.currentVersion,
    acknowledge,
  };
}
