import { Link } from "wouter";
import { ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PortalNotificationsMenu from "./PortalNotificationsMenu";
import { PortalMessagingHeaderLink } from "./PortalMessagingHeaderLink";
import { getPortalPageTitle } from "./portalNav";
import { PORTAL_DASHBOARD } from "./portalRoutes";
import type { PortalSessionPayload } from "./usePortalSession";

type PortalDesktopTopBarProps = {
  loc: string;
  session: PortalSessionPayload;
  primary: string;
  messagingEnabled: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void;
  signOutPending: boolean;
};

export function PortalDesktopTopBar({
  loc,
  session,
  primary,
  messagingEnabled,
  isAuthenticated,
  onSignOut,
  signOutPending,
}: PortalDesktopTopBarProps) {
  const pageTitle = getPortalPageTitle(loc);
  const firstName = session.user.firstName || "Account";

  return (
    <header className="hidden md:flex items-center justify-between gap-4 px-6 lg:px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-30">
      <nav className="flex items-center gap-1.5 text-sm text-uventorybiz-gray min-w-0" aria-label="Breadcrumb">
          <Link href={PORTAL_DASHBOARD} className="hover:text-gray-900 transition-colors shrink-0">
            Customer & supplier portal
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          <span className="text-gray-900 font-medium truncate">{pageTitle}</span>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="hidden lg:inline-flex text-sm text-uventorybiz-gray hover:text-gray-900 transition-colors mr-1"
          >
            uventorybiz
          </Link>
          {messagingEnabled ? <PortalMessagingHeaderLink /> : null}
          <PortalNotificationsMenu enabled={isAuthenticated} primaryColor={primary} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-auto py-1.5">
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
                    {session.user.firstName?.charAt(0) ?? "P"}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900">{firstName}</span>
                <ChevronDown className="h-4 w-4 text-uventorybiz-gray" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/portal/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                disabled={signOutPending}
                onClick={onSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </header>
  );
}
