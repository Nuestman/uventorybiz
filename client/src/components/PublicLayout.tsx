import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import PublicFooter from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Menu, X } from "lucide-react";
import { formatRole } from "@/lib/formatters";
import { BrandLogo } from "@/components/BrandLogo";

const PUBLIC_NAV_LINKS: Array<
  | { type: "anchor"; href: string; label: string }
  | { type: "route"; href: string; label: string }
> = [
  { type: "route", href: "/features", label: "Features" },
  { type: "anchor", href: "/#pricing", label: "Pricing" },
  { type: "route", href: "/about", label: "About" },
  { type: "route", href: "/contacts", label: "Contact" },
  { type: "route", href: "/portal", label: "Customer portal" },
];

interface PublicLayoutProps {
  children: ReactNode;
}

function PublicHeader() {
  const { user, logout } = useAuth();

  const isAuthenticated = !!user;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8 flex-1">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <BrandLogo variant="full" alt="uventorybiz" className="h-8 w-auto" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-uventorybiz-navy">
            {PUBLIC_NAV_LINKS.map((item) =>
              item.type === "anchor" ? (
                <a key={item.href} href={item.href} className="hover:text-uventorybiz-orange transition-colors">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className="hover:text-uventorybiz-orange transition-colors">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop auth controls */}
          <div className="hidden sm:flex items-center gap-3">
            {!isAuthenticated && (
              <Link href="/auth">
                <Button variant="outline" className="text-sm font-semibold">
                  Staff sign in
                </Button>
              </Link>
            )}

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 px-2 py-1 h-10"
                  >
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User"}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-900">
                        {user?.firstName || user?.lastName
                          ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                          : user?.email ?? "User"}
                      </span>
                      {user?.role && (
                        <span className="text-xs text-uventorybiz-gray">
                          {formatRole(user.role)}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
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
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-md p-2 text-uventorybiz-navy hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-uventorybiz-navy md:hidden transition-transform duration-200 ${
              mobileOpen ? "rotate-90 scale-95" : "rotate-0 scale-100"
            }`}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5 transition-transform duration-200" />
            ) : (
              <Menu className="h-5 w-5 transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute top-0 right-0 w-2/3 max-w-xs bg-white shadow-xl border-l border-gray-200 transform transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-4 pb-4 space-y-2 text-sm font-medium text-uventorybiz-navy">
            {PUBLIC_NAV_LINKS.map((item, index) => {
              const delay = `${40 + index * 40}ms`;
              const className = `block py-1.5 transform transition-all duration-200 ${
                mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`;
              return item.type === "anchor" ? (
                <a
                  key={item.href}
                  href={item.href}
                  className={className}
                  style={{ transitionDelay: mobileOpen ? delay : "0ms" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={className}
                  style={{ transitionDelay: mobileOpen ? delay : "0ms" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-gray-100 mt-2">
              {!isAuthenticated ? (
                <Link
                  href="/auth"
                  className={`block py-1.5 text-uventorybiz-orange transform transition-all duration-200 ${
                    mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: mobileOpen ? "280ms" : "0ms" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Staff sign in
                </Link>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className={`block py-1.5 transform transition-all duration-200 ${
                      mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                    }`}
                    style={{ transitionDelay: mobileOpen ? "300ms" : "0ms" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className={`block py-1.5 transform transition-all duration-200 ${
                      mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                    }`}
                    style={{ transitionDelay: mobileOpen ? "340ms" : "0ms" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className={`block py-1.5 transform transition-all duration-200 ${
                      mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                    }`}
                    style={{ transitionDelay: mobileOpen ? "380ms" : "0ms" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className={`block w-full text-left py-1.5 text-red-600 transform transition-all duration-200 ${
                      mobileOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                    }`}
                    style={{ transitionDelay: mobileOpen ? "420ms" : "0ms" }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-uventorybiz-light">
      <PublicHeader />
      {/* min-h-0 + overflow: scroll lives here (not on window) so route changes reset reliably */}
      <main
        id="public-scroll-region"
        className="flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto"
      >
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

