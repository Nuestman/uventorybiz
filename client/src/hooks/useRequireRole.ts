import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { RouteRole } from "@/routes";
import { getRequiredRoleForPath, hasRoleFor } from "@/routes";

/**
 * Hook that checks if the current user has the required role for the current path.
 * Use when rendering role-gated content. Redirects to /access-denied if not allowed.
 * @returns { allowed: boolean } - true if user has required role (or path has no role requirement)
 */
export function useRequireRole(): { allowed: boolean } {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const requiredRole = getRequiredRoleForPath(location);

  if (isLoading || !requiredRole) {
    return { allowed: true };
  }

  const allowed = hasRoleFor(user?.role, requiredRole);
  if (!allowed && user !== null) {
    setLocation("/access-denied");
    return { allowed: false };
  }

  return { allowed };
}
