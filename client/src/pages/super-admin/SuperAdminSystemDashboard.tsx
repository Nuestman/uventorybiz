import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SuperAdminDashboardTenant = {
  id: string;
  name: string;
  status: string;
  planType: string;
  userCount: number;
  updatedAt?: string;
};

type SuperAdminSystemDashboardProps = {
  appVersion: string;
  userFirstName?: string | null;
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalTenantAdmins: number;
  feedbackTotal: number;
  feedbackNew: number;
  tenantsLoading: boolean;
  recentTenants: SuperAdminDashboardTenant[];
  onGoToTab: (tab: string) => void;
  onCreateTenant: () => void;
};

export default function SuperAdminSystemDashboard({
  appVersion,
  userFirstName,
  totalTenants,
  activeTenants,
  suspendedTenants,
  totalUsers,
  totalTenantAdmins,
  feedbackTotal,
  feedbackNew,
  tenantsLoading,
  recentTenants,
  onGoToTab,
  onCreateTenant,
}: SuperAdminSystemDashboardProps) {
  const greeting = userFirstName?.trim() ? `Welcome back, ${userFirstName.trim()}` : "Welcome to the platform console";

  const quickLinks: { label: string; tab: string; icon: typeof Building2; description: string }[] = [
    { label: "Organizations", tab: "tenants", icon: Building2, description: "Tenants, plans, and status" },
    { label: "Tenant administrators", tab: "admins", icon: UserCog, description: "Admins across all orgs" },
    { label: "All users", tab: "users", icon: Users, description: "Every user in the system" },
    { label: "API testing", tab: "api-testing", icon: Wrench, description: "Health checks and jobs" },
    { label: "Feedback inbox", tab: "feedback", icon: MessageSquare, description: "Product feedback from tenants" },
  ];

  const needsAttention =
    suspendedTenants > 0 || feedbackNew > 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#142F5C]/15 bg-gradient-to-br from-[#142F5C] via-[#1a3d6b] to-[#0f2847] p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#EAF6FF]/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              System administration
              <span className="text-white/50">·</span>
              <span className="text-white/80">v{appVersion}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 text-[#EAF6FF]" />
              {greeting}
            </h2>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed">
              Operate the uventorybiz platform: tenant lifecycle, access, and tooling — all in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button
              size="lg"
              className="bg-white text-[#142F5C] hover:bg-[#EAF6FF] font-semibold shadow-lg"
              onClick={onCreateTenant}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create tenant
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/15 backdrop-blur"
              onClick={() => onGoToTab("tenants")}
            >
              View organizations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {needsAttention && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center gap-3">
          <span className="font-semibold">Needs attention</span>
          {suspendedTenants > 0 && (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-amber-900"
              onClick={() => onGoToTab("tenants")}
            >
              {suspendedTenants} suspended organization{suspendedTenants === 1 ? "" : "s"}
            </button>
          )}
          {feedbackNew > 0 && (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-amber-900"
              onClick={() => onGoToTab("feedback")}
            >
              {feedbackNew} new feedback item{feedbackNew === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#142F5C]/80 mb-4">Platform snapshot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card className="border-[#142F5C]/15 shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] text-white">
              <CardTitle className="text-sm font-medium text-white/90">Organizations</CardTitle>
              <Building2 className="h-5 w-5 text-white/90" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-[#142F5C]">{tenantsLoading ? "—" : totalTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTenants} active
                {suspendedTenants > 0 && ` · ${suspendedTenants} suspended`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#142F5C]/15 shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] text-accent">
              <CardTitle className="text-sm font-medium text-white/90">Users (all tenants)</CardTitle>
              <Users className="h-5 w-5 " />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-[#142F5C]">{tenantsLoading ? "—" : totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Seats across the fleet</p>
            </CardContent>
          </Card>

          <Card className="border-[#142F5C]/15 shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] text-white">
              <CardTitle className="text-sm font-medium text-white/90">Tenant administrators</CardTitle>
              <Shield className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-[#142F5C]">{tenantsLoading ? "—" : totalTenantAdmins}</div>
              <p className="text-xs text-muted-foreground mt-1">Org-level admins</p>
            </CardContent>
          </Card>

          <Card className="border-[#142F5C]/15 shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] text-white">
              <CardTitle className="text-sm font-medium text-white/90">Feedback</CardTitle>
              <MessageSquare className="h-5 w-5 text-white/90" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-[#142F5C]">{tenantsLoading ? "—" : feedbackTotal}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {feedbackNew > 0 ? `${feedbackNew} new` : "No new items"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/80 bg-emerald-50/40 shadow-md sm:col-span-2 xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">Platform status</CardTitle>
              <Activity className="h-5 w-5 text-emerald-700" />
            </CardHeader>
            <CardContent className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-lg font-semibold text-emerald-900">Operational</span>
              </div>
              <p className="text-sm text-emerald-800/90">
                Core services and API routes are available. Deep health and audit views are on the roadmap.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#142F5C]/80 mb-4">Jump to</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ label, tab, icon: Icon, description }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onGoToTab(tab)}
              className="flex text-left gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#142F5C]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#142F5C]/8">
                <Icon className="h-5 w-5 text-[#142F5C]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[#142F5C] flex items-center gap-1">
                  {label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#142F5C]/80">
            Recent organizations
          </h3>
          <Button variant="ghost" size="sm" className="text-[#142F5C]" onClick={() => onGoToTab("tenants")}>
            Manage all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <Card className="border-[#142F5C]/15 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest activity</CardTitle>
            <CardDescription>Most recently updated tenants (up to five)</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : recentTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No organizations yet. Create your first tenant.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="hidden sm:table-cell">Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTenants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="capitalize">
                            {t.planType}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.userCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.status === "active"
                                ? "default"
                                : t.status === "suspended"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
