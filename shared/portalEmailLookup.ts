/** Public portal email lookup outcomes (sign-in + access request). */
export type PortalEmailLookupStatus =
  | "portal_active"
  | "portal_suspended"
  | "portal_locked"
  /** Email matches a customer or supplier record without a portal account yet. */
  | "record_no_account"
  | "not_found"
  | "ambiguous"
  | "portal_disabled"
  | "org_required";

export type PortalEmailLookupResult = {
  status: PortalEmailLookupStatus;
  tenantId?: string;
  tenantName?: string;
  supportEmail?: string | null;
  /** Matched party record (customers/suppliers are the only portal parties). */
  customerId?: string;
  supplierId?: string;
  portalUserId?: string;
  message: string;
};

export type PortalAccessRequestKind = "new_access" | "sign_in_help";

export type PortalAccessRequestStatus = "pending" | "approved" | "rejected";
