const LINK_ID = "uventorybiz-source-sans-3-print-docs";

export function ensureSourceSans3Loaded(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LINK_ID)) return;
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}
