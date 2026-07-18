import { PortalSidebarContent, type PortalSidebarContentProps } from "./PortalSidebarContent";

type PortalDesktopSidebarProps = Omit<PortalSidebarContentProps, "onNavigate" | "className">;

export function PortalDesktopSidebar(props: PortalDesktopSidebarProps) {
  return (
    <aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[272px] md:z-50"
      aria-label="Portal navigation"
    >
      <PortalSidebarContent {...props} className="w-full" />
    </aside>
  );
}
