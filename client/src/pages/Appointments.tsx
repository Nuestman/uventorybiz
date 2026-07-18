import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  buildAppointmentsQuery,
  parseAppointmentsListResponse,
} from "@/lib/appointments/appointmentsList";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import AppointmentsCalendar from "@/components/AppointmentsCalendar";
import AppointmentsTable from "@/components/AppointmentsTable";
import { type AppointmentRowData } from "@/components/AppointmentsRowActions";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";
import RescheduleAppointmentModal from "@/components/modals/RescheduleAppointmentModal";
import PortalAppointmentRequestsPanel from "@/components/PortalAppointmentRequestsPanel";
import CongratsModal from "@/components/modals/CongratsModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  Plus,
  Search,
  Table2,
  Video,
} from "lucide-react";

type PageView = "table" | "calendar";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no_show"]);
const ALL_APPOINTMENTS_PAGE_SIZE = 20;

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
  icon: typeof Calendar;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-200 bg-amber-50/40" : undefined}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-uventorybiz-gray uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {hint ? <p className="text-xs text-uventorybiz-gray mt-1">{hint}</p> : null}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${highlight ? "text-amber-700" : "text-uventorybiz-navy"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [newAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentRowData | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRowData | null>(null);
  const [showAppointmentCongratsModal, setShowAppointmentCongratsModal] = useState(false);
  const [pageView, setPageView] = useState<PageView>("table");
  const [allAppointmentsPage, setAllAppointmentsPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const allListQueryKey = {
    page: allAppointmentsPage,
    pageSize: ALL_APPOINTMENTS_PAGE_SIZE,
    search: searchTerm,
    status: statusFilter,
    appointmentType: typeFilter,
  };

  const { data: allAppointmentsData, isLoading: allAppointmentsLoading } = useQuery({
    queryKey: ["/api/appointments", allListQueryKey],
    queryFn: async () => {
      const qs = buildAppointmentsQuery(allListQueryKey);
      const res = await fetch(`/api/appointments${qs}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch appointments");
      }
      const data = await res.json();
      return parseAppointmentsListResponse(data);
    },
    retry: false,
  });

  const { data: totalCountData } = useQuery({
    queryKey: ["/api/appointments", { page: 1, pageSize: 1 }],
    queryFn: async () => {
      const qs = buildAppointmentsQuery({ page: 1, pageSize: 1 });
      const res = await fetch(`/api/appointments${qs}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch appointment count");
      }
      const data = await res.json();
      return parseAppointmentsListResponse(data);
    },
    retry: false,
  });

  const { data: todayAppointments = [], isLoading: todayLoading } = useQuery({
    queryKey: ["/api/appointments", { today: "true" }],
    retry: false,
  });

  const todayRows = Array.isArray(todayAppointments) ? todayAppointments : [];
  const allAppointmentRows = (allAppointmentsData?.rows ?? []) as AppointmentRowData[];
  const allAppointmentsTotal = allAppointmentsData?.totalCount ?? 0;
  const totalOnRecord = totalCountData?.totalCount ?? 0;

  useEffect(() => {
    setAllAppointmentsPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const invalidateAppointments = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
  };

  const summary = useMemo(() => {
    const todayOpen = todayRows.filter((a: AppointmentRowData) => !TERMINAL_STATUSES.has(a.status ?? "")).length;
    const telehealthToday = todayRows.filter((a: AppointmentRowData) => a.modality === "telehealth").length;
    return {
      todayTotal: todayRows.length,
      todayOpen,
      telehealthToday,
      total: totalOnRecord,
    };
  }, [todayRows, totalOnRecord]);

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      invalidateAppointments();
      setDeleteConfirmOpen(false);
      setAppointmentToDelete(null);
      toast({ title: "Success", description: "Appointment deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status });
    },
    onSuccess: async (_, variables) => {
      invalidateAppointments();
      const statusDisplay = variables.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
      toast({ title: "Success", description: `Appointment status updated to ${statusDisplay}` });
      if (variables.status === "completed") {
        try {
          const res = await fetch("/api/appointments?today=true", { credentials: "include" });
          if (!res.ok) return;
          const list = (await res.json()) as AppointmentRowData[];
          const incomplete = (Array.isArray(list) ? list : []).filter(
            (a) => !TERMINAL_STATUSES.has(a?.status ?? ""),
          );
          if (incomplete.length === 0) setShowAppointmentCongratsModal(true);
        } catch {
          // ignore
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const confirmRescheduleMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("POST", `/api/appointments/${appointmentId}/confirm-reschedule`);
    },
    onSuccess: () => {
      invalidateAppointments();
      toast({ title: "Reschedule confirmed", description: "The visit is confirmed at the new time." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not confirm reschedule",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const handleConfirmReschedule = (appointment: AppointmentRowData) => {
    confirmRescheduleMutation.mutate(appointment.id);
  };

  const handleStatusUpdate = (appointmentId: string, status: string) => {
    updateStatusMutation.mutate({ appointmentId, status });
  };

  const handleDeleteRequest = (appointment: AppointmentRowData) => {
    setAppointmentToDelete(appointment);
    setDeleteConfirmOpen(true);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchTerm("");
    setAllAppointmentsPage(1);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-full">
      <MobileNav />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-uventorybiz-navy" />
            Appointments
          </h2>
          <p className="text-uventorybiz-gray mt-1 max-w-2xl">
            Schedule in-person, phone, and telehealth visits. Review portal requests, manage today&apos;s queue, and
            browse your full appointment record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-uventorybiz-navy hover:bg-uventorybiz-navy/90"
            onClick={() => setNewAppointmentModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Schedule appointment
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/telecare">
              <Video className="h-4 w-4 mr-1.5" />
              Telehealth hub
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today" value={summary.todayTotal} hint={`${summary.todayOpen} still open`} icon={Calendar} />
        <StatCard
          label="Open today"
          value={summary.todayOpen}
          hint={summary.todayOpen > 0 ? "Needs action" : "All caught up"}
          icon={ClipboardList}
          highlight={summary.todayOpen > 0}
        />
        <StatCard
          label="Video today"
          value={summary.telehealthToday}
          hint="Telehealth on today's schedule"
          icon={Video}
        />
        <StatCard label="On record" value={summary.total} hint="All appointments" icon={CalendarDays} />
      </div>

      <PortalAppointmentRequestsPanel />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Appointment schedule</h3>
          <p className="text-sm text-uventorybiz-gray mt-0.5">
            {pageView === "table"
              ? "Sorted by most recently created."
              : "Calendar view of scheduled visits across the month."}
          </p>
        </div>
        <Tabs value={pageView} onValueChange={(v) => setPageView(v as PageView)}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5 text-xs sm:text-sm">
              <Table2 className="h-3.5 w-3.5" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {pageView === "table" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <AppointmentsTable
            appointments={todayRows as AppointmentRowData[]}
            isLoading={todayLoading}
            title="Today's appointments"
            description="Visits scheduled for today — newest created first."
            splitColumn
            emptyMessage="No appointments scheduled for today."
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDeleteRequest}
            onReschedule={setRescheduleTarget}
            onConfirmReschedule={handleConfirmReschedule}
          />

          <AppointmentsTable
            appointments={allAppointmentRows}
            isLoading={allAppointmentsLoading}
            title="All appointments"
            description={`${allAppointmentsTotal.toLocaleString()} matching your filters — newest created first.`}
            splitColumn
            emptyMessage="No appointments match your filters."
            filters={
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-uventorybiz-gray" />
                  <Input
                    placeholder="Search attendee name or ID…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No show</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="routine_checkup">Routine checkup</SelectItem>
                      <SelectItem value="incident_followup">Incident follow-up</SelectItem>
                      <SelectItem value="pre_employment">Pre-employment</SelectItem>
                      <SelectItem value="fitness_for_duty">Fitness for duty</SelectItem>
                      <SelectItem value="return_to_work">Return to work</SelectItem>
                      <SelectItem value="injury_assessment">Injury assessment</SelectItem>
                      <SelectItem value="wellness_check">Wellness check</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            }
            pagination={{
              page: allAppointmentsPage,
              pageSize: ALL_APPOINTMENTS_PAGE_SIZE,
              totalCount: allAppointmentsTotal,
              onPageChange: setAllAppointmentsPage,
            }}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDeleteRequest}
            onReschedule={setRescheduleTarget}
            onConfirmReschedule={handleConfirmReschedule}
          />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calendar</CardTitle>
            <CardDescription>Scheduled visits across the month.</CardDescription>
          </CardHeader>
          <CardContent>
            <AppointmentsCalendar />
          </CardContent>
        </Card>
      )}

      <NewAppointmentModal open={newAppointmentModalOpen} onOpenChange={setNewAppointmentModalOpen} />

      <RescheduleAppointmentModal
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        appointment={
          rescheduleTarget?.appointmentDate
            ? {
                id: rescheduleTarget.id,
                appointmentDate: rescheduleTarget.appointmentDate,
                durationMinutes: rescheduleTarget.durationMinutes,
                appointmentType: rescheduleTarget.appointmentType,
                employee: rescheduleTarget.employee,
              }
            : null
        }
        mode="staff"
        onSuccess={invalidateAppointments}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment for {appointmentToDelete?.employee?.firstName}{" "}
              {appointmentToDelete?.employee?.lastName}? This action cannot be undone and will be logged for audit
              purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => appointmentToDelete && deleteAppointmentMutation.mutate(appointmentToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CongratsModal
        open={showAppointmentCongratsModal}
        onClose={() => setShowAppointmentCongratsModal(false)}
        title="All appointments complete!"
        message="You've completed all appointments for today. Great work!"
      />
    </div>
  );
}
