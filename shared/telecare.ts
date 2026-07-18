export const JOIN_EARLY_MINUTES = 15;
/** Legacy grace after start when scheduled_end is unavailable (prefer scheduledEnd). */
export const JOIN_LATE_MINUTES = 90;
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
export const SCHEDULED_END_WARNING_MINUTES = 5;
export const SCHEDULED_END_FINAL_WARNING_MINUTES = 1;
/** Grace after scheduled end before in-call auto-end if provider does not extend (minutes). */
export const SCHEDULED_END_AUTO_END_GRACE_MINUTES = 3;
/** Server-side reconcile grace — slightly longer than client auto-end. */
export const SCHEDULED_END_SERVER_RECONCILE_GRACE_MINUTES = 5;
/** Default grace after appointment slot end before auto no-show. */
export const DEFAULT_APPOINTMENT_NO_SHOW_GRACE_MINUTES = 15;
export const TELEcare_SESSION_EXTEND_MINUTES_OPTIONS = [15, 30] as const;
export type TelecareSessionExtendMinutes = (typeof TELEcare_SESSION_EXTEND_MINUTES_OPTIONS)[number];

export const TELEHEALTH_CONSENT_TEXT =
  "I consent to receiving medical care via encrypted video channels. I understand that telehealth has limitations compared to in-person care, that I should seek emergency services for urgent conditions, and that my clinician may recommend an in-person visit if remote assessment is not adequate.";

/** Telecare join API response (staff + portal). */
export type TelecareRoomCredentials = {
  roomName: string;
  token: string;
  serverUrl: string;
};

export type SanitizedTelecareSession = {
  id: string;
  status: string;
  scheduledStart: string | Date;
  scheduledEnd?: string | Date | null;
  actualStart?: string | Date | null;
  actualEnd?: string | Date | null;
  videoProvider?: string | null;
  roomId?: string | null;
  hasJoinLinks?: boolean;
  patientTelehealthConsentAt?: string | Date | null;
  durationMinutes?: number;
};

export type TelecareJoinResponse = {
  room?: TelecareRoomCredentials;
  joinUrl?: string;
  videoProvider?: string;
  session: SanitizedTelecareSession;
};

export type TelecareParticipantSummary = {
  name: string;
  patientId?: string;
  employeeNumber?: string | null;
  dateOfBirth?: string | Date | null;
  phone?: string | null;
  email?: string | null;
};

export type TelecareProviderSummary = TelecareParticipantSummary & {
  staffUserId?: string | null;
};

export type TelecareHealthSummary = {
  allergies?: string | null;
  medications?: string | null;
  medicalHistory?: string | null;
  chronicConditions?: string | null;
  notes?: string | null;
};

export type TelecareAppointmentSummary = {
  id: string;
  status: string;
  appointmentDate: string | Date;
  appointmentType?: string | null;
  modality?: string | null;
  durationMinutes?: number;
  notes?: string | null;
};

export type TelecareSessionDetailResponse = {
  session: SanitizedTelecareSession;
  appointment?: TelecareAppointmentSummary | null;
  encounterId?: string | null;
  patient?: TelecareParticipantSummary | null;
  provider?: TelecareProviderSummary | null;
  health?: TelecareHealthSummary | null;
};

export type TelecareRoomPhase =
  | "loading"
  | "gate"
  | "consent"
  | "encounter_setup"
  | "prejoin"
  | "waiting"
  | "incall"
  | "ended"
  | "error";

export type TelecareAudience = "staff" | "portal";

export function resolveScheduledEnd(
  scheduledStart: string | Date,
  scheduledEnd?: string | Date | null,
  durationMinutes = DEFAULT_APPOINTMENT_DURATION_MINUTES,
): Date {
  if (scheduledEnd) {
    return scheduledEnd instanceof Date ? scheduledEnd : new Date(scheduledEnd);
  }
  return computeScheduledEnd(scheduledStart, durationMinutes);
}

export function isWithinTelecareJoinWindow(
  scheduledStart: string | Date,
  scheduledEnd?: string | Date | null,
  durationMinutes = DEFAULT_APPOINTMENT_DURATION_MINUTES,
  now = new Date(),
): boolean {
  const start = new Date(scheduledStart).getTime();
  const earliest = start - JOIN_EARLY_MINUTES * 60_000;
  const end = resolveScheduledEnd(scheduledStart, scheduledEnd, durationMinutes).getTime();
  const t = now.getTime();
  return t >= earliest && t <= end;
}

export function telecareJoinWindowMessage(
  scheduledEnd?: string | Date | null,
): string {
  if (scheduledEnd) {
    return `You can join from ${JOIN_EARLY_MINUTES} minutes before the scheduled time until the appointment ends.`;
  }
  return `You can join from ${JOIN_EARLY_MINUTES} minutes before until ${JOIN_LATE_MINUTES} minutes after the scheduled time.`;
}

export function telecareJoinOpensAt(
  scheduledStart: string | Date,
  now = new Date(),
): Date {
  return new Date(new Date(scheduledStart).getTime() - JOIN_EARLY_MINUTES * 60_000);
}

export function isBeforeTelecareJoinOpens(
  scheduledStart: string | Date,
  now = new Date(),
): boolean {
  return now.getTime() < telecareJoinOpensAt(scheduledStart, now).getTime();
}

export function computeScheduledEnd(
  scheduledStart: string | Date,
  durationMinutes = DEFAULT_APPOINTMENT_DURATION_MINUTES,
): Date {
  return new Date(new Date(scheduledStart).getTime() + durationMinutes * 60_000);
}

export function minutesUntilScheduledEnd(
  scheduledEnd: string | Date | null | undefined,
  now = new Date(),
): number | null {
  if (!scheduledEnd) return null;
  const ms = new Date(scheduledEnd).getTime() - now.getTime();
  return ms / 60_000;
}

export function isNearingScheduledEnd(
  scheduledEnd: string | Date | null | undefined,
  warningMinutes = SCHEDULED_END_WARNING_MINUTES,
  now = new Date(),
): boolean {
  const remaining = minutesUntilScheduledEnd(scheduledEnd, now);
  return remaining !== null && remaining > 0 && remaining <= warningMinutes;
}

export function isFinalScheduledEndWarning(
  scheduledEnd: string | Date | null | undefined,
  warningMinutes = SCHEDULED_END_FINAL_WARNING_MINUTES,
  now = new Date(),
): boolean {
  const remaining = minutesUntilScheduledEnd(scheduledEnd, now);
  return remaining !== null && remaining > 0 && remaining <= warningMinutes;
}

export type TelecareJoinEligibilityInput = {
  audience: TelecareAudience;
  sessionStatus?: string | null;
  appointmentStatus?: string | null;
  scheduledStart?: string | Date | null;
  scheduledEnd?: string | Date | null;
  durationMinutes?: number;
  modality?: string | null;
  telecareSessionId?: string | null;
};

export function evaluateTelecareJoinEligibility(
  input: TelecareJoinEligibilityInput,
  now = new Date(),
): { ok: boolean; reason?: string } {
  if (input.audience === "staff") {
    if (input.modality !== "telehealth" || !input.telecareSessionId) {
      return { ok: false, reason: "Not a telehealth visit" };
    }
    if (!["scheduled", "confirmed", "in_progress"].includes(input.appointmentStatus ?? "")) {
      return { ok: false, reason: "Appointment is not active" };
    }
  }

  if (["completed", "cancelled", "no_show", "failed"].includes(input.sessionStatus ?? "")) {
    return { ok: false, reason: "Visit ended" };
  }

  if (input.audience === "portal") {
    if (input.appointmentStatus === "scheduled") {
      return { ok: false, reason: "Confirm your appointment first" };
    }
    if (!["confirmed", "in_progress"].includes(input.appointmentStatus ?? "")) {
      return { ok: false, reason: "Visit is not active" };
    }
  }

  if (!input.scheduledStart) {
    return { ok: false, reason: "Visit time not set" };
  }

  if (
    !isWithinTelecareJoinWindow(
      input.scheduledStart,
      input.scheduledEnd,
      input.durationMinutes,
      now,
    )
  ) {
    if (isBeforeTelecareJoinOpens(input.scheduledStart, now)) {
      return {
        ok: false,
        reason: `Join opens ${JOIN_EARLY_MINUTES} minutes before your visit`,
      };
    }
    return { ok: false, reason: "Visit window has ended" };
  }

  return { ok: true };
}

export function isPastScheduledEnd(
  scheduledEnd: string | Date | null | undefined,
  now = new Date(),
  graceMinutes = 0,
): boolean {
  const remaining = minutesUntilScheduledEnd(scheduledEnd, now);
  if (remaining === null) return false;
  return remaining <= -graceMinutes;
}

export type TelehealthVideoProviderId = "livekit" | "teams";

export function resolveTelehealthProvider(id?: string | null): TelehealthVideoProviderId {
  return id === "teams" ? "teams" : "livekit";
}

/** LiveKit uses in-app room; Teams opens external meeting URL. */
export function usesInAppTelecareRoom(provider?: string | null): boolean {
  return resolveTelehealthProvider(provider) === "livekit";
}

export function telecareJoinButtonLabel(provider?: string | null): string {
  return resolveTelehealthProvider(provider) === "teams" ? "Join Teams visit" : "Join video visit";
}

export function telecarePlatformLabel(provider?: string | null): string {
  return resolveTelehealthProvider(provider) === "teams" ? "Microsoft Teams" : "Secure video visit";
}

export function hasPatientTelehealthConsent(
  session: Pick<SanitizedTelecareSession, "patientTelehealthConsentAt">,
): boolean {
  return !!session.patientTelehealthConsentAt;
}
