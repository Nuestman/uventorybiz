import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuperAdminPrintDocumentStyles } from "@/components/SuperAdminPrintDocumentStyles";
import { ensureSourceSans3Loaded } from "@/lib/ensureSourceSans3";
import { LEGAL_PRINT_DOCUMENT_BODY_CLASS } from "@/lib/superAdminPrintDocument";
import { apiRequest } from "@/lib/queryClient";

type LegalDocumentPayload = {
  id: string;
  title: string;
  description: string;
  html: string;
};

function docQueryKey(docId: string) {
  return ["/api/legal/document", docId] as const;
}

export default function LegalDocument() {
  const [, params] = useRoute("/legal/:docId");
  const docId = params?.docId ?? "";

  useEffect(() => {
    ensureSourceSans3Loaded();
  }, []);

  useEffect(() => {
    document.body.classList.add(LEGAL_PRINT_DOCUMENT_BODY_CLASS);
    return () => document.body.classList.remove(LEGAL_PRINT_DOCUMENT_BODY_CLASS);
  }, []);

  const { data, isLoading, isError } = useQuery<LegalDocumentPayload>({
    queryKey: docQueryKey(docId),
    queryFn: async () => {
      const res = await fetch(`/api/legal/document/${encodeURIComponent(docId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json() as Promise<LegalDocumentPayload>;
    },
    enabled: Boolean(docId),
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = async () => {
    if (!docId) return;
    const res = await apiRequest("GET", `/api/legal/document/${docId}/raw`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docId}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!docId) {
    return null;
  }

  return (
    <>
      <SuperAdminPrintDocumentStyles />

      <div className="min-h-screen bg-white">
        <div className="legal-print-toolbar max-w-4xl mx-auto px-6 lg:px-8 pt-8 pb-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/legal">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All agreements
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleDownloadMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                Download .md
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#142F5C] hover:bg-[#142F5C]/90"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save as PDF
              </Button>
            </div>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-6 lg:px-8 pb-20 legal-document-prose">
          {isLoading && (
            <div className="flex items-center gap-2 text-[#142F5C]/70 py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          )}

          {isError && (
            <p className="text-red-600 py-12">
              This document could not be loaded.{" "}
              <Link href="/legal" className="underline">
                Back to legal hub
              </Link>
            </p>
          )}

          {data && (
            <>
              <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold print:hidden">
                LEGAL
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black text-[#142F5C] mb-3 print:text-black">{data.title}</h1>
              <p className="text-[#142F5C]/70 text-sm mb-8 print:text-black/80">{data.description}</p>
              <div
                className="prose prose-sm md:prose-base max-w-none text-[#142F5C]/90 prose-headings:text-[#142F5C] prose-a:text-[#F6621E] print:prose-black"
                dangerouslySetInnerHTML={{ __html: data.html }}
              />
              <p className="mt-10 text-xs text-[#142F5C]/55 print:hidden">
                Tenant administrators can upload signed files after login under{" "}
                <Link href="/admin/legal-agreements" className="text-[#F6621E] hover:underline">
                  Legal agreements
                </Link>
                . Questions?{" "}
                <Link href="/contacts" className="text-[#F6621E] hover:underline">
                  Contact us
                </Link>
                .
              </p>
            </>
          )}
        </article>
      </div>
    </>
  );
}
