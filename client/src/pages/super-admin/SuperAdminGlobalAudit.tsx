import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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

export type GlobalAuditLogRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  originalData: unknown;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
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
    <details className="text-xs max-w-[min(100vw,280px)]">
      <summary className="cursor-pointer text-[#142F5C] font-medium select-none">View JSON</summary>
      <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 border border-slate-200 text-slate-700 whitespace-pre-wrap break-all">
        {text}
      </pre>
    </details>
  );
}

export default function SuperAdminGlobalAudit() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/super-admin/global-audit-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/global-audit-logs");
      return res.json() as Promise<GlobalAuditLogRow[]>;
    },
  });

  const rows = data ?? [];

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#142F5C] mb-2">Global audit log</h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Recent <code className="text-xs bg-slate-100 px-1 rounded">audit_logs</code> rows across all organisations,
            read-only. For impersonation session events, use the impersonation log.
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
          {error instanceof Error ? error.message : "Failed to load global audit log."}
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="text-slate-600 text-sm py-4">No audit log entries found.</p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Time (UTC)</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead className="max-w-[100px]">IP</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Original data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-slate-600 text-sm whitespace-nowrap align-top">
                    {row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-800 align-top">{row.tenantName ?? row.tenantId}</TableCell>
                  <TableCell className="text-sm align-top">
                    <div className="font-medium text-slate-900">
                      {displayName(row.userFirstName, row.userLastName, row.userEmail)}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]" title={row.userEmail ?? ""}>
                      {row.userEmail ?? row.userId}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className="font-mono text-xs font-normal">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700 align-top">{row.resourceType}</TableCell>
                  <TableCell
                    className="font-mono text-xs text-slate-600 align-top max-w-[120px] truncate"
                    title={row.resourceId ?? ""}
                  >
                    {row.resourceId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 align-top truncate max-w-[100px]" title={row.ipAddress ?? ""}>
                    {row.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <DetailsJson value={row.details} />
                  </TableCell>
                  <TableCell className="align-top">
                    <DetailsJson value={row.originalData} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <p className="text-xs text-slate-500 mt-4">Showing up to 500 most recent rows.</p>
      )}
    </div>
  );
}
