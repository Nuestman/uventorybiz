import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import {
  conversationParticipants,
  conversations,
  employees,
  messages,
  messageAttachments,
  messagingAuditLog,
  patients,
  portalUsers,
  users,
} from "@shared/schema";
import type { Conversation, Message, MessageAttachment } from "@shared/schema";
import { computeRetentionUntil, truncatePreview } from "@shared/messaging";

export async function insertAuditEntry(params: {
  tenantId: string;
  actorType: "staff" | "portal" | "system";
  actorStaffUserId?: string | null;
  actorPortalUserId?: string | null;
  action: string;
  conversationId?: string | null;
  messageId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(messagingAuditLog).values({
    tenantId: params.tenantId,
    actorType: params.actorType,
    actorStaffUserId: params.actorStaffUserId ?? null,
    actorPortalUserId: params.actorPortalUserId ?? null,
    action: params.action,
    conversationId: params.conversationId ?? null,
    messageId: params.messageId ?? null,
    metadataJson: params.metadata ?? {},
  });
}

export async function findConversationById(tenantId: string, conversationId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, conversationId)))
    .limit(1);
  return row;
}

export async function findConversationByAppointmentId(tenantId: string, appointmentId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.appointmentId, appointmentId),
        eq(conversations.type, "appointment_thread"),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);
  return row;
}

export async function findMessageById(tenantId: string, messageId: string) {
  const [row] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.tenantId, tenantId), eq(messages.id, messageId)))
    .limit(1);
  return row;
}

export async function countAttachmentsForMessage(messageId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messageAttachments)
    .where(eq(messageAttachments.messageId, messageId));
  return row?.count ?? 0;
}

export async function insertMessageAttachment(params: {
  tenantId: string;
  messageId: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByType: "staff" | "portal";
  staffUserId?: string;
  portalUserId?: string;
}): Promise<MessageAttachment> {
  const [row] = await db
    .insert(messageAttachments)
    .values({
      tenantId: params.tenantId,
      messageId: params.messageId,
      fileUrl: params.fileUrl,
      originalName: params.originalName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      uploadedByType: params.uploadedByType,
      uploadedByStaffUserId: params.uploadedByType === "staff" ? params.staffUserId ?? null : null,
      uploadedByPortalUserId: params.uploadedByType === "portal" ? params.portalUserId ?? null : null,
    })
    .returning();
  return row;
}

export async function listAttachmentsByMessageIds(messageIds: string[]) {
  if (!messageIds.length) return [];
  return db
    .select()
    .from(messageAttachments)
    .where(inArray(messageAttachments.messageId, messageIds))
    .orderBy(messageAttachments.createdAt);
}

export async function listParticipantReadStates(conversationId: string) {
  return db
    .select({
      participantType: conversationParticipants.participantType,
      staffUserId: conversationParticipants.staffUserId,
      portalUserId: conversationParticipants.portalUserId,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        isNull(conversationParticipants.leftAt),
      ),
    );
}

export async function softDeleteMessage(
  tenantId: string,
  conversationId: string,
  messageId: string,
) {
  const now = new Date();
  const [row] = await db
    .update(messages)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.conversationId, conversationId),
        eq(messages.tenantId, tenantId),
        isNull(messages.deletedAt),
      ),
    )
    .returning();
  return row;
}

export async function findStaffParticipant(conversationId: string, staffUserId: string) {
  const [row] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.staffUserId, staffUserId),
        isNull(conversationParticipants.leftAt),
      ),
    )
    .limit(1);
  return row;
}

export async function listStaffParticipantUserIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ staffUserId: conversationParticipants.staffUserId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.participantType, "staff"),
        isNull(conversationParticipants.leftAt),
      ),
    );
  return rows.map((r) => r.staffUserId).filter((id): id is string => !!id);
}

export async function listPortalParticipantUserIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ portalUserId: conversationParticipants.portalUserId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.participantType, "portal"),
        isNull(conversationParticipants.leftAt),
      ),
    );
  return rows.map((r) => r.portalUserId).filter((id): id is string => !!id);
}

export async function listClinicalStaffUserIds(tenantId: string): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        sql`${users.role} IN ('staff', 'admin')`,
        eq(users.status, "active"),
      ),
    );
  return rows.map((r) => r.id);
}

export async function listClinicalStaffForPortal(tenantId: string) {
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        sql`${users.role} IN ('staff', 'admin')`,
        eq(users.status, "active"),
      ),
    )
    .orderBy(users.lastName, users.firstName);
  return rows.map((r) => ({
    id: r.id,
    displayName: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Clinician",
  }));
}

export async function findClinicalStaffUsersByIds(tenantId: string, userIds: string[]) {
  if (!userIds.length) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        sql`${users.role} IN ('staff', 'admin')`,
        eq(users.status, "active"),
        inArray(users.id, userIds),
      ),
    );
  return rows.map((r) => r.id);
}

export async function findPortalParticipant(conversationId: string, portalUserId: string) {
  const [row] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.portalUserId, portalUserId),
        isNull(conversationParticipants.leftAt),
      ),
    )
    .limit(1);
  return row;
}

export async function ensureStaffParticipant(
  tenantId: string,
  conversationId: string,
  staffUserId: string,
) {
  const existing = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.staffUserId, staffUserId),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db
    .insert(conversationParticipants)
    .values({
      tenantId,
      conversationId,
      participantType: "staff",
      staffUserId,
    })
    .returning();
  return row;
}

export async function getPatientDisplayName(tenantId: string, patientId: string): Promise<string> {
  const [row] = await db
    .select({
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(patients)
    .innerJoin(employees, eq(patients.employeeId, employees.id))
    .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
    .limit(1);
  if (!row) return "Employee";
  const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
  return name || "Employee";
}

export async function getStaffDisplayName(userId: string): Promise<string> {
  const [row] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return "Care team";
  const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
  return name || "Care team";
}

export async function listStaffConversations(
  tenantId: string,
  opts: {
    status?: "open" | "closed" | "archived";
    patientId?: string;
    assignedToMe?: string;
    inboxKind?: "patient" | "staff_internal";
    staffUserId?: string;
    limit?: number;
  },
) {
  if (opts.inboxKind === "staff_internal") {
    if (!opts.staffUserId) return [];
    const conditions = [
      eq(conversations.tenantId, tenantId),
      eq(conversations.type, "staff_internal"),
      eq(conversationParticipants.staffUserId, opts.staffUserId),
      isNull(conversationParticipants.leftAt),
    ];
    if (opts.status) conditions.push(eq(conversations.status, opts.status));

    const rows = await db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        eq(conversationParticipants.conversationId, conversations.id),
      )
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
      .limit(opts.limit ?? 100);

    return rows.map((r) => r.conversation);
  }

  const conditions = [
    eq(conversations.tenantId, tenantId),
    sql`${conversations.type} IN ('patient_staff', 'appointment_thread', 'encounter_thread')`,
  ];
  if (opts.status) conditions.push(eq(conversations.status, opts.status));
  if (opts.patientId) conditions.push(eq(conversations.patientId, opts.patientId));
  if (opts.assignedToMe) {
    conditions.push(eq(conversations.assignedStaffUserId, opts.assignedToMe));
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
    .limit(opts.limit ?? 100);

  return rows;
}

export async function listPortalConversations(tenantId: string, patientId: string) {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.patientId, patientId),
        sql`${conversations.type} IN ('patient_staff', 'appointment_thread', 'encounter_thread')`,
      ),
    )
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));
}

export async function countUnreadForStaff(
  tenantId: string,
  staffUserId: string,
): Promise<number> {
  const [patientRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .leftJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.staffUserId, staffUserId),
      ),
    )
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        sql`${conversations.type} IN ('patient_staff', 'appointment_thread', 'encounter_thread')`,
        eq(messages.senderType, "portal"),
        isNull(messages.deletedAt),
        or(
          isNull(conversationParticipants.lastReadAt),
          gt(messages.createdAt, conversationParticipants.lastReadAt),
        ),
      ),
    );

  const [internalRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.staffUserId, staffUserId),
        isNull(conversationParticipants.leftAt),
      ),
    )
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.type, "staff_internal"),
        eq(messages.senderType, "staff"),
        sql`${messages.senderStaffUserId} IS DISTINCT FROM ${staffUserId}`,
        isNull(messages.deletedAt),
        or(
          isNull(conversationParticipants.lastReadAt),
          gt(messages.createdAt, conversationParticipants.lastReadAt),
        ),
      ),
    );

  return (patientRow?.count ?? 0) + (internalRow?.count ?? 0);
}

export async function countUnreadForPortal(
  tenantId: string,
  portalUserId: string,
  patientId: string,
): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.portalUserId, portalUserId),
      ),
    )
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.patientId, patientId),
        eq(messages.senderType, "staff"),
        isNull(messages.deletedAt),
        or(
          isNull(conversationParticipants.lastReadAt),
          gt(messages.createdAt, conversationParticipants.lastReadAt),
        ),
      ),
    );
  return row?.count ?? 0;
}

export async function countUnreadInConversationForStaff(
  conversationId: string,
  staffUserId: string,
  conversationType?: string,
): Promise<number> {
  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.staffUserId, staffUserId),
      ),
    )
    .limit(1);

  const fromPortal = conversationType !== "staff_internal";
  const conditions = [
    eq(messages.conversationId, conversationId),
    isNull(messages.deletedAt),
  ];
  if (fromPortal) {
    conditions.push(eq(messages.senderType, "portal"));
  } else {
    conditions.push(eq(messages.senderType, "staff"));
    conditions.push(sql`${messages.senderStaffUserId} IS DISTINCT FROM ${staffUserId}`);
  }
  if (participant?.lastReadAt) {
    conditions.push(gt(messages.createdAt, participant.lastReadAt));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function countUnreadInConversationForPortal(
  conversationId: string,
  portalUserId: string,
): Promise<number> {
  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.portalUserId, portalUserId),
      ),
    )
    .limit(1);

  const conditions = [
    eq(messages.conversationId, conversationId),
    eq(messages.senderType, "staff"),
    isNull(messages.deletedAt),
  ];
  if (participant?.lastReadAt) {
    conditions.push(gt(messages.createdAt, participant.lastReadAt));
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function listMessages(
  tenantId: string,
  conversationId: string,
  opts: { since?: Date; limit?: number },
): Promise<Message[]> {
  const conditions = [
    eq(messages.tenantId, tenantId),
    eq(messages.conversationId, conversationId),
    isNull(messages.deletedAt),
  ];
  if (opts.since) conditions.push(gt(messages.createdAt, opts.since));

  return db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(messages.createdAt)
    .limit(opts.limit ?? 200);
}

export async function findMessageByClientId(conversationId: string, clientMessageId: string) {
  const [row] = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.conversationId, conversationId), eq(messages.clientMessageId, clientMessageId)),
    )
    .limit(1);
  return row;
}

export async function createPatientStaffConversation(params: {
  tenantId: string;
  patientId: string;
  portalUserId: string;
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  clientMessageId?: string;
  staffUserId?: string | null;
  appointmentId?: string | null;
  assignedStaffUserId?: string | null;
}): Promise<{ conversation: Conversation; message: Message }> {
  const now = new Date();
  const retentionUntil = computeRetentionUntil(now);
  const preview = truncatePreview(params.bodyText);
  const conversationType = params.appointmentId ? "appointment_thread" : "patient_staff";

  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        tenantId: params.tenantId,
        type: conversationType,
        subject: params.subject?.trim() || null,
        patientId: params.patientId,
        appointmentId: params.appointmentId ?? null,
        status: "open",
        assignedStaffUserId: params.assignedStaffUserId ?? null,
        lastMessageAt: now,
        lastMessagePreview: preview,
        createdByType: "portal",
        createdByPortalUserId: params.portalUserId,
        retentionUntil,
        updatedAt: now,
      })
      .returning();

    await tx.insert(conversationParticipants).values({
      tenantId: params.tenantId,
      conversationId: conversation.id,
      participantType: "portal",
      portalUserId: params.portalUserId,
    });

    if (params.staffUserId) {
      await tx.insert(conversationParticipants).values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        participantType: "staff",
        staffUserId: params.staffUserId,
      });
    } else if (params.assignedStaffUserId) {
      await tx.insert(conversationParticipants).values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        participantType: "staff",
        staffUserId: params.assignedStaffUserId,
      });
    }

    const [message] = await tx
      .insert(messages)
      .values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        senderType: "portal",
        senderPortalUserId: params.portalUserId,
        bodyText: params.bodyText.trim(),
        bodyHtml: params.bodyHtml ?? null,
        clientMessageId: params.clientMessageId ?? null,
        updatedAt: now,
      })
      .returning();

    return { conversation, message };
  });
}

export async function createStaffPatientConversation(params: {
  tenantId: string;
  patientId: string;
  staffUserId: string;
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  clientMessageId?: string;
  portalUserId?: string | null;
  appointmentId?: string | null;
}): Promise<{ conversation: Conversation; message: Message }> {
  const now = new Date();
  const retentionUntil = computeRetentionUntil(now);
  const preview = truncatePreview(params.bodyText);
  const conversationType = params.appointmentId ? "appointment_thread" : "patient_staff";

  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        tenantId: params.tenantId,
        type: conversationType,
        subject: params.subject?.trim() || null,
        patientId: params.patientId,
        appointmentId: params.appointmentId ?? null,
        status: "open",
        assignedStaffUserId: params.staffUserId,
        lastMessageAt: now,
        lastMessagePreview: preview,
        createdByType: "staff",
        createdByStaffUserId: params.staffUserId,
        retentionUntil,
        updatedAt: now,
      })
      .returning();

    await tx.insert(conversationParticipants).values({
      tenantId: params.tenantId,
      conversationId: conversation.id,
      participantType: "staff",
      staffUserId: params.staffUserId,
    });

    if (params.portalUserId) {
      await tx.insert(conversationParticipants).values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        participantType: "portal",
        portalUserId: params.portalUserId,
      });
    }

    const [message] = await tx
      .insert(messages)
      .values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        senderType: "staff",
        senderStaffUserId: params.staffUserId,
        bodyText: params.bodyText.trim(),
        bodyHtml: params.bodyHtml ?? null,
        clientMessageId: params.clientMessageId ?? null,
        updatedAt: now,
      })
      .returning();

    return { conversation, message };
  });
}

export async function createStaffInternalConversation(params: {
  tenantId: string;
  creatorStaffUserId: string;
  staffUserIds: string[];
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  clientMessageId?: string;
}): Promise<{ conversation: Conversation; message: Message }> {
  const now = new Date();
  const retentionUntil = computeRetentionUntil(now);
  const preview = truncatePreview(params.bodyText);
  const participantIds = [
    params.creatorStaffUserId,
    ...params.staffUserIds.filter((id) => id !== params.creatorStaffUserId),
  ];

  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        tenantId: params.tenantId,
        type: "staff_internal",
        subject: params.subject?.trim() || null,
        patientId: null,
        status: "open",
        assignedStaffUserId: params.creatorStaffUserId,
        lastMessageAt: now,
        lastMessagePreview: preview,
        createdByType: "staff",
        createdByStaffUserId: params.creatorStaffUserId,
        retentionUntil,
        updatedAt: now,
      })
      .returning();

    for (const staffUserId of participantIds) {
      await tx.insert(conversationParticipants).values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        participantType: "staff",
        staffUserId,
      });
    }

    const [message] = await tx
      .insert(messages)
      .values({
        tenantId: params.tenantId,
        conversationId: conversation.id,
        senderType: "staff",
        senderStaffUserId: params.creatorStaffUserId,
        bodyText: params.bodyText.trim(),
        bodyHtml: params.bodyHtml ?? null,
        clientMessageId: params.clientMessageId ?? null,
        updatedAt: now,
      })
      .returning();

    return { conversation, message };
  });
}

export async function insertMessage(params: {
  tenantId: string;
  conversationId: string;
  senderType: "staff" | "portal";
  staffUserId?: string;
  portalUserId?: string;
  bodyText: string;
  bodyHtml?: string | null;
  clientMessageId?: string;
}): Promise<Message> {
  const now = new Date();
  const preview = truncatePreview(params.bodyText);

  const [message] = await db
    .insert(messages)
    .values({
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      senderType: params.senderType,
      senderStaffUserId: params.senderType === "staff" ? params.staffUserId ?? null : null,
      senderPortalUserId: params.senderType === "portal" ? params.portalUserId ?? null : null,
      bodyText: params.bodyText.trim(),
      bodyHtml: params.bodyHtml ?? null,
      clientMessageId: params.clientMessageId ?? null,
      updatedAt: now,
    })
    .returning();

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessagePreview: preview,
      updatedAt: now,
      status: "open",
    })
    .where(eq(conversations.id, params.conversationId));

  return message;
}

export async function updateConversation(
  tenantId: string,
  conversationId: string,
  patch: {
    status?: "open" | "closed" | "archived";
    assignedStaffUserId?: string | null;
    subject?: string;
  },
) {
  const [row] = await db
    .update(conversations)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .returning();
  return row;
}

export async function markParticipantRead(
  conversationId: string,
  opts: { staffUserId?: string; portalUserId?: string },
  readAt: Date = new Date(),
) {
  if (opts.staffUserId) {
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: readAt, updatedAt: readAt })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.staffUserId, opts.staffUserId),
        ),
      );
    return;
  }
  if (opts.portalUserId) {
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: readAt, updatedAt: readAt })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.portalUserId, opts.portalUserId),
        ),
      );
  }
}

export async function findPortalUserForPatient(tenantId: string, patientId: string) {
  const [row] = await db
    .select()
    .from(portalUsers)
    .where(
      and(
        eq(portalUsers.tenantId, tenantId),
        eq(portalUsers.patientId, patientId),
        eq(portalUsers.status, "active"),
      ),
    )
    .limit(1);
  return row;
}
