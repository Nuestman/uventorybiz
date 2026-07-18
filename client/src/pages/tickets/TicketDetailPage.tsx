import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Paperclip,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TicketRichTextEditor } from "@/components/tickets/TicketRichTextEditor";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { titleCaseUi } from "@/lib/titleCaseUi";

const STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

type DetailResponse = {
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    descriptionHtml: string;
    status: string;
    priority: string;
    categoryId: string;
    categoryName: string;
    requesterUserId: string;
    assigneeUserId: string | null;
    locationId: string | null;
    relatedIncidentId: string | null;
    assetTag: string | null;
    createdAt: string;
    updatedAt: string;
    requesterName?: string;
    assigneeName?: string | null;
  };
  comments: Array<{
    id: string;
    bodyHtml: string;
    isInternal: boolean;
    createdAt: string;
    authorUserId: string;
    authorName?: string;
  }>;
  attachments: Array<{
    id: string;
    fileUrl: string;
    originalName: string;
    createdAt: string;
    uploadedByName?: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    actorName?: string;
  }>;
};

export default function TicketDetailPage() {
  const [, params] = useRoute("/tickets/:id");
  const [, navigate] = useLocation();
  const id = params?.id ?? "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const uid = user?.id ?? "";

  const [commentHtml, setCommentHtml] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contentEditOpen, setContentEditOpen] = useState(false);

  /** Requester edit form (synced from ticket) */
  const [adminTitle, setAdminTitle] = useState("");
  const [adminDesc, setAdminDesc] = useState("");
  const [adminLocationId, setAdminLocationId] = useState<string>("__none__");
  const [adminIncidentId, setAdminIncidentId] = useState<string>("__none__");
  const [adminAssetTag, setAdminAssetTag] = useState("");

  const detailQueryKey = ["/api/tickets", id] as const;

  const { data, isLoading, error } = useQuery({
    queryKey: detailQueryKey,
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as DetailResponse;
    },
  });

  const t = data?.ticket;
  const isRequester = Boolean(t && t.requesterUserId === uid);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/ticket-categories"],
    queryFn: async () => {
      const res = await fetch("/api/ticket-categories", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: string; name: string }>>;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<
        Array<{ id: string; firstName?: string; lastName?: string; email?: string }>
      >;
    },
  });

  const loadTicketMetaOptions = isAdmin || isRequester;

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/care-locations"],
    enabled: loadTicketMetaOptions,
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: string; locationName: string }>>;
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["/api/incident-reports"],
    enabled: loadTicketMetaOptions,
    queryFn: async () => {
      const res = await fetch("/api/incident-reports", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<
        Array<{ id: string; incidentType?: string; incidentLocation?: string }>
      >;
    },
  });

  useEffect(() => {
    if (!t) return;
    setAdminTitle(t.title);
    setAdminDesc(t.descriptionHtml ?? "");
    setAdminLocationId(t.locationId ?? "__none__");
    setAdminIncidentId(t.relatedIncidentId ?? "__none__");
    setAdminAssetTag(t.assetTag ?? "");
  }, [t?.id, t?.updatedAt, t?.title, t?.descriptionHtml, t?.locationId, t?.relatedIncidentId, t?.assetTag]);

  useEffect(() => {
    if (t && (t.status === "closed" || t.status === "cancelled")) {
      setContentEditOpen(false);
    }
  }, [t?.status]);

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/tickets/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket Updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const resetRequesterFormFromTicket = () => {
    if (!t) return;
    setAdminTitle(t.title);
    setAdminDesc(t.descriptionHtml ?? "");
    setAdminLocationId(t.locationId ?? "__none__");
    setAdminIncidentId(t.relatedIncidentId ?? "__none__");
    setAdminAssetTag(t.assetTag ?? "");
  };

  const saveRequesterContent = () => {
    if (!t) return;
    patchMutation.mutate(
      {
        title: adminTitle.trim(),
        descriptionHtml: adminDesc,
        locationId: adminLocationId === "__none__" ? null : adminLocationId,
        relatedIncidentId: adminIncidentId === "__none__" ? null : adminIncidentId,
        assetTag: adminAssetTag.trim() || null,
      },
      { onSuccess: () => setContentEditOpen(false) }
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket Deleted" });
      navigate("/tickets");
    },
    onError: (e: Error) =>
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tickets/${id}/comments`, {
        bodyHtml: commentHtml,
        isInternal: commentInternal,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      setCommentHtml("");
      setCommentInternal(false);
      toast({ title: "Comment Added" });
    },
    onError: (e: Error) =>
      toast({ title: "Comment Failed", description: e.message, variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tickets/${id}/attachments`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ storageBackend?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      if (data?.storageBackend === "local") {
        toast({
          title: "Attachment Saved On Server Only",
          description:
            "Cloud storage upload failed; the file is on this server’s disk. Check BLOB_READ_WRITE_TOKEN and server logs.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Attachment Uploaded" });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Upload Failed", description: e.message, variant: "destructive" }),
  });

  const isAssignee = t?.assigneeUserId === uid;
  const canInternalComment = isAdmin || isAssignee;
  const showAdminPanel = isAdmin;
  const showAssigneeStatus = isAssignee && !isAdmin;
  const assigneeCanChangeStatus = Boolean(
    t && !["resolved", "closed", "cancelled"].includes(t.status)
  );
  const canEditTicketContent = Boolean(
    t && isRequester && !["closed", "cancelled"].includes(t.status)
  );

  if (!id) {
    return (
      <div className="p-8 bg-uventorybiz-light-gray min-h-screen">
        <p className="text-uventorybiz-gray">Invalid Ticket.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <div className="mx-auto w-full max-w-4xl">
        <Button variant="ghost" className="mb-2 -ml-2 text-uventorybiz-navy" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back To Tickets
          </Link>
        </Button>

        {isLoading && <p className="text-uventorybiz-gray">Loading…</p>}
        {error && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Could Not Load Ticket"}
          </p>
        )}

        {t && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{t.ticketNumber}</Badge>
                  <Badge variant="secondary">{titleCaseUi(t.status)}</Badge>
                  <Badge variant="outline">{titleCaseUi(t.priority)}</Badge>
                </div>
                <p className="text-uventorybiz-gray mt-2 text-sm">
                  {t.categoryName} · Requested By {t.requesterName ?? t.requesterUserId}
                  {t.assigneeName ? ` · Assigned To ${t.assigneeName}` : ""}
                </p>
                <p className="text-xs text-uventorybiz-gray mt-1">
                  Updated {format(new Date(t.updatedAt), "PPpp")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isRequester && t.status === "open" && (
                  <Button
                    variant="outline"
                    className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 shadow-sm"
                    onClick={() => patchMutation.mutate({ status: "cancelled" })}
                    disabled={patchMutation.isPending}
                  >
                    Cancel Ticket
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Ticket
                  </Button>
                )}
              </div>
            </div>

            {showAdminPanel && (
              <Card className="mb-6 border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Triage And Assignment</CardTitle>
                  <CardDescription>Admin-Only Fields For This Tenant Queue.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={t.status}
                      onValueChange={(v) => patchMutation.mutate({ status: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {titleCaseUi(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={t.priority}
                      onValueChange={(v) => patchMutation.mutate({ priority: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {titleCaseUi(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={t.categoryId}
                      onValueChange={(v) => patchMutation.mutate({ categoryId: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={t.assigneeUserId ?? "__unassigned__"}
                      onValueChange={(v) =>
                        patchMutation.mutate({
                          assigneeUserId: v === "__unassigned__" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Not Assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Not Assigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6 border-gray-200 bg-white">
              <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Description</CardTitle>
                  <CardDescription>
                    {canEditTicketContent
                      ? "Only You Can Edit This Ticket's Details While It Is Open."
                      : isRequester && t && ["closed", "cancelled"].includes(t.status)
                        ? "This Ticket Is Closed; Details Cannot Be Edited."
                        : "Ticket Body And Linked Context."}
                  </CardDescription>
                </div>
                {canEditTicketContent && !contentEditOpen && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-100 hover:text-gray-900 shrink-0"
                    onClick={() => setContentEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Ticket
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {contentEditOpen && canEditTicketContent ? (
                  <>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={adminTitle}
                        onChange={(e) => setAdminTitle(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <TicketRichTextEditor
                        id="ticket-requester-desc"
                        value={adminDesc}
                        onChange={setAdminDesc}
                        minHeight={280}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Select value={adminLocationId} onValueChange={setAdminLocationId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.locationName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Related Incident</Label>
                        <Select value={adminIncidentId} onValueChange={setAdminIncidentId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {incidents.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {titleCaseUi(i.incidentType || "incident")} ·{" "}
                                {(i.incidentLocation || i.id).slice(0, 40)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Asset Tag / Equipment Ref</Label>
                      <Input
                        value={adminAssetTag}
                        onChange={(e) => setAdminAssetTag(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
                        type="button"
                        onClick={saveRequesterContent}
                        disabled={patchMutation.isPending || !adminTitle.trim()}
                      >
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
                        onClick={() => {
                          resetRequesterFormFromTicket();
                          setContentEditOpen(false);
                        }}
                        disabled={patchMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: t.descriptionHtml || "<p></p>" }}
                  />
                )}
              </CardContent>
            </Card>

            {showAssigneeStatus && (
              <Card className="mb-6 border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Update Progress</CardTitle>
                  <CardDescription>Set Status Or Priority For This Assignment.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="space-y-2 min-w-[200px]">
                    <Label>Status</Label>
                    <p className="text-sm text-uventorybiz-gray">
                      Current: {titleCaseUi(t.status)}
                    </p>
                    {assigneeCanChangeStatus ? (
                      <Select onValueChange={(v) => patchMutation.mutate({ status: v })}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Change Status…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-uventorybiz-gray">
                        An Admin Can Reopen Or Close The Ticket From Here.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 min-w-[200px]">
                    <Label>Priority</Label>
                    <Select
                      value={t.priority}
                      onValueChange={(v) => patchMutation.mutate({ priority: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {titleCaseUi(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </CardTitle>
                <CardDescription>
                  Images, PDF, Or Word — Same Limits As Incident Uploads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMutation.mutate(f);
                    e.target.value = "";
                  }}
                />
                <ul className="text-sm space-y-1">
                  {data?.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {a.originalName}
                      </a>
                      <span className="text-uventorybiz-gray ml-2">
                        {a.uploadedByName} · {format(new Date(a.createdAt), "PP")}
                      </span>
                    </li>
                  ))}
                  {(data?.attachments ?? []).length === 0 && (
                    <li className="text-uventorybiz-gray">No Attachments Yet.</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-6 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.comments ?? []).map((c) => (
                  <div key={c.id} className="border rounded-md p-3 bg-white">
                    <div className="flex justify-between text-xs text-uventorybiz-gray mb-2">
                      <span>
                        {c.authorName} · {format(new Date(c.createdAt), "PPpp")}
                      </span>
                      {c.isInternal && (
                        <Badge variant="outline" className="text-[10px]">
                          Internal Note
                        </Badge>
                      )}
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: c.bodyHtml }}
                    />
                  </div>
                ))}
                <Separator />
                <div className="space-y-3">
                  <Label>Your Comment</Label>
                  <TicketRichTextEditor
                    id="ticket-comment"
                    value={commentHtml}
                    onChange={setCommentHtml}
                    minHeight={200}
                  />
                  {canInternalComment && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="internal"
                        checked={commentInternal}
                        onCheckedChange={(v) => setCommentInternal(Boolean(v))}
                      />
                      <Label htmlFor="internal" className="font-normal cursor-pointer">
                        Internal Note (Assignee And Admins Only)
                      </Label>
                    </div>
                  )}
                  <Button
                    className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90"
                    onClick={() => commentMutation.mutate()}
                    disabled={commentMutation.isPending || !commentHtml.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Audit Trail For This Ticket.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {(data?.activity ?? []).map((a) => (
                    <li key={a.id} className="flex flex-col border-b pb-2 last:border-0">
                      <span className="font-medium text-gray-900">
                        {titleCaseUi(a.action)} · {a.actorName}
                      </span>
                      <span className="text-uventorybiz-gray text-xs">
                        {format(new Date(a.createdAt), "PPpp")}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete This Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently Remove {t?.ticketNumber} And All Related Comments, Attachments, And
              Activity. This Cannot Be Undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate()}
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
