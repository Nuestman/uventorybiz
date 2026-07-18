import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, ArrowRight, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type LegalDocumentSummary = {
  id: string;
  title: string;
  description: string;
};

type LegalDocumentsResponse = {
  documents: LegalDocumentSummary[];
};

const LEGAL_QUERY_KEY = ["/api/legal/documents"] as const;

export default function LegalHub() {
  const { data, isLoading, isError } = useQuery<LegalDocumentsResponse>({
    queryKey: LEGAL_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/legal/documents", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json() as Promise<LegalDocumentsResponse>;
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
            LEGAL & COMMERCIAL
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-[#142F5C] mb-2">
            Agreements & policies
          </h1>
          <p className="text-[#142F5C]/75 text-lg mb-4">
            uventorybiz — templates for procurement and data protection. These pages are informational;
            executed agreements are controlled by your order form or contract.
          </p>
          <p className="text-[#142F5C]/65 text-sm mb-10">
            <Link href="/privacy" className="text-[#F6621E] hover:underline">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" className="text-[#F6621E] hover:underline">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/security" className="text-[#F6621E] hover:underline">
              Security
            </Link>
            {" · "}
            <Link href="/contacts" className="text-[#F6621E] hover:underline">
              Contact
            </Link>
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-[#142F5C]/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading documents…
            </div>
          )}

          {isError && (
            <p className="text-red-600 text-sm">
              Legal documents could not be loaded. Please try again later or contact support.
            </p>
          )}

          {data && (
            <ul className="space-y-4">
              {data.documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/legal/${doc.id}`}
                    className="group flex gap-4 rounded-xl border border-[#142F5C]/12 bg-white p-5 shadow-sm transition hover:border-[#F6621E]/40 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#142F5C]/6 text-[#142F5C]">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-[#142F5C] group-hover:text-[#F6621E] flex items-center gap-2 flex-wrap">
                        {doc.title}
                      </h2>
                      <p className="text-sm text-[#142F5C]/70 mt-1 leading-relaxed">{doc.description}</p>
                      <span className="mt-3 inline-flex items-center text-sm font-semibold text-[#F6621E]">
                        View, print, or download
                        <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 rounded-xl border border-[#142F5C]/10 bg-[#142F5C]/[0.03] p-6">
            <div className="flex gap-3">
              <Scale className="h-6 w-6 text-[#142F5C] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#142F5C] mb-2">Print, sign, and return</h3>
                <p className="text-sm text-[#142F5C]/75 leading-relaxed">
                  Use <strong>Print / Save as PDF</strong> on each document for wet signatures or your own signing
                  process. If you are a tenant <strong>administrator</strong>, after signing you can upload executed
                  files under <strong>Administration → Legal agreements</strong> in the app so uventorybiz can file them
                  with your subscription record. Always have counsel review before customer distribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
