import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus, UserCheck } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import MessagingThreadView from "@/components/messaging/MessagingThreadView";
import MessagingNewThreadDialog from "@/components/messaging/MessagingNewThreadDialog";
import MessagingStaffInternalDialog from "@/components/messaging/MessagingStaffInternalDialog";
import MessagingThreadExportMenu from "@/components/messaging/MessagingThreadExportMenu";
import {
  useMessagingInbox,
  useMessagingThread,
  usePatchConversation,
} from "@/components/messaging/useMessagingThread";
import { useRegisterActiveConversation } from "@/components/messaging/MessagingRealtimeProvider";
import { useAuth } from "@/hooks/useAuth";
import MessagingInboxPanel from "@/components/messaging/MessagingInboxPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalEmptyState, PortalLoadingBlock } from "@/portal/portalUi";
import { getQueryFn } from "@/lib/queryClient";
import type { ConversationSummaryDto, ConversationStatus } from "@shared/messaging";

type InboxFilter = "all" | "open" | "mine";
type InboxChannel = "patient" | "staff_internal";

function parseSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function MessagesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(() => parseSearchParam("conversation"));
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [inboxChannel, setInboxChannel] = useState<InboxChannel>("patient");
  const urlPatientId = parseSearchParam("patientId");
  const urlAppointmentId = parseSearchParam("appointmentId");
  const isStaffChannel = inboxChannel === "staff_internal";

  const contextLookup = useQuery<{ conversation: ConversationSummaryDto | null }>({
    queryKey: ["/api/messaging/conversations/lookup", urlAppointmentId ?? ""],
    queryFn: getQueryFn<{ conversation: ConversationSummaryDto | null }>({ on401: "throw" }),
    enabled: !!urlAppointmentId && !isStaffChannel,
  });

  useRegisterActiveConversation(selectedId);

  const inbox = useMessagingInbox("staff", {
    patientId: isStaffChannel ? undefined : urlPatientId ?? undefined,
    status: inboxFilter === "open" ? "open" : undefined,
    assignedToMe: !isStaffChannel && inboxFilter === "mine",
    inboxKind: isStaffChannel ? "staff_internal" : "patient",
  });
  const patchConversation = usePatchConversation("staff");
  const { messagesQuery, sendMessage, deleteMessage } = useMessagingThread("staff", selectedId);

  const selected = useMemo(
    () => inbox.data?.find((c) => c.id === selectedId) ?? null,
    [inbox.data, selectedId],
  );

  useEffect(() => {
    const linked = contextLookup.data?.conversation;
    if (linked) {
      setSelectedId(linked.id);
    }
  }, [contextLookup.data?.conversation]);

  useEffect(() => {
    setSelectedId(null);
  }, [inboxChannel]);

  useEffect(() => {
    if (!selectedId && inbox.data?.length) {
      setSelectedId(inbox.data[0].id);
    }
  }, [inbox.data, selectedId]);

  const onSelect = (c: ConversationSummaryDto) => {
    setSelectedId(c.id);
    const params = new URLSearchParams();
    params.set("conversation", c.id);
    if (urlPatientId) params.set("patientId", urlPatientId);
    setLocation(`/messages?${params.toString()}`);
  };

  const assignToMe = () => {
    if (!selected || !user?.id) return;
    patchConversation.mutate({
      conversationId: selected.id,
      patch: { assignedStaffUserId: user.id },
    });
  };

  return (
    <div className="min-h-screen bg-uventorybiz-light-gray pb-20 md:pb-6">
      <MobileNav />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              Secure messaging
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isStaffChannel
                ? "Internal staff threads — not visible to customers."
                : "Portal threads — staff only. Not for emergencies."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStaffChannel ? (
              <MessagingStaffInternalDialog
                trigger={
                  <Button type="button">
                    <Plus className="h-4 w-4 mr-1" />
                    New staff thread
                  </Button>
                }
                onCreated={onSelect}
              />
            ) : (
              <MessagingNewThreadDialog
                appointmentId={urlAppointmentId ?? undefined}
                trigger={
                  <Button type="button">
                    <Plus className="h-4 w-4 mr-1" />
                    New thread
                  </Button>
                }
                onCreated={onSelect}
              />
            )}
          </div>
        </div>

        <Tabs
          value={inboxChannel}
          onValueChange={(v) => setInboxChannel(v as InboxChannel)}
        >
          <TabsList>
            <TabsTrigger value="patient">Portal</TabsTrigger>
            <TabsTrigger value="staff_internal">Staff</TabsTrigger>
          </TabsList>
        </Tabs>

        {!isStaffChannel ? (
          <Tabs value={inboxFilter} onValueChange={(v) => setInboxFilter(v as InboxFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="mine">Assigned to me</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
          <MessagingInboxPanel
            conversations={inbox.data}
            isLoading={inbox.isLoading}
            selectedId={selectedId}
            onSelect={onSelect}
            title="Inbox"
            description={
              isStaffChannel
                ? "Threads you participate in"
                : urlPatientId
                  ? "Filtered inbox"
                  : "Portal customer & supplier conversations"
            }
            emptyTitle="No conversations"
            emptyDescription={
              isStaffChannel
                ? "Start a staff-only thread with colleagues."
                : inboxFilter === "mine"
                  ? "No threads assigned to you yet."
                  : "When portal users message your business, threads appear here."
            }
            staffMode={isStaffChannel ? "staff_internal" : "patient"}
          />

          <Card className="min-h-[480px] flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {selected ? selected.patientName ?? "Customer" : "Select a conversation"}
                </CardTitle>
                {selected?.subject ? (
                  <CardDescription>{selected.subject}</CardDescription>
                ) : null}
              </div>
              {selected ? (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <MessagingThreadExportMenu
                    audience="staff"
                    conversation={selected}
                    messages={messagesQuery.data}
                  />
                  {!isStaffChannel && user?.id && selected.assignedStaffUserId !== user.id ? (
                    <Button type="button" variant="outline" size="sm" onClick={assignToMe}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Assign to me
                    </Button>
                  ) : null}
                  {selected.status === "open" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patchConversation.mutate({
                          conversationId: selected.id,
                          patch: { status: "closed" as ConversationStatus },
                        })
                      }
                    >
                      Close thread
                    </Button>
                  ) : selected.status === "closed" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patchConversation.mutate({
                          conversationId: selected.id,
                          patch: { status: "open" },
                        })
                      }
                    >
                      Reopen
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {selected ? (
                <MessagingThreadView
                  messages={messagesQuery.data}
                  isLoading={messagesQuery.isLoading}
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
                <p className="text-sm text-muted-foreground text-center py-16">
                  Choose a conversation from the inbox.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
