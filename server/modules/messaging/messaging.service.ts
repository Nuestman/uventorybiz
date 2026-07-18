import type { IStorage } from "../../storage";
import type { Conversation, Message } from "@shared/schema";
import type {
  ConversationSummaryDto,
  ConversationStatus,
  MessageAttachmentDto,
  MessageDto,
  MessagingClinicianDto,
} from "@shared/messaging";
import {
  isMessagingAttachmentMimeType,
  MESSAGING_MAX_ATTACHMENT_BYTES,
  MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGING_SEND_RATE_LIMIT_PER_MINUTE,
  MESSAGING_SOFT_DELETE_WINDOW_MS,
} from "@shared/messaging";
import { notifyPortalUserInApp } from "../portal/portal-notifications.service";
import * as repo from "./messaging.repository";
import { notifyPortalUserOfNewMessage, notifyStaffOfNewMessage } from "./messaging-notifications.service";
import {
  buildThreadExportCsv,
  threadExportFilename,
  type ThreadExportRow,
} from "./messaging-export.service";
import { auditMessagingAction } from "./messaging-audit.service";
import {
  publishConversationUpdated,
  publishMessageNew,
  publishMessageRead,
  publishPortalInboxChanged,
  publishStaffInboxChanged,
  publishStaffTenantInboxChanged,
} from "./messaging-realtime.service";
import { normalizeMessageBody } from "./messaging-body";

type MessageBodyInput = {
  bodyText?: string;
  bodyHtml?: string | null;
};

function parseMessageBody(
  input: MessageBodyInput,
): { ok: true; data: { bodyText: string; bodyHtml: string | null } } | { ok: false; error: string } {
  return normalizeMessageBody(input);
}

const PATIENT_FACING_CONVERSATION_TYPES = new Set([
  "patient_staff",
  "appointment_thread",
  "encounter_thread",
]);

function isPatientFacingConversation(type: string): boolean {
  return PATIENT_FACING_CONVERSATION_TYPES.has(type);
}

async function staffCanAccessConversation(
  conversation: Conversation,
  staffUserId: string,
): Promise<boolean> {
  if (isPatientFacingConversation(conversation.type)) return true;
  if (conversation.type === "staff_internal") {
    return !!(await repo.findStaffParticipant(conversation.id, staffUserId));
  }
  return false;
}

async function publishRealtimeForConversation(
  tenantId: string,
  conversation: Conversation,
  messageId: string,
) {
  const staffIds = await repo.listStaffParticipantUserIds(conversation.id);
  const portalIds = await repo.listPortalParticipantUserIds(conversation.id);
  const portalUserId = portalIds[0] ?? null;

  if (isPatientFacingConversation(conversation.type)) {
    const clinicalStaff = await repo.listClinicalStaffUserIds(tenantId);
    publishStaffTenantInboxChanged(tenantId, clinicalStaff);
    publishMessageNew({
      tenantId,
      conversationId: conversation.id,
      messageId,
      staffUserIds: clinicalStaff,
      portalUserId,
    });
    return;
  }

  publishStaffInboxChanged(tenantId, staffIds);
  publishMessageNew({
    tenantId,
    conversationId: conversation.id,
    messageId,
    staffUserIds: staffIds,
    portalUserId,
  });
}

type MessagingResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

const sendTimestamps = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const existing = (sendTimestamps.get(key) ?? []).filter((t) => now - t < windowMs);
  if (existing.length >= MESSAGING_SEND_RATE_LIMIT_PER_MINUTE) return false;
  existing.push(now);
  sendTimestamps.set(key, existing);
  return true;
}

type MessageViewer =
  | { type: "staff"; userId: string }
  | { type: "portal"; portalUserId: string };

type ParticipantReadState = Awaited<ReturnType<typeof repo.listParticipantReadStates>>[number];

function isOwnMessage(message: Message, viewer: MessageViewer): boolean {
  return viewer.type === "staff"
    ? message.senderType === "staff" && message.senderStaffUserId === viewer.userId
    : message.senderType === "portal" && message.senderPortalUserId === viewer.portalUserId;
}

function canDeleteMessage(message: Message, viewer: MessageViewer): boolean {
  if (message.deletedAt || !isOwnMessage(message, viewer)) return false;
  return Date.now() - message.createdAt.getTime() <= MESSAGING_SOFT_DELETE_WINDOW_MS;
}

function computeSeenAt(
  message: Message,
  viewer: MessageViewer,
  conversationType: string,
  readStates: ParticipantReadState[],
): string | null {
  if (message.deletedAt || !isOwnMessage(message, viewer)) return null;
  const msgTime = message.createdAt.getTime();

  if (viewer.type === "staff") {
    if (isPatientFacingConversation(conversationType)) {
      const portal = readStates.find((p) => p.participantType === "portal");
      if (portal?.lastReadAt && portal.lastReadAt.getTime() >= msgTime) {
        return portal.lastReadAt.toISOString();
      }
      return null;
    }
    const otherStaff = readStates.filter(
      (p) => p.participantType === "staff" && p.staffUserId !== viewer.userId,
    );
    if (
      otherStaff.length > 0 &&
      otherStaff.every((p) => p.lastReadAt && p.lastReadAt.getTime() >= msgTime)
    ) {
      return new Date(
        Math.max(...otherStaff.map((p) => p.lastReadAt!.getTime())),
      ).toISOString();
    }
    return null;
  }

  const staffReaders = readStates.filter(
    (p) => p.participantType === "staff" && p.lastReadAt && p.lastReadAt.getTime() >= msgTime,
  );
  if (!staffReaders.length) return null;
  return new Date(
    Math.max(...staffReaders.map((p) => p.lastReadAt!.getTime())),
  ).toISOString();
}

async function notifyPortalPatientInApp(
  storage: IStorage,
  tenantId: string,
  patientId: string | null,
  conversationId: string,
): Promise<void> {
  if (!patientId) return;
  const portalUser = await repo.findPortalUserForPatient(tenantId, patientId);
  if (!portalUser) return;
  const tenant = await storage.getTenant(tenantId);
  await notifyPortalUserInApp({
    tenantId,
    portalUserId: portalUser.id,
    conversationId,
    tenantAppName: tenant?.appName?.trim() || tenant?.name || "Your clinic",
  });
}

async function resolveAssignedStaffUserId(
  tenantId: string,
  assignedStaffUserId?: string | null,
): Promise<string | null> {
  if (!assignedStaffUserId) return null;
  const valid = await repo.findClinicalStaffUsersByIds(tenantId, [assignedStaffUserId]);
  return valid[0] ?? null;
}

async function messageToDto(
  message: Message,
  viewer: MessageViewer,
  attachments: MessageAttachmentDto[] = [],
  opts?: { conversationType?: string; readStates?: ParticipantReadState[] },
): Promise<MessageDto> {
  let senderDisplayName = "System";
  if (message.senderType === "staff" && message.senderStaffUserId) {
    senderDisplayName = await repo.getStaffDisplayName(message.senderStaffUserId);
  } else if (message.senderType === "portal") {
    senderDisplayName = "You";
    if (viewer.type === "staff") senderDisplayName = "Portal user";
  }

  const isOwn = isOwnMessage(message, viewer);
  const isDeleted = !!message.deletedAt;
  const conversationType = opts?.conversationType ?? "patient_staff";
  const readStates = opts?.readStates ?? [];

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderType: message.senderType,
    senderDisplayName: viewer.type === "portal" && message.senderType === "portal" ? "You" : senderDisplayName,
    bodyText: isDeleted ? "[Message deleted]" : message.bodyText,
    bodyHtml: isDeleted ? null : message.bodyHtml ?? null,
    createdAt: message.createdAt.toISOString(),
    isOwn,
    isDeleted,
    seenAt: computeSeenAt(message, viewer, conversationType, readStates),
    canDelete: canDeleteMessage(message, viewer),
    attachments: isDeleted ? [] : attachments,
  };
}

function mapAttachments(
  rows: Awaited<ReturnType<typeof repo.listAttachmentsByMessageIds>>,
): Map<string, MessageAttachmentDto[]> {
  const map = new Map<string, MessageAttachmentDto[]>();
  for (const row of rows) {
    const dto: MessageAttachmentDto = {
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      fileUrl: row.fileUrl,
    };
    const list = map.get(row.messageId) ?? [];
    list.push(dto);
    map.set(row.messageId, list);
  }
  return map;
}

async function conversationToSummary(
  conversation: Conversation,
  unreadCount: number,
  patientName: string | null,
): Promise<ConversationSummaryDto> {
  return {
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    subject: conversation.subject,
    patientId: conversation.patientId,
    patientName,
    appointmentId: conversation.appointmentId,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount,
    assignedStaffUserId: conversation.assignedStaffUserId,
  };
}

export function createMessagingService(storage: IStorage) {
  return {
    async listStaffInbox(
      tenantId: string,
      staffUserId: string,
      filters: {
        status?: ConversationStatus;
        patientId?: string;
        assignedToMe?: boolean;
        inboxKind?: "patient" | "staff_internal";
      },
    ): Promise<MessagingResult<ConversationSummaryDto[]>> {
      try {
        const rows = await repo.listStaffConversations(tenantId, {
          status: filters.status,
          patientId: filters.patientId,
          assignedToMe: filters.assignedToMe ? staffUserId : undefined,
          inboxKind: filters.inboxKind ?? "patient",
          staffUserId,
        });

        const summaries = await Promise.all(
          rows.map(async (c) => {
            const patientName =
              c.type === "staff_internal"
                ? c.subject?.trim() || "Staff thread"
                : c.patientId
                  ? await repo.getPatientDisplayName(tenantId, c.patientId)
                  : null;
            const unread = await repo.countUnreadInConversationForStaff(
              c.id,
              staffUserId,
              c.type,
            );
            return conversationToSummary(c, unread, patientName);
          }),
        );
        return { ok: true, data: summaries };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load inbox",
        };
      }
    },

    async listPortalInbox(
      tenantId: string,
      patientId: string,
      portalUserId: string,
    ): Promise<MessagingResult<ConversationSummaryDto[]>> {
      try {
        const rows = await repo.listPortalConversations(tenantId, patientId);
        const summaries = await Promise.all(
          rows.map(async (c) => {
            const unread = await repo.countUnreadInConversationForPortal(c.id, portalUserId);
            return conversationToSummary(c, unread, null);
          }),
        );
        return { ok: true, data: summaries };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load inbox",
        };
      }
    },

    async getStaffConversation(
      tenantId: string,
      conversationId: string,
      staffUserId: string,
    ): Promise<MessagingResult<ConversationSummaryDto>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const patientName =
        conversation.type === "staff_internal"
          ? conversation.subject?.trim() || "Staff thread"
          : conversation.patientId
            ? await repo.getPatientDisplayName(tenantId, conversation.patientId)
            : null;
      const unread = await repo.countUnreadInConversationForStaff(
        conversationId,
        staffUserId,
        conversation.type,
      );
      return {
        ok: true,
        data: await conversationToSummary(conversation, unread, patientName),
      };
    },

    async getPortalConversation(
      tenantId: string,
      conversationId: string,
      patientId: string,
      portalUserId: string,
    ): Promise<MessagingResult<ConversationSummaryDto>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (
        !conversation ||
        conversation.patientId !== patientId ||
        !isPatientFacingConversation(conversation.type)
      ) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const participant = await repo.findPortalParticipant(conversationId, portalUserId);
      if (!participant) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const unread = await repo.countUnreadInConversationForPortal(conversationId, portalUserId);
      return { ok: true, data: await conversationToSummary(conversation, unread, null) };
    },

    async listMessages(
      tenantId: string,
      conversationId: string,
      viewer: { type: "staff"; userId: string } | { type: "portal"; portalUserId: string; patientId: string },
      since?: string,
    ): Promise<MessagingResult<MessageDto[]>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };

      if (viewer.type === "portal") {
        if (conversation.patientId !== viewer.patientId) {
          return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
        }
        const participant = await repo.findPortalParticipant(conversationId, viewer.portalUserId);
        if (!participant) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      } else if (conversation.type === "staff_internal") {
        const participant = await repo.findStaffParticipant(conversationId, viewer.userId);
        if (!participant) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      const sinceDate = since ? new Date(since) : undefined;
      const rows = await repo.listMessages(tenantId, conversationId, { since: sinceDate });
      const readStates = await repo.listParticipantReadStates(conversationId);
      const attachmentRows = await repo.listAttachmentsByMessageIds(rows.map((m) => m.id));
      const attachmentsByMessage = mapAttachments(attachmentRows);
      const dtos = await Promise.all(
        rows.map((m) =>
          messageToDto(m, viewer, attachmentsByMessage.get(m.id) ?? [], {
            conversationType: conversation.type,
            readStates,
          }),
        ),
      );
      return { ok: true, data: dtos };
    },

    async createStaffConversation(
      tenantId: string,
      staffUserId: string,
      params: {
        patientId: string;
        subject?: string | null;
        bodyText?: string;
        bodyHtml?: string | null;
        clientMessageId?: string;
        appointmentId?: string;
      },
    ): Promise<MessagingResult<{ conversation: ConversationSummaryDto; message: MessageDto }>> {
      const rateKey = `staff:${staffUserId}`;
      if (!checkRateLimit(rateKey)) {
        return { ok: false, error: "Too many messages. Please wait a moment.", code: "RATE_LIMIT" };
      }

      const body = parseMessageBody(params);
      if (!body.ok) return { ok: false, error: body.error, code: "VALIDATION" };

      try {
        const patient = await storage.getPatient(params.patientId, tenantId);
        if (!patient) return { ok: false, error: "Patient not found", code: "NOT_FOUND" };

        const portalUser = await repo.findPortalUserForPatient(tenantId, params.patientId);
        const { conversation, message } = await repo.createStaffPatientConversation({
          tenantId,
          patientId: params.patientId,
          staffUserId,
          subject: params.subject,
          bodyText: body.data.bodyText,
          bodyHtml: body.data.bodyHtml,
          clientMessageId: params.clientMessageId,
          portalUserId: portalUser?.id ?? null,
          appointmentId: params.appointmentId ?? null,
        });

        await auditMessagingAction({
          tenantId,
          actorType: "staff",
          actorStaffUserId: staffUserId,
          action: "conversation.created",
          conversationId: conversation.id,
          messageId: message.id,
          metadata: { patientId: params.patientId, type: conversation.type },
        });

        const tenant = await storage.getTenant(tenantId);
        if (portalUser?.email) {
          await notifyPortalUserOfNewMessage({
            tenantId,
            portalUserId: portalUser.id,
            portalEmail: portalUser.email,
            tenantAppName: tenant?.appName?.trim() || tenant?.name || "Your clinic",
            conversationId: conversation.id,
          });
        }
        if (portalUser) {
          await notifyPortalPatientInApp(storage, tenantId, params.patientId, conversation.id);
        }

        const patientName = await repo.getPatientDisplayName(tenantId, params.patientId);
        const summary = await conversationToSummary(conversation, 0, patientName);
        const messageDto = await messageToDto(message, { type: "staff", userId: staffUserId });
        await publishRealtimeForConversation(tenantId, conversation, message.id);
        return { ok: true, data: { conversation: summary, message: messageDto } };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create conversation",
        };
      }
    },

    async createStaffInternalConversation(
      tenantId: string,
      staffUserId: string,
      params: {
        staffUserIds: string[];
        subject?: string | null;
        bodyText?: string;
        bodyHtml?: string | null;
        clientMessageId?: string;
      },
    ): Promise<MessagingResult<{ conversation: ConversationSummaryDto; message: MessageDto }>> {
      const rateKey = `staff:${staffUserId}`;
      if (!checkRateLimit(rateKey)) {
        return { ok: false, error: "Too many messages. Please wait a moment.", code: "RATE_LIMIT" };
      }

      const body = parseMessageBody(params);
      if (!body.ok) return { ok: false, error: body.error, code: "VALIDATION" };

      const uniqueIds = [...new Set(params.staffUserIds.filter((id) => id !== staffUserId))];
      if (!uniqueIds.length) {
        return { ok: false, error: "Select at least one other staff member", code: "VALIDATION" };
      }

      const validIds = await repo.findClinicalStaffUsersByIds(tenantId, uniqueIds);
      if (validIds.length !== uniqueIds.length) {
        return { ok: false, error: "One or more staff members are invalid", code: "NOT_FOUND" };
      }

      try {
        const { conversation, message } = await repo.createStaffInternalConversation({
          tenantId,
          creatorStaffUserId: staffUserId,
          staffUserIds: validIds,
          subject: params.subject,
          bodyText: body.data.bodyText,
          bodyHtml: body.data.bodyHtml,
          clientMessageId: params.clientMessageId,
        });

        await auditMessagingAction({
          tenantId,
          actorType: "staff",
          actorStaffUserId: staffUserId,
          action: "conversation.created",
          conversationId: conversation.id,
          messageId: message.id,
          metadata: { type: "staff_internal", staffUserIds: validIds },
        });

        const label = conversation.subject?.trim() || "Staff thread";
        const summary = await conversationToSummary(conversation, 0, label);
        const messageDto = await messageToDto(message, { type: "staff", userId: staffUserId });
        await publishRealtimeForConversation(tenantId, conversation, message.id);
        return { ok: true, data: { conversation: summary, message: messageDto } };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create conversation",
        };
      }
    },

    async createPortalConversation(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      params: {
        subject?: string | null;
        bodyText?: string;
        bodyHtml?: string | null;
        clientMessageId?: string;
        messagingConsentAccepted?: boolean;
        appointmentId?: string;
        assignedStaffUserId?: string | null;
      },
    ): Promise<MessagingResult<{ conversation: ConversationSummaryDto; message: MessageDto }>> {
      if (!params.messagingConsentAccepted) {
        return {
          ok: false,
          error: "You must accept secure messaging terms before sending",
          code: "CONSENT_REQUIRED",
        };
      }

      const rateKey = `portal:${portalUserId}`;
      if (!checkRateLimit(rateKey)) {
        return { ok: false, error: "Too many messages. Please wait a moment.", code: "RATE_LIMIT" };
      }

      const body = parseMessageBody(params);
      if (!body.ok) return { ok: false, error: body.error, code: "VALIDATION" };

      const assignedStaffUserId = await resolveAssignedStaffUserId(
        tenantId,
        params.assignedStaffUserId,
      );
      if (params.assignedStaffUserId && !assignedStaffUserId) {
        return { ok: false, error: "Selected clinician is not available", code: "NOT_FOUND" };
      }

      try {
        const { conversation, message } = await repo.createPatientStaffConversation({
          tenantId,
          patientId,
          portalUserId,
          subject: params.subject,
          bodyText: body.data.bodyText,
          bodyHtml: body.data.bodyHtml,
          clientMessageId: params.clientMessageId,
          appointmentId: params.appointmentId ?? null,
          assignedStaffUserId,
        });

        await auditMessagingAction({
          tenantId,
          actorType: "portal",
          actorPortalUserId: portalUserId,
          action: "conversation.created",
          conversationId: conversation.id,
          messageId: message.id,
          metadata: { messagingConsentAccepted: true },
        });

        const patientName = await repo.getPatientDisplayName(tenantId, patientId);
        await notifyStaffOfNewMessage(storage, {
          tenantId,
          conversationId: conversation.id,
          patientName,
          recipientStaffUserIds: assignedStaffUserId ? [assignedStaffUserId] : undefined,
        });

        const summary = await conversationToSummary(conversation, 0, patientName);
        const messageDto = await messageToDto(message, {
          type: "portal",
          portalUserId,
        });
        await publishRealtimeForConversation(tenantId, conversation, message.id);
        return { ok: true, data: { conversation: summary, message: messageDto } };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create conversation",
        };
      }
    },

    async sendStaffMessage(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
      params: MessageBodyInput & { clientMessageId?: string },
    ): Promise<MessagingResult<MessageDto>> {
      const rateKey = `staff:${staffUserId}`;
      if (!checkRateLimit(rateKey)) {
        return { ok: false, error: "Too many messages. Please wait a moment.", code: "RATE_LIMIT" };
      }

      const body = parseMessageBody(params);
      if (!body.ok) return { ok: false, error: body.error, code: "VALIDATION" };

      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      if (conversation.status === "archived") {
        return { ok: false, error: "Conversation is archived", code: "CLOSED" };
      }

      if (params.clientMessageId) {
        const existing = await repo.findMessageByClientId(conversationId, params.clientMessageId);
        if (existing) {
          return {
            ok: true,
            data: await messageToDto(existing, { type: "staff", userId: staffUserId }),
          };
        }
      }

      await repo.ensureStaffParticipant(tenantId, conversationId, staffUserId);

      if (!conversation.assignedStaffUserId) {
        await repo.updateConversation(tenantId, conversationId, {
          assignedStaffUserId: staffUserId,
        });
      }

      const message = await repo.insertMessage({
        tenantId,
        conversationId,
        senderType: "staff",
        staffUserId,
        bodyText: body.data.bodyText,
        bodyHtml: body.data.bodyHtml,
        clientMessageId: params.clientMessageId,
      });

      await auditMessagingAction({
        tenantId,
        actorType: "staff",
        actorStaffUserId: staffUserId,
        action: "message.sent",
        conversationId,
        messageId: message.id,
      });

      if (conversation.patientId) {
        const portalUser = await repo.findPortalUserForPatient(tenantId, conversation.patientId);
        const tenant = await storage.getTenant(tenantId);
        if (portalUser?.email) {
          await notifyPortalUserOfNewMessage({
            tenantId,
            portalUserId: portalUser.id,
            portalEmail: portalUser.email,
            tenantAppName: tenant?.appName?.trim() || tenant?.name || "Your clinic",
            conversationId,
          });
        }
        if (portalUser) {
          await notifyPortalPatientInApp(storage, tenantId, conversation.patientId, conversationId);
        }
      } else if (conversation.type === "staff_internal") {
        const staffIds = await repo.listStaffParticipantUserIds(conversationId);
        const others = staffIds.filter((id) => id !== staffUserId);
        publishStaffInboxChanged(tenantId, others);
      }

      await publishRealtimeForConversation(tenantId, conversation, message.id);

      return {
        ok: true,
        data: await messageToDto(message, { type: "staff", userId: staffUserId }),
      };
    },

    async sendPortalMessage(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      conversationId: string,
      params: MessageBodyInput & {
        clientMessageId?: string;
        messagingConsentAccepted?: boolean;
        assignedStaffUserId?: string | null;
      },
    ): Promise<MessagingResult<MessageDto>> {
      const rateKey = `portal:${portalUserId}`;
      if (!checkRateLimit(rateKey)) {
        return { ok: false, error: "Too many messages. Please wait a moment.", code: "RATE_LIMIT" };
      }

      const body = parseMessageBody(params);
      if (!body.ok) return { ok: false, error: body.error, code: "VALIDATION" };

      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || conversation.patientId !== patientId) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      if (conversation.status === "archived") {
        return { ok: false, error: "This conversation is closed", code: "CLOSED" };
      }

      const participant = await repo.findPortalParticipant(conversationId, portalUserId);
      if (!participant) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };

      if (conversation.status === "closed") {
        await repo.updateConversation(tenantId, conversationId, { status: "open" });
      }

      let assignedStaffUserId = conversation.assignedStaffUserId;
      if (!assignedStaffUserId && params.assignedStaffUserId) {
        const resolved = await resolveAssignedStaffUserId(tenantId, params.assignedStaffUserId);
        if (!resolved) {
          return { ok: false, error: "Selected clinician is not available", code: "NOT_FOUND" };
        }
        assignedStaffUserId = resolved;
        await repo.updateConversation(tenantId, conversationId, { assignedStaffUserId: resolved });
        await repo.ensureStaffParticipant(tenantId, conversationId, resolved);
      }

      if (params.clientMessageId) {
        const existing = await repo.findMessageByClientId(conversationId, params.clientMessageId);
        if (existing) {
          return {
            ok: true,
            data: await messageToDto(existing, { type: "portal", portalUserId }),
          };
        }
      }

      const message = await repo.insertMessage({
        tenantId,
        conversationId,
        senderType: "portal",
        portalUserId,
        bodyText: body.data.bodyText,
        bodyHtml: body.data.bodyHtml,
        clientMessageId: params.clientMessageId,
      });

      await auditMessagingAction({
        tenantId,
        actorType: "portal",
        actorPortalUserId: portalUserId,
        action: "message.sent",
        conversationId,
        messageId: message.id,
      });

      const patientName = await repo.getPatientDisplayName(tenantId, patientId);
      await notifyStaffOfNewMessage(storage, {
        tenantId,
        conversationId,
        patientName,
        recipientStaffUserIds: assignedStaffUserId ? [assignedStaffUserId] : undefined,
      });

      await publishRealtimeForConversation(tenantId, conversation, message.id);

      return {
        ok: true,
        data: await messageToDto(message, { type: "portal", portalUserId }),
      };
    },

    async patchConversation(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
      patch: {
        status?: ConversationStatus;
        assignedStaffUserId?: string | null;
        subject?: string;
      },
    ): Promise<MessagingResult<ConversationSummaryDto>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      const updated = await repo.updateConversation(tenantId, conversationId, patch);
      if (!updated) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };

      await auditMessagingAction({
        tenantId,
        actorType: "staff",
        actorStaffUserId: staffUserId,
        action: "conversation.updated",
        conversationId,
        metadata: patch,
      });

      const patientName = updated.patientId
        ? await repo.getPatientDisplayName(tenantId, updated.patientId)
        : updated.type === "staff_internal"
          ? updated.subject?.trim() || "Staff thread"
          : null;
      const unread = await repo.countUnreadInConversationForStaff(
        conversationId,
        staffUserId,
        updated.type,
      );

      const staffIds = await repo.listStaffParticipantUserIds(conversationId);
      const portalIds = await repo.listPortalParticipantUserIds(conversationId);
      publishConversationUpdated({
        tenantId,
        conversationId,
        staffUserIds: isPatientFacingConversation(updated.type)
          ? await repo.listClinicalStaffUserIds(tenantId)
          : staffIds,
        portalUserId: portalIds[0] ?? null,
      });

      return { ok: true, data: await conversationToSummary(updated, unread, patientName) };
    },

    async markStaffRead(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
      messageId?: string,
    ): Promise<MessagingResult<{ ok: true }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      await repo.ensureStaffParticipant(tenantId, conversationId, staffUserId);
      await repo.markParticipantRead(conversationId, { staffUserId });

      await auditMessagingAction({
        tenantId,
        actorType: "staff",
        actorStaffUserId: staffUserId,
        action: "conversation.read",
        conversationId,
        messageId: messageId ?? null,
      });

      const staffIds = await repo.listStaffParticipantUserIds(conversationId);
      const portalIds = await repo.listPortalParticipantUserIds(conversationId);
      publishStaffInboxChanged(tenantId, [staffUserId]);

      publishMessageRead({
        tenantId,
        conversationId,
        staffUserIds: staffIds,
        portalUserId: portalIds[0] ?? null,
      });

      return { ok: true, data: { ok: true } };
    },

    async markPortalRead(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      conversationId: string,
      messageId?: string,
    ): Promise<MessagingResult<{ ok: true }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || conversation.patientId !== patientId) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      await repo.markParticipantRead(conversationId, { portalUserId });

      await auditMessagingAction({
        tenantId,
        actorType: "portal",
        actorPortalUserId: portalUserId,
        action: "conversation.read",
        conversationId,
        messageId: messageId ?? null,
      });
      publishPortalInboxChanged(tenantId, portalUserId);

      const staffIds = await repo.listStaffParticipantUserIds(conversationId);
      publishMessageRead({
        tenantId,
        conversationId,
        staffUserIds: staffIds,
        portalUserId,
      });

      return { ok: true, data: { ok: true } };
    },

    async deleteStaffMessage(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
      messageId: string,
    ): Promise<MessagingResult<MessageDto>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      const message = await repo.findMessageById(tenantId, messageId);
      if (!message || message.conversationId !== conversationId) {
        return { ok: false, error: "Message not found", code: "NOT_FOUND" };
      }
      if (!canDeleteMessage(message, { type: "staff", userId: staffUserId })) {
        return {
          ok: false,
          error: "Message can no longer be deleted",
          code: "FORBIDDEN",
        };
      }

      const deleted = await repo.softDeleteMessage(tenantId, conversationId, messageId);
      if (!deleted) {
        return { ok: false, error: "Message not found", code: "NOT_FOUND" };
      }

      await auditMessagingAction({
        tenantId,
        actorType: "staff",
        actorStaffUserId: staffUserId,
        action: "message.deleted",
        conversationId,
        messageId,
      });

      await publishRealtimeForConversation(tenantId, conversation, messageId);

      const readStates = await repo.listParticipantReadStates(conversationId);
      return {
        ok: true,
        data: await messageToDto(deleted, { type: "staff", userId: staffUserId }, [], {
          conversationType: conversation.type,
          readStates,
        }),
      };
    },

    async deletePortalMessage(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      conversationId: string,
      messageId: string,
    ): Promise<MessagingResult<MessageDto>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || conversation.patientId !== patientId) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const participant = await repo.findPortalParticipant(conversationId, portalUserId);
      if (!participant) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      const message = await repo.findMessageById(tenantId, messageId);
      if (!message || message.conversationId !== conversationId) {
        return { ok: false, error: "Message not found", code: "NOT_FOUND" };
      }
      if (!canDeleteMessage(message, { type: "portal", portalUserId })) {
        return {
          ok: false,
          error: "Message can no longer be deleted",
          code: "FORBIDDEN",
        };
      }

      const deleted = await repo.softDeleteMessage(tenantId, conversationId, messageId);
      if (!deleted) {
        return { ok: false, error: "Message not found", code: "NOT_FOUND" };
      }

      await auditMessagingAction({
        tenantId,
        actorType: "portal",
        actorPortalUserId: portalUserId,
        action: "message.deleted",
        conversationId,
        messageId,
      });

      await publishRealtimeForConversation(tenantId, conversation, messageId);

      const readStates = await repo.listParticipantReadStates(conversationId);
      return {
        ok: true,
        data: await messageToDto(deleted, { type: "portal", portalUserId }, [], {
          conversationType: conversation.type,
          readStates,
        }),
      };
    },

    async lookupStaffConversation(
      tenantId: string,
      staffUserId: string,
      filters: { appointmentId?: string },
    ): Promise<MessagingResult<ConversationSummaryDto | null>> {
      try {
        let conversation: Conversation | undefined;
        if (filters.appointmentId) {
          conversation = await repo.findConversationByAppointmentId(tenantId, filters.appointmentId);
        }
        if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
          return { ok: true, data: null };
        }
        const patientName =
          conversation.type === "staff_internal"
            ? conversation.subject?.trim() || "Staff thread"
            : conversation.patientId
              ? await repo.getPatientDisplayName(tenantId, conversation.patientId)
              : null;
        const unread = await repo.countUnreadInConversationForStaff(
          conversation.id,
          staffUserId,
          conversation.type,
        );
        return {
          ok: true,
          data: await conversationToSummary(conversation, unread, patientName),
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Lookup failed",
        };
      }
    },

    async lookupPortalConversation(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      filters: { appointmentId?: string },
    ): Promise<MessagingResult<ConversationSummaryDto | null>> {
      try {
        let conversation: Conversation | undefined;
        if (filters.appointmentId) {
          conversation = await repo.findConversationByAppointmentId(tenantId, filters.appointmentId);
        }
        if (!conversation || conversation.patientId !== patientId) {
          return { ok: true, data: null };
        }
        const participant = await repo.findPortalParticipant(conversation.id, portalUserId);
        if (!participant) return { ok: true, data: null };

        const unread = await repo.countUnreadInConversationForPortal(conversation.id, portalUserId);
        return {
          ok: true,
          data: await conversationToSummary(conversation, unread, null),
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Lookup failed",
        };
      }
    },

    async attachMessageFile(
      tenantId: string,
      conversationId: string,
      messageId: string,
      viewer:
        | { type: "staff"; userId: string }
        | { type: "portal"; portalUserId: string; patientId: string },
      file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    ): Promise<MessagingResult<MessageAttachmentDto>> {
      if (!isMessagingAttachmentMimeType(file.mimetype)) {
        return { ok: false, error: "Invalid file type. PDF and images only.", code: "VALIDATION" };
      }
      if (file.size > MESSAGING_MAX_ATTACHMENT_BYTES) {
        return { ok: false, error: "File exceeds 10 MB limit.", code: "VALIDATION" };
      }

      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      if (viewer.type === "staff") {
        if (!(await staffCanAccessConversation(conversation, viewer.userId))) {
          return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
        }
      } else {
        if (conversation.patientId !== viewer.patientId) {
          return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
        }
        const participant = await repo.findPortalParticipant(conversationId, viewer.portalUserId);
        if (!participant) return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      const message = await repo.findMessageById(tenantId, messageId);
      if (!message || message.conversationId !== conversationId) {
        return { ok: false, error: "Message not found", code: "NOT_FOUND" };
      }

      const isSender =
        viewer.type === "staff"
          ? message.senderType === "staff" && message.senderStaffUserId === viewer.userId
          : message.senderType === "portal" && message.senderPortalUserId === viewer.portalUserId;
      if (!isSender) {
        return { ok: false, error: "You can only attach files to your own messages", code: "FORBIDDEN" };
      }

      const existingCount = await repo.countAttachmentsForMessage(messageId);
      if (existingCount >= MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE) {
        return {
          ok: false,
          error: `Maximum ${MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`,
          code: "VALIDATION",
        };
      }

      const ageMs = Date.now() - message.createdAt.getTime();
      if (ageMs > 5 * 60_000) {
        return { ok: false, error: "Attachment window expired for this message", code: "VALIDATION" };
      }

      try {
        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId,
          category: "message-attachments",
          itemName: file.originalname,
          mimetype: file.mimetype,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);

        const row = await repo.insertMessageAttachment({
          tenantId,
          messageId,
          fileUrl: url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedByType: viewer.type,
          staffUserId: viewer.type === "staff" ? viewer.userId : undefined,
          portalUserId: viewer.type === "portal" ? viewer.portalUserId : undefined,
        });

        if (viewer.type === "staff") {
          await auditMessagingAction({
            tenantId,
            actorType: "staff",
            actorStaffUserId: viewer.userId,
            action: "attachment.added",
            conversationId,
            messageId,
            metadata: { originalName: file.originalname, mimeType: file.mimetype },
          });
        } else {
          await auditMessagingAction({
            tenantId,
            actorType: "portal",
            actorPortalUserId: viewer.portalUserId,
            action: "attachment.added",
            conversationId,
            messageId,
            metadata: { originalName: file.originalname, mimeType: file.mimetype },
          });
        }

        await publishRealtimeForConversation(tenantId, conversation, messageId);

        return {
          ok: true,
          data: {
            id: row.id,
            originalName: row.originalName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            fileUrl: row.fileUrl,
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Upload failed",
        };
      }
    },

    async exportStaffThreadCsv(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
    ): Promise<MessagingResult<{ csvContent: string; filename: string }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      try {
        const patientName =
          conversation.type === "staff_internal"
            ? conversation.subject?.trim() || "Staff thread"
            : conversation.patientId
              ? await repo.getPatientDisplayName(tenantId, conversation.patientId)
              : null;

        const messages = await repo.listMessages(tenantId, conversationId, { limit: 5000 });
        const attachmentRows = await repo.listAttachmentsByMessageIds(messages.map((m) => m.id));
        const attachmentsByMessage = mapAttachments(attachmentRows);
        const exporterName = await repo.getStaffDisplayName(staffUserId);

        const rows: ThreadExportRow[] = await Promise.all(
          messages.map(async (message) => {
            let senderDisplayName = "System";
            if (message.senderType === "staff" && message.senderStaffUserId) {
              senderDisplayName = await repo.getStaffDisplayName(message.senderStaffUserId);
            } else if (message.senderType === "portal") {
              senderDisplayName = "Portal user";
            }
            return {
              message,
              senderDisplayName,
              attachments: attachmentsByMessage.get(message.id) ?? [],
            };
          }),
        );

        const exportedAt = new Date();
        const csvContent = buildThreadExportCsv({
          conversation,
          patientName,
          rows,
          exportedAt,
          exportedByLabel: exporterName,
        });

        await auditMessagingAction({
          tenantId,
          actorType: "staff",
          actorStaffUserId: staffUserId,
          action: "conversation.exported",
          conversationId,
          metadata: { format: "csv", messageCount: messages.length },
        });

        return {
          ok: true,
          data: { csvContent, filename: threadExportFilename(conversationId, exportedAt) },
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Export failed",
        };
      }
    },

    async exportPortalThreadCsv(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      conversationId: string,
    ): Promise<MessagingResult<{ csvContent: string; filename: string }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (
        !conversation ||
        conversation.patientId !== patientId ||
        !isPatientFacingConversation(conversation.type)
      ) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const participant = await repo.findPortalParticipant(conversationId, portalUserId);
      if (!participant) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }

      try {
        const messages = await repo.listMessages(tenantId, conversationId, { limit: 5000 });
        const attachmentRows = await repo.listAttachmentsByMessageIds(messages.map((m) => m.id));
        const attachmentsByMessage = mapAttachments(attachmentRows);

        const rows: ThreadExportRow[] = await Promise.all(
          messages.map(async (message) => {
            let senderDisplayName = "System";
            if (message.senderType === "staff" && message.senderStaffUserId) {
              senderDisplayName = await repo.getStaffDisplayName(message.senderStaffUserId);
            } else if (message.senderType === "portal") {
              senderDisplayName = "You";
            }
            return {
              message,
              senderDisplayName,
              attachments: attachmentsByMessage.get(message.id) ?? [],
            };
          }),
        );

        const exportedAt = new Date();
        const csvContent = buildThreadExportCsv({
          conversation,
          patientName: null,
          rows,
          exportedAt,
          exportedByLabel: "Portal user",
        });

        await auditMessagingAction({
          tenantId,
          actorType: "portal",
          actorPortalUserId: portalUserId,
          action: "conversation.exported",
          conversationId,
          metadata: { format: "csv", messageCount: messages.length },
        });

        return {
          ok: true,
          data: { csvContent, filename: threadExportFilename(conversationId, exportedAt) },
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Export failed",
        };
      }
    },

    async ackStaffThreadPrintExport(
      tenantId: string,
      staffUserId: string,
      conversationId: string,
    ): Promise<MessagingResult<{ ok: true }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (!conversation || !(await staffCanAccessConversation(conversation, staffUserId))) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      await auditMessagingAction({
        tenantId,
        actorType: "staff",
        actorStaffUserId: staffUserId,
        action: "conversation.exported",
        conversationId,
        metadata: { format: "print" },
      });
      return { ok: true, data: { ok: true } };
    },

    async ackPortalThreadPrintExport(
      tenantId: string,
      patientId: string,
      portalUserId: string,
      conversationId: string,
    ): Promise<MessagingResult<{ ok: true }>> {
      const conversation = await repo.findConversationById(tenantId, conversationId);
      if (
        !conversation ||
        conversation.patientId !== patientId ||
        !isPatientFacingConversation(conversation.type)
      ) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      const participant = await repo.findPortalParticipant(conversationId, portalUserId);
      if (!participant) {
        return { ok: false, error: "Conversation not found", code: "NOT_FOUND" };
      }
      await auditMessagingAction({
        tenantId,
        actorType: "portal",
        actorPortalUserId: portalUserId,
        action: "conversation.exported",
        conversationId,
        metadata: { format: "print" },
      });
      return { ok: true, data: { ok: true } };
    },

    async listPortalClinicians(tenantId: string): Promise<MessagingClinicianDto[]> {
      return repo.listClinicalStaffForPortal(tenantId);
    },

    async staffUnreadCount(tenantId: string, staffUserId: string): Promise<number> {
      return repo.countUnreadForStaff(tenantId, staffUserId);
    },

    async portalUnreadCount(
      tenantId: string,
      patientId: string,
      portalUserId: string,
    ): Promise<number> {
      return repo.countUnreadForPortal(tenantId, portalUserId, patientId);
    },
  };
}

export type MessagingService = ReturnType<typeof createMessagingService>;
