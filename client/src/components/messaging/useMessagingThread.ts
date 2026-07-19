import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiRequest, apiFormRequest } from "@/lib/queryClient";
import type { ConversationSummaryDto, MessageDto } from "@shared/messaging";
import { MESSAGING_POLL_ACTIVE_MS, MESSAGING_POLL_INBOX_MS } from "@shared/messaging";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  fetchMessagingInboxOfflineFirst,
  fetchMessagingThreadOfflineFirst,
  isBrowserOffline,
  queueOfflineCreateConversation,
  queueOfflineSendMessage,
} from "@/lib/offlineMessaging";
import { offlineStore } from "@/lib/offlineStore";
import type { OfflineMessageDto } from "@/types/offlineMessaging";
import { useMessagingRealtime } from "./MessagingRealtimeProvider";

type Audience = "staff" | "portal";

function apiPrefix(audience: Audience) {
  return audience === "staff" ? "/api/messaging" : "/api/portal/messaging";
}

function useMessagingFallbackPollMs(intervalMs: number): number | false {
  const { sseConnected } = useMessagingRealtime();
  const isOnline = useOnlineStatus();
  if (!isOnline) return false;
  return sseConnected ? false : intervalMs;
}

function staffDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined): string {
  if (!user) return "You";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "You";
}

async function fetchThreadMessages(
  queryClient: QueryClient,
  messagesUrl: string,
  conversationId: string,
  forceFull = false,
): Promise<OfflineMessageDto[]> {
  const queryKey = [messagesUrl];
  const existing = queryClient.getQueryData<OfflineMessageDto[]>(queryKey);
  return fetchMessagingThreadOfflineFirst(
    messagesUrl,
    conversationId,
    existing,
    forceFull,
  );
}

export function useMessagingInbox(
  audience: Audience,
  opts?: {
    patientId?: string;
    status?: "open" | "closed" | "archived";
    assignedToMe?: boolean;
    inboxKind?: "patient" | "staff_internal";
    enabled?: boolean;
  },
) {
  const prefix = apiPrefix(audience);
  const pollMs = useMessagingFallbackPollMs(MESSAGING_POLL_INBOX_MS);
  const params = new URLSearchParams();
  if (opts?.patientId) params.set("patientId", opts.patientId);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.assignedToMe) params.set("assignedToMe", "true");
  if (opts?.inboxKind === "staff_internal") params.set("inboxKind", "staff_internal");
  const qs = params.toString();

  return useQuery<ConversationSummaryDto[]>({
    queryKey: [`${prefix}/conversations`, qs],
    queryFn: () => fetchMessagingInboxOfflineFirst(prefix, qs),
    enabled: opts?.enabled !== false,
    refetchInterval: pollMs,
    staleTime: pollMs === false ? 60_000 : MESSAGING_POLL_INBOX_MS / 2,
  });
}

export function useMessagingUnreadCount(audience: Audience, enabled = true) {
  const prefix = apiPrefix(audience);
  const pollMs = useMessagingFallbackPollMs(MESSAGING_POLL_INBOX_MS);
  const isOnline = useOnlineStatus();

  return useQuery<{ count: number }>({
    queryKey: [`${prefix}/unread-count`],
    queryFn: async () => {
      if (isBrowserOffline()) return { count: 0 };
      const res = await fetch(`${prefix}/unread-count`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return (await res.json()) as { count: number };
    },
    enabled: enabled && isOnline,
    refetchInterval: pollMs,
    staleTime: pollMs === false ? 60_000 : MESSAGING_POLL_INBOX_MS / 2,
  });
}

export function useMessagingThread(
  audience: Audience,
  conversationId: string | null,
  enabled = true,
) {
  const prefix = apiPrefix(audience);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { sseConnected } = useMessagingRealtime();
  const isOnline = useOnlineStatus();
  const pollMs = useMessagingFallbackPollMs(MESSAGING_POLL_ACTIVE_MS);
  const messagesUrl = conversationId ? `${prefix}/conversations/${conversationId}/messages` : "";
  const senderName = staffDisplayName(user);

  const messagesQuery = useQuery<OfflineMessageDto[]>({
    queryKey: [messagesUrl],
    queryFn: () => fetchThreadMessages(queryClient, messagesUrl, conversationId!),
    enabled: enabled && !!conversationId,
    refetchInterval: conversationId && pollMs !== false ? pollMs : false,
    staleTime: pollMs === false ? 60_000 : MESSAGING_POLL_ACTIVE_MS / 2,
  });

  const markRead = useMutation({
    mutationFn: async (messageId?: string) => {
      if (!conversationId || isBrowserOffline()) return;
      await apiRequest("POST", `${prefix}/conversations/${conversationId}/read`, {
        messageId,
      });
    },
  });

  const lastMarkedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    lastMarkedTokenRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!enabled || !conversationId || markRead.isPending || !isOnline) return;
    const rows = messagesQuery.data;
    if (!rows?.length) return;
    const last = rows[rows.length - 1];
    if (last.isOwn || last.pendingSync) return;
    const token = `${conversationId}:${last.id}`;
    if (lastMarkedTokenRef.current === token) return;
    lastMarkedTokenRef.current = token;
    markRead.mutate(last.id);
  }, [enabled, conversationId, messagesQuery.data, markRead.isPending, markRead.mutate, isOnline]);

  const sendMessage = useMutation({
    mutationFn: async (body: {
      bodyText?: string;
      bodyHtml?: string;
      clientMessageId?: string;
      messagingConsentAccepted?: boolean;
      files?: File[];
      assignedStaffUserId?: string | null;
    }) => {
      if (!conversationId) throw new Error("No conversation selected");
      const clientMessageId = body.clientMessageId ?? crypto.randomUUID();

      if (isBrowserOffline()) {
        if (body.files?.length) {
          throw new Error("File attachments require an internet connection.");
        }
        return queueOfflineSendMessage({
          audience,
          prefix,
          conversationId,
          body: { ...body, clientMessageId },
          senderDisplayName: senderName,
        });
      }

      const res = await apiRequest(
        "POST",
        `${prefix}/conversations/${conversationId}/messages`,
        {
          bodyText: body.bodyText,
          bodyHtml: body.bodyHtml,
          clientMessageId,
          messagingConsentAccepted: body.messagingConsentAccepted,
          assignedStaffUserId: body.assignedStaffUserId,
        },
      );
      const message = (await res.json()) as MessageDto;
      for (const file of body.files ?? []) {
        const formData = new FormData();
        formData.append("file", file);
        await apiFormRequest(
          "POST",
          `${prefix}/conversations/${conversationId}/messages/${message.id}/attachments`,
          formData,
        );
      }
      const thread = await offlineStore.getMessagingThread(conversationId);
      const merged = [...(thread?.messages ?? []).filter((m) => m.id !== message.id), message];
      await offlineStore.putMessagingThread({
        conversationId,
        messages: merged.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
        cachedAt: new Date().toISOString(),
      });
      return message;
    },
    onSuccess: (message) => {
      if (messagesUrl) {
        queryClient.setQueryData<OfflineMessageDto[]>([messagesUrl], (prev) => {
          const list = prev ?? [];
          const without = list.filter((m) => m.id !== message.id);
          return [...without, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      }
      if (sseConnected && isOnline) return;
      void queryClient.invalidateQueries({ queryKey: [messagesUrl] });
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations`] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!conversationId) throw new Error("No conversation selected");
      if (isBrowserOffline()) {
        throw new Error("Deleting messages requires an internet connection.");
      }
      const res = await apiRequest(
        "DELETE",
        `${prefix}/conversations/${conversationId}/messages/${messageId}`,
      );
      return (await res.json()) as MessageDto;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [messagesUrl] });
      void queryClient.invalidateQueries({ queryKey: [messagesUrl] });
      if (!sseConnected) {
        void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations`] });
      }
    },
  });

  return { messagesQuery, markRead, sendMessage, deleteMessage };
}

export function useCreateConversation(audience: Audience) {
  const prefix = apiPrefix(audience);
  const queryClient = useQueryClient();
  const { sseConnected } = useMessagingRealtime();
  const { user } = useAuth();
  const senderName = staffDisplayName(user);

  return useMutation({
    mutationFn: async (body: {
      patientId?: string;
      portalUserId?: string;
      staffUserIds?: string[];
      subject?: string | null;
      bodyText?: string;
      bodyHtml?: string;
      clientMessageId?: string;
      messagingConsentAccepted?: boolean;
      appointmentId?: string;
      assignedStaffUserId?: string | null;
    }) => {
      if (isBrowserOffline()) {
        return queueOfflineCreateConversation({
          audience,
          prefix,
          body,
          senderDisplayName: senderName,
        });
      }
      const res = await apiRequest("POST", `${prefix}/conversations`, body);
      return (await res.json()) as {
        conversation: ConversationSummaryDto;
        message: MessageDto;
      };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations`] });
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/unread-count`] });
      if (data.conversation?.id) {
        void queryClient.invalidateQueries({
          queryKey: [`${prefix}/conversations/${data.conversation.id}/messages`],
        });
      }
      if (sseConnected && !isBrowserOffline()) return;
    },
  });
}

export function useMessagingConversationLookup(
  audience: Audience,
  filters: { appointmentId?: string | null },
  enabled = true,
) {
  const prefix = apiPrefix(audience);
  const params = new URLSearchParams();
  if (filters.appointmentId) params.set("appointmentId", filters.appointmentId);
  const qs = params.toString();
  const isOnline = useOnlineStatus();

  return useQuery<{ conversation: ConversationSummaryDto | null }>({
    queryKey: [`${prefix}/conversations/lookup`, qs],
    queryFn: async () => {
      if (isBrowserOffline()) {
        const local = await offlineStore.getLocalConversations();
        const match = local.find(
          (c) => filters.appointmentId && c.appointmentId === filters.appointmentId,
        );
        if (match) return { conversation: match };
        return { conversation: null };
      }
      const url = qs
        ? `${prefix}/conversations/lookup?${qs}`
        : `${prefix}/conversations/lookup`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return (await res.json()) as { conversation: ConversationSummaryDto | null };
    },
    enabled: enabled && !!filters.appointmentId,
    staleTime: 10_000,
    refetchInterval: isOnline ? false : false,
  });
}

export function usePatchConversation(audience: Audience) {
  const prefix = apiPrefix(audience);
  const queryClient = useQueryClient();
  const { sseConnected } = useMessagingRealtime();

  return useMutation({
    mutationFn: async ({
      conversationId,
      patch,
    }: {
      conversationId: string;
      patch: { status?: "open" | "closed" | "archived"; assignedStaffUserId?: string | null };
    }) => {
      if (isBrowserOffline()) {
        throw new Error("Updating conversations requires an internet connection.");
      }
      const res = await apiRequest("PATCH", `${prefix}/conversations/${conversationId}`, patch);
      return (await res.json()) as ConversationSummaryDto;
    },
    onSuccess: () => {
      if (sseConnected) return;
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations`] });
    },
  });
}
