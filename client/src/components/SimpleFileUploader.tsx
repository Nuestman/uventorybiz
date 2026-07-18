import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleFileUploaderProps {
  onUploadComplete: (url: string) => void;
  buttonText?: string;
  buttonClassName?: string;
  accept?: string;
  maxSizeMB?: number;
  /** Upload category for storage path (e.g. 'profiles', 'tenant-branding'). */
  category?: string;
}

export function SimpleFileUploader({
  onUploadComplete,
  buttonText = "Upload Image",
  buttonClassName,
  accept = "image/*",
  maxSizeMB = 10,
  category = "profiles",
}: SimpleFileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File must be less than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      // Credentials include sends cookies automatically
      const response = await fetch('/api/public-objects/upload', {
        method: 'POST',
        credentials: 'include', // Send cookies with request
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      toast({
        title: "Upload Successful",
        description: "Your file has been uploaded",
      });

      onUploadComplete(data.uploadURL || data.url);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
        aria-label="File upload input"
      />
      
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={buttonClassName}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            aria-label="Remove preview"
            title="Remove preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

