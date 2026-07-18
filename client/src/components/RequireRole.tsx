import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { RouteRole } from "@/routes";
import { getPostLoginHome, hasRoleFor } from "@/routes";
import { useEffect, useRef, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Wraps content that requires a specific role.
 * Uses a toast + redirect instead of rendering an access-denied page.
 */
export function RequireRole({
  role,
  children,
}: {
  role: RouteRole;
  children: ReactNode;
}) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const hasWarnedRef = useRef(false);

  const allowed = hasRoleFor(user?.role, role);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed && user !== null && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: "Access limited",
        description: "You do not have permission to open that page.",
        variant: "destructive",
      });
      setLocation(getPostLoginHome(user));
      return;
    }
    if (allowed) {
      hasWarnedRef.current = false;
    }
  }, [allowed, isLoading, user, setLocation, toast]);

  if (isLoading) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
