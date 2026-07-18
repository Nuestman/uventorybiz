import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  HardHat,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Plug,
  Presentation,
  Scale,
  ScrollText,
  Server,
  Shield,
  Target,
  ToggleLeft,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export type SuperAdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Shown in sidebar when the feature is not built yet */
  comingSoon?: boolean;
};

export type SuperAdminNavSection = {
  label: string;
  /** Shown on the collapsible section header (matches tenant sidebar groups). */
  sectionIcon: LucideIcon;
  items: SuperAdminNavItem[];
};

/**
 * System administration navigation (global operator, not tenant day-to-day).
 * Hash links target tabs on `/super-admin`; other paths use dedicated placeholder routes.
 */
export const superAdminNavSections: SuperAdminNavSection[] = [
  {
    label: "Platform",
    sectionIcon: Layers,
    items: [
      {
        title: "Dashboard",
        href: "/super-admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Organizations",
        href: "/super-admin#tenants",
        icon: Building2,
      },
    ],
  },
  {
    label: "Access",
    sectionIcon: KeyRound,
    items: [
      { title: "Tenant administrators", href: "/super-admin#admins", icon: UserCog },
      { title: "All users", href: "/super-admin#users", icon: Users },
    ],
  },
  {
    label: "Commercial",
    sectionIcon: Presentation,
    items: [
      {
        title: "Public legal hub",
        href: "/legal",
        icon: Scale,
      },
      {
        title: "Tenant signed documents",
        href: "/super-admin/signed-legal-documents",
        icon: FileText,
      },
    ],
  },
  {
    label: "Tools",
    sectionIcon: Wrench,
    items: [
      { title: "API testing", href: "/super-admin#api-testing", icon: Wrench },
      { title: "Feedback inbox", href: "/super-admin#feedback", icon: MessageSquare },
    ],
  },
  {
    label: "System",
    sectionIcon: Server,
    items: [
      { title: "System status", href: "/super-admin/system-status", icon: Activity },
      { title: "Security & access", href: "/super-admin/security", icon: Shield },
      { title: "Impersonation log", href: "/super-admin/impersonation-log", icon: History },
      { title: "Global audit log", href: "/super-admin/audit", icon: FileText },
      { title: "Integrations", href: "/super-admin/integrations", icon: Plug },
      { title: "Feature flags", href: "/super-admin/feature-flags", icon: ToggleLeft },
      { title: "Billing & plans", href: "/super-admin/billing", icon: CreditCard },
    ],
  },
];
