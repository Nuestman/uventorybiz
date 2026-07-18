import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { portalSignInUrl } from "./portalRoutes";
import { usePortalSession } from "./usePortalSession";
import { usePortalBodyClass } from "./usePortalBodyClass";

export default function PortalProtected({ children }: { children: ReactNode }) {
  usePortalBodyClass();
  const { isLoading, isAuthenticated } = usePortalSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(portalSignInUrl());
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="portal-root portal-page min-h-[50vh] flex items-center justify-center bg-[var(--portal-surface,#eef2f6)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--portal-teal,#0a4f6e)]" />
      </div>
    );
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
