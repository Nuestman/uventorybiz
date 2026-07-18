import { FileText, ExternalLink } from "lucide-react";
import type { MessageAttachmentDto } from "@shared/messaging";

type Props = {
  attachments: MessageAttachmentDto[];
  isOwn?: boolean;
};

export default function MessageAttachmentList({ attachments, isOwn }: Props) {
  if (!attachments.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a) => {
        const isImage = a.mimeType?.startsWith("image/");
        return (
          <div key={a.id}>
            {isImage ? (
              <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={a.fileUrl}
                  alt={a.originalName}
                  className="max-h-40 rounded border object-contain bg-background/80"
                />
              </a>
            ) : (
              <a
                href={a.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-xs underline ${
                  isOwn ? "text-primary-foreground/90" : "text-primary"
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {a.originalName}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
