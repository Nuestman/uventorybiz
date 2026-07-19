import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Ticket,
  Settings2,
  MoreVertical,
  Trash2,
  Pencil,
  Filter,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { titleCaseUi } from "@/lib/titleCaseUi";

type TicketRow = {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  categoryName: string;
  updatedAt: string;
  source?: string;
  requesterName?: string;
  assigneeName?: string | null;
  requesterPortalEmail?: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

const STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
] as const;

function scopeDescription(scope: string): string {
  switch (scope) {
    case "requested":
      return "Tickets You Submitted As The Requester.";
    case "assigned":
      return "Tickets Where You Are The Assigned Handler.";
    case "mine":
      return "Tickets Where You Are Either The Requester Or The Assignee (One Combined List).";
    case "all":
      return "Every Ticket In Your Organization (Full Admin Queue).";
    default:
      return "";
  }
}

function statusBadgeVariant(
  s: string
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "closed" || s === "resolved") return "secondary";
  if (s === "cancelled") return "destructive";
  if (s === "in_progress") return "default";
  return "outline";
}

export default function TicketsListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [scope, setScope] = useState<"requested" | "assigned" | "mine" | "all">("requested");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [editActive, setEditActive] = useState(true);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<TicketRow | null>(null);

  const ticketsQueryKey = useMemo(
    () =>
      [
        "/api/tickets",
        { scope, status: statusFilter, categoryId: categoryFilter, source: sourceFilter },
      ] as const,
    [scope, statusFilter, categoryFilter, sourceFilter]
  );

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ticketsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("scope", scope);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      const res = await fetch(`/api/tickets?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as TicketRow[];
    },
  });

  /** Active categories for filters and new-ticket flows */
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/ticket-categories", "active"],
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories", { credentials: "include" });
      if (!res.ok) return [];
      return (await res.json()) as Category[];
    },
  });

  /** Full category list for admin CRUD */
  const { data: adminCategories = [], refetch: refetchAdminCategories } = useQuery({
    queryKey: ["/api/ticket-categories", "admin", catDialogOpen],
    enabled: isAdmin && catDialogOpen,
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories?includeInactive=true", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return (await res.json()) as Category[];
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/ticket-categories", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-categories"] });
      refetchAdminCategories();
      toast({ title: "Category Created" });
      setNewCatName("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const patchCategoryMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      body: Partial<{ name: string; slug: string; sortOrder: number; isActive: boolean }>;
    }) => {
      const res = await apiRequest("PATCH", `/api/ticket-categories/${payload.id}`, payload.body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-categories"] });
      refetchAdminCategories();
      toast({ title: "Category Updated" });
      setEditingCategory(null);
    },
    onError: (e: Error) =>
      toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/ticket-categories/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ticket-categories"] });
      refetchAdminCategories();
      toast({ title: "Category Removed" });
      setDeleteCategoryTarget(null);
    },
    onError: (e: Error) =>
      toast({ title: "Cannot Delete", description: e.message, variant: "destructive" }),
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket Deleted" });
      setDeleteTicketTarget(null);
    },
    onError: (e: Error) =>
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const openEditCategory = (c: Category) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditSort(c.sortOrder);
    setEditActive(c.isActive);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Staff Tickets
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            General site issues — repairs, equipment, departments, IT, and health &amp; safety requests
            within your organization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setCatDialogOpen(true)}
              className=""
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Manage Categories
            </Button>
          )}
          <Button asChild className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90">
            <Link href="/tickets/new">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Ticket Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={scope}
            onValueChange={(v) => setScope(v as typeof scope)}
            className="w-full"
          >
            <div className="tabs-list-custom mb-4">
              <TabsList
                className={`grid w-full bg-transparent h-auto p-1 gap-1 sm:gap-2 ${
                  isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
                }`}
              >
                <TabsTrigger value="requested" className="tab-trigger-custom text-xs sm:text-sm">
                  My Requests
                </TabsTrigger>
                <TabsTrigger value="assigned" className="tab-trigger-custom text-xs sm:text-sm">
                  Assigned To Me
                </TabsTrigger>
                <TabsTrigger value="mine" className="tab-trigger-custom text-xs sm:text-sm">
                  All Involving Me
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="all" className="tab-trigger-custom text-xs sm:text-sm">
                    All Tickets
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value={scope} className="space-y-4 mt-0">
              <p className="text-sm text-uventorybiz-gray leading-snug">{scopeDescription(scope)}</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Ticket List</h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px] bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {titleCaseUi(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[220px] bg-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="portal">Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="rounded-md border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Updated</TableHead>
                      {isAdmin && <TableHead className="w-[72px] text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell
                          colSpan={isAdmin ? 8 : 7}
                          className="text-muted-foreground"
                        >
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && tickets.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={isAdmin ? 8 : 7}
                          className="text-muted-foreground"
                        >
                          No Tickets In This View.
                        </TableCell>
                      </TableRow>
                    )}
                    {tickets.map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/tickets/${t.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {t.ticketNumber}
                            </Link>
                            {t.source === "portal" && (
                              <Badge variant="outline" className="text-xs">
                                Portal
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <div className="truncate font-medium">{t.title}</div>
                          {t.requesterName && (
                            <div className="text-xs text-muted-foreground truncate">
                              {t.requesterName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{t.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(t.status)}>
                            {titleCaseUi(t.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{titleCaseUi(t.priority)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {t.updatedAt
                            ? format(new Date(t.updatedAt), "MMM d, yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/tickets/${t.id}`}>Open</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteTicketTarget(t)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Ticket
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Admin: category CRUD */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Categories</DialogTitle>
            <DialogDescription>
              Create, Edit, Activate, Or Remove Categories. A Category Cannot Be Deleted While Tickets
              Still Reference It.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 border rounded-md p-3 bg-white">
            <Label className="text-sm font-medium text-gray-900">Add Category</Label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="E.g. Facilities"
                className="flex-1"
              />
              <Button
                disabled={!newCatName.trim() || createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate(newCatName.trim())}
                className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90 shrink-0"
              >
                Add Category
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">Existing Categories</Label>
            <div className="rounded-md border divide-y max-h-64 overflow-y-auto bg-white">
              {adminCategories.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.slug} · order {c.sortOrder}
                      {!c.isActive && " · inactive"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEditCategory(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteCategoryTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {isAdmin && catDialogOpen && adminCategories.length === 0 && (
                <div className="p-4 text-muted-foreground text-sm">Loading Categories…</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCatDialogOpen(false)}>
              Close Dialog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingCategory != null}
        onOpenChange={(o) => !o && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Slug Must Be Lowercase With Hyphens Only.</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>URL Slug</Label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                  placeholder="E.g. Facilities"
                />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editSort}
                  onChange={(e) => setEditSort(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="cat-active" checked={editActive} onCheckedChange={setEditActive} />
                <Label htmlFor="cat-active" className="font-normal cursor-pointer">
                  Category Active
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingCategory(null)}>
              Cancel Edits
            </Button>
            <Button
              className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
              disabled={patchCategoryMutation.isPending || !editName.trim() || !editSlug.trim()}
              onClick={() => {
                if (!editingCategory) return;
                patchCategoryMutation.mutate({
                  id: editingCategory.id,
                  body: {
                    name: editName.trim(),
                    slug: editSlug.trim(),
                    sortOrder: editSort,
                    isActive: editActive,
                  },
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteCategoryTarget != null}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This Cannot Be Undone. If Tickets Still Use This Category, Deletion Will Fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deleteCategoryTarget && deleteCategoryMutation.mutate(deleteCategoryTarget.id)
              }
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTicketTarget != null}
        onOpenChange={(o) => !o && setDeleteTicketTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently Remove {deleteTicketTarget?.ticketNumber} And Its Comments, Attachments,
              And Activity. This Cannot Be Undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deleteTicketTarget && deleteTicketMutation.mutate(deleteTicketTarget.id)
              }
            >
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
