import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Clock, User, MoreVertical, CheckCircle, X, UserX, Trash2, Calendar } from "lucide-react";

interface AppointmentCardProps {
  appointment: any;
  onStatusUpdate?: (appointmentId: string, status: string) => void;
  onDelete?: (appointment: any) => void;
}

export default function AppointmentCard({ appointment, onStatusUpdate, onDelete }: AppointmentCardProps) {
  // Handle both flat and nested appointment structures
  const appointmentData = appointment.appointment || appointment;
  const patientData = appointment.patient;
  const employeeData = appointment.employee;
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'in_progress':
      case 'in-progress':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors card-hover-accent">
      <div className="bg-uventorybiz-navy p-2 rounded-lg">
        <Clock className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {formatTime(appointmentData.appointmentDate)}
          </p>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(appointmentData.status)} className="ml-2">
              {appointmentData.status || 'scheduled'}
            </Badge>
            {(onStatusUpdate || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`dropdown-today-appointment-${appointmentData.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {appointmentData?.status !== 'completed' && onStatusUpdate && (
                    <DropdownMenuItem
                      onClick={() => onStatusUpdate(appointmentData.id, 'completed')}
                      data-testid={`complete-today-appointment-${appointmentData.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </DropdownMenuItem>
                  )}
                  {appointmentData?.status !== 'in_progress' && onStatusUpdate && (
                    <DropdownMenuItem
                      onClick={() => onStatusUpdate(appointmentData.id, 'in_progress')}
                      data-testid={`start-today-appointment-${appointmentData.id}`}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {appointmentData?.status === 'completed' ? 'Reassign as In Progress' : 'Start Appointment'}
                    </DropdownMenuItem>
                  )}
                  {appointmentData?.status !== 'cancelled' && onStatusUpdate && (
                    <DropdownMenuItem
                      onClick={() => onStatusUpdate(appointmentData.id, 'cancelled')}
                      data-testid={`cancel-today-appointment-${appointmentData.id}`}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {appointmentData?.status === 'completed' ? 'Reassign as Cancelled' : 'Cancel Appointment'}
                    </DropdownMenuItem>
                  )}
                  {appointmentData?.status !== 'no_show' && onStatusUpdate && (
                    <DropdownMenuItem
                      onClick={() => onStatusUpdate(appointmentData.id, 'no_show')}
                      data-testid={`no-show-today-appointment-${appointmentData.id}`}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {appointmentData?.status === 'completed' ? 'Reassign as No Show' : 'Mark as No Show'}
                    </DropdownMenuItem>
                  )}
                  {appointmentData?.status !== 'scheduled' && onStatusUpdate && (
                    <DropdownMenuItem
                      onClick={() => onStatusUpdate(appointmentData.id, 'scheduled')}
                      data-testid={`reschedule-today-appointment-${appointmentData.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {appointmentData?.status === 'completed' ? 'Reassign as Scheduled' : 'Mark as Scheduled'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(appointment)}
                      className="text-red-600"
                      data-testid={`delete-today-appointment-${appointmentData.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Appointment
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="text-xs text-uventorybiz-gray mt-1">
          {appointmentData.appointmentType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'General consultation'}
        </p>
        {(patientData || employeeData) && (
          <div className="flex items-center mt-1">
            <User className="h-3 w-3 text-uventorybiz-gray mr-1" />
            <p className="text-xs text-uventorybiz-gray">
              {employeeData ? 
                `${employeeData.firstName} ${employeeData.lastName}` : 
                `${patientData?.firstName} ${patientData?.lastName}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}