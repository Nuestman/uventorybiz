import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AssetOption = {
  id: string;
  assetTag: string;
  name: string;
  assetType: string;
  status: string;
};

type AssetTagSelectProps = {
  value: string | null | undefined;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  id?: string;
};

const NONE = "__none__";

export function AssetTagSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select asset…",
  allowClear = true,
  id,
}: AssetTagSelectProps) {
  const { data: options = [], isLoading, isError, error } = useQuery<AssetOption[]>({
    queryKey: ["/api/business-assets/options", value ?? null],
    queryFn: async () => {
      const qs = value ? `?includeId=${encodeURIComponent(value)}` : "";
      const res = await fetch(`/api/business-assets/options${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load assets");
      return res.json();
    },
  });

  return (
    <div className="space-y-1">
      <Select
        value={value || NONE}
        disabled={disabled || isLoading}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && <SelectItem value={NONE}>None</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.assetTag} — {o.name} ({o.assetType}
              {o.status === "decommissioned"
                ? ", decommissioned"
                : o.status === "lost"
                  ? ", lost"
                  : o.status === "sold"
                    ? ", sold"
                    : o.status === "faulty" || o.status === "maintenance"
                      ? `, ${o.status}`
                      : ""}
              )
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isError && (
        <p className="text-xs text-destructive">
          {error instanceof Error ? error.message : "Could not load assets"}
        </p>
      )}
    </div>
  );
}
