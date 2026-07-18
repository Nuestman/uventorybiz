import type { Appointment, CareLocation } from "@shared/schema";
import type { IStorage } from "../../storage";

export type AppointmentLocationDisplay = {
  locationName: string | null;
  locationCode: string | null;
};

/** Resolve care location label for portal when appointment.locationId is unset. */
export async function resolveAppointmentLocationDisplay(
  storage: IStorage,
  tenantId: string,
  appointment: Pick<Appointment, "modality" | "locationId">,
  primaryLocation?: CareLocation | null,
): Promise<AppointmentLocationDisplay> {
  if (appointment.modality === "telehealth") {
    return { locationName: "Virtual visit", locationCode: "Virtual" };
  }
  if (appointment.modality === "phone") {
    return { locationName: "Phone visit", locationCode: "Phone" };
  }

  if (appointment.locationId) {
    const loc = await storage.getCareLocation(appointment.locationId, tenantId);
    if (loc) {
      return { locationName: loc.locationName, locationCode: loc.locationCode };
    }
  }

  const primary = primaryLocation ?? (await storage.getPrimaryCareLocation(tenantId));
  if (primary) {
    return { locationName: primary.locationName, locationCode: primary.locationCode };
  }

  return { locationName: null, locationCode: null };
}
