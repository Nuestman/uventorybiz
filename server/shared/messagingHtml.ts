import sanitizeHtml from "sanitize-html";
import type { Attributes, Tag } from "sanitize-html";

/**
 * TinyMCE often emits inline styles on spans instead of semantic tags.
 * Convert to allowed tags so formatting survives sanitization.
 */
function transformStyledSpan(_tagName: string, attribs: Attributes): Tag {
  const style = (attribs.style ?? "").toLowerCase().replace(/\s/g, "");
  const nextAttribs: Attributes = attribs.class ? { class: attribs.class } : {};

  if (
    style.includes("text-decoration:underline") ||
    style.includes("text-decoration-line:underline")
  ) {
    return { tagName: "u", attribs: nextAttribs };
  }
  if (
    style.includes("text-decoration:line-through") ||
    style.includes("text-decoration-line:line-through")
  ) {
    return { tagName: "s", attribs: nextAttribs };
  }
  if (style.includes("font-weight:bold") || style.includes("font-weight:700")) {
    return { tagName: "strong", attribs: nextAttribs };
  }
  if (style.includes("font-style:italic")) {
    return { tagName: "em", attribs: nextAttribs };
  }

  return { tagName: "span", attribs: nextAttribs };
}

/**
 * Server-side allowlist for messaging rich text (TinyMCE).
 * Keep in sync with MessageRichTextEditor toolbar. No images — use attachments.
 */
export function sanitizeMessagingHtml(html: string): string {
  const input = html ?? "";
  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
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
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      b: sanitizeHtml.simpleTransform("strong", {}),
      i: sanitizeHtml.simpleTransform("em", {}),
      span: transformStyledSpan,
    },
  });
}

/** Plain text for previews, search, and length limits. */
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
