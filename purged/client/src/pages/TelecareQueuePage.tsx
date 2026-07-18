import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import {
  Activity,
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  ExternalLink,
  Plus,
  Search,
  User,
  Video,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import TelecareJoinButton, { canStaffJoinTelecare } from "@/components/TelecareJoinButton";
import { useTelecareJoinWindowClock } from "@/components/telecare/useTelecareJoinWindowClock";
import { AppointmentStatusBadge } from "@/components/AppointmentsRowActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getQueryFn } from "@/lib/queryClient";
import { PortalEmptyState, PortalLoadingBlock } from "@/portal/portalUi";
import NewTelehealthAppointmentModal from "@/components/modals/NewTelehealthAppointmentModal";

type QueueView = "today" | "upcoming" | "active" | "recent" | "all";

type QueueRow = {
  appointment: {
    id: string;
    patientId: string;
    patientName?: string;
    appointmentDate: string;
    appointmentType: string;
    status: string;
    modality: string;
    telecareSessionId: string | null;
    durationMinutes?: number | null;
    createdAt?: string | Date | null;
  };
  session: {
    id: string;
    status: string;
    scheduledStart: string;
    scheduledEnd?: string | null;
    durationMinutes?: number;
    createdAt?: string | Date | null;
  } | null;
};

type QueueSummary = {
  todayTotal: number;
  todayRemaining: number;
  waitingRoom: number;
  inProgress: number;
  upcomingWeek: number;
  videoProvider: string;
  videoConfigured: boolean;
};

const VIEW_META: Record<
  QueueView,
  { label: string; description: string; emptyTitle: string; emptyDescription: string }
> = {
  today: {
    label: "Today",
    description: "All video visits scheduled for today — including completed and missed visits.",
    emptyTitle: "No telehealth visits today",
    emptyDescription: "Scheduled video visits for today will appear here.",
  },
  upcoming: {
    label: "Upcoming",
    description: "Future telehealth appointments that are still scheduled or confirmed.",
    emptyTitle: "No upcoming telehealth visits",
    emptyDescription: "Future video visits will appear here once scheduled.",
  },
  active: {
    label: "Live now",
    description: "Visits in progress or patients waiting in the virtual waiting room.",
    emptyTitle: "No active telehealth visits",
    emptyDescription: "When a patient joins the waiting room or a visit is in progress, it will show here.",
  },
  recent: {
    label: "Past 7 days",
    description: "Telehealth visits from the last week — completed, missed, or cancelled.",
    emptyTitle: "No visits in the past 7 days",
    emptyDescription: "Recent telehealth activity will appear here.",
  },
  all: {
    label: "History",
    description: "Telehealth visits from the last 90 days.",
    emptyTitle: "No telehealth history",
    emptyDescription: "Video visits from the last three months will appear here.",
  },
};

function sessionStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function sessionStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "waiting_room") return "secondary";
  if (status === "in_progress") return "default";
  if (status === "completed") return "outline";
  if (status === "cancelled" || status === "no_show" || status === "failed") return "destructive";
  return "outline";
}

function formatVisitWhen(date: string): { dateLine: string; timeLine: string; isToday: boolean } {
  const d = new Date(date);
  return {
    dateLine: isToday(d) ? "Today" : format(d, "EEE, MMM d"),
    timeLine: format(d, "h:mm a"),
    isToday: isToday(d),
  };
}

function rowCreatedAtMs(row: QueueRow): number {
  const raw = row.session?.createdAt ?? row.appointment.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}

function spotlightPriority(row: QueueRow): number {
  const sessionStatus = row.session?.status;
  if (sessionStatus === "waiting_room") return 0;
  if (sessionStatus === "in_progress" || row.appointment.status === "in_progress") return 1;
  const join = canStaffJoinTelecare({
    ...row.appointment,
    sessionStatus: row.session?.status,
    scheduledStart: row.session?.scheduledStart ?? row.appointment.appointmentDate,
    scheduledEnd: row.session?.scheduledEnd,
    durationMinutes: row.session?.durationMinutes ?? row.appointment.durationMinutes ?? undefined,
  });
  if (join.ok) return 2;
  return 3;
}

function spotlightRowClass(row: QueueRow): string {
  const sessionStatus = row.session?.status;
  if (sessionStatus === "waiting_room") {
    return "border-amber-200 bg-amber-50/70";
  }
  if (sessionStatus === "in_progress" || row.appointment.status === "in_progress") {
    return "border-emerald-200 bg-emerald-50/50";
  }
  return "border-gray-100 bg-gray-50/50";
}

function TelecareSpotlightVisitItem({ row }: { row: QueueRow }) {
  const { appointment, session } = row;
  const when = formatVisitWhen(appointment.appointmentDate);
  const join = canStaffJoinTelecare({
    ...appointment,
    sessionStatus: session?.status,
    scheduledStart: session?.scheduledStart ?? appointment.appointmentDate,
    scheduledEnd: session?.scheduledEnd,
    durationMinutes: session?.durationMinutes ?? appointment.durationMinutes ?? undefined,
  });
  const sessionId = appointment.telecareSessionId ?? session?.id;

  return (
    <li
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 ${spotlightRowClass(row)}`}
    >
      <div className="min-w-0 space-y-1">
        <Link
          href={`/patients/${appointment.patientId}`}
          className="font-medium text-gray-900 truncate hover:text-mineaid-navy hover:underline block"
        >
          {appointment.patientName ?? "Patient"}
        </Link>
        <p className="text-sm text-mineaid-gray flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {when.dateLine} · {when.timeLine}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge variant="outline" className="text-xs capitalize">
            {appointment.appointmentType.replace(/_/g, " ")}
          </Badge>
          <AppointmentStatusBadge status={appointment.status} />
          {session ? (
            <Badge variant={sessionStatusVariant(session.status)} className="text-xs capitalize">
              {sessionStatusLabel(session.status)}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {join.ok && sessionId ? (
          <TelecareJoinButton sessionId={sessionId} apiPrefix="staff" label="Join visit" />
        ) : (
          <span className="text-xs text-mineaid-gray self-center">{join.reason ?? "Not in join window"}</span>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/patient/${appointment.patientId}`}>
            <User className="h-3.5 w-3.5 mr-1" />
            Patient
          </Link>
        </Button>
      </div>
    </li>
  );
}

function TelecareSpotlightVisits({
  rows,
  isLoading,
  onViewActive,
}: {
  rows: QueueRow[];
  isLoading: boolean;
  onViewActive: () => void;
}) {
  if (isLoading && rows.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <PortalLoadingBlock label="Loading active visits…" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const hasLive = rows.some(
    (r) =>
      r.session?.status === "waiting_room" ||
      r.session?.status === "in_progress" ||
      r.appointment.status === "in_progress",
  );

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-lg">{hasLive ? "Live & up next" : "Up next"}</CardTitle>
          <CardDescription>
            {hasLive
              ? "Patients waiting or visits in progress — join when ready."
              : "Upcoming video visits on your schedule."}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-mineaid-navy shrink-0"
          onClick={onViewActive}
        >
          {hasLive ? "Live now" : "Upcoming"}
          <ChevronRight className="h-4 w-4 ml-0.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rows.map((row) => (
            <TelecareSpotlightVisitItem key={row.appointment.id} row={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Video;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-200 bg-amber-50/40" : undefined}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-mineaid-gray uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {hint ? <p className="text-xs text-mineaid-gray mt-1">{hint}</p> : null}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${highlight ? "text-amber-700" : "text-mineaid-navy"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function TelecareVisitRow({
  row,
}: {
  row: QueueRow;
}) {
  const { appointment, session } = row;
  const when = formatVisitWhen(appointment.appointmentDate);
  const join = canStaffJoinTelecare({
    ...appointment,
    sessionStatus: session?.status,
    scheduledStart: session?.scheduledStart ?? appointment.appointmentDate,
    scheduledEnd: session?.scheduledEnd,
    durationMinutes: session?.durationMinutes ?? appointment.durationMinutes ?? undefined,
  });
  const sessionId = appointment.telecareSessionId ?? session?.id;

  return (
    <>
      <div className="md:hidden rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">{when.timeLine}</p>
            <p className="text-xs text-mineaid-gray">{when.dateLine}</p>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>
        <div>
          <Link href={`/patients/${appointment.patientId}`} className="text-sm font-medium text-mineaid-navy hover:underline">
            {appointment.patientName ?? "Patient"}
          </Link>
          <p className="text-xs text-mineaid-gray capitalize mt-0.5">
            {appointment.appointmentType.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <Badge variant={sessionStatusVariant(session.status)} className="capitalize">
              Session: {sessionStatusLabel(session.status)}
            </Badge>
          ) : (
            <span className="text-xs text-mineaid-gray">No session linked</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {join.ok && sessionId ? (
            <TelecareJoinButton sessionId={sessionId} apiPrefix="staff" label="Join visit" />
          ) : (
            <span className="text-xs text-mineaid-gray self-center">{join.reason ?? "—"}</span>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${appointment.patientId}`}>
              <User className="h-3.5 w-3.5 mr-1" />
              Patient
            </Link>
          </Button>
        </div>
      </div>

      <TableRow className="hidden md:table-row">
        <TableCell className="whitespace-nowrap">
          <div className="font-medium">{when.timeLine}</div>
          <div className="text-xs text-mineaid-gray">{when.dateLine}</div>
        </TableCell>
        <TableCell>
          <Link href={`/patients/${appointment.patientId}`} className="font-medium text-mineaid-navy hover:underline">
            {appointment.patientName ?? "Patient"}
          </Link>
        </TableCell>
        <TableCell className="capitalize text-sm">{appointment.appointmentType.replace(/_/g, " ")}</TableCell>
        <TableCell>
          <AppointmentStatusBadge status={appointment.status} />
        </TableCell>
        <TableCell>
          {session ? (
            <Badge variant={sessionStatusVariant(session.status)} className="capitalize">
              {sessionStatusLabel(session.status)}
            </Badge>
          ) : (
            <span className="text-xs text-mineaid-gray">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {join.ok && sessionId ? (
            <TelecareJoinButton sessionId={sessionId} apiPrefix="staff" label="Join visit" />
          ) : (
            <span className="text-xs text-mineaid-gray">{join.reason ?? "—"}</span>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

function TelecareVisitsList({
  rows,
  view,
  isLoading,
}: {
  rows: QueueRow[];
  view: QueueView;
  isLoading: boolean;
}) {
  const meta = VIEW_META[view];

  if (isLoading) return <PortalLoadingBlock label="Loading telehealth visits…" />;

  if (rows.length === 0) {
    return (
      <PortalEmptyState icon={Video} title={meta.emptyTitle} description={meta.emptyDescription} />
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">{rows.map((row) => <TelecareVisitRow key={row.appointment.id} row={row} />)}</div>
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Session</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TelecareVisitRow key={row.appointment.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function TelecareQueuePage() {
  useTelecareJoinWindowClock();
  const [view, setView] = useState<QueueView>("today");
  const [search, setSearch] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState("all");
  const [sessionStatus, setSessionStatus] = useState("all");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const { data: summary } = useQuery<QueueSummary>({
    queryKey: ["/api/telecare/queue/summary"],
    queryFn: getQueryFn<QueueSummary>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const { data: rows = [], isLoading } = useQuery<QueueRow[]>({
    queryKey: [
      "/api/telecare/queue",
      {
        view,
        appointmentStatus: appointmentStatus !== "all" ? appointmentStatus : undefined,
        sessionStatus: sessionStatus !== "all" ? sessionStatus : undefined,
      },
    ],
    queryFn: getQueryFn<QueueRow[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const { data: activeRows = [], isLoading: activeLoading } = useQuery<QueueRow[]>({
    queryKey: ["/api/telecare/queue", { view: "active" }],
    queryFn: getQueryFn<QueueRow[]>({ on401: "throw" }),
    refetchInterval: 15_000,
  });

  const { data: upcomingRows = [], isLoading: upcomingLoading } = useQuery<QueueRow[]>({
    queryKey: ["/api/telecare/queue", { view: "upcoming" }],
    queryFn: getQueryFn<QueueRow[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const spotlightRows = useMemo(() => {
    const byId = new Map<string, QueueRow>();
    for (const row of activeRows) byId.set(row.appointment.id, row);
    for (const row of upcomingRows) {
      if (!byId.has(row.appointment.id)) byId.set(row.appointment.id, row);
    }
    return [...byId.values()]
      .sort((a, b) => {
        const priorityDiff = spotlightPriority(a) - spotlightPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return rowCreatedAtMs(b) - rowCreatedAtMs(a);
      })
      .slice(0, 5);
  }, [activeRows, upcomingRows]);

  const spotlightHasLive = useMemo(
    () =>
      spotlightRows.some(
        (r) =>
          r.session?.status === "waiting_room" ||
          r.session?.status === "in_progress" ||
          r.appointment.status === "in_progress",
      ),
    [spotlightRows],
  );

  const spotlightLoading = activeLoading || upcomingLoading;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.appointment.patientName?.toLowerCase() ?? "";
      const type = r.appointment.appointmentType.toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [rows, search]);

  const meta = VIEW_META[view];

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-mineaid-light-gray min-h-full">
      <MobileNav />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-7 w-7 text-mineaid-navy" />
            Telehealth hub
          </h2>
          <p className="text-mineaid-gray mt-1 max-w-2xl">
            Manage video visits, monitor the waiting room, and review telehealth history — not just today&apos;s schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-mineaid-navy hover:bg-mineaid-navy/90"
            onClick={() => setScheduleModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Schedule video visit
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/appointments">
              <Calendar className="h-4 w-4 mr-1.5" />
              All appointments
            </Link>
          </Button>
        </div>
      </div>

      {summary && !summary.videoConfigured && (
        <Alert variant="destructive">
          <Video className="h-4 w-4" />
          <AlertTitle>Video provider not configured</AlertTitle>
          <AlertDescription>
            Telehealth join links may be unavailable until {summary.videoProvider} is configured in environment
            settings.
          </AlertDescription>
        </Alert>
      )}

      {(summary?.waitingRoom ?? 0) > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <Activity className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Patients waiting</AlertTitle>
          <AlertDescription className="text-amber-800">
            {summary?.waitingRoom} patient{summary?.waitingRoom === 1 ? "" : "s"} in the virtual waiting room. Switch
            to the <strong>Live now</strong> tab to join.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today" value={summary?.todayTotal ?? 0} hint={`${summary?.todayRemaining ?? 0} still open`} icon={Calendar} />
        <StatCard
          label="Waiting room"
          value={summary?.waitingRoom ?? 0}
          icon={Clock}
          highlight={(summary?.waitingRoom ?? 0) > 0}
        />
        <StatCard label="In progress" value={summary?.inProgress ?? 0} icon={Activity} />
        <StatCard label="Next 7 days" value={summary?.upcomingWeek ?? 0} icon={CalendarClock} />
      </div>

      <TelecareSpotlightVisits
        rows={spotlightRows}
        isLoading={spotlightLoading}
        onViewActive={() => setView(spotlightHasLive ? "active" : "upcoming")}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Video visits</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={view} onValueChange={(v) => setView(v as QueueView)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
            {(Object.keys(VIEW_META) as QueueView[]).map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                {VIEW_META[key].label}
                {key === "active" && (summary?.inProgress ?? 0) + (summary?.waitingRoom ?? 0) > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {(summary?.inProgress ?? 0) + (summary?.waitingRoom ?? 0)}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-mineaid-gray" />
                <Input
                  placeholder="Search patient or visit type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-mineaid-gray sr-only">Appointment status</Label>
                  <Select value={appointmentStatus} onValueChange={setAppointmentStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Appt status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All appt statuses</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no_show">No show</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-mineaid-gray sr-only">Session status</Label>
                  <Select value={sessionStatus} onValueChange={setSessionStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Session status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sessions</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="waiting_room">Waiting room</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no_show">No show</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Tabs>

          <div className="mt-4">
            <TelecareVisitsList rows={filteredRows} view={view} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-mineaid-gray text-center flex items-center justify-center gap-1">
        <ExternalLink className="h-3 w-3" />
        Need in-person or phone visits? Use{" "}
        <Link href="/appointments" className="text-mineaid-navy hover:underline">
          Appointments
        </Link>
        .
      </p>

      <NewTelehealthAppointmentModal open={scheduleModalOpen} onOpenChange={setScheduleModalOpen} />
    </div>
  );
}
