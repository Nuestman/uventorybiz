import type { UseFormReturn } from "react-hook-form";

export type PortalAppointmentRequestForm = {
  preferredDateTime: string;
  preferredModality: "in_person" | "telehealth";
  preferredLocationId: string;
  reason: string;
};

export function emptyPortalAppointmentRequestForm(
  defaultLocationId = "",
): PortalAppointmentRequestForm {
  return {
    preferredDateTime: "",
    preferredModality: "in_person",
    preferredLocationId: defaultLocationId,
    reason: "",
  };
}

export function buildPortalAppointmentRequestPayload(body: PortalAppointmentRequestForm) {
  const preferredDateTime = body.preferredDateTime ? new Date(body.preferredDateTime) : null;
  return {
    preferredDateTime:
      preferredDateTime && !Number.isNaN(preferredDateTime.getTime()) ? preferredDateTime : null,
    preferredModality: body.preferredModality,
    preferredLocationId:
      body.preferredModality === "in_person" && body.preferredLocationId
        ? body.preferredLocationId
        : null,
    reason: body.reason.trim() || null,
  };
}

export function combinePreferredDateTime(date: string, timeSlot: string | null): string {
  if (!date) return "";
  const time = timeSlot ?? "09:00";
  return `${date}T${time}`;
}

export function splitPreferredDateTime(value: string): { date: string; timeSlot: string | null } {
  if (!value) return { date: "", timeSlot: null };
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const [date, timePart] = value.split("T");
    const timeSlot = timePart?.slice(0, 5) ?? null;
    return { date, timeSlot };
  }
  return { date: value.slice(0, 10), timeSlot: null };
}
