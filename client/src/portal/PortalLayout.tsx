import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MessagingRealtimeProvider } from "@/components/messaging/MessagingRealtimeProvider";
import { useMessagingUnreadCount } from "@/components/messaging/useMessagingThread";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { WhatsNewDialog } from "@/components/WhatsNewDialog";
import PortalNotificationsMenu from "./PortalNotificationsMenu";
import { PortalMessagingHeaderLink } from "./PortalMessagingHeaderLink";
import { PortalDesktopSidebar } from "./PortalDesktopSidebar";
import { PortalMobileSidebar } from "./PortalMobileSidebar";
import { PortalDesktopTopBar } from "./PortalDesktopTopBar";
import { buildPortalNav, isPortalNavActive } from "./portalNav";
import { usePortalLogout, usePortalSession } from "./usePortalSession";
import { useUnreadOrderUpdatesCount } from "./usePortalNotifications";
import { PORTAL_DASHBOARD, PORTAL_ORDERS, portalSignInUrl } from "./portalRoutes";
import { PORTAL_PRIMARY_FALLBACK } from "./portalUi";
import { usePortalBodyClass } from "./usePortalBodyClass";

export default function PortalLayout({ children }: { children: ReactNode }) {
  usePortalBodyClass();
  const [loc] = useLocation();
  const { session, isAuthenticated } = usePortalSession();
  const logout = usePortalLogout();
  const primary = session?.tenant.primaryColor?.trim() || PORTAL_PRIMARY_FALLBACK;
  const brandName = session?.tenant.appName?.trim() || session?.tenant.name || "Customer & supplier portal";
  const { data: messagingUnread } = useMessagingUnreadCount(
    "portal",
    !!session?.features.messaging,
  );
  const messagesUnreadCount = messagingUnread?.count ?? 0;
  const ordersUnreadCount = useUnreadOrderUpdatesCount(isAuthenticated && !!session?.user.customerId);

  const nav = buildPortalNav(session);
  const mobileNav = nav.filter((item) => item.href !== "/portal/profile").slice(0, 5);

  const handleSignOut = () => {
    logout.mutate(undefined, {
      onSettled: () => {
            window.location.href = portalSignInUrl({ error: "session_expired" });
      },
    });
  };

  return (
    <MessagingRealtimeProvider audience="portal" enabled={!!session?.features.messaging}>
      <div className="portal-root portal-page min-h-screen bg-[#f4f7f9] flex" style={{ ["--portal-primary" as string]: primary }}>
        <SessionTimeoutWarning
          variant="portal"
          enabled={isAuthenticated}
          loginHref={portalSignInUrl({ error: "session_expired" })}
          onSignOut={handleSignOut}
          onSessionEnded={() => {
            void fetch("/api/portal/auth/logout", { method: "POST", credentials: "include" });
          }}
        />

        <WhatsNewDialog audience="portal" enabled={isAuthenticated} primaryColor={primary} />

        {session ? (
          <PortalDesktopSidebar
            loc={loc}
            session={session}
            primary={primary}
            brandName={brandName}
            messagesUnreadCount={messagesUnreadCount}
            ordersUnreadCount={ordersUnreadCount}
            onSignOut={handleSignOut}
            signOutPending={logout.isPending}
          />
        ) : null}

        <div className="flex flex-col flex-1 min-h-screen md:ml-[272px] min-w-0">
          {/* Mobile header */}
          <header
            className="md:hidden border-b bg-white shadow-sm sticky top-0 z-40"
            style={{ borderBottomColor: `${primary}33` }}
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 min-w-0">
                {session ? (
                  <PortalMobileSidebar
                    loc={loc}
                    session={session}
                    primary={primary}
                    brandName={brandName}
                    messagesUnreadCount={messagesUnreadCount}
                    ordersUnreadCount={ordersUnreadCount}
                    onSignOut={handleSignOut}
                    signOutPending={logout.isPending}
                  />
                ) : (
                  <div className="w-9 shrink-0 md:hidden" aria-hidden />
                )}
                <Link href={PORTAL_DASHBOARD} className="flex items-center gap-2 min-w-0">
                {session?.tenant.logoUrl ? (
                  <img src={session.tenant.logoUrl} alt="" className="h-9 w-9 object-contain rounded" />
                ) : (
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: primary }}
                  >
                    {brandName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{brandName}</p>
                  <p className="text-xs text-uventorybiz-gray truncate">Customer & supplier portal</p>
                </div>
              </Link>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {session?.features.messaging ? <PortalMessagingHeaderLink /> : null}
                <PortalNotificationsMenu enabled={isAuthenticated} primaryColor={primary} />
                {session?.user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 px-2 py-2 h-auto">
                        {session.user.profileImageUrl ? (
                          <img
                            src={session.user.profileImageUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: primary }}
                          >
                            {session.user.firstName?.charAt(0) ?? session.user.email?.charAt(0) ?? "P"}
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/portal/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        disabled={logout.isPending}
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>

          {session ? (
            <PortalDesktopTopBar
              loc={loc}
              session={session}
              primary={primary}
              messagingEnabled={!!session.features.messaging}
              isAuthenticated={isAuthenticated}
              onSignOut={handleSignOut}
              signOutPending={logout.isPending}
            />
          ) : null}

          <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 lg:px-8 lg:py-8 pb-28 md:pb-8">{children}</main>

          {/* Mobile bottom nav */}
          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
            aria-label="Portal sections"
          >
            <div className="flex justify-around items-stretch max-w-5xl mx-auto px-1 py-1 safe-area-pb">
              {mobileNav.map(({ href, label, icon: Icon }) => {
                const active = isPortalNavActive(loc, href);
                return (
                  <Link key={href} href={href}>
                    <span
                      className={`relative flex flex-col items-center gap-0.5 px-2 py-2 min-w-[4rem] rounded-lg text-[10px] font-medium transition-colors ${
                        active ? "text-[var(--portal-primary)]" : "text-gray-500"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "opacity-100" : "opacity-70"}`} />
                      {href === "/portal/messages" && messagesUnreadCount > 0 ? (
                        <Badge
                          className="absolute top-0.5 right-1 h-4 min-w-[1rem] px-1 text-[9px]"
                          style={{ backgroundColor: primary }}
                        >
                          {messagesUnreadCount > 99 ? "99+" : messagesUnreadCount}
                        </Badge>
                      ) : null}
                      {href === PORTAL_ORDERS && ordersUnreadCount > 0 ? (
                        <Badge
                          className="absolute top-0.5 right-1 h-4 min-w-[1rem] px-1 text-[9px]"
                          style={{ backgroundColor: primary }}
                        >
                          {ordersUnreadCount > 99 ? "99+" : ordersUnreadCount}
                        </Badge>
                      ) : null}
                      <span className="truncate max-w-[4.5rem]">{label.split(" ")[0]}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </MessagingRealtimeProvider>
  );
}
