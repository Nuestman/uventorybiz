import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getPostLoginHome, hasFleetModuleAccess } from "@/routes";
import { useEffect, useRef, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Wraps Fleet routes (vehicle register, pre-start checks, unit detail).
 */
export function RequireFleetAccess({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const hasWarnedRef = useRef(false);

  const allowed = hasFleetModuleAccess(user?.role);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed && user !== null && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast({
        title: "Access limited",
        description: "You do not have permission to open the Fleet module.",
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
