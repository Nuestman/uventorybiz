import { useLocation } from "wouter";
import { Truck, ClipboardCheck, Package } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import Inventory from "@/pages/Inventory";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetSection } from "./FleetSection";
import { FleetPrestartSection } from "./FleetPrestartSection";

const TAB_PATHS = {
  fleet: "/assets/fleet",
  "pre-start": "/assets/fleet/pre-start",
  inventory: "/assets/fleet/inventory",
} as const;

type FleetTab = keyof typeof TAB_PATHS;

function tabFromPath(pathOnly: string): FleetTab {
  if (pathOnly === "/assets/fleet/pre-start") return "pre-start";
  if (pathOnly === "/assets/fleet/inventory") return "inventory";
  return "fleet";
}

export default function FleetModule() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [location, setLocation] = useLocation();
  const pathOnly = location.split("?")[0].replace(/\/$/, "") || "/";
  const activeTab = tabFromPath(pathOnly);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-screen">
      <MobileNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Fleet
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            Vehicle register, on-board inventory, and pre-start checks
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const tab = v as FleetTab;
          if (tab in TAB_PATHS) setLocation(TAB_PATHS[tab]);
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
              Vehicle inventory
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {activeTab === "fleet" && <FleetSection isAdmin={isAdmin} />}
      {activeTab === "pre-start" && <FleetPrestartSection />}
      {activeTab === "inventory" && <Inventory ambulanceInventoryMode />}
    </div>
  );
}
