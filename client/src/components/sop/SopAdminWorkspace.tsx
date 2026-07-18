import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileStack,
  FileText,
  Loader2,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SopRichTextEditor } from "@/components/SopRichTextEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/appVersion";

type VersionStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "archived"
  | "rejected";

interface AdminDocRow {
  id: string;
  title: string;
  code: string | null;
  department: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersionNumber: number | null;
  latestStatus: VersionStatus | null;
}

interface VersionRow {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  contentHtml: string;
  changeNotes: string | null;
  attachmentUrl: string | null;
  attachmentFilename: string | null;
  attachmentMime: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

const documentDetailsSchema = z.object({
  title: z.string().min(1, "Title is required").max(512),
  code: z.string().max(64).optional(),
  department: z.string().max(128).optional(),
  isArchived: z.boolean(),
});

type DocumentDetailsValues = z.infer<typeof documentDetailsSchema>;

const newSopSchema = z.object({
  title: z.string().min(1, "Title is required").max(512),
  code: z.string().max(64).optional(),
  department: z.string().max(128).optional(),
});

type NewSopValues = z.infer<typeof newSopSchema>;

function statusBadge(status: VersionStatus) {
  const styles: Record<VersionStatus, string> = {
    draft: "border-slate-200 bg-slate-50 text-slate-800",
    pending_approval: "border-amber-200 bg-amber-50 text-amber-950",
    published: "border-emerald-200 bg-emerald-50 text-emerald-900",
    archived: "border-slate-200 bg-slate-100 text-slate-600",
    rejected: "border-red-200 bg-red-50 text-red-900",
  };
  const label: Record<VersionStatus, string> = {
    draft: "Draft",
    pending_approval: "Pending approval",
    published: "Published",
    archived: "Archived",
    rejected: "Rejected",
  };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", styles[status])}>
      {label[status]}
    </Badge>
  );
}

function LifecycleRail({ status }: { status: VersionStatus | null }) {
  const steps = [
    { key: "draft", label: "Draft" },
    { key: "pending_approval", label: "Review" },
    { key: "published", label: "Published" },
  ] as const;
  const activeIndex =
    status === "draft"
      ? 0
      : status === "pending_approval"
        ? 1
        : status === "published"
          ? 2
          : status === "rejected"
            ? -1
            : status === "archived"
              ? 2
              : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Publication lifecycle</p>
      {status === "rejected" ? (
        <p className="text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This version was rejected. Start a new draft to revise and resubmit.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 sm:gap-0">
          {steps.map((s, i) => {
            const done = activeIndex > i;
            const current = activeIndex === i;
            return (
              <div key={s.key} className="flex items-center">
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : current ? (
                    <Circle className="h-5 w-5 text-[#142F5C] fill-[#142F5C]/20 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      current ? "text-[#142F5C]" : done ? "text-slate-700" : "text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 mx-2 sm:mx-3 hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SopAdminWorkspace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "active" | "archived">("active");
  const [docSearch, setDocSearch] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [focusVersionId, setFocusVersionId] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [changeNotesDraft, setChangeNotesDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectVersionId, setRejectVersionId] = useState<string | null>(null);
  const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["/api/sops/admin/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sops/admin/documents");
      return res.json() as Promise<{ items: AdminDocRow[] }>;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/sops/admin/documents", selectedDocId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sops/admin/documents/${selectedDocId}`);
      return res.json() as Promise<{
        document: {
          id: string;
          title: string;
          code: string | null;
          department: string | null;
          isArchived: boolean;
          createdAt: string;
          updatedAt: string;
        };
        versions: VersionRow[];
      }>;
    },
    enabled: Boolean(selectedDocId),
  });

  const versionSignature = useMemo(
    () => detailData?.versions.map((v) => `${v.id}:${v.status}`).join("|") ?? "",
    [detailData?.versions]
  );

  useEffect(() => {
    if (!detailData?.versions?.length) {
      setFocusVersionId(null);
      return;
    }
    setFocusVersionId((prev) => {
      if (prev && detailData.versions.some((v) => v.id === prev)) {
        return prev;
      }
      const draft = detailData.versions.find((v) => v.status === "draft");
      const pend = detailData.versions.find((v) => v.status === "pending_approval");
      return draft?.id ?? pend?.id ?? detailData.versions[0]!.id;
    });
  }, [detailData?.document?.id, versionSignature]);

  const focusVersion = useMemo(
    () => detailData?.versions.find((v) => v.id === focusVersionId) ?? null,
    [detailData, focusVersionId]
  );

  useEffect(() => {
    if (focusVersion) {
      setEditorHtml(focusVersion.contentHtml ?? "");
      setChangeNotesDraft(focusVersion.changeNotes ?? "");
    } else {
      setEditorHtml("");
      setChangeNotesDraft("");
    }
  }, [focusVersion?.id, focusVersion?.contentHtml, focusVersion?.changeNotes]);

  const docForm = useForm<DocumentDetailsValues>({
    resolver: zodResolver(documentDetailsSchema),
    defaultValues: {
      title: "",
      code: "",
      department: "",
      isArchived: false,
    },
  });

  useEffect(() => {
    if (!detailData?.document) return;
    docForm.reset({
      title: detailData.document.title,
      code: detailData.document.code ?? "",
      department: detailData.document.department ?? "",
      isArchived: detailData.document.isArchived,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailData?.document?.id, detailData?.document?.updatedAt]);

  const newForm = useForm<NewSopValues>({
    resolver: zodResolver(newSopSchema),
    defaultValues: { title: "", code: "", department: "" },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["/api/sops/admin/documents"] });
    if (selectedDocId) {
      void queryClient.invalidateQueries({ queryKey: ["/api/sops/admin/documents", selectedDocId] });
    }
    void queryClient.invalidateQueries({ queryKey: ["/api/sops/library"] });
  }, [queryClient, selectedDocId]);

  const saveDocumentMutation = useMutation({
    mutationFn: async (values: DocumentDetailsValues) => {
      const res = await apiRequest("PATCH", `/api/sops/admin/documents/${selectedDocId}`, {
        title: values.title.trim(),
        code: values.code?.trim() ? values.code.trim() : null,
        department: values.department?.trim() ? values.department.trim() : null,
        isArchived: values.isArchived,
      });
      return res.json() as Promise<{ document: unknown }>;
    },
    onSuccess: () => {
      toast({ title: "Document saved", description: "Metadata and visibility were updated." });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (values: NewSopValues) => {
      const res = await apiRequest("POST", "/api/sops/admin/documents", {
        title: values.title.trim(),
        code: values.code?.trim() ? values.code.trim() : null,
        department: values.department?.trim() ? values.department.trim() : null,
      });
      return res.json() as Promise<{ document: { id: string } }>;
    },
    onSuccess: (data) => {
      toast({ title: "SOP created", description: "Version 1 is in draft. Add content, then save and submit." });
      setCreateOpen(false);
      newForm.reset();
      setSelectedDocId(data.document.id);
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Could not create SOP", description: e.message, variant: "destructive" }),
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ versionId, html, notes }: { versionId: string; html: string; notes: string | null }) => {
      const res = await apiRequest("PATCH", `/api/sops/admin/versions/${versionId}`, {
        contentHtml: html,
        changeNotes: notes?.trim() ? notes.trim() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Draft saved" });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const newVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocId) throw new Error("No document");
      const res = await apiRequest("POST", `/api/sops/admin/documents/${selectedDocId}/versions`, {
        contentHtml: editorHtml || "<p></p>",
        changeNotes: changeNotesDraft?.trim() || "New revision",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "New draft created" });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Cannot create version", description: e.message, variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", `/api/sops/admin/versions/${versionId}/submit`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submitted for approval" });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Submit failed", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", `/api/sops/admin/versions/${versionId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published", description: "This version is now live in the SOP library." });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", `/api/sops/admin/versions/${versionId}/withdraw`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission withdrawn",
        description: "The version is back in draft so you can continue editing.",
      });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Withdraw failed", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ versionId, reason }: { versionId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/sops/admin/versions/${versionId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Version rejected" });
      setRejectOpen(false);
      setRejectReason("");
      setRejectVersionId(null);
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (versionId: string) => {
      await apiRequest("DELETE", `/api/sops/admin/versions/${versionId}`);
    },
    onSuccess: () => {
      toast({ title: "Draft removed" });
      setDeleteVersionId(null);
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  async function uploadAttachment(versionId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/sops/admin/versions/${versionId}/attachment`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    toast({ title: "File attached" });
    invalidate();
  }

  async function clearAttachment(versionId: string) {
    const res = await fetch(`/api/sops/admin/versions/${versionId}/attachment`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    toast({ title: "Attachment removed" });
    invalidate();
  }

  const filteredDocs = useMemo(() => {
    let rows = listData?.items ?? [];
    if (listFilter === "active") rows = rows.filter((d) => !d.isArchived);
    if (listFilter === "archived") rows = rows.filter((d) => d.isArchived);
    const q = docSearch.trim().toLowerCase();
    if (q) rows = rows.filter((d) => d.title.toLowerCase().includes(q));
    return rows;
  }, [listData?.items, listFilter, docSearch]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-[1920px] mx-auto w-full">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sop-sidebar flex flex-col border-slate-200 bg-white z-50 w-[min(22rem,92vw)] shrink-0 shadow-xl lg:shadow-none",
          "fixed inset-y-0 left-0 border-r lg:static lg:z-auto transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto"
        )}
      >
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2 lg:hidden">
            <span className="text-sm font-semibold text-slate-900">SOP Catalogue</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="!font-sans !tracking-normal !font-semibold sop-sidebar-button"
            >
              Close
            </Button>
          </div>
          <Tabs value={listFilter} onValueChange={(v) => setListFilter(v as typeof listFilter)} className="w-full">
            <div className="tabs-list-custom overflow-x-auto">
              <TabsList className="grid w-full min-w-0 grid-cols-3 bg-transparent h-auto p-1 gap-1 lg:gap-2">
                <TabsTrigger
                  value="active"
                  className="tab-trigger-custom text-xs sm:text-sm !font-sans !tracking-normal !font-semibold"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="archived"
                  className="tab-trigger-custom text-xs sm:text-sm !font-sans !tracking-normal !font-semibold"
                >
                  Archived
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="tab-trigger-custom text-xs sm:text-sm !font-sans !tracking-normal !font-semibold"
                >
                  All
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by title…"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="pl-9 h-10 bg-slate-50 border-slate-200"
            />
          </div>
          <Button
            className="w-full bg-[#142F5C] hover:bg-[#142F5C]/90 !font-sans !tracking-normal !font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Standard Procedure
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-2">
            {listLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <p className="text-sm text-slate-500 px-3 py-6 text-center leading-relaxed">
                No procedures match this filter. Create a new SOP or adjust filters. Seeded examples use codes
                starting with <span className="font-mono text-xs">MAID-SEED-</span> after migration.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredDocs.map((d) => (
                  <li key={d.id}>
                    <a
                      href="#"
                      role="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedDocId(d.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "sop-sidebar-link block w-full text-left rounded-lg px-3 py-2.5 transition-colors border !font-sans !tracking-normal !font-semibold !text-sm",
                        selectedDocId === d.id
                          ? "border-[#142F5C] bg-[#142F5C]/5 ring-1 ring-[#142F5C]/20"
                          : "border-slate-200 bg-white/60 hover:bg-slate-50 hover:border-slate-300"
                      )}
                      aria-current={selectedDocId === d.id ? "page" : undefined}
                    >
                      <div className="sop-sidebar-link-title font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                        {d.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {d.code && (
                          <span className="text-[11px] font-mono text-slate-500">{d.code}</span>
                        )}
                        {d.latestStatus && statusBadge(d.latestStatus)}
                        {d.isArchived && (
                          <Badge variant="secondary" className="text-[10px]">
                            Hidden from library
                          </Badge>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
            <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-[#142F5C]" />
            <span>
              Drafts can include rich text and attachments. Submitting locks the version until it is approved,
              rejected, or deleted as a draft.
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50/50">
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-slate-200 bg-white">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Catalogue"
            className="!font-sans !tracking-normal !font-semibold sop-sidebar-button"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 truncate">
            {selectedDocId ? "Editing Procedure" : "Select a Procedure"}
          </span>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 pb-16">
            <header className="space-y-1.5 pb-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                <FileStack
                  className="h-9 w-9 sm:h-10 sm:w-10 text-[#142F5C] shrink-0"
                  aria-hidden
                />
                <h1 className="text-4xl font-semibold text-slate-900 tracking-[0.06em] sm:tracking-[0.08em] min-w-0">
                  SOP Administration
                </h1>
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 shrink-0 self-center">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Author, review, approve, and publish tenant procedures
              </p>
            </header>

            {!selectedDocId && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Standard Operating Procedures</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Maintain a controlled library of procedures for your site. Each record supports versioned
                    HTML content, optional controlled attachments (PDF, Word, images), and an approval gate
                    before publication to the organisation-wide{" "}
                    <a href="/sop" className="text-[#142F5C] font-medium underline underline-offset-2">
                      SOP Library
                    </a>
                    .
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-800">Document record</strong> holds the title, reference code,
                    department tag, and whether the procedure is archived (withdrawn from the library).
                  </p>
                  <p>
                    <strong className="text-slate-800">Versions</strong> carry the body and file. Only one draft or
                    pending version may exist at a time; publishing archives the previous live version
                    automatically.
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedDocId && detailLoading && (
              <div className="flex justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
              </div>
            )}

            {selectedDocId && detailData && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-500 font-medium shrink-0">Editing</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="text-slate-900 font-semibold truncate min-w-0 max-w-[min(100%,36rem)]">
                    {detailData.document.title}
                  </span>
                </div>

                <LifecycleRail status={focusVersion?.status ?? null} />

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Document record</CardTitle>
                    <CardDescription>
                      Catalogue identity and library visibility. Saving applies immediately for authorised users.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...docForm}>
                      <form
                        onSubmit={docForm.handleSubmit((v) => saveDocumentMutation.mutate(v))}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={docForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input className="bg-white" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={docForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reference code</FormLabel>
                                <FormControl>
                                  <Input className="bg-white font-mono text-sm" placeholder="e.g. HSE-014" {...field} />
                                </FormControl>
                                <FormDescription>Optional short identifier for audits and cross-references.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={docForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department / function</FormLabel>
                                <FormControl>
                                  <Input className="bg-white" placeholder="e.g. Safety, Medical" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={docForm.control}
                            name="isArchived"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4 sm:col-span-2">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Archived</FormLabel>
                                  <FormDescription>
                                    Archived procedures no longer appear in the read-only SOP library.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={saveDocumentMutation.isPending}
                          className="bg-[#142F5C] hover:bg-[#142F5C]/90"
                        >
                          {saveDocumentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save document record
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">Version history</CardTitle>
                        <CardDescription>
                          Click a row (version number, status, or date) to load that version in the workspace below.
                          Use the row menu for actions such as deleting a draft.
                        </CardDescription>
                      </div>
                      {focusVersion && (
                        <div className="flex items-center gap-2">
                          {statusBadge(focusVersion.status)}
                          <span className="text-sm text-slate-500">Version {focusVersion.versionNumber}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md border border-slate-200 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead className="w-16">Ver.</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-12 text-right" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailData.versions.map((v) => (
                            <TableRow
                              key={v.id}
                              className={cn(v.id === focusVersionId && "bg-[#142F5C]/5")}
                            >
                              <TableCell
                                className="font-mono font-medium cursor-pointer select-none"
                                onClick={() => setFocusVersionId(v.id)}
                              >
                                {v.versionNumber}
                              </TableCell>
                              <TableCell
                                className="cursor-pointer select-none"
                                onClick={() => setFocusVersionId(v.id)}
                              >
                                {statusBadge(v.status)}
                              </TableCell>
                              <TableCell
                                className="text-slate-600 text-sm whitespace-nowrap cursor-pointer select-none"
                                onClick={() => setFocusVersionId(v.id)}
                              >
                                {format(new Date(v.createdAt), "PPp")}
                              </TableCell>
                              <TableCell
                                className="text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setFocusVersionId(v.id);
                                      }}
                                    >
                                      Focus version below
                                    </DropdownMenuItem>
                                    {v.status === "draft" && (
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setDeleteVersionId(v.id);
                                        }}
                                      >
                                        Delete draft…
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {focusVersion && (
                      <>
                        <Separator />

                        {focusVersion.status === "draft" && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">Draft content</h3>
                              {focusVersion.attachmentFilename ? (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <a
                                    href={focusVersion.attachmentUrl ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#142F5C] underline font-medium inline-flex items-center gap-1"
                                  >
                                    <FileText className="h-4 w-4" />
                                    {focusVersion.attachmentFilename}
                                  </a>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-600"
                                    onClick={() => clearAttachment(focusVersion.id)}
                                  >
                                    Remove file
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-slate-700">Controlled attachment</Label>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="file"
                                  accept=".pdf,.doc,.docx,image/*"
                                  className="max-w-md bg-white cursor-pointer"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void uploadAttachment(focusVersion.id, f).catch((err) =>
                                      toast({
                                        title: "Upload failed",
                                        description: err instanceof Error ? err.message : "Unknown error",
                                        variant: "destructive",
                                      })
                                    );
                                    e.target.value = "";
                                  }}
                                />
                                <Upload className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                              </div>
                              <p className="text-xs text-slate-500">
                                Attach a signed PDF or source document. You must still add summary or full text in
                                the editor below unless the attachment alone satisfies your governance rule.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sop-change-notes">Revision notes (internal)</Label>
                              <Textarea
                                id="sop-change-notes"
                                value={changeNotesDraft}
                                onChange={(e) => setChangeNotesDraft(e.target.value)}
                                rows={2}
                                className="bg-white resize-y"
                                placeholder="Summarize what changed for reviewers."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Procedure body</Label>
                              <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                                <SopRichTextEditor value={editorHtml} onChange={setEditorHtml} height={440} />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={saveDraftMutation.isPending}
                                onClick={() =>
                                  saveDraftMutation.mutate({
                                    versionId: focusVersion.id,
                                    html: editorHtml,
                                    notes: changeNotesDraft || null,
                                  })
                                }
                              >
                                {saveDraftMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Save draft
                              </Button>
                              <Button
                                type="button"
                                className="bg-[#142F5C] hover:bg-[#142F5C]/90"
                                disabled={submitMutation.isPending || saveDraftMutation.isPending}
                                onClick={async () => {
                                  try {
                                    await saveDraftMutation.mutateAsync({
                                      versionId: focusVersion.id,
                                      html: editorHtml,
                                      notes: changeNotesDraft || null,
                                    });
                                    submitMutation.mutate(focusVersion.id);
                                  } catch {
                                    // saveDraftMutation already surfaced a toast on error
                                  }
                                }}
                              >
                                Submit for approval
                              </Button>
                            </div>
                          </div>
                        )}

                        {focusVersion.status === "pending_approval" && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5 space-y-4">
                            <div className="flex gap-2 text-amber-950 text-sm">
                              <AlertTriangle className="h-5 w-5 shrink-0" />
                              <div>
                                <p className="font-semibold">Pending your decision</p>
                                <p className="mt-1 text-amber-900/90 leading-relaxed">
                                  Review the body and any attachment. Approving replaces the current published
                                  version; rejecting returns the content to the author with a reason.
                                </p>
                              </div>
                            </div>
                            {focusVersion.changeNotes && (
                              <p className="text-sm text-amber-950/80">
                                <span className="font-medium">Author notes:</span> {focusVersion.changeNotes}
                              </p>
                            )}
                            {focusVersion.attachmentFilename && (
                              <a
                                href={focusVersion.attachmentUrl ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-[#142F5C] underline"
                              >
                                <FileText className="h-4 w-4" />
                                {focusVersion.attachmentFilename}
                              </a>
                            )}
                            <div
                              className="prose prose-sm max-w-none border border-amber-200/60 rounded-md bg-white p-4"
                              dangerouslySetInnerHTML={{
                                __html: focusVersion.contentHtml || "<p><em>No HTML body.</em></p>",
                              }}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                className="bg-emerald-700 hover:bg-emerald-700/90"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(focusVersion.id)}
                              >
                                {approveMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Approve & publish
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setRejectVersionId(focusVersion.id);
                                  setRejectOpen(true);
                                }}
                              >
                                Reject…
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={withdrawMutation.isPending}
                                onClick={() => withdrawMutation.mutate(focusVersion.id)}
                              >
                                {withdrawMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Withdraw For Edits
                              </Button>
                            </div>
                          </div>
                        )}

                        {(focusVersion.status === "published" ||
                          focusVersion.status === "archived" ||
                          focusVersion.status === "rejected") && (
                          <div className="space-y-4">
                            {focusVersion.status === "rejected" && focusVersion.rejectionReason && (
                              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Rejection reason</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap">
                                  {focusVersion.rejectionReason}
                                </AlertDescription>
                              </Alert>
                            )}
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {focusVersion.status === "published" &&
                                "This revision is read-only. Create a new draft to prepare the next publication."}
                              {focusVersion.status === "archived" &&
                                "Superseded published revision (archived when a newer version was published)."}
                              {focusVersion.status === "rejected" &&
                                "Rejected revision. Start a new draft from current published content if applicable."}
                            </p>
                            {(focusVersion.status === "published" || focusVersion.status === "rejected") && (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={newVersionMutation.isPending}
                                onClick={() => newVersionMutation.mutate()}
                              >
                                {newVersionMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Create next draft from this content
                              </Button>
                            )}
                            {focusVersion.attachmentFilename && (
                              <a
                                href={focusVersion.attachmentUrl ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-[#142F5C] underline"
                              >
                                <FileText className="h-4 w-4" />
                                {focusVersion.attachmentFilename}
                              </a>
                            )}
                            <div
                              className="prose prose-sm max-w-none border border-slate-200 rounded-md bg-white p-4"
                              dangerouslySetInnerHTML={{ __html: focusVersion.contentHtml || "" }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Standard Procedure</DialogTitle>
            <DialogDescription>
              Creates the document shell and version 1 in <strong>draft</strong>. You can add the full text and
              files immediately after.
            </DialogDescription>
          </DialogHeader>
          <Form {...newForm}>
            <form
              onSubmit={newForm.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4 py-2"
            >
              <FormField
                control={newForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference code (optional)</FormLabel>
                    <FormControl>
                      <Input className="bg-white font-mono text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (optional)</FormLabel>
                    <FormControl>
                      <Input className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-[#142F5C]">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this version</DialogTitle>
            <DialogDescription>
              The author will see this reason. Be specific enough for them to correct the submission.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="bg-white"
            placeholder="e.g. Missing escalation contact; attachment is not the signed PDF."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || !rejectVersionId || rejectMutation.isPending}
              onClick={() => {
                if (rejectVersionId) {
                  rejectMutation.mutate({ versionId: rejectVersionId, reason: rejectReason.trim() });
                }
              }}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteVersionId)} onOpenChange={(o) => !o && setDeleteVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the draft version only. Published history is unchanged. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() => deleteVersionId && deleteDraftMutation.mutate(deleteVersionId)}
            >
              {deleteDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
