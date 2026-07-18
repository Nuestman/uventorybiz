import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginHome, hasStaffAccess } from "@/routes";
import { useEffect, useRef, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Wraps routes that show patient-identifiable or staff-facing data.
 * Uses a toast + soft redirect instead of a disruptive access-denied page.
 */
export function RequireStaffAccess({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const hasWarnedRef = useRef(false);

  const allowed = hasStaffAccess(user?.role);

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
