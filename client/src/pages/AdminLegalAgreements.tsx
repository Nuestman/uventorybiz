import { useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, ExternalLink, Loader2, Scale, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Unauthorized from "@/pages/unauthorized";
import AccessDenied from "@/pages/access-denied";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES = [
  { value: "commercial_agreement", label: "Commercial agreement" },
  { value: "data_processing_addendum", label: "Data processing addendum" },
  { value: "baa", label: "Business associate agreement (BAA)" },
  { value: "subprocessors_ack", label: "Subprocessors / acknowledgement" },
  { value: "other", label: "Other" },
] as const;

type TenantDocRow = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  notes: string | null;
  createdAt: string | null;
  uploadedByUserId: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
};

function labelForType(t: string): string {
  return DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;
}

async function downloadTenantDoc(id: string, fallbackName: string) {
  const res = await fetch(`/api/admin/legal-signed-documents/${encodeURIComponent(id)}/download`, {
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

export default function AdminLegalAgreements() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<string>("commercial_agreement");
  const [notes, setNotes] = useState("");

  const { data, isLoading: listLoading } = useQuery({
    queryKey: ["/api/admin/legal-signed-documents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/legal-signed-documents", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ documents: TenantDocRow[] }>;
    },
    enabled: Boolean(isAuthenticated && user?.role === "admin" && user?.tenantId),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", documentType);
      if (notes.trim()) fd.append("notes", notes.trim());
      const res = await fetch("/api/admin/legal-signed-documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/legal-signed-documents"] });
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "Uploaded", description: "Signed document saved." });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-[#142F5C]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Unauthorized />;
  }

  const isTenantAdmin = user.role === "admin" && Boolean(user.tenantId);
  if (!isTenantAdmin) {
    return (
      <AccessDenied
        title="Administrator access required"
        message="Only tenant administrators can upload signed legal documents."
        requiredRole="Tenant administrator"
        currentRole={user.role ?? undefined}
      />
    );
  }

  const docs = data?.documents ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-[#142F5C] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#142F5C]">Legal agreements</h1>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
            Download templates from the{" "}
            <a href="/legal" className="text-[#F6621E] font-semibold hover:underline" target="_blank" rel="noreferrer">
              public legal hub
            </a>
            , sign outside the app (print or your own process), then upload PDF or Word copies here. uventorybiz staff can
            retrieve them from the platform console.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a href="/legal" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Public templates
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">Admin panel</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload signed document</CardTitle>
          <CardDescription>PDF or Word, up to about 10 MB per file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="legal-notes">Notes (optional)</Label>
              <Input
                id="legal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. countersigned 2026-04-01, version referenced in order form"
                maxLength={2000}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="legal-file">File (PDF or Word, max ~10 MB)</Label>
              <Input
                id="legal-file"
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={uploadMut.isPending}
              />
            </div>
          </div>
          <Button
            type="button"
            className="bg-[#142F5C] hover:bg-[#142F5C]/90"
            disabled={uploadMut.isPending}
            onClick={() => {
              const f = fileRef.current?.files?.[0];
              if (!f) {
                toast({ title: "Choose a file", variant: "destructive" });
                return;
              }
              uploadMut.mutate(f);
            }}
          >
            {uploadMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload signed document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your uploads</CardTitle>
          <CardDescription>Previously uploaded files for this organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center gap-2 text-slate-600 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <p className="text-slate-600 text-sm py-4">No documents uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                    <TableCell className="font-medium">{labelForType(row.documentType)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.originalFilename}>
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
                            await downloadTenantDoc(row.id, row.originalFilename);
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
          )}
        </CardContent>
      </Card>

      <MobileNav />
    </div>
  );
}
