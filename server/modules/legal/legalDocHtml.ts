import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** CRLF-safe markdown for legal docs from disk. */
function normalizeNewlines(md: string): string {
  return md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function sanitizeLegalHtml(rawHtml: string): string {
  const allowedTags = [
    ...(sanitizeHtml.defaults.allowedTags ?? []),
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "pre",
    "code",
    "hr",
    "del",
    "strike",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ];

  return sanitizeHtml(rawHtml, {
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      code: ["class"],
      img: ["src", "alt", "title"],
      th: ["colspan", "rowspan", "align"],
      td: ["colspan", "rowspan", "align"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}

/** Renders GitHub-flavoured markdown to sanitized HTML for public legal pages. */
export function legalMarkdownToSafeHtml(md: string): string {
  const normalized = normalizeNewlines(md).trim();
  const rawHtml = marked.parse(normalized, { async: false }) as string;
  return sanitizeLegalHtml(rawHtml);
}
