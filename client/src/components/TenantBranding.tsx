import { useEffect } from "react";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useAuth } from "@/hooks/useAuth";

/**
 * Applies tenant-scoped branding to the document:
 * - Favicon (from settings.faviconUrl)
 * - Primary color (CSS variables)
 * - Document title (appName)
 *
 * Rendered once at app root so all pages pick up branding.
 */
export function TenantBranding() {
  const { user } = useAuth();
  const { settings } = useTenantSettings();

  // Apply favicon
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!user?.tenantId) return;

    const faviconUrl = settings?.faviconUrl;
    if (!faviconUrl) return;

    const head = document.head;
    if (!head) return;

    const rels = ["icon", "shortcut icon"];
    rels.forEach((rel) => {
      let link = head.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        head.appendChild(link);
      }
      link.href = faviconUrl;
    });
  }, [user?.tenantId, settings?.faviconUrl]);

  // Apply primary color to CSS variables
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!user?.tenantId) return;

    const root = document.documentElement;
    const fallback = "#142F5C";
    const color = settings?.primaryColor || fallback;

    root.style.setProperty("--uventorybiz-navy", color);
    root.style.setProperty("--primary", color);
  }, [user?.tenantId, settings?.primaryColor]);

  // Apply app name to document title (optional)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!user?.tenantId) return;

    const baseTitle = "uventorybiz";
    const name = settings?.appName?.trim();
    document.title = name ? `${name} | ${baseTitle}` : baseTitle;
  }, [user?.tenantId, settings?.appName]);

  return null;
}

