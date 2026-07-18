import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import MessagingThreadView from "@/components/messaging/MessagingThreadView";
import MessagingNewThreadDialog from "@/components/messaging/MessagingNewThreadDialog";
import { useMessagingInbox, useMessagingThread } from "@/components/messaging/useMessagingThread";
import { useRegisterActiveConversation } from "@/components/messaging/MessagingRealtimeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  patientId: string;
  patientName?: string;
};

export default function PatientMessagingPanel({ patientId, patientName }: Props) {
  const inbox = useMessagingInbox("staff", { patientId });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { messagesQuery, sendMessage, deleteMessage } = useMessagingThread("staff", conversationId);
  useRegisterActiveConversation(conversationId);

  useEffect(() => {
    if (!conversationId && inbox.data?.length) {
      setConversationId(inbox.data[0].id);
    }
  }, [inbox.data, conversationId]);

  useEffect(() => {
    setConversationId(null);
  }, [patientId]);

  const active = inbox.data?.find((c) => c.id === conversationId) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Secure messages
        </CardTitle>
        <div className="flex gap-2">
          {inbox.data && inbox.data.length > 1 ? (
            <select
              className="text-xs border rounded px-2 py-1"
              value={conversationId ?? ""}
              onChange={(e) => setConversationId(e.target.value || null)}
            >
              {inbox.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject ?? c.lastMessagePreview ?? c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          ) : null}
          <MessagingNewThreadDialog
            defaultPatientId={patientId}
            trigger={
              <Button type="button" size="sm" variant="outline">
                New
              </Button>
            }
            onCreated={(c) => setConversationId(c.id)}
          />
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href={`/messages?patientId=${encodeURIComponent(patientId)}`}>Open inbox</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {conversationId && active ? (
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
            conversationClosed={active.status !== "open"}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {patientName
              ? `No message thread with ${patientName} yet. Start one to communicate securely.`
              : "No message thread yet. Start one to communicate with this employee."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
