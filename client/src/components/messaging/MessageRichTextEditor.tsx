import { Editor } from "@tinymce/tinymce-react";

const TINYMCE_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js";

/** Semantic inline tags so formatting matches server sanitizer output. */
const TINYMCE_FORMATS = {
  bold: { inline: "strong", remove: "all" },
  italic: { inline: "em", remove: "all" },
  underline: { inline: "u", exact: true, remove: "all" },
  strikethrough: { inline: "s", exact: true, remove: "all" },
} as const;

export type MessageRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
};

/** Compact TinyMCE for secure messaging (HTML sanitized server-side). */
export function MessageRichTextEditor({
  value,
  onChange,
  disabled,
  compact,
  id = "message-rich-text",
}: MessageRichTextEditorProps) {
  return (
    <Editor
      id={id}
      tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
      disabled={disabled}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height: compact ? 120 : 180,
        menubar: false,
        branding: false,
        promotion: false,
        plugins: "lists link table autoresize code",
        toolbar:
          "undo redo | blocks | bold italic underline | bullist numlist | link table | removeformat | code",
        formats: TINYMCE_FORMATS,
        content_style:
          "body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 14px; line-height: 1.5; }",
        paste_data_images: false,
        autoresize_bottom_margin: 16,
        resize: true,
      }}
    />
  );
}
