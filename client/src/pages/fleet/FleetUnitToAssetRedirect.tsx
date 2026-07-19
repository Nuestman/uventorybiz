import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

/**
 * Resolves a legacy fleet unit (care_locations id) to its business asset and redirects.
 */
export default function FleetUnitToAssetRedirect() {
  const [, params] = useRoute("/fleet/units/:id");
  const [, setLocation] = useLocation();
  const locationId = params?.id ?? "";

  const { data, isError } = useQuery({
    queryKey: ["/api/business-assets", { stockLocationId: locationId }],
    queryFn: async () => {
      const qs = new URLSearchParams({
        stockLocationId: locationId,
        includeRetired: "1",
      });
      const res = await fetch(`/api/business-assets?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to resolve asset");
      return res.json() as Promise<Array<{ id: string }>>;
    },
    enabled: Boolean(locationId),
  });

  useEffect(() => {
    if (!locationId) {
      setLocation("/assets?type=vehicle");
      return;
    }
    if (isError) {
      setLocation("/assets?type=vehicle");
      return;
    }
    if (!data) return;
    const assetId = data[0]?.id;
    if (assetId) {
      setLocation(`/assets?type=vehicle&edit=${encodeURIComponent(assetId)}`);
    } else {
      setLocation("/assets?type=vehicle");
    }
  }, [locationId, data, isError, setLocation]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      Opening asset…
    </div>
  );
}
