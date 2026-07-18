import { Editor } from "@tinymce/tinymce-react";

const TINYMCE_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js";

export interface SopRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  id?: string;
}

/**
 * Rich text editor for SOP bodies.
 * Uses the same self-hosted TinyMCE script as tickets (no cloud API key),
 * but with the fuller plugin + toolbar config you copied in.
 */
export function SopRichTextEditor({
  value,
  onChange,
  height = 440,
  id = "sop-rich-text",
}: SopRichTextEditorProps) {
  return (
    <Editor
      id={id}
      tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height,
        directionality: "ltr",
        language: "en",
        plugins: [
          "accordion",
          "anchor",
          "autolink",
          "autoresize",
          "autosave",
          "charmap",
          "code",
          "codesample",
          "directionality",
          "emoticons",
          "fullscreen",
          "help",
          "image",
          "importcss",
          "insertdatetime",
          "link",
          "lists",
          "media",
          "nonbreaking",
          "pagebreak",
          "preview",
          "quickbars",
          "save",
          "searchreplace",
          "table",
          "visualblocks",
          "visualchars",
          "wordcount",
        ],
        toolbar:
          "undo redo | blocks fontfamily fontsize | " +
          "bold italic underline strikethrough | link image media table accordion | " +
          "align lineheight | numlist bullist indent outdent | " +
          "emoticons charmap | code codesample | insertdatetime | " +
          "preview fullscreen save | removeformat",
        menubar: "file edit view insert format tools table help",
        content_style:
          "body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size:14px; direction:ltr; text-align:left; }",
        skin: "oxide",
        content_css: "default",
        branding: false,
        promotion: false,
        toolbar_mode: "sliding",
      }}
    />
  );
}

