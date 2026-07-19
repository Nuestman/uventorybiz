import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import {
  resolveStaffBreadcrumbs,
  resolveSuperAdminBreadcrumbs,
  type BreadcrumbCrumb,
} from "@/lib/appBreadcrumbs";
import { cn } from "@/lib/utils";

type AppBreadcrumbsProps = {
  variant: "staff" | "super-admin";
  className?: string;
};

function useLocationHash(pathname: string): string {
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : ""
  );

  useEffect(() => {
    setHash(typeof window !== "undefined" ? window.location.hash : "");
  }, [pathname]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return hash;
}

function useResolvedCrumbs(variant: AppBreadcrumbsProps["variant"]): BreadcrumbCrumb[] {
  const [location] = useLocation();
  const hash = useLocationHash(location);

  if (variant === "super-admin") {
    return resolveSuperAdminBreadcrumbs(location, hash);
  }
  return resolveStaffBreadcrumbs(location, hash);
}

export function AppBreadcrumbs({ variant, className }: AppBreadcrumbsProps) {
  const crumbs = useResolvedCrumbs(variant);

  if (crumbs.length === 0) return null;

  return (
    <nav
      className={cn(
        "flex items-center gap-1.5 text-sm text-uventorybiz-gray min-w-0",
        className
      )}
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="contents">
            {index > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            ) : null}
            {isLast || !crumb.href ? (
              <span
                className={cn(
                  "truncate",
                  isLast ? "text-gray-900 font-medium" : "text-uventorybiz-gray"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-gray-900 transition-colors shrink-0 truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
