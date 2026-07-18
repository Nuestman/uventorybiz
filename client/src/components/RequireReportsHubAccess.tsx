import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginHome, hasReportsHubAccess } from "@/routes";
import { useEffect, useRef, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

/** Reports landing: clinical staff, admins, or safety roles that can open incident analytics. */
export function RequireReportsHubAccess({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const hasWarnedRef = useRef(false);

  const allowed = hasReportsHubAccess(user?.role);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed && user !== null && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: "Access limited",
        description: "You do not have permission to open the reports hub.",
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
