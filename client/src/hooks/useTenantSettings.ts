import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";

export interface TenantSettings {
  tenantId: string;
  tenantName: string;
  currencyCode: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  faviconUrl: string | null;
  /** Whether the business accepts returns/refunds (POS returns + portal return requests). */
  returnsEnabled: boolean;
  /** Whether the business offers point-of-care lab testing (instant tests). */
  pocTestingEnabled: boolean;
  /** Business category key (pharmacy, laboratory, retail, …). */
  businessCategory: string;
}

/**
 * Fetches tenant-scoped settings (currency, white labeling).
 * Used to display currency on inventory, POs, transactions, etc.
 * When user has no tenant (e.g. super_admin), currency falls back to GHS.
 */
export function useTenantSettings() {
  const { user } = useAuth();
  const hasTenant = !!user?.tenantId;

  const { data: settings, isLoading } = useQuery<TenantSettings | null>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn<TenantSettings | null>({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
    enabled: hasTenant,
  });

  const currencyCode = settings?.currencyCode ?? "GHS";

  const formatCurrency = (amount: number | string) =>
    formatCurrencyUtil(amount, currencyCode);

  return {
    settings: settings ?? null,
    currencyCode,
    formatCurrency,
    isLoading: hasTenant && isLoading,
  };
}
