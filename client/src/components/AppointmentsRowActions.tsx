import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, CheckCircle, Clock, MessageSquare, MoreVertical, Trash2, UserX, X } from "lucide-react";
import { Link } from "wouter";
import { canRescheduleAppointment } from "@shared/appointmentReschedule";
import { requiresStaffConfirmation } from "@shared/appointmentConfirmation";

export type AppointmentRowData = {
  id: string;
  employeeId?: string;
  status?: string | null;
  confirmationRequiredFrom?: string | null;
  appointmentType?: string | null;
  appointmentDate?: string | null;
  durationMinutes?: number;
  modality?: string | null;
  telecareSessionId?: string | null;
  telecareSessionStatus?: string | null;
  telecareScheduledEnd?: string | null;
  employee?: {
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
  };
};

type AppointmentsRowActionsProps = {
  appointment: AppointmentRowData;
  onStatusUpdate: (appointmentId: string, status: string) => void;
  onDelete: (appointment: AppointmentRowData) => void;
  onReschedule?: (appointment: AppointmentRowData) => void;
  onConfirmReschedule?: (appointment: AppointmentRowData) => void;
};

export function statusBadgeVariant(status?: string | null) {
  if (status === "scheduled") return "default" as const;
  if (status === "completed") return "secondary" as const;
  if (status === "cancelled" || status === "no_show") return "destructive" as const;
  return "outline" as const;
}

export function formatAppointmentStatus(
  status?: string | null,
  confirmationRequiredFrom?: string | null,
) {
  if (status === "scheduled") {
    if (confirmationRequiredFrom === "staff") return "Awaiting staff confirmation";
    if (confirmationRequiredFrom === "patient") return "Awaiting portal confirmation";
    return "Awaiting portal confirmation";
  }
  return status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown";
}

export default function AppointmentsRowActions({
  appointment,
  onStatusUpdate,
  onDelete,
  onReschedule,
  onConfirmReschedule,
}: AppointmentsRowActionsProps) {
  const status = appointment.status;
  const showReschedule =
    !!onReschedule && canRescheduleAppointment(status, appointment.appointmentDate);
  const showConfirmReschedule =
    !!onConfirmReschedule &&
    requiresStaffConfirmation(status, appointment.confirmationRequiredFrom);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`dropdown-appointment-${appointment.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {appointment.employeeId ? (
          <DropdownMenuItem asChild>
            <Link
              href={`/messages?employeeId=${encodeURIComponent(appointment.employeeId)}&appointmentId=${encodeURIComponent(appointment.id)}`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message employee
            </Link>
          </DropdownMenuItem>
        ) : null}
        {status !== "completed" && (
          <DropdownMenuItem
            onClick={() => onStatusUpdate(appointment.id, "completed")}
            data-testid={`complete-appointment-${appointment.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Completed
          </DropdownMenuItem>
        )}
        {status !== "in_progress" && (
          <DropdownMenuItem
            onClick={() => onStatusUpdate(appointment.id, "in_progress")}
            data-testid={`start-appointment-${appointment.id}`}
          >
            <Clock className="h-4 w-4 mr-2" />
            {status === "completed" ? "Reassign as In Progress" : "Start Appointment"}
          </DropdownMenuItem>
        )}
        {status !== "cancelled" && (
          <DropdownMenuItem
            onClick={() => onStatusUpdate(appointment.id, "cancelled")}
            data-testid={`cancel-appointment-${appointment.id}`}
          >
            <X className="h-4 w-4 mr-2" />
            {status === "completed" ? "Reassign as Cancelled" : "Cancel Appointment"}
          </DropdownMenuItem>
        )}
        {status !== "no_show" && (
          <DropdownMenuItem
            onClick={() => onStatusUpdate(appointment.id, "no_show")}
            data-testid={`no-show-appointment-${appointment.id}`}
          >
            <UserX className="h-4 w-4 mr-2" />
            {status === "completed" ? "Reassign as No Show" : "Mark as No Show"}
          </DropdownMenuItem>
        )}
        {showConfirmReschedule ? (
          <DropdownMenuItem
            onClick={() => onConfirmReschedule(appointment)}
            data-testid={`confirm-reschedule-appointment-${appointment.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm reschedule
          </DropdownMenuItem>
        ) : null}
        {showReschedule ? (
          <DropdownMenuItem
            onClick={() => onReschedule(appointment)}
            data-testid={`reschedule-appointment-${appointment.id}`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Reschedule
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => onDelete(appointment)}
          className="text-red-600"
          data-testid={`delete-appointment-${appointment.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Appointment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppointmentStatusBadge({
  status,
  confirmationRequiredFrom,
}: {
  status?: string | null;
  confirmationRequiredFrom?: string | null;
}) {
  return (
    <Badge variant={statusBadgeVariant(status)} className="text-xs capitalize">
      {formatAppointmentStatus(status, confirmationRequiredFrom)}
    </Badge>
  );
}
