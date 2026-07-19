import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import AppointmentsRowActions, {
  AppointmentStatusBadge,
  type AppointmentRowData,
} from "@/components/AppointmentsRowActions";
import TelecareJoinButton, { canStaffJoinTelecare } from "@/components/TelecareJoinButton";
import { useTelecareJoinWindowClock } from "@/components/telecare/useTelecareJoinWindowClock";

type AppointmentsTablePagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

type AppointmentsTableProps = {
  appointments: AppointmentRowData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  /** Optional filter controls rendered below the card header. */
  filters?: ReactNode;
  /** Side-by-side column layout — tighter table and scrollable body. */
  splitColumn?: boolean;
  pagination?: AppointmentsTablePagination;
  onStatusUpdate: (appointmentId: string, status: string) => void;
  onDelete: (appointment: AppointmentRowData) => void;
  onReschedule?: (appointment: AppointmentRowData) => void;
  onConfirmReschedule?: (appointment: AppointmentRowData) => void;
};

function modalityLabel(modality?: string | null) {
  if (modality === "telehealth") return "Telehealth";
  if (modality === "phone") return "Phone";
  return "In person";
}

function AppointmentsTableBody({
  appointments,
  isLoading,
  emptyMessage,
  splitColumn,
  onStatusUpdate,
  onDelete,
  onReschedule,
  onConfirmReschedule,
}: Pick<
  AppointmentsTableProps,
  | "appointments"
  | "isLoading"
  | "emptyMessage"
  | "splitColumn"
  | "onStatusUpdate"
  | "onDelete"
  | "onReschedule"
  | "onConfirmReschedule"
>) {
  if (isLoading) {
    return <p className="text-sm text-uventorybiz-gray py-8 text-center">Loading appointments…</p>;
  }
  if (appointments.length === 0) {
    return <p className="text-sm text-uventorybiz-gray py-8 text-center">{emptyMessage}</p>;
  }
  return (
    <div className={cn("overflow-x-auto", splitColumn && "max-h-[min(70vh,640px)] overflow-y-auto")}>
      <Table>
        <TableHeader className={splitColumn ? "sticky top-0 z-10 bg-white" : undefined}>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Attendee</TableHead>
            {!splitColumn ? <TableHead>Type</TableHead> : null}
            {!splitColumn ? <TableHead>Modality</TableHead> : null}
            <TableHead>Date & time</TableHead>
            <TableHead>Status</TableHead>
            {!splitColumn ? <TableHead>Video</TableHead> : null}
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">
                  {row.employee?.firstName || "Unknown"} {row.employee?.lastName || "Employee"}
                </div>
                {row.employee?.employeeNumber && (
                  <div className="text-xs text-uventorybiz-gray">{row.employee.employeeNumber}</div>
                )}
                {splitColumn ? (
                  <div className="text-xs text-uventorybiz-gray mt-0.5 capitalize">
                    {row.appointmentType?.replace(/_/g, " ") || "—"} · {modalityLabel(row.modality)}
                  </div>
                ) : null}
              </TableCell>
              {!splitColumn ? (
                <TableCell className="capitalize">
                  {row.appointmentType?.replace(/_/g, " ") || "—"}
                </TableCell>
              ) : null}
              {!splitColumn ? <TableCell>{modalityLabel(row.modality)}</TableCell> : null}
              <TableCell className="whitespace-nowrap text-sm">
                {row.appointmentDate ? new Date(row.appointmentDate).toLocaleString() : "—"}
              </TableCell>
              <TableCell>
                <AppointmentStatusBadge
                  status={row.status}
                  confirmationRequiredFrom={row.confirmationRequiredFrom}
                />
              </TableCell>
              {!splitColumn ? (
                <TableCell>
                  {(() => {
                    const join = canStaffJoinTelecare({
                      status: row.status,
                      modality: row.modality,
                      telecareSessionId: row.telecareSessionId,
                      appointmentDate: row.appointmentDate,
                      scheduledEnd: row.telecareScheduledEnd,
                      durationMinutes: row.durationMinutes,
                      sessionStatus: row.telecareSessionStatus,
                    });
                    if (!join.ok) return <span className="text-xs text-uventorybiz-gray">—</span>;
                    return (
                      <TelecareJoinButton
                        sessionId={row.telecareSessionId!}
                        apiPrefix="staff"
                        label="Join visit"
                      />
                    );
                  })()}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {splitColumn
                    ? (() => {
                        const join = canStaffJoinTelecare({
                          status: row.status,
                          modality: row.modality,
                          telecareSessionId: row.telecareSessionId,
                          appointmentDate: row.appointmentDate,
                          scheduledEnd: row.telecareScheduledEnd,
                          durationMinutes: row.durationMinutes,
                          sessionStatus: row.telecareSessionStatus,
                        });
                        if (!join.ok) return null;
                        return (
                          <TelecareJoinButton
                            sessionId={row.telecareSessionId!}
                            apiPrefix="staff"
                            label="Join"
                          />
                        );
                      })()
                    : null}
                  <AppointmentsRowActions
                    appointment={row}
                    onStatusUpdate={onStatusUpdate}
                    onDelete={onDelete}
                    onReschedule={onReschedule}
                    onConfirmReschedule={onConfirmReschedule}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AppointmentsTablePaginationFooter({ pagination }: { pagination: AppointmentsTablePagination }) {
  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-100">
      <p className="text-xs text-uventorybiz-gray">
        Page {pagination.page} of {totalPages} · {pagination.totalCount.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page >= totalPages}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function AppointmentsTable({
  appointments,
  isLoading,
  title = "All appointments",
  description,
  emptyMessage = "No appointments match your filters.",
  filters,
  splitColumn = false,
  pagination,
  onStatusUpdate,
  onDelete,
  onReschedule,
  onConfirmReschedule,
}: AppointmentsTableProps) {
  useTelecareJoinWindowClock();

  return (
    <Card className={cn(splitColumn && "min-w-0")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Calendar className="h-5 w-5 mr-2 text-uventorybiz-navy" />
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {filters ? <div className="pt-3">{filters}</div> : null}
      </CardHeader>
      <CardContent>
        <AppointmentsTableBody
          appointments={appointments}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          splitColumn={splitColumn}
          onStatusUpdate={onStatusUpdate}
          onDelete={onDelete}
          onReschedule={onReschedule}
          onConfirmReschedule={onConfirmReschedule}
        />
        {pagination && !isLoading && Math.ceil(pagination.totalCount / pagination.pageSize) > 1 ? (
          <AppointmentsTablePaginationFooter pagination={pagination} />
        ) : null}
      </CardContent>
    </Card>
  );
}
