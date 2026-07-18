import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlagView {
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
}

export default function SuperAdminFeatureFlags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading, isError, error } = useQuery<FeatureFlagView[]>({
    queryKey: ["/api/super-admin/feature-flags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/feature-flags");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/feature-flags/${key}`, { enabled });
      return res.json() as Promise<FeatureFlagView>;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      toast({
        title: `${updated.displayName} ${updated.enabled ? "enabled" : "disabled"}`,
        description: updated.enabled
          ? "The feature is now available to all organizations."
          : "The feature is now hidden and its APIs are blocked platform-wide.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to update flag", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-[900px] mx-auto px-4 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#142F5C] mb-2">Feature flags</h1>
        <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
          Platform-wide feature toggles. Disabling a feature hides it from every organization&apos;s
          navigation and blocks its API endpoints. Changes take effect within about 30 seconds.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-600 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-sm py-4">
          {error instanceof Error ? error.message : "Failed to load feature flags."}
        </p>
      )}

      <div className="space-y-4">
        {flags.map((flag) => (
          <Card key={flag.key} className="border-slate-200">
            <CardContent className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#142F5C]">{flag.displayName}</span>
                  <Badge variant={flag.enabled ? "default" : "secondary"} className="font-normal">
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{flag.description}</p>
                {flag.updatedAt && (
                  <p className="mt-1 text-xs text-slate-400">
                    Last changed {new Date(flag.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                disabled={toggleMutation.isPending}
                onCheckedChange={(checked) => toggleMutation.mutate({ key: flag.key, enabled: checked })}
                aria-label={`Toggle ${flag.displayName}`}
              />
            </CardContent>
          </Card>
        ))}
        {!isLoading && !isError && flags.length === 0 && (
          <p className="text-sm text-slate-500 py-8">No feature flags registered.</p>
        )}
      </div>
    </div>
  );
}
