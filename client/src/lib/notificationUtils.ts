import type { Notification } from "@shared/schema";

/** Treat as unread if neither readAt nor status reflects a read notification. */
export function notificationIsUnread(n: Notification): boolean {
  return !n.readAt && n.status !== "read";
}

/** Resolve in-app navigation path from notification metadata.viewLink (absolute or relative). */
export function getNotificationHref(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || !("viewLink" in metadata)) return null;
  const raw = (metadata as { viewLink?: unknown }).viewLink;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(raw, base);
    return u.pathname + u.search + u.hash;
  } catch {
    return raw.startsWith("/") ? raw : null;
  }
}
