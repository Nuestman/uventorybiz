import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, Clock } from "lucide-react";
import type { MessageDto, MessagingClinicianDto } from "@shared/messaging";
import type { OfflineMessageDto } from "@/types/offlineMessaging";
import { PortalLoadingBlock } from "@/portal/portalUi";
import MessagingComposer from "./MessagingComposer";
import MessageAttachmentList from "./MessageAttachmentList";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  messages: OfflineMessageDto[] | undefined;
  isLoading: boolean;
  onSend: (body: {
    bodyText?: string;
    bodyHtml?: string;
    clientMessageId: string;
    messagingConsentAccepted?: boolean;
    files?: File[];
    assignedStaffUserId?: string | null;
  }) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  deletePendingId?: string | null;
  sendPending?: boolean;
  requireConsent?: boolean;
  conversationClosed?: boolean;
  emptyLabel?: string;
  supportPhone?: string | null;
  compact?: boolean;
  /** Fill parent flex column — messages scroll, composer stays visible (telecare in-call). */
  fillHeight?: boolean;
  placeholder?: string;
  clinicianOptions?: MessagingClinicianDto[];
  defaultClinicianId?: string | null;
  showClinicianPicker?: boolean;
  lockClinicianId?: string | null;
  consentRequiresAccept?: boolean;
};

export default function MessagingThreadView({
  messages,
  isLoading,
  onSend,
  onDelete,
  deletePendingId,
  sendPending,
  requireConsent,
  conversationClosed,
  emptyLabel = "No messages yet.",
  supportPhone,
  compact,
  fillHeight,
  placeholder,
  clinicianOptions,
  defaultClinicianId,
  showClinicianPicker,
  lockClinicianId,
  consentRequiresAccept,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfflineMessageDto | null>(null);

  useEffect(() => {
    if (!messages?.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, messages?.[messages.length - 1]?.id]);

  if (isLoading && !messages) {
    return <PortalLoadingBlock label="Loading messages…" />;
  }

  return (
    <div
      className={
        fillHeight
          ? "flex flex-col min-h-0 flex-1 h-full"
          : compact
            ? "flex flex-col min-h-[200px]"
            : "flex flex-col min-h-[280px]"
      }
    >
      <div
        className={
          fillHeight
            ? "flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1 mb-2"
            : compact
              ? "flex-1 space-y-2 max-h-[200px] overflow-y-auto pr-1 mb-2"
              : "flex-1 space-y-3 max-h-[420px] overflow-y-auto pr-1 mb-3"
        }
      >
        {!messages?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyLabel}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                  m.isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                } ${m.isDeleted ? "opacity-70 italic" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[10px] opacity-80">
                    {m.senderDisplayName} · {format(new Date(m.createdAt), "MMM d, h:mm a")}
                  </p>
                  {m.canDelete && onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100 -mr-1 -mt-0.5"
                      disabled={deletePendingId === m.id}
                      aria-label="Delete message"
                      onClick={() => setDeleteTarget(m)}
                    >
                      {deletePendingId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  ) : null}
                </div>
                {m.bodyHtml && !m.isDeleted ? (
                  <div
                    className={`prose prose-sm max-w-none break-words
                      [&_a]:underline [&_u]:underline [&_s]:line-through
                      [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-inherit
                      [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1
                      ${m.isOwn
                        ? "prose-invert [&_th]:border-primary-foreground/30 [&_td]:border-primary-foreground/30"
                        : "[&_th]:border-border [&_td]:border-border"
                      }`}
                    dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.bodyText}</p>
                )}
                {!m.isDeleted ? (
                  <MessageAttachmentList attachments={m.attachments ?? []} isOwn={m.isOwn} />
                ) : null}
                {m.pendingSync ? (
                  <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending sync
                  </p>
                ) : null}
                {m.isOwn && m.seenAt ? (
                  <p className="text-[10px] opacity-70 mt-1 text-right">
                    Seen {format(new Date(m.seenAt), "MMM d, h:mm a")}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className={fillHeight ? "shrink-0 min-w-0" : undefined}>
        <MessagingComposer
        onSend={onSend}
        isPending={sendPending}
        requireConsent={requireConsent}
        closed={conversationClosed}
        supportPhone={supportPhone}
        compact={compact}
        placeholder={placeholder}
        clinicianOptions={clinicianOptions}
        defaultClinicianId={defaultClinicianId}
        showClinicianPicker={showClinicianPicker}
        lockClinicianId={lockClinicianId}
        consentRequiresAccept={consentRequiresAccept}
        />
      </div>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the message from the thread for everyone. You can only delete messages
              within 5 minutes of sending. The original content is retained in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletePendingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={!!deletePendingId}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget || !onDelete) return;
                void onDelete(deleteTarget.id).then(() => setDeleteTarget(null));
              }}
            >
              {deletePendingId === deleteTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete message"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
