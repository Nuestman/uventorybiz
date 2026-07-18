import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TenantRow = {
  id: string;
  name: string;
  planType: string;
  status: string;
  userCount: number;
};

export default function SuperAdminBilling() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/super-admin/tenants", "billing-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/tenants");
      return res.json() as Promise<TenantRow[]>;
    },
  });

  const tenants = data ?? [];

  const planSummary = useMemo(() => {
    const byPlan: Record<string, number> = {};
    const activeByPlan: Record<string, number> = {};
    for (const t of tenants) {
      const p = t.planType || "unknown";
      byPlan[p] = (byPlan[p] ?? 0) + 1;
      if (t.status === "active") {
        activeByPlan[p] = (activeByPlan[p] ?? 0) + 1;
      }
    }
    return { byPlan, activeByPlan };
  }, [tenants]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#142F5C] mb-2">Billing & plans</h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Plan type is stored per organisation (<code className="text-xs bg-slate-100 px-1 rounded">tenants.plan_type</code>
            ). Payment processing and invoicing are not integrated here; this view summarises assignments only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="text-sm font-medium text-[#142F5C] underline-offset-2 hover:underline disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mb-6">
        <Link
          href="/super-admin#tenants"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#142F5C] underline-offset-2 hover:underline"
        >
          Open organisations console <ExternalLink className="h-4 w-4" />
        </Link>
        <p className="text-xs text-slate-500 mt-1">Change plans from the tenant row actions on that screen.</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-600 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-sm py-4">
          {error instanceof Error ? error.message : "Failed to load tenants."}
        </p>
      )}

      {!isLoading && !isError && tenants.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {Object.keys(planSummary.byPlan)
              .sort()
              .map((plan) => (
                <Card key={plan} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base capitalize text-[#142F5C]">{plan}</CardTitle>
                    <CardDescription>Organisations on this plan</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">{planSummary.byPlan[plan]}</span> total
                    </p>
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-900">{planSummary.activeByPlan[plan] ?? 0}</span> active
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "active" ? "default" : "secondary"} className="font-normal capitalize">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-slate-800">{t.planType}</TableCell>
                    <TableCell className="text-right text-slate-700">{t.userCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && !isError && tenants.length === 0 && (
        <p className="text-slate-600 text-sm py-4">No organisations yet.</p>
      )}
    </div>
  );
}
