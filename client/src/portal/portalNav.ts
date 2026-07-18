import type { LucideIcon } from "lucide-react";

import { CalendarDays, FileText, Home, MessageSquare, Package, Settings, ShoppingBag } from "lucide-react";

import { PORTAL_DASHBOARD, PORTAL_ORDERS, PORTAL_SHOP, PORTAL_SUPPLIER_ORDERS } from "./portalRoutes";

import type { PortalSessionPayload } from "./usePortalSession";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function buildPortalNav(session: PortalSessionPayload | null): PortalNavItem[] {
  if (!session) return [];

  const hasPatientBridge = !!session.user.patientId;
  const isCustomer = !!session.user.customerId;
  const isSupplier = !!session.user.supplierId;

  const items: Array<PortalNavItem & { enabled: boolean }> = [
    { href: PORTAL_DASHBOARD, label: "Dashboard", icon: Home, enabled: true },
    { href: PORTAL_SHOP, label: "Shop", icon: ShoppingBag, enabled: isCustomer },
    { href: PORTAL_ORDERS, label: "My orders", icon: Package, enabled: isCustomer },
    {
      href: PORTAL_SUPPLIER_ORDERS,
      label: "Purchase orders",
      icon: FileText,
      enabled: isSupplier,
    },
    {
      href: "/portal/appointments",
      label: "Appointments",
      icon: CalendarDays,
      enabled: session.features.appointments && hasPatientBridge,
    },
    {
      href: "/portal/messages",
      label: "Messages",
      icon: MessageSquare,
      enabled: session.features.messaging && hasPatientBridge,
    },
    { href: "/portal/profile", label: "Settings", icon: Settings, enabled: true },
  ];

  return items.filter((item) => item.enabled).map(({ enabled: _enabled, ...item }) => item);
}

export function isPortalNavActive(loc: string, href: string): boolean {
  if (href === PORTAL_DASHBOARD) return loc === PORTAL_DASHBOARD || loc === `${PORTAL_DASHBOARD}/`;

  if (href === "/portal/appointments") {
    return loc.startsWith("/portal/appointments");
  }

  return loc === href || loc.startsWith(`${href}/`);
}

export function getPortalPageTitle(loc: string): string {
  if (loc === PORTAL_DASHBOARD || loc === `${PORTAL_DASHBOARD}/`) return "Dashboard";

  if (loc.startsWith("/portal/profile")) return "Settings";

  if (loc.startsWith("/portal/shop")) return "Shop";

  if (loc.startsWith("/portal/orders")) return "My orders";

  if (loc.startsWith("/portal/purchase-orders")) return "Purchase orders";

  if (loc.startsWith("/portal/appointments")) return "Appointments";

  if (loc.startsWith("/portal/messages")) return "Messages";

  return "Customer & supplier portal";
}
