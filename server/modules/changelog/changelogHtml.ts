import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const VERSION_HEADER = /^## \[([^\]]+)\]\s*-\s*(.+)$/;

/** CRLF breaks header regex (`\r` left on line → `$` no longer matches). */
function normalizeNewlines(md: string): string {
  return md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export type ChangelogVersionSection = {
  id: string;
  version: string;
  date: string;
  html: string;
};

export type ChangelogPayload = {
  introHtml: string;
  sections: ChangelogVersionSection[];
};

function sanitizeChangelogHtml(rawHtml: string): string {
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

function markdownToSafeHtml(md: string): string {
  const rawHtml = marked.parse(md.trim(), { async: false }) as string;
  return sanitizeChangelogHtml(rawHtml);
}

/**
 * Splits docs/CHANGELOG.md into an intro (title + preamble) and one block per `## [semver] - date` release.
 */
export function parseChangelogMarkdown(md: string): { introMd: string; versionBlocks: { version: string; date: string; bodyMd: string }[] } {
  const normalized = normalizeNewlines(md);
  const parts = normalized.split(/\n(?=## \[[^\]]+\])/);
  const introMd = (parts[0] ?? "").trim();

  const versionBlocks: { version: string; date: string; bodyMd: string }[] = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i].trim();
    const firstNl = block.indexOf("\n");
    const head = (firstNl === -1 ? block : block.slice(0, firstNl)).trim();
    const bodyMd = firstNl === -1 ? "" : block.slice(firstNl + 1).trim();
    const m = head.match(VERSION_HEADER);
    if (!m) continue;
    versionBlocks.push({
      version: m[1],
      date: m[2].trim(),
      bodyMd,
    });
  }

  return { introMd, versionBlocks };
}

export function buildChangelogPayload(md: string): ChangelogPayload {
  marked.setOptions({ gfm: true });
  const { introMd: rawIntro, versionBlocks } = parseChangelogMarkdown(md);
  /** Drop the file’s top-level `# Title` — the Changelog page already renders an H1. */
  const introMd = rawIntro.replace(/^#\s+[^\n]+\n+/, "").trim();
  const introHtml = introMd.length > 0 ? markdownToSafeHtml(introMd) : "";

  const sections: ChangelogVersionSection[] = versionBlocks.map((b, index) => ({
    id: `v${b.version}-${index}`,
    version: b.version,
    date: b.date,
    html: markdownToSafeHtml(b.bodyMd.length > 0 ? b.bodyMd : "_No notes for this release._"),
  }));

  return { introHtml, sections };
}
