import type { QueryClient } from "@tanstack/react-query";
import type {
  ConversationSummaryDto,
  MessageDto,
} from "@shared/messaging";
import { stripHtmlToPlainText, truncatePreview } from "@shared/messaging";
import { apiRequest } from "@/lib/queryClient";
import { offlineStore } from "@/lib/offlineStore";
import type {
  MessagingAudience,
  MessagingOutboxItem,
  OfflineMessageDto,
} from "@/types/offlineMessaging";
import {
  OFFLINE_CONVERSATION_PREFIX,
  OFFLINE_MESSAGE_PREFIX,
  isOfflineConversationId,
} from "@/types/offlineMessaging";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function messagingInboxCacheKey(prefix: string, qs: string): string {
  return `${prefix}/conversations|${qs}`;
}

async function mergeInboxWithLocal(
  serverList: ConversationSummaryDto[],
): Promise<ConversationSummaryDto[]> {
  const local = await offlineStore.getLocalConversations();
  if (!local.length) return serverList;
  const byId = new Map(serverList.map((c) => [c.id, c]));
  for (const conv of local) {
    byId.set(conv.id, conv);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
}

export async function fetchMessagingInboxOfflineFirst(
  prefix: string,
  qs: string,
): Promise<ConversationSummaryDto[]> {
  const cacheKey = messagingInboxCacheKey(prefix, qs);
  const url = qs ? `${prefix}/conversations?${qs}` : `${prefix}/conversations`;

  if (isBrowserOffline()) {
    const cached = await offlineStore.getMessagingInbox(cacheKey);
    return mergeInboxWithLocal(cached?.conversations ?? []);
  }

  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    const list = (await res.json()) as ConversationSummaryDto[];
    await offlineStore.putMessagingInbox({
      key: cacheKey,
      conversations: list,
      cachedAt: new Date().toISOString(),
    });
    return mergeInboxWithLocal(list);
  } catch (error) {
    const cached = await offlineStore.getMessagingInbox(cacheKey);
    if (cached?.conversations.length) {
      return mergeInboxWithLocal(cached.conversations);
    }
    throw error;
  }
}

function mergeThreadMessages(
  existing: OfflineMessageDto[],
  delta: OfflineMessageDto[],
): OfflineMessageDto[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const message of delta) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function fetchMessagingThreadOfflineFirst(
  messagesUrl: string,
  conversationId: string,
  existing: OfflineMessageDto[] | undefined,
  forceFull: boolean,
): Promise<OfflineMessageDto[]> {
  const since =
    !forceFull && existing?.length ? existing[existing.length - 1].createdAt : undefined;
  const url = since
    ? `${messagesUrl}?since=${encodeURIComponent(since)}`
    : messagesUrl;

  if (isBrowserOffline()) {
    const cached = await offlineStore.getMessagingThread(conversationId);
    return cached?.messages ?? existing ?? [];
  }

  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await res.text()}`);
    }
    const delta = (await res.json()) as OfflineMessageDto[];
    const merged =
      !existing?.length || !since ? delta : mergeThreadMessages(existing, delta);
    await offlineStore.putMessagingThread({
      conversationId,
      messages: merged,
      cachedAt: new Date().toISOString(),
    });
    return merged;
  } catch (error) {
    const cached = await offlineStore.getMessagingThread(conversationId);
    if (cached?.messages.length) {
      return cached.messages;
    }
    if (existing?.length) return existing;
    throw error;
  }
}

export function buildOptimisticMessage(params: {
  audience: MessagingAudience;
  conversationId: string;
  body: { bodyText?: string; bodyHtml?: string; clientMessageId: string };
  senderDisplayName: string;
}): OfflineMessageDto {
  const bodyText =
    params.body.bodyText?.trim() ||
    (params.body.bodyHtml ? stripHtmlToPlainText(params.body.bodyHtml) : "");
  const now = new Date().toISOString();
  return {
    id: `${OFFLINE_MESSAGE_PREFIX}${params.body.clientMessageId}`,
    conversationId: params.conversationId,
    senderType: params.audience === "staff" ? "staff" : "portal",
    senderDisplayName: params.audience === "portal" ? "You" : params.senderDisplayName,
    bodyText,
    bodyHtml: params.body.bodyHtml ?? null,
    createdAt: now,
    isOwn: true,
    isDeleted: false,
    seenAt: null,
    canDelete: false,
    attachments: [],
    pendingSync: true,
  };
}

async function appendThreadMessageLocal(
  conversationId: string,
  message: OfflineMessageDto,
): Promise<OfflineMessageDto[]> {
  const cached = await offlineStore.getMessagingThread(conversationId);
  const messages = mergeThreadMessages(cached?.messages ?? [], [message]);
  await offlineStore.putMessagingThread({
    conversationId,
    messages,
    cachedAt: new Date().toISOString(),
  });
  return messages;
}

async function queueOutboxItem(item: MessagingOutboxItem) {
  await offlineStore.putMessagingOutbox(item);
}

export async function queueOfflineSendMessage(params: {
  audience: MessagingAudience;
  prefix: string;
  conversationId: string;
  body: {
    bodyText?: string;
    bodyHtml?: string;
    clientMessageId: string;
    messagingConsentAccepted?: boolean;
    assignedStaffUserId?: string | null;
  };
  senderDisplayName: string;
}): Promise<OfflineMessageDto> {
  const clientMessageId = params.body.clientMessageId;
  const optimistic = buildOptimisticMessage({
    audience: params.audience,
    conversationId: params.conversationId,
    body: params.body,
    senderDisplayName: params.senderDisplayName,
  });

  await appendThreadMessageLocal(params.conversationId, optimistic);

  const localConversations = await offlineStore.getLocalConversations();
  const localConv = localConversations.find((c) => c.id === params.conversationId);
  if (localConv) {
    await offlineStore.putLocalConversation({
      ...localConv,
      lastMessageAt: optimistic.createdAt,
      lastMessagePreview: truncatePreview(optimistic.bodyText),
    });
  }

  await queueOutboxItem({
    id: generateId(),
    audience: params.audience,
    kind: "send_message",
    apiPath: `${params.prefix}/conversations/${params.conversationId}/messages`,
    requestBody: {
      bodyText: params.body.bodyText,
      bodyHtml: params.body.bodyHtml,
      clientMessageId,
      messagingConsentAccepted: params.body.messagingConsentAccepted,
      assignedStaffUserId: params.body.assignedStaffUserId,
    },
    clientMessageId,
    conversationId: params.conversationId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });

  return optimistic;
}

export async function queueOfflineCreateConversation(params: {
  audience: MessagingAudience;
  prefix: string;
  body: Record<string, unknown> & {
    bodyText?: string;
    bodyHtml?: string;
    clientMessageId?: string;
    subject?: string | null;
    patientId?: string;
    portalUserId?: string;
  };
  senderDisplayName: string;
  patientName?: string | null;
}): Promise<{ conversation: ConversationSummaryDto; message: OfflineMessageDto }> {
  const localConversationId = `${OFFLINE_CONVERSATION_PREFIX}${generateId()}`;
  const clientMessageId =
    (params.body.clientMessageId as string | undefined) ?? generateId();
  const bodyText =
    (params.body.bodyText as string | undefined)?.trim() ||
    (params.body.bodyHtml
      ? stripHtmlToPlainText(params.body.bodyHtml as string)
      : "");
  const now = new Date().toISOString();

  const message = buildOptimisticMessage({
    audience: params.audience,
    conversationId: localConversationId,
    body: {
      bodyText,
      bodyHtml: params.body.bodyHtml as string | undefined,
      clientMessageId,
    },
    senderDisplayName: params.senderDisplayName,
  });

  const conversation: ConversationSummaryDto = {
    id: localConversationId,
    type: params.body.staffUserIds ? "staff_internal" : "patient_staff",
    status: "open",
    subject: (params.body.subject as string | null | undefined) ?? null,
    patientId: (params.body.patientId as string | undefined) ?? null,
    patientName: params.patientName ?? null,
    appointmentId: (params.body.appointmentId as string | undefined) ?? null,
    lastMessageAt: now,
    lastMessagePreview: truncatePreview(bodyText),
    unreadCount: 0,
    assignedStaffUserId:
      (params.body.assignedStaffUserId as string | null | undefined) ?? null,
  };

  await offlineStore.putLocalConversation(conversation);
  await offlineStore.putMessagingThread({
    conversationId: localConversationId,
    messages: [message],
    cachedAt: now,
  });

  await queueOutboxItem({
    id: generateId(),
    audience: params.audience,
    kind: "create_conversation",
    apiPath: `${params.prefix}/conversations`,
    requestBody: { ...params.body, clientMessageId },
    clientMessageId,
    conversationId: localConversationId,
    createdAt: now,
    retryCount: 0,
  });

  return { conversation, message };
}

async function remapConversationAfterSync(
  localId: string,
  serverConversation: ConversationSummaryDto,
  serverMessage: MessageDto,
  clientMessageId: string,
) {
  const thread = await offlineStore.getMessagingThread(localId);
  const optimisticId = `${OFFLINE_MESSAGE_PREFIX}${clientMessageId}`;
  if (thread) {
    const withoutOptimistic = thread.messages.filter((m) => m.id !== optimisticId);
    const remappedPending = withoutOptimistic.map((m) => ({
      ...m,
      conversationId: serverConversation.id,
    }));
    const merged = mergeThreadMessages(remappedPending, [
      { ...serverMessage, pendingSync: false },
    ]);
    await offlineStore.putMessagingThread({
      conversationId: serverConversation.id,
      messages: merged,
      cachedAt: new Date().toISOString(),
    });
    await offlineStore.deleteMessagingThread(localId);
  }

  await offlineStore.removeLocalConversation(localId);

  const outbox = await offlineStore.getMessagingOutbox();
  for (const item of outbox) {
    if (item.conversationId !== localId) continue;
    const updated: MessagingOutboxItem = {
      ...item,
      conversationId: serverConversation.id,
      apiPath: item.apiPath.replace(
        `/conversations/${localId}/`,
        `/conversations/${serverConversation.id}/`,
      ),
    };
    await offlineStore.putMessagingOutbox(updated);
  }

  const inboxCaches = await offlineStore.getAllMessagingInboxCaches();
  for (const cache of inboxCaches) {
    const conversations = cache.conversations.map((c) =>
      c.id === localId ? serverConversation : c,
    );
    await offlineStore.putMessagingInbox({
      ...cache,
      conversations,
    });
  }
}

async function replaceOptimisticMessage(
  conversationId: string,
  clientMessageId: string,
  serverMessage: MessageDto,
) {
  const thread = await offlineStore.getMessagingThread(conversationId);
  if (!thread) return;
  const optimisticId = `${OFFLINE_MESSAGE_PREFIX}${clientMessageId}`;
  const withoutOptimistic = thread.messages.filter((m) => m.id !== optimisticId);
  const merged = mergeThreadMessages(withoutOptimistic, [
    { ...serverMessage, pendingSync: false },
  ]);
  await offlineStore.putMessagingThread({
    conversationId,
    messages: merged,
    cachedAt: new Date().toISOString(),
  });
}

export async function getMessagingOutboxCount(): Promise<number> {
  const items = await offlineStore.getMessagingOutbox();
  return items.length;
}

export async function syncMessagingOutbox(queryClient: QueryClient): Promise<number> {
  if (isBrowserOffline()) return 0;

  const items = (await offlineStore.getMessagingOutbox()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  if (!items.length) return 0;

  let synced = 0;
  const prefixByAudience: Record<MessagingAudience, string> = {
    staff: "/api/messaging",
    portal: "/api/portal/messaging",
  };

  for (const item of items) {
    if (item.kind === "send_message" && isOfflineConversationId(item.conversationId)) {
      continue;
    }

    try {
      if (item.kind === "create_conversation") {
        const res = await apiRequest("POST", item.apiPath, item.requestBody);
        const data = (await res.json()) as {
          conversation: ConversationSummaryDto;
          message: MessageDto;
        };
        await remapConversationAfterSync(
          item.conversationId,
          data.conversation,
          data.message,
          item.clientMessageId,
        );
        await offlineStore.removeMessagingOutbox(item.id);
        synced++;
        void queryClient.invalidateQueries({
          queryKey: [`${prefixByAudience[item.audience]}/conversations`],
        });
        void queryClient.invalidateQueries({
          queryKey: [
            `${prefixByAudience[item.audience]}/conversations/${data.conversation.id}/messages`,
          ],
        });
        continue;
      }

      const res = await apiRequest("POST", item.apiPath, item.requestBody);
      const serverMessage = (await res.json()) as MessageDto;
      await replaceOptimisticMessage(
        item.conversationId,
        item.clientMessageId,
        serverMessage,
      );
      await offlineStore.removeMessagingOutbox(item.id);
      synced++;
      void queryClient.invalidateQueries({
        queryKey: [
          `${prefixByAudience[item.audience]}/conversations/${item.conversationId}/messages`,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [`${prefixByAudience[item.audience]}/conversations`],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await offlineStore.putMessagingOutbox({
        ...item,
        retryCount: item.retryCount + 1,
        lastError: message,
      });
    }
  }

  return synced;
}
