import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays, parseISO } from "date-fns";
import { Check, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type ShiftReportLinkableType = "ticket" | "incident" | "duty";

type TicketRow = {
  id: string;
  title: string;
  status: string;
  ticketNumber?: string;
};

type IncidentRow = {
  id: string;
  incidentType: string;
  status?: string | null;
  incidentDate?: string;
  createdAt?: string;
};

type DutyRow = {
  id: string;
  status: string;
  assignmentDate?: string | Date;
  duty?: { title?: string | null };
};

function normalizeExclude(excludeLinkedIds: Set<string> | string[]): Set<string> {
  return excludeLinkedIds instanceof Set ? excludeLinkedIds : new Set(excludeLinkedIds);
}

export function ShiftReportLinkPicker({
  linkType,
  reportDate,
  reportLocationId,
  excludeLinkedIds,
  onPickMany,
  disabled,
  className,
}: {
  linkType: ShiftReportLinkableType;
  reportDate?: string;
  reportLocationId?: string;
  excludeLinkedIds: Set<string> | string[];
  onPickMany: (linkedIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const exclude = normalizeExclude(excludeLinkedIds);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const centerDate = reportDate ? parseISO(reportDate) : new Date();
  const dutyFrom = format(subDays(centerDate, 14), "yyyy-MM-dd");
  const dutyTo = format(addDays(centerDate, 14), "yyyy-MM-dd");

  const ticketsQuery = useQuery({
    queryKey: ["/api/tickets", "shiftover-link-picker", isAdmin],
    queryFn: async (): Promise<TicketRow[]> => {
      const load = async (scope: string) => {
        const params = new URLSearchParams({ scope, limit: "120" });
        const res = await fetch(`/api/tickets?${params.toString()}`, { credentials: "include" });
        if (!res.ok) return [];
        const j: unknown = await res.json();
        return Array.isArray(j) ? (j as TicketRow[]) : [];
      };
      if (isAdmin) return load("all");
      const [mine, assigned, requested] = await Promise.all([
        load("mine"),
        load("assigned"),
        load("requested"),
      ]);
      const seen = new Set<string>();
      const out: TicketRow[] = [];
      for (const t of [...mine, ...assigned, ...requested]) {
        if (!t?.id || seen.has(t.id)) continue;
        seen.add(t.id);
        out.push(t);
      }
      return out;
    },
    enabled: open && linkType === "ticket",
    staleTime: 30_000,
  });

  const incidentsQuery = useQuery({
    queryKey: ["/api/incident-reports", "shiftover-link-picker"],
    queryFn: async (): Promise<IncidentRow[]> => {
      const res = await fetch("/api/incident-reports", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load incidents");
      const j: unknown = await res.json();
      return Array.isArray(j) ? (j as IncidentRow[]) : [];
    },
    enabled: open && linkType === "incident",
    staleTime: 30_000,
  });

  const dutiesQuery = useQuery({
    queryKey: ["/api/duty-assignments", "shiftover-link-picker", dutyFrom, dutyTo, reportLocationId ?? ""],
    queryFn: async (): Promise<DutyRow[]> => {
      const params = new URLSearchParams({ from: dutyFrom, to: dutyTo });
      if (reportLocationId?.trim()) params.set("locationId", reportLocationId.trim());
      const res = await fetch(`/api/duty-assignments?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load duty assignments");
      const j: unknown = await res.json();
      return Array.isArray(j) ? (j as DutyRow[]) : [];
    },
    enabled: open && linkType === "duty",
    staleTime: 30_000,
  });

  const loading =
    (linkType === "ticket" && ticketsQuery.isLoading) ||
    (linkType === "incident" && incidentsQuery.isLoading) ||
    (linkType === "duty" && dutiesQuery.isLoading);

  const triggerLabel =
    linkType === "ticket"
      ? "Search tickets"
      : linkType === "incident"
        ? "Search incidents"
        : "Search duty assignments";

  const availableIds = useMemo(() => {
    if (linkType === "ticket") {
      return (ticketsQuery.data ?? []).filter((t) => !exclude.has(t.id)).map((t) => t.id);
    }
    if (linkType === "incident") {
      return (incidentsQuery.data ?? []).filter((r) => !exclude.has(r.id)).map((r) => r.id);
    }
    return (dutiesQuery.data ?? []).filter((a) => !exclude.has(a.id)).map((a) => a.id);
  }, [linkType, ticketsQuery.data, incidentsQuery.data, dutiesQuery.data, excludeLinkedIds]);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => availableIds.includes(id)));
  }, [open, linkType, availableIds]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function submitSelection() {
    if (selectedIds.length === 0) return;
    onPickMany(selectedIds);
    setSelectedIds([]);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("justify-start gap-2", className)}
          disabled={disabled}
        >
          <Search className="h-4 w-4 shrink-0 opacity-70" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[100] w-[min(100vw-2rem,24rem)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={`Filter ${triggerLabel.toLowerCase()}...`} />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <CommandEmpty>No matching records. Try another search.</CommandEmpty>
                {linkType === "ticket" ? (
                  <CommandGroup heading="Tickets">
                    {(ticketsQuery.data ?? [])
                      .filter((t) => !exclude.has(t.id))
                      .map((t) => {
                        const num = t.ticketNumber ? `#${t.ticketNumber} ` : "";
                        const label = `${num}${t.title}`.trim();
                        const sub = String(t.status ?? "").replace(/_/g, " ");
                        const value = `${label} ${sub} ${t.id}`;
                        return (
                          <CommandItem
                            key={t.id}
                            value={value}
                            onSelect={() => toggleSelect(t.id)}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                selectedIds.includes(t.id) ? "opacity-100" : "opacity-20",
                              )}
                            />
                            <span className="flex flex-col">
                              <span className="font-medium leading-tight">{label}</span>
                              <span className="text-xs text-muted-foreground capitalize">{sub}</span>
                            </span>
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                ) : null}
                {linkType === "incident" ? (
                  <CommandGroup heading="Incidents">
                    {(incidentsQuery.data ?? [])
                      .filter((r) => !exclude.has(r.id))
                      .map((r) => {
                        const when = r.incidentDate
                          ? format(new Date(r.incidentDate), "yyyy-MM-dd")
                          : r.createdAt
                            ? format(new Date(r.createdAt), "yyyy-MM-dd")
                            : "";
                        const st = (r.status ?? "open").replace(/_/g, " ");
                        const label = r.incidentType || "Incident";
                        const value = `${label} ${st} ${when} ${r.id}`;
                        return (
                          <CommandItem
                            key={r.id}
                            value={value}
                            onSelect={() => toggleSelect(r.id)}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                selectedIds.includes(r.id) ? "opacity-100" : "opacity-20",
                              )}
                            />
                            <span className="flex flex-col">
                              <span className="font-medium leading-tight">{label}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {st}
                                {when ? ` · ${when}` : ""}
                              </span>
                            </span>
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                ) : null}
                {linkType === "duty" ? (
                  <CommandGroup heading="Duty assignments">
                    {(dutiesQuery.data ?? [])
                      .filter((a) => !exclude.has(a.id))
                      .map((a) => {
                        const title = a.duty?.title ?? "Duty";
                        const st = String(a.status ?? "").replace(/_/g, " ");
                        const when = a.assignmentDate
                          ? format(new Date(a.assignmentDate), "yyyy-MM-dd")
                          : "";
                        const value = `${title} ${st} ${when} ${a.id}`;
                        return (
                          <CommandItem
                            key={a.id}
                            value={value}
                            onSelect={() => toggleSelect(a.id)}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                selectedIds.includes(a.id) ? "opacity-100" : "opacity-20",
                              )}
                            />
                            <span className="flex flex-col">
                              <span className="font-medium leading-tight">{title}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {st}
                                {when ? ` · ${when}` : ""}
                              </span>
                            </span>
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <Button
            type="button"
            size="sm"
            onClick={submitSelection}
            disabled={selectedIds.length === 0 || disabled}
          >
            Add selected
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
