/**
 * Appointment notification email bodies.
 * Separated to keep server/emailTemplates.ts maintainable.
 */
import { emailButtonHtml, getEmailTemplate } from "./emailTemplates";

function formatAppointmentDateTime(value: Date | string): string {
  return new Date(value).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function modalityDisplay(modality?: string | null): string {
  if (modality === "telehealth") return "Telehealth (video)";
  if (modality === "phone") return "Phone";
  return "In person";
}

function appointmentDetailsTable(params: {
  patientName: string;
  staffName?: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  statusLabel?: string;
  reason?: string | null;
  locationName?: string | null;
}): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 160px;">Patient:</td>
        <td style="padding: 8px 0;"><strong>${params.patientName}</strong></td>
      </tr>
      ${
        params.staffName
          ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Provider:</td>
        <td style="padding: 8px 0;">${params.staffName}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">When:</td>
        <td style="padding: 8px 0;"><strong>${formatAppointmentDateTime(params.appointmentDate)}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Type:</td>
        <td style="padding: 8px 0;">${params.appointmentType.replace(/_/g, " ")}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Modality:</td>
        <td style="padding: 8px 0;">${modalityDisplay(params.modality)}</td>
      </tr>
      ${
        params.locationName
          ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Location:</td>
        <td style="padding: 8px 0;">${params.locationName}</td>
      </tr>`
          : ""
      }
      ${
        params.statusLabel
          ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Status:</td>
        <td style="padding: 8px 0;">${params.statusLabel}</td>
      </tr>`
          : ""
      }
      ${
        params.reason
          ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Notes:</td>
        <td style="padding: 8px 0;">${params.reason}</td>
      </tr>`
          : ""
      }
    </table>
  `;
}

export function getAppointmentScheduledPatientEmail(params: {
  patientName: string;
  tenantName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  portalAppointmentsUrl: string;
}): string {
  const content = `
    <h1>New appointment scheduled</h1>
    <p>Dear ${params.patientName},</p>
    <p><strong>${params.tenantName}</strong> has scheduled a visit for you. Please review the details and confirm or decline in your patient portal.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "Awaiting your confirmation",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.portalAppointmentsUrl, "Review & confirm in portal", "navy")}
    </div>
    <p style="color: #64748b; font-size: 14px;">If you cannot attend, open the portal and decline so the team can offer another time.</p>
  `;
  return getEmailTemplate(content);
}

/** Patient-initiated request approved by staff — no second confirmation required. */
export function getAppointmentRequestApprovedPatientEmail(params: {
  patientName: string;
  tenantName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  locationName?: string | null;
  joinUrl?: string | null;
  portalAppointmentsUrl: string;
}): string {
  const isTelehealth = params.modality === "telehealth";
  const content = `
    <h1>Your visit request is confirmed</h1>
    <p>Dear ${params.patientName},</p>
    <p><strong>${params.tenantName}</strong> has approved your appointment request. Your visit is confirmed — no further action is needed unless the team contacts you about a change.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      locationName: params.locationName,
      statusLabel: "Confirmed",
    })}
    ${
      isTelehealth && params.joinUrl
        ? `<div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.joinUrl, "Join video visit", "navy")}
    </div>
    <p style="color: #64748b; font-size: 14px;">Open the link in your browser for a secure in-app video visit. You can also join from the patient portal about 15 minutes before your scheduled time.</p>`
        : ""
    }
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.portalAppointmentsUrl, "View in portal", "navy")}
    </div>
  `;
  return getEmailTemplate(content);
}

/** Staff rescheduled a previously confirmed visit — patient must confirm again. */
export function getAppointmentUpdatedPatientEmail(params: {
  patientName: string;
  tenantName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  locationName?: string | null;
  portalAppointmentsUrl: string;
}): string {
  const content = `
    <h1>Appointment updated — please confirm</h1>
    <p>Dear ${params.patientName},</p>
    <p><strong>${params.tenantName}</strong> updated your visit details. Please review and confirm or decline in your patient portal.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      locationName: params.locationName,
      statusLabel: "Awaiting your confirmation",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.portalAppointmentsUrl, "Review & confirm in portal", "navy")}
    </div>
    <p style="color: #64748b; font-size: 14px;">If the new time does not work for you, decline in the portal so the team can offer another slot.</p>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentScheduledStaffEmail(params: {
  tenantName: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  appointmentsUrl: string;
}): string {
  const content = `
    <h1>New appointment scheduled</h1>
    <p>A visit has been scheduled at <strong>${params.tenantName}</strong> and is awaiting patient confirmation in the portal.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "Scheduled — awaiting confirmation",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.appointmentsUrl, "View appointments", "primary")}
    </div>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentPatientConfirmedStaffEmail(params: {
  tenantName: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  appointmentsUrl: string;
}): string {
  const content = `
    <h1>Appointment confirmed by patient</h1>
    <p>A patient has confirmed their scheduled visit at <strong>${params.tenantName}</strong>.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "Confirmed",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.appointmentsUrl, "View appointments", "primary")}
    </div>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentPatientDeclinedStaffEmail(params: {
  tenantName: string;
  patientName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  reason?: string | null;
  appointmentsUrl: string;
}): string {
  const content = `
    <h1>Appointment declined by patient</h1>
    <p>A patient declined a scheduled visit at <strong>${params.tenantName}</strong>. The appointment has been cancelled.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "Cancelled (declined)",
      reason: params.reason,
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.appointmentsUrl, "View appointments", "primary")}
    </div>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentPatientCancelledStaffEmail(params: {
  tenantName: string;
  patientName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  reason?: string | null;
  appointmentsUrl: string;
}): string {
  const content = `
    <h1>Confirmed visit cancelled by patient</h1>
    <p>A patient cancelled a previously confirmed appointment at <strong>${params.tenantName}</strong>.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "Cancelled by attendee",
      reason: params.reason,
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.appointmentsUrl, "View appointments", "primary")}
    </div>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentTelehealthConfirmedPatientEmail(params: {
  patientName: string;
  tenantName: string;
  staffName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  joinUrl: string;
  portalAppointmentsUrl: string;
}): string {
  const content = `
    <h1>Your telehealth visit is confirmed</h1>
    <p>Dear ${params.patientName},</p>
    <p>Thank you for confirming your visit at <strong>${params.tenantName}</strong>. Your secure video visit is ready in the patient portal.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      staffName: params.staffName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: "telehealth",
      statusLabel: "Confirmed — ready to join",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.joinUrl, "Join video visit", "navy")}
    </div>
    <p style="color: #64748b; font-size: 14px;">You can also join from the patient portal under Appointments. Join opens about 15 minutes before your scheduled time.</p>
    <p style="color: #64748b; font-size: 14px;"><a href="${params.portalAppointmentsUrl}" style="color: #3b4ca8;">Open patient portal</a></p>
  `;
  return getEmailTemplate(content);
}

export function getAppointmentNoShowStaffEmail(params: {
  tenantName: string;
  patientName: string;
  appointmentDate: Date | string;
  appointmentType: string;
  modality?: string | null;
  appointmentsUrl: string;
}): string {
  const content = `
    <h1>Appointment marked no-show</h1>
    <p>An appointment at <strong>${params.tenantName}</strong> was automatically marked as no-show after the grace period elapsed without check-in.</p>
    ${appointmentDetailsTable({
      patientName: params.patientName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      modality: params.modality,
      statusLabel: "No show",
    })}
    <div style="text-align: center; margin: 28px 0;">
      ${emailButtonHtml(params.appointmentsUrl, "View appointments", "primary")}
    </div>
  `;
  return getEmailTemplate(content);
}
