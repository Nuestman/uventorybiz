import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  ChevronDown,
  Bell,
  Menu,
  Settings,
  BookOpen,
} from "lucide-react";
import { formatRole } from "@/lib/formatters";
import { APP_VERSION } from "@/lib/appVersion";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { superAdminNavSections } from "@/config/superAdminNav";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/BrandLogo";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

function normalizeHashFragment(raw: string): string {
  if (!raw) return "";
  return raw.startsWith("#") ? raw.slice(1) : raw;
}

/** On `/super-admin`, empty hash matches the default console tab (`tenants`). */
function effectiveSuperAdminTabHash(pathname: string, hashFragment: string): string {
  if (pathname !== "/super-admin") return normalizeHashFragment(hashFragment);
  return normalizeHashFragment(hashFragment) || "tenants";
}

function isSuperAdminNavActive(
  href: string,
  pathname: string,
  hashFragment: string,
): boolean {
  if (href === "/super-admin/dashboard") {
    return pathname === "/super-admin/dashboard";
  }
  const [path, frag = ""] = href.split("#");
  if (pathname !== path) return false;
  if (frag) return effectiveSuperAdminTabHash(pathname, hashFragment) === frag;
  if (path === "/super-admin") return !normalizeHashFragment(hashFragment);
  return true;
}

function SuperAdminSidebar() {
  const { user, logout } = useAuth();
  const [pathname] = useLocation();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hashFragment, setHashFragment] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : "",
  );

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    const syncFromWindow = () => setHashFragment(window.location.hash);
    const onHashSync = (e: Event) => {
      const hash = (e as CustomEvent<{ hash: string }>).detail?.hash;
      if (typeof hash === "string") setHashFragment(hash);
    };
    syncFromWindow();
    window.addEventListener("hashchange", syncFromWindow);
    window.addEventListener("super-admin-hash-sync", onHashSync as EventListener);
    return () => {
      window.removeEventListener("hashchange", syncFromWindow);
      window.removeEventListener("super-admin-hash-sync", onHashSync as EventListener);
    };
  }, []);

  useEffect(() => {
    setHashFragment(window.location.hash);
  }, [pathname]);

  const setSectionOpen = (key: string, open: boolean) => {
    setOpenSections((prev) => ({ ...prev, [key]: open }));
  };

  const sectionsWithActive = useMemo(() => {
    return superAdminNavSections.map((section) => {
      const anyActive = section.items.some((item) =>
        isSuperAdminNavActive(item.href, pathname, hashFragment),
      );
      return { section, anyActive, key: section.label.toLowerCase().replace(/\s+/g, "-") };
    });
  }, [pathname, hashFragment]);

  useEffect(() => {
    sectionsWithActive.forEach(({ anyActive, key }) => {
      if (anyActive && typeof openSections[key] === "undefined") {
        setOpenSections((prev) => ({ ...prev, [key]: true }));
      }
    });
  }, [sectionsWithActive, openSections]);

  const closeMobileIfNeeded = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="sidebar-mobile-bg border-r border-gray-200/60">
      <SidebarHeader className="border-b border-gray-200 h-16 flex items-center justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12">
              <Link href="/super-admin/dashboard">
                {isCollapsed ? (
                  <BrandLogo variant="mark" alt="uventorybiz" className="h-8 w-8 object-contain" />
                ) : (
                  <BrandLogo
                    variant="full"
                    alt="uventorybiz business management"
                    className="h-10 w-auto object-contain"
                  />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2.5">
        <SidebarMenu className="flex flex-col gap-1">
          {sectionsWithActive.map(({ section, anyActive, key }) => {
            const isOpen = openSections[key] ?? false;
            const SectionIcon = section.sectionIcon;
            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  isActive={anyActive}
                  onClick={() => setSectionOpen(key, !isOpen)}
                  tooltip={section.label}
                  className={`
                    sidebar-nav-link flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-all duration-200 group cursor-pointer
                    ${anyActive ? "active" : ""}
                  `}
                  style={{
                    backgroundColor: anyActive ? "rgba(20, 47, 92, 0.08)" : "transparent",
                    color: anyActive ? "var(--uventorybiz-navy)" : "#1F2937",
                  }}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                      anyActive ? "bg-uventorybiz-navy/10" : "group-hover:bg-uventorybiz-navy/10"
                    }`}
                  >
                    <SectionIcon className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <span className="flex-1 text-left sidebar-label">{section.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-500 ease-in-out ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </SidebarMenuButton>
                <div
                  className="sidebar-dropdown-container"
                  style={{
                    maxHeight: isOpen ? "1000px" : "0",
                    overflow: "hidden",
                    transition: "max-height 500ms ease-in-out",
                  }}
                >
                  <SidebarMenuSub className="border-l-0 mt-0.5 space-y-1">
                    {section.items.map((item) => {
                      const active = isSuperAdminNavActive(item.href, pathname, hashFragment);
                      const ItemIcon = item.icon;
                      const superAdminTab = item.href.match(/^\/super-admin#(.+)$/);
                      const linkClass = `
                        flex items-center gap-2 w-full px-2 py-1 rounded-md transition-all duration-200 group
                        ${active ? "active" : ""}
                      `;
                      const linkStyle: CSSProperties = {
                        backgroundColor: active ? "rgba(20, 47, 92, 0.15)" : "transparent",
                        fontSize: "0.875rem",
                      };

                      if (superAdminTab) {
                        const tabValue = superAdminTab[1];
                        return (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton isActive={active} asChild>
                              <button
                                type="button"
                                className={linkClass}
                                style={linkStyle}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (pathname !== "/super-admin") {
                                    window.location.assign(`/super-admin#${tabValue}`);
                                  } else {
                                    window.dispatchEvent(
                                      new CustomEvent("sidebar-tab-navigate", {
                                        detail: { tabValue },
                                      }),
                                    );
                                  }
                                  closeMobileIfNeeded();
                                }}
                              >
                                <div
                                  className={`flex items-center justify-center w-5 h-5 rounded transition-colors shrink-0 ${
                                    active ? "bg-uventorybiz-navy/10" : "group-hover:bg-uventorybiz-navy/10"
                                  }`}
                                >
                                  <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                </div>
                                <span className="flex-1 text-left sidebar-label">{item.title}</span>
                                {item.comingSoon && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal">
                                    Soon
                                  </Badge>
                                )}
                              </button>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      }
                      return (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={active}>
                            <Link
                              href={item.href}
                              className={linkClass}
                              style={linkStyle}
                              onClick={closeMobileIfNeeded}
                            >
                              <div
                                className={`flex items-center justify-center w-5 h-5 rounded transition-colors shrink-0 ${
                                  active ? "bg-uventorybiz-navy/10" : "group-hover:bg-uventorybiz-navy/10"
                                }`}
                              >
                                <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              </div>
                              <span className="flex-1 sidebar-label">{item.title}</span>
                              {item.comingSoon && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal">
                                  Soon
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </div>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <div className="mt-4 px-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Resources</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/docs"} tooltip="Documentation">
                <a
                  href="/docs"
                  className="sidebar-nav-link flex items-center gap-2 w-full px-2 py-2 rounded-md transition-all duration-200 group"
                  style={{
                    backgroundColor:
                      pathname === "/docs" ? "rgba(20, 47, 92, 0.08)" : "transparent",
                    color: pathname === "/docs" ? "var(--uventorybiz-navy)" : "#1F2937",
                  }}
                  onClick={closeMobileIfNeeded}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                      pathname === "/docs" ? "bg-uventorybiz-navy/10" : "group-hover:bg-uventorybiz-navy/10"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <span className="flex-1 sidebar-label text-sm">Documentation</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200">
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
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName || "User"} {user?.lastName || ""}
                    </span>
                    <span className="truncate text-xs">{user?.role ? formatRole(user.role) : ""}</span>
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
                  <Link href="/profile" className="cursor-pointer" onClick={closeMobileIfNeeded}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600">
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

function SuperAdminHeaderContent() {
  const { user, logout } = useAuth();
  const authUser = user;
  const [location] = useLocation();
  const { state } = useSidebar();

  const isDashboard =
    location === "/super-admin/dashboard" || location.startsWith("/super-admin/dashboard/");
  const isConsole =
    location === "/super-admin" ||
    (location.startsWith("/super-admin/") &&
      !location.startsWith("/super-admin/dashboard") &&
      !location.startsWith("/super-admin/pitch-why") &&
      !location.startsWith("/super-admin/pitch") &&
      !location.startsWith("/super-admin/concept-note") &&
      !location.startsWith("/super-admin/business-proposal"));

  return (
    <div className="flex items-center h-16 px-4">
      <div className="xl:hidden">
        <BrandLogo variant="full" alt="uventorybiz" className="h-8 w-auto object-contain" />
      </div>

      <div className={`${state === "expanded" ? "hidden" : "hidden xl:block"}`}>
        <BrandLogo variant="full" alt="uventorybiz" className="h-8 w-auto object-contain" />
      </div>

      <nav
        className={`${
          state === "expanded" ? "hidden" : "hidden xl:flex"
        } items-center space-x-8 h-16 flex-1 ml-4`}
      >
        <Link
          href="/super-admin/dashboard"
          className={`nav-link-enhanced font-medium px-4 ${
            isDashboard ? "active text-uventorybiz-coral" : "text-uventorybiz-gray hover:text-uventorybiz-coral"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/super-admin"
          className={`nav-link-enhanced font-medium px-4 ${
            isConsole ? "active text-uventorybiz-coral" : "text-uventorybiz-gray hover:text-uventorybiz-coral"
          }`}
        >
          Console
        </Link>
      </nav>

      <div className="flex items-center space-x-4 ml-auto">
        <Button variant="ghost" size="sm" className="hidden md:flex">
          <Bell className="h-4 w-4 text-uventorybiz-gray" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2">
              <div className="hidden xl:flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {authUser?.firstName ?? ""} {authUser?.lastName ?? ""}
                  </p>
                  <p className="text-xs text-uventorybiz-gray">
                    {authUser?.role ? formatRole(authUser.role) : ""}
                  </p>
                </div>
                {authUser?.profileImageUrl ? (
                  <img
                    src={authUser.profileImageUrl}
                    alt={`${authUser?.firstName ?? ""} ${authUser?.lastName ?? ""}`.trim() || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-uventorybiz-gray" />
              </div>
              <div className="xl:hidden">
                {authUser?.profileImageUrl ? (
                  <img
                    src={authUser.profileImageUrl}
                    alt={`${authUser?.firstName ?? ""} ${authUser?.lastName ?? ""}`.trim() || "User"}
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
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" className="xl:hidden md:hidden">
          <Menu className="h-4 w-4 text-uventorybiz-gray" />
        </Button>
      </div>
    </div>
  );
}

function SuperAdminTopBar() {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <SuperAdminHeaderContent />
        </div>
      </div>
    </header>
  );
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <SidebarProvider defaultOpen>
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
      <div className="flex min-h-screen w-full bg-uventorybiz-light">
        <SuperAdminSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <SuperAdminTopBar />
          <main id="app-scroll-region" className="app-main flex-1 p-4 overflow-auto min-w-0 w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
