import type { ConversationSummaryDto, MessageDto } from "@shared/messaging";

export type MessagingAudience = "staff" | "portal";

export type OfflineMessageDto = MessageDto & {
  /** Client-only: message queued for sync */
  pendingSync?: boolean;
};

export type MessagingOutboxKind = "create_conversation" | "send_message";

export interface MessagingOutboxItem {
  id: string;
  audience: MessagingAudience;
  kind: MessagingOutboxKind;
  apiPath: string;
  requestBody: Record<string, unknown>;
  clientMessageId: string;
  /** Conversation id (server or `offline_conv_*`). */
  conversationId: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface MessagingInboxCache {
  key: string;
  conversations: ConversationSummaryDto[];
  cachedAt: string;
}

export interface MessagingThreadCache {
  conversationId: string;
  messages: OfflineMessageDto[];
  cachedAt: string;
}

export const OFFLINE_CONVERSATION_PREFIX = "offline_conv_";
export const OFFLINE_MESSAGE_PREFIX = "offline_msg_";

export function isOfflineConversationId(id: string): boolean {
  return id.startsWith(OFFLINE_CONVERSATION_PREFIX);
}

export function isOfflineMessageId(id: string): boolean {
  return id.startsWith(OFFLINE_MESSAGE_PREFIX);
}
