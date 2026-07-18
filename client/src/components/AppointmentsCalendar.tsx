import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format as dateFnsFormat, parse, startOfWeek, getDay, endOfMonth, startOfMonth } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "@/components/ui/badge";

const APPOINTMENT_MINUTES = 30;

const bigCalendarLocalizer = dateFnsLocalizer({
  format: dateFnsFormat,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

type AppointmentRow = {
  id: string;
  appointmentDate: string;
  appointmentType?: string | null;
  modality?: string | null;
  status?: string | null;
  employee?: { firstName?: string; lastName?: string };
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AppointmentRow;
};

function statusColor(status?: string | null): string {
  switch (status) {
    case "confirmed":
      return "#166534";
    case "scheduled":
      return "#1e3a5f";
    case "in_progress":
      return "#b45309";
    case "completed":
      return "#6b7280";
    case "cancelled":
    case "no_show":
      return "#b91c1c";
    default:
      return "#374151";
  }
}

function appointmentToEvent(row: AppointmentRow): CalendarEvent {
  const start = new Date(row.appointmentDate);
  const end = new Date(start.getTime() + APPOINTMENT_MINUTES * 60 * 1000);
  const patientName = [row.employee?.firstName, row.employee?.lastName].filter(Boolean).join(" ") || "Attendee";
  const typeLabel = row.appointmentType?.replace(/_/g, " ") ?? "Appointment";
  const modality =
    row.modality === "telehealth" ? " (video)" : row.modality === "phone" ? " (phone)" : "";
  return {
    id: row.id,
    title: `${patientName} — ${typeLabel}${modality}`,
    start,
    end,
    resource: row,
  };
}

export default function AppointmentsCalendar() {
  const [range, setRange] = useState(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }));
  const [view, setView] = useState<View>("month");

  const { data: appointments = [], isLoading } = useQuery<AppointmentRow[]>({
    queryKey: ["/api/appointments", { start: range.start.toISOString(), end: range.end.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      const res = await fetch(`/api/appointments?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: Failed to load calendar appointments`);
      return res.json();
    },
  });

  const events = useMemo(() => appointments.map(appointmentToEvent), [appointments]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor("scheduled") }} />
          Awaiting confirmation
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor("confirmed") }} />
          Confirmed
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor("in_progress") }} />
          In progress
        </Badge>
      </div>
      <div className="h-[520px] relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm text-uventorybiz-gray">
            Loading calendar…
          </div>
        )}
        <BigCalendar
          localizer={bigCalendarLocalizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          views={["month", "week", "day", "agenda"]}
          view={view}
          onView={setView}
          onRangeChange={(r: Date[] | { start: Date; end: Date }) => {
            if (Array.isArray(r) && r.length >= 2) {
              setRange({ start: r[0], end: r[r.length - 1] });
            } else if (r && typeof r === "object" && "start" in r && "end" in r) {
              setRange({ start: r.start, end: r.end });
            }
          }}
          eventPropGetter={(event) => {
            const status = (event as CalendarEvent).resource?.status;
            const bg = statusColor(status);
            return {
              style: {
                backgroundColor: bg,
                borderColor: bg,
                color: "#fff",
                fontSize: "0.75rem",
              },
            };
          }}
          popup
        />
      </div>
      <p className="text-xs text-uventorybiz-gray">
        Each block is {APPOINTMENT_MINUTES} minutes. Overlapping events may indicate a scheduling conflict.
      </p>
    </div>
  );
}
