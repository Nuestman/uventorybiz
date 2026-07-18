import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildPortalNav, isPortalNavActive } from "./portalNav";
import { PORTAL_DASHBOARD, PORTAL_ORDERS } from "./portalRoutes";
import type { PortalSessionPayload } from "./usePortalSession";

export type PortalSidebarContentProps = {
  loc: string;
  session: PortalSessionPayload;
  primary: string;
  brandName: string;
  messagesUnreadCount: number;
  /** Unread order-update notifications — badge on "My orders". */
  ordersUnreadCount?: number;
  onSignOut: () => void;
  signOutPending: boolean;
  /** Close mobile drawer after navigation */
  onNavigate?: () => void;
  className?: string;
};

export function PortalSidebarContent({
  loc,
  session,
  primary,
  brandName,
  messagesUnreadCount,
  ordersUnreadCount = 0,
  onSignOut,
  signOutPending,
  onNavigate,
  className,
}: PortalSidebarContentProps) {
  const nav = buildPortalNav(session);
  const settingsNav = nav.filter((item) => item.href === "/portal/profile");
  const mainNav = nav.filter((item) => item.href !== "/portal/profile");

  const userLabel = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ");
  const mrn = session.user.employeeNumber ? `MRN ${session.user.employeeNumber}` : null;
  const jobTitle = session.user.jobTitle?.trim();
  const metaLine = [mrn, jobTitle].filter(Boolean).join(" · ");

  return (
    <div className={`flex flex-col h-full text-white ${className ?? ""}`} style={{ backgroundColor: primary }}>
      <div className="bg-white pt-6 pb-4 border-b border-r border-gray-200 px-5 py-4 shrink-0">
        <Link href={PORTAL_DASHBOARD} className="flex items-center gap-2.5 min-w-0 text-gray-900" onClick={onNavigate}>
          {session.tenant.logoUrl ? (
            <img src={session.tenant.logoUrl} alt="" className="h-9 w-9 object-contain rounded shrink-0" />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: primary }}
            >
              {brandName.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-base truncate">{brandName}</span>
        </Link>
      </div>

      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex flex-col items-center text-center gap-3">
          {session.user.profileImageUrl ? (
            <img
              src={session.user.profileImageUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover border-[3px] border-white/25 shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-semibold shrink-0 border-[3px] border-white/25">
              {session.user.firstName?.charAt(0) ?? session.user.email?.charAt(0) ?? "P"}
            </div>
          )}
          <div className="w-full space-y-1 min-w-0">
            <p className="text-base font-semibold leading-tight truncate">{userLabel || "Account"}</p>
            {metaLine ? (
              <p className="text-xs text-white/70 leading-snug truncate">{metaLine}</p>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1.5">
        {mainNav.map(({ href, label, icon: Icon }) => {
          const active = isPortalNavActive(loc, href);
          return (
            <Link key={href} href={href} onClick={onNavigate}>
              <span
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                <span className="truncate flex-1">{label}</span>
                {href === "/portal/messages" && messagesUnreadCount > 0 ? (
                  <Badge className="h-5 min-w-[1.25rem] px-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white border-0">
                    {messagesUnreadCount > 99 ? "99+" : messagesUnreadCount}
                  </Badge>
                ) : null}
                {href === PORTAL_ORDERS && ordersUnreadCount > 0 ? (
                  <Badge className="h-5 min-w-[1.25rem] px-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white border-0">
                    {ordersUnreadCount > 99 ? "99+" : ordersUnreadCount}
                  </Badge>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1.5 shrink-0">
        {settingsNav.map(({ href, label, icon: Icon }) => {
          const active = isPortalNavActive(loc, href);
          return (
            <Link key={href} href={href} onClick={onNavigate}>
              <span
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                {label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          disabled={signOutPending}
          onClick={() => {
            onNavigate?.();
            onSignOut();
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );
}
