import { Link, useLocation } from "wouter";
import { Home, Calendar, AlertTriangle, Package, ClipboardList, ShoppingCart, Wrench } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export default function MobileNav() {
  const [location] = useLocation();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  
  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/dashboard" || location.startsWith("/dashboard/"))) return true;
    if (path === "/" && location === "/") return true;
    if (path !== "/" && path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/appointments", icon: Calendar, label: "Appointments", featureFlag: "appointments" },
    { href: "/incidents", icon: AlertTriangle, label: "Incidents" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/inventory-transactions", icon: ClipboardList, label: "Transactions" },
    { href: "/purchase-orders", icon: ShoppingCart, label: "Purchase Orders" },
    { href: "/equipment-tracking", icon: Wrench, label: "Equipment" },
  ].filter((item) => !item.featureFlag || (!flagsLoading && (flags[item.featureFlag] ?? true)));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 md:hidden z-50 overflow-x-auto">
      <div className="flex items-center justify-start space-x-2 min-w-max px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors flex-shrink-0 ${
              active 
                ? "text-uventorybiz-navy bg-blue-50" 
                : "text-uventorybiz-gray hover:text-uventorybiz-navy"
            }`}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}