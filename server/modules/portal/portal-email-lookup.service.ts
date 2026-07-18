import type { PortalEmailLookupResult, PortalEmailLookupStatus } from "@shared/portalEmailLookup";
import type { portalUsers } from "@shared/schema";
import * as repo from "./portal.repository";

type PortalUserRow = typeof portalUsers.$inferSelect;

function messageForStatus(status: PortalEmailLookupStatus, tenantName: string, email: string): string {
  switch (status) {
    case "portal_active":
      return `We found your portal account at ${tenantName}. Check ${email} for a sign-in link.`;
    case "portal_suspended":
      return `Your portal account at ${tenantName} is suspended. Contact your organization for assistance.`;
    case "portal_locked":
      return `Your portal account is temporarily locked. Contact ${tenantName} for assistance.`;
    case "record_no_account":
      return `We found ${email} on file at ${tenantName}, but no portal account yet. Submit a request and your organization will activate access.`;
    case "not_found":
      return `No customer, supplier, or portal account matches ${email} at ${tenantName}. Check the address or contact your organization.`;
    case "ambiguous":
      return "Multiple organizations use this email. Open the portal using the personalized link from your organization.";
    case "portal_disabled":
      return "The customer/supplier portal is not available for this organization.";
    case "org_required":
      return "Use your organization's personalized portal link (with organization code) so we can locate your account.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function resultFromPortalUser(
  portalUser: PortalUserRow,
  tenantId: string,
  tenantName: string,
  supportEmail: string | null,
  emailLower: string,
): PortalEmailLookupResult {
  const party = {
    customerId: portalUser.customerId ?? undefined,
    supplierId: portalUser.supplierId ?? undefined,
  };
  if (portalUser.status === "suspended") {
    return {
      status: "portal_suspended",
      tenantId,
      tenantName,
      supportEmail,
      ...party,
      portalUserId: portalUser.id,
      message: messageForStatus("portal_suspended", tenantName, emailLower),
    };
  }
  if (
    portalUser.status === "locked" ||
    (portalUser.lockedUntil && portalUser.lockedUntil > new Date())
  ) {
    return {
      status: "portal_locked",
      tenantId,
      tenantName,
      supportEmail,
      ...party,
      portalUserId: portalUser.id,
      message: messageForStatus("portal_locked", tenantName, emailLower),
    };
  }
  return {
    status: "portal_active",
    tenantId,
    tenantName,
    supportEmail,
    ...party,
    portalUserId: portalUser.id,
    message: messageForStatus("portal_active", tenantName, emailLower),
  };
}

/**
 * Resolve an email within one tenant. Portal parties are customers and suppliers —
 * an email matches when it belongs to an existing portal account, a customer record,
 * or a supplier record.
 */
async function lookupInTenant(
  tenantId: string,
  emailLower: string,
): Promise<PortalEmailLookupResult | null> {
  const settings = await repo.getTenantPortalSettingsRow(tenantId);
  if (!settings?.enabled) {
    return {
      status: "portal_disabled",
      tenantId,
      message: messageForStatus("portal_disabled", "this organization", emailLower),
    };
  }

  const tenant = await repo.getTenantById(tenantId);
  const tenantName = tenant?.name ?? "Your organization";
  const supportEmail = settings.supportEmail ?? null;

  const portalUser = await repo.findPortalUserByEmail(tenantId, emailLower);
  if (portalUser) {
    return resultFromPortalUser(portalUser, tenantId, tenantName, supportEmail, emailLower);
  }

  const customerMatch = await repo.findCustomerByEmail(tenantId, emailLower);
  if (customerMatch) {
    const portalByCustomer = await repo.findPortalUserByCustomerId(tenantId, customerMatch.id);
    if (portalByCustomer) {
      return resultFromPortalUser(portalByCustomer, tenantId, tenantName, supportEmail, emailLower);
    }
    return {
      status: "record_no_account",
      tenantId,
      tenantName,
      supportEmail,
      customerId: customerMatch.id,
      message: messageForStatus("record_no_account", tenantName, emailLower),
    };
  }

  const supplierMatch = await repo.findSupplierByEmail(tenantId, emailLower);
  if (supplierMatch) {
    const portalBySupplier = await repo.findPortalUserBySupplierId(tenantId, supplierMatch.id);
    if (portalBySupplier) {
      return resultFromPortalUser(portalBySupplier, tenantId, tenantName, supportEmail, emailLower);
    }
    return {
      status: "record_no_account",
      tenantId,
      tenantName,
      supportEmail,
      supplierId: supplierMatch.id,
      message: messageForStatus("record_no_account", tenantName, emailLower),
    };
  }

  return {
    status: "not_found",
    tenantId,
    tenantName,
    supportEmail,
    message: messageForStatus("not_found", tenantName, emailLower),
  };
}

export async function resolvePortalEmailLookup(input: {
  email: string;
  slug?: string;
  tenantId?: string;
}): Promise<PortalEmailLookupResult> {
  const emailLower = input.email.trim().toLowerCase();
  let tenantId = input.tenantId;

  if (input.slug?.trim()) {
    const tenant = await repo.findTenantByPortalSlug(input.slug.trim());
    if (!tenant) {
      return {
        status: "not_found",
        message: "Unknown organization. Check your organization's portal link.",
      };
    }
    tenantId = tenant.id;
  }

  if (tenantId) {
    const result = await lookupInTenant(tenantId, emailLower);
    return result ?? { status: "not_found", message: "Email not found." };
  }

  const matches = await repo.findPortalEmailTenantMatches(emailLower);
  if (matches.length === 0) {
    return {
      status: "org_required",
      message: messageForStatus("org_required", "", emailLower),
    };
  }
  if (matches.length > 1) {
    return {
      status: "ambiguous",
      message: messageForStatus("ambiguous", "", emailLower),
    };
  }

  const result = await lookupInTenant(matches[0].tenantId, emailLower);
  return result ?? { status: "not_found", message: "Email not found." };
}

export async function resolvePortalTenantForPublicRequest(input: {
  email: string;
  slug?: string;
}): Promise<
  | { ok: true; tenantId: string; tenantName: string; supportEmail: string | null; lookup: PortalEmailLookupResult }
  | { ok: false; lookup: PortalEmailLookupResult }
> {
  const lookup = await resolvePortalEmailLookup(input);
  if (!lookup.tenantId) {
    return { ok: false, lookup };
  }
  if (lookup.status === "portal_disabled" || lookup.status === "ambiguous" || lookup.status === "org_required") {
    return { ok: false, lookup };
  }
  return {
    ok: true,
    tenantId: lookup.tenantId,
    tenantName: lookup.tenantName ?? "Your organization",
    supportEmail: lookup.supportEmail ?? null,
    lookup,
  };
}
