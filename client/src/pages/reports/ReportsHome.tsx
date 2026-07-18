import { Link } from "wouter";
import { Activity, AlertTriangle, BarChart3, ChevronRight, ClipboardCheck, LayoutDashboard, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import {
  hasComplianceReportsAccess,
  hasIncidentReportsAccess,
  hasOperationsReportsAccess,
} from "@/routes";

export default function ReportsHome() {
  const { user } = useAuth();
  const canIncidents = hasIncidentReportsAccess(user?.role);
  const canOperations = hasOperationsReportsAccess(user?.role);
  const canCompliance = hasComplianceReportsAccess(user?.role);
  const availableCount =
    1 + Number(canIncidents) + Number(canOperations) + Number(canCompliance);

  const upcomingModules = [
    {
      key: "custom",
      title: "Custom",
      description: "Guardrailed report builder with reusable saved definitions and export-ready tables.",
      icon: Settings2,
    },
  ];

  return (
    <div
      className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-gradient-to-b from-uventorybiz-light-gray to-white min-h-[60vh]"
      data-testid="reports-home"
    >
      <div className="rounded-2xl border border-[#142F5C]/15 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#142F5C] to-[#1F4A80] px-5 py-6 sm:px-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 shrink-0" />
            Reports Hub
          </h1>
            <p className="mt-2 text-white/90 text-sm sm:text-base max-w-3xl">
            Central analytics workspace for operations, incidents, and compliance.
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border border-border/70 px-3 py-2 bg-slate-50">
            <p className="text-muted-foreground">Available now</p>
            <p className="font-semibold text-foreground">{availableCount} modules</p>
          </div>
          <div className="rounded-lg border border-border/70 px-3 py-2 bg-slate-50">
            <p className="text-muted-foreground">Planned next</p>
            <p className="font-semibold text-foreground">Custom</p>
          </div>
          <div className="rounded-lg border border-border/70 px-3 py-2 bg-slate-50">
            <p className="text-muted-foreground">Data policy</p>
            <p className="font-semibold text-foreground">Aggregate analytics by default</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Available modules</h2>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 max-w-4xl">
        <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 border-[#142F5C]/15">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <LayoutDashboard className="h-9 w-9 text-uventorybiz-navy shrink-0 mt-0.5" />
              <div>
                <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Live
                </div>
                <CardTitle className="text-lg">Overview reports</CardTitle>
                <CardDescription className="mt-1">
                  Executive snapshot across incidents, operations, shift handover, and high-level cross-domain trends.
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Single-screen leadership signal before opening detailed report modules.</p>
            <Link
              href="/reports/overview"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#142F5C] hover:text-[#1F4A80] hover:underline"
            >
              Open overview reports
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>

        {canIncidents ? (
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 border-[#142F5C]/15">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-9 w-9 text-uventorybiz-navy shrink-0 mt-0.5" />
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Live
                    </div>
                    <CardTitle className="text-lg">Incident &amp; safety reports</CardTitle>
                    <CardDescription className="mt-1">
                      Severity and type trends, status pipeline, employer and location breakdowns, fleet and site-hold
                      flags.
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>HSE analytics without affected employee names — aligned with workplace incident data.</p>
                <Link
                  href="/reports/incidents"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#142F5C] hover:text-[#1F4A80] hover:underline"
                >
                  Open incident &amp; safety reports
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
        ) : null}

        {canOperations ? (
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 border-[#142F5C]/15">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Activity className="h-9 w-9 text-uventorybiz-navy shrink-0 mt-0.5" />
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Live
                    </div>
                    <CardTitle className="text-lg">Operations reports</CardTitle>
                    <CardDescription className="mt-1">
                      Ticket throughput, duty completion posture, and ShiftOver-linked operational metrics.
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Operational analytics for backlog, aging, assignment completion, and shift handover signal quality.</p>
                <Link
                  href="/reports/operations"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#142F5C] hover:text-[#1F4A80] hover:underline"
                >
                  Open operations reports
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
        ) : null}

        {canCompliance ? (
            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 border-[#142F5C]/15">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="h-9 w-9 text-uventorybiz-navy shrink-0 mt-0.5" />
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Live
                    </div>
                    <CardTitle className="text-lg">Compliance reports</CardTitle>
                    <CardDescription className="mt-1">
                      Audit aggregates, SOP workflow posture, legal document uploads, and shift acknowledgment coverage.
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>Governance-friendly summaries without raw audit payloads in exports.</p>
                <Link
                  href="/reports/compliance"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#142F5C] hover:text-[#1F4A80] hover:underline"
                >
                  Open compliance reports
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
        ) : null}
        </div>
      </div>

      <div className="space-y-3 max-w-4xl">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Roadmap modules</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcomingModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.key} className="border-dashed border-border/80 bg-slate-50/70">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <Icon className="h-6 w-6 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <CardTitle className="text-base">{module.title}</CardTitle>
                        <CardDescription className="mt-1">{module.description}</CardDescription>
                      </div>
                    </div>
                    <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Planned
                    </span>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
