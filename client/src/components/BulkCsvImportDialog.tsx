import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface BulkImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

interface BulkCsvImportDialogProps {
  title: string;
  description: string;
  formatHint: string;
  /** Path under /api, e.g. /api/customers/bulk-import */
  endpoint: string;
  /** React Query keys to invalidate on success */
  invalidateKeys: string[][];
  /** Optional sample CSV shown in the paste area placeholder */
  placeholder?: string;
  /** Optional template download href (public file) */
  templateHref?: string;
  triggerLabel?: string;
}

export function BulkCsvImportDialog({
  title,
  description,
  formatHint,
  endpoint,
  invalidateKeys,
  placeholder,
  templateHref,
  triggerLabel = "Bulk Import",
}: BulkCsvImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState("");

  const importMutation = useMutation({
    mutationFn: async (): Promise<BulkImportResult> => {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Bulk import failed");
        }
        return res.json();
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ csvData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Bulk import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      setOpen(false);
      setSelectedFile(null);
      setCsvData("");
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} of ${data.total} row(s)${
          data.skipped ? ` (${data.skipped} skipped)` : ""
        }.`,
      });
      if (data.errors?.length) {
        toast({
          title: "Some rows had issues",
          description: data.errors.slice(0, 3).join(" · "),
          variant: "destructive",
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const canSubmit = !!selectedFile || csvData.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelectedFile(null);
          setCsvData("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Upload CSV file</Label>
            <p className="text-sm text-muted-foreground mb-2">Format: {formatHint}</p>
            {templateHref && (
              <a
                href={templateHref}
                download
                className="text-sm text-blue-600 hover:underline mb-2 inline-block"
              >
                Download template CSV
              </a>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv,.txt,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setCsvData("");
                  }
                }}
                className="hidden"
                id={`csv-file-${endpoint.replace(/\W+/g, "-")}`}
              />
              <label
                htmlFor={`csv-file-${endpoint.replace(/\W+/g, "-")}`}
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-gray-500">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div className="text-sm text-gray-600 text-center">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      <br />
                      <span className="text-xs">CSV file (max 5MB)</span>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
            </div>
          </div>

          <Textarea
            value={csvData}
            onChange={(e) => {
              setCsvData(e.target.value);
              if (e.target.value) setSelectedFile(null);
            }}
            placeholder={placeholder || formatHint}
            className="min-h-[140px] font-mono text-xs"
            disabled={!!selectedFile}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
