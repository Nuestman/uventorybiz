import { sidebarConfig } from "@/config/sidebarConfig";
import { superAdminNavSections } from "@/config/superAdminNav";

export type BreadcrumbCrumb = {
  label: string;
  /** When omitted, the crumb is the current page (not a link). */
  href?: string;
};

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split("?")[0] || "/";
  const trimmed = pathOnly.replace(/\/$/, "") || "/";
  return trimmed;
}

function currentHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash || "";
}

/**
 * Prefer exact matches, then the longest path prefix.
 * Hash-aware items (e.g. `/admin#users`) win when the hash matches.
 */
function pathMatchScore(itemPath: string, locationPath: string, locationHash: string): number {
  const hashIdx = itemPath.indexOf("#");
  const base = hashIdx === -1 ? itemPath : itemPath.slice(0, hashIdx);
  const itemHash = hashIdx === -1 ? "" : itemPath.slice(hashIdx);
  const baseNorm = normalizePath(base);

  if (itemHash) {
    if (locationPath !== baseNorm) return -1;
    if (locationHash !== itemHash) return -1;
    return 10_000 + baseNorm.length;
  }

  if (locationPath === baseNorm) {
    return 5_000 + baseNorm.length;
  }

  // Exact-only paths that must not swallow children
  if (baseNorm === "/assets" || baseNorm === "/assets/fleet" || baseNorm === "/shiftover") {
    return -1;
  }

  if (baseNorm !== "/" && locationPath.startsWith(`${baseNorm}/`)) {
    return baseNorm.length;
  }

  return -1;
}

function titleizeSegment(segment: string): string {
  if (!segment) return "Details";
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Details";
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveStaffBreadcrumbs(pathname: string, hash = currentHash()): BreadcrumbCrumb[] {
  const locationPath = normalizePath(pathname);
  const root: BreadcrumbCrumb = { label: "Home", href: "/dashboard" };

  let best: {
    score: number;
    groupLabel: string;
    itemTitle: string;
    itemUrl: string;
    tabTitle?: string;
  } | null = null;

  for (const group of sidebarConfig) {
    for (const item of group.items) {
      const score = pathMatchScore(item.url, locationPath, hash);
      if (score > (best?.score ?? -1)) {
        best = {
          score,
          groupLabel: group.label,
          itemTitle: item.title,
          itemUrl: item.url.split("#")[0] || item.url,
        };
      }

      if (item.tabs) {
        for (const tab of item.tabs) {
          const tabPath =
            tab.fullPath ??
            `${item.url}${tab.urlHash || (tab.value ? `#${tab.value}` : "")}`;
          const tabScore = pathMatchScore(tabPath, locationPath, hash);
          if (tabScore > (best?.score ?? -1)) {
            best = {
              score: tabScore,
              groupLabel: group.label,
              itemTitle: item.title,
              itemUrl: item.url.split("#")[0] || item.url,
              tabTitle: tab.title,
            };
          }
        }
      }
    }
  }

  if (!best) {
    const fallback = titleizeSegment(locationPath.split("/").filter(Boolean).pop() || "Page");
    return [root, { label: fallback }];
  }

  const crumbs: BreadcrumbCrumb[] = [root];

  const showGroup =
    best.groupLabel !== best.itemTitle &&
    best.groupLabel !== "Dashboard" &&
    best.groupLabel.length > 0;

  if (showGroup) {
    crumbs.push({ label: best.groupLabel });
  }

  const itemHref = normalizePath(best.itemUrl);
  const onItemExact = locationPath === itemHref && !best.tabTitle;
  const deeperThanItem = locationPath.startsWith(`${itemHref}/`) && locationPath !== itemHref;

  if (best.tabTitle) {
    crumbs.push({ label: best.itemTitle, href: itemHref });
    crumbs.push({ label: best.tabTitle });
  } else if (deeperThanItem) {
    crumbs.push({ label: best.itemTitle, href: itemHref });
    crumbs.push({ label: titleizeSegment(locationPath.slice(itemHref.length + 1).split("/")[0] || "") });
  } else if (onItemExact && locationPath === "/dashboard") {
    crumbs.push({ label: "Dashboard" });
  } else {
    crumbs.push({ label: best.itemTitle });
  }

  return crumbs;
}

export function resolveSuperAdminBreadcrumbs(
  pathname: string,
  hash = currentHash()
): BreadcrumbCrumb[] {
  const locationPath = normalizePath(pathname);
  const root: BreadcrumbCrumb = { label: "System console", href: "/super-admin/dashboard" };

  let best: {
    score: number;
    sectionLabel: string;
    itemTitle: string;
    itemHref: string;
  } | null = null;

  for (const section of superAdminNavSections) {
    for (const item of section.items) {
      const score = pathMatchScore(item.href, locationPath, hash);
      if (score > (best?.score ?? -1)) {
        best = {
          score,
          sectionLabel: section.label,
          itemTitle: item.title,
          itemHref: item.href.split("#")[0] || item.href,
        };
      }
    }
  }

  // Console hub (`/super-admin` with optional hash) when no dedicated route matched
  if (!best && (locationPath === "/super-admin" || locationPath.startsWith("/super-admin/"))) {
    if (locationPath === "/super-admin") {
      return [root, { label: "Console" }];
    }
    const segment = titleizeSegment(locationPath.replace(/^\/super-admin\/?/, "").split("/")[0] || "Console");
    return [root, { label: segment }];
  }

  if (!best) {
    return [root, { label: titleizeSegment(locationPath.split("/").filter(Boolean).pop() || "Page") }];
  }

  const crumbs: BreadcrumbCrumb[] = [root];

  if (best.sectionLabel && best.sectionLabel !== best.itemTitle) {
    crumbs.push({ label: best.sectionLabel });
  }

  crumbs.push({ label: best.itemTitle });
  return crumbs;
}
