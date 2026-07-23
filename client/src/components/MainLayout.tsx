import { ReactNode, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarInset, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider, 
  SidebarTrigger,
  useSidebar 
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  User,
  LogOut,
  Menu,
  ChevronDown,
  Settings,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRole } from "@/lib/formatters";
import { LocationSelectionModal } from "@/components/LocationSelectionModal";
import { NotificationBell } from "@/components/NotificationBell";
import { MessagingHeaderLink } from "@/components/messaging/MessagingHeaderLink";
import { MessagingRealtimeProvider } from "@/components/messaging/MessagingRealtimeProvider";
import { useMessagingUnreadCount } from "@/components/messaging/useMessagingThread";
import { usePendingPortalAppointmentRequestsCount } from "@/hooks/usePendingPortalAppointmentRequestsCount";
import { hasStaffAccess } from "@/routes";
import { LocationBadge } from "@/components/LocationBadge";
import { APP_VERSION } from "@/lib/appVersion";
import { getQueryFn } from "@/lib/queryClient";
import { getFilteredSidebarGroups } from "@/config/sidebarConfig";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { SidebarGroupConfig, SidebarNavItem } from "@/types/sidebar";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { isPocEligibleCategory } from "@shared/poc";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { WhatsNewDialog } from "@/components/WhatsNewDialog";

import { BrandLogo } from "@/components/BrandLogo";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Helper to check if a path is active
 */
function isPathActive(path: string, currentLocation: string): boolean {
  const hashIdx = path.indexOf("#");
  if (hashIdx !== -1) {
    const basePath = path.slice(0, hashIdx);
    const wantedHash = path.slice(hashIdx);
    const pathOnly = currentLocation.split("?")[0].replace(/\/$/, "") || "/";
    const baseNorm = basePath.replace(/\/$/, "") || "/";
    if (pathOnly !== baseNorm) return false;
    if (typeof window === "undefined") return false;
    const currentHash = window.location.hash;
    if (wantedHash === "#fleet") {
      return currentHash === "#fleet" || currentHash === "";
    }
    return currentHash === wantedHash;
  }
  if (path === "/dashboard" && (currentLocation === "/dashboard" || currentLocation.startsWith("/dashboard/"))) return true;
  if (path === "/" && currentLocation === "/") return true;
  // ShiftOver hub is only active on exact /shiftover (sub-routes like /shiftover/shift-report are separate nav items)
  if (path === "/shiftover") {
    const loc = currentLocation.split("?")[0].replace(/\/$/, "") || "/";
    return loc === "/shiftover";
  }
  // Assets overview vs fleet children must not share prefix highlighting
  if (path === "/assets" || path === "/assets/fleet") {
    const loc = currentLocation.split("?")[0].replace(/\/$/, "") || "/";
    return loc === path;
  }
  if (path !== "/" && path !== "/dashboard" && currentLocation.startsWith(path)) return true;
  return false;
}

/**
 * Helper to check if any item in a group is active
 */
function isGroupActive(items: SidebarNavItem[], currentLocation: string): boolean {
  return items.some(item => {
    if (isPathActive(item.url, currentLocation)) return true;
    // Check if any tab navigation would make this active
    if (item.tabs) {
      return item.tabs.some(tab => {
        const tabUrl = tab.fullPath ?? `${item.url}${tab.urlHash || `#${tab.value}`}`;
        return currentLocation.includes(tabUrl);
      });
    }
    return false;
  });
}

/**
 * Unread badge for sidebar nav items.
 */
function NavUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-uventorybiz-coral px-1 text-[11px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type NavBadges = {
  notifications: number;
  messages: number;
  appointments: number;
  orders: number;
};

function unreadCountForNavUrl(url: string, badges: NavBadges): number {
  if (url === "/notifications") return badges.notifications;
  if (url === "/messages") return badges.messages;
  if (url === "/appointments") return badges.appointments;
  if (url === "/orders") return badges.orders;
  return 0;
}

/**
 * Render a sidebar navigation item with optional tab sub-items
 */
function renderSidebarItem(
  item: SidebarNavItem,
  currentLocation: string,
  isCollapsed: boolean,
  onItemClick: () => void,
  navBadges: NavBadges,
) {
  const isActive = isPathActive(item.url, currentLocation);
  const Icon = item.icon;

  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton 
        asChild 
        isActive={isActive}
        tooltip={item.title}
      >
        <Link 
          href={item.url} 
          className={`
            sidebar-nav-link flex items-center gap-2 w-full px-2 py-2 rounded-md transition-all duration-200 group
            ${isActive ? 'active' : ''}
          `} 
          style={{
            backgroundColor: isActive ? 'rgba(20, 47, 92, 0.08)' : 'transparent',
            color: isActive ? 'var(--uventorybiz-navy)' : '#1F2937',
          }}
          onClick={onItemClick}
        >
          <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
            isActive
              ? 'bg-uventorybiz-navy/10'
              : 'group-hover:bg-uventorybiz-navy/10'
          }`}>
            <Icon className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="flex-1 sidebar-label">{item.title}</span>
          {!isCollapsed ? (
            <NavUnreadBadge count={unreadCountForNavUrl(item.url, navBadges)} />
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Render a dropdown group with items
 */
function renderDropdownGroup(
  group: SidebarGroupConfig,
  currentLocation: string,
  isCollapsed: boolean,
  isMobile: boolean,
  setOpenMobile: (open: boolean) => void,
  openStates: Record<string, boolean>,
  setOpenState: (key: string, open: boolean) => void,
  navBadges: NavBadges,
) {
  const groupKey = group.label.toLowerCase().replace(/\s+/g, '-');
  const isActive = isGroupActive(group.items, currentLocation);
  const isOpen = openStates[groupKey] ?? false;
  const GroupIcon = group.icon || group.items[0]?.icon;
  // Roll item badges up to the group header so counts stay visible while collapsed.
  const groupBadgeCount = group.items.reduce(
    (sum, item) => sum + unreadCountForNavUrl(item.url, navBadges),
    0,
  );

  return (
    <SidebarMenuItem key={groupKey}>
        <SidebarMenuButton 
          isActive={isActive}
          onClick={() => setOpenState(groupKey, !isOpen)}
          tooltip={group.label}
          className={`
            sidebar-nav-link flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-all duration-200 group cursor-pointer
            ${isActive ? 'active' : ''}
          `}
          style={{
            backgroundColor: isActive ? 'rgba(20, 47, 92, 0.08)' : 'transparent',
            color: isActive ? 'var(--uventorybiz-navy)' : '#1F2937',
          }}
        >
          <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
            isActive
              ? 'bg-uventorybiz-navy/10'
              : 'group-hover:bg-uventorybiz-navy/10'
          }`}>
            {GroupIcon && <GroupIcon className="h-4 w-4 flex-shrink-0" />}
          </div>
          <span className="flex-1 sidebar-label">{group.label}</span>
          {!isOpen ? <NavUnreadBadge count={groupBadgeCount} /> : null}
          <ChevronDown className={`h-4 w-4 transition-transform duration-500 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
        </SidebarMenuButton>
        
        <div 
          className="sidebar-dropdown-container"
          style={{
            maxHeight: isOpen ? '1000px' : '0',
            overflow: 'hidden',
            transition: 'max-height 500ms ease-in-out'
          }}
        >
          <SidebarMenuSub className="border-l-0 mt-0.5 space-y-1">
            {group.items.map((item, index) => {
              const itemIsActive = isPathActive(item.url, currentLocation);
              const ItemIcon = item.icon;

              return (
                <SidebarMenuSubItem 
                  key={item.title}
                  className={isOpen ? 'sidebar-dropdown-item' : 'sidebar-dropdown-item-collapse'}
                  style={{
                    animationDelay: isOpen ? `${index * 50}ms` : `${(group.items.length - index - 1) * 50}ms`,
                  }}
                >
                  <SidebarMenuSubButton asChild isActive={itemIsActive}>
                    <Link 
                      href={item.url} 
                      className={`
                        flex items-center gap-2 w-full px-2 py-1 rounded-md transition-all duration-200 group
                        ${itemIsActive ? 'active' : ''}
                      `} 
                      style={{
                        backgroundColor: itemIsActive ? 'rgba(20, 47, 92, 0.15)' : 'transparent',
                        fontSize: '0.875rem',
                      }}
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1 sidebar-label">{item.title}</span>
                      <NavUnreadBadge count={unreadCountForNavUrl(item.url, navBadges)} />
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </div>
      </SidebarMenuItem>
  );
}

function AppSidebar() {
  const { user, logout } = useAuth();
  const authUser = user;
  const { settings } = useTenantSettings();
  const [location] = useLocation();
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const tenantLogo = settings?.logoUrl || null;
  
  // State for managing dropdown open/close for each group
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  
  const setOpenState = (key: string, open: boolean) => {
    setOpenStates(prev => ({ ...prev, [key]: open }));
  };

  const isCollapsed = state === "collapsed";

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getQueryFn<{ count: number }>({ on401: "throw" }),
    enabled: !!authUser,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const notificationsUnreadCount = unreadData?.count ?? 0;

  const { flags: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const isFeatureOn = (key?: string) => {
    if (!key) return true;
    if (flagsLoading) return false;
    if (key === "messaging") return featureFlags[key] ?? false;
    return featureFlags[key] ?? true;
  };

  const { data: messagingUnreadData } = useMessagingUnreadCount(
    "staff",
    !!authUser && hasStaffAccess(authUser.role) && isFeatureOn("messaging"),
  );
  // Per-business feature toggles from tenant settings (e.g. POC lab testing).
  // POC also requires an eligible business category (pharmacy / laboratory).
  const isTenantFeatureOn = (key?: string) => {
    if (!key) return true;
    if (!settings) return false;
    if (key === "pocTestingEnabled") {
      return (
        settings.pocTestingEnabled === true &&
        isPocEligibleCategory(settings.businessCategory)
      );
    }
    return (settings as unknown as Record<string, unknown>)[key] === true;
  };

  const clinicalAccess = !!authUser && hasStaffAccess(authUser.role);
  const { data: pendingAppointmentsCount = 0 } = usePendingPortalAppointmentRequestsCount(
    clinicalAccess && isFeatureOn("appointments"),
  );
  // Portal orders/invoices awaiting staff action (pending, issues, invoices to review/pay).
  const { data: ordersAttention } = useQuery<{ total: number }>({
    queryKey: ["/api/orders/attention-count"],
    queryFn: getQueryFn<{ total: number }>({ on401: "throw" }),
    enabled: !!authUser?.tenantId && hasStaffAccess(authUser.role),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const navBadges = {
    notifications: notificationsUnreadCount,
    messages: messagingUnreadData?.count ?? 0,
    appointments: pendingAppointmentsCount,
    orders: ordersAttention?.total ?? 0,
  };
  
  // Get filtered sidebar groups based on user role, tenant, and platform feature flags
  const sidebarGroups = useMemo(() => {
    const groups = getFilteredSidebarGroups(
      authUser?.role || null,
      authUser?.tenantId || null
    );
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => isFeatureOn(item.featureFlag) && isTenantFeatureOn(item.tenantFeature),
        ),
      }))
      .filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.role, authUser?.tenantId, featureFlags, flagsLoading, settings]);

  // Auto-open dropdowns when their items are active (only on first encounter)
  useEffect(() => {
    sidebarGroups.forEach((group) => {
      const groupKey = group.label.toLowerCase().replace(/\s+/g, '-');
      const isActive = isGroupActive(group.items, location);
      // Only auto-open if we've never set a state for this group before.
      // This allows the user to manually collapse an active group and keep it collapsed.
      if (isActive && typeof openStates[groupKey] === "undefined") {
        setOpenStates(prev => ({ ...prev, [groupKey]: true }));
      }
    });
  }, [location, sidebarGroups, openStates]);

  return (
    <Sidebar collapsible="icon" className="sidebar-mobile-bg border-r border-gray-200/60">
      <SidebarHeader className="border-b border-gray-200 h-16 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12">
              <Link href="/dashboard" className="">
                {isCollapsed ? (
                  <div className="">
                    <BrandLogo
                      variant="mark"
                      src={tenantLogo}
                      alt="uventorybiz"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                ) : (
                  <div className="">
                    <BrandLogo
                      variant="full"
                      src={tenantLogo}
                      alt="uventorybiz business management"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2.5">
        {/* Render all sidebar groups from configuration - simplified flex layout */}
        <SidebarMenu className="flex flex-col gap-1">
          {sidebarGroups.map((group) => {
            // Render as dropdown if configured
            if (group.isDropdown) {
              return renderDropdownGroup(
                group,
                location,
                isCollapsed,
                isMobile,
                setOpenMobile,
                openStates,
                setOpenState,
                navBadges,
              );
            }
            
            // Render as flat list (fallback, though all groups should be dropdowns)
            return group.items.map((item) => renderSidebarItem(
              item,
              location,
              isCollapsed,
              () => {
                if (isMobile) {
                  setOpenMobile(false);
                }
              },
              navBadges,
            ));
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200">
        {/* Version Display - hide when collapsed */}
        {!isCollapsed && (
          <div className="px-4 py-2 text-xs text-gray-500 text-center border-b border-gray-200">
            <span className="font-medium">uventorybiz</span>
            <span className="ml-2">v{APP_VERSION}</span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-uventorybiz-navy/10 data-[state=open]:text-uventorybiz-navy hover:bg-uventorybiz-navy/10 hover:text-uventorybiz-navy transition-all duration-200"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-sidebar-primary text-sidebar-primary-foreground">
                    {authUser?.profileImageUrl ? (
                      <img 
                        src={authUser.profileImageUrl} 
                        alt={`${authUser.firstName ?? ""} ${authUser.lastName ?? ""}`.trim() || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {authUser?.firstName || 'User'} {authUser?.lastName || ''}
                    </span>
                    <span className="truncate text-xs">
                      {authUser?.role ? formatRole(authUser.role) : ''}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isCollapsed ? "right" : "bottom"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function HeaderContent() {
  const { user, logout } = useAuth();
  const authUser = user;

  return (
    <div className="flex items-center h-16 px-4 gap-4 min-w-0">
      <AppBreadcrumbs variant="staff" className="flex-1" />

      {/* Right side actions - always stay at the right */}
      <div className="flex items-center space-x-4 shrink-0 ml-auto">
        <MessagingHeaderLink />
        <NotificationBell className="flex" />

        {/* Location Badge - hide on mobile (< 768px) */}
        <div className="hidden md:block">
          <LocationBadge />
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2">
              <div className="hidden xl:flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {authUser?.firstName ?? ''} {authUser?.lastName ?? ''}
                  </p>
                  <p className="text-xs text-uventorybiz-gray">
                    {authUser?.role ? formatRole(authUser.role) : ''}
                  </p>
                </div>
                {authUser?.profileImageUrl ? (
                  <img
                    src={authUser.profileImageUrl}
                    alt={`${authUser?.firstName ?? ''} ${authUser?.lastName ?? ''}`.trim() || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-uventorybiz-gray" />
              </div>
              {/* Tablet/Mobile user icon - show between 768px and 1280px, and below 768px */}
              <div className="xl:hidden">
                {authUser?.profileImageUrl ? (
                  <img
                    src={authUser.profileImageUrl}
                    alt={`${authUser?.firstName ?? ''} ${authUser?.lastName ?? ''}`.trim() || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile menu button - only show below 768px */}
        <Button variant="ghost" size="sm" className="xl:hidden md:hidden">
          <Menu className="h-4 w-4 text-uventorybiz-gray" />
        </Button>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        <div className="flex-1">
          <HeaderContent />
        </div>
      </div>
    </header>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const { flags: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const staffMessagingEnabled =
    !!user &&
    hasStaffAccess(user.role) &&
    !flagsLoading &&
    (featureFlags.messaging ?? false);

  const isEmbedChromeless =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  const layoutBody = isEmbedChromeless ? (
    <>
      <SessionTimeoutWarning
        variant="staff"
        enabled={isAuthenticated}
        loginHref={() => {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          return `/auth?reason=session_expired&returnTo=${encodeURIComponent(returnTo)}`;
        }}
        onSignOut={() => logout()}
        onSessionEnded={() => {
          void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        }}
      />
      <main id="app-scroll-region" className="min-h-0 w-full overflow-auto">
        {children}
      </main>
    </>
  ) : (
    <SidebarProvider defaultOpen={true}>
      <SessionTimeoutWarning
        variant="staff"
        enabled={isAuthenticated}
        loginHref={() => {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          return `/auth?reason=session_expired&returnTo=${encodeURIComponent(returnTo)}`;
        }}
        onSignOut={() => logout()}
        onSessionEnded={() => {
          void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        }}
      />
      {/* Location Selection Modal - appears after login for multi-location tenants */}
      <LocationSelectionModal />

      <WhatsNewDialog audience="staff" enabled={isAuthenticated} />

      <div className="flex min-h-screen w-full bg-uventorybiz-light">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <ImpersonationBanner />
          <TopBar />
          <main
            id="app-scroll-region"
            className="app-main flex-1 p-4 overflow-auto min-w-0 w-full"
          >
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );

  return (
    <MessagingRealtimeProvider audience="staff" enabled={staffMessagingEnabled}>
      {layoutBody}
    </MessagingRealtimeProvider>
  );
}