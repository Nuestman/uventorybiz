import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, LifeBuoy, Loader2, Paperclip, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFormRequest, apiRequest } from "@/lib/queryClient";
import { titleCaseUi } from "@/lib/titleCaseUi";
import { PORTAL_SUPPORT, PORTAL_SUPPORT_NEW } from "./portalRoutes";
import { usePortalSession } from "./usePortalSession";
import { PORTAL_PRIMARY_BTN_CLASS, PortalEmptyState, PortalLoadingBlock } from "./portalUi";

type SupportCategory = {
  id: string;
  name: string;
  slug: string;
};

type SupportTicketRow = {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  categoryName: string;
  updatedAt: string;
  createdAt: string;
  descriptionHtml: string;
};

type SupportAttachment = {
  id: string;
  fileUrl: string;
  originalName: string;
  mimeType?: string | null;
  createdAt: string;
};

type SupportDetail = {
  ticket: SupportTicketRow;
  comments: Array<{
    id: string;
    bodyHtml: string;
    createdAt: string;
    authorLabel: string;
  }>;
  attachments: SupportAttachment[];
};

const MAX_FILES = 5;
const ACCEPTED_FILES = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "closed" || status === "resolved") return "secondary";
  if (status === "cancelled") return "destructive";
  if (status === "in_progress") return "default";
  return "outline";
}

async function uploadSupportFiles(ticketId: string, files: File[]) {
  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    await apiFormRequest("POST", `/api/portal/support-tickets/${ticketId}/attachments`, fd);
  }
}

export default function PortalSupportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = usePortalSession();
  const [, navigate] = useLocation();
  const [matchNew] = useRoute(PORTAL_SUPPORT_NEW);
  const [matchDetail, detailParams] = useRoute("/portal/support/:id");
  const creating = matchNew;
  const viewingId =
    matchDetail && detailParams?.id && detailParams.id !== "new" ? detailParams.id : null;

  const ticketsEnabled = session?.features.tickets !== false;

  const { data: categories = [] } = useQuery<SupportCategory[]>({
    queryKey: ["/api/portal/support-tickets/categories"],
    queryFn: async () => {
      const res = await fetch("/api/portal/support-tickets/categories", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: ticketsEnabled && creating,
  });

  const defaultCategoryId = useMemo(() => {
    const it = categories.find((c) => c.slug === "it-systems");
    return it?.id ?? categories[0]?.id ?? "";
  }, [categories]);

  const { data: tickets = [], isLoading } = useQuery<SupportTicketRow[]>({
    queryKey: ["/api/portal/support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/portal/support-tickets", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: ticketsEnabled && !viewingId && !creating,
  });

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery<SupportDetail>({
    queryKey: ["/api/portal/support-tickets", viewingId, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/support-tickets/${viewingId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: ticketsEnabled && !!viewingId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [categoryId, setCategoryId] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  const selectedCategory = categories.find((c) => c.id === (categoryId || defaultCategoryId));
  const isOtherCategory = selectedCategory?.slug === "other";

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/support-tickets", {
        title,
        description,
        priority,
        categoryId: categoryId || defaultCategoryId,
        otherCategoryDetail: isOtherCategory ? otherDetail : undefined,
      });
      const ticket = (await res.json()) as SupportTicketRow;
      if (files.length > 0) {
        await uploadSupportFiles(ticket.id, files);
      }
      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/support-tickets"] });
      toast({ title: "Issue submitted", description: ticket.ticketNumber });
      setTitle("");
      setDescription("");
      setOtherDetail("");
      setFiles([]);
      navigate(`/portal/support/${ticket.id}`);
    },
    onError: (e: Error) =>
      toast({ title: "Could not submit", description: e.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (comment.trim()) {
        await apiRequest("POST", `/api/portal/support-tickets/${viewingId}/comments`, {
          body: comment,
        });
      }
      if (commentFiles.length > 0 && viewingId) {
        await uploadSupportFiles(viewingId, commentFiles);
      }
    },
    onSuccess: () => {
      setComment("");
      setCommentFiles([]);
      queryClient.invalidateQueries({
        queryKey: ["/api/portal/support-tickets", viewingId, "detail"],
      });
      toast({ title: "Update sent" });
    },
    onError: (e: Error) =>
      toast({ title: "Could not add update", description: e.message, variant: "destructive" }),
  });

  const onPickFiles = (list: FileList | null, setter: (files: File[]) => void, current: File[]) => {
    if (!list?.length) return;
    const next = [...current, ...Array.from(list)].slice(0, MAX_FILES);
    setter(next);
  };

  if (!ticketsEnabled) {
    return (
      <PortalEmptyState
        icon={LifeBuoy}
        title="Support unavailable"
        description="System issue reporting is not enabled for this business right now."
      />
    );
  }

  if (creating) {
    const effectiveCategoryId = categoryId || defaultCategoryId;
    const canSubmit =
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      !!effectiveCategoryId &&
      (!isOtherCategory || otherDetail.trim().length > 0) &&
      !createMutation.isPending;

    return (
      <div className="space-y-6 max-w-xl">
        <Button variant="ghost" className="px-0" asChild>
          <Link href={PORTAL_SUPPORT}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to support
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Report a system issue</CardTitle>
            <CardDescription>
              Use this for portal, login, shop, or ordering problems — not for purchase disputes or
              invoice questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-title">Title</Label>
              <Input
                id="support-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the problem"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-category">Category</Label>
              <Select
                value={effectiveCategoryId || undefined}
                onValueChange={setCategoryId}
              >
                <SelectTrigger id="support-category">
                  <SelectValue placeholder="Select a category" />
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
            {isOtherCategory && (
              <div className="space-y-2">
                <Label htmlFor="support-other">Please specify</Label>
                <Input
                  id="support-other"
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  placeholder="What kind of issue is this?"
                  maxLength={500}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="support-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger id="support-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-desc">Describe the issue</Label>
              <Textarea
                id="support-desc"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you trying to do? What went wrong?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-files">Screenshots or files (optional)</Label>
              <Input
                id="support-files"
                type="file"
                accept={ACCEPTED_FILES}
                multiple
                onChange={(e) => onPickFiles(e.target.files, setFiles, files)}
              />
              <p className="text-xs text-muted-foreground">
                Images or PDF, up to {MAX_FILES} files (10 MB each).
              </p>
              {files.length > 0 && (
                <ul className="text-sm space-y-1">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}`} className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              className={PORTAL_PRIMARY_BTN_CLASS}
              disabled={!canSubmit}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit issue"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewingId) {
    if (detailLoading) return <PortalLoadingBlock label="Loading ticket…" />;
    if (detailError || !detail?.ticket) {
      return (
        <PortalEmptyState
          icon={LifeBuoy}
          title="Ticket not found"
          description="This support ticket is not available on your account."
        />
      );
    }
    const t = detail.ticket;
    const canComment = !["closed", "cancelled"].includes(t.status);
    const canSendUpdate = canComment && (comment.trim().length > 0 || commentFiles.length > 0);
    return (
      <div className="space-y-6 max-w-2xl">
        <Button variant="ghost" className="px-0" asChild>
          <Link href={PORTAL_SUPPORT}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to support
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t.ticketNumber}</Badge>
              <Badge variant={statusVariant(t.status)}>{titleCaseUi(t.status)}</Badge>
              <Badge variant="outline">{titleCaseUi(t.priority)}</Badge>
            </div>
            <CardTitle className="mt-2">{t.title}</CardTitle>
            <CardDescription>{t.categoryName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: t.descriptionHtml }}
            />
            {detail.attachments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Attachments</h3>
                <ul className="space-y-2">
                  {detail.attachments.map((a) => (
                    <li key={a.id}>
                      {a.mimeType?.startsWith("image/") ? (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={a.fileUrl}
                            alt={a.originalName}
                            className="max-h-48 rounded-md border object-contain"
                          />
                          <span className="text-xs text-muted-foreground">{a.originalName}</span>
                        </a>
                      ) : (
                        <a
                          href={a.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {a.originalName}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Conversation</h3>
              {detail.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              )}
              {detail.comments.map((c) => (
                <div key={c.id} className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {c.authorLabel} · {new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: c.bodyHtml }}
                  />
                </div>
              ))}
              {canComment && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="support-comment">Add a follow-up</Label>
                  <Textarea
                    id="support-comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add more detail for the support team"
                  />
                  <Input
                    type="file"
                    accept={ACCEPTED_FILES}
                    multiple
                    onChange={(e) => onPickFiles(e.target.files, setCommentFiles, commentFiles)}
                  />
                  {commentFiles.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {commentFiles.map((f) => (
                        <li key={`${f.name}-${f.size}`} className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="truncate">{f.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setCommentFiles((prev) => prev.filter((x) => x !== f))}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className={PORTAL_PRIMARY_BTN_CLASS}
                    disabled={commentMutation.isPending || !canSendUpdate}
                    onClick={() => commentMutation.mutate()}
                  >
                    {commentMutation.isPending ? "Sending…" : "Send update"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Report system-related issues with the portal, login, shop, or orders.
          </p>
        </div>
        <Button className={PORTAL_PRIMARY_BTN_CLASS} asChild>
          <Link href={PORTAL_SUPPORT_NEW}>
            <Plus className="h-4 w-4 mr-2" />
            Report an issue
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <PortalLoadingBlock label="Loading your tickets…" />
      ) : tickets.length === 0 ? (
        <PortalEmptyState
          icon={LifeBuoy}
          title="No issues yet"
          description="When something goes wrong in the portal, submit a ticket and our team will follow up."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/portal/support/${t.id}`}>
              <Card className="hover:border-[var(--portal-teal)] transition-colors cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.ticketNumber}</span>
                    <Badge variant={statusVariant(t.status)}>{titleCaseUi(t.status)}</Badge>
                    <Badge variant="outline">{titleCaseUi(t.priority)}</Badge>
                  </div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription>
                    {t.categoryName} · Updated {new Date(t.updatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
