import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "@/types/auth";
import { offlineStore } from "@/lib/offlineStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { isPublicPath } from "@/routes";

export function useAuth() {
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const hasRedirected = useRef(false);
  const didHardRedirectToLogin = useRef(false);
  const [cachedUser, setCachedUser] = useState<AuthUser | null>(null);

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Changed to false to prevent infinite loops
    refetchOnReconnect: false,
  });

  // While online, trust the API session only. Cached user is for offline UX only — otherwise a 401
  // still leaves isAuthenticated true and the app shell + bad redirects (e.g. /api/login) break routing.
  const effectiveUser = useMemo(() => {
    if (user) return user;
    if (!isOnline && cachedUser) return cachedUser;
    return null;
  }, [user, cachedUser, isOnline]);

  // Load cached auth user (for offline usage) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await offlineStore.getMeta<AuthUser>("authUser");
        if (!cancelled && stored) {
          setCachedUser(stored);
        }
      } catch {
        // ignore cache errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Drop stale offline identity when the server says we're logged out while online
  useEffect(() => {
    if (isLoading) return;
    if (!isOnline) return;
    if (user) return;
    setCachedUser(null);
    offlineStore.setMeta("authUser", null).catch(() => {
      // ignore cache errors
    });
  }, [isLoading, isOnline, user]);

  // Full navigation to SPA login — avoids staying on /dashboard with a "fake" session from cache,
  // and replaces legacy /api/login (not a client route) which produced 404 inside MainLayout.
  useEffect(() => {
    if (isLoading) return;
    if (!isOnline) return;
    if (user != null) {
      didHardRedirectToLogin.current = false;
      return;
    }

    const path = window.location.pathname;
    if (path.startsWith("/portal")) return;
    if (isPublicPath(path)) return;

    if (didHardRedirectToLogin.current) return;
    didHardRedirectToLogin.current = true;

    const returnTo = `${path}${window.location.search}`;
    window.location.replace(
      `/auth?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, [isLoading, isOnline, user]);

  // Handle 401 / session errors — toast only when we're not about to hard-redirect (public routes)
  useEffect(() => {
    if (isLoading) return;

    if (user === null) {
      if (!isOnline) {
        return;
      }
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/portal")) {
        return;
      }
      if (isPublicPath(currentPath)) {
        return;
      }
      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      if (!hasRedirected.current) {
        hasRedirected.current = true;
        toast({
          title: "Authentication Required",
          description: "Redirecting to sign in…",
          variant: "destructive",
        });
      }
    } else if (error && isUnauthorizedError(error)) {
      if (hasRedirected.current) return;
      hasRedirected.current = true;

      queryClient.setQueryData(["/api/auth/user"], null);

      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
    } else if (user && hasRedirected.current) {
      hasRedirected.current = false;
    }
  }, [error, user, isLoading, toast, isOnline]);

  // Persist latest authenticated user to offline cache
  useEffect(() => {
    if (!user) return;
    offlineStore.setMeta("authUser", user).catch(() => {
      // ignore cache errors
    });
    setCachedUser(user);
  }, [user]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Set user to null first to prevent refetch
      queryClient.setQueryData(["/api/auth/user"], null);

      // Cancel any ongoing queries
      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      // Clear all cache data
      queryClient.clear();

      // Clear any local storage/session storage
      localStorage.clear();
      sessionStorage.clear();
      offlineStore.setMeta("authUser", null).catch(() => {
        // ignore cache errors
      });
      setCachedUser(null);

      toast({
        title: "Logged out successfully",
        description: "You have been logged out",
        variant: "default",
      });

      // Force redirect to landing page after logout
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      // Even on error, clear cache (logout should always work)
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      offlineStore.setMeta("authUser", null).catch(() => {
        // ignore cache errors
      });
      setCachedUser(null);

      toast({
        title: "Logged out",
        description: "You have been logged out",
        variant: "default",
      });

      // Force redirect even on error
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
  });

  return {
    user: effectiveUser,
    isLoading,
    isAuthenticated: !!effectiveUser,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
