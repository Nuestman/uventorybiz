import { useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Package, Plus, Pencil, Trash2, Loader2, Filter } from "lucide-react";
import type { AmbulanceRow } from "./types";
import { OpsBadge } from "./ambulanceUi";
import { AmbulanceFormDialog, DeleteAmbulanceDialog } from "./AmbulanceFleetDialogs";

export function AmbulanceFleetSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AmbulanceRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<AmbulanceRow | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: ambulances = [], isLoading } = useQuery<AmbulanceRow[]>({
    queryKey: ["/api/ambulances", { includeInactive }],
    queryFn: async () => {
      const q = includeInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/ambulances${q}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: fixedSites = [] } = useQuery<{ id: string; locationName: string; locationCode: string }[]>({
    queryKey: ["/api/care-locations", { locationKind: "fixed_site", includeInactive: true }],
    enabled: createOpen || !!editRow,
  });

  const stockSummaryQueries = useQueries({
    queries: ambulances.map((a) => ({
      queryKey: ["/api/ambulances", a.id, "stock-summary"] as const,
      queryFn: async () => {
        const res = await fetch(`/api/ambulances/${a.id}/stock-summary`, { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as {
          lineCount: number;
          totalUnits: number;
          lowStockLineCount: number;
        };
      },
      staleTime: 60_000,
      enabled: !isLoading && ambulances.length > 0,
    })),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fleet register</h3>
          <p className="text-uventorybiz-gray text-sm mt-1 max-w-2xl">
            Each fleet vehicle is an inventory location. Stock transfers and adjustments use the same flows as stores and
            the central store.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Register vehicle
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="h-5 w-5 mr-2" />
            Fleet filters
          </CardTitle>
          <CardDescription>Show inactive units in the table</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm text-uventorybiz-gray cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-input"
            />
            Show inactive vehicles
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered units</CardTitle>
          <CardDescription>Operational status and home post / clinic</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : ambulances.length === 0 ? (
            <p className="text-uventorybiz-gray py-8 text-center">
              No fleet vehicles registered yet.
              {isAdmin && " Add one to start tracking on-board inventory."}
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / code</TableHead>
                    <TableHead>Ops status</TableHead>
                    <TableHead>Stationed at</TableHead>
                    <TableHead>On-board stock</TableHead>
                    <TableHead>Call sign / plate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambulances.map((row, idx) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link href={`/fleet/units/${row.id}`}>
                          <span className="font-medium text-uventorybiz-navy hover:underline">{row.locationName}</span>
                        </Link>
                        <div className="text-xs text-muted-foreground">{row.locationCode}</div>
                      </TableCell>
                      <TableCell>
                        <OpsBadge status={row.ambulanceOpsStatus} />
                      </TableCell>
                      <TableCell>
                        {row.stationedAtLocationName ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {row.stationedAtLocationName}
                          </span>
                        ) : row.coverageNotes ? (
                          <span className="text-sm text-muted-foreground line-clamp-2" title={row.coverageNotes}>
                            Multi-post / pooled
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const q = stockSummaryQueries[idx];
                          if (q?.isLoading) {
                            return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
                          }
                          if (q?.isError || !q?.data) {
                            return <span className="text-muted-foreground">—</span>;
                          }
                          const { lineCount, totalUnits, lowStockLineCount } = q.data;
                          return (
                            <span>
                              <span className="font-medium">{lineCount}</span>
                              <span className="text-muted-foreground"> lines · </span>
                              <span className="font-medium">{totalUnits}</span>
                              <span className="text-muted-foreground"> units</span>
                              {lowStockLineCount > 0 && (
                                <span className="text-amber-700 font-medium"> · {lowStockLineCount} low</span>
                              )}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {[row.callSign, row.registrationPlate].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="inline-flex flex-row">
                            <Link href={`/fleet/units/${row.id}`} className="flex">
                              <Package className="h-4 w-4 mr-1" />
                              Stock
                            </Link>
                          </div>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setEditRow(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteRow(row)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <AmbulanceFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          fixedSites={fixedSites}
          mode="create"
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/ambulances"] });
            setCreateOpen(false);
            toast({ title: "Vehicle registered" });
          }}
        />
      )}

      {isAdmin && editRow && (
        <AmbulanceFormDialog
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          fixedSites={fixedSites}
          mode="edit"
          initial={editRow}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/ambulances"] });
            setEditRow(null);
            toast({ title: "Vehicle updated" });
          }}
        />
      )}

      {isAdmin && deleteRow && (
        <DeleteAmbulanceDialog
          row={deleteRow}
          onClose={() => setDeleteRow(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/ambulances"] });
            queryClient.invalidateQueries({ queryKey: ["/api/care-locations"] });
            setDeleteRow(null);
            toast({ title: "Vehicle removed" });
          }}
        />
      )}
    </div>
  );
}
