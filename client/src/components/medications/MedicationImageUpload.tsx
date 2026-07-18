import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UploadTarget = "staff" | "portal";

type MedicationImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  onClear?: () => void;
  uploadTarget?: UploadTarget;
  disabled?: boolean;
};

export function MedicationImageUpload({
  value,
  onChange,
  onClear,
  uploadTarget = "staff",
  disabled = false,
}: MedicationImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Images only", description: "Please upload a photo of the medication package.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadTarget === "staff") {
        formData.append("category", "work-fitness-medications");
      }

      const endpoint =
        uploadTarget === "portal"
          ? "/api/portal/work-fitness/medication-image"
          : "/api/public-objects/upload";

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Upload failed");
      }

      const data = (await response.json()) as { url?: string; uploadURL?: string; imageUrl?: string };
      const url = data.url ?? data.uploadURL ?? data.imageUrl;
      if (!url) throw new Error("Upload did not return a URL");

      onChange(url);
      toast({ title: "Photo uploaded", description: "Medication image attached." });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">Medication photo (package / label)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFileSelect}
        aria-label="Upload medication photo"
      />
      {value ? (
        <div className="flex items-start gap-3">
          <a href={value} target="_blank" rel="noopener noreferrer" className="block shrink-0">
            <img
              src={value}
              alt="Medication package"
              className="h-20 w-20 rounded-md border object-cover"
            />
          </a>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Replace photo
            </Button>
            {onClear ? (
              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={onClear} disabled={disabled}>
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/80 px-4 py-5 text-center transition-colors hover:border-uventorybiz-navy/40 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-uventorybiz-navy" />
          ) : (
            <Upload className="h-5 w-5 text-uventorybiz-navy" />
          )}
          <span className="text-xs text-gray-600">
            {uploading ? "Uploading…" : "Click to upload a photo of the medication"}
          </span>
        </button>
      )}
    </div>
  );
}
