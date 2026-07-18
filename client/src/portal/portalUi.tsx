import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

/** Default portal brand color when tenant has no custom primaryColor. */
export const PORTAL_PRIMARY_FALLBACK = "#0a4f6e";

/** Primary action buttons inside portal-root (portal teal, not main-app navy). */
export const PORTAL_PRIMARY_BTN_CLASS =
  "bg-[var(--portal-teal)] text-white hover:bg-[var(--portal-teal-dark)]";

/** Primary accent text/links inside portal-root. */
export const PORTAL_PRIMARY_TEXT_CLASS = "text-[var(--portal-teal)]";

/** Per-section accent colors for dashboard quick access. */
export const PORTAL_QUICK_ACCESS_COLORS: Record<string, string> = {
  "/portal/profile": "#2563eb",
  "/portal/appointments": "#0a4f6e",
  "/portal/messages": "#059669",
};

export function portalQuickAccessColor(href: string): string {
  return PORTAL_QUICK_ACCESS_COLORS[href] ?? PORTAL_PRIMARY_FALLBACK;
}

/** Tenant contact for customer & supplier support footer. */
export function getPortalTenantContact(session: {
  tenantContact?: { email: string; phone: string | null };
  supportEmail?: string | null;
  supportPhone?: string | null;
}): { email: string | null; phone: string | null } {
  return {
    email:
      session.tenantContact?.email?.trim() ||
      session.supportEmail?.trim() ||
      null,
    phone:
      session.tenantContact?.phone?.trim() ||
      session.supportPhone?.trim() ||
      null,
  };
}

export {
  DashboardGreeting as PortalDashboardGreeting,
  formatDashboardDate as formatPortalDashboardDate,
  timeOfDayGreeting as portalTimeGreeting,
} from "@/components/DashboardGreeting";

export function formatAppointmentType(type?: string | null): string {
  if (!type) return "Visit";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function modalityLabel(modality?: string | null): string {
  if (modality === "telehealth") return "Telehealth (video)";
  if (modality === "phone") return "Phone";
  return "In person";
}

export function requestStatusLabel(status?: string | null): string {
  if (!status) return "—";
  if (status === "pending") return "Pending review";
  if (status === "confirmed") return "Approved";
  if (status === "completed") return "Visit completed";
  if (status === "no_show") return "No show";
  if (status === "cancelled") return "Cancelled";
  if (status === "declined") return "Declined";
  return status.replace(/_/g, " ");
}

export function requestStatusVariant(
  status?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "pending") return "secondary";
  if (status === "confirmed") return "default";
  if (status === "completed") return "outline";
  if (status === "no_show" || status === "declined") return "destructive";
  if (status === "cancelled") return "destructive";
  return "outline";
}

export function appointmentStatusLabel(
  status?: string | null,
  confirmationRequiredFrom?: string | null,
): string {
  if (!status) return "—";
  if (status === "scheduled") {
    if (confirmationRequiredFrom === "staff") return "Awaiting business confirmation";
    return "Awaiting your confirmation";
  }
  return status.replace(/_/g, " ");
}

export function appointmentStatusVariant(
  status?: string | null,
  confirmationRequiredFrom?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "scheduled") {
    return confirmationRequiredFrom === "staff" ? "outline" : "secondary";
  }
  if (status === "confirmed" || status === "in_progress") return "default";
  if (status === "cancelled" || status === "no_show") return "destructive";
  return "outline";
}

export function ApptStatusBadge({
  status,
  confirmationRequiredFrom,
}: {
  status?: string | null;
  confirmationRequiredFrom?: string | null;
}) {
  return (
    <Badge variant={appointmentStatusVariant(status, confirmationRequiredFrom)} className="capitalize whitespace-nowrap">
      {appointmentStatusLabel(status, confirmationRequiredFrom)}
    </Badge>
  );
}

export function PortalPageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9 text-[var(--portal-teal,#0a4f6e)] shrink-0" aria-hidden />
          {title}
        </h2>
        {description ? <p className="text-uventorybiz-gray mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PortalLoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-uventorybiz-gray">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--portal-teal,#0a4f6e)]" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function PortalEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="py-10 px-4 text-center">
      {Icon ? <Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden /> : null}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description ? <p className="text-sm text-uventorybiz-gray mt-1 max-w-sm mx-auto">{description}</p> : null}
    </div>
  );
}

export function formatAppointmentLocation(appt: {
  modality?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
}): string {
  if (appt.modality === "telehealth") return "Virtual (video)";
  if (appt.modality === "phone") return "Phone";
  if (appt.locationCode || appt.locationName) {
    if (appt.locationCode && appt.locationName) return `${appt.locationCode} — ${appt.locationName}`;
    return appt.locationCode ?? appt.locationName ?? "Clinic";
  }
  return "Clinic";
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function pathwayLabel(pathway?: string | null): string {
  if (!pathway) return "Standard visit";
  return pathway.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function encounterStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}
