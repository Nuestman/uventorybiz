import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, BookOpen, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import { InventoryCategoriesDialog } from "@/components/InventoryCategoriesDialog";
import { ListPagination } from "@/components/ListPagination";

const PAGE_SIZE = 20;

type InventoryCategoryOption = {
  id: string;
  name: string;
  slug: string;
  itemCodePrefix: string;
  fieldTemplate: string;
  sortOrder: number;
  isActive: boolean;
};

type CatalogItem = {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  brand?: string | null;
  description?: string | null;
  unitOfMeasure: string;
  dosageForm?: string | null;
  supplier?: string | null;
  barcode?: string | null;
  status: "active" | "inactive" | "discontinued";
  stockLocationCount: number;
  totalStock: number;
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  itemName: "",
  itemCode: "",
  category: "",
  description: "",
  unitOfMeasure: "units",
  brand: "",
  barcode: "",
  supplier: "",
  dosageForm: "",
  status: "active" as CatalogItem["status"],
};

const unitsOfMeasure = [
  "pieces",
  "boxes",
  "packs",
  "sets",
  "kits",
  "units",
  "pairs",
  "liters",
  "milliliters",
  "grams",
  "kilograms",
  "meters",
  "rolls",
  "sheets",
  "tubes",
];

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body.errors && typeof body.errors === "object") {
      const parts = Object.entries(body.errors as Record<string, string[]>)
        .flatMap(([field, msgs]) => (Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [`${field}: ${String(msgs)}`]));
      if (parts.length) return parts.join("; ");
    }
    return body.message || body.error || res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export default function InventoryCatalog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);

  const { data: categories = [] } = useQuery<InventoryCategoryOption[]>({
    queryKey: ["/api/inventory-categories"],
  });

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const categoryLabel = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/inventory-catalog"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await fetch("/api/inventory-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemName: body.itemName.trim(),
          itemCode: body.itemCode.trim() || undefined,
          category: body.category,
          description: body.description.trim() || null,
          unitOfMeasure: body.unitOfMeasure,
          brand: body.brand.trim() || null,
          barcode: body.barcode.trim() || null,
          supplier: body.supplier.trim() || null,
          dosageForm: body.dosageForm.trim() || null,
          status: body.status,
        }),
      });
      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "Created", description: "Catalog item added. Add stock on the Inventory page when ready." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: typeof emptyForm & { id: string }) => {
      const res = await fetch(`/api/inventory-catalog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemName: body.itemName.trim(),
          itemCode: body.itemCode.trim() || undefined,
          category: body.category,
          description: body.description.trim() || null,
          unitOfMeasure: body.unitOfMeasure,
          brand: body.brand.trim() || null,
          barcode: body.barcode.trim() || null,
          supplier: body.supplier.trim() || null,
          dosageForm: body.dosageForm.trim() || null,
          status: body.status,
        }),
      });
      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: "Updated", description: "Catalog item saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory-catalog/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDeleteTarget(null);
      toast({ title: "Deleted", description: "Catalog item removed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category: activeCategories[0]?.slug ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({
      itemName: item.itemName,
      itemCode: item.itemCode,
      category: item.category,
      description: item.description ?? "",
      unitOfMeasure: item.unitOfMeasure || "units",
      brand: item.brand ?? "",
      barcode: item.barcode ?? "",
      supplier: item.supplier ?? "",
      dosageForm: item.dosageForm ?? "",
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.itemName.trim() || !form.category) {
      toast({
        title: "Missing fields",
        description: "Name and category are required.",
        variant: "destructive",
      });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const statusBadge = (status: CatalogItem["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "discontinued":
        return <Badge variant="outline">Discontinued</Badge>;
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col gap-4 min-[1080px]:flex-row min-[1080px]:items-center min-[1080px]:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2">
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Stock by location
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl min-[1080px]:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-uventorybiz-navy shrink-0" />
            Product catalog
          </h1>
          <p className="text-muted-foreground text-sm min-[1080px]:text-base">
            Master product list (no quantities). Stock levels live on the Inventory page per store.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InventoryCategoriesDialog />
          <Button
            onClick={openCreate}
            style={{ backgroundColor: "var(--uventorybiz-navy)", color: "white" }}
            className="hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catalog</CardTitle>
          <CardDescription>
            {items.length} product{items.length === 1 ? "" : "s"} · create here, then receive or transfer stock into stores
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, code, barcode…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {activeCategories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading catalog…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {items.length === 0
                ? "No products yet. Add your first catalog item."
                : "No products match your filters."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead>Total qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">
                          {(page - 1) * PAGE_SIZE + index + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.itemCode}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{item.itemName}</div>
                          {item.barcode && (
                            <div className="text-xs text-muted-foreground">Barcode: {item.barcode}</div>
                          )}
                        </TableCell>
                        <TableCell>{categoryLabel(item.category)}</TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                        <TableCell>{item.stockLocationCount}</TableCell>
                        <TableCell>{item.totalStock}</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ListPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                itemLabel="products"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Catalog only — no stock is created. Use Inventory or PO receive to put quantity into a store.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="itemName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemName"
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="itemCode">Item code</Label>
                <Input
                  id="itemCode"
                  value={form.itemCode}
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value.toUpperCase() })}
                  placeholder={editing ? undefined : "Auto if blank"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit of measure</Label>
                <Select
                  value={form.unitOfMeasure}
                  onValueChange={(value) => setForm({ ...form, unitOfMeasure: value })}
                >
                  <SelectTrigger id="unitOfMeasure">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as CatalogItem["status"] })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete catalog item?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.itemName}</strong> ({deleteTarget?.itemCode})?
              {deleteTarget && deleteTarget.totalStock > 0 && (
                <span className="block mt-2 text-destructive">
                  This item still has stock at {deleteTarget.stockLocationCount} location
                  {deleteTarget.stockLocationCount === 1 ? "" : "s"}. Zero stock or set status to
                  discontinued first.
                </span>
              )}
              {deleteTarget && deleteTarget.totalStock === 0 && (
                <span className="block mt-2">
                  Empty stock rows at stores will also be removed. Purchase order history may cascade.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || (deleteTarget?.totalStock ?? 0) > 0}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
