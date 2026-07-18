import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import type { MessagingClinicianDto } from "@shared/messaging";
import MessagingInboxPanel from "@/components/messaging/MessagingInboxPanel";
import MessagingThreadView from "@/components/messaging/MessagingThreadView";
import {
  useCreateConversation,
  useMessagingInbox,
  useMessagingThread,
} from "@/components/messaging/useMessagingThread";
import { useRegisterActiveConversation } from "@/components/messaging/MessagingRealtimeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalSession } from "./usePortalSession";
import {
  PortalEmptyState,
  PortalLoadingBlock,
  PortalPageHeader,
} from "./portalUi";
import MessagingComposer from "@/components/messaging/MessagingComposer";
import MessagingThreadExportMenu from "@/components/messaging/MessagingThreadExportMenu";
import { getQueryFn } from "@/lib/queryClient";

export default function PortalMessagesPage() {
  const { session } = usePortalSession();
  const [, params] = useRoute("/portal/messages/:conversationId?");
  const routeConversationId = params?.conversationId ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(routeConversationId);
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  const messagingEnabled = !!session?.features.messaging;
  const { data: clinicians } = useQuery<MessagingClinicianDto[]>({
    queryKey: ["/api/portal/messaging/clinicians"],
    queryFn: getQueryFn<MessagingClinicianDto[]>({ on401: "throw" }),
    enabled: messagingEnabled,
    staleTime: 5 * 60_000,
  });
  useRegisterActiveConversation(selectedId);
  const inbox = useMessagingInbox("portal", { enabled: messagingEnabled });
  const createConversation = useCreateConversation("portal");
  const { messagesQuery, sendMessage, deleteMessage } = useMessagingThread(
    "portal",
    selectedId,
    messagingEnabled,
  );

  useEffect(() => {
    if (routeConversationId) setSelectedId(routeConversationId);
  }, [routeConversationId]);

  const urlAppointmentId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("appointmentId")
      : null;

  useEffect(() => {
    if (!urlAppointmentId || !inbox.data?.length) return;
    const match = inbox.data.find((c) => c.appointmentId === urlAppointmentId);
    if (match) setSelectedId(match.id);
  }, [urlAppointmentId, inbox.data]);

  useEffect(() => {
    if (!selectedId && inbox.data?.length) {
      setSelectedId(inbox.data[0].id);
    }
  }, [inbox.data, selectedId]);

  const selected = useMemo(
    () => inbox.data?.find((c) => c.id === selectedId) ?? null,
    [inbox.data, selectedId],
  );

  if (!session) return <PortalLoadingBlock label="Loading…" />;

  if (!messagingEnabled) {
    return (
      <PortalEmptyState
        title="Messaging not available"
        description="Your business has not enabled secure messaging in the customer & supplier portal yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Messages"
        description="Secure, non-urgent communication with your care team"
        icon={MessageSquare}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <MessagingInboxPanel
          conversations={inbox.data}
          isLoading={inbox.isLoading}
          selectedId={selectedId}
          onSelect={(c) => setSelectedId(c.id)}
          title="Threads"
          description="Your conversations"
          emptyTitle="No messages yet"
          emptyDescription="Start a conversation with your care team."
          staffMode="portal"
          headerActions={
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="icon" variant="outline" aria-label="New message">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="portal-root portal-ui">
                <DialogHeader>
                  <DialogTitle>Contact your account team</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="portal-msg-subject">Topic (optional)</Label>
                    <Input
                      id="portal-msg-subject"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Follow-up question"
                    />
                  </div>
                  <MessagingComposer
                    requireConsent
                    supportPhone={session.supportPhone}
                    clinicianOptions={clinicians}
                    showClinicianPicker
                    onSend={async (body) => {
                      const result = await createConversation.mutateAsync({
                        subject: newSubject.trim() || null,
                        bodyText: body.bodyText,
                        clientMessageId: body.clientMessageId,
                        messagingConsentAccepted: body.messagingConsentAccepted,
                        assignedStaffUserId: body.assignedStaffUserId,
                      });
                      setNewOpen(false);
                      setNewSubject("");
                      setSelectedId(result.conversation.id);
                    }}
                    isPending={createConversation.isPending}
                  />
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <Card className="min-h-[420px]">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-base">
              {selected ? selected.subject ?? "Conversation" : "Select a thread"}
            </CardTitle>
            {selected ? (
              <MessagingThreadExportMenu
                audience="portal"
                conversation={selected}
                messages={messagesQuery.data}
              />
            ) : null}
          </CardHeader>
          <CardContent>
            {selected ? (
              <MessagingThreadView
                messages={messagesQuery.data}
                isLoading={messagesQuery.isLoading}
                supportPhone={session.supportPhone}
                clinicianOptions={clinicians}
                defaultClinicianId={selected?.assignedStaffUserId}
                showClinicianPicker={!selected?.assignedStaffUserId}
                onSend={async (body) => {
                  await sendMessage.mutateAsync(body);
                }}
                onDelete={async (messageId) => {
                  await deleteMessage.mutateAsync(messageId);
                }}
                deletePendingId={
                  deleteMessage.isPending ? (deleteMessage.variables ?? null) : null
                }
                sendPending={sendMessage.isPending}
                conversationClosed={selected.status !== "open"}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Select a thread or start a new message.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
