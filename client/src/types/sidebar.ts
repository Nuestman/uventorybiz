import { LucideIcon } from "lucide-react";

/**
 * User roles in the system
 */
export type UserRole = 'fleet_operator' | 'staff' | 'operations' | 'admin' | 'super_admin';

/**
 * RBAC requirements for sidebar items
 */
export interface SidebarItemRBAC {
  /** Minimum role required to see this item */
  minRole?: UserRole;
  /** Specific roles that can access this item */
  allowedRoles?: UserRole[];
  /** Whether user must have a tenantId (tenant-bound) */
  requiresTenant?: boolean;
  /** Whether user must NOT have a tenantId (super admin only) */
  requiresNoTenant?: boolean;
}

/**
 * Tab navigation item for pages with tabs
 */
export interface TabNavigationItem {
  /** Tab value/identifier */
  value: string;
  /** Display title */
  title: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** URL hash or query param to activate this tab */
  urlHash?: string;
  /** Full path for this tab (overrides `parent.url` + `urlHash`), e.g. `/super-admin/dashboard` */
  fullPath?: string;
}

/**
 * Base sidebar navigation item
 */
export interface SidebarNavItem {
  /** Display title */
  title: string;
  /** URL path */
  url: string;
  /** Icon component */
  icon: LucideIcon;
  /** Description/tooltip */
  description?: string;
  /** RBAC requirements */
  rbac?: SidebarItemRBAC;
  /** Tab navigation items (if this page has tabs) */
  tabs?: TabNavigationItem[];
  /** Platform feature flag key; the item is hidden when the flag is disabled */
  featureFlag?: string;
  /** Tenant settings boolean key (e.g. "pocTestingEnabled"); the item is hidden when the business has the feature off */
  tenantFeature?: string;
}

/**
 * Sidebar group configuration
 */
export interface SidebarGroupConfig {
  /** Group label */
  label: string;
  /** Group icon (for collapsed state) */
  icon?: LucideIcon;
  /** Items in this group */
  items: SidebarNavItem[];
  /** RBAC requirements for the entire group */
  rbac?: SidebarItemRBAC;
  /** Whether this group should be a dropdown */
  isDropdown?: boolean;
}

/**
 * Check if user has access to a sidebar item based on RBAC
 */
export function hasAccess(
  item: SidebarNavItem | SidebarGroupConfig,
  userRole?: UserRole | null,
  userTenantId?: string | null
): boolean {
  const rbac = item.rbac;
  if (!rbac) return true; // No restrictions

  // Check tenant requirements
  if (rbac.requiresTenant && !userTenantId) return false;
  if (rbac.requiresNoTenant && userTenantId) return false;

  // Check role requirements
  if (rbac.allowedRoles) {
    if (!userRole || !rbac.allowedRoles.includes(userRole)) return false;
  } else if (rbac.minRole) {
    const roleHierarchy: Record<UserRole, number> = {
      fleet_operator: 1,
      staff: 1,
      operations: 2,
      admin: 3,
      super_admin: 4,
    };
    if (!userRole || roleHierarchy[userRole] < roleHierarchy[rbac.minRole]) {
      return false;
    }
  }

  return true;
}

/**
 * Filter sidebar items based on user's role and tenant
 */
export function filterSidebarItems<T extends SidebarNavItem>(
  items: T[],
  userRole?: UserRole | null,
  userTenantId?: string | null
): T[] {
  return items.filter(item => hasAccess(item, userRole, userTenantId));
}
