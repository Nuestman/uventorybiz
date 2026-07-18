import { Editor } from "@tinymce/tinymce-react";

const TINYMCE_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js";

export interface TicketRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
  id?: string;
}

/**
 * Shared TinyMCE configuration for ticket descriptions and comments.
 * HTML is sanitized on the server before persistence.
 */
export function TicketRichTextEditor({
  value,
  onChange,
  disabled,
  minHeight = 280,
  id = "ticket-rich-text",
}: TicketRichTextEditorProps) {
  return (
    <Editor
      id={id}
      tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
      disabled={disabled}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height: minHeight,
        menubar: false,
        branding: false,
        promotion: false,
        plugins: "lists link table autoresize code",
        toolbar:
          "undo redo | blocks | bold italic underline | bullist numlist | link table | removeformat | code",
        content_style:
          "body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 14px; line-height: 1.5; }",
        paste_data_images: false,
        autoresize_bottom_margin: 16,
        resize: true,
      }}
    />
  );
}
