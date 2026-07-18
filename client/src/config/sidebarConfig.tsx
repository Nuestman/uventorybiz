import {
  Home,
  Users,
  UsersRound,
  Calendar,
  FileText,
  AlertTriangle,
  Clock,
  History,
  ClipboardList,
  Package,
  Wrench,
  ShoppingCart,
  Store,
  ArrowRightLeft,
  Truck,
  TestTube,
  FlaskConical,
  BarChart3,
  Activity,
  ClipboardCheck,
  Shield,
  ShieldCheck,
  Settings,
  Cog,
  BookOpen,
  Building2,
  PhoneCall,
  MessageSquare,
  Ambulance,
  Ticket,
  ReceiptText,
  ScrollText,
  Scale,
  Handshake,
  ListTodo,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import {
  SidebarGroupConfig,
  SidebarNavItem,
  TabNavigationItem,
} from "@/types/sidebar";

/**
 * Tab navigation for Admin Panel
 */
const adminTabs: TabNavigationItem[] = [
  { value: "users", title: "Users", urlHash: "#users" },
  { value: "employees", title: "Employees", urlHash: "#employees" },
  { value: "companies", title: "Companies", urlHash: "#companies" },
  { value: "locations", title: "Store locations", urlHash: "#locations" },
  { value: "notifications", title: "Notifications", urlHash: "#notifications" },
  { value: "audit", title: "Audit Trail", urlHash: "#audit" },
];

const superAdminTabs: TabNavigationItem[] = [
  { value: "dashboard", title: "Dashboard", fullPath: "/super-admin/dashboard" },
  { value: "tenants", title: "Businesses", urlHash: "#tenants" },
  { value: "admins", title: "Business Administrators", urlHash: "#admins" },
  { value: "users", title: "All Users", urlHash: "#users" },
  { value: "api-testing", title: "API Testing", urlHash: "#api-testing" },
  { value: "feedback", title: "Feedback", urlHash: "#feedback" },
];

const assignmentHistoryTabs: TabNavigationItem[] = [
  { value: "history", title: "Assignment History", urlHash: "#history" },
  { value: "analytics", title: "Analytics & Reports", urlHash: "#analytics" },
];

/**
 * Analytics hub (non-clinical modules).
 */
const reportsGroup: SidebarGroupConfig = {
  label: "Reports",
  icon: BarChart3,
  isDropdown: true,
  items: [
    {
      title: "Reports hub",
      url: "/reports",
      icon: BarChart3,
      description: "Analytics landing and navigation",
      rbac: {
        allowedRoles: ["staff", "admin", "operations", "super_admin"],
        requiresTenant: true,
      },
    },
    {
      title: "Overview",
      url: "/reports/overview",
      icon: LayoutDashboard,
      description: "Executive snapshot across incidents, operations, and shift handover",
      rbac: {
        allowedRoles: ["staff", "admin", "operations", "super_admin"],
        requiresTenant: true,
      },
    },
    {
      title: "Incident reports",
      url: "/reports/incidents",
      icon: AlertTriangle,
      description: "Incident aggregates and trends",
      rbac: {
        allowedRoles: ["staff", "admin", "operations", "super_admin"],
        requiresTenant: true,
      },
    },
    {
      title: "Operations reports",
      url: "/reports/operations",
      icon: Activity,
      description: "Tickets, duties, and ShiftOver operational metrics",
      rbac: {
        allowedRoles: ["admin", "super_admin"],
        requiresTenant: true,
      },
    },
    {
      title: "Compliance reports",
      url: "/reports/compliance",
      icon: ClipboardCheck,
      description: "Audit summaries, SOP workflow posture, and governance exports",
      rbac: {
        allowedRoles: ["admin", "super_admin"],
        requiresTenant: true,
      },
    },
  ],
};

/**
 * Employee wellbeing hub
 */
const wellbeingGroup: SidebarGroupConfig = {
  label: "Employee Wellbeing Hub",
  icon: UsersRound,
  isDropdown: true,
  items: [
    {
      title: "Wellbeing hub",
      url: "/wellbeing",
      icon: UsersRound,
      description: "Employee wellbeing hub",
      featureFlag: "wellbeing",
    },
    {
      title: "Employee Follow-ups",
      url: "/wellbeing/follow-ups",
      icon: PhoneCall,
      description: "Employee follow-up tracking",
      featureFlag: "wellbeing",
    },
    {
      title: "Work fitness & medications",
      url: "/wellbeing/work-fitness",
      icon: ShieldCheck,
      description: "Medication review & return-to-work clearance",
      featureFlag: "wellbeing",
    },
    {
      title: "Employee Assistance Program",
      url: "/wellbeing/eap",
      icon: UsersRound,
      description: "Employee Assistance Program",
      featureFlag: "wellbeing",
    },
    {
      title: "Feedback",
      url: "/wellbeing/feedback",
      icon: MessageSquare,
      description: "Employee satisfaction & feedback",
      featureFlag: "wellbeing",
    },
  ],
};

/**
 * Operations — duties, tickets, appointments, incidents
 */
const operationsGroup: SidebarGroupConfig = {
  label: "Operations",
  icon: Clock,
  isDropdown: true,
  items: [
    {
      title: "Appointments",
      url: "/appointments",
      icon: Calendar,
      description: "Schedule and manage appointments",
      featureFlag: "appointments",
    },
    {
      title: "Incident Management",
      url: "/incidents",
      icon: AlertTriangle,
      description: "Workplace and business incidents",
      featureFlag: "incidents",
    },
    {
      title: "Operational Duties",
      url: "/operational-duties",
      icon: Clock,
      description: "Operational tasks",
    },
    {
      title: "Assignment History",
      url: "/assignment-history",
      icon: History,
      description: "Duty assignment records",
      tabs: assignmentHistoryTabs,
    },
    {
      title: "Staff Tickets",
      url: "/tickets",
      icon: Ticket,
      description: "Site issues, repairs, and requests to your tenant admins",
      featureFlag: "tickets",
    },
  ],
};

/**
 * ShiftOver — continuity & shift handover
 */
const shiftOverGroup: SidebarGroupConfig = {
  label: "ShiftOver",
  icon: Handshake,
  isDropdown: true,
  items: [
    {
      title: "Overview",
      url: "/shiftover",
      icon: Handshake,
      description: "Continuity and handover hub",
      featureFlag: "shiftover",
    },
    {
      title: "Shift reports",
      url: "/shiftover/shift-report",
      icon: ClipboardList,
      description: "End-of-shift reports and filters",
      featureFlag: "shiftover",
    },
    {
      title: "Open items",
      url: "/shiftover/open-items",
      icon: ListTodo,
      description: "Linked tickets, incidents, and duties still open",
      featureFlag: "shiftover",
    },
  ],
};

/**
 * Point-of-Care Laboratory
 */
const testingGroup: SidebarGroupConfig = {
  label: "Point-of-Care Laboratory",
  icon: TestTube,
  isDropdown: true,
  items: [
    {
      title: "Instant Tests",
      url: "/testing",
      icon: TestTube,
      description: "Point-of-care instant tests: HB, pregnancy, malaria, typhoid",
      featureFlag: "poc_testing",
      tenantFeature: "pocTestingEnabled",
    },
    {
      title: "Record Instant Test",
      url: "/testing/new",
      icon: FlaskConical,
      description: "Record a new instant test result",
      featureFlag: "poc_testing",
      tenantFeature: "pocTestingEnabled",
    },
  ],
};

/**
 * Inventory Management
 */
const inventoryGroup: SidebarGroupConfig = {
  label: "Inventory Management",
  icon: Package,
  isDropdown: true,
  items: [
    {
      title: "Inventory Products",
      url: "/inventory",
      icon: Package,
      description: "Inventory & supplies",
    },
    {
      title: "Point of Sale",
      url: "/pos",
      icon: Store,
      description: "Register terminal & checkout",
    },
    {
      title: "Sales History",
      url: "/sales",
      icon: ReceiptText,
      description: "All POS sales, returns & receipts",
    },
    {
      title: "Portal Orders",
      url: "/orders",
      icon: ClipboardList,
      description: "Customer orders & supplier invoices from the portal",
      featureFlag: "portal",
    },
    {
      title: "Stock Transfers",
      url: "/stock-transfers",
      icon: Truck,
      description: "Requisitions & location transfers",
    },
    {
      title: "Transactions",
      url: "/inventory-transactions",
      icon: ArrowRightLeft,
      description: "Inventory movements",
    },
    {
      title: "Purchase Orders",
      url: "/purchase-orders",
      icon: ShoppingCart,
      description: "Procurement & ordering",
    },
    {
      title: "Suppliers",
      url: "/suppliers",
      icon: Building2,
      description: "Supplier directory for POs",
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      description: "Customer directory for sales & portal",
    },
    {
      title: "Transaction History",
      url: "/transaction-history",
      icon: History,
      description: "Historical transaction records",
    },
    {
      title: "Equipment Tracking",
      url: "/equipment-tracking",
      icon: Wrench,
      description: "Equipment status & maintenance",
    },
  ],
};

/**
 * Administration
 */
const administrationGroup: SidebarGroupConfig = {
  label: "Administration",
  icon: Shield,
  isDropdown: true,
  items: [
    {
      title: "Settings",
      url: "/settings",
      icon: Cog,
      description: "Business settings: currency, white labeling",
      rbac: { requiresTenant: true },
    },
    {
      title: "Admin Panel",
      url: "/admin",
      icon: Shield,
      description: "Administrative controls",
      rbac: {
        minRole: "admin",
        requiresTenant: true,
      },
      tabs: adminTabs,
    },
    {
      title: "SOP Administration",
      url: "/admin/sops",
      icon: ClipboardCheck,
      description: "Author, approve, and publish standard operating procedures",
      rbac: {
        minRole: "admin",
        requiresTenant: true,
      },
    },
    {
      title: "Legal Agreements",
      url: "/admin/legal-agreements",
      icon: Scale,
      description: "Download templates and upload signed commercial / legal documents",
      rbac: {
        minRole: "admin",
        requiresTenant: true,
      },
    },
    {
      title: "Super Admin",
      url: "/super-admin",
      icon: Settings,
      description: "System Administration",
      rbac: {
        allowedRoles: ["super_admin"],
        requiresNoTenant: true,
      },
      tabs: superAdminTabs,
    },
  ],
};

/**
 * Resources
 */
const resourcesGroup: SidebarGroupConfig = {
  label: "Resources",
  icon: BookOpen,
  isDropdown: true,
  items: [
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpen,
      description: "System documentation and guides",
    },
    {
      title: "SOP Library",
      url: "/sop",
      icon: FileText,
      description: "Read published standard operating procedures",
    },
    {
      title: "Changelog",
      url: "/changelog",
      icon: ScrollText,
      description: "Product releases and highlights",
    },
  ],
};

/**
 * Dashboard
 */
const dashboardItem: SidebarGroupConfig = {
  label: "Dashboard",
  icon: Home,
  isDropdown: false,
  items: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      description: "Overview and metrics",
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      description: "Your alerts and messages",
    },
  ],
};

/** Fleet (formerly Ambulance & EMS) */
const fleetModule: SidebarGroupConfig = {
  label: "Fleet",
  icon: Ambulance,
  isDropdown: true,
  rbac: {
    allowedRoles: ["fleet_operator", "staff", "admin", "super_admin"],
    requiresTenant: true,
  },
  items: [
    {
      title: "Fleet",
      url: "/fleet#fleet",
      icon: Truck,
      description: "Fleet register and vehicles",
      featureFlag: "fleet",
    },
    {
      title: "Pre-start checks",
      url: "/fleet#pre-start",
      icon: ClipboardCheck,
      description: "Shift pre-start safety checks",
      featureFlag: "fleet",
    },
    {
      title: "On-board inventory",
      url: "/fleet#inventory",
      icon: Package,
      description: "Consumables and equipment by vehicle",
      featureFlag: "fleet",
    },
  ],
};

/**
 * Top-level sidebar order for uventorybiz
 */
export const sidebarConfig: SidebarGroupConfig[] = [
  dashboardItem,
  wellbeingGroup,
  operationsGroup,
  shiftOverGroup,
  fleetModule,
  testingGroup,
  inventoryGroup,
  reportsGroup,
  administrationGroup,
  resourcesGroup,
];

/**
 * Get all sidebar items flattened (for search, etc.)
 */
export function getAllSidebarItems(): SidebarNavItem[] {
  return sidebarConfig.flatMap((group) => group.items);
}

/**
 * Get sidebar groups filtered by user access
 */
export function getFilteredSidebarGroups(
  userRole?: string | null,
  userTenantId?: string | null
): SidebarGroupConfig[] {
  return sidebarConfig
    .map((group) => {
      // Filter items within the group
      const filteredItems = group.items.filter((item) => {
        const rbac = item.rbac || group.rbac;
        if (!rbac) return true;

        // Check tenant requirements
        if (rbac.requiresTenant && !userTenantId) return false;
        if (rbac.requiresNoTenant && userTenantId) return false;

        // Check role requirements
        if (rbac.allowedRoles) {
          if (!userRole || !rbac.allowedRoles.includes(userRole as any)) return false;
        } else if (rbac.minRole) {
          const roleHierarchy: Record<string, number> = {
            fleet_operator: 1,
            staff: 1,
            operations: 2,
            admin: 3,
            super_admin: 4,
          };
          if (!userRole || (roleHierarchy[userRole] || 0) < roleHierarchy[rbac.minRole]) {
            return false;
          }
        }

        return true;
      });

      // Return group only if it has accessible items
      if (filteredItems.length === 0) return null;

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group): group is SidebarGroupConfig => group !== null);
}
