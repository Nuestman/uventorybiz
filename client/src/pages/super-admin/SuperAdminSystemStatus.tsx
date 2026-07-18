import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SystemStatusPayload = {
  database: "ok" | "error";
  nodeVersion: string;
  nodeEnv: string;
  processUptimeSeconds: number;
  generatedAt: string;
  counts: {
    tenants: number;
    activeTenants: number;
    users: number;
    tenantBoundUsers: number;
    superAdminUsers: number;
    impersonationEventsLast24h: number;
  };
  countsError?: string;
};

function formatUptime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SuperAdminSystemStatus() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/super-admin/system-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/system-status");
      return res.json() as Promise<SystemStatusPayload>;
    },
  });

  return (
    <div className="max-w-[1000px] mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#142F5C] mb-2">System status</h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Read-only snapshot of this deployment: database connectivity, process metadata, and platform scale.
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

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-600 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-sm py-4">
          {error instanceof Error ? error.message : "Failed to load system status."}
        </p>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#142F5C]">Database</CardTitle>
              <CardDescription>Connectivity probe (no credentials shown).</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={data.database === "ok" ? "default" : "destructive"} className="font-normal">
                {data.database === "ok" ? "Connected" : "Unreachable"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#142F5C]">Application</CardTitle>
              <CardDescription>Node runtime and uptime for this server process.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 space-y-1">
              <p>
                <span className="text-slate-500">Node</span>{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">{data.nodeVersion}</code>
              </p>
              <p>
                <span className="text-slate-500">NODE_ENV</span>{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">{data.nodeEnv}</code>
              </p>
              <p>
                <span className="text-slate-500">Uptime</span> {formatUptime(data.processUptimeSeconds)}
              </p>
              <p className="text-xs text-slate-500">
                Generated (UTC): {format(new Date(data.generatedAt), "yyyy-MM-dd HH:mm:ss")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#142F5C]">Platform scale</CardTitle>
              <CardDescription>Aggregates from the primary database.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.countsError && (
                <p className="text-amber-700 text-sm mb-3">
                  Counts partially unavailable: {data.countsError}
                </p>
              )}
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Organisations</dt>
                  <dd className="font-semibold text-slate-900">{data.counts.tenants}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Active organisations</dt>
                  <dd className="font-semibold text-slate-900">{data.counts.activeTenants}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">All users</dt>
                  <dd className="font-semibold text-slate-900">{data.counts.users}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tenant-bound users</dt>
                  <dd className="font-semibold text-slate-900">{data.counts.tenantBoundUsers}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Platform super admins</dt>
                  <dd className="font-semibold text-slate-900">{data.counts.superAdminUsers}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Impersonation events (24h)</dt>
                  <dd className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                    {data.counts.impersonationEventsLast24h}
                    <Link
                      href="/super-admin/impersonation-log"
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-[#142F5C] underline-offset-2 hover:underline"
                    >
                      Log <ExternalLink className="h-3 w-3" />
                    </Link>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
