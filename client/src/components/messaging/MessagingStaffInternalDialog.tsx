import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCreateConversation } from "@/components/messaging/useMessagingThread";
import type { ConversationSummaryDto } from "@shared/messaging";

type StaffUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
};

type Props = {
  trigger: ReactNode;
  onCreated: (conversation: ConversationSummaryDto) => void;
};

export default function MessagingStaffInternalDialog({ trigger, onCreated }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: staffUsers = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn<StaffUser[]>({ on401: "throw" }),
    enabled: open,
  });

  const createConversation = useCreateConversation("staff");

  const clinicalStaff = useMemo(
    () =>
      staffUsers.filter(
        (u) =>
          u.id !== user?.id &&
          (u.role === "staff" || u.role === "admin"),
      ),
    [staffUsers, user?.id],
  );

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const reset = () => {
    setSubject("");
    setBody("");
    setSelected(new Set());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Staff-only thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="staff-thread-subject">Subject (optional)</Label>
            <Input
              id="staff-thread-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Include staff *</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading team…</p>
            ) : !clinicalStaff.length ? (
              <p className="text-sm text-muted-foreground">No other staff found.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                {clinicalStaff.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={(v) => toggle(s.id, v === true)}
                    />
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {s.firstName} {s.lastName}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="staff-thread-body">Message *</Label>
            <Textarea
              id="staff-thread-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={selected.size === 0 || !body.trim() || createConversation.isPending}
            onClick={async () => {
              const result = await createConversation.mutateAsync({
                staffUserIds: [...selected],
                subject: subject.trim() || null,
                bodyText: body.trim(),
                clientMessageId: crypto.randomUUID(),
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
