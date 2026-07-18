import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { MessagingClinicianDto } from "@shared/messaging";
import type { TelecareAudience } from "@shared/telecare";
import MessagingThreadView from "@/components/messaging/MessagingThreadView";
import {
  useCreateConversation,
  useMessagingConversationLookup,
  useMessagingThread,
} from "@/components/messaging/useMessagingThread";
import { useRegisterActiveConversation } from "@/components/messaging/MessagingRealtimeProvider";
import { apiFormRequest, getQueryFn } from "@/lib/queryClient";
import { usePortalSession } from "@/portal/usePortalSession";

type Props = {
  audience: TelecareAudience;
  appointmentId?: string | null;
  patientId?: string | null;
  encounterId?: string | null;
  messagingEnabled?: boolean;
  defaultClinicianId?: string | null;
  defaultClinicianName?: string | null;
  onUnreadChange?: (count: number) => void;
};

export default function TelecareMessagingPanel({
  audience,
  appointmentId,
  patientId,
  encounterId,
  messagingEnabled = true,
  defaultClinicianId,
  defaultClinicianName,
  onUnreadChange,
}: Props) {
  const queryClient = useQueryClient();
  const { session } = usePortalSession();
  const [conversationId, setConversationId] = useState<string | null>(null);

  const canUse =
    audience === "staff"
      ? !!patientId && !!(appointmentId || encounterId)
      : messagingEnabled && !!(appointmentId || encounterId);

  const lookup = useMessagingConversationLookup(
    audience,
    { appointmentId, encounterId },
    canUse,
  );

  const { data: clinicians } = useQuery<MessagingClinicianDto[]>({
    queryKey: ["/api/portal/messaging/clinicians"],
    queryFn: getQueryFn<MessagingClinicianDto[]>({ on401: "throw" }),
    enabled: audience === "portal" && canUse,
    staleTime: 5 * 60_000,
  });

  useRegisterActiveConversation(conversationId);

  const { messagesQuery, sendMessage, deleteMessage } = useMessagingThread(
    audience,
    conversationId,
    canUse && !!conversationId,
  );

  const createConversation = useCreateConversation(audience);

  useEffect(() => {
    const linked = lookup.data?.conversation;
    if (linked) setConversationId(linked.id);
  }, [lookup.data?.conversation]);

  useEffect(() => {
    setConversationId(null);
  }, [appointmentId, encounterId, audience]);

  useEffect(() => {
    onUnreadChange?.(lookup.data?.conversation?.unreadCount ?? 0);
  }, [lookup.data?.conversation?.unreadCount, onUnreadChange]);

  useEffect(() => {
    if (!conversationId) return;
    void lookup.refetch();
  }, [conversationId, messagesQuery.dataUpdatedAt, lookup]);

  if (!canUse) {
    return (
      <p className="text-slate-500 text-sm">
        {audience === "portal" && !messagingEnabled
          ? "Secure messaging is not enabled for your portal."
          : "Messaging is not available for this visit."}
      </p>
    );
  }

  if (lookup.isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading messages…
      </div>
    );
  }

  const handleSend = async (body: {
    bodyText?: string;
    bodyHtml?: string;
    clientMessageId: string;
    messagingConsentAccepted?: boolean;
    files?: File[];
    assignedStaffUserId?: string | null;
  }) => {
    if (conversationId) {
      await sendMessage.mutateAsync(body);
      void lookup.refetch();
      return;
    }

    const prefix = audience === "staff" ? "/api/messaging" : "/api/portal/messaging";

    if (audience === "staff") {
      if (!patientId) throw new Error("Patient not found");
      const result = await createConversation.mutateAsync({
        patientId,
        appointmentId: appointmentId ?? undefined,
        encounterId: encounterId ?? undefined,
        subject: "Telehealth visit",
        bodyText: body.bodyText,
        bodyHtml: body.bodyHtml,
        clientMessageId: body.clientMessageId,
      });
      setConversationId(result.conversation.id);
      if (body.files?.length) {
        for (const file of body.files) {
          const formData = new FormData();
          formData.append("file", file);
          await apiFormRequest(
            "POST",
            `${prefix}/conversations/${result.conversation.id}/messages/${result.message.id}/attachments`,
            formData,
          );
        }
      }
      void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations/lookup`] });
      return;
    }

    const result = await createConversation.mutateAsync({
      subject: "Telehealth visit",
      bodyText: body.bodyText,
      bodyHtml: body.bodyHtml,
      clientMessageId: body.clientMessageId,
      messagingConsentAccepted: body.messagingConsentAccepted,
      appointmentId: appointmentId ?? undefined,
      encounterId: encounterId ?? undefined,
      assignedStaffUserId:
        body.assignedStaffUserId ?? defaultClinicianId ?? undefined,
    });
    setConversationId(result.conversation.id);
    void queryClient.invalidateQueries({ queryKey: [`${prefix}/conversations/lookup`] });
  };

  const isPending = sendMessage.isPending || createConversation.isPending;
  const assignedClinicianId =
    lookup.data?.conversation?.assignedStaffUserId ?? defaultClinicianId ?? null;
  const autoAssignClinician =
    audience === "portal" && !!assignedClinicianId && !lookup.data?.conversation?.assignedStaffUserId;
  const assignedClinicianName =
    autoAssignClinician
      ? clinicians?.find((c) => c.id === assignedClinicianId)?.displayName ??
        defaultClinicianName ??
        null
      : null;

  return (
    <div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden">
      <p className="text-xs text-slate-500 mb-2 shrink-0">
        Share files and notes securely during your visit without leaving the video.
        {autoAssignClinician && assignedClinicianName
          ? ` Messages are sent to ${assignedClinicianName}.`
          : null}
      </p>
      <MessagingThreadView
        messages={conversationId ? messagesQuery.data : []}
        isLoading={!!conversationId && messagesQuery.isLoading}
        compact
        fillHeight
        requireConsent={audience === "portal" && !conversationId}
        supportPhone={audience === "portal" ? session?.supportPhone : undefined}
        clinicianOptions={audience === "portal" ? clinicians : undefined}
        lockClinicianId={audience === "portal" ? defaultClinicianId : undefined}
        consentRequiresAccept={audience === "portal" && !conversationId}
        defaultClinicianId={assignedClinicianId}
        showClinicianPicker={false}
        onSend={handleSend}
        onDelete={
          conversationId
            ? async (messageId) => {
                await deleteMessage.mutateAsync(messageId);
              }
            : undefined
        }
        deletePendingId={
          deleteMessage.isPending ? (deleteMessage.variables ?? null) : null
        }
        sendPending={isPending}
        emptyLabel="No messages yet. Send a note or link to share during the visit."
        placeholder="Share an update, link, or question…"
      />
    </div>
  );
}
