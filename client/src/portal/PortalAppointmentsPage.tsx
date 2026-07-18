import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CalendarDays,
  CheckCircle,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Video,
  XCircle,
} from "lucide-react";
import TelecareJoinButton, { canPatientJoinTelecare } from "@/components/TelecareJoinButton";
import RescheduleAppointmentModal from "@/components/modals/RescheduleAppointmentModal";
import { PortalScheduleAppointmentModal } from "./components/PortalScheduleAppointmentModal";
import { PortalConfirmAppointmentDialog } from "./components/PortalConfirmAppointmentDialog";
import { PortalAppointmentRequestFields } from "./components/PortalAppointmentRequestFields";
import {
  buildPortalAppointmentRequestPayload,
  emptyPortalAppointmentRequestForm,
  type PortalAppointmentRequestForm,
} from "./portalAppointmentRequestForm";
import { canRescheduleAppointment } from "@shared/appointmentReschedule";
import { useTelecareJoinWindowClock } from "@/components/telecare/useTelecareJoinWindowClock";
import {
  telecareJoinButtonLabel,
  telecarePlatformLabel,
} from "@shared/telecare";
import {
  ApptStatusBadge,
  PortalEmptyState,
  PortalLoadingBlock,
  PortalPageHeader,
  PORTAL_PRIMARY_BTN_CLASS,
  PORTAL_PRIMARY_TEXT_CLASS,
  formatAppointmentType,
  formatAppointmentLocation,
  formatDateTime,
  modalityLabel,
  requestStatusLabel,
  requestStatusVariant,
} from "./portalUi";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Appt = {
  id: string;
  appointmentDate: string;
  appointmentType: string;
  modality?: string | null;
  status: string | null;
  durationMinutes?: number;
  locationName: string | null;
  locationCode: string | null;
  telecareSessionId?: string | null;
  canConfirm?: boolean;
  canDecline?: boolean;
  canCancel?: boolean;
  canReschedule?: boolean;
  confirmationRequiredFrom?: string | null;
  awaitingStaffConfirmation?: boolean;
};

type TelecareSession = {
  id: string;
  appointmentId?: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  status: string;
  hasJoinLinks: boolean;
  videoProvider?: string | null;
  durationMinutes?: number;
  appointmentStatus?: string;
  appointmentDate?: string;
  appointmentType?: string | null;
};

type RequestRow = {
  id: string;
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  preferredModality?: string | null;
  preferredLocationId?: string | null;
  reason: string | null;
  status: string;
  createdAt: string | null;
};

type CareLocationOption = { id: string; locationName: string; isPrimary?: boolean };

const TERMINAL_APPT_STATUSES = new Set(["cancelled", "no_show", "completed"]);

type ApptBrowseTime = "all" | "upcoming" | "past";
type ApptBrowseStatus = "all" | "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
type ApptBrowseModality = "all" | "in_person" | "telehealth" | "phone";
type RequestStatusFilter = "all" | "pending" | "confirmed" | "completed" | "no_show" | "cancelled" | "declined";

function isActiveAppointment(a: Appt): boolean {
  return !TERMINAL_APPT_STATUSES.has(a.status ?? "");
}

function filterBrowseAppointments(
  appointments: Appt[],
  time: ApptBrowseTime,
  status: ApptBrowseStatus,
  modality: ApptBrowseModality,
): Appt[] {
  const now = Date.now();
  const filtered = appointments.filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    if (modality !== "all" && (a.modality ?? "in_person") !== modality) return false;
    const t = new Date(a.appointmentDate).getTime();
    if (time === "upcoming") return isActiveAppointment(a);
    if (time === "past") return TERMINAL_APPT_STATUSES.has(a.status ?? "") || t < now;
    return true;
  });
  return filtered.sort((a, b) => {
    const da = new Date(a.appointmentDate).getTime();
    const db = new Date(b.appointmentDate).getTime();
    return time === "upcoming" ? da - db : db - da;
  });
}

function filterRequests(requests: RequestRow[], status: RequestStatusFilter): RequestRow[] {
  if (status === "all") return requests;
  return requests.filter((r) => r.status === status);
}

function formatPreferredWhen(r: RequestRow) {
  if (r.preferredTimeWindow && /^\d{4}-\d{2}-\d{2}T/.test(r.preferredTimeWindow)) {
    return formatDateTime(r.preferredTimeWindow);
  }
  if (r.preferredDate) {
    const datePart = new Date(r.preferredDate).toLocaleDateString();
    return r.preferredTimeWindow ? `${datePart} · ${r.preferredTimeWindow}` : datePart;
  }
  return "Flexible date";
}

function requestToDateTimeLocal(r: RequestRow): string {
  if (r.preferredTimeWindow && /^\d{4}-\d{2}-\d{2}T/.test(r.preferredTimeWindow)) {
    const d = new Date(r.preferredTimeWindow);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 16);
  }
  if (r.preferredDate) return `${r.preferredDate}T09:00`;
  return "";
}

function buildRequestPayload(body: PortalAppointmentRequestForm) {
  return buildPortalAppointmentRequestPayload(body);
}

function PendingRequestCard({ request, onEdit }: { request: RequestRow; onEdit: (r: RequestRow) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-800">Pending request</p>
          <p className="font-medium text-gray-900">{formatPreferredWhen(request)}</p>
          <p className="text-sm text-uventorybiz-gray">{modalityLabel(request.preferredModality)}</p>
          {request.reason ? <p className="text-sm text-gray-700 mt-1">{request.reason}</p> : null}
        </div>
        <Badge variant={requestStatusVariant(request.status)} className="capitalize shrink-0">
          {requestStatusLabel(request.status)}
        </Badge>
      </div>
      {request.status === "pending" ? (
        <Button size="sm" variant="outline" onClick={() => onEdit(request)}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit request
        </Button>
      ) : null}
    </div>
  );
}

function TelehealthJoinCell({
  appt,
  session,
  defaultVideoProvider,
}: {
  appt: Appt;
  session: TelecareSession | null;
  defaultVideoProvider?: string | null;
}) {
  useTelecareJoinWindowClock();
  if (appt.modality !== "telehealth") return null;

  const sessionId = appt.telecareSessionId ?? session?.id;
  if (!sessionId) {
    return (
      <p className="text-xs text-uventorybiz-gray flex items-center gap-1">
        <Video className="h-3.5 w-3.5 shrink-0" />
        Video link pending from your account team
      </p>
    );
  }

  const joinCtx = {
    appointmentStatus: appt.status,
    status: session?.status ?? "scheduled",
    scheduledStart: session?.scheduledStart ?? appt.appointmentDate,
    scheduledEnd: session?.scheduledEnd,
    durationMinutes: session?.durationMinutes ?? appt.durationMinutes,
    appointmentDate: appt.appointmentDate,
  };
  const join = canPatientJoinTelecare(joinCtx);

  if (join.ok) {
    const provider = session?.videoProvider ?? defaultVideoProvider;
    return (
      <TelecareJoinButton
        sessionId={sessionId}
        apiPrefix="portal"
        videoProvider={provider}
        label={telecareJoinButtonLabel(provider)}
        className={`${PORTAL_PRIMARY_BTN_CLASS} w-full sm:w-auto`}
      />
    );
  }

  if (appt.status === "scheduled") {
    return (
      <Badge variant="secondary" className="text-xs">
        Confirm visit to unlock video
      </Badge>
    );
  }

  if (appt.modality === "telehealth" && appt.status && ["confirmed", "in_progress"].includes(appt.status)) {
    return (
      <span className="text-xs text-uventorybiz-gray" title={join.reason}>
        {join.reason ?? "Video join not available yet"}
      </span>
    );
  }

  return (
    <span className="text-xs text-uventorybiz-gray" title={join.reason}>
      {join.reason ?? "Video not available yet"}
    </span>
  );
}

function AppointmentCard({
  appt,
  session,
  defaultVideoProvider,
  onConfirm,
  onDecline,
  onCancel,
  onReschedule,
  confirmPending,
  declinePending,
  cancelPending,
}: {
  appt: Appt;
  session: TelecareSession | null;
  defaultVideoProvider?: string | null;
  onConfirm: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onReschedule?: () => void;
  confirmPending: boolean;
  declinePending: boolean;
  cancelPending: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{formatAppointmentType(appt.appointmentType)}</p>
          <p className="text-sm text-uventorybiz-gray flex items-center gap-1 mt-0.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formatDateTime(appt.appointmentDate)}
          </p>
        </div>
        <ApptStatusBadge status={appt.status} confirmationRequiredFrom={appt.confirmationRequiredFrom} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{modalityLabel(appt.modality)}</Badge>
        {appt.modality !== "telehealth" && (
          <span className="text-uventorybiz-gray flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {formatAppointmentLocation(appt)}
          </span>
        )}
        {appt.modality === "telehealth" && (
          <span className="text-uventorybiz-gray flex items-center gap-1">
            <Video className="h-3 w-3" />
            {telecarePlatformLabel(session?.videoProvider ?? defaultVideoProvider)}
          </span>
        )}
      </div>
      <TelehealthJoinCell appt={appt} session={session} defaultVideoProvider={defaultVideoProvider} />
      {appt.awaitingStaffConfirmation ? (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
          Your reschedule request is with the business. They will confirm the new time before the appointment is finalized.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        {appt.canConfirm && (
          <>
            <Button
              size="sm"
              className={`${PORTAL_PRIMARY_BTN_CLASS} flex-1 sm:flex-none`}
              disabled={confirmPending}
              onClick={onConfirm}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Confirm
            </Button>
            <Button size="sm" variant="outline" disabled={declinePending} onClick={onDecline}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Decline
            </Button>
          </>
        )}
        {appt.canCancel && (
          <Button size="sm" variant="outline" disabled={cancelPending} onClick={onCancel}>
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancel visit
          </Button>
        )}
        {(appt.canReschedule ?? canRescheduleAppointment(appt.status, appt.appointmentDate)) &&
          onReschedule && (
            <Button size="sm" variant="outline" disabled={cancelPending} onClick={onReschedule}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              Reschedule
            </Button>
          )}
      </div>
    </div>
  );
}

function AppointmentListView({
  appointments,
  sessionByAppointmentId,
  defaultVideoProvider,
  confirmPending,
  declinePending,
  cancelPending,
  onConfirm,
  onDecline,
  onCancel,
  onReschedule,
  emptyTitle,
  emptyDescription,
  onRequestAppointment,
}: {
  appointments: Appt[];
  sessionByAppointmentId: Map<string, TelecareSession>;
  defaultVideoProvider?: string | null;
  confirmPending: boolean;
  declinePending: boolean;
  cancelPending: boolean;
  onConfirm: (id: string) => void;
  onDecline: (a: Appt) => void;
  onCancel: (a: Appt) => void;
  onReschedule: (a: Appt) => void;
  emptyTitle: string;
  emptyDescription: string;
  onRequestAppointment?: () => void;
}) {
  if (appointments.length === 0) {
    return (
      <div className="space-y-3">
        <PortalEmptyState title={emptyTitle} description={emptyDescription} />
        {onRequestAppointment ? (
          <div className="flex justify-center pb-2">
            <Button type="button" onClick={onRequestAppointment} className={PORTAL_PRIMARY_BTN_CLASS}>
              <Plus className="h-4 w-4 mr-2" />
              Request appointment
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <>
      <div className="md:hidden space-y-3">
        {appointments.map((a) => (
          <AppointmentCard
            key={a.id}
            appt={a}
            session={sessionByAppointmentId.get(a.id) ?? null}
            defaultVideoProvider={defaultVideoProvider}
            confirmPending={confirmPending}
            declinePending={declinePending}
            cancelPending={cancelPending}
            onConfirm={() => onConfirm(a.id)}
            onDecline={() => onDecline(a)}
            onCancel={() => onCancel(a)}
            onReschedule={() => onReschedule(a)}
          />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Video</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(a.appointmentDate)}</TableCell>
                <TableCell>{formatAppointmentType(a.appointmentType)}</TableCell>
                <TableCell>{modalityLabel(a.modality)}</TableCell>
                <TableCell>{formatAppointmentLocation(a)}</TableCell>
                <TableCell>
                  <ApptStatusBadge status={a.status} confirmationRequiredFrom={a.confirmationRequiredFrom} />
                </TableCell>
                <TableCell>
                  <TelehealthJoinCell
                    appt={a}
                    session={sessionByAppointmentId.get(a.id) ?? null}
                    defaultVideoProvider={defaultVideoProvider}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end flex-wrap gap-2">
                    {a.canConfirm ? (
                      <>
                        <Button
                          size="sm"
                          className={PORTAL_PRIMARY_BTN_CLASS}
                          disabled={confirmPending}
                          onClick={() => onConfirm(a.id)}
                        >
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" disabled={declinePending} onClick={() => onDecline(a)}>
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {a.canCancel ? (
                      <Button size="sm" variant="outline" disabled={cancelPending} onClick={() => onCancel(a)}>
                        Cancel
                      </Button>
                    ) : null}
                    {(a.canReschedule ?? canRescheduleAppointment(a.status, a.appointmentDate)) ? (
                      <Button size="sm" variant="outline" onClick={() => onReschedule(a)}>
                        Reschedule
                      </Button>
                    ) : null}
                    {!a.canConfirm && !a.canCancel && !(a.canReschedule ?? canRescheduleAppointment(a.status, a.appointmentDate)) ? (
                      <span className="text-xs text-uventorybiz-gray">—</span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function RequestsListView({
  requests,
  onEdit,
}: {
  requests: RequestRow[];
  onEdit: (r: RequestRow) => void;
}) {
  if (requests.length === 0) {
    return (
      <PortalEmptyState
        title="No requests match filters"
        description='Use "Request appointment" above to submit a new preferred time.'
      />
    );
  }
  return (
    <>
      <div className="md:hidden space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border p-4 space-y-2 bg-white">
            <div className="flex justify-between gap-2">
              <p className="text-sm font-medium">{formatPreferredWhen(r)}</p>
              <Badge variant={requestStatusVariant(r.status)} className="capitalize shrink-0">
                {requestStatusLabel(r.status)}
              </Badge>
            </div>
            <p className="text-xs text-uventorybiz-gray">{modalityLabel(r.preferredModality)}</p>
            {r.reason && <p className="text-sm text-gray-700">{r.reason}</p>}
            {r.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preferred time</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{formatPreferredWhen(r)}</TableCell>
                <TableCell>{modalityLabel(r.preferredModality)}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={r.reason ?? undefined}>
                  {r.reason || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={requestStatusVariant(r.status)} className="capitalize">
                    {requestStatusLabel(r.status)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-uventorybiz-gray text-sm">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <span className="text-xs text-uventorybiz-gray">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function PortalAppointmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Appt | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Appt | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Appt | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appt | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [editRequest, setEditRequest] = useState<RequestRow | null>(null);
  const [browseTime, setBrowseTime] = useState<ApptBrowseTime>("all");
  const [browseStatus, setBrowseStatus] = useState<ApptBrowseStatus>("all");
  const [browseModality, setBrowseModality] = useState<ApptBrowseModality>("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("request") === "1") {
      setScheduleOpen(true);
      params.delete("request");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, []);

  const { data: appointments = [], isLoading: apptLoading } = useQuery<Appt[]>({
    queryKey: ["/api/portal/appointments"],
    queryFn: getQueryFn<Appt[]>({ on401: "throw" }),
  });

  const { data: telecareSessions = [] } = useQuery<TelecareSession[]>({
    queryKey: ["/api/portal/telecare/sessions"],
    queryFn: getQueryFn<TelecareSession[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const { data: telecareConfig } = useQuery<{ videoProvider: string; configured: boolean }>({
    queryKey: ["/api/portal/telecare/config"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60_000,
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery<RequestRow[]>({
    queryKey: ["/api/portal/appointment-requests"],
    queryFn: getQueryFn<RequestRow[]>({ on401: "throw" }),
    refetchInterval: 30_000,
  });

  const { data: careLocations = [] } = useQuery<CareLocationOption[]>({
    queryKey: ["/api/portal/care-locations"],
    queryFn: getQueryFn<CareLocationOption[]>({ on401: "throw" }),
  });

  const defaultLocationId = useMemo(
    () => careLocations.find((l) => l.isPrimary)?.id ?? careLocations[0]?.id ?? "",
    [careLocations],
  );

  const sessionByAppointmentId = useMemo(() => {
    const map = new Map<string, TelecareSession>();
    for (const s of telecareSessions) {
      if (s.appointmentId) map.set(s.appointmentId, s);
    }
    for (const a of appointments) {
      if (a.telecareSessionId && !map.has(a.id)) {
        const match = telecareSessions.find((t) => t.id === a.telecareSessionId);
        if (match) map.set(a.id, match);
      }
    }
    return map;
  }, [telecareSessions, appointments]);

  const upcomingAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) => !["cancelled", "no_show", "completed"].includes(a.status ?? ""))
        .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()),
    [appointments],
  );

  const pendingConfirmCount = upcomingAppointments.filter((a) => a.canConfirm).length;

  const browseAppointments = useMemo(
    () => filterBrowseAppointments(appointments, browseTime, browseStatus, browseModality),
    [appointments, browseTime, browseStatus, browseModality],
  );

  const filteredRequests = useMemo(
    () => filterRequests(requests, requestStatusFilter),
    [requests, requestStatusFilter],
  );

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  const editForm = useForm<PortalAppointmentRequestForm>({
    defaultValues: emptyPortalAppointmentRequestForm(),
  });

  const invalidateAppointmentData = () => {
    qc.invalidateQueries({ queryKey: ["/api/portal/appointments"] });
    qc.invalidateQueries({ queryKey: ["/api/portal/telecare/sessions"] });
    qc.invalidateQueries({ queryKey: ["/api/portal/appointment-requests"] });
  };

  const confirmAppt = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/portal/appointments/${id}/confirm`);
    },
    onSuccess: () => {
      invalidateAppointmentData();
      toast({
        title: "Appointment confirmed",
        description:
          telecareConfig?.videoProvider === "teams"
            ? "Your account team has been notified. You will receive a remote session link when it's time to join."
            : "Your account team has been notified. Join your remote appointment from Appointments when it's time.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Could not confirm", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const declineAppt = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await apiRequest("POST", `/api/portal/appointments/${id}/decline`, { reason: reason || null });
    },
    onSuccess: () => {
      setDeclineTarget(null);
      setDeclineReason("");
      invalidateAppointmentData();
      toast({ title: "Appointment declined" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not decline", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const cancelAppt = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await apiRequest("POST", `/api/portal/appointments/${id}/cancel`, { reason: reason || null });
    },
    onSuccess: () => {
      setCancelTarget(null);
      setCancelReason("");
      invalidateAppointmentData();
      toast({ title: "Appointment cancelled", description: "Your account team has been notified." });
    },
    onError: (e: Error) => {
      toast({ title: "Could not cancel", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateReq = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PortalAppointmentRequestForm }) => {
      await apiRequest("PATCH", `/api/portal/appointment-requests/${id}`, buildRequestPayload(body));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portal/appointment-requests"] });
      setEditRequest(null);
      toast({ title: "Request updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not update", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const openEditRequest = (r: RequestRow) => {
    editForm.reset({
      preferredDateTime: requestToDateTimeLocal(r),
      preferredModality: r.preferredModality === "telehealth" ? "telehealth" : "in_person",
      preferredLocationId: r.preferredLocationId ?? defaultLocationId,
      reason: r.reason ?? "",
    });
    setEditRequest(r);
  };

  const requestButton = (
    <Button
      type="button"
      className={`${PORTAL_PRIMARY_BTN_CLASS} w-full sm:w-auto`}
      onClick={() => setScheduleOpen(true)}
    >
      <Plus className="h-4 w-4 mr-2" />
      Request appointment
    </Button>
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon={CalendarDays}
        title="Appointments"
        description="Confirm scheduled visits, join remote sessions, and browse your full appointment history."
        action={requestButton}
      />

      {pendingConfirmCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <CalendarDays className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">
            {pendingConfirmCount === 1 ? "1 visit needs your confirmation" : `${pendingConfirmCount} visits need your confirmation`}
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            Please confirm or decline so your account team can finalize your schedule.
          </AlertDescription>
        </Alert>
      )}

      <PortalScheduleAppointmentModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        careLocations={careLocations}
      />

      <PortalConfirmAppointmentDialog
        appointment={confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        onConfirm={(id) => {
          confirmAppt.mutate(id, {
            onSuccess: () => setConfirmTarget(null),
          });
        }}
        confirmPending={confirmAppt.isPending}
      />


      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scheduled visits</CardTitle>
          <CardDescription>Upcoming and active appointments on your record.</CardDescription>
        </CardHeader>
        <CardContent>
          {apptLoading && reqLoading ? (
            <PortalLoadingBlock />
          ) : upcomingAppointments.length === 0 && pendingRequests.length === 0 ? (
            <div className="space-y-3">
              <PortalEmptyState
                icon={CalendarDays}
                title="No upcoming appointments"
                description='Request an appointment when you need to visit a location.'
              />
              <div className="flex justify-center pb-2">
                <Button type="button" onClick={() => setScheduleOpen(true)} className={PORTAL_PRIMARY_BTN_CLASS}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request appointment
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Pending requests</p>
                  {pendingRequests.map((r) => (
                    <PendingRequestCard key={r.id} request={r} onEdit={openEditRequest} />
                  ))}
                </div>
              ) : null}
              {upcomingAppointments.length > 0 ? (
                <AppointmentListView
                  appointments={upcomingAppointments}
                  sessionByAppointmentId={sessionByAppointmentId}
                  defaultVideoProvider={telecareConfig?.videoProvider}
                  confirmPending={confirmAppt.isPending}
                  declinePending={declineAppt.isPending}
                  cancelPending={cancelAppt.isPending}
                  onConfirm={(id) => {
                    const appt = appointments.find((a) => a.id === id);
                    if (appt) setConfirmTarget(appt);
                  }}
                  onDecline={setDeclineTarget}
                  onCancel={setCancelTarget}
                  onReschedule={setRescheduleTarget}
                  emptyTitle="No upcoming appointments"
                  emptyDescription='Use "Request appointment" to ask your account team for a visit.'
                  onRequestAppointment={() => setScheduleOpen(true)}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All appointments & requests</CardTitle>
          <CardDescription>
            Full history from staff scheduling and your portal requests — filter by time, status, and modality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apptLoading && reqLoading ? (
            <PortalLoadingBlock />
          ) : (
            <Tabs defaultValue="appointments" className="w-full">
              <div className="tabs-list-custom mb-4">
                <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-1 gap-1 sm:gap-2">
                  <TabsTrigger value="appointments" className="tab-trigger-custom text-xs sm:text-sm">
                    Appointments ({appointments.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="tab-trigger-custom text-xs sm:text-sm">
                    My requests ({requests.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="appointments" className="space-y-4 mt-0">
                {pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">Pending requests awaiting review</p>
                    {pendingRequests.map((r) => (
                      <PendingRequestCard key={`pending-${r.id}`} request={r} onEdit={openEditRequest} />
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-uventorybiz-gray">When</Label>
                    <Select value={browseTime} onValueChange={(v) => setBrowseTime(v as ApptBrowseTime)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="upcoming">Upcoming / active</SelectItem>
                        <SelectItem value="past">Past / closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-uventorybiz-gray">Status</Label>
                    <Select value={browseStatus} onValueChange={(v) => setBrowseStatus(v as ApptBrowseStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="scheduled">Awaiting confirmation</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-uventorybiz-gray">Modality</Label>
                    <Select value={browseModality} onValueChange={(v) => setBrowseModality(v as ApptBrowseModality)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All modalities</SelectItem>
                        <SelectItem value="in_person">In person</SelectItem>
                        <SelectItem value="telehealth">Telehealth</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <AppointmentListView
                  appointments={browseAppointments}
                  sessionByAppointmentId={sessionByAppointmentId}
                  defaultVideoProvider={telecareConfig?.videoProvider}
                  confirmPending={confirmAppt.isPending}
                  declinePending={declineAppt.isPending}
                  cancelPending={cancelAppt.isPending}
                  onConfirm={(id) => {
                const appt = appointments.find((a) => a.id === id);
                if (appt) setConfirmTarget(appt);
              }}
                  onDecline={setDeclineTarget}
                  onCancel={setCancelTarget}
                  onReschedule={setRescheduleTarget}
                  emptyTitle="No appointments match filters"
                  emptyDescription="Try clearing filters or request a new visit from your account team."
                  onRequestAppointment={() => setScheduleOpen(true)}
                />
              </TabsContent>

              <TabsContent value="requests" className="space-y-4 mt-0">
                <div className="max-w-xs space-y-1.5">
                  <Label className="text-xs text-uventorybiz-gray">Request status</Label>
                  <Select
                    value={requestStatusFilter}
                    onValueChange={(v) => setRequestStatusFilter(v as RequestStatusFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All requests</SelectItem>
                      <SelectItem value="pending">Pending review</SelectItem>
                      <SelectItem value="confirmed">Approved</SelectItem>
                      <SelectItem value="completed">Visit completed</SelectItem>
                      <SelectItem value="no_show">No show</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reqLoading ? (
                  <PortalLoadingBlock />
                ) : (
                  <RequestsListView requests={filteredRequests} onEdit={openEditRequest} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRequest} onOpenChange={(open) => !open && setEditRequest(null)}>
        <DialogContent className="portal-root portal-ui max-w-md">
          <DialogHeader>
            <DialogTitle>Edit appointment request</DialogTitle>
            <DialogDescription>Only pending requests can be changed.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((vals) =>
              editRequest && updateReq.mutate({ id: editRequest.id, body: vals }),
            )}
          >
            <PortalAppointmentRequestFields form={editForm} idPrefix="edit" careLocations={careLocations} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRequest(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={PORTAL_PRIMARY_BTN_CLASS}
                disabled={updateReq.isPending}
              >
                {updateReq.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!declineTarget} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <AlertDialogContent className="portal-root portal-ui">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {declineTarget
                ? `Decline the visit on ${formatDateTime(declineTarget.appointmentDate)}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="decline-reason">Reason (optional)</Label>
            <Textarea
              id="decline-reason"
              rows={2}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                declineTarget && declineAppt.mutate({ id: declineTarget.id, reason: declineReason })
              }
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="portal-root portal-ui">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel confirmed visit?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget
                ? `Cancel your confirmed visit on ${formatDateTime(cancelTarget.appointmentDate)}?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep visit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                cancelTarget && cancelAppt.mutate({ id: cancelTarget.id, reason: cancelReason })
              }
            >
              Cancel visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleAppointmentModal
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        appointment={
          rescheduleTarget
            ? {
                id: rescheduleTarget.id,
                appointmentDate: rescheduleTarget.appointmentDate,
                durationMinutes: rescheduleTarget.durationMinutes,
                appointmentType: rescheduleTarget.appointmentType,
              }
            : null
        }
        mode="portal"
        onSuccess={invalidateAppointmentData}
      />
    </div>
  );
}
