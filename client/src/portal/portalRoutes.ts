/** Central portal frontend paths — use these instead of string literals. */
export const PORTAL_HOME = "/portal";
export const PORTAL_DASHBOARD = "/portal/dashboard";
export const PORTAL_LOGIN = "/portal/login";
export const PORTAL_APPOINTMENTS = "/portal/appointments";
export const PORTAL_MESSAGES = "/portal/messages";
export const PORTAL_PROFILE = "/portal/profile";
export const PORTAL_SHOP = "/portal/shop";
export const PORTAL_ORDERS = "/portal/orders";
export const PORTAL_SUPPLIER_ORDERS = "/portal/purchase-orders";

export function portalSignInUrl(params?: { org?: string; error?: string }): string {
  const q = new URLSearchParams();
  q.set("signin", "1");
  if (params?.org) q.set("org", params.org);
  if (params?.error) q.set("error", params.error);
  return `${PORTAL_HOME}?${q.toString()}`;
}

export function portalAccessRequestUrl(): string {
  return `${PORTAL_HOME}?access=1`;
}

export function portalAppointmentRequestUrl(): string {
  return `${PORTAL_APPOINTMENTS}?request=1`;
}
