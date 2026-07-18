import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { INVENTORY_FIELD_TEMPLATES } from "@shared/inventoryCategories";
import { FolderTree, Plus, Trash2 } from "lucide-react";

export type InventoryCategoryRow = {
  id: string;
  name: string;
  slug: string;
  itemCodePrefix: string;
  fieldTemplate: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
};

interface InventoryCategoriesDialogProps {
  triggerLabel?: string;
}

export function InventoryCategoriesDialog({
  triggerLabel = "Manage Categories",
}: InventoryCategoriesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [fieldTemplate, setFieldTemplate] = useState<string>("supplies");

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["/api/inventory-categories", "admin", open],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/inventory-categories?includeInactive=true", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return (await res.json()) as InventoryCategoryRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
    refetch();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory-categories", {
        name: name.trim(),
        itemCodePrefix: prefix.trim().toUpperCase(),
        fieldTemplate,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setName("");
      setPrefix("");
      setFieldTemplate("supplies");
      toast({ title: "Category created" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const patchMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      body: Partial<{ name: string; itemCodePrefix: string; isActive: boolean; fieldTemplate: string }>;
    }) => {
      const res = await apiRequest("PATCH", `/api/inventory-categories/${payload.id}`, payload.body);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Category updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/inventory-categories/${id}`);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Category removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Cannot delete", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderTree className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory categories</DialogTitle>
          <DialogDescription>
            Defaults ship with every business. Add your own categories or deactivate ones you do not need.
            System categories cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.slug} · prefix {cat.itemCodePrefix} · {cat.fieldTemplate}
                  {cat.isSystem ? " · system" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={cat.isActive}
                  onCheckedChange={(checked) =>
                    patchMutation.mutate({ id: cat.id, body: { isActive: checked } })
                  }
                  aria-label={`Toggle ${cat.name}`}
                />
                {!cat.isSystem && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMutation.mutate(cat.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">Add custom category</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-cat-name">Name</Label>
              <Input
                id="inv-cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Packaging Materials"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-cat-prefix">Item code prefix</Label>
              <Input
                id="inv-cat-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="PKG"
                maxLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Form template</Label>
              <Select value={fieldTemplate} onValueChange={setFieldTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_FIELD_TEMPLATES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            disabled={!name.trim() || prefix.trim().length < 2 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
