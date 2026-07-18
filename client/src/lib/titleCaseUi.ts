/**
 * Title Case each word for headings, labels, and buttons.
 * Handles snake_case (e.g. in_progress → In Progress).
 */
export function titleCaseUi(s: string): string {
  if (!s?.trim()) return "";
  return s
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
