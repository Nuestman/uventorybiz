import { z } from "zod";

/** Align with occupational health / HIPAA common retention (7 years). */
export const MESSAGING_DEFAULT_RETENTION_YEARS = 7;

export const MESSAGING_MAX_BODY_LENGTH = 4000;
/** Raw HTML from TinyMCE may exceed plain-text limit. */
export const MESSAGING_MAX_RICH_HTML_LENGTH = 16_000;

export const messageBodyFormatSchema = z.enum(["plain", "rich"]);
export type MessageBodyFormat = z.infer<typeof messageBodyFormatSchema>;
export const MESSAGING_MAX_SUBJECT_LENGTH = 255;
export const MESSAGING_POLL_ACTIVE_MS = 5000;
export const MESSAGING_POLL_INBOX_MS = 30000;
export const MESSAGING_SSE_HEARTBEAT_MS = 30_000;
export const MESSAGING_SEND_RATE_LIMIT_PER_MINUTE = 30;

export const messagingStreamEventTypeSchema = z.enum([
  "message.new",
  "message.read",
  "conversation.updated",
  "inbox.changed",
]);

export type MessagingStreamEventType = z.infer<typeof messagingStreamEventTypeSchema>;

export type MessagingStreamEvent = {
  type: MessagingStreamEventType;
  conversationId?: string;
  messageId?: string;
  at: string;
};

/** Phase 3 attachments — PDF and common image formats only. */
export const MESSAGING_ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MESSAGING_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MESSAGING_SOFT_DELETE_WINDOW_MS = 5 * 60_000;

export const PORTAL_NOTIFICATION_TYPE_MESSAGE = "message_received";

export const messagingExportFormatSchema = z.enum(["csv"]);
export type MessagingExportFormat = z.infer<typeof messagingExportFormatSchema>;

export const conversationTypeSchema = z.enum([
  "patient_staff",
  "staff_internal",
  "encounter_thread",
  "appointment_thread",
]);

export const conversationStatusSchema = z.enum(["open", "closed", "archived"]);

export const messageSenderTypeSchema = z.enum(["staff", "portal", "system"]);

export type ConversationType = z.infer<typeof conversationTypeSchema>;
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

const messageBodyFieldsSchema = {
  bodyText: z.string().max(MESSAGING_MAX_BODY_LENGTH).optional(),
  bodyHtml: z.string().max(MESSAGING_MAX_RICH_HTML_LENGTH).optional(),
};

function refineMessageBody<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .refine((d) => !!(d.bodyText?.trim() || d.bodyHtml?.trim()), {
      message: "Message body is required",
      path: ["bodyText"],
    });
}

export const createConversationBodySchema = refineMessageBody({
  subject: z.string().max(MESSAGING_MAX_SUBJECT_LENGTH).optional().nullable(),
  /** @deprecated Legacy employee bridge; prefer portalUserId for B2B portal threads. */
  patientId: z.string().min(1).optional(),
  /** Customer/supplier portal account to message (staff → portal). */
  portalUserId: z.string().min(1).optional(),
  appointmentId: z.string().min(1).optional(),
  /** Phase 2 — staff-only thread; requires at least one other clinical staff user. */
  staffUserIds: z.array(z.string().min(1)).max(10).optional(),
  ...messageBodyFieldsSchema,
  clientMessageId: z.string().max(64).optional(),
  messagingConsentAccepted: z.boolean().optional(),
  /** Portal — route thread to a specific clinician (general queue when omitted). */
  assignedStaffUserId: z.string().min(1).optional().nullable(),
});

export type MessagingPortalRecipientDto = {
  id: string;
  email: string;
  partyType: string;
  displayName: string;
  status: string;
};

export const sendMessageBodySchema = refineMessageBody({
  ...messageBodyFieldsSchema,
  clientMessageId: z.string().max(64).optional(),
  messagingConsentAccepted: z.boolean().optional(),
  assignedStaffUserId: z.string().min(1).optional().nullable(),
});

export const patchConversationBodySchema = z.object({
  status: conversationStatusSchema.optional(),
  assignedStaffUserId: z.string().nullable().optional(),
  subject: z.string().max(MESSAGING_MAX_SUBJECT_LENGTH).optional(),
});

export const markReadBodySchema = z.object({
  messageId: z.string().min(1).optional(),
});

export const messagingExportAckBodySchema = z.object({
  format: z.enum(["print"]),
});

/** Shown before downloading or printing a thread export. */
export const MESSAGING_EXPORT_SECURITY_NOTICE =
  "This export may contain protected health information. Store it securely, share only with authorized recipients, and delete it when no longer needed.";

export type MessageParticipantDto = {
  type: "staff" | "portal";
  id: string;
  displayName: string;
};

export type MessagingClinicianDto = {
  id: string;
  displayName: string;
};

export type MessageAttachmentDto = {
  id: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  fileUrl: string;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  senderType: "staff" | "portal" | "system";
  senderDisplayName: string;
  bodyText: string;
  /** Sanitized HTML when the message was sent in rich format. */
  bodyHtml: string | null;
  createdAt: string;
  isOwn: boolean;
  isDeleted: boolean;
  /** When other participants have read up to this message (own messages only). */
  seenAt: string | null;
  canDelete: boolean;
  attachments: MessageAttachmentDto[];
};

export type PortalNotificationDto = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  deepLink: string | null;
};

export type ConversationSummaryDto = {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  subject: string | null;
  patientId: string | null;
  patientName: string | null;
  appointmentId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  assignedStaffUserId: string | null;
};

export function isMessagingAttachmentMimeType(mime: string): boolean {
  return (MESSAGING_ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mime);
}

export function computeRetentionUntil(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + MESSAGING_DEFAULT_RETENTION_YEARS);
  return d;
}

export function truncatePreview(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Client-side plain length estimate for rich HTML (server re-validates). */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
