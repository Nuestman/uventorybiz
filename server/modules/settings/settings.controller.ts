import type { IStorage } from "../../storage";
import { isPocEligibleCategory } from "@shared/poc";

export interface TenantSettingsResponse {
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

export type TenantSettingsUpdate = Partial<{
  currencyCode: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  faviconUrl: string | null;
  returnsEnabled: boolean;
  pocTestingEnabled: boolean;
}>;

export type SettingsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function toResponse(tenant: {
  id: string;
  name: string;
  currencyCode?: string | null;
  appName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  faviconUrl?: string | null;
  returnsEnabled?: boolean | null;
  pocTestingEnabled?: boolean | null;
  businessCategory?: string | null;
}): TenantSettingsResponse {
  const businessCategory = tenant.businessCategory || "other";
  // POC is only meaningful for pharmacy/lab categories — never report enabled otherwise.
  const pocEligible = isPocEligibleCategory(businessCategory);
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    currencyCode: tenant.currencyCode ?? "GHS",
    appName: tenant.appName ?? null,
    logoUrl: tenant.logoUrl ?? null,
    primaryColor: tenant.primaryColor ?? null,
    faviconUrl: tenant.faviconUrl ?? null,
    returnsEnabled: tenant.returnsEnabled !== false,
    pocTestingEnabled: pocEligible && tenant.pocTestingEnabled === true,
    businessCategory,
  };
}

/**
 * Settings controller: get and update tenant-scoped system settings
 * (currency, white labeling). Scoped by tenantId from request.
 */
export function createSettingsController(storage: IStorage) {
  return {
    async get(tenantId: string): Promise<SettingsResult<TenantSettingsResponse> | { ok: false; error: string; code: "NO_TENANT" }> {
      if (!tenantId) return { ok: false, error: "No tenant context", code: "NO_TENANT" };
      try {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return { ok: false, error: "Tenant not found", code: "NOT_FOUND" };
        return { ok: true, data: toResponse(tenant) };
      } catch (err) {
        console.error("Settings controller get:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load settings",
        };
      }
    },

    async update(
      tenantId: string,
      body: TenantSettingsUpdate
    ): Promise<SettingsResult<TenantSettingsResponse> | { ok: false; error: string; code: string }> {
      if (!tenantId) return { ok: false, error: "No tenant context", code: "NO_TENANT" };
      try {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return { ok: false, error: "Tenant not found", code: "NOT_FOUND" };

        if (
          typeof body.pocTestingEnabled === "boolean" &&
          body.pocTestingEnabled &&
          !isPocEligibleCategory(tenant.businessCategory)
        ) {
          return {
            ok: false,
            error: "Point-of-care lab testing is only available for pharmacies and laboratories",
            code: "POC_CATEGORY_REQUIRED",
          };
        }

        const updatePayload: Record<string, unknown> = {};
        if (body.currencyCode !== undefined) updatePayload.currencyCode = body.currencyCode;
        if (body.appName !== undefined) updatePayload.appName = body.appName;
        if (body.logoUrl !== undefined) updatePayload.logoUrl = body.logoUrl;
        if (body.primaryColor !== undefined) updatePayload.primaryColor = body.primaryColor;
        if (body.faviconUrl !== undefined) updatePayload.faviconUrl = body.faviconUrl;
        if (typeof body.returnsEnabled === "boolean") updatePayload.returnsEnabled = body.returnsEnabled;
        if (typeof body.pocTestingEnabled === "boolean") updatePayload.pocTestingEnabled = body.pocTestingEnabled;
        const updated = await storage.updateTenant(tenantId, updatePayload as any);
        return { ok: true, data: toResponse(updated) };
      } catch (err) {
        console.error("Settings controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update settings",
        };
      }
    },
  };
}

export type SettingsController = ReturnType<typeof createSettingsController>;
