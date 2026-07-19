import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Clock, FileText, Mail, Package, ShoppingBag, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMessagingUnreadCount } from "@/components/messaging/useMessagingThread";
import { usePortalSession } from "./usePortalSession";
import { PORTAL_APPOINTMENTS, portalAppointmentRequestUrl } from "./portalRoutes";
import { getQueryFn } from "@/lib/queryClient";
import { PortalCareContactCard } from "./components/PortalCareContactCard";
import {
  ApptStatusBadge,
  PortalEmptyState,
  PortalLoadingBlock,
  PortalDashboardGreeting,
  PORTAL_PRIMARY_BTN_CLASS,
  PORTAL_PRIMARY_TEXT_CLASS,
  portalQuickAccessColor,
  formatAppointmentLocation,
  formatAppointmentType,
  formatDateTime,
  modalityLabel,
  requestStatusLabel,
  requestStatusVariant,
} from "./portalUi";

type PortalAppt = {
  id: string;
  appointmentDate: string;
  appointmentType: string;
  modality?: string | null;
  status: string | null;
  locationName?: string | null;
  locationCode?: string | null;
  canConfirm?: boolean;
  confirmationRequiredFrom?: string | null;
};

type PortalRequest = {
  id: string;
  status: string;
  preferredModality?: string | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  createdAt: string | null;
};

const TERMINAL_APPT = new Set(["cancelled", "no_show", "completed"]);

function isUpcomingAppt(a: PortalAppt): boolean {
  return !TERMINAL_APPT.has(a.status ?? "");
}

export default function PortalHomePage() {
  const { session } = usePortalSession();
  const tenantLabel = session?.tenant.appName?.trim() || session?.tenant.name || "your organization";
  const hasPatientBridge = !!session?.user.patientId;
  const partyLabel = session?.user.partyType === "supplier" ? "supplier" : "customer";

  const apptsEnabled = !!session?.features.appointments && hasPatientBridge;
  const messagingEnabled = !!session?.features.messaging;
  const { data: messagingUnread } = useMessagingUnreadCount("portal", messagingEnabled);
  const messagesUnreadCount = messagingUnread?.count ?? 0;

  const { data: appointments = [], isLoading: apptLoading } = useQuery<PortalAppt[]>({
    queryKey: ["/api/portal/appointments"],
    queryFn: getQueryFn<PortalAppt[]>({ on401: "throw" }),
    enabled: apptsEnabled,
  });

  const { data: requests = [] } = useQuery<PortalRequest[]>({
    queryKey: ["/api/portal/appointment-requests"],
    queryFn: getQueryFn<PortalRequest[]>({ on401: "throw" }),
    enabled: apptsEnabled,
  });

  const upcoming = useMemo(
    () =>
      [...appointments]
        .filter(isUpcomingAppt)
        .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()),
    [appointments],
  );

  const pendingConfirm = useMemo(() => upcoming.filter((a) => a.canConfirm), [upcoming]);
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const nextAppointments = useMemo(() => upcoming.slice(0, 3), [upcoming]);

  if (!session) return null;

  const isCustomer = !!session.user.customerId;
  const isSupplier = !!session.user.supplierId;

  const quickLinks: {
    href: string;
    title: string;
    description: string;
    icon: typeof User;
    show: boolean;
    badge?: string;
  }[] = [
    {
      href: "/portal/shop",
      title: "Shop",
      description: "Browse products and place an order for pickup or delivery.",
      icon: ShoppingBag,
      show: isCustomer,
    },
    {
      href: "/portal/orders",
      title: "My orders",
      description: "Track the status of orders you have placed.",
      icon: Package,
      show: isCustomer,
    },
    {
      href: "/portal/purchase-orders",
      title: "Purchase orders & invoices",
      description: "View POs issued to you and submit invoices.",
      icon: FileText,
      show: isSupplier,
    },
    {
      href: "/portal/profile",
      title: "Your profile",
      description: "Account details, password, and notification preferences.",
      icon: User,
      show: true,
    },
    {
      href: "/portal/appointments",
      title: "Appointments",
      description: "View scheduled visits and request new appointments.",
      icon: CalendarDays,
      show: apptsEnabled,
      badge: pendingConfirm.length > 0 ? `${pendingConfirm.length} to confirm` : undefined,
    },
    {
      href: "/portal/messages",
      title: "Messages",
      description: "Secure communication with your account team.",
      icon: Mail,
      show: messagingEnabled,
      badge: messagesUnreadCount > 0 ? `${messagesUnreadCount} unread` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <PortalDashboardGreeting
        firstName={session.user.firstName}
        action={
          apptsEnabled ? (
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto border-[var(--portal-teal)] text-[var(--portal-teal)] hover:bg-[var(--portal-teal-light)] hover:text-[var(--portal-teal-dark)]"
            >
              <Link href={portalAppointmentRequestUrl()}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Request appointment
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!hasPatientBridge && (
        <Alert className="border-blue-200 bg-blue-50/80">
          <User className="h-4 w-4 text-blue-700" />
          <AlertTitle className="text-blue-900">Welcome, {partyLabel}</AlertTitle>
          <AlertDescription className="text-blue-800">
            {isCustomer
              ? "Your portal account is active. Browse the shop to place orders for pickup or delivery, and track them under My orders."
              : isSupplier
                ? "Your portal account is active. View purchase orders issued to you and submit invoices under Purchase orders & invoices."
                : "Your portal account is active. Use profile settings to manage your account."}
          </AlertDescription>
        </Alert>
      )}

      {pendingConfirm.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <CalendarDays className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Confirmation needed</AlertTitle>
          <AlertDescription className="text-amber-800">
            {pendingConfirm.length} scheduled visit{pendingConfirm.length > 1 ? "s" : ""} awaiting your confirmation.{" "}
            <Link href="/portal/appointments" className="font-medium underline text-amber-900">
              Review now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {pendingRequests.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50/80">
          <Clock className="h-4 w-4 text-blue-700" />
          <AlertTitle className="text-blue-900">Requests pending</AlertTitle>
          <AlertDescription className="text-blue-800">
            {pendingRequests.length} appointment request{pendingRequests.length > 1 ? "s" : ""} awaiting review.{" "}
            <Link href="/portal/appointments" className="font-medium underline text-blue-900">
              View status
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {apptsEnabled && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-lg">Next up</CardTitle>
              <CardDescription>Your nearest scheduled visits</CardDescription>
            </div>
            <Link
              href="/portal/appointments"
              className={`text-sm font-medium shrink-0 flex items-center gap-0.5 ${PORTAL_PRIMARY_TEXT_CLASS}`}
            >
              All appointments
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {apptLoading ? (
              <PortalLoadingBlock label="Loading schedule…" />
            ) : nextAppointments.length === 0 && pendingRequests.length === 0 ? (
              <PortalEmptyState
                icon={CalendarDays}
                title="No upcoming visits"
                description="Request an appointment when you need to connect with the team."
              />
            ) : (
              <ul className="space-y-3">
                {pendingRequests.slice(0, 2).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-800">Pending request</p>
                      <p className="font-medium text-gray-900 truncate">
                        {r.preferredTimeWindow && /^\d{4}-\d{2}-\d{2}T/.test(r.preferredTimeWindow)
                          ? formatDateTime(r.preferredTimeWindow)
                          : r.preferredDate
                            ? new Date(r.preferredDate).toLocaleDateString()
                            : "Flexible date"}
                      </p>
                      <Badge variant={requestStatusVariant(r.status)} className="text-xs capitalize">
                        {requestStatusLabel(r.status)}
                      </Badge>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={PORTAL_APPOINTMENTS}>View</Link>
                    </Button>
                  </li>
                ))}
                {nextAppointments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-gray-900 truncate">{formatAppointmentType(a.appointmentType)}</p>
                      <p className="text-sm text-uventorybiz-gray flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {formatDateTime(a.appointmentDate)}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {modalityLabel(a.modality)}
                        </Badge>
                        <ApptStatusBadge status={a.status} confirmationRequiredFrom={a.confirmationRequiredFrom} />
                      </div>
                      {a.modality !== "telehealth" && (
                        <p className="text-xs text-uventorybiz-gray">{formatAppointmentLocation(a)}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {a.canConfirm ? (
                        <Button asChild size="sm" className={PORTAL_PRIMARY_BTN_CLASS}>
                          <Link href="/portal/appointments">Confirm</Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link href="/portal/appointments">Details</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Quick access</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks
            .filter((c) => c.show)
            .map(({ href, title, description, icon: Icon, badge }) => {
              const accent = portalQuickAccessColor(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{ "--card-accent": accent } as React.CSSProperties}
                >
                  <Card className="portal-quick-access-card h-full group cursor-pointer rounded-xl border border-gray-100/80 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white shrink-0"
                            style={{ borderColor: `${accent}40` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: accent }} strokeWidth={2} />
                          </span>
                          <span className="truncate">{title}</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[var(--card-accent)] transition-colors shrink-0" />
                      </CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--card-accent)]">Open section</span>
                      {badge ? (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {badge}
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>
      </div>

      <PortalCareContactCard session={session} tenantLabel={tenantLabel} />
    </div>
  );
}
