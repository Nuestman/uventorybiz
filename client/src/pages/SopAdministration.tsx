import { useAuth } from "@/hooks/useAuth";
import Unauthorized from "@/pages/unauthorized";
import AccessDenied from "@/pages/access-denied";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SopAdminWorkspace from "@/components/sop/SopAdminWorkspace";

import { BrandLogo } from "@/components/BrandLogo";

/**
 * Full-screen SOP authoring and approval (tenant administrators only).
 * Mirrors the standalone Docs experience: focused layout outside MainLayout.
 */
export default function SopAdministration() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 border-2 border-slate-300 border-t-[#142F5C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Unauthorized />;
  }

  const isTenantAdmin = user.role === "admin" && Boolean(user.tenantId);
  if (!isTenantAdmin) {
    return (
      <AccessDenied
        title="Administrator access required"
        message="Standard operating procedures can only be managed by tenant administrators."
        requiredRole="Tenant administrator"
        currentRole={user.role ?? undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo variant="full" alt="uventorybiz" className="h-7 w-auto shrink-0" />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="text-slate-600" asChild>
              <Link href="/sop">SOP Library</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-600 hidden sm:inline-flex" asChild>
              <Link href="/admin">Admin Panel</Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <SopAdminWorkspace />
      </div>
    </div>
  );
}
