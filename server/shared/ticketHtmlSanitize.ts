import sanitizeHtml from "sanitize-html";

/**
 * Server-side allowlist for TinyMCE / rich ticket content (descriptions & comments).
 * Prevents stored XSS; keep in sync with editor capabilities.
 */
export function sanitizeTicketHtml(html: string): string {
  const input = html ?? "";
  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "span",
      "div",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      img: ["src", "alt", "width", "height"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

/** Escape plain portal text into sanitized ticket HTML paragraphs. */
export function plainTextToTicketHtml(text: string): string {
  const escaped = (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const withBreaks = escaped
    .split(/\r?\n/)
    .map((line) => (line.length ? line : "&nbsp;"))
    .join("<br>");
  return sanitizeTicketHtml(`<p>${withBreaks}</p>`);
}
