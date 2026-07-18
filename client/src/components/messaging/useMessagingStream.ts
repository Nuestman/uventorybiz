import { useRegisterActiveConversation } from "./MessagingRealtimeProvider";

/**
 * @deprecated SSE is owned by MessagingRealtimeProvider in each layout.
 * Use useRegisterActiveConversation instead.
 */
export function useMessagingStream(
  _audience?: unknown,
  _enabled?: unknown,
  activeConversationId?: string | null,
) {
  useRegisterActiveConversation(activeConversationId ?? null);
}

export { useRegisterActiveConversation };
