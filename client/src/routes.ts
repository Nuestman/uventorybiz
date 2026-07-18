/**
 * Single source of truth for route paths, protection (auth required), and role requirements.
 * Used by ProtectedRouteGuard and RequireRole to enforce auth and role-based access.
 */

export type RouteRole = "admin" | "super_admin";

/** Roles that may use patient/staff UI and PHI APIs (aligned with server `requireStaffAccess`). */
export const STAFF_ACCESS_ROLES = ["staff", "admin", "super_admin"] as const;

/** @deprecated Use STAFF_ACCESS_ROLES */
export const CLINICAL_ACCESS_ROLES = STAFF_ACCESS_ROLES;

export function hasStaffAccess(userRole: string | null | undefined): boolean {
  if (userRole == null || userRole === "") return false;
  return (STAFF_ACCESS_ROLES as readonly string[]).includes(userRole);
}

/** @deprecated Use hasStaffAccess */
export const hasClinicalAccess = hasStaffAccess;

/** Occupational incident analytics (`/reports/incidents`, `GET /api/reports/incidents`). */
export const INCIDENT_REPORTS_ACCESS_ROLES = ["staff", "admin", "operations", "super_admin"] as const;

export function hasIncidentReportsAccess(userRole: string | null | undefined): boolean {
  if (userRole == null || userRole === "") return false;
  return (INCIDENT_REPORTS_ACCESS_ROLES as readonly string[]).includes(userRole);
}

/** Operations analytics (`/reports/operations`, `GET /api/reports/operations`) is admin-focused in v1. */
export const OPERATIONS_REPORTS_ACCESS_ROLES = ["admin", "super_admin"] as const;

export function hasOperationsReportsAccess(userRole: string | null | undefined): boolean {
  if (userRole == null || userRole === "") return false;
  return (OPERATIONS_REPORTS_ACCESS_ROLES as readonly string[]).includes(userRole);
}

/** Compliance & audit aggregates (`/reports/compliance`, `GET /api/reports/compliance`). Aligned with tenant admin in v1. */
export const COMPLIANCE_REPORTS_ACCESS_ROLES = ["admin", "super_admin"] as const;

export function hasComplianceReportsAccess(userRole: string | null | undefined): boolean {
  if (userRole == null || userRole === "") return false;
  return (COMPLIANCE_REPORTS_ACCESS_ROLES as readonly string[]).includes(userRole);
}

export function hasReportsHubAccess(userRole: string | null | undefined): boolean {
  return (
    hasStaffAccess(userRole) ||
    hasIncidentReportsAccess(userRole) ||
    hasOperationsReportsAccess(userRole) ||
    hasComplianceReportsAccess(userRole)
  );
}

/** Fleet module: vehicle register, pre-start checks, unit detail (aligned with server `requireFleetModuleAccess`). */
export const FLEET_MODULE_ROLES = ["fleet_operator", "staff", "admin", "super_admin"] as const;

/** @deprecated Use FLEET_MODULE_ROLES */
export const AMBULANCE_MODULE_ROLES = FLEET_MODULE_ROLES;

export function hasFleetModuleAccess(userRole: string | null | undefined): boolean {
  if (userRole == null || userRole === "") return false;
  return (FLEET_MODULE_ROLES as readonly string[]).includes(userRole);
}

/** @deprecated Use hasFleetModuleAccess */
export const hasAmbulanceModuleAccess = hasFleetModuleAccess;

/**
 * Default app entry after sign-in (and for “go home” redirects).
 * Global platform super admins use the system console, not the tenant dashboard.
 */
export function getPostLoginHome(user: {
  role?: string | null;
  tenantId?: string | null;
} | null | undefined): string {
  if (user?.role === "super_admin" && !user?.tenantId) return "/super-admin/dashboard";
  if (user?.role === "fleet_operator" && user?.tenantId) return "/fleet";
  if (user && !hasStaffAccess(user.role)) return "/operational-duties";
  return "/dashboard";
}

export interface RouteConfig {
  path: string;
  /** If true, route is public (no auth required). Default false = protected. */
  public?: boolean;
  /** If set, user must have this role (or super_admin) to access. */
  requiredRole?: RouteRole;
}

/** Paths that require authentication (no role required beyond being logged in). */
const PROTECTED_PATHS = [
  "/dashboard",
  "/notifications",
  "/patients",
  "/patient",
  "/appointments",
  "/telecare",
  "/messages",
  "/records",
  "/reports",
  "/incidents",
  "/interop",
  "/operations/ambulances",
  "/fleet",
  "/ambulance",
  "/operational-duties",
  "/tickets",
  "/assignment-history",
  "/shiftover",
  "/audit-trail",
  "/encounter",
  "/medical-visit",
  "/interop",
  "/inventory",
  "/pos",
  "/sales",
  "/orders",
  "/stock-transfers",
  "/equipment-tracking",
  "/purchase-orders",
  "/suppliers",
  "/inventory-transactions",
  "/transaction-history",
  "/testing",
  "/wellbeing",
  "/our-people",
  "/admin",
  "/super-admin",
  "/super-admin/dashboard",
  "/profile",
  "/settings",
  "/docs",
  "/sop",
  "/admin/sops",
  "/admin/legal-agreements",
];

/** Paths that do not require authentication. */
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/contacts",
  "/features",
  "/auth",
  "/auth/super-admin",
  "/activate",
  "/unauthorized",
  "/access-denied",
  "/feedback",
  "/privacy",
  "/terms",
  "/security",
  "/changelog",
  "/legal",
  "/portal",
  "/portal/login",
];

/** Routes that require a specific role. Super_admin can access admin routes. */
const ROLE_ROUTES: Record<string, RouteRole> = {
  "/admin": "admin",
  "/super-admin": "super_admin",
};

export function getProtectedPaths(): string[] {
  return PROTECTED_PATHS;
}

export function getPublicPaths(): string[] {
  return PUBLIC_PATHS;
}

/** Returns the role required for this path, or null if no role required. */
export function getRequiredRoleForPath(pathname: string): RouteRole | null {
  for (const [path, role] of Object.entries(ROLE_ROUTES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return role;
  }
  return null;
}

/** True if pathname is protected (requires auth). */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((route) => pathname.startsWith(route));
}

/** True if pathname is public (no auth). */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

/** True if user role satisfies the required role (super_admin can access admin routes). */
export function hasRoleFor(userRole: string | null | undefined, required: RouteRole): boolean {
  if (userRole == null || userRole === "") return false;
  if (required === "super_admin") return userRole === "super_admin";
  if (required === "admin") return userRole === "admin" || userRole === "super_admin";
  return false;
}
