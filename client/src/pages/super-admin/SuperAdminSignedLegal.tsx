import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES: Record<string, string> = {
  commercial_agreement: "Commercial agreement",
  data_processing_addendum: "Data processing addendum",
  baa: "BAA",
  subprocessors_ack: "Subprocessors / acknowledgement",
  other: "Other",
};

type SuperDocRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: string;
  originalFilename: string;
  createdAt: string | null;
  uploadedByUserId: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
};

async function downloadSuperDoc(id: string, fallbackName: string) {
  const res = await fetch(`/api/super-admin/legal-signed-documents/${encodeURIComponent(id)}/download`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SuperAdminSignedLegal() {
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["/api/super-admin/legal-signed-documents"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/legal-signed-documents", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ documents: SuperDocRow[] }>;
    },
  });

  const docs = data?.documents ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <h1 className="text-2xl font-black text-[#142F5C] mb-2">Tenant signed legal documents</h1>
      <p className="text-slate-600 text-sm mb-8 max-w-2xl leading-relaxed">
        Executed agreements uploaded by tenant administrators. Storage URLs are not exposed here; use Download to
        fetch the file through the authenticated API.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-600 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-sm py-4">
          {error instanceof Error ? error.message : "Failed to load documents."}
        </p>
      )}

      {!isLoading && !isError && docs.length === 0 && (
        <p className="text-slate-600 text-sm py-4">No uploads yet.</p>
      )}

      {!isLoading && !isError && docs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Uploader</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium whitespace-nowrap">{row.tenantName}</TableCell>
                  <TableCell>{DOCUMENT_TYPES[row.documentType] ?? row.documentType}</TableCell>
                  <TableCell className="max-w-[180px] truncate" title={row.originalFilename}>
                    {row.originalFilename}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                    {row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {row.uploaderFirstName || row.uploaderLastName
                      ? `${row.uploaderFirstName ?? ""} ${row.uploaderLastName ?? ""}`.trim()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await downloadSuperDoc(row.id, row.originalFilename);
                        } catch (e) {
                          toast({
                            title: "Download failed",
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
