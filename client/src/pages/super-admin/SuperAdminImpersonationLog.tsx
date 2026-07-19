import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImpersonationEventRow = {
  id: string;
  impersonatorUserId: string;
  targetUserId: string;
  targetTenantId: string | null;
  action: string;
  reason: string | null;
  sessionTokenPrefix: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
  createdAt: string | null;
  impersonatorEmail: string | null;
  impersonatorFirstName: string | null;
  impersonatorLastName: string | null;
  targetEmail: string | null;
  targetFirstName: string | null;
  targetLastName: string | null;
  tenantName: string | null;
};

export type ImpersonationCrudAuditRow = {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: unknown;
  createdAt: string | null;
  effectiveUserEmail: string | null;
  effectiveUserFirstName: string | null;
  effectiveUserLastName: string | null;
  tenantName: string | null;
  impersonatorUserId: string | null;
  impersonatorEmail: string | null;
  impersonatorFirstName: string | null;
  impersonatorLastName: string | null;
};

function displayName(first: string | null | undefined, last: string | null | undefined, email: string | null | undefined) {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n || email || "—";
}

function DetailsJson({ value }: { value: unknown }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <details className="text-xs max-w-[min(100vw,380px)]">
      <summary className="cursor-pointer text-[#142F5C] font-medium select-none">View JSON</summary>
      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-50 p-2 border border-slate-200 text-slate-700 whitespace-pre-wrap break-all">
        {text}
      </pre>
    </details>
  );
}

export default function SuperAdminImpersonationLog() {
  const [openModalEventId, setOpenModalEventId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/super-admin/impersonation-events"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/impersonation-events", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ImpersonationEventRow[]>;
    },
  });

  const sessionCrudQuery = useQuery({
    queryKey: ["/api/super-admin/impersonation-events", openModalEventId, "session-audit-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/impersonation-events/${openModalEventId}/audit-logs`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{
        eventId: string;
        window: { start: string; end: string };
        auditLogs: ImpersonationCrudAuditRow[];
      }>;
    },
    enabled: !!openModalEventId,
  });

  const rows = data ?? [];
  const canViewSessionCrud = (action: string) => action === "start" || action === "end";

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#142F5C] mb-2">Impersonation log</h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Platform-level session events (start, end, logout). Use <strong>View CRUD</strong> on a start or end row to
            load tenant audit entries recorded during that impersonation window (same operator, target user, and time
            bounds).
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
          {error instanceof Error ? error.message : "Failed to load impersonation log."}
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="text-slate-600 text-sm py-4">No impersonation session events recorded yet.</p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="whitespace-nowrap">Time (UTC)</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Platform operator</TableHead>
                <TableHead>Viewed as (target)</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="whitespace-nowrap">Session prefix</TableHead>
                <TableHead className="max-w-[120px]">IP</TableHead>
                <TableHead className="max-w-[180px]">User agent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="text-slate-600 text-sm whitespace-nowrap align-top">
                    {row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss") : "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={row.action === "start" ? "default" : "secondary"} className="font-normal">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm align-top">
                    <div className="font-medium text-slate-900">
                      {displayName(row.impersonatorFirstName, row.impersonatorLastName, row.impersonatorEmail)}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]" title={row.impersonatorEmail ?? ""}>
                      {row.impersonatorEmail ?? row.impersonatorUserId}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm align-top">
                    <div className="font-medium text-slate-900">
                      {displayName(row.targetFirstName, row.targetLastName, row.targetEmail)}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]" title={row.targetEmail ?? ""}>
                      {row.targetEmail ?? row.targetUserId}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700 align-top">
                    {row.tenantName ?? row.targetTenantId ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 align-top">{row.reason ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 align-top">{row.sessionTokenPrefix ?? "—"}</TableCell>
                  <TableCell className="text-xs text-slate-500 align-top truncate max-w-[120px]" title={row.ipAddress ?? ""}>
                    {row.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell
                    className="text-xs text-slate-500 align-top truncate max-w-[180px]"
                    title={row.userAgent ?? ""}
                  >
                    {row.userAgent ?? "—"}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {canViewSessionCrud(row.action) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setOpenModalEventId(row.id)}
                      >
                        View CRUD
                      </Button>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <p className="text-xs text-slate-500 mt-4">Showing up to 500 most recent session events.</p>
      )}

      <Dialog
        open={!!openModalEventId}
        onOpenChange={(open) => {
          if (!open) setOpenModalEventId(null);
        }}
      >
        <DialogContent className="max-w-[min(100vw,960px)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>CRUD actions for this session</DialogTitle>
            <DialogDescription className="text-left">
              {sessionCrudQuery.data?.window ? (
                <>
                  Audit window (UTC):{" "}
                  <span className="font-mono text-slate-800">
                    {format(new Date(sessionCrudQuery.data.window.start), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                  {" → "}
                  <span className="font-mono text-slate-800">
                    {format(new Date(sessionCrudQuery.data.window.end), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                  . Rows are tenant <code className="text-xs bg-slate-100 px-1 rounded">audit_logs</code> with operator
                  context, scoped to the impersonated user and this time range.
                </>
              ) : (
                "Loading window…"
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
            {sessionCrudQuery.isLoading && (
              <div className="flex items-center gap-2 text-slate-600 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading audit entries…
              </div>
            )}
            {sessionCrudQuery.isError && (
              <p className="text-red-600 text-sm py-4">
                {sessionCrudQuery.error instanceof Error ? sessionCrudQuery.error.message : "Failed to load."}
              </p>
            )}
            {!sessionCrudQuery.isLoading &&
              !sessionCrudQuery.isError &&
              sessionCrudQuery.data &&
              sessionCrudQuery.data.auditLogs.length === 0 && (
                <p className="text-slate-600 text-sm py-4">No CRUD audit rows in this window.</p>
              )}
            {!sessionCrudQuery.isLoading &&
              !sessionCrudQuery.isError &&
              sessionCrudQuery.data &&
              sessionCrudQuery.data.auditLogs.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="whitespace-nowrap">Time (UTC)</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Resource ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionCrudQuery.data.auditLogs.map((log, index) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                          <TableCell className="text-slate-600 text-sm whitespace-nowrap align-top">
                            {log.createdAt ? format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss") : "—"}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className="font-mono text-xs font-normal">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 align-top">{log.resourceType}</TableCell>
                          <TableCell
                            className="font-mono text-xs text-slate-600 align-top max-w-[120px] truncate"
                            title={log.resourceId ?? ""}
                          >
                            {log.resourceId ?? "—"}
                          </TableCell>
                          <TableCell className="align-top">
                            <DetailsJson value={log.details} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
