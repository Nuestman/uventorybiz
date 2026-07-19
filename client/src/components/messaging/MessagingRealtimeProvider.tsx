import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MessagingStreamEvent } from "@shared/messaging";

type Audience = "staff" | "portal";

type MessagingRealtimeContextValue = {
  sseConnected: boolean;
  setActiveConversationId: (id: string | null) => void;
};

const defaultValue: MessagingRealtimeContextValue = {
  sseConnected: false,
  setActiveConversationId: () => {},
};

const MessagingRealtimeContext = createContext<MessagingRealtimeContextValue>(defaultValue);

const MAX_RECONNECT_MS = 30_000;
/** Stop retrying after this many consecutive failures (covers feature-disabled 403). */
const MAX_RECONNECT_ATTEMPTS = 3;

function apiPrefix(audience: Audience) {
  return audience === "staff" ? "/api/messaging" : "/api/portal/messaging";
}

function parseStreamEvent(raw: MessageEvent<string>): MessagingStreamEvent | null {
  try {
    return JSON.parse(raw.data) as MessagingStreamEvent;
  } catch {
    return null;
  }
}

/** Probe a non-SSE messaging endpoint — 401/403 means do not keep reconnecting. */
async function isMessagingPermanentlyUnavailable(prefix: string): Promise<boolean> {
  try {
    const res = await fetch(`${prefix}/unread-count`, { credentials: "include" });
    return res.status === 401 || res.status === 403;
  } catch {
    return false;
  }
}

export function useMessagingRealtime(): MessagingRealtimeContextValue {
  return useContext(MessagingRealtimeContext);
}

/** Tell the layout SSE layer which thread is open (for targeted invalidation). */
export function useRegisterActiveConversation(conversationId: string | null) {
  const { setActiveConversationId } = useMessagingRealtime();
  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId]);
}

type ProviderProps = {
  audience: Audience;
  enabled?: boolean;
  children: ReactNode;
};

export function MessagingRealtimeProvider({ audience, enabled = true, children }: ProviderProps) {
  const queryClient = useQueryClient();
  const [sseConnected, setSseConnected] = useState(false);
  const activeConversationIdRef = useRef<string | null>(null);

  const setActiveConversationId = useCallback((id: string | null) => {
    activeConversationIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") {
      setSseConnected(false);
      return;
    }

    const prefix = apiPrefix(audience);
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let closed = false;
    let permanentlyStopped = false;

    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations`] });
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/unread-count`] });
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations/lookup`] });
    };

    const invalidateActiveThread = (conversationId?: string) => {
      if (!conversationId || conversationId !== activeConversationIdRef.current) return;
      void queryClient.invalidateQueries({
        queryKey: [`${prefix}/conversations/${conversationId}/messages`],
      });
    };

    const onEvent = (raw: MessageEvent<string>) => {
      const event = parseStreamEvent(raw);
      if (!event) return;

      if (event.type === "inbox.changed" || event.type === "conversation.updated") {
        invalidateInbox();
        return;
      }

      if (event.type === "message.new") {
        invalidateInbox();
        invalidateActiveThread(event.conversationId);
        return;
      }

      if (event.type === "message.read") {
        invalidateActiveThread(event.conversationId);
      }
    };

    const attachListeners = (source: EventSource) => {
      source.addEventListener("message.new", onEvent);
      source.addEventListener("inbox.changed", onEvent);
      source.addEventListener("conversation.updated", onEvent);
      source.addEventListener("message.read", onEvent);
      source.onmessage = onEvent;
    };

    const scheduleReconnect = () => {
      if (closed || permanentlyStopped) return;
      if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        permanentlyStopped = true;
        setSseConnected(false);
        return;
      }
      const delay = Math.min(MAX_RECONNECT_MS, 1000 * 2 ** reconnectAttempt);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (closed || permanentlyStopped) return;
      es = new EventSource(`${prefix}/stream`, { withCredentials: true });
      attachListeners(es);

      es.onopen = () => {
        reconnectAttempt = 0;
        setSseConnected(true);
      };

      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        es = null;
        if (closed || permanentlyStopped) return;
        void (async () => {
          if (await isMessagingPermanentlyUnavailable(prefix)) {
            permanentlyStopped = true;
            return;
          }
          scheduleReconnect();
        })();
      };
    };

    connect();

    return () => {
      closed = true;
      setSseConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [audience, enabled, queryClient]);

  const value = useMemo(
    () => ({ sseConnected, setActiveConversationId }),
    [sseConnected, setActiveConversationId],
  );

  return (
    <MessagingRealtimeContext.Provider value={value}>{children}</MessagingRealtimeContext.Provider>
  );
}
