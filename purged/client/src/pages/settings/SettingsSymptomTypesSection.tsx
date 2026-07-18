import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminSymptomType = {
  id: string;
  tenantId: string | null;
  code: string;
  label: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export function SettingsSymptomTypesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("general");

  const { data: types = [], isLoading } = useQuery<AdminSymptomType[]>({
    queryKey: ["/api/admin/symptom-types"],
    queryFn: getQueryFn<AdminSymptomType[]>({ on401: "throw" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/symptom-types", {
        code: code.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        category: category.trim() || "general",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/symptom-types"] });
      setCode("");
      setLabel("");
      toast({ title: "Symptom type added" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not add type", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/symptom-types/${id}`, { isActive });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/symptom-types"] });
    },
  });

  const tenantTypes = types.filter((t) => t.tenantId != null);
  const systemTypes = types.filter((t) => t.tenantId == null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symptom catalog</CardTitle>
        <CardDescription>
          System defaults are shared across tenants. Add tenant-specific symptom types for your portal symptom tracker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="symptom-code">Code</Label>
            <Input
              id="symptom-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. heat_exhaustion"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symptom-label">Label</Label>
            <Input id="symptom-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symptom-category">Category</Label>
            <Input id="symptom-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
        <Button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!code.trim() || !label.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add tenant symptom type
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <div className="space-y-4">
            {tenantTypes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your tenant types</p>
                <ul className="space-y-2">
                  {tenantTypes.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.isActive ? "secondary" : "outline"}>{t.isActive ? "Active" : "Off"}</Badge>
                        <Switch
                          checked={t.isActive}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, isActive: Boolean(v) })}
                          aria-label={`Toggle ${t.label}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-medium">System defaults ({systemTypes.length})</p>
              <p className="text-xs text-muted-foreground">
                {systemTypes.map((t) => t.label).join(", ")}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
