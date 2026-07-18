import type { IStorage } from "../../storage";
import type { Tenant, UpsertTenant } from "@shared/schema";
import { isPocEligibleCategory } from "@shared/poc";

export type TenantResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Response for POST /tenants (create tenant + default company) */
export interface CreateTenantResponse {
  tenant: Tenant;
  company: Awaited<ReturnType<IStorage["createCompany"]>>;
}

/**
 * Tenants controller: create (tenant + company), verify, update (with audit and default location).
 * No req/res; returns result objects.
 */
export function createTenantsController(storage: IStorage) {
  return {
    async create(body: {
      name: string;
      description?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      planType?: string;
      businessCategory?: string;
      pocTestingEnabled?: boolean;
    }): Promise<TenantResult<CreateTenantResponse>> {
      try {
        const tenantData: UpsertTenant = {
          name: body.name,
          contactEmail: body.contactEmail ?? "",
          contactPhone: body.contactPhone,
          address: body.address,
          planType: body.planType,
          businessCategory: body.businessCategory || "other",
          pocTestingEnabled:
            body.pocTestingEnabled === true && isPocEligibleCategory(body.businessCategory),
          status: "pending",
        };
        const tenant = await storage.createTenant(tenantData);
        const company = await storage.createCompany(
          {
            name: body.name || "Default Company",
            contactEmail: body.contactEmail ?? "",
            contactPhone: body.contactPhone,
            address: body.address,
            companyType: "primary_contractor",
            status: "active",
          },
          tenant.id
        );
        return { ok: true, data: { tenant, company } };
      } catch (err) {
        console.error("Tenants controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create tenant",
        };
      }
    },

    async verify(
      id: string
    ): Promise<TenantResult<{ id: string; name: string; exists: true }> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const tenant = await storage.getTenant(id);
        if (!tenant) return { ok: false, error: "Organization not found", code: "NOT_FOUND" };
        return { ok: true, data: { id: tenant.id, name: tenant.name, exists: true } };
      } catch (err) {
        console.error("Tenants controller verify:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to verify organization",
        };
      }
    },

    async update(
      id: string,
      userId: string,
      tenantId: string,
      performedByLabel: string,
      body: Partial<UpsertTenant>
    ): Promise<TenantResult<Tenant> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const originalTenant = await storage.getTenant(id);
        if (!originalTenant) return { ok: false, error: "Tenant not found", code: "NOT_FOUND" };
        const updatedTenant = await storage.updateTenant(id, body);
        if (updatedTenant.hasMultipleLocations) {
          const locations = await storage.getCareLocations(id, { includeInactive: true });
          if (locations.length === 0) {
            await storage.createDefaultCareLocationForTenant(id);
          }
        }
        await storage.auditAdminOperation(
          "update",
          "tenant",
          id,
          userId,
          tenantId,
          originalTenant,
          { updatedTenant },
          { performedBy: performedByLabel, action: "Updated tenant settings", changes: body }
        );
        return { ok: true, data: updatedTenant };
      } catch (err) {
        console.error("Tenants controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update tenant",
        };
      }
    },
  };
}

export type TenantsController = ReturnType<typeof createTenantsController>;
