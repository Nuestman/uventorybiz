import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CareLocation {
  id: string;
  name: string;
  code: string;
}

interface CurrentSession {
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  tenant: {
    id: string;
    name: string;
    hasMultipleLocations: boolean;
  } | null;
  activeLocation: CareLocation | null;
  sessionStart: string;
}

export function useActiveLocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasRedirected = useRef(false);

  // Fetch current session including active location
  const { data: session, isLoading, error, refetch } = useQuery<CurrentSession>({
    queryKey: ["/api/auth/current-session"],
    queryFn: getQueryFn<CurrentSession>({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always fetch fresh - no caching
    gcTime: 0, // Don't keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Handle 401 errors - just cancel queries, don't redirect automatically
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      // Prevent multiple notifications
      if (hasRedirected.current) return;
      hasRedirected.current = true;

      // Cancel all ongoing queries
      queryClient.cancelQueries({ queryKey: ["/api/auth/current-session"] });
      
      // Show notification
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
    } else if (!error && hasRedirected.current) {
      // Reset redirect flag if error is cleared (user logged in)
      hasRedirected.current = false;
    }
  }, [error, toast, queryClient]);

  // Debug logging
  useEffect(() => {
    if (session) {
      console.log('useActiveLocation - Session data:', session);
      console.log('useActiveLocation - isMultiLocation:', session?.tenant?.hasMultipleLocations);
    }
  }, [session]);

  // Select location mutation
  const selectLocationMutation = useMutation({
    mutationFn: async ({ locationId, reason }: { locationId: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/auth/select-location", {
        locationId,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-session"] });
      toast({
        title: "Location Set",
        description: "Your working location has been set successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set working location.",
        variant: "destructive",
      });
    },
  });

  // Switch location mutation
  const switchLocationMutation = useMutation({
    mutationFn: async ({ newLocationId, reason }: { newLocationId: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/auth/switch-location", {
        newLocationId,
        reason,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-session"] });
      toast({
        title: "Location Changed",
        description: `Now working at: ${data.newLocation.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch location.",
        variant: "destructive",
      });
    },
  });

  return {
    // Current location info
    activeLocation: session?.activeLocation || null,
    locationName: session?.activeLocation?.name || null,
    locationCode: session?.activeLocation?.code || null,
    locationId: session?.activeLocation?.id || null,
    
    // Tenant info
    tenant: session?.tenant || null,
    isMultiLocation: session?.tenant?.hasMultipleLocations || false,
    
    // User info
    user: session?.user || null,
    
    // Session info
    sessionStart: session?.sessionStart || null,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    selectLocation: selectLocationMutation.mutate,
    switchLocation: switchLocationMutation.mutate,
    isSelecting: selectLocationMutation.isPending,
    isSwitching: switchLocationMutation.isPending,
    refreshLocation: refetch,
  };
}

