import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatRole } from "@/lib/formatters";
import { NotificationBell } from "@/components/NotificationBell";

const uventorybizLogoFull = "/public/logos/uventorybiz-logo-full.png";
const uventorybizLogoMark = "/public/logos/uventorybiz-logo-mark.png";

export default function Header() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/dashboard" || location.startsWith("/dashboard/"))) return true;
    if (path === "/" && location === "/") return true;
    if (path !== "/" && path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/dashboard">
            <div className="flex items-center cursor-pointer">
              {/* Desktop Logo */}
              <div className="hidden md:block">
                <img 
                  src={uventorybizLogoFull} 
                  alt="uventorybiz business management" 
                  className="h-8 w-auto"
                />
              </div>
              {/* Mobile Logo */}
              <div className="md:hidden">
                <img 
                  src={uventorybizLogoMark} 
                  alt="uventorybiz" 
                  className="h-8 w-8"
                />
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex h-16">
            <Link href="/dashboard" className={`nav-link-enhanced font-medium px-4 ${
              isActive("/dashboard") 
                ? "active" 
                : "text-mineaid-gray"
            }`}>
              Dashboard
            </Link>
            <Link href="/patients" className={`nav-link-enhanced font-medium px-4 ${
              isActive("/patients") 
                ? "active" 
                : "text-mineaid-gray"
            }`}>
              Patients
            </Link>
            <Link href="/appointments" className={`nav-link-enhanced font-medium px-4 ${
              isActive("/appointments") 
                ? "active" 
                : "text-mineaid-gray"
            }`}>
              Appointments
            </Link>
            <Link href="/records" className={`nav-link-enhanced font-medium px-4 ${
              isActive("/records") 
                ? "active" 
                : "text-mineaid-gray"
            }`}>
              Records
            </Link>
            <Link href="/incidents" className={`nav-link-enhanced font-medium px-4 ${
              isActive("/incidents") 
                ? "active" 
                : "text-mineaid-gray"
            }`}>
              Incidents
            </Link>
          </nav>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-100">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt={`${user?.firstName || 'User'} ${user?.lastName || ''}`}
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-8 h-8 bg-mineaid-navy rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user?.firstName?.charAt(0) ?? user?.lastName?.charAt(0) ?? 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email ?? 'Medical Staff'}
                    </p>
                    <p className="text-xs text-mineaid-gray">
                      {user?.role ? formatRole(user.role) : 'Medical Officer'}
                    </p>
                  </div>
                  <ChevronDown className="hidden sm:block h-4 w-4 text-mineaid-gray" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4 text-mineaid-gray" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
