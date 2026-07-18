/** Statuses that allow changing the appointment slot before the visit starts. */
export const APPOINTMENT_RESCHEDULE_STATUSES = ["scheduled", "confirmed"] as const;

export type AppointmentRescheduleStatus = (typeof APPOINTMENT_RESCHEDULE_STATUSES)[number];

export function canRescheduleAppointment(
  status: string | null | undefined,
  appointmentDate: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!status || appointmentDate == null) return false;
  if (!(APPOINTMENT_RESCHEDULE_STATUSES as readonly string[]).includes(status)) return false;
  const slotMs = new Date(appointmentDate).getTime();
  if (Number.isNaN(slotMs)) return false;
  return slotMs > now.getTime();
}

export function toDateTimeLocalInputValue(date: string | Date | null | undefined): string {
  if (date == null) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}
