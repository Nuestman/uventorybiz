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
import type { ConversationSummaryDto } from "@shared/messaging";

type PatientRow = {
  patient: { id: string };
  employee?: {
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
  };
};

type Props = {
  trigger: ReactNode;
  defaultPatientId?: string;
  appointmentId?: string;
  onCreated: (conversation: ConversationSummaryDto) => void;
};

export default function MessagingNewThreadDialog({
  trigger,
  defaultPatientId,
  appointmentId,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: patients = [], isLoading } = useQuery<PatientRow[]>({
    queryKey: ["/api/patients"],
    queryFn: getQueryFn<PatientRow[]>({ on401: "throw" }),
    enabled: open,
  });

  const createConversation = useCreateConversation("staff");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 50);
    return patients
      .filter((p) => {
        const emp = p.employee;
        const hay = [
          emp?.firstName,
          emp?.lastName,
          emp?.employeeNumber,
          p.patient.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [patients, search]);

  const reset = () => {
    setSearch("");
    setPatientId(defaultPatientId ?? "");
    setSubject("");
    setBody("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
        else if (defaultPatientId) setPatientId(defaultPatientId);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message an employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Employee *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or employee ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading employees…" : "Select employee"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filtered.map((p) => (
                  <SelectItem key={p.patient.id} value={p.patient.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      {p.employee?.firstName} {p.employee?.lastName}
                      {p.employee?.employeeNumber ? ` (${p.employee.employeeNumber})` : ""}
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
            disabled={!patientId || !body.trim() || createConversation.isPending}
            onClick={async () => {
              const result = await createConversation.mutateAsync({
                patientId,
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
