import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getQueryFn } from "@/lib/queryClient";
import { useCreateConversation } from "@/components/messaging/useMessagingThread";
import type { ConversationSummaryDto, MessagingPortalRecipientDto } from "@shared/messaging";
import { titleCaseUi } from "@/lib/titleCaseUi";

type Props = {
  trigger: ReactNode;
  defaultPortalUserId?: string;
  appointmentId?: string;
  onCreated: (conversation: ConversationSummaryDto) => void;
};

export default function MessagingNewThreadDialog({
  trigger,
  defaultPortalUserId,
  appointmentId,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [portalUserId, setPortalUserId] = useState(defaultPortalUserId ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: recipients = [], isLoading } = useQuery<MessagingPortalRecipientDto[]>({
    queryKey: ["/api/messaging/portal-recipients"],
    queryFn: getQueryFn<MessagingPortalRecipientDto[]>({ on401: "throw" }),
    enabled: open,
  });

  const createConversation = useCreateConversation("staff");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients.slice(0, 50);
    return recipients
      .filter((r) => {
        const hay = [r.displayName, r.email, r.partyType].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [recipients, search]);

  const reset = () => {
    setSearch("");
    setPortalUserId(defaultPortalUserId ?? "");
    setSubject("");
    setBody("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
        else if (defaultPortalUserId) setPortalUserId(defaultPortalUserId);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message a portal user</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Customer or supplier *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={portalUserId} onValueChange={setPortalUserId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? "Loading portal users…" : "Select portal user"}
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filtered.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      {r.displayName}
                      <span className="text-muted-foreground text-xs">
                        ({titleCaseUi(r.partyType)}) · {r.email}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-thread-subject">Subject (optional)</Label>
            <Input
              id="new-thread-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-thread-body">Message *</Label>
            <Textarea
              id="new-thread-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!portalUserId || !body.trim() || createConversation.isPending}
            onClick={async () => {
              const result = await createConversation.mutateAsync({
                portalUserId,
                subject: subject.trim() || null,
                bodyText: body.trim(),
                clientMessageId: crypto.randomUUID(),
                appointmentId,
              });
              setOpen(false);
              reset();
              onCreated(result.conversation);
            }}
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
