import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Menu,
  Search,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface LibraryItem {
  documentId: string;
  title: string;
  code: string | null;
  department: string | null;
  publishedVersionId: string;
  versionNumber: number;
  approvedAt: string | null;
  hasAttachment: boolean;
  attachmentFilename: string | null;
}

interface LibraryDetail {
  document: {
    id: string;
    title: string;
    code: string | null;
    department: string | null;
  };
  version: {
    id: string;
    versionNumber: number;
    contentHtml: string;
    attachmentUrl: string | null;
    attachmentFilename: string | null;
    attachmentMime: string | null;
    approvedAt: string | null;
  };
}

export default function SOPLibrary() {
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("doc");
    if (q) setActiveId(q);
  }, []);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["/api/sops/library"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sops/library");
      return res.json() as Promise<{ items: LibraryItem[] }>;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/sops/library", activeId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sops/library/${activeId}`);
      return res.json() as Promise<LibraryDetail>;
    },
    enabled: Boolean(activeId),
  });

  const items = (listData?.items ?? []).filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-uventorybiz-coral" />
            <h1 className="text-2xl font-bold text-gray-900">SOP Library</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Published standard operating procedures for your organization. Need to author or approve SOPs?{" "}
            <Link
              href="/admin/sops"
              className="text-uventorybiz-coral font-semibold underline !font-sans !tracking-normal"
            >
              SOP Administration
            </Link>
            .
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden self-start gap-2 !font-sans !tracking-normal !font-semibold sop-sidebar-button"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <Menu className="h-4 w-4" />
          Browse SOPs
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`
            sop-sidebar border border-gray-200 bg-gray-50 rounded-lg shadow-sm flex flex-col
            shrink-0 max-h-[50vh] lg:max-h-none lg:sticky lg:top-4 lg:self-start
            ${sidebarOpen ? "fixed left-4 right-4 top-24 z-30 max-h-[70vh]" : "hidden lg:flex"}
          `}
        >
          <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search SOPs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 max-h-[calc(70vh-4rem)] lg:max-h-[calc(100vh-12rem)]">
            <nav className="p-2 space-y-2">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">No published SOPs yet.</p>
              ) : (
                items.map((item) => (
                  <a
                    key={item.documentId}
                    href="#"
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveId(item.documentId);
                      setSidebarOpen(false);
                      const url = new URL(window.location.href);
                      url.searchParams.set("doc", item.documentId);
                      window.history.replaceState({}, "", url.pathname + url.search);
                    }}
                    className={`sop-sidebar-link block w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors font-sans font-semibold tracking-normal border ${
                      activeId === item.documentId
                        ? "bg-uventorybiz-coral text-white"
                        : "border-slate-200 bg-white/60 hover:bg-gray-200 hover:border-slate-300"
                    } !font-sans !tracking-normal !font-semibold !text-sm`}
                    aria-current={activeId === item.documentId ? "page" : undefined}
                  >
                    <div className="sop-sidebar-link-title font-semibold line-clamp-2">
                      {item.title}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-xs opacity-90">
                      {item.code && <span className={`text-[11px] font-mono ${ activeId === item.documentId ? "text-white" : "text-slate-500" }`}>{item.code}</span>}
                      {item.department && <span>· {item.department}</span>}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 ${
                          activeId === item.documentId ? "bg-white/20 text-white border-0" : ""
                        }`}
                      >
                        v{item.versionNumber}
                      </Badge>
                    </div>
                  </a>
                ))
              )}
            </nav>
          </ScrollArea>
        </aside>

        <main>
          {!activeId && (
            <Card>
              <CardHeader>
                <CardTitle>Select an SOP</CardTitle>
                <CardDescription>
                  Choose a procedure from the list to read the published version. On small screens, open{" "}
                  <strong>Browse SOPs</strong> first.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {activeId && detailLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            </div>
          )}

          {activeId && detailData && (
            <Card className="shadow-sm">
              <CardHeader className="space-y-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] p-6 rounded-t-lg">
                <div className="flex flex-col items-start justify-between gap-4 w-full min-w-0">
                  <div className="min-w-0">
                    <CardTitle className="sop-view-title text-2xl font-semibold">
                      {detailData.document.title}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-3 mt-2">
                      {detailData.document.code && (
                        <span className="text-white/90">
                          Code: <strong>{detailData.document.code}</strong>
                        </span>
                      )}
                      {detailData.document.department && (
                        <span className="text-white/90">
                          Department: <strong>{detailData.document.department}</strong>
                        </span>
                      )}
                      <span className="text-white/90">
                        Version <strong>{detailData.version.versionNumber}</strong>
                        {detailData.version.approvedAt && (
                          <>
                            {" "}
                            · Approved {format(new Date(detailData.version.approvedAt), "PP")}
                          </>
                        )}
                      </span>
                    </CardDescription>
                  </div>
                  {detailData.version.attachmentUrl && (
                    <Button variant="outline" size="sm" className="gap-2 min-w-0 max-w-full w-full sm:w-auto sm:max-w-md" asChild>
                      <a
                        href={detailData.version.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-uventorybiz-coral flex items-center gap-2 min-w-0 max-w-full"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {detailData.version.attachmentFilename || "Attachment"}
                        </span>
                        <ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                {(() => {
                  const raw = detailData.version.contentHtml ?? "";
                  const plain = raw.replace(/<[^>]*>/g, "").replace(/\u00a0/g, " ").trim();
                  return plain.length > 0;
                })() ? (
                  <div
                    className="prose prose-sm sm:prose max-w-none sop-library-content"
                    dangerouslySetInnerHTML={{ __html: detailData.version.contentHtml }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 gap-2">
                    <FileText className="h-10 w-10 opacity-40" />
                    <p>This SOP has no HTML body. Use the attachment if one was provided.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
