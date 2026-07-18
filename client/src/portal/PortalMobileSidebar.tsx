import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PortalSidebarContent, type PortalSidebarContentProps } from "./PortalSidebarContent";

type PortalMobileSidebarProps = Omit<PortalSidebarContentProps, "onNavigate" | "className">;

export function PortalMobileSidebar(props: PortalMobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Open portal menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[272px] max-w-[85vw] p-0 border-0 [&>button]:text-white [&>button]:hover:text-white/90"
      >
        <SheetTitle className="sr-only">Portal navigation</SheetTitle>
        <PortalSidebarContent {...props} className="min-h-full" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
