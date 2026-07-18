/** Who must confirm a `scheduled` appointment before it becomes `confirmed`. */
export const APPOINTMENT_CONFIRMATION_PARTIES = ["patient", "staff"] as const;

export type AppointmentConfirmationParty = (typeof APPOINTMENT_CONFIRMATION_PARTIES)[number];

/** Legacy rows: scheduled with null party still require patient confirmation. */
export function requiresPatientConfirmation(
  status: string | null | undefined,
  confirmationRequiredFrom: string | null | undefined,
): boolean {
  if (status !== "scheduled") return false;
  return confirmationRequiredFrom === "patient" || confirmationRequiredFrom == null;
}

export function requiresStaffConfirmation(
  status: string | null | undefined,
  confirmationRequiredFrom: string | null | undefined,
): boolean {
  return status === "scheduled" && confirmationRequiredFrom === "staff";
}

export function isFullyConfirmedAppointment(
  status: string | null | undefined,
  confirmationRequiredFrom: string | null | undefined,
): boolean {
  return status === "confirmed" && confirmationRequiredFrom == null;
}
