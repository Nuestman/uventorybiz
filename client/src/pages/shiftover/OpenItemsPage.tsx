import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ListTodo } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import MobileNav from "@/components/MobileNav";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type OpenItemRow = {
  link: { id: string; linkedType: string; linkedId: string; note?: string | null };
  shiftReportId: string;
  reportDate: string;
  shift: string;
  locationId: string;
  locationName?: string;
  entityLabel: string;
  entityStatus: string;
};

export default function OpenItemsPage() {
  const { activeLocation } = useActiveLocation();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/shiftover/open-items", activeLocation?.id ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeLocation?.id) params.set("locationId", activeLocation.id);
      const res = await fetch(`/api/shiftover/open-items?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load open items");
      return res.json() as Promise<OpenItemRow[]>;
    },
  });

  function hrefForItem(row: OpenItemRow): string {
    if (row.link.linkedType === "ticket") return `/tickets/${row.link.linkedId}`;
    if (row.link.linkedType === "incident") return `/incidents`;
    return `/operational-duties`;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray" data-testid="shiftover-open-items-page">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ListTodo className="h-8 w-8 text-uventorybiz-navy shrink-0" />
          Open handover items
        </h2>
        <p className="text-uventorybiz-gray mt-1 max-w-3xl">
          Linked tickets, incidents, and duty assignments from recent shift reports that are still
          open. Scoped to your active location when one is selected.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active links</CardTitle>
          <CardDescription>
            {activeLocation
              ? `Filtering by ${activeLocation.name}. Change location in the header to see other sites.`
              : "Select a working location in the header to filter by site."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open linked items in this scope.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((row) => (
                <li
                  key={`${row.link.id}-${row.shiftReportId}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border bg-white p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{row.entityLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      From shift report {format(new Date(row.reportDate), "yyyy-MM-dd")} ·{" "}
                      <span className="capitalize">{row.shift}</span>
                      {row.locationName ? ` · ${row.locationName}` : ""}
                    </p>
                    {row.link.note ? (
                      <p className="text-sm text-uventorybiz-gray mt-1">{row.link.note}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {row.entityStatus.replace(/_/g, " ")}
                    </Badge>
                    <ButtonLink href={hrefForItem(row)}>Open</ButtonLink>
                    <ButtonLink href={`/shiftover/shift-report?highlight=${row.shiftReportId}`}>
                      Report
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MobileNav />
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background px-3 py-1.5 hover:bg-accent"
    >
      {children}
    </Link>
  );
}
