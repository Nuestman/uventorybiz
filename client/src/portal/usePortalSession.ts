import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

export type PortalSessionPayload = {
  features: {
    appointments: boolean;
    vitals: boolean;
    symptoms: boolean;
    visits: boolean;
    healthProfile: boolean;
    employeeProfile: boolean;
    messaging: boolean;
    medications: boolean;
    /** Platform tickets flag — enables Support / system-issue reporting. */
    tickets: boolean;
  };
  user: {
    email: string;
    partyType: "customer" | "supplier";
    customerId?: string | null;
    supplierId?: string | null;
    patientId?: string | null;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    /** Same as employees.profile_image_url when linked to an employee record. */
    profileImageUrl?: string | null;
    jobTitle?: string | null;
    phoneNumber?: string | null;
  };
  tenant: {
    id: string;
    name: string;
    appName: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    /** Whether the business accepts return requests on completed orders. */
    returnsEnabled?: boolean;
  };
  tenantContact?: {
    email: string;
    phone: string | null;
  };
  supportEmail: string | null;
  supportPhone: string | null;
  privacyPolicyUrl: string | null;
};

const SESSION_KEY = ["/api/portal/auth/session"] as const;

export function usePortalSession() {
  const { data, isLoading, error, refetch } = useQuery<PortalSessionPayload | null>({
    queryKey: SESSION_KEY,
    queryFn: getQueryFn<PortalSessionPayload | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 60 * 1000,
  });

  return {
    session: data ?? null,
    isLoading,
    error,
    refetch,
    isAuthenticated: !!data,
  };
}

export function usePortalLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

export { SESSION_KEY as PORTAL_SESSION_QUERY_KEY };
