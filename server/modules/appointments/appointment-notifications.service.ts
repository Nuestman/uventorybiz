import type { IStorage } from "../../storage";
import type { Appointment } from "@shared/schema";
import { sendEmail } from "../../notificationService";
import {
  getAppointmentScheduledPatientEmail,
  getAppointmentRequestApprovedPatientEmail,
  getAppointmentUpdatedPatientEmail,
} from "../../appointmentEmailTemplates";
import { findPortalUserByPatientId } from "../portal/portal.repository";
import { isPortalNotificationEnabledForUser } from "../portal/portal-notification-preferences.service";
import { resolveAppointmentLocationDisplay } from "./appointment-location.service";
import { logError } from "../../logger";

const APPOINTMENT_IN_APP_FALLBACK_ROLES = ["staff", "fleet_operator", "admin"] as const;

function getAppBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.REPLIT_DOMAINS?.split(",")[0] ||
    "http://localhost:17009";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

async function sendBrandedEmail(to: string, subject: string, html: string): Promise<boolean> {
  // The email template renders a text-based logo inline; no attachments needed.
  return sendEmail({ to, subject, html });
}

async function sendPortalPatientAppointmentEmail(
  tenantId: string,
  ctx: { portalEmail: string | null; portalUserId: string | null },
  subject: string,
  html: string,
): Promise<void> {
  if (!ctx.portalEmail || !ctx.portalUserId) return;
  const enabled = await isPortalNotificationEnabledForUser(
    tenantId,
    ctx.portalUserId,
    "appointment_reminders",
    "email",
  );
  if (!enabled) return;
  await sendBrandedEmail(ctx.portalEmail, subject, html);
}

async function loadAppointmentContext(storage: IStorage, tenantId: string, appointment: Appointment) {
  const tenant = await storage.getTenant(tenantId);
  const employee = await storage.getEmployee(appointment.employeeId, tenantId);
  const subjectName = employee
    ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee"
    : "Employee";
  const staff = await storage.getUser(appointment.medicalStaffId);
  const staffName = staff
    ? `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.email || "Provider"
    : "Provider";
  const linkedPatient = await storage.getPatientByEmployeeId(appointment.employeeId, tenantId);
  const portalUser = linkedPatient
    ? await findPortalUserByPatientId(tenantId, linkedPatient.id)
    : null;
  const loc = await resolveAppointmentLocationDisplay(storage, tenantId, appointment);
  const baseUrl = getAppBaseUrl();
  return {
    tenantName: tenant?.name ?? "uventorybiz",
    patientName: subjectName,
    staffName,
    portalEmail: portalUser?.email ?? null,
    portalUserId: portalUser?.id ?? null,
    locationName: loc.locationName,
    portalAppointmentsUrl: `${baseUrl}/portal/appointments`,
  };
}

/** In-app only — assigned provider plus role fallbacks when no preference subscribers exist. */
async function resolveAppointmentInAppRecipientIds(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  notificationTypeKey: string,
): Promise<string[]> {
  const recipientIds = new Set<string>();

  if (appointment.medicalStaffId) {
    recipientIds.add(appointment.medicalStaffId);
  }

  let candidates = await storage.getUsersForNotificationType(tenantId, notificationTypeKey);

  if (candidates.length === 0) {
    for (const role of APPOINTMENT_IN_APP_FALLBACK_ROLES) {
      const users = await storage.getActiveTenantUsersByRoles(tenantId, [role]);
      for (const u of users) recipientIds.add(u.id);
    }
    return [...recipientIds];
  }

  const allTypes = await storage.getNotificationTypes();
  const notificationType = allTypes.find((t) => t.key === notificationTypeKey);
  if (!notificationType) return [...recipientIds];

  for (const user of candidates) {
    const prefs = await storage.getNotificationPreferences(user.id, tenantId);
    const typePrefs = prefs.filter((p) => p.notificationTypeId === notificationType.id);
    const inAppPref = typePrefs.find((p) => p.channel === "in_app");
    if (inAppPref?.enabled) {
      recipientIds.add(user.id);
    } else if (!typePrefs.some((p) => p.channel === "in_app")) {
      recipientIds.add(user.id);
    }
  }

  return [...recipientIds];
}

async function createInAppNotificationForUser(
  storage: IStorage,
  tenantId: string,
  userId: string,
  notificationTypeKey: string,
  title: string,
  message: string,
  metadata: Record<string, unknown>,
  senderId?: string,
) {
  const allTypes = await storage.getNotificationTypes();
  const notificationType = allTypes.find((t) => t.key === notificationTypeKey);
  if (!notificationType) return;

  const notification = await storage.createNotification({
    tenantId,
    recipientId: userId,
    senderId: senderId ?? null,
    notificationTypeId: notificationType.id,
    channel: "in_app",
    title,
    message,
    status: "pending",
    metadata: metadata ?? null,
  });

  await storage.markNotificationSent(notification.id);
  await storage.createNotificationDeliveryLog({
    tenantId,
    notificationId: notification.id,
    channel: "in_app",
    provider: "system",
    status: "sent",
    providerResponse: null,
  });
}

async function notifyAppointmentStaffInApp(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  notificationTypeKey: string,
  title: string,
  message: string,
  metadata: Record<string, unknown>,
  senderId?: string,
) {
  const recipientIds = await resolveAppointmentInAppRecipientIds(
    storage,
    tenantId,
    appointment,
    notificationTypeKey,
  );
  for (const userId of recipientIds) {
    await createInAppNotificationForUser(
      storage,
      tenantId,
      userId,
      notificationTypeKey,
      title,
      message,
      metadata,
      senderId,
    );
  }
}

function runAsync(label: string, fn: () => Promise<void>) {
  void fn().catch((err) => logError(`Appointment notification (${label}) failed`, err));
}

export function notifyAppointmentScheduled(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  createdByUserId?: string,
) {
  runAsync("scheduled", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);

    if (ctx.portalEmail) {
      const html = getAppointmentScheduledPatientEmail({
        patientName: ctx.patientName,
        tenantName: ctx.tenantName,
        staffName: ctx.staffName,
        appointmentDate: appointment.appointmentDate,
        appointmentType: appointment.appointmentType,
        modality: appointment.modality,
        portalAppointmentsUrl: ctx.portalAppointmentsUrl,
      });
      await sendPortalPatientAppointmentEmail(
        tenantId,
        ctx,
        `${ctx.tenantName}: New appointment — please confirm`,
        html,
      );
    }

    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_scheduled",
      "Appointment scheduled",
      `${ctx.patientName} — ${appointment.appointmentType.replace(/_/g, " ")} on ${new Date(appointment.appointmentDate).toLocaleString()}`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId },
      createdByUserId,
    );
  });
}

/** Patient requested a visit; staff approved — appointment is already confirmed. */
export function notifyAppointmentPortalRequestApproved(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  staffUserId?: string,
) {
  runAsync("portal_request_approved", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);

    if (ctx.portalEmail) {
      const html = getAppointmentRequestApprovedPatientEmail({
        patientName: ctx.patientName,
        tenantName: ctx.tenantName,
        staffName: ctx.staffName,
        appointmentDate: appointment.appointmentDate,
        appointmentType: appointment.appointmentType,
        modality: appointment.modality,
        locationName: ctx.locationName,
        joinUrl: null,
        portalAppointmentsUrl: ctx.portalAppointmentsUrl,
      });
      await sendPortalPatientAppointmentEmail(
        tenantId,
        ctx,
        `${ctx.tenantName}: Your visit request is confirmed`,
        html,
      );
    }

    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_scheduled",
      "Portal visit request approved",
      `${ctx.patientName} — ${appointment.appointmentType.replace(/_/g, " ")} on ${new Date(appointment.appointmentDate).toLocaleString()}`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, source: "portal_request" },
      staffUserId,
    );
  });
}

/** Staff changed schedule on a confirmed visit — patient must confirm again. */
export function notifyAppointmentRescheduled(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  updatedByUserId?: string,
) {
  runAsync("rescheduled", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);

    if (ctx.portalEmail) {
      const html = getAppointmentUpdatedPatientEmail({
        patientName: ctx.patientName,
        tenantName: ctx.tenantName,
        staffName: ctx.staffName,
        appointmentDate: appointment.appointmentDate,
        appointmentType: appointment.appointmentType,
        modality: appointment.modality,
        locationName: ctx.locationName,
        portalAppointmentsUrl: ctx.portalAppointmentsUrl,
      });
      await sendPortalPatientAppointmentEmail(
        tenantId,
        ctx,
        `${ctx.tenantName}: Appointment updated — please confirm`,
        html,
      );
    }

    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_scheduled",
      "Appointment updated — awaiting portal confirmation",
      `${ctx.patientName} — schedule changed; awaiting portal confirmation`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, rescheduled: true },
      updatedByUserId,
    );
  });
}

export function notifyAppointmentPatientConfirmed(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
) {
  runAsync("patient_confirmed", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);

    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_patient_confirmed",
      "Appointment confirmed via portal",
      `${ctx.patientName} confirmed their visit on ${new Date(appointment.appointmentDate).toLocaleString()}`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId },
    );
  });
}

export function notifyAppointmentPatientDeclined(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  reason?: string | null,
) {
  runAsync("patient_declined", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);
    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_patient_declined",
      "Appointment declined via portal",
      `${ctx.patientName} declined the scheduled visit`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, reason },
    );
  });
}

export function notifyAppointmentPatientCancelled(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  reason?: string | null,
) {
  runAsync("patient_cancelled", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);
    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_patient_cancelled",
      "Confirmed visit cancelled via portal",
      `${ctx.patientName} cancelled their confirmed visit`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, reason },
    );
  });
}

export function notifyAppointmentPatientRescheduled(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  reason?: string | null,
) {
  runAsync("patient_rescheduled", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);
    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_scheduled",
      "Reschedule requested — confirm new time",
      `${ctx.patientName} proposed ${new Date(appointment.appointmentDate).toLocaleString()} — awaiting your confirmation`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, reason, rescheduledBy: "patient" },
    );
  });
}

/** Staff accepted a patient-proposed reschedule — visit is confirmed at the new time. */
export function notifyAppointmentStaffConfirmedReschedule(
  storage: IStorage,
  tenantId: string,
  appointment: Appointment,
  confirmedByUserId?: string,
) {
  runAsync("staff_confirmed_reschedule", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);

    if (ctx.portalEmail) {
      const html = getAppointmentRequestApprovedPatientEmail({
        patientName: ctx.patientName,
        tenantName: ctx.tenantName,
        staffName: ctx.staffName,
        appointmentDate: appointment.appointmentDate,
        appointmentType: appointment.appointmentType,
        modality: appointment.modality,
        locationName: ctx.locationName,
        joinUrl: null,
        portalAppointmentsUrl: ctx.portalAppointmentsUrl,
      });
      await sendPortalPatientAppointmentEmail(
        tenantId,
        ctx,
        `${ctx.tenantName}: Your rescheduled visit is confirmed`,
        html,
      );
    }

    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_patient_confirmed",
      "Reschedule confirmed",
      `${ctx.patientName} — visit confirmed for ${new Date(appointment.appointmentDate).toLocaleString()}`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId, rescheduledBy: "patient" },
      confirmedByUserId,
    );
  });
}

export function notifyAppointmentNoShow(storage: IStorage, tenantId: string, appointment: Appointment) {
  runAsync("no_show", async () => {
    const ctx = await loadAppointmentContext(storage, tenantId, appointment);
    await notifyAppointmentStaffInApp(
      storage,
      tenantId,
      appointment,
      "appointment_no_show",
      "Appointment marked no-show",
      `${ctx.patientName} — no-show for ${new Date(appointment.appointmentDate).toLocaleString()}`,
      { appointmentId: appointment.id, employeeId: appointment.employeeId },
    );
  });
}
