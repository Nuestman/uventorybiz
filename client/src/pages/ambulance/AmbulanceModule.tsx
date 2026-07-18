import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ambulance, ClipboardCheck, Package, Truck } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import Inventory from "@/pages/Inventory";
import { AmbulanceFleetSection } from "./AmbulanceFleetSection";
import { AmbulancePrestartSection } from "./AmbulancePrestartSection";

const VALID_TABS = ["fleet", "pre-start", "inventory"] as const;
type AmbulanceTab = (typeof VALID_TABS)[number];

function isAmbulanceTab(h: string): h is AmbulanceTab {
  return VALID_TABS.includes(h as AmbulanceTab);
}

export default function AmbulanceModule() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [activeTab, setActiveTab] = useState<AmbulanceTab>("fleet");
  const [location] = useLocation();

  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent<{ tabValue: string }>) => {
      const v = e.detail.tabValue;
      if (isAmbulanceTab(v)) setActiveTab(v);
    };
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && isAmbulanceTab(hash)) setActiveTab(hash);
    };

    window.addEventListener("sidebar-tab-navigate", handleTabNavigate as EventListener);
    window.addEventListener("hashchange", syncFromHash);
    syncFromHash();

    return () => {
      window.removeEventListener("sidebar-tab-navigate", handleTabNavigate as EventListener);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  useEffect(() => {
    if (!location.startsWith("/fleet") && !location.startsWith("/ambulance")) return;
    const hash = window.location.hash.replace("#", "");
    if (hash && isAmbulanceTab(hash)) setActiveTab(hash);
  }, [location]);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <MobileNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ambulance className="h-8 w-8 text-uventorybiz-navy" />
            Fleet
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            Vehicle register, on-board consumables and equipment, and shift pre-start safety checks
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isAmbulanceTab(v)) {
            setActiveTab(v);
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${v}`);
          }
        }}
        className="w-full"
      >
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-1 min-[420px]:grid-cols-3 bg-transparent h-auto p-1 gap-2">
            <TabsTrigger value="fleet" className="tab-trigger-custom text-sm">
              <Truck className="h-4 w-4 mr-2" />
              Fleet
            </TabsTrigger>
            <TabsTrigger value="pre-start" className="tab-trigger-custom text-sm">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Pre-start checks
            </TabsTrigger>
            <TabsTrigger value="inventory" className="tab-trigger-custom text-sm">
              <Package className="h-4 w-4 mr-2" />
              On-board inventory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fleet" className="space-y-6">
          <AmbulanceFleetSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="pre-start" className="space-y-6">
          <AmbulancePrestartSection />
        </TabsContent>

        <TabsContent value="inventory" className="mt-0 space-y-0">
          <Inventory ambulanceInventoryMode />
        </TabsContent>
      </Tabs>
    </div>
  );
}
